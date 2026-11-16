import { app } from 'electron'
import path from 'path'
import axios from 'axios'
import { OcrModelCache } from '../../common/ocr/modelCache'
import { injectAgent } from '../utils/RequestUtil'

const directory = path.join(app.getPath('userData'), 'ocr-models')
const bundledDirectory = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar.unpacked', 'ocr', 'models')
  : path.join(app.getAppPath(), 'ocr', 'models')

export const localOcrModels = new OcrModelCache(directory, bundledDirectory, async (url) => {
  const options = { responseType: 'arraybuffer' as const, timeout: 60000, proxy: false as const }
  await injectAgent(options)
  const response = await axios.get(url, options)
  return Buffer.from(response.data)
})
