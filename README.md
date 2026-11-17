# TTime Lite

[TTime](https://github.com/inkTimeRecord/TTime) 的全离线精简分叉：**砍掉全部在线翻译渠道与冗余功能，只留本地能力**——OCR、翻译全部不出设备。

> 本仓库是 [TTime Community](https://github.com/Ruizhi-Deng/TTime)（基于 TTime 公开 0.9.2 源码的维护分支）的分叉，按"全离线"目标做了大幅裁剪。上游许可（Apache 2.0 + 附加条款）完整保留，见 [LICENSE.txt](LICENSE.txt)。

## 与上游的差异

**裁剪**（全部在线/云依赖）：

- 18 个在线翻译源全部移除（内置免 key 渠道蹭网页接口、TTime 官方云渠道、各家需 key 的 API）
- 在线 OCR 渠道全部移除
- AI 提示词自定义、配置文件页、关于页、托盘外链

**保留**（全本地）：

- 输入 / 划词 / 截图翻译、截图 OCR
- 翻译走 **OpenAI 兼容接口**（本地 [Ollama](https://ollama.com) 开箱即用，也兼容远端大模型 API，支持 API Key）
- 本地 PP-OCRv4 离线 OCR（Windows）/ macOS Vision（Mac 分支）
- 本地词典（Bing 词典 / 简明英汉词典，Windows）
- 全局快捷键、窗口钉住、隐私脱敏日志（不记录翻译内容原文）

**双平台 OCR 引擎按平台择优**：

| 平台 | OCR 引擎 | 说明 |
|---|---|---|
| Windows | PP-OCRv4（onnxruntime） | 中英模型内置；Windows 无系统级 OCR 脚本化路径 |
| macOS | **Vision 框架**（进程内） | 零模型文件、系统级识别质量；`lite` 分支独有 |

## 隐私

- 无遥测、无崩溃上报、无账户体系
- OCR 进程内完成，数据不出设备
- 翻译请求仅发往用户配置的接口地址
- 日志**不记录**翻译/OCR 内容原文（只记事件与长度）

## 下载

见 [Releases](../../releases)：

- `TTime-Lite-<ver>-setup.exe` — Windows x64 安装版（含 PP-OCR 模型与 VC++ 运行库）
- `TTime-Lite-<ver>-mac-arm64.dmg` / `.zip` — macOS Apple Silicon

## 构建

| 平台 | 要求 | 命令 |
|---|---|---|
| Windows | Node.js 16.20.2 | `npm install && npm run build:win` |
| macOS | Node.js 16.20.2 + Xcode CLT（swiftc） | `npm install && npm run build:mac` |

详细步骤与排障：Windows 见 [BUILD-Windows.md](BUILD-Windows.md)，macOS 见 [docs/ttime-lite-build.md](docs/ttime-lite-build.md)。

## 许可与归属

保留上游 [TTime 许可](LICENSE.txt)（Apache 2.0 + 附加条款：禁止商用运营同类服务、禁止移除商标）。OCR 模型及算法来源见 `ocr/` 下的 PaddleOCR、RapidOCR 许可文件。本项目为非商业个人工具，与 TTime 官方无关联。
