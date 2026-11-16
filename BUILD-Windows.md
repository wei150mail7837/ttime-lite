# TTime Lite Windows 构建手册（从上游源码到 NSIS 安装包）

> 目标：在 Windows x64 上，从 Ruizhi-Deng/TTime Community 1.0.1 源码出发，
> 复现全离线精简版 **TTime Lite**（NSIS 安装包 108M，无任何在线依赖，OCR 用本地 PP-OCRv4）。
>
> 基线 commit：`74007c2`（Community 1.0.1）。本文所有数字均在本机实测。
> 对应 mac 版手册：`ttime-lite-build.md`。两者删减集一致，**OCR 方案不同**（见第〇部分）。

---

## 第〇部分：与 macOS 版的根本差异

mac 版把 PP-OCR 整条链换成了系统 Vision（swift 小工具），省下 100M。
**Windows 版不能这么做**，原因：

| 方案 | 结论 |
|---|---|
| Windows.Media.Ocr（系统 OCR） | 只能通过 PowerShell/WinRT 或 C#（csc + winmd）调用。PowerShell 侧异步等待依赖 `System.Runtime.WindowsRuntime`，脚本化脆弱；csc 侧需要 Windows SDK 的 winmd。**均未在本机验证通过**，不作为发版依赖 |
| Tesseract（tesseract.js WASM） | 可离线，但需额外 15M+ 训练数据，识别质量与速度均劣于 PP-OCRv4 |
| **保留 PP-OCRv4（本手册采用）** | 上游原生跨平台路径，零改动、零风险、全离线。代价是保留 onnxruntime-node（x64 仅 9.9M）与 opencv.js / clipper-lib |

结论：**Windows 版的"精简"体现在渠道、冗余功能、非本平台二进制三处，不在 OCR 引擎。**

另一处差异：mac 版新增的「使用系统截图工具」开关在 Windows 无对应实现（`screencapture` 是 macOS 命令），
Windows 版**不引入该开关**，始终走内置截图窗口。

---

## 第一部分：方法论（动手前必读）

1. **先建基线，后动刀。** 未改动源码上先走完 `install → build → package → 启动`。
   基线不通 = 环境问题。本手册实测基线：`setup 136M / win-unpacked 400M / app.asar 63M`。
2. **删除靠 require 链审计，不靠直觉。** 渠道靠 `import.meta.glob` 隐式注册，静态搜索看不见引用关系。
   删之前对每个文件名做一次 `grep -rl` 反查（本手册第四部分给了批量命令）。
3. **删完做符号回扫。** 枚举成员被删但模板里还在用，`electron-vite build` **不会报错**（模板是运行时求值），
   必须靠 `grep` 回扫 + `vue-tsc` 兜底。
4. **门禁自动化。** 构建零 error、类型检查过白名单、启动日志零 error、OCR 真实识图断言。
5. **Windows 特有陷阱：`ELECTRON_RUN_AS_NODE`。**
   若环境里存在该变量（本机被设为 `1`），Electron 会以纯 Node 模式启动：
   `require('electron').app` 为 `undefined`，进程**立即退出且退出码 0、无任何输出**。
   排查任何"双击没反应"前，先 `echo $ELECTRON_RUN_AS_NODE`，启动时用 `env -u ELECTRON_RUN_AS_NODE`。

---

## 第二部分：环境准备

### 2.1 实测可用环境

| 组件 | 版本 | 是否必需 |
|---|---|---|
| Node | **22.22.2**（不是 16） | 必需 |
| npm | 随 Node | 必需 |
| MSVC / Windows SDK | **未安装，也不需要** | 非必需 |
| Python | 任意 | 非必需（仅辅助脚本用） |

> 为什么不需要 Node 16：所有原生依赖都是 **NAPI 预编译**，不随 Node/Electron ABI 重编。
> `@jitsi/robotjs`（`prebuilds/win32-x64/node.napi.node`）、`uiohook-napi`（`prebuilds/win32-x64`）、
> `node-screenshots`（optional dep `node-screenshots-win32-x64-msvc`）、`onnxruntime-node`（自带 win32 二进制）
> 全部命中预编译产物。`electron-builder.yml` 里 `npmRebuild: false` 是这条路线成立的关键，**不要删**。
> 唯一需要 node-gyp 的 `sqlite3` 在精简版里已被删除。

### 2.2 安装依赖（两种路径）

```bash
cd TTime
npm install --no-audit --no-fund          # 常规路径：postinstall 会跑 electron-builder install-app-deps
```

若 postinstall 被环境跳过（`--ignore-scripts`）或 electron 二进制未落地，补两步：

```bash
node node_modules/electron/install.js     # 下载 electron 20.3.1 win32-x64（约 90M）
npm run prepare:ocr                       # 下载 PP-OCR 中英模型到 ocr/models（约 26M）
```

验证原生模块齐全：

```bash
ls node_modules/@jitsi/robotjs/prebuilds/win32-x64/node.napi.node
ls node_modules/uiohook-napi/prebuilds/win32-x64
ls node_modules/onnxruntime-node/bin/napi-v3/win32/x64/onnxruntime.dll
ls node_modules/electron/dist/electron.exe
```

### 2.3 网络

npm 与 electron-builder 二进制默认走 npmmirror 镜像即可，无需代理。
若 `prepare:ocr` 拉模型失败，检查 `ocr/models/` 下是否有 4 个 sha256 命名目录。

---

## 第三部分：获取源码并建立基线

```bash
git clone https://github.com/Ruizhi-Deng/TTime.git TTime
cd TTime
git checkout 74007c2
git checkout -b lite-win
npm install --no-audit --no-fund
npm run build:win          # = modules-update + prepare:ocr + electron-vite build + electron-builder --win
```

基线产物：`dist/TTime Community-1.0.1-setup.exe`（136M）。
**基线不通就不要往下走**，先解决环境（第七部分）。

---

## 第四部分：删除清单

路径相对仓库根。先删文件，再修引用（第五部分），最后回扫（第六部分）。

### 4.1 依赖引用审计（删之前必做）

```bash
# 翻译渠道
for f in AliyunChannel BaiduChannel BingChannel BingDictChannel CaiYunChannel \
         DeepLBuiltInChannel DeepLChannel DeepSeekChannel EcDictChannel GeminiChannel \
         GoogleBuiltInChannel GoogleChannel NiuTransChannel TranSmartChannel \
         VolcanoChannel YouDaoChannel ZhipuChannel; do
  hits=$(grep -rl "$f" src --include=*.ts --include=*.vue | grep -v "product/translate/$f.ts" | tr '\n' ' ')
  echo "$f -> ${hits:-none}"
done

# 请求接口（预期只剩被删渠道 + Set.ts 的 EcDictRequest）
for f in AliyunRequest BaiduRequest BingDictRequest CaiYunRequest EcDictRequest NiuTransRequest \
         OcrSpaceRequest TencentCloudRequest TranSmartRequest VolcanoRequest XfyunRequest YouDaoRequest; do
  hits=$(grep -rl "$f" src --include=*.ts --include=*.vue | grep -v "interfaces/$f.ts" | tr '\n' ' ')
  echo "$f -> ${hits:-none}"
done
```

### 4.2 在线翻译渠道（只留 OpenAI）

```
src/main/service/channel/product/translate/   删 17 个 Channel，保留
  OpenAIChannel.ts ITranslateAgentInterface.ts ITranslateInterface.ts TranslateAgent.ts
src/common/channel/translate/info/            删 17 个 Info，保留 OpenAIInfo.ts
src/main/service/channel/interfaces/          删 12 个 Request，保留 AiChannel.ts
src/renderer/src/channel/                     删 4 个 *ChannelRequest.ts，保留
  AiChannelRequest.ts ChannelRequest.ts
src/renderer/src/assets/translate/            删 17 个 Logo，保留 OpenAILogo.png
```

### 4.3 在线 OCR 渠道（只留本地 PP-OCR）

```
src/main/service/channel/product/ocr/         整个目录删除（8 个渠道 + 3 个接口文件）
src/main/service/channel/factory/OcrChannelFactory.ts   删除
src/common/channel/ocr/info/                  删 7 个 Info，保留 TTimeInfo.ts（本地 OCR 的注册身份，不能删）
src/common/enums/                             删除
  BaiduImageOcrLanguageEnum.ts OcrSpaceModelEnum.ts
  TencentCloudImageOcrLanguageEnum.ts TencentCloudOcrLanguageEnum.ts VolcanoOcrModelEnum.ts
src/main/enums/VolcanoOcrModelEnum.ts         删除
src/renderer/src/assets/ocr/                  删 7 个 Logo，保留 TTimeLogo.png
```

> **不要删** `src/common/ocr/`（PaddleOcr / recognition / modelCache / models.json / OcrResult）、
> `src/main/service/LocalOcrModels.ts`、`src/preload/textOcr.ts`、`src/renderer/textOcr.html`、
> `src/renderer/src/set/components/fun/serviceConfig/LocalOcrSettings.vue`、`ocr/models/`。
> 这些是 Windows 版 OCR 的命脉。`opencv.js` 与 `clipper-lib` 也因此必须保留在 dependencies 里。

### 4.4 冗余功能

```
悬浮球 / 静默OCR / 剪贴板监听：
  src/main/service/{HoverBall,OcrSilence,ClipboardListenerService}.ts
  src/preload/{hoverBall,ocrSilence}.{ts,d.ts}
  src/renderer/{hoverBall,ocrSilence}.html
翻译记录 / 生词本：
  src/renderer/src/set/components/fun/TranslateHistory.vue
  src/renderer/src/set/components/fun/history/            整目录
  src/renderer/src/utils/translateRecordUtil.ts
TTS：
  src/common/enums/PlaySpeechServiceEnum.ts
网络设置 / 代理：
  src/renderer/src/set/components/fun/NetworkSet.vue
  src/main/utils/request.ts
  src/renderer/src/utils/requestNotHandle.ts
```

### 4.5 package.json 依赖

```diff
 dependencies 移除：
-  "@alicloud/alimt20181012" "@volcengine/openapi"
-  "tencentcloud-sdk-nodejs-ocr" "tencentcloud-sdk-nodejs-tmt"
-  "sqlite3" "md5" "md5-node"
 devDependencies 钉死：
+  "@types/node": "16.18.126"     // 不钉则 TS 4.9.3 解析新版 @types/node 直接语法报错
```

保留 `axios`（模型缓存下载兜底 + 脚本用）、`opencv.js`、`clipper-lib`、`onnxruntime-node`。

实测 `npm install` 净删 **148 个包**。

---

## 第五部分：代码修改（逐文件）

### 5.1 枚举收敛

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

`src/common/enums/ShortcutKeyEnum.ts`：删 `SCREENSHOT_SILENCE_OCR`。
`src/main/enums/OcrTypeEnum.ts`：删 `OCR_SILENCE`。

> 枚举收敛后，渲染层的渠道列表会**自动**只剩 OpenAI / 本地 OCR ——
> `translateServiceUtil.ts` / `ocrServiceUtil.ts` 是遍历枚举 + `import.meta.glob` 生成列表的，无需改 UI 逻辑。

### 5.2 `src/main/service/Screenshot.ts`

`handle-image-text-recognition-event` 改为只有本地分支（删 `OcrChannelFactory` 与第三方 OCR else 分支）：

```ts
ipcMain.handle('handle-image-text-recognition-event', async (_event, imgByBase64) => {
  const requestId = ++localOcrRequestId
  const language = StoreService.configGet('localOcrLanguage') as string
  try {
    const models = await localOcrModels.prepare(language)
    if (requestId !== localOcrRequestId) return
    ScreenshotsMain.textOcrWin.webContents.send('local-ocr', {
      requestId, image: imgByBase64, language, models,
      merge: StoreService.configGet('localOcrMergeParagraphs')
    })
  } catch (error: any) {
    if (requestId === localOcrRequestId) await GlobalWin.ocrUpdateContent(YesNoEnum.N, error.message)
  }
})
```

同时删 `screenshot-end-event` 里的 `OCR_SILENCE` 分支；删 import `OcrServiceEnum` / `OcrChannelFactory` / `validate`。

### 5.3 `src/main/service/GlobalWin.ts`

- 删字段 `hoverBallWin / isHoverBall / ocrSilenceWin / isOcrSilence / ocrSilenceTempImg`
- 删方法 `setHoverBallWin / hoverBallWinHide / hoverBallWinShow / setOcrSilenceWin / ocrSilenceWinHide / ocrSilenceWinShow`
- `ocrUpdateContent` 删 `OCR_SILENCE` 成功/失败两个分支
- 删 import `SystemTypeEnum`

### 5.4 `src/main/service/GlobalShortcutEvent.ts`

- `translateRegister` 删 `SCREENSHOT_SILENCE_OCR` 分支
- 删 `ocrSilenceScreenshot()` 与 `ocrSilenceScreenshotRegister()`

### 5.5 `src/main/service/StoreService.ts`

删这些默认值块：`screenshotSilenceOcrShortcutKey` / `agentConfig` / `hoverBallStatus(+Enhance)` /
`translateHistoryStatus` / `clipboardListenerShowStatus(+Status)`；
删 `PlaySpeechServiceEnum` import 与迁移块；快捷键初始列表删 `SCREENSHOT_SILENCE_OCR` 项。

### 5.6 其他主进程

| 文件 | 改动 |
|---|---|
| `src/main/index.ts` | 删 `import './service/HoverBall'`、`'./service/OcrSilence'`、`'./service/ClipboardListenerService'`、`injectWinAgent` 及调用行 |
| `src/main/service/Set.ts` | 删 `ecDictDbClose` import 与调用 |
| `src/main/service/IpcMainHandle.ts` | 删 `agent-update-event` handler 与 `injectWinAgent` import |
| `src/main/service/TrayEvent.ts` | 删「静默截图OCR」菜单项 |
| `src/main/service/channel/TranslateChannel.ts` | 整文件只留翻译 4 个 IPC，删全部 OCR IPC 与 `OcrChannelFactory` |
| `src/main/service/LocalOcrModels.ts` | 删 `local-ocr-model-status` / `prepare-local-ocr-models` 两个 IPC（模型已内置，无需手动准备） |
| `src/common/utils/aiRequest.ts` | `aiServiceTypes = [OPEN_AI]`；删全部 GEMINI 分支，`readAiResponse/readAiStream/readChunk` 去掉 `type` 参数 |
| `src/renderer/src/channel/AiChannelRequest.ts` | 同步去掉调用处的 `info.type` 实参 |
| `src/renderer/src/channel/ChannelRequest.ts` | 只留 `static openaiTranslate = requestAiTranslation` 与 `agentApiTranslate` 注册 |
| `electron.vite.config.ts` | preload 与 renderer 的 input 各删 `hoverBall`、`ocrSilence` 两行 |

### 5.7 渲染层（Vue）

| 文件 | 改动 |
|---|---|
| `set/Set.vue` | 删「翻译记录」「网络设置」菜单项、import、挂载行 |
| `set/components/fun/AdvancedInfo.vue` | 删「语音播放源」「翻译记录」「鼠标悬浮球(两项)」「剪贴板监听(两项)」表单项及 ref / 事件函数 / `h`、`ElMessageBox` import |
| `set/components/fun/ShortcutKey.vue` | 删「截图静默OCR」表单项与对应 ref 字段 |
| `set/components/fun/serviceConfig/TranslateService.vue` | 删 GEMINI 专属文案、`requestArgumentsExample` 的 GEMINI 分支、Bing/BingDict/EcDict 内置提示块 |
| `set/components/fun/serviceConfig/OcrService.vue` | **整文件重写**：单张「TTime 本地离线识别」卡片 + 内嵌 `LocalOcrSettings`，无渠道列表/密钥表单 |
| `set/components/fun/serviceConfig/LocalOcrSettings.vue` | 语言只留 `ch`/`en`（仅这两套模型随包内置，保证全离线）；去掉「准备模型」按钮与状态 IPC，改为静态说明 |
| `translate/Translate.vue` | 首次初始化默认翻译源改为 `[OPEN_AI]`；**新增脏配置清理**：过滤掉已删除渠道的历史配置（见下） |
| `translate/components/Header.vue` | 删剪贴板监听按钮、翻译记录按钮及相关 ref / 函数 |
| `translate/components/Input.vue` | 删朗读按钮与 `playSpeech`；删翻译记录写入块及 `TranslateServiceRecordVo` / `StoreTypeEnum` / `updateTranslateRecordList` import |
| `translate/components/channel/InputResultContentChannel.vue` | 删朗读按钮（主结果 + 正音 us/uk）与 `playSpeech` / `playSpeechByUrl`、`updateTranslateRecord` 调用 |
| `utils/translate.ts` | 删 `playSpeech` / `playSpeechNewAudio` 及默认导出项 |
| `preload/set.ts` / `set.d.ts` | 删 `apiUniteOcrCheck`、`apiCheckOcrCallbackEvent`、`agentUpdateEvent`、`localOcrModelStatus`、`prepareLocalOcrModels` |

**脏配置清理**（升级过上游版本的用户配置里残留已删渠道，不清理会在启动时读到 `serviceInfo: undefined` 崩）：

```ts
const cachedTranslateServiceMap = cacheGet('translateServiceMap')
if (isNull(cachedTranslateServiceMap)) {
  setTranslateServiceMap(buildDefaultTranslateServiceMap())   // 只有 OPEN_AI
} else {
  const availableTypes = TranslateServiceBuilder.getServiceList()
  const cachedMap = new Map(cachedTranslateServiceMap)
  const cleanedMap = new Map(
    Array.from(cachedMap.entries()).filter(([, service]) => availableTypes.has(service?.type))
  )
  if (cleanedMap.size !== cachedMap.size) {
    setTranslateServiceMap(cleanedMap.size > 0 ? cleanedMap : buildDefaultTranslateServiceMap())
  }
}
```

---

## 第六部分：打包配置（Windows 专有关键项）

### 6.1 `electron-builder.yml`

```yaml
appId: com.ruizhideng.ttime.lite          # 必须改，否则与上游 Community 互相覆盖/单实例互踢
productName: TTime Lite
files:
  # 只带 Windows x64 的推理运行时，去掉其他平台二进制（省 89M）
  - '!node_modules/onnxruntime-node/bin/napi-v3/darwin/**'
  - '!node_modules/onnxruntime-node/bin/napi-v3/linux/**'
  - '!node_modules/onnxruntime-node/bin/napi-v3/win32/arm64/**'
afterPack: build/afterPack.js             # 裁剪 Chromium 语言包（23.x 无 electronLanguages 选项）
win:
  executableName: TTime Lite
```

### 6.2 `build/afterPack.js`（语言包裁剪）

```js
const fs = require('fs')
const path = require('path')
const KEEP = new Set(['zh-CN.pak', 'en-US.pak', 'zh-TW.pak'])

module.exports = async (context) => {
  const localesDir = path.join(context.appOutDir, 'locales')
  if (!fs.existsSync(localesDir)) return
  let removed = 0
  for (const file of fs.readdirSync(localesDir)) {
    if (KEEP.has(file)) continue
    try {
      fs.unlinkSync(path.join(localesDir, file))
      removed++
    } catch (error) {
      console.warn(`[afterPack] 跳过语言包 ${file}: ${error.message}`)
    }
  }
  console.log(`[afterPack] 已裁剪 ${removed} 个语言包，仅保留中英文`)
}
```

> 逐个 `unlinkSync` 且 catch 兜底：部分环境（含带批量删除防护的沙箱）会对连续删除抛异常，
> 裁剪失败**不应该**阻断打包。

### 6.3 `build/builder-installer.nsh`

`!define APP_NAME "TTime Community"` → `"TTime Lite"`。
该常量同时用于开机自启注册表写入（`HKCU\...\Run`）与安装路径追加，不改会导致自启指向不存在的 exe。

`VC_redist.x64.exe` 检测逻辑**保留**：onnxruntime-node 依赖 VC++ 运行时。

---

## 第七部分：验证门禁（缺一不发版）

### 7.1 构建门禁

```bash
rm -rf out && npm run build          # prepare:ocr + electron-vite build，须零 error
npx tsc --noEmit -p tsconfig.node.json --composite false | grep -v TS2564     # 应无输出
npx vue-tsc --noEmit -p tsconfig.web.json --composite false | grep -E "error TS" \
  | grep -vE "TS2339|TS2550|TS6133|TS2322|TS7030|TS2564"                      # 应无输出
```

> `TS2564`（属性未初始化）是上游遗留噪音，node 侧白名单只有它；
> web 侧白名单见上（上游约 40 处严格模式噪音）。**结构性错误必须为零。**

### 7.2 打包 + 体量核对

```bash
npx electron-builder --win --config
ls -lh dist/*.exe
du -sh dist/win-unpacked
ls dist/win-unpacked/locales                        # 应只剩 zh-CN/en-US(/zh-TW)
du -sh dist/win-unpacked/resources/app.asar.unpacked/node_modules/onnxruntime-node  # 应约 9.9M
```

### 7.3 启动门禁（Windows 专用写法）

```bash
taskkill //F //IM "TTime Lite.exe" 2>/dev/null
env -u ELECTRON_RUN_AS_NODE cmd //c start "" "dist\win-unpacked\TTime Lite.exe"
sleep 10
tasklist //FI "IMAGENAME eq TTime Lite.exe" //FO CSV
grep -icE "\[error\]|异常" "$APPDATA/TTime Lite/logs/$(date +%Y-%m-%d).log"   # 必须为 0
```

日志里应看到（且不含静默OCR项）：

```
[初始加载翻译快捷键事件] - 开始，翻译快捷键列表 :  [ input / screenshot / choice / showOcr / screenshotOcr ]
```

### 7.4 OCR 真实识图门禁（必跑）

OCR 结果窗口是 GUI，无法从命令行断言，用 robotjs + node-screenshots 做端到端：

1. 写一个已知文本的 txt，用 notepad 打开并置前；
2. 启动 App → `robot.keyToggle('alt','down') + keyTap('w')` 触发截图翻译；
3. `mouseToggle('down')` → 多次 `moveMouse` 拖选文字区域 → `mouseToggle('up')`；
4. 读 `%APPDATA%\TTime Lite\logs\*.log`，必须出现：

```
[截图翻译] - 开始截图
[截图翻译] - 关闭截图窗口
[翻译事件] - 翻译内容 : <框选区域里那几行文字>
```

`翻译内容` 与实际屏幕文字一致 = OCR 链路通；为空或乱码 = 链路坏（先查 `ocr/models` 是否齐全）。

### 7.5 装机（NSIS）

```bash
dist\TTime Lite-1.0.1-setup.exe    # oneClick:false，可改安装目录，装完可选开机自启
```

未签名安装包首次运行会触发 SmartScreen「未知发布者」，属预期。

---

## 第八部分：体量对比（本机实测）

| 指标 | 上游 Community | TTime Lite | 变化 |
|---|---|---|---|
| NSIS 安装包 | 136 M | **108 M** | -21% |
| win-unpacked | 400 M | **250 M** | -37% |
| app.asar | 63 M | **22 M** | -65% |
| onnxruntime-node（解包） | 98 M（含 darwin/linux/arm64） | **9.9 M**（仅 win32-x64） | -90% |
| Chromium 语言包 | 52 个 / 25 M | 3 个 / 约 1 M | -96% |
| npm 包数 | — | 净减 148 个 | — |

剩余体积主要是 Electron 本体（`TTime Lite.exe` 146M + 各类 dll），不换 Tauri 无法再压。

---

## 第九部分：首次使用配置

- 设置 → 翻译源设置 → OpenAI 实例：接口地址填 `http://127.0.0.1:11434/v1/chat/completions`（Ollama），
  模型名填已拉取的模型，密钥留空，保存后点「验证」启用
- 设置 → 翻译源设置 → OCR：只有「TTime 本地离线识别」，可选 中英混合 / 英文，可开关「合并段落」
- 快捷键：`Alt+Q` 输入翻译 / `Alt+W` 截图翻译 / `Alt+E` 划词 / `Alt+Shift+W` 截图 OCR
- 数据目录：`%APPDATA%\TTime Lite\`（`config.json` 在 `userDataConfig\`，OCR 模型首次识别时解压到 `ocr-models\`）
- 重置配置 = 删除整个 `%APPDATA%\TTime Lite\`

---

## 第十部分：故障排查

| 症状 | 根因 | 处理 |
|---|---|---|
| 双击/命令行启动无反应，退出码 0，无日志 | 环境存在 `ELECTRON_RUN_AS_NODE=1` | `env -u ELECTRON_RUN_AS_NODE` 启动；CI 里显式 unset |
| 启动即崩，日志 `Cannot read properties of undefined (reading 'name')` | `common/channel/*/info/` 里枚举在用的类型缺注册文件 | 补 `TTimeInfo.ts` / `OpenAIInfo.ts`，或清理残留枚举值 |
| 启动后翻译源列表空白 / 一开就报错 | 残留已删除渠道的旧配置 | 第五部分 5.7 的脏配置清理逻辑；或删 `%APPDATA%\TTime Lite\userDataConfig\config.json` |
| OCR 结果为空 | 模型缺失或 `textOcr` 窗口未起 | 查 `ocr/models/` 4 个 sha256 目录；查 `out/renderer/textOcr.html` 是否存在 |
| 打包后 OCR 报找不到模型 | `asarUnpack` 少了 `**/ocr/models/**` | 恢复该行 |
| `tsc` 报 `@types/node` 语法错 | 未钉 `16.18.126` | 按 4.5 钉死后 `npm install` |
| `npm install` 报 node-gyp / MSVC 缺失 | 引入了需要编译的依赖（如 `sqlite3`） | 精简版不应有任何非 NAPI 依赖；`npmRebuild` 保持 `false` |
| 安装后开机自启指向错误 exe | `builder-installer.nsh` 的 `APP_NAME` 没改 | 改成与 `executableName` 一致 |
| 安装包体积异常偏大 | `files` 里没排除其他平台 onnxruntime | 按 6.1 加三条 `!node_modules/onnxruntime-node/...` |
| 截图 OCR 快捷键注册失败 | 该组合被其他常驻软件占用 | 设置里换一个组合；日志会打印 `xxx快捷键注册失败` |

---

## 第十一部分：维护纪律

1. **依赖入库三问**：哪个 src 文件用它？删掉会断哪条链？能否用更小的 NAPI 预编译包替代？
2. **升级基底**：`git rebase` 上游 → 冲突全取 lite 侧删减集 → 7.1/7.3/7.4 三道门禁重跑。
3. **不要为了省体积动 OCR 引擎**，除非先在目标机验证过系统 OCR 可稳定调用。
4. **每版必跑**：构建门禁 + 启动门禁 + OCR 识图门禁。
