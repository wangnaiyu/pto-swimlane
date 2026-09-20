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
  <div class="com-graph-loading">
    <div class="loading-icon">
      <div class="bar1"></div>
      <div class="bar2"></div>
      <div class="bar3"></div>
      <div class="bar4"></div>
    </div>
    <span v-if="loadingText" class="loading-text">{{ loadingText }}
      <br />
        <template v-if="waitingFlag">
            {{ t('comGraph.currentNodeCounter') }}: {{nodeCount}}，
            {{ t('comGraph.readJsonWaitingTip') }} {{renderTime}}
        </template>
    </span>
    <span v-if="warningText" class="warning-text">{{ warningText }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps({
  loadingText: String,
  warningText: String,
  waitingFlag: Boolean
});

import { useI18n } from 'vue-i18n';
import { comGraphStore } from '../../service/com-graph-store';
import { computed } from 'vue';

const { t } = useI18n();

const nodeCount = computed(() => 
  comGraphStore.data?.pathNodesSet.size ?? comGraphStore.data?.nodeCount ?? 0
);

const LoadingCountMap = {
  NodesMoreThan5k: 'comGraph.NodesMoreThan5k',
  NodesMoreThan1w: 'comGraph.NodesMoreThan1w',
  NodesMoreThan2w: 'comGraph.NodesMoreThan2w',
};
const renderTime = computed(() => {
  const nodesCount = nodeCount.value;
  let time = '';
  if (nodesCount >= 5000 && nodesCount < 10000) {
    time = t(LoadingCountMap.NodesMoreThan5k);
  } else if (nodesCount >= 10000 && nodesCount < 20000) {
    time = t(LoadingCountMap.NodesMoreThan1w);
  } else if (nodesCount >= 20000) {
    time = t(LoadingCountMap.NodesMoreThan2w);
  }
  return time;
});

</script>

<style lang="scss">
@use 'devui-theme/styles-var/devui-var.scss' as *;

.com-graph-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 33px;
  text-align: center;

  .loading-icon {
    position: relative;
    display: block;
    margin: 0 auto;
    width: 15px;
    height: 15px;
    animation: spinner 1s linear infinite;

    div {
      position: absolute;
      left: 44.5%;
      top: 37%;
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .bar1 {
      top: 0;
      left: 0;
      background: var(--devui-brand);
    }

    .bar2 {
      top: 0;
      left: 9px;
      background: var(--devui-brand-foil);
    }

    .bar3 {
      top: 9px;
      left: 0;
      background: var(--devui-brand-foil);
    }

    .bar4 {
      top: 9px;
      left: 9px;
      background: var(--devui-brand);
    }
  }

  .loading-text {
    color: $devui-text;
    font-size: 16px;
    font-weight: 500;
    line-height: 24px;
  }

  .warning-text {
    color: #f69e39;
    font-size: 16px;
    font-weight: 500;
    line-height: 24px;
  }
}

@keyframes spinner {
  0% {
    transform: rotate(0deg) scale(1);
  }

  50% {
    transform: rotate(180deg) scale(1.5);
  }

  to {
    transform: rotate(360deg) scale(1);
  }
}
</style>
