// OCR 端到端门禁：编译 src/common/ocr 全链路（模型缓存→检测→识别→段落合并），对测试图跑真实识别
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const tmp = '/tmp/ttime-ocr-gate'
fs.rmSync(tmp, { recursive: true, force: true })
fs.mkdirSync(tmp, { recursive: true })
execSync(
  `npx esbuild src/common/ocr/gate-entry.ts --bundle --platform=node --external:onnxruntime-node --external:opencv.js --external:clipper-lib --external:axios --outfile=${tmp}/gate.cjs`,
  { stdio: 'inherit' }
)
const { runGate } = require(`${tmp}/gate.cjs`)
const image = process.argv[2] || '/tmp/ocr-test.png'
runGate('ocr/models', image, path.join(tmp, 'model-cache'))
  .then((text) => {
    console.log('[ocr-gate] 识别:', JSON.stringify(text.slice(0, 120)))
    if (!text.trim()) { console.error('[ocr-gate] FAIL 空结果'); process.exit(1) }
    console.log('[ocr-gate] PASS')
  })
  .catch((e) => { console.error('[ocr-gate] FAIL:', e.message); process.exit(1) })
