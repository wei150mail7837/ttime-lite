const fs = require('fs')
const path = require('path')

/**
 * 打包后裁剪 Chromium 语言包，仅保留中英文
 *
 * electron-builder 23.x 不支持 electronLanguages 配置项，故用 afterPack 钩子处理。
 * 删除逐个进行并捕获异常：部分环境对批量删除有防护，裁剪失败不应阻断打包。
 */
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
