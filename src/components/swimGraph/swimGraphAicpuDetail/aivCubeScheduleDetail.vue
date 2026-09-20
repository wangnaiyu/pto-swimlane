<!--
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 -->
<template>
  <div class="dispatch-aiv-status-area">
      <div class="dispatch-aiv-area" :style="{ '--aiv-thread-num': aivThreadNum}">
        <div class="row">
          <div
            v-for="(item, index) in Math.floor(aivThreadNum / 2)"
            :key="`aiv-${(index + aicEndNum)}`"
           >
           <d-tooltip :content="'AIV_' + (index + aicEndNum)">
              <div :class = "{ active : (index + aicEndNum) >= aivDispatchNumstart && (index + aicEndNum) < aivDispatchNumend}"></div>
            </d-tooltip>
          </div>
        </div>
        <div class="row">
          <div
            v-for="(item, index) in Math.floor(aivThreadNum / 2)"
            :key="`aiv-${index + aicEndNum + Math.floor(aivThreadNum / 2)}`"
          >
          <d-tooltip :content="'AIV_' + (index + aicEndNum + Math.floor(aivThreadNum / 2))">
            <div :class = "{ active : index + aicEndNum + Math.floor(aivThreadNum / 2) >= aivDispatchNumstart && index + aicEndNum + Math.floor(aivThreadNum / 2) < aivDispatchNumend}"></div>
           </d-tooltip>
           </div>
        </div>
      </div>
  </div>
</template>

<script setup>
import { ref, inject, watch, onMounted} from 'vue';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const props = defineProps({
    aivDispatchNumstart: {
        type:Number,
        default: 0
    },
    aivDispatchNumend: {
        type:Number,
        default: 0
    },
    aicEndNum: {
        type:Number,
        default: 0
    },
    aivThreadNum: {
        type:Number,
        default: 48
    }
});

const lineColor = ref('rgba(255, 255, 255, 0.4)');
const divDefaultColor = ref('rgba(61, 61, 61, 1)');

const {
    isDarkTheme
} = inject('swimGraphState');

const updateTheme = () => {
  const theme = isDarkTheme.value ? 'dark' : 'white';
  if (theme === 'white') {
    lineColor.value = 'rgba(0, 0, 0, 0.4)';
    divDefaultColor.value = 'rgba(174, 174, 174, 1)';
    document.documentElement.style.setProperty('--lineColor', `${lineColor.value}`);
    document.documentElement.style.setProperty('--divDefaultColor', `${divDefaultColor.value}`);
  } else {
    lineColor.value = 'rgba(255, 255, 255, 0.4)';
    divDefaultColor.value = 'rgba(61, 61, 61, 1)';
    document.documentElement.style.setProperty('--lineColor', `${lineColor.value}`);
    document.documentElement.style.setProperty('--divDefaultColor', `${divDefaultColor.value}`);
  }
};

watch(isDarkTheme, () => {
  updateTheme();
});

onMounted(() => {
  updateTheme();
});

</script>

<style scoped lang="scss">
@import url("../css/swimGraph/AicpuDetail/aivCubeScheduleDetail.css");
</style>