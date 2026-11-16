<template>
  <el-form label-width="100px" label-position="left">
    <el-form-item label="识别语言">
      <el-select v-model="language" @change="changeLanguage">
        <el-option v-for="item in languages" :key="item.id" :value="item.id" :label="item.name" />
      </el-select>
    </el-form-item>
    <el-form-item label="合并段落">
      <el-switch v-model="merge" @change="cacheSet('localOcrMergeParagraphs', merge)" />
    </el-form-item>
    <p>依据文本框的位置合并相邻行，保留英文单词间的空格。关闭后逐行输出。</p>
    <p>中英混合与英文两套模型已内置，首次识别时自动解压到本机数据目录，之后完全离线。</p>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { cacheGet, cacheSet } from '../../../../utils/cacheUtil'

// 仅保留随安装包内置的模型，保证全离线可用
const languages = [
  { id: 'ch', name: '中英混合' },
  { id: 'en', name: '英文' }
]

const language = ref(cacheGet('localOcrLanguage') || 'ch')
const merge = ref(cacheGet('localOcrMergeParagraphs'))

const changeLanguage = (): void => {
  cacheSet('localOcrLanguage', language.value)
}
</script>

<style scoped>
p {
  font-size: 12px;
  line-height: 1.7;
  color: #777;
  margin: 0 0 14px;
}
</style>
