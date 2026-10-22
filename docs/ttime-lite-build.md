# TTime Lite 构建方法论（跨机器复现指南）

> 本文记录 2026-10 由 TTime Community fork 改造出全离线精简版 TTime Lite 的完整方法论。
> 目标读者：需要在新机器上复现同样构建的自己人。先读「方法论」，再按「复现步骤」操作。

## 一、方法论（为什么这么做）

整个改造遵循四条原则，每一条都是踩坑换来的：

### 1. 先建基线，后动刀
在未改动的 pristine 源码上先完整走一遍 构建→打包→启动→OCR 验证，证明"改动之前它在这台机器上是好的"。基线不通就先解决环境，绝不带病动刀。
（反例：robotjs 在 Node 26 下编译失败——这是环境问题，不是改造问题，基线阶段就该暴露。）

### 2. 删除靠 require 链审计，不靠"看着没用"
删任何文件/依赖前，对整个 src 做全量 `require()`/`import` 扫描，确认删除集之外没有引用。三次翻车教训：
- `opencv.js` 看着像图片翻译遗留，实际是 textOcr 预加载必需
- `clipper-lib` 是本地 OCR 的识别框裁剪依赖
- `common/channel/ocr/info/` 里本地 OCR 自己的注册配置不能清空
这个项目的渠道注册全靠 `import.meta.glob`（删文件即删渠道），方便，但也意味着引用关系是隐式的。

### 3. 删除后全量符号扫描
删除完成后，把所有被删符号名（文件名、类名、枚举成员）逐一 grep 回扫，命中即修。本轮靠这步抓出 `translateHistoryStatus`、`prepareLocalOcrModels` 等十余处残留。

### 4. 门禁自动化
每个版本打包前后跑固定门禁，不靠手感：
- **构建门禁**：`electron-vite build` 零错误 + tsc 结构性错误为零（上游遗留的类型噪音白名单过滤）
- **OCR 门禁**：用包内真实的 `vision/bin/vision-ocr` 二进制识别一张测试图，断言输出包含已知文本
- **启动门禁**：装机后读应用日志，断言零 error/异常、主进程 CPU 空闲
- **杀进程要用 `kill <pid>`**：`pkill -f` 在 Electron 单实例锁场景下会漏杀，导致新构建验证的是旧进程

## 二、架构决策记录

| 决策 | 原因 |
|---|---|
| 基底选 Ruizhi-Deng/TTime（Community 1.0.1） | 官方仓库 0.9.3 起 releases 标签是假指针（全部指向同一老提交），闭源；此 fork 基于 0.9.2 开源码维护，已自带去 VIP/去自动更新/去云同步 |
| OCR 弃 PP-OCRv4/onnxruntime，改 macOS Vision | 实测 fork 的 PP-OCR 链路对大号清晰文字只检出 1 框、置信度 0.62（上游只在 Windows 验证过）；Vision 零模型体积、准确率满分、系统级稳定。省 102M |
| 翻译只留 OpenAI 兼容接口 | 指向本机 Ollama `http://127.0.0.1:11434/v1/chat/completions` 即全离线闭环 |
| 保留内置截图引擎（node-screenshots，0.5M） | 系统截图若因权限/系统更新失效时的备胎 |
| 删网络设置/代理层 | 翻译走本地回环，代理本就无效；axios 链路已是死代码 |

**已删除清单**：全部在线翻译渠道（含需 key 和内置免 key）、全部在线 OCR 渠道、悬浮球、静默 OCR、剪贴板监听、翻译记录（含 sqlite3）、TTS、BingDict/EcDict 词典、网络设置/代理、PP-OCR 全链（onnxruntime 77M + 模型 25M + opencv.js + clipper-lib）、自动更新、VIP/账户体系。
**保留功能**：输入/截图/划词翻译、截图 OCR、截图引擎二选一（默认系统 `screencapture -i`）、隐藏菜单栏图标开关、全局快捷键、托盘（可隐藏）。

## 三、复现步骤（新机器）

### 0. 环境要求（macOS Apple Silicon）
- Xcode Command Line Tools（`xcode-select -p` 确认，要 clang + swiftc）
- Node 16（**必须**，robotjs 编不过新 Node）：`curl -L -o node16.tar.xz https://nodejs.org/dist/v16.20.2/node-v16.20.2-darwin-arm64.tar.xz && tar xf node16.tar.xz`
- 本机已跑 Ollama（翻译引擎）

### 1. 获取源码
改动已提交在 `lite` 分支。把这个目录整体拷到新机器，或推到自己的私有仓库再 clone：
```bash
cd ~/Zcode/TTime-community   # 或你的存放路径
git checkout lite
export PATH=~/Zcode/node16/bin:$PATH
npm install                  # 会自动重编 robotjs/uiohook 原生模块
```

### 2. 环境变量（可选，网络受限时）
```bash
export HTTPS_PROXY=http://127.0.0.1:7897 HTTP_PROXY=$HTTPS_PROXY
```

### 3. 构建
```bash
npm run build:mac
# 产物：dist/TTime Lite-1.0.1-arm64.dmg（约 83M）
# prebuild 钩子会自动 swiftc 编译 vision/vision-ocr.swift → vision/bin/vision-ocr
```

### 4. 安装 + 门禁
```bash
pkill -f "TTime Lite"; sleep 2   # 注意确认进程真的死了（pgrep 复查）
rm -rf "/Applications/TTime Lite.app"
cp -R dist/mac-arm64/"TTime Lite.app" /Applications/
xattr -cr "/Applications/TTime Lite.app"          # 未签名，清隔离属性
open "/Applications/TTime Lite.app"; sleep 8
pgrep -f "TTime Lite.app/Contents/MacOS"          # 应有且仅一个主进程
# OCR 门禁：包内引擎识别测试图
/Applications/TTime\ Lite.app/Contents/Resources/vision/bin/vision-ocr <任一含文字截图> 
# 输出 JSON 的 lines 应含正确文本
# 启动门禁：日志零 error
tail -20 ~/Library/"Application Support"/"TTime Lite"/logs/$(date +%Y-%m-%d).log | grep -icE "error|异常"   # 应为 0
```

### 5. 首次使用配置
- 设置 → 翻译源设置 → 自定义接口：地址 `http://127.0.0.1:11434/v1/chat/completions`，模型名填 Ollama 已拉取的模型，key 留空
- 快捷键默认：Alt+Q 输入翻译、Alt+W 截图翻译、Alt+E 划词、Alt+Shift+W 截图 OCR
- 若系统截图不弹选区：系统设置 → 隐私与安全性 → 屏幕录制，给 TTime Lite 授权

## 四、维护要点

- **加/改功能**：直接改，改完跑第三节的门禁。渠道增删 = 增删 `src/common/channel/*/info/` 与 `src/main/service/channel/product/` 下的文件（import.meta.glob 自动注册）。
- **再删功能**：先 `grep -r "符号名" src` 审计，删完做符号回扫（见方法论第 3 条）。
- **升级基底**：rebase 到上游新提交时会冲突，冲突原则=保 lite 分支的删减集；升完重跑全部门禁。
- **依赖纪律**：新依赖入 package.json 前必须能回答"哪个 src 文件在用它"。
- **已知噪音**：web 端 vue-tsc 有约 40 个上游遗留严格模式报错（TS2339/TS2550/TS6133/TS2322/TS7030），结构性错误应为零；`@types/node` 必须钉 16.18.126（vue-tsc 1.8.27 + TS 4.9.3 解析不了新版类型文件）。

## 五、关键文件索引

| 路径 | 作用 |
|---|---|
| `vision/vision-ocr.swift` | Vision OCR 命令行工具源码（swiftc 编译，JSON 输出逐行文本+边界框） |
| `scripts/build-vision.js` | prebuild 钩子：编译上面的 Swift |
| `src/main/service/VisionOcr.ts` | 主进程 OCR 服务：写临时图 → spawn helper → 组装 OcrResult |
| `src/main/service/Screenshot.ts` | 截图引擎分派（系统/内置）+ 截图结束调度 |
| `src/common/ocr/OcrResult.ts` | OCR 结果模型 + 段落合并（从 PP-OCR 时代保留） |
| `src/main/service/TrayEvent.ts` | 托盘 + 隐藏菜单栏图标逻辑 |
| `electron-builder.yml` | `extraResources: vision/bin`，productName: TTime Lite |
