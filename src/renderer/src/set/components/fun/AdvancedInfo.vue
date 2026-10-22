<template>
  <el-form :model="advancedSettingInfo" label-width="150px">
    <span class="group-title-span none-select"> 翻译设置 </span>
    <el-divider />
    <el-form-item class="none-select" label="文本处理">
      <el-checkbox
        v-model="advancedSettingInfo.wrapReplaceSpaceStatus"
        @change="wrapReplaceSpaceStatusEvent"
      />
      <span class="form-switch-span none-select"> 将翻译结果的 [ 换行符 ] 替换为 [ 空格 ] </span>
    </el-form-item>
    <el-form-item class="none-select" label="显示翻译不清空内容">
      <el-checkbox
        v-model="advancedSettingInfo.showTranslateNotEmptyStatus"
        @change="showTranslateNotEmptyStatusEvent"
      />
      <span class="form-switch-span none-select"> 当触发显示翻译窗口时不会清空上一次翻译内容 </span>
    </el-form-item>

    <span class="group-title-span none-select"> OCR设置 </span>
    <el-divider />
    <el-form-item class="none-select" label="OCR文本处理">
      <el-checkbox
        v-model="advancedSettingInfo.ocrWrapReplaceSpaceStatus"
        @change="ocrWrapReplaceSpaceStatusEvent"
      />
      <span class="form-switch-span none-select"> 将OCR结果的 [ 换行符 ] 替换为 [ 空格 ] </span>
    </el-form-item>
    <el-form-item class="none-select">
      <el-checkbox
        v-model="advancedSettingInfo.ocrWrapReplaceStatus"
        @change="ocrWrapReplaceStatusEvent"
      />
      <span class="form-switch-span none-select"> 将OCR结果的 [ 换行符 ] 替换为 [ 空白 ] </span>
    </el-form-item>
    <el-form-item class="none-select" label="OCR结果写入剪贴板">
      <el-checkbox
        v-model="advancedSettingInfo.ocrWriteClipboardStatus"
        @change="ocrWriteClipboardStatusEvent"
      />
      <span class="form-switch-span none-select"> 将OCR识别后的文字自动写入剪贴板 </span>
    </el-form-item>

    <span class="group-title-span none-select"> 功能设置 </span>
    <el-divider />
    <el-form-item class="none-select" label="窗口配置">
      <el-checkbox
        v-model="advancedSettingInfo.alwaysOnTopAllowEscStatus"
        label="置顶时允许隐藏窗口"
        @change="alwaysOnTopAllowEscStatusEvent"
      />
      <span class="form-switch-span none-select">
        开启后，当翻译 / OCR窗口置顶时，按ESC键依旧可隐藏窗口
      </span>
    </el-form-item>
    <el-form-item class="none-select" label="使用系统截图">
      <el-checkbox
        v-model="advancedSettingInfo.systemScreenshotStatus"
        @change="systemScreenshotStatusEvent"
      />
      <span class="form-switch-span none-select">
        开启后使用 macOS 自带截图选区（screencapture），关闭则使用内置选区窗口
      </span>
    </el-form-item>
    <el-form-item class="none-select" label="隐藏菜单栏图标">
      <el-checkbox
        v-model="advancedSettingInfo.hideTrayIconStatus"
        @change="hideTrayIconStatusEvent"
      />
      <span class="form-switch-span none-select">
        隐藏后菜单栏将不显示 TTime 图标；翻译窗口左上角仍可进入设置，重新打开 TTime 可唤起窗口
      </span>
    </el-form-item>
    <el-form-item class="none-select" label="输入自动翻译">
      <el-checkbox
        v-model="advancedSettingInfo.inputTranslationAutoStatus"
        @change="inputTranslationAutoStatusEvent"
      />
      <span class="form-switch-span none-select">
        开启后，当在翻译窗口输入后将会自动进行翻译，无需再按回车
      </span>
    </el-form-item>
    <el-form-item class="none-select" label="翻译结果功能">
      <el-checkbox
        v-model="advancedSettingInfo.copyCamelCaseResultStatus"
        label="翻译结果为英文时显示复制驼峰按钮"
        @change="copyCamelCaseResultStatusEvent"
      />
      <span class="form-switch-span none-select">
        开启后，例如翻译结果为 [ Hello World ] 点击此按钮后会转换为 [ helloWorld ] 写入剪贴板
      </span>
      <el-checkbox
        v-model="advancedSettingInfo.copySnakeCaseResultStatus"
        label="翻译结果为英文时显示复制蛇形按钮"
        @change="copySnakeCaseResultStatusEvent"
      />
      <span class="form-switch-span none-select">
        开启后，例如翻译结果为 [ Hello World ] 点击此按钮后会转换为 [ hello_world ] 写入剪贴板
      </span>
    </el-form-item>
  </el-form>
</template>
<script setup lang="ts">
// 翻译内容框内容
import { ref } from 'vue'
import { YesNoEnum } from '../../../../../common/enums/YesNoEnum'
import { cacheGet, cacheSet } from '../../../utils/cacheUtil'

/**
 * 翻译相关设置
 */
const advancedSettingInfo = ref({
  alwaysOnTopAllowEscStatus: cacheGet('alwaysOnTopAllowEscStatus') === YesNoEnum.Y,
  systemScreenshotStatus: cacheGet('systemScreenshotStatus') === YesNoEnum.Y,
  hideTrayIconStatus: cacheGet('hideTrayIconStatus') === YesNoEnum.Y,
  wrapReplaceSpaceStatus: cacheGet('wrapReplaceSpaceStatus') === YesNoEnum.Y,
  ocrWriteClipboardStatus: cacheGet('ocrWriteClipboardStatus') === YesNoEnum.Y,
  ocrWrapReplaceSpaceStatus: cacheGet('ocrWrapReplaceSpaceStatus') === YesNoEnum.Y,
  ocrWrapReplaceStatus: cacheGet('ocrWrapReplaceStatus') === YesNoEnum.Y,
  showTranslateNotEmptyStatus: cacheGet('showTranslateNotEmptyStatus') === YesNoEnum.Y,
  inputTranslationAutoStatus: cacheGet('inputTranslationAutoStatus') === YesNoEnum.Y,
  copyCamelCaseResultStatus: cacheGet('copyCamelCaseResultStatus') === YesNoEnum.Y,
  copySnakeCaseResultStatus: cacheGet('copySnakeCaseResultStatus') === YesNoEnum.Y
})

/**
 * 置顶时允许隐藏窗口选择事件
 *
 * @param val 置顶时允许隐藏窗口状态
 */
const alwaysOnTopAllowEscStatusEvent = (val): void => {
  cacheSet('alwaysOnTopAllowEscStatus', val ? YesNoEnum.Y : YesNoEnum.N)
  advancedSettingInfo.value.alwaysOnTopAllowEscStatus = val
  // 更新置顶时允许隐藏窗口选择事件通知
  window.api.alwaysOnTopAllowEscStatusNotify()
}

/**
 * 使用系统截图状态事件
 *
 * @param val 使用系统截图状态
 */
const systemScreenshotStatusEvent = (val): void => {
  cacheSet('systemScreenshotStatus', val ? YesNoEnum.Y : YesNoEnum.N)
  advancedSettingInfo.value.systemScreenshotStatus = val
}

/**
 * 隐藏菜单栏图标状态事件
 *
 * @param val 隐藏菜单栏图标状态
 */
const hideTrayIconStatusEvent = (val): void => {
  cacheSet('hideTrayIconStatus', val ? YesNoEnum.Y : YesNoEnum.N)
  advancedSettingInfo.value.hideTrayIconStatus = val
  window.api.hideTrayIconStatusNotify()
}

/**
 * 换行符替换为空格事件
 *
 * @param val 换行符替换为空格状态
 */
const wrapReplaceSpaceStatusEvent = (val): void => {
  cacheSet('wrapReplaceSpaceStatus', val ? YesNoEnum.Y : YesNoEnum.N)
  advancedSettingInfo.value.wrapReplaceSpaceStatus = val
}

/**
 * 显示翻译窗口不清空状态事件
 *
 * @param val 显示翻译窗口不清空状态
 */
const showTranslateNotEmptyStatusEvent = (val): void => {
  cacheSet('showTranslateNotEmptyStatus', val ? YesNoEnum.Y : YesNoEnum.N)
  advancedSettingInfo.value.showTranslateNotEmptyStatus = val
}

/**
 * OCR结果换行符替换为空格事件
 *
 * @param val 换行符替换为空格状态
 */
const ocrWrapReplaceSpaceStatusEvent = (val): void => {
  cacheSet('ocrWrapReplaceSpaceStatus', val ? YesNoEnum.Y : YesNoEnum.N)
  advancedSettingInfo.value.ocrWrapReplaceSpaceStatus = val
}

/**
 * OCR结果换行符替换事件
 *
 * @param val 换行符替换状态
 */
const ocrWrapReplaceStatusEvent = (val): void => {
  cacheSet('ocrWrapReplaceStatus', val ? YesNoEnum.Y : YesNoEnum.N)
  advancedSettingInfo.value.ocrWrapReplaceStatus = val
}

/**
 * OCR结果写入剪贴板
 *
 * @param val OCR结果写入剪贴板状态
 */
const ocrWriteClipboardStatusEvent = (val): void => {
  cacheSet('ocrWriteClipboardStatus', val ? YesNoEnum.Y : YesNoEnum.N)
  advancedSettingInfo.value.ocrWriteClipboardStatus = val
}

/**
 * 输入自动翻译状态事件
 *
 * @param val 状态
 */
const inputTranslationAutoStatusEvent = (val): void => {
  cacheSet('inputTranslationAutoStatus', val ? YesNoEnum.Y : YesNoEnum.N)
  advancedSettingInfo.value.inputTranslationAutoStatus = val
}

/**
 * 复制驼峰命名状态
 */
const copyCamelCaseResultStatusEvent = (val): void => {
  cacheSet('copyCamelCaseResultStatus', val ? YesNoEnum.Y : YesNoEnum.N)
  advancedSettingInfo.value.copyCamelCaseResultStatus = val
}

/**
 * 复制下划线命名状态
 */
const copySnakeCaseResultStatusEvent = (val): void => {
  cacheSet('copySnakeCaseResultStatus', val ? YesNoEnum.Y : YesNoEnum.N)
  advancedSettingInfo.value.copySnakeCaseResultStatus = val
}
</script>

<style lang="scss" scoped>
@import '../../../css/set.scss';

.form-switch-span {
  margin-left: 5px;
}

.group-title-span {
  margin-left: 5px;
  font-size: 13px;
  color: var(--el-menu-text-color);
}

.comment-wrap-block {
  display: flex;
  flex-direction: column;
}

.form-item-group {
  margin-bottom: 0;
}

:deep(.el-divider--horizontal) {
  margin: 15px 0;
}

:deep(.el-checkbox) {
  margin-right: 10px;
}
</style>
