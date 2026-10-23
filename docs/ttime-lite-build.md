# TTime Lite 构建手册（从零复现完整版）

> 目标：在任何 macOS Apple Silicon 机器上，从 Ruizhi-Deng/TTime Community 1.0.1 源码出发，
> 复现出全离线精简版 **TTime Lite**（DMG 约 83M，无任何在线依赖，OCR 用 macOS Vision）。
> 本手册假设最坏情况：**不依赖 lite 分支**，从上游 pristine 开始逐步操作。
> 有 lite 分支可拉时，直接 `git checkout lite && npm install && npm run build:mac` 即可，本文作对照与维护参考。
>
> 生成：2026-10-23。对应上游 commit `74007c2`。

---

## 第〇部分：方法论（动手前必读）

四条原则，全部由实际翻车得出：

1. **先建基线，后动刀。** 在未改动源码上先走完 构建→打包→启动→OCR 验证。基线不通 = 环境问题，先修环境。
2. **删除靠 require 链审计，不靠直觉。** 本项目渠道靠 `import.meta.glob` 隐式注册，引用关系看不见。
   实际翻车三次：`opencv.js`（textOcr 预加载必需）、`clipper-lib`（OCR 识别框裁剪必需）、
   `common/channel/ocr/info/TTimeInfo.ts`（本地 OCR 自身的注册配置）。
3. **删完做符号回扫。** 把被删的每个文件名/类名/枚举成员逐一 `grep -r` 回扫全 src，命中即修。
4. **门禁自动化。** 构建零错误、包内引擎真实识图断言、启动日志零 error。另外：
   杀 Electron 进程必须 `kill <pid>` 逐个杀——`pkill -f` 在单实例锁场景漏杀，
   `open` 会因单例锁把请求转给旧进程，导致你验证的一直是旧构建（实际踩过）。

### 体量参考（改造前后）
- 上游 Community：DMG 144M，app 312M（其中 onnxruntime 77M + PP-OCR 模型 25M + sqlite3 等）
- TTime Lite：**DMG 83M**，app 206M（92% 是 Electron Framework 192M，不可再压，除非换 Tauri 重写）

---

## 第一部分：环境准备

### 1.1 检查编译工具链
```bash
xcode-select -p        # 需要 /Library/Developer/CommandLineTools
cc --version           # Apple clang
which swiftc           # Vision 工具编译需要（CLT 自带）
node -v
```
没有 CLT：`xcode-select --install`

### 1.2 安装 Node 16（必须，不能用系统新 Node）
robotjs 0.6.11 太老，Node 18+ 下 node-gyp 编译失败；vue-tsc 1.8.27 + TS 4.9.3 也只兼容旧版类型。
```bash
mkdir -p ~/Zcode && cd ~/Zcode
curl -L -o node16.tar.xz https://nodejs.org/dist/v16.20.2/node-v16.20.2-darwin-arm64.tar.xz
tar xf node16.tar.xz && mv node-v16.20.2-darwin-arm64 node16 && rm node16.tar.xz
export PATH=~/Zcode/node16/bin:$PATH
node -v   # v16.20.2
```
> Intel 机器把 darwin-arm64 换成 darwin-x64。

### 1.3 网络代理（可选）
```bash
export HTTPS_PROXY=http://127.0.0.1:7897 HTTP_PROXY=$HTTPS_PROXY
```

---

## 第二部分：获取源码并建立基线

### 2.1 Clone
```bash
cd ~/Zcode
git clone https://github.com/Ruizhi-Deng/TTime.git TTime-community
cd TTime-community
git checkout 74007c2    # 本手册验证过的基线提交（Community 1.0.1）
git checkout -b lite    # 建立自己的改造分支
```

### 2.2 安装依赖
```bash
npm install --no-audit --no-fund
# postinstall 会跑 electron-builder install-app-deps 重编 robotjs/uiohook-napi
# 验证：node_modules/@jitsi/robotjs/build/Release/ 下应有 .node 文件
```

### 2.3 基线构建（此时尚未做任何改动）
```bash
npm run build:mac
# 产物 dist/TTime Community-1.0.1-arm64.dmg，应成功生成
# 失败先解决环境（参照第九部分排障表），成功才继续
```

### 2.4 基线依赖审计（为第三部分做依据）
```bash
# 全量外部依赖引用统计
grep -rhoE "require\('[^./][^']*'\)|from '[^./][^']*'" src \
  --include="*.ts" --include="*.vue" \
  | grep -oE "'[^']+'" | tr -d "'" | sort | uniq -c | sort -rn
# 逐个依赖反查使用方：
for dep in <待删依赖名>; do grep -rF "$dep" src -l; done
```

---

## 第三部分：删除清单（精确到文件）

以下路径均相对仓库根。**先删文件，后修引用（第四部分），再回扫（第五部分）。**

### 3.1 翻译渠道（只留 OpenAI 兼容接口）
```
src/main/service/channel/product/translate/ 删除：
  AliyunChannel.ts BaiduChannel.ts BingChannel.ts CaiYunChannel.ts
  DeepLBuiltInChannel.ts DeepLChannel.ts DeepSeekChannel.ts GeminiChannel.ts
  GoogleBuiltInChannel.ts GoogleChannel.ts NiuTransChannel.ts TranSmartChannel.ts
  VolcanoChannel.ts YouDaoChannel.ts ZhipuChannel.ts BingDictChannel.ts EcDictChannel.ts
  （保留 OpenAIChannel.ts、BingDict... 不，BingDict/EcDict 也删；保留
    ITranslateAgentInterface.ts ITranslateInterface.ts TranslateAgent.ts OpenAIChannel.ts）

src/common/channel/translate/info/ 删除（目录下只留 OpenAIInfo.ts，或清空——见 3.3）：
  AliyunInfo BaiduInfo BingInfo CaiYunInfo DeepLBuiltInInfo DeepLInfo DeepSeekInfo
  GeminiInfo GoogleBuiltInInfo GoogleInfo NiuTransInfo TranSmartInfo VolcanoInfo
  YouDaoInfo ZhipuInfo BingDictInfo EcDictInfo（各 .ts）

src/main/service/channel/interfaces/ 删除：
  AliyunRequest.ts BaiduRequest.ts BingDictRequest.ts CaiYunRequest.ts EcDictRequest.ts
  NiuTransRequest.ts OcrSpaceRequest.ts TencentCloudRequest.ts TranSmartRequest.ts
  XfyunRequest.ts YouDaoRequest.ts VolcanoRequest.ts
  （保留 AiChannel.ts）

src/renderer/src/channel/ 删除：
  BingChannelRequest.ts DeepLChannelRequest.ts GoogleChannelRequest.ts BaiduChannelRequest.ts
  （保留 AiChannelRequest.ts ChannelRequest.ts——后者内容见 4.6）

src/renderer/src/assets/translate/ 删除对应 Logo：
  AliyunLogo.png BaiduLogo.png BingLogo.png BingDictLogo.png CaiYunLogo.png
  DeepLBuiltInLogo.png DeepLLogo.png DeepSeekLogo.svg EcDictLogo.png GeminiLogo.svg
  GoogleBuiltInLogo.png GoogleLogo.png NiuTransLogo.png TranSmartLogo.png
  VolcanoLogo.png YouDaoLogo.png ZhipuLogo.svg
  （保留 OpenAILogo.png）
```

### 3.2 OCR 在线渠道 + PP-OCR 本地引擎全链
```
src/main/service/channel/product/ocr/ 整个目录删除（含 IOcrAgentInterface/IOcrInterface/OcrAgent）
src/main/service/channel/factory/OcrChannelFactory.ts 删除
src/common/channel/ocr/info/ 清空后新建一个 TTimeInfo.ts（内容见 4.1，必须保留！）
src/common/enums/ 删除：
  BaiduImageOcrLanguageEnum.ts OcrSpaceModelEnum.ts TencentCloudImageOcrLanguageEnum.ts
  TencentCloudOcrLanguageEnum.ts VolcanoOcrModelEnum.ts
src/main/enums/VolcanoOcrModelEnum.ts 删除
src/main/service/channel/interfaces/VolcanoRequest.ts 删除

PP-OCR 本地引擎（被 Vision 替代）：
  src/common/ocr/ 只保留 OcrResult.ts，删除 PaddleOcr.ts modelCache.ts recognition.ts models.json
  src/main/service/LocalOcrModels.ts 删除
  ocr/ 顶层目录整个删除（ONNX 模型 + 字典，25M）
  src/renderer/src/set/components/fun/serviceConfig/LocalOcrSettings.vue 删除
  src/preload/textOcr.ts textOcr.d.ts 删除（textOcr 是宿主 ORT 的隐藏窗口，整窗退役）
  src/renderer/textOcr.html 删除
  src/renderer/src/assets/ocr/ 只留 TTimeLogo.png，其余删除
  electron-builder.yml 里 asarUnpack 的 '**/ocr/models/**' 行删除
  package.json 里 scripts.prepare:ocr 及 build 链中的 "npm run prepare:ocr && " 移除
```

### 3.3 冗余功能
```
悬浮球/静默OCR/剪贴板监听：
  src/main/service/{HoverBall,OcrSilence,ClipboardListenerService}.ts
  src/preload/{hoverBall,ocrSilence}.{ts,d.ts}
  src/renderer/{hoverBall,ocrSilence}.html
翻译记录/生词本：
  src/renderer/src/set/components/fun/TranslateHistory.vue
  src/renderer/src/set/components/fun/history/ 整目录
TTS：
  src/common/enums/PlaySpeechServiceEnum.ts
网络设置/代理：
  src/renderer/src/set/components/fun/NetworkSet.vue
  src/main/utils/{request.ts,RequestUtil.ts}
  src/renderer/src/utils/requestNotHandle.ts
其他枚举：
  src/main/enums/VolcanoOcrModelEnum.ts（同 3.2）
上游自带但不再用的验证脚本可留可删：scripts/check-*.cjs（npm run verify 用）
```

### 3.4 渠道 Logo 之外的静态资源
```
src/renderer/src/assets/ocr/ 删除：BaiduImageLogo.png BaiduLogo.png OcrSpaceLogo.png
  TencentCloudImageLogo.png TencentCloudLogo.png VolcanoLogo.png XfyunLogo.png
```

### 3.5 package.json 依赖删除
```json
dependencies 中移除：
  "@alicloud/alimt20181012", "@volcengine/openapi",
  "tencentcloud-sdk-nodejs-ocr", "tencentcloud-sdk-nodejs-tmt",
  "onnxruntime-node", "opencv.js", "clipper-lib",
  "sqlite3", "axios", "md5", "md5-node"
devDependencies 中钉死：
  "@types/node": "16.18.126"（不钉则 TS 4.9.3 解析新类型文件报语法错）
  "vue-tsc": "1.8.27"（配合本地 TS 4.9.3）
name 改 "ttime-lite"；scripts 加 "prebuild": "node scripts/build-vision.js"
```
改完 `npm install`（净删 80+ 包）。

---

## 第四部分：代码修改（逐文件）

### 4.1 新建 `src/common/channel/ocr/info/TTimeInfo.ts`（必须存在）
```ts
export default {
  name: '本地离线OCR',
  isKey: false,
  isOneAppKey: false
}
```
> 此文件是本地 OCR 在设置页的注册身份，删了会启动即崩（`reading 'name'`）。

### 4.2 枚举重写（全文替换）
`src/common/enums/TranslateServiceEnum.ts`：
```ts
class TranslateServiceEnum {
  static OPEN_AI = 'OpenAI'
}
export default TranslateServiceEnum
```
`src/common/enums/OcrServiceEnum.ts`：
```ts
class OcrServiceEnum {
  static TTIME = 'TTime'
}
export default OcrServiceEnum
```
`src/common/enums/ShortcutKeyEnum.ts`：删除 `SCREENSHOT_SILENCE_OCR` 成员（其余保留）。

### 4.3 新建 `vision/vision-ocr.swift`（Vision OCR 引擎）
```swift
import AppKit
import Vision

// 用法: vision-ocr <image-path>，stdout 输出 JSON
let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path),
      let tiff = img.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff) else {
  FileHandle.standardError.write("cannot read image\n".data(using: .utf8)!)
  exit(1)
}
let cg = rep.cgImage!
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["zh-Hans", "en-US"]
request.usesLanguageCorrection = false
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([request])
let rows: [[String: Any]] = (request.results ?? []).map { obs in
  let box = obs.boundingBox
  return [
    "text": obs.topCandidates(1)[0].string,
    "confidence": obs.topCandidates(1)[0].confidence,
    "box": [box.minX * Double(cg.width), (1 - box.maxY) * Double(cg.height),
            box.width * Double(cg.width), box.height * Double(cg.height)]
  ]
}
let data = try JSONSerialization.data(withJSONObject: ["width": cg.width, "height": cg.height, "lines": rows])
FileHandle.standardOutput.write(data)
```

### 4.4 新建 `scripts/build-vision.js`（prebuild 钩子）
```js
const { execSync } = require('child_process')
const path = require('path')
if (process.platform !== 'darwin') { console.log('[vision] 非 darwin 跳过'); process.exit(0) }
const root = path.join(__dirname, '..')
execSync(`swiftc -O "${path.join(root,'vision/vision-ocr.swift')}" -o "${path.join(root,'vision/bin/vision-ocr')}"`, { stdio: 'inherit' })
console.log('[vision] vision-ocr 编译完成')
```
（先 `mkdir -p vision/bin`，本机跑一次 `node scripts/build-vision.js` 验证输出 JSON。）

### 4.5 新建 `src/main/service/VisionOcr.ts`
```ts
import { spawn } from 'child_process'
import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import log from '../utils/log'
import { composeOcrResult, OcrLine, OcrPoint } from '../../common/ocr/OcrResult'

const helperPath = (): string =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'vision', 'bin', 'vision-ocr')
    : path.join(app.getAppPath(), 'vision', 'bin', 'vision-ocr')

interface VisionLine { text: string; confidence: number; box: [number,number,number,number] }
interface VisionOutput { width: number; height: number; lines: VisionLine[] }

const toOcrLine = (line: VisionLine): OcrLine => {
  const [x, y, width, height] = line.box
  return {
    text: line.text, confidence: line.confidence, detectionConfidence: line.confidence,
    box: [[x,y],[x+width,y],[x+width,y+height],[x,y+height]] as [OcrPoint,OcrPoint,OcrPoint,OcrPoint]
  }
}

class VisionOcr {
  async recognize(imageByBase64: string, merge: boolean) {
    const raw = imageByBase64.replace(/^data:image\/\w+;base64,/, '')
    const tempFile = path.join(app.getPath('temp'), `ttime-vision-${Date.now()}.png`)
    await fs.writeFile(tempFile, Buffer.from(raw, 'base64'))
    try {
      const output = await this.run(tempFile)
      const lines = output.lines.filter((l) => l.text.trim()).map(toOcrLine)
      return composeOcrResult(lines, 'ch', output.width, output.height, merge)
    } finally {
      fs.unlink(tempFile).catch(() => {})
    }
  }
  private run(imageFile: string): Promise<VisionOutput> {
    return new Promise((resolve, reject) => {
      log.info('[Vision OCR] - 开始识别 : ', imageFile)
      const child = spawn(helperPath(), [imageFile])
      let stdout = ''; let stderr = ''
      child.stdout.on('data', (c) => (stdout += c))
      child.stderr.on('data', (c) => (stderr += c))
      child.on('error', (e) => reject(new Error(`无法启动 Vision OCR : ${e.message}`)))
      child.on('close', (code) => {
        if (code !== 0) { reject(new Error(`Vision OCR 退出码 ${code} : ${stderr.trim() || '无输出'}`)); return }
        try { resolve(JSON.parse(stdout)) } catch { reject(new Error('Vision OCR 输出解析失败')) }
      })
    })
  }
}
export default new VisionOcr()
```

### 4.6 重写 `src/main/service/Screenshot.ts` 要点
完整改造后文件的关键结构（删 createTextOcrWin/textOcrWin、OCR_SILENCE 分支、OcrChannelFactory 分支）：
- 文件头 import 增加 `spawn/child_process`、`fs`、`visionOcr`，删除 `app`、`OcrServiceEnum`、`OcrChannelFactory`、`localOcrModels`、`OcrResult`、`YesNoEnum` 之外的冗余（YesNoEnum 保留）
- `handle-image-text-recognition-event` 的函数体抽为 `processImageTextRecognition(imgByBase64)`，IPC handler 调它；
  内部调 `visionOcr.recognize(img, StoreService.configGet('localOcrMergeParagraphs'))`，
  成功回调 **必须传 `YesNoEnum.Y`**（字符串 'Y'，传布尔 true 会静默失败——踩过）
- `screenshot-end-event` 的窗口调度抽为 `handleCapturedImage(imgByBase64)`（内置/系统两引擎共用）
- `ScreenshotsMain` 增加：
```ts
captureByEngine(): void {
  if (StoreService.configGet('systemScreenshotStatus') === YesNoEnum.Y) {
    ScreenshotsMain.systemCapture()
  } else {
    this.createScreenshotsWin()
  }
}
static systemCapture(): void {
  const imageFile = path.join(StoreService.userDataPath, `ttime-system-capture-${Date.now()}.png`)
  const child = spawn('screencapture', ['-i', imageFile])
  child.on('close', (code) => {
    if (code !== 0 || !fs.existsSync(imageFile)) { fs.unlink(imageFile, () => {}); return }
    const img = 'data:image/png;base64,' + fs.readFileSync(imageFile).toString('base64')
    fs.unlink(imageFile, () => {})
    handleCapturedImage(img)
    processImageTextRecognition(img)
  })
}
```
- 删除 `static textOcrWin` 字段、`createTextOcrWin()` 函数、`app.whenReady` 预加载调用

`src/main/service/GlobalShortcutEvent.ts`：删除 `ocrSilenceScreenshot`/`ocrSilenceScreenshotRegister`
及 SCREENSHOT_SILENCE_OCR 分支；两处 `new ScreenshotsMain().createScreenshotsWin()` 改为 `captureByEngine()`。

### 4.7 `src/main/service/GlobalWin.ts`
- 删除 hoverBallWin/isHoverBall/ocrSilenceWin/isOcrSilence/ocrSilenceTempImg 静态字段
- 删除 setHoverBallWin/hoverBallWinHide/hoverBallWinShow/setOcrSilenceWin/ocrSilenceWinHide/ocrSilenceWinShow 方法
- `ocrUpdateContent` 里删除 OCR_SILENCE 两个分支（成功/失败各一）
- 若 SystemTypeEnum/clipboard 因此不再使用，同步删 import（clipboard 在 OCR 写剪贴板功能里仍用，保留）

### 4.8 `src/main/service/StoreService.ts`（initConfig 内）
- 删除 hoverBallStatus/hoverBallEnhanceStatus/screenshotSilenceOcrShortcutKey/translateHistoryStatus/clipboardListener*/agentConfig 的默认值块
- 删除 PlaySpeechServiceEnum import 及其迁移块
- 新增：
```ts
// 精简版：翻译记录已移除，强制关闭
StoreService.configSet('translateHistoryStatus', YesNoEnum.N)
// 使用系统截图工具（默认开）
if (!StoreService.configHas('systemScreenshotStatus')) {
  StoreService.configSet('systemScreenshotStatus', YesNoEnum.Y)
}
// 隐藏菜单栏图标（默认关）
if (!StoreService.configHas('hideTrayIconStatus')) {
  StoreService.configSet('hideTrayIconStatus', YesNoEnum.N)
}
```
- 快捷键初始列表中删除 SCREENSHOT_SILENCE_OCR 项

### 4.9 `src/main/service/TrayEvent.ts`（支持隐藏图标）
- import StoreService/YesNoEnum
- constructor 加两条 early-return（mainTray 已存在 / hideTrayIconStatus===Y），原创建逻辑整体挪进 `private static create()`
- 新增 `static applyHideStatus()`：hide→destroy 置 null；show→create（见仓库 lite 分支源码）
- 删除"静默截图OCR"菜单项

### 4.10 `src/main/index.ts`
- 删除 `import './service/HoverBall'` / `'./service/OcrSilence'` / `'./service/ClipboardListenerService'`
- 删除 `import { injectWinAgent }` 及 `injectWinAgent(StoreService.configGet('agentConfig'), ...)` 调用行

### 4.11 `src/main/service/Set.ts`
- 删除 `import { ecDictDbClose }` 及调用行
- 新增 handler（需 import TrayEvent）：
```ts
ipcMain.handle('hide-tray-icon-status-notify', (_event, _args) => {
  TrayEvent.applyHideStatus()
})
```

### 4.12 `src/main/service/IpcMainHandle.ts`
- 删除 `agent-update-event` handler 及 RequestUtil import

### 4.13 `src/main/service/channel/TranslateChannel.ts`
- 删除 `import OcrChannelFactory`；删除 api-unite-ocr / api-unite-ocr-check / agent-api-ocr-callback / Ocr 结果消息回调 四个 IPC 块

### 4.14 `src/common/utils/aiRequest.ts`
- `aiServiceTypes = [TranslateServiceEnum.OPEN_AI]`
- 删除全部 GEMINI 分支（buildAiRequest 的 x-goog-api-key/URL 拼接、readAiResponse/readChunk 的 candidates 解析），
  函数签名相应去掉未用的 `type` 参数；`consumeLine` 的提前 return 改 `return undefined`（TS7030）
- 调用方 `src/renderer/src/channel/AiChannelRequest.ts` 同步改参

### 4.15 `src/renderer/src/channel/ChannelRequest.ts` → 只留：
```ts
import { requestAiTranslation } from './AiChannelRequest'

class ChannelRequest {
  static openaiTranslate = requestAiTranslation
}

window.api['agentApiTranslate']((info) => {
  ChannelRequest[info.type.toLowerCase() + 'Translate'](info)
})
```

### 4.16 `electron.vite.config.ts`
preload 与 renderer 的 input 列表各删除 `textOcr`、`hoverBall`、`ocrSilence` 三行。

### 4.17 `electron-builder.yml`
```yaml
productName: TTime Lite          # 原为 TTime Community
asarUnpack 里删除 '- \'**/ocr/models/**\'' 行
新增（顶层，directories 之后）：
extraResources:
  - from: vision/bin
    to: vision/bin
```

### 4.18 preload 层
`src/preload/set.ts` / `set.d.ts`：删除 agentUpdateEvent、localOcrModelStatus、prepareLocalOcrModels；
新增 `hideTrayIconStatusNotify = () => ipcRenderer.invoke('hide-tray-icon-status-notify')` 并导出/声明。

### 4.19 Renderer（Vue）改动要点
| 文件 | 改动 |
|---|---|
| `translate/Translate.vue` | 默认翻译源初始化改为 `[TranslateServiceEnum.OPEN_AI]` |
| `set/Set.vue` | 删"翻译记录""网络设置"菜单项、组件 import、挂载行 |
| `set/components/fun/AdvancedInfo.vue` | 删"语音播放源/鼠标悬浮球(两项)/剪贴板监听(两项)/翻译记录"表单项及对应 ref/事件函数/未用 import(h, ElMessageBox)；新增「使用系统截图」「隐藏菜单栏图标」两个 checkbox（事件里 cacheSet + 前者无需通知、后者调 `window.api.hideTrayIconStatusNotify()`） |
| `set/components/fun/ShortcutKey.vue` | 删"截图静默OCR"表单项 |
| `translate/components/Header.vue` | 删剪贴板监听按钮、翻译记录按钮及相关 ref/函数 |
| `translate/components/Input.vue` | 删朗读按钮与 playSpeech；删翻译记录写入块（translateHistoryStatus 判断整段）及 TranslateServiceRecordVo/StoreTypeEnum/updateTranslateRecordList 等 import |
| `translate/components/channel/InputResultContentChannel.vue` | 删朗读按钮（正音 us/uk + 结果朗读）与 playSpeech/playSpeechByUrl |
| `utils/translate.ts` | 删 playSpeech/playSpeechNewAudio 及默认导出中的对应项 |
| `set/components/fun/serviceConfig/TranslateService.vue` | 删 Bing 字典提示块、EcDict 导入提示块、GEMINI 专属文案与 requestArgumentsExample 的 GEMINI 分支 |
| `set/components/fun/serviceConfig/OcrService.vue` | 整文件重写：一张"本地离线识别（macOS Vision，无需配置）"卡片 + 合并段落开关（读写 `localOcrMergeParagraphs`），不再有渠道列表/密钥表单 |
| `renderer/src/channel/ChannelRequest.ts` | 见 4.15 |

---

## 第五部分：验证（门禁）

### 5.1 构建门禁
```bash
export PATH=~/Zcode/node16/bin:$PATH
rm -rf out && npm run build                    # electron-vite 三段构建，须零 error
npx tsc --noEmit -p tsconfig.node.json --composite false | grep -v TS2564   # 应无输出
npx vue-tsc --noEmit -p tsconfig.web.json --composite false | grep -E "error TS" \
  | grep -vE "TS2339|TS2550|TS6133|TS2322|TS7030"                            # 应无输出
# 说明：web 端约 40 个上游遗留严格模式噪音属白名单；结构性错误必须为零
```

### 5.2 引擎门禁（打包后必跑）
```bash
# 造一张已知文字的测试图（任一方式），然后：
/Applications/TTime\ Lite.app/Contents/Resources/vision/bin/vision-ocr <测试图>
# stdout JSON 的 lines 必须包含已知文本；空或乱码 = 引擎链路坏
```

### 5.3 装机 + 启动门禁
```bash
for p in $(pgrep -f "TTime Lite"); do kill $p; done; sleep 3
pgrep -f "TTime Lite" && for p in $(pgrep -f "TTime Lite"); do kill -9 $p; done   # 确保死透
rm -rf "/Applications/TTime Lite.app"
cp -R dist/mac-arm64/"TTime Lite.app" /Applications/ && xattr -cr "/Applications/TTime Lite.app"
open "/Applications/TTime Lite.app"; sleep 8
ps -o pid,lstart,%cpu -p $(pgrep -f "TTime Lite.app/Contents/MacOS" | head -1)
# lstart 必须是刚刚；%CPU 应回落到个位数以下
grep -icE "error|异常" ~/Library/"Application Support"/"TTime Lite"/logs/$(date +%Y-%m-%d).log   # 0
```

---

## 第六部分：首次使用配置

- 设置 → 翻译源设置 → 自定义接口：URL `http://127.0.0.1:11434/v1/chat/completions`，模型名 = Ollama 已拉模型，key 留空
- 快捷键：Alt+Q 输入 / Alt+W 截图翻译 / Alt+E 划词 / Alt+Shift+W 截图 OCR
- 系统截图不弹选区 → 系统设置 → 隐私与安全性 → 屏幕录制 → 给 TTime Lite 授权
- 数据目录：`~/Library/Application Support/TTime Lite/`（配置重置 = 删此目录）

---

## 第七部分：故障排查表

| 症状 | 根因 | 处理 |
|---|---|---|
| npm install 时 robotjs 编译失败 | Node 版本 >16 | 用 ~/Zcode/node16 的 npm 重装 |
| 启动即 98% CPU 卡死 | preload require 失败崩溃循环（opencv.js/clipper-lib 类缺依赖） | `ELECTRON_ENABLE_LOGGING=1` 前台跑看 console；对照 3.2/4.x 清单查漏 |
| 日志 `Cannot read properties of undefined (reading 'name')` | `common/channel/*/info/` 里枚举在用的类型缺注册文件 | 补 TTimeInfo.ts 或清理残留枚举值 |
| OCR 结果为空 | 引擎链路断（缺依赖）或 ocrUpdateContent 收到布尔而非 YesNoEnum.Y | 逐层查：helper 单独跑 → Screenshot.ts 调用参数 |
| 改完验证的还是旧行为 | 旧进程没死，open 被单实例锁转交 | `pgrep -f` 确认全死后按 PID kill，再 open |
| tsc 报 @types/node 语法错 | 未钉 16.18.126 | devDependencies 钉死后重装 |
| vue-tsc 大量报错 | 用了全局新版 vue-tsc | 用项目内钉的 1.8.27（npx 前确保 node_modules 里有） |
| 系统截图无反应 | 屏幕录制权限 | 隐私设置授权 |
| DMG 打开报损坏 | 未签名被隔离 | `xattr -cr` 装机目录 |

---

## 第八部分：维护纪律

1. **依赖入库三问**：哪个 src 文件用它？删掉会断哪条链？能不能用更小的替代？
2. **升级基底**：rebase 上游 → 冲突全取 lite 侧删减集 → 全门禁重跑。
3. **功能开关类改动**（如隐藏托盘）：默认值必须"关闭即原行为"，保证回滚零成本。
4. **每版必跑**：5.1 构建门禁 + 5.2 引擎门禁 + 5.3 启动门禁，缺一不发版。
