import { spawn } from 'child_process'
import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import log from '../utils/log'
import { composeOcrResult, OcrLine, OcrPoint } from '../../common/ocr/OcrResult'

/**
 * macOS Vision 框架 OCR 服务
 *
 * 通过编译好的 vision-ocr 命令行工具识别图片，
 * 工具以 JSON 输出逐行识别结果（文本/置信度/边界框），此处负责组装为 OcrResult。
 */

const helperPath = (): string =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'vision', 'bin', 'vision-ocr')
    : path.join(app.getAppPath(), 'vision', 'bin', 'vision-ocr')

interface VisionLine {
  text: string
  confidence: number
  box: [number, number, number, number]
}

interface VisionOutput {
  width: number
  height: number
  lines: VisionLine[]
}

const toOcrLine = (line: VisionLine): OcrLine => {
  const [x, y, width, height] = line.box
  const topLeft: OcrPoint = [x, y]
  const topRight: OcrPoint = [x + width, y]
  const bottomRight: OcrPoint = [x + width, y + height]
  const bottomLeft: OcrPoint = [x, y + height]
  return {
    text: line.text,
    confidence: line.confidence,
    detectionConfidence: line.confidence,
    box: [topLeft, topRight, bottomRight, bottomLeft]
  }
}

export class VisionOcr {
  /**
   * 识别 base64 编码的图片
   *
   * @param imageByBase64 图片内容（data URI 或裸 base64）
   * @param merge         是否合并段落
   */
  async recognize(imageByBase64: string, merge: boolean) {
    const raw = imageByBase64.replace(/^data:image\/\w+;base64,/, '')
    const tempFile = path.join(app.getPath('temp'), `ttime-vision-${Date.now()}.png`)
    await fs.writeFile(tempFile, Buffer.from(raw, 'base64'))
    try {
      const output = await this.run(tempFile)
      const lines = output.lines.filter((line) => line.text.trim()).map(toOcrLine)
      return composeOcrResult(lines, 'ch', output.width, output.height, merge)
    } finally {
      fs.unlink(tempFile).catch(() => {})
    }
  }

  private run(imageFile: string): Promise<VisionOutput> {
    return new Promise((resolve, reject) => {
      log.info('[Vision OCR] - 开始识别 : ', imageFile)
      const child = spawn(helperPath(), [imageFile])
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => (stdout += chunk))
      child.stderr.on('data', (chunk) => (stderr += chunk))
      child.on('error', (error) => reject(new Error(`无法启动 Vision OCR : ${error.message}`)))
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Vision OCR 退出码 ${code} : ${stderr.trim() || '无输出'}`))
          return
        }
        try {
          resolve(JSON.parse(stdout))
        } catch {
          reject(new Error('Vision OCR 输出解析失败'))
        }
      })
    })
  }
}

export default new VisionOcr()
