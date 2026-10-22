<template>
  <div class='translate-service-layer'>
    <div class='translate-service-set-block'>
      <div class='translate-service-set'>
        <el-form label-width='100px' label-position='left'>
          <el-form-item label='OCR 源'>
            <span>本地离线识别（macOS Vision，无需配置）</span>
          </el-form-item>
          <el-form-item label='合并段落'>
            <el-switch v-model='merge' @change='cacheSet("localOcrMergeParagraphs", merge)' />
          </el-form-item>
          <p>开启后依据文本框位置合并相邻行，保留英文单词间空格；关闭后逐行输出。</p>
        </el-form>
      </div>
    </div>
  </div>
</template>
<script setup lang='ts'>
import { ref } from 'vue'
import { cacheGet, cacheSet } from '../../../../utils/cacheUtil'

const merge = ref(cacheGet('localOcrMergeParagraphs'))
</script>
