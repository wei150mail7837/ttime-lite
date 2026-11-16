<template>
  <div class="ocr-service-layer">
    <div class="ocr-service-card">
      <div class="ocr-service-card-header">
        <img class="ocr-service-logo" :src="ttimeLogo" />
        <div class="ocr-service-title">
          <span class="ocr-service-name">TTime 本地离线识别</span>
          <span class="ocr-service-desc">PP-OCRv4 引擎，模型随安装包提供，不联网、不上传图片</span>
        </div>
        <el-tag type="success" effect="dark" size="small">已启用</el-tag>
      </div>
      <el-divider />
      <local-ocr-settings />
    </div>
  </div>
</template>

<script setup lang="ts">
import LocalOcrSettings from './LocalOcrSettings.vue'
import ttimeLogo from '../../../../assets/ocr/TTimeLogo.png'
</script>

<style lang="scss" scoped>
@import '../../../../css/set';

.ocr-service-layer {
  max-height: 500px;
  min-height: 500px;
}

.ocr-service-card {
  margin-top: 10px;
  padding: 20px 24px;
  border-radius: 8px;
  background: var(--ttime-translate-service-color-background);

  .ocr-service-card-header {
    display: flex;
    align-items: center;

    .ocr-service-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
    }

    .ocr-service-title {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding-left: 12px;

      .ocr-service-name {
        font-size: 15px;
        font-weight: 500;
      }

      .ocr-service-desc {
        font-size: 12px;
        color: #888;
        padding-top: 4px;
      }
    }
  }

  :deep(.el-divider--horizontal) {
    margin: 18px 0;
  }
}
</style>
