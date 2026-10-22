// 编译 macOS Vision OCR 命令行工具（仅 darwin）
const { execSync } = require('child_process')
const path = require('path')
if (process.platform !== 'darwin') {
  console.log('[vision] 非 darwin 平台跳过')
  process.exit(0)
}
const root = path.join(__dirname, '..')
const src = path.join(root, 'vision', 'vision-ocr.swift')
const out = path.join(root, 'vision', 'bin', 'vision-ocr')
execSync(`swiftc -O "${src}" -o "${out}"`, { stdio: 'inherit' })
console.log('[vision] vision-ocr 编译完成')
