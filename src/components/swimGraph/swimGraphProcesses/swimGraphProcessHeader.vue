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
  <div :class="['process-header', { 'no-sticky': !isE2ESwim }]" @click="handleToggleProcess">
    <div class="process-header-label" @mouseover.stop="handleMouseOver">
      <div class="label_one">
        <span class="expand-icon" v-if="isExpanded"><img class="collapse" :src="collapse" alt="collapse"/></span>
        <span class="expand-icon" v-else><img class="dropDown" :src="dropDown" alt="dropDown"/></span>
        <d-tooltip :content="process.name">
          <span>{{ process.name }}</span>
        </d-tooltip>
      </div>
      <div class="label_two" v-if="isExpanded && !isMsProf">
        <d-select class="labelSelect" menu-class="globalSelect" v-model="selectedOption" :options="options" :placeholder="$t('clockCycle')" option-disabled-key="disabled" size="sm" @toggle-change="onMenuChange"></d-select>
      </div>
    </div>
    <div class="process-header-line">
      <canvas ref="headerCanvasRef" class="process-header-canvas"></canvas>
      <canvas ref="hoverHeaderCanvasRef" class="process-hover-header-canvas"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onBeforeUnmount, watch, nextTick, provide} from 'vue';
import { useI18n } from 'vue-i18n';
import { setupHighDPICanvas } from '../swimGraphUtils';
import { canvasPool } from '../render/canvasPool';
import { processHeaderRenderer } from '../render/processHeaderRenderer';

const { t: $t } = useI18n();
// 注入父组件提供的状态和方法
const swimGraphState = inject('swimGraphState');
const {
  viewState,
  layout,
  processExpanded,
  swimlaneContainer,
  isDarkTheme,
  childContextMap,
  isE2ESwim,
  isMsProf
} = swimGraphState;

const {
  toggleProcess
} = inject('swimGraphMethods');

const { addChildContext } = inject('swimGraphContext');
const { options, selectedOption } = inject('swimCycleDisplay');

const headerCanvasRef = ref(null);
const hoverHeaderCanvasRef = ref(null);

let dropDown = ref(`${window.staticPath}/static-assets/swim_dropDown.svg`);
let collapse = ref(`${window.staticPath}/static-assets/swim_collapse.svg`);

// 定义props
const props = defineProps({
  processKey: {
    type: String,
    required: true
  },
  process: {
    type: Object,
    required: true
  }
});

function onMenuChange() {
  nextTick(() => {
    const menuList = document.querySelectorAll('.globalSelect li');
    for (let i = 0; i < menuList.length; i++) {
      const item = menuList[i];
      item.setAttribute('title', item.innerText);
    }
  });
};

watch(selectedOption, () => {
  nextTick(() => {
    const inputDom = document.querySelector('.labelSelect input');
    if (inputDom) {
      inputDom.setAttribute('title', inputDom.value);
    }
  });
});

const isExpanded = computed(() => {
  return processExpanded.get(props.processKey);
});

const handleToggleProcess = () => {
  toggleProcess(props.processKey);
  childContextMap.threadEvent.eraseEventLine('over');
};
let resetWidth = ref(false);

const curThread = inject('curThread');

const handleMouseOver = (e) => {
  if (curThread != '') {
    curThread.value = '';
  }
};

const processHeadCanvasResize = () => {
  if (!headerCanvasRef.value || !hoverHeaderCanvasRef.value) {
    return;
  }

  setupHighDPICanvas(headerCanvasRef.value, viewState.canvasCssWidth, layout.processHeaderHeight);
  setupHighDPICanvas(hoverHeaderCanvasRef.value, viewState.canvasCssWidth, layout.processHeaderHeight);
}

const drawProcessHeadLine = (x, color, flag) => {
  // 委托渲染层（processHeaderRenderer）绘制观测线
  // 渲染器内部从 CanvasPool 取所有进程实例统一操作
  processHeaderRenderer.drawObservationLine(x, color, flag);
}

const eraseProcessHeadLine = (flag) => {
  processHeaderRenderer.eraseObservationLine(flag);
}

// 生命周期钩子
onMounted(() => {
  // canvas 初始化
  processHeadCanvasResize();
  // 向 CanvasPool 注册实例（以 processKey 作为 instanceKey）
  if (headerCanvasRef.value) {
    canvasPool.register('process-header-canvas', props.processKey, headerCanvasRef.value);
  }
  if (hoverHeaderCanvasRef.value) {
    canvasPool.register('process-hover-header-canvas', props.processKey, hoverHeaderCanvasRef.value);
  }

  const containerEl = swimlaneContainer.value?.parentNode?.querySelector('.swimlane-container');
  if (containerEl) {
    resetWidth.value = containerEl.offsetWidth === containerEl.clientWidth;
  }
  updateTheme();
});

onBeforeUnmount(() => {
  // 从 CanvasPool 注销实例
  canvasPool.unregister('process-header-canvas', props.processKey);
  canvasPool.unregister('process-hover-header-canvas', props.processKey);
});

addChildContext('processHeaderEvent', {
  drawProcessHeadLine,
  eraseProcessHeadLine,
  handleToggleProcess,
});

watch(isDarkTheme, () => {
  updateTheme();
});

watch(() => viewState.canvasCssWidth, () => {
  processHeadCanvasResize();
}, { flush: 'sync' });

const updateTheme = () => {
  dropDown.value =  isDarkTheme.value ? `${window.staticPath}/static-assets/swim_dropDown.svg` : `${window.staticPath}/static-assets/swim_dropDown_light.svg`;
  collapse.value =  isDarkTheme.value ? `${window.staticPath}/static-assets/swim_collapse.svg` : `${window.staticPath}/static-assets/swim_collapse_light.svg`;
}
</script>

<style scoped lang="scss">
@import url("../css/swimGraph/Processes/header.css");
.label_two {
  display: flex;
  width: 118px;
  align-items: center;
  text-align: right;
  margin-right: 4px;
  margin-left: 4px;
  :deep() {
    .devui-select:not(.devui-select--disabled):not(.devui-select--underlined) .devui-select__selection.devui-select__selection--glow-style:hover {
      border-color: var(--devui-select-hover-border-color);
    }
    .devui-select--open .devui-select__selection.devui-select__selection--glow-style {
      border-color: var(--devui-select-active-border-color) !important;
    }
    .devui-select__selection {
      background-color: transparent;
      border-color: transparent;
    }
    .devui-select__input {
      color: var(--devui-primary-text);
      text-align: right;
    }
  }
}
</style>
<style lang="scss">
.globalSelect {
  border-radius: 8px;
  gap: 4;
  padding: 4px;
}

.globalSelect .devui-select__item { 
  font-size: 13px !important;
  border-radius: 4px;
}
</style>