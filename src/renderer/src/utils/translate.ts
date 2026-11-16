import { isNull } from '../../../common/utils/validate'
import ElMessageExtend from './messageExtend'

/**
 * 文字写入到剪贴板
 */
const textWriteShearPlate = (text): void => {
  if (isNull(text)) {
    ElMessageExtend.warning('复制的文本内容为空')
    return
  }
  window.api.textWriteShearPlateEvent(text)
  ElMessageExtend.success('复制成功')
}

/**
 * 文字写入到剪贴板 - 驼峰格式
 */
const copyCamelCase = (text): void => {
  // 去除标点符号并替换为空格
  text = text.replace(/[^\w\s]|_/g, ' ').replace(/\s+/g, ' ')
  // 将单词转换为小写
  text = text.toLowerCase()
  // 转换为驼峰命名
  text = text.replace(/\s(.)/g, (_match, group) => {
    return group.toUpperCase()
  })
  // 去除空格
  text = text.replace(/\s/g, '')
  textWriteShearPlate(text)
}

/**
 * 文字写入到剪贴板 - 下划线格式
 */
const copySnakeCase = (text): void => {
  // 去除标点符号并替换为空格
  text = text.replace(/[^\w\s]|_/g, ' ').replace(/\s+/g, ' ')
  // 将空格替换为下划线并转换为小写
  text = text.replace(/\s/g, '_').toLowerCase()
  // 将连续的下划线替换为单个下划线
  text = text.replace(/_{2,}/g, '_')
  // 修剪结尾的下划线
  text = text.replace(/_$/, '')
  textWriteShearPlate(text)
}

export default {
  textWriteShearPlate,
  copyCamelCase,
  copySnakeCase
}
