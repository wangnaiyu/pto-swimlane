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
  <div class="timeline" id="timeline-container"
  @mousedown="timelineMouseDown($event)" @mousemove="timelineMouseMove($event)" @mouseup="timelineMouseUp($event)"
  @mouseleave="timelineMouseOut($event)">
    <!-- 一段时间轴区域 -->
    <div class="fixed-timeline-area" v-if="!loading">
      <canvas class="fixed-timeline-canvas" ref="fixedtimelineCanvas" @mouseover="fixedMouseEvent" @mousemove="fixedMouseEvent"></canvas>
      <canvas class="hover-flags-line-canvas" ref="hoverFlagsLineCanvas" @mouseover="fixedMouseEvent" @mousemove="fixedMouseEvent"></canvas>
    </div>
    <!-- 二段时间轴区域 -->
    <div class="timeline-area" id="timeline-area" v-if="!loading">
      <canvas class="timeline-canvas" ref="timelineCanvas" @wheel="handleWheel"></canvas>
      <canvas :style="hoverFlags ? '': 'display:none'" class="hover-flags-canvas" ref="hoverFlagsCanvas"></canvas>
      <canvas :style="hoverFlags ? '': 'display:none'" class="flags-canvas" ref="flagsCanvas" @mouseover="flagMouseOver" @mouseleave="flagMouseOut" @mousemove="flagMouseMove"
      @click="flagMouseClick"></canvas>
    </div>
    <div class="flagtooltip" ref="flagtooltip" :style="flagtooltipStyle">
      <d-button icon="icon-delete" class="deletebotton" style="font-size: 16px;" @click.stop="deleteFlag"></d-button>
      <d-button icon="icon-edit" class="editbotton" style="font-size: 16px;" @click.stop="editFlag"></d-button>
    </div>
    <div v-if="isEditing" class="edit-model" id="edit-model" :style="editmodelStyle">
      <div class="model-content">
        <div class="edit-head">
          <div class="edit-title">{{ $t('editTitle') }}</div>
          <div class="edit-close-button">
            <d-button icon="icon-close" style="border:none; background-color: transparent" @click="toggleEditModel"></d-button>
          </div>
        </div>
        <div class="edit-time">
          <span class="time-title">{{ $t('editTime') }}</span>
          <span class="time-edit"> {{ editTime }} </span>
        </div>
        <div class="edit-color">
          <span class="color-title">{{ $t('editColor') }}</span>
          <d-slider class="flagcolor" v-model="colorValue" :min="0" :max="360" :interval="1" :tooltip="'always'" @update:modelValue="onColorChange"></d-slider>
          <d-slider class="saturation" v-model="saturationValue" :min="0" :max="100" :interval="1" :tooltip="'always'" @update:modelValue="onSaturationChange"></d-slider>
        </div>
        <div class="edit-label">
          <span class="laebl-edit">{{ $t('editLabel') }}</span>
          <d-input class="label-input" v-model="refLabel" size="sm" :placeholder="$t('editInput')" show-count :maxlength="16" clearable @clear="handleClear" @update:modelValue="onInputChange"></d-input>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, nextTick, reactive, watch} from 'vue';
import { devicePixelRatio, setupHighDPICanvas, getCanvasCSSWidth, COLOR_CFG } from '../swimGraphUtils';
import { useI18n } from 'vue-i18n';
import { throttle, debounce } from 'lodash-es';
import { getTextWidth } from '../../../utils';
import { useViewServer } from '../../../core/use-view-server';
import { getIsCompleteBoot } from '@/apis/welcome';
import { swimConfig } from '@/components/welcome/guideStepsConfig';
import { MeatureRender } from '../swimGraphProcesses/render/meatureRender';
const { server } = useViewServer();
const { isDarkTheme } = inject('root');
const { t: $t } = useI18n();

// 注入父组件提供的状态和方法
const {
  viewState,
  layout,
  timeLineX,
  sliderValue,
  sliderMax,
  initialScale,
  loading,
  timelineState,
  childContextMap,
  isE2ESwim,
  freezeVisibleRange,
} = inject('swimGraphState');

const {
  render,
  renderFixedTimeline,
  renderTimeline,
  calculateGridInterval,
  timeToX,
  xToTime,
  transform,
  pinnedDrawLine,
  pinnedEraseLine
} = inject('swimGraphMethods');
const props = defineProps({
  hoverFlags: {
    type: Boolean,
    default: () => true,
  },
});
let isTimelineDragging = false;
let timelineInitX = 0;
let timelineInitStartX = 0;
let timelineInitEndX = 0
let lastPostion = 0;
let isGuidePage = false;
let wheelDebounceTimer;
const fixedtimelineCanvas = ref(null);
const fixedtimelineCtx = ref(null);
const timelineCanvas = ref(null);
const timelineCtx = ref(null);
const flagsCanvas = ref(null);
const flagsCtx = ref(null);
const hoverFlagsCanvas = ref(null);
const hoverFlagsLineCanvas = ref(null);
const hoverFlagsCtx = ref(null);
const hoverFlagsLineCtx = ref(null);
const isTimelineMove = ref(false);
const hoverCurFlag = ref(null);
const flags = ref([]);
const currentFlag = ref(null);
const colorValue = ref(0);
const saturationValue = ref(100);
const refColor = ref("rgba(94, 124, 224, 1)");
const refLabel = ref("");
const isShowTooltip = ref(false);
const flagtooltip = ref(null);
const boxWidth = 45;
let flagHoverData = {
  preData: null,
  lastData: null,
  largeSpacing: false
};
let colorCfg = isDarkTheme.value ? COLOR_CFG.dark : COLOR_CFG.light;
const swimGraphState = inject('swimGraphState');
let measureRenderer = new MeatureRender({...swimGraphState, colorCfg}, $t('lessThan0'));

watch(isDarkTheme, () => {
  colorCfg = isDarkTheme.value ? COLOR_CFG.dark : COLOR_CFG.light;
  measureRenderer = new MeatureRender({...swimGraphState, colorCfg}, $t('lessThan0'));
  renderFixedTimeline();
  renderTimeline();
});
const flagtooltipStyle = reactive({
  display: 'none',
  left: '0px',
  top: '0px'
})
const isEditing = ref(false);
const editTime = ref('00:00:00.123456789');
const editmodelStyle = reactive({
  display: 'none',
  left: '0px',
  top: '0px'
})
const toggleEditModel = () => {
  isEditing.value = false;
  refLabel.value = '';
  hideTooltip();
}
const handleClear = () => {
  refLabel.value = '';
};

const fixedXToTime = (x) => {
  if (!fixedtimelineCanvas.value) return 0;

  const canvasWidth = viewState.canvasCssWidth;
  const normalizedTime = (x - layout.processLabelWidth) / canvasWidth;
  return viewState.minTime + (normalizedTime * viewState.timeRange);
};

const mouseStyleChange = (style) => {
  fixedtimelineCanvas.value.style.cursor = style;
  flagsCanvas.value.style.cursor = style;
  hoverFlagsLineCanvas.value.style.cursor = style;
};

const mouseStyleEvent = (mousex) => {
  if (isGuidePage) {
    return;
  }
  if (Math.abs(mousex - timelineState.startTimeX) < 5) {
    mouseStyleChange('col-resize');
    return;
  }

  if (Math.abs(mousex - timelineState.endTimeX) < 5) {
    mouseStyleChange('col-resize');
    return;
  }

  if (mousex > timelineState.startTimeX && mousex < timelineState.endTimeX) {
    mouseStyleChange('grab');
    return;
  }

  if (mousex < timelineState.startTimeX || mousex > timelineState.endTimeX) {
    mouseStyleChange('text');
    return;
  }
};

const fixedMouseEvent = (e) => {
  if (!fixedtimelineCtx.value || !fixedtimelineCanvas.value) {
    return;
  }
  const rect = fixedtimelineCanvas.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  mouseStyleEvent(mouseX);
};

const timelineMouseDown = (e) => {
  hoverLineErase();
  if (!fixedtimelineCtx.value || !fixedtimelineCanvas.value) return;
  const rect = fixedtimelineCanvas.value.getBoundingClientRect();
  
  const mouseX = e.clientX - rect.left;
  timelineInitX = mouseX;
  lastPostion = mouseX;
  timelineInitStartX = timelineState.startTimeX;
  timelineInitEndX = timelineState.endTimeX;

  if (isGuidePage) {
    return;
  }

  if (Math.abs(mouseX - timelineInitStartX) < 5){
    isTimelineDragging = true;
    timelineState.isInLeftTag = true;
    return;
  }

  if (Math.abs(mouseX - timelineInitEndX) < 5){
    isTimelineDragging = true;
    timelineState.isInRightTag = true;
    return;
  }

  if (mouseX > timelineInitStartX && mouseX < timelineInitEndX) {
    isTimelineDragging = true;
    mouseStyleChange('grabbing');
    timelineState.isOnTag = true;
    return;
  }

  if (mouseX < timelineInitStartX || mouseX > timelineInitEndX) {
    isTimelineDragging = true;
    timelineState.isOutTag = true;
    return;
  }
}

const timelineMouseMove = (e) => {
  if (e.target === fixedtimelineCanvas.value || e.target === flagsCanvas.value || e.target === hoverFlagsLineCanvas.value) {
    if (!isTimelineDragging) return;
    isTimelineMove.value = true;
    const rect = fixedtimelineCanvas.value.getBoundingClientRect();
    const canvasWidth = viewState.canvasCssWidth;
    const mouseX = e.clientX - rect.left;
    const timelineOffsetX = mouseX - timelineInitX;
    let startTime = 0;

    if (timelineState.isInLeftTag === true) {
      if (timelineInitEndX - mouseX === 0) {
        return;
      }
      viewState.scale = canvasWidth / Math.abs(timelineInitEndX - mouseX);
      viewState.pixelScale = viewState.scale * devicePixelRatio;
      startTime = fixedXToTime(mouseX + layout.processLabelWidth);
      const timelinePerPixel = viewState.timeRange / (canvasWidth * viewState.scale);
      viewState.offsetX = (viewState.minTime - startTime) / timelinePerPixel;
      // 同步范围滑块变化
      const sliderCount = Math.round(Math.log(viewState.scale) / Math.log(1.25));
      sliderValue.value =parseInt(sliderCount, 10); 
      viewState.pixelOffsetX = viewState.offsetX * devicePixelRatio;
      transform();
      return;
    }

    if (timelineState.isInRightTag === true) {
      if (mouseX - timelineInitStartX === 0) {
        return;
      }
      viewState.scale = canvasWidth / Math.abs(mouseX - timelineInitStartX);
      startTime = fixedXToTime(timelineInitStartX + layout.processLabelWidth);
      const timelinePerPixel = viewState.timeRange / (canvasWidth * viewState.scale);
      viewState.offsetX = (viewState.minTime - startTime) / timelinePerPixel;
      // 同步范围滑块变化
      const sliderCount = Math.round(Math.log(viewState.scale) / Math.log(1.25));
      sliderValue.value = parseInt(sliderCount, 10);
      viewState.pixelOffsetX = viewState.offsetX * devicePixelRatio;
      viewState.pixelScale = viewState.scale * devicePixelRatio;
      transform();
      return;
    }

    if (timelineState.isOnTag === true) {
      let onTagTimerange = mouseX - timelineInitX;
      if (onTagTimerange > 0 && timelineInitEndX + onTagTimerange > canvasWidth) {
        onTagTimerange = canvasWidth - timelineInitEndX;
      } 
      startTime = fixedXToTime(timelineInitStartX + onTagTimerange + layout.processLabelWidth);
      const timelinePerPixel = viewState.timeRange / (canvasWidth * viewState.scale);
      viewState.offsetX = (viewState.minTime - startTime) / timelinePerPixel;
      if (viewState.offsetX > 0) {
        viewState.offsetX = 0;
        viewState.pixelOffsetX = 0;
        transform();
        return;
      }
      if (onTagTimerange >= 0 && timelineInitEndX === canvasWidth) {
        return;
      }
      viewState.pixelOffsetX = viewState.offsetX * devicePixelRatio;
      transform();
      return;
    }

    if (timelineState.isOutTag === true) {
      if (Math.abs(timelineOffsetX) < 10) {
        return;
      }
      viewState.scale = canvasWidth / Math.abs(timelineOffsetX);
      startTime = fixedXToTime(timelineInitX + layout.processLabelWidth);
      if (timelineOffsetX < 0){
        startTime = fixedXToTime(mouseX + layout.processLabelWidth);
      }
      const timelinePerPixel = viewState.timeRange / (canvasWidth * viewState.scale);
      viewState.offsetX = (viewState.minTime - startTime) / timelinePerPixel;
      // 同步范围滑块变化
      const sliderCount = Math.round(Math.log(viewState.scale) / Math.log(1.25));
      sliderValue.value = parseInt(sliderCount, 10); 
      viewState.pixelOffsetX = viewState.offsetX * devicePixelRatio;
      viewState.pixelScale = viewState.scale * devicePixelRatio;
      transform();
      return;
    }
  }
}

const timelineMouseUp = (e) => {
  const rect = fixedtimelineCanvas.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  if (Math.abs(mouseX - timelineInitX) < 10) {
    isTimelineMove.value = false;
  }
  timelineMouseEventReset();
}

const timelineMouseOut = (e) => {
  timelineMouseEventReset();
}

const timelineMouseEventReset = () => {
  fixedtimelineCanvas.value.style.cursor = 'default';
  hoverFlagsLineCanvas.value.style.cursor = 'default';
  timelineCanvas.value.style.cursor = 'default';
  isTimelineDragging = false;
  timelineState.isInLeftTag = false;
  timelineState.isInRightTag = false;
  timelineState.isOnTag = false;
  timelineState.isOutTag = false;
  timelineInitX = 0;
  timelineInitStartX = timelineState.startTimeX;
  timelineInitEndX = timelineState.endTimeX;
}

let zoomRafId = null;
let zoomFullRenderTimer = null;

const scheduleZoomRender = () => {
  freezeVisibleRange.value = true;
  if (zoomRafId !== null) {
    return;
  }
  zoomRafId = requestAnimationFrame(() => {
    zoomRafId = null;
    transform();
    scheduleZoomFullRender();
  });
};

const scheduleZoomFullRender = () => {
  clearTimeout(zoomFullRenderTimer);
  zoomFullRenderTimer = setTimeout(() => {
    freezeVisibleRange.value = false;
    transform();
  }, 150);
};

const changeScale = (zoomFactor, centerPositionX, needRender = true, isManual = true) => {
  if (viewState.scale * 10 >= sliderMax.value && zoomFactor > 1) {
    if (isManual) {
      wheelDebounceTimer = setTimeout(() => {
        postMessage($t('scaleMaxInfo'));
      }, 100);
    }
    return;
  }
  const oldScale = viewState.scale;
  const oldOffsetX = viewState.offsetX;

  if (zoomFactor < 1 && oldScale === initialScale.value && oldOffsetX >= 0) {
    if (isManual) {
      wheelDebounceTimer = setTimeout(() => {
        postMessage($t('scaleMinInfo'));
      }, 100);
    }
    return;
  }
  
  if (zoomFactor < 1 && viewState.scale * zoomFactor < initialScale.value) {
    viewState.scale = initialScale.value;
  } else {
    viewState.scale = Math.max(initialScale.value, Math.min(sliderMax.value / 10, viewState.scale * zoomFactor));
  }

  const sliderCount = Math.round(Math.log(viewState.scale) / Math.log(1.25));
  sliderValue.value = parseInt(sliderCount, 10); 

  viewState.scaleChange = viewState.scale / oldScale;
  viewState.offsetX = centerPositionX - ((centerPositionX - oldOffsetX) * viewState.scaleChange);
  const endSecondTimex = timeToX(viewState.maxTime) - layout.processLabelWidth;
  timeLineX.value = endSecondTimex;
  const timeLineEndX = Math.abs(timeLineX.value);
  if (timelineCanvas.value && getCanvasCSSWidth(timelineCanvas.value) > timeLineEndX) {
    const tempOffsetX = getCanvasCSSWidth(timelineCanvas.value) - timeLineEndX;
    viewState.offsetX += tempOffsetX;
  }
  if (viewState.offsetX > 0) {
    viewState.offsetX = 0;
  }
  viewState.pixelScale = viewState.scale * devicePixelRatio;
  viewState.pixelOffsetX = viewState.offsetX * devicePixelRatio;
  viewState.minWidth = 1 / viewState.scale;

  if (needRender) {
    scheduleZoomRender();
  }
};

const handleWheel = throttle((e) => {
  clearTimeout(wheelDebounceTimer);
  const isZooming = e.ctrlKey;

  if (!timelineCanvas.value) {
    return;
  }

  const rect = timelineCanvas.value.getBoundingClientRect();

  const isHorizontalDominant = Math.abs(e.deltaX) > Math.abs(e.deltaY);
  if (!isZooming && isHorizontalDominant && Math.abs(e.deltaX) > 0) {
    e.preventDefault();
    // 触控板左右移动，为拖拽
    if (viewState.scale === 1) {
      return;
    }
    const canvasMoveLeft = e.deltaX > 0;
    const deltaX = e.deltaX * 10;
    const timeLineEndX = Math.abs(timeLineX.value);
    const cssWidth = viewState.canvasCssWidth;
    const minOffset = cssWidth - (cssWidth * viewState.scale);
    const leftLimit = canvasMoveLeft && viewState.offsetX === minOffset;
    const rightLimit = !canvasMoveLeft && viewState.offsetX === 0;
    if (leftLimit || rightLimit) {
      return;
    }
    if (canvasMoveLeft && cssWidth > timeLineEndX) {
      viewState.offsetX = minOffset;
    } else {
      viewState.offsetX -= childContextMap.threadEvent.getOffset(deltaX, viewState.scale);
      if (!canvasMoveLeft && viewState.offsetX > 0) {
        viewState.offsetX = 0;
      }
    }
    viewState.pixelOffsetX = viewState.offsetX * devicePixelRatio;
    transform();
    return;
  }

  const mouseX = e.clientX - rect.left;
  // 如果没有按住 ctrl 键，则允许默认滚动行为（不阻止事件）
  if (!isZooming) {
    if (isE2ESwim.value) {
      childContextMap.process.measureMaskHandleWheel(e);
    }
    return;
  }
  if (e.deltaY === 0) {
    e.preventDefault();
    return;
  }
  const zoomFactor = e.deltaY > 0 ? 0.8 : 1.25;
  changeScale(zoomFactor, mouseX);
  e.preventDefault();
}, 80);
const postMessage = (message) => {
  if (window.vscode) {
    server.showMessage({paramObj: { text: message}});
  }
};
const checkIfInInterval = (x) => {
  if(flags.value.length === 0) {
    return null;
  }
  for (const flag of flags.value) {
    const flagX = flag.x;
    let start = flagX - 6;
    let end = flagX + 6;
    if (x >= start && x <= end) {
      return flag;
    }
  }
  return null;
};

const flagMouseMove = (e) => {
  if (!hoverFlagsCanvas.value || isTimelineDragging || !hoverFlagsLineCanvas.value) return;
  clearHoverFlagsLineCanvas();
  const rect = hoverFlagsCanvas.value.getBoundingClientRect();
  const ctx = hoverFlagsCtx.value;
  const color = "rgba(94, 124, 224, 1)";
  const mouseX = e.clientX - rect.left;
  mouseStyleEvent(mouseX);  

  hoverLineErase();
  childContextMap.threadEvent.eraseEventLine("over");
  childContextMap.processHeaderEvent.eraseProcessHeadLine("over");
  pinnedEraseLine("over");
  const flag = drawFlag(ctx, mouseX, 1, color, '');
  hoverCurFlag.value = flag;
  childContextMap.threadEvent.drawEventLine(mouseX, color, "over");
  childContextMap.processHeaderEvent.drawProcessHeadLine(mouseX, color, "over");
  pinnedDrawLine(mouseX, color, "over");
  const isBetweenAnyAdjacentFlags = isMouseXBetweenAnyAdjacentFlags(mouseX);
  if (!isBetweenAnyAdjacentFlags) {
    return;
  }
  guideDistanceMeasurement(ctx);
};
const isMouseXBetweenAnyAdjacentFlags = (mouseX) => {
  const flagsList = flags.value;
  if (flagsList.length < 2) {
    return false;
  }
  const { startTime, endTime } = timelineState;
  const sortedFlags = [...flagsList].sort((a, b) => a.x - b.x);
  for (let i = 0; i < sortedFlags.length - 1; i++) {
    const flagA = sortedFlags[i];
    const flagB = sortedFlags[i + 1];
    if (mouseX < flagA.x || mouseX > flagB.x) {
      continue;
    }
    if (Math.min(flagA.time, flagB.time) > startTime && Math.max(flagA.time, flagB.time) < endTime) {
      flagHoverData.preData = flagA;
      flagHoverData.lastData = flagB;
      return true;
    }
  }
  return false;
};
const guideDistanceMeasurement = (ctx) => {
  const { preData, lastData } = flagHoverData;
  const spacing = Math.abs(lastData.x - preData.x);
  if (!preData || !lastData || spacing <= 3) {
    return;
  }
  const largeSpacing = spacing > boxWidth + 10;
  drawConnector(ctx, largeSpacing);
};
const clearHoverFlagsLineCanvas  = () => {
  const lineCtx = hoverFlagsLineCtx.value;
  const clearHeight = fixedtimelineCanvas.value.offsetHeight;
  lineCtx.clearRect(0, 0, viewState.canvasCssWidth, clearHeight);
};
function drawConnector(ctx, largeSpacing) {
  const rect = calculateRect();
  const lineCtx = hoverFlagsLineCtx.value;
  const renderCtx = largeSpacing ? ctx : lineCtx;
  // 填充矩形
  renderCtx.save();
  renderCtx.setTransform(1, 0, 0, 1, 0, 0);
  renderCtx.fillStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
  renderCtx.strokeStyle = 'rgba(0, 0, 0, 0)';
  renderCtx.beginPath();
  renderCtx.roundRect(rect.x, rect.y, rect.width, rect.height, 4);
  renderCtx.fill();
  renderCtx.stroke();
  renderCtx.fillStyle = '#ffffff';
  measureRenderer.fillText(renderCtx, rect, rect.y);
  // 绘制双向箭头
  if (largeSpacing) {
    measureRenderer.drawDoubleArrow(rect, ctx);
  } else {
    drawDistanceSelectionBox(ctx);
  }
  ctx.restore();
}
function drawDistanceSelectionBox(ctx) {
  // 填充矩形
  ctx.fillStyle = 'rgba(49, 122, 247, 0.4)';
  ctx.strokeStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
  ctx.beginPath();
  ctx.lineWidth = 1;
  const height = fixedtimelineCanvas.value.offsetHeight;
  const {preData,lastData} = flagHoverData;
  ctx.roundRect(preData.x + 2, preData.y + (height / 2), lastData.x - preData.x - 4, height, 4);
  ctx.fill();
  ctx.stroke();
}
// 计算矩形位置
function calculateRect() {
  const {
    preData: { x: x1, y },
    lastData: { x: x2 }
  } = flagHoverData;
  const leftX = (Math.min(x1, x2)) * devicePixelRatio;
  const rightX = (Math.max(x1, x2)) * devicePixelRatio;
  const width = boxWidth * devicePixelRatio;
  const height = fixedtimelineCanvas.value.offsetHeight;
  const rectX = leftX + ((rightX - leftX - width) / 2);
  const end = flagHoverData.lastData.time;
  const start = flagHoverData.preData.time;
  const diffTime = Math.abs(end - start);
  const text = measureRenderer.getMeasureDistance(diffTime);
  return {
    x: rectX,
    y,
    width,
    height,
    leftX,
    rightX,
    centerY: y + ((height * devicePixelRatio) / 2),
    text
  };
}
const flagMouseOver = (e) => {
  if (!hoverFlagsCanvas.value || isTimelineDragging) return;
  const rect = hoverFlagsCanvas.value.getBoundingClientRect();
  const ctx = hoverFlagsCtx.value;
  const color = "rgba(94, 124, 224, 1)";
  const mouseX = e.clientX - rect.left;
  mouseStyleEvent(mouseX); 
  const flag = drawFlag(ctx, mouseX, 1, color, '');
  childContextMap.threadEvent.drawEventLine(mouseX, color, 'over');
  childContextMap.processHeaderEvent.drawProcessHeadLine(mouseX, color, "over");
  pinnedDrawLine(mouseX, color, "over");
  hoverCurFlag.value = flag;
};

const hoverLineErase = () => {
  if (!hoverCurFlag || isTimelineDragging) {
    return;
  }
  childContextMap.threadEvent.eraseEventLine('over');
  childContextMap.processHeaderEvent.eraseProcessHeadLine('over');
  pinnedEraseLine('over');
  const ctx = hoverFlagsCtx.value;
  const canvas = hoverFlagsCanvas.value;
  ctx.clearRect(0, 0, viewState.canvasCssWidth, canvas.offsetHeight);
  hoverCurFlag.value = null;
};

const flagMouseOut = (e) => {
  hoverLineErase();
};

const randomColor = () => Math.floor(Math.random() * 360);
const formatTime = (str) => {
  let nanoseconds = parseInt(str);
  editTime.value = `${nanoseconds.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

const flagMouseClick = (e) => {
  if (!flagsCanvas.value) return;
  if (isShowTooltip.value) {
    hideTooltip();
    isShowTooltip.value = !isShowTooltip.value;
  }
  if (isTimelineMove.value) {
    isTimelineMove.value = false;
    return;
  }
  hoverLineErase();
  const rect = flagsCanvas.value.getBoundingClientRect();
  const ctx = flagsCtx.value;
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const flag = checkIfInInterval(mouseX);
  if (flag === null) {
    colorValue.value = randomColor();
    saturationValue.value = 80;
    refColor.value = `hsl(${colorValue.value}, ${saturationValue.value}%, 50%)`;
    refLabel.value = '';
    const flagTime = xToTime(mouseX + layout.processLabelWidth);
    const currentTime = Math.round(flagTime - viewState.minTime);
    formatTime(currentTime);
    const flagId = drawFlag(ctx, mouseX, 1, refColor.value, refLabel.value);
    childContextMap.threadEvent.drawEventLine(mouseX, refColor.value, '');
    childContextMap.processHeaderEvent.drawProcessHeadLine(mouseX, refColor.value, '');
    pinnedDrawLine(mouseX, refColor.value, '');
    let labelWidth = getTextWidth((refLabel.value), 12);
    flags.value.push({id: flagId, x: mouseX, y: 1, color: refColor.value, label: refLabel.value, labelW: labelWidth, time: flagTime, overflow: false});
    return ;
  } else {
    currentFlag.value = flag;
    const flagTime = currentFlag.value.time;
    const currentTime = Math.round(flagTime - viewState.minTime);
    formatTime(currentTime);
    checkFlagHover(mouseX, mouseY);
    return;
  }
}

const checkFlagHover = (x, y) => {
  for (const flag of flags.value) {
    if (x >= flag.x - 6 && x <= flag.x + 6 && y >= flag.y - 1 && y <= flag.y + 12) {
      currentFlag.value = flag;
      showTooltip(flag.x + 10, flag.y);
      isShowTooltip.value = !isShowTooltip.value;
      refLabel.value = flag.label;
      const regex = /hsl\((\d+),\s*(\d+)%/;
      const matchRes = flag.color.match(regex);
      if (matchRes) {
        colorValue.value = matchRes[1];
        saturationValue.value = matchRes[2];
      }
      return flag;
    }
  }
  hideTooltip();
  return null;
}

const clearFlagCanvas = (clearFlags=false) => {
  if (!flagsCanvas.value) {
    return;
  }
  const ctx = flagsCtx.value;
  const canvas = flagsCanvas.value;
  ctx.clearRect(0, 0, viewState.canvasCssWidth, canvas.offsetHeight);
  childContextMap.threadEvent.eraseEventLine('');
  childContextMap.processHeaderEvent.eraseProcessHeadLine('');
  pinnedEraseLine('');
  if (clearFlags) {
    flags.value = [];
  }
};

const flagRender = () => {
  if (!flagsCanvas.value) {
    return;
  }
  const ctx = flagsCtx.value;
  clearFlagCanvas();
  const start = timelineState.startTime;
  const end = timelineState.endTime;
  if (flags.value.length === 0) return;
  for (const flag of flags.value) {
    if (flag.time >= start && flag.time <= end) {
      const x = timeToX(flag.time) - layout.processLabelWidth;
      flag.x = x;
      drawFlag(ctx, flag.x, 1, flag.color, flag.label);
      childContextMap.threadEvent.drawEventLine(flag.x, flag.color, '');
      childContextMap.processHeaderEvent.drawProcessHeadLine(flag.x, flag.color, '');
      pinnedDrawLine(flag.x, flag.color, '');
    }
  }
}

const deleteFlag = () => {
  if (!currentFlag.value) return;
  flags.value = flags.value.filter(flag => flag.x !== currentFlag.value.x);
  flagRender();
  isEditing.value = false;
  refLabel.value = '';
  hideTooltip();
}

const drawFlag = (ctx, x, y, color, label) => {
  const flagId = `flag-${Date.now()}-${Math.random()}`;
  const flagHeight = 6;
  const flagWidth = 12;
  const tailLength = 6;
  x = x - 6;
  y = y + 6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + tailLength);
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - flagHeight);
  ctx.lineTo(x + flagWidth / 2, y - flagHeight);
  ctx.lineTo(x + flagWidth / 2, y - flagHeight + 2);
  ctx.lineTo(x + flagWidth, y - flagHeight + 2);
  ctx.lineTo(x + flagWidth, y + 2);
  ctx.lineTo(x + flagWidth / 2, y + 2);
  ctx.lineTo(x + flagWidth / 2, y);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.font = '12px Arial';
  ctx.fillStyle = color;
  ctx.fillText(label, x + flagWidth + 2, y + 3);
  ctx.beginPath();
  ctx.moveTo(x + 6, 12);
  ctx.lineTo(x + 6, 40);
  ctx.strokeStyle = color;
  ctx.stroke();
  return flagId;
};

const showTooltip = (x, y) => {
  const rect = flagsCanvas.value.getBoundingClientRect();
  let tooltipLeft = x + currentFlag.value.labelW;
  // 编辑页面184溢出屏幕时，向左展开
  if (tooltipLeft + 184 > rect.width) {
    tooltipLeft = x - 82;
    currentFlag.value.overflow = true;
  } else {
    currentFlag.value.overflow = false;
  }
  flagtooltipStyle.left = `${tooltipLeft}px`;
  flagtooltipStyle.top = `${y + 20}px`; // 加上timeline的高度
  flagtooltipStyle.display = 'flex';
}

const hideTooltip = () => {
  flagtooltipStyle.display = 'none';
}

const renderCurFlag = () => {
  if (!currentFlag.value) return;
  drawFlag(flagsCtx.value, currentFlag.value.x, currentFlag.value.y, currentFlag.value.color, currentFlag.value.label);
  childContextMap.threadEvent.drawEventLine(currentFlag.value.x, currentFlag.value.color, '');
  childContextMap.processHeaderEvent.drawProcessHeadLine(currentFlag.value.x, currentFlag.value.color, '');
  pinnedDrawLine(currentFlag.value.x, currentFlag.value.color, '');
}

const onColorChange = () => {
  if (!currentFlag.value) return;
  currentFlag.value.color = `hsl(${colorValue.value}, 80%, 50%)`;
  renderCurFlag();
}

const onSaturationChange = () => {
  if (!currentFlag.value) return;
  currentFlag.value.color = `hsl(${colorValue.value}, ${saturationValue.value}%, 50%)`;
  renderCurFlag();
}

const clearLabel = (ctx, x, y, labelW) => {
  let flagWidth = 8;
  ctx.clearRect(x + flagWidth, y - 10, labelW, 50);
}

const onInputChange = () => {
  if (!currentFlag.value) return;
  if (currentFlag.value.label === refLabel.value) return;
  let flagWidth = 8;
  const flagLaberStart = currentFlag.value.x + flagWidth;
  const flagLaberend = flagLaberStart + currentFlag.value.labelW;
  clearLabel(flagsCtx.value, currentFlag.value.x, currentFlag.value.y, currentFlag.value.labelW);
  currentFlag.value.label = refLabel.value;
  currentFlag.value.labelW = getTextWidth((currentFlag.value.label), 12);
  renderCurFlag();
  for (const flag of flags.value) {
    if (flag.x >= flagLaberStart && flag.x <= flagLaberend) {
      drawFlag(flagsCtx.value, flag.x, 1, flag.color, flag.label);
    }
  }
}

const editFlag = (e) => {
  isEditing.value = true;
  const buttonRect = e.target.getBoundingClientRect();
  let editLeft;
  if (currentFlag.value.overflow) {
    // 184为编辑页面的宽度
    editLeft = buttonRect.left + 22 - 184;
  } else {
    editLeft = buttonRect.left - 39;
  }
  editmodelStyle.left = `${editLeft}px`;
  editmodelStyle.top = `${buttonRect.bottom + 12}px`;
  editmodelStyle.display = 'block';
}


const resizeCanvases = () => {
  const containerRect = document.querySelector('.swimlane-container')?.getBoundingClientRect();
  if (!containerRect) return;

  const availableWidth = containerRect.width;
  const canvasWidth = availableWidth;

  // 使用高DPI设置调整时间轴画布大小
  if (fixedtimelineCanvas.value) {
    const ctx = setupHighDPICanvas(fixedtimelineCanvas.value, canvasWidth, 20);
    viewState.canvasCssWidth = canvasWidth;
    viewState.canvasWidth = ctx.canvas.width;
    viewState.clearWidth = Math.max(viewState.canvasCssWidth, viewState.canvasWidth);
  }
  if (timelineCanvas.value) {
    setupHighDPICanvas(timelineCanvas.value, canvasWidth, 40);
  }
  if (flagsCanvas.value) {
    setupHighDPICanvas(flagsCanvas.value, canvasWidth, 40);
  }
  if (hoverFlagsCanvas.value) {
    setupHighDPICanvas(hoverFlagsCanvas.value, canvasWidth, 40);
  }
  if (hoverFlagsLineCanvas.value) {
    setupHighDPICanvas(hoverFlagsLineCanvas.value, canvasWidth, 20);
  }
};

const initCanvases = () => {
  // 初始化时间轴画布
  if (fixedtimelineCanvas.value) {
    fixedtimelineCtx.value = fixedtimelineCanvas.value.getContext('2d');
  }
  if (timelineCanvas.value) {
    timelineCtx.value = timelineCanvas.value.getContext('2d');
  }

  if (hoverFlagsCanvas.value) {
    hoverFlagsCtx.value = hoverFlagsCanvas.value.getContext('2d');
  }

  if (flagsCanvas.value) {
    flagsCtx.value = flagsCanvas.value.getContext('2d');
  }

  if (hoverFlagsLineCanvas.value) {
    hoverFlagsLineCtx.value = hoverFlagsLineCanvas.value.getContext('2d');
  }
  resizeCanvases();
  nextTick(() => {
    renderFixedTimeline();
    renderTimeline();
  });
};

onMounted(() => {
  initCanvases();
  listenExtensionMessage();
});

onUnmounted(() => {
  if (zoomRafId !== null) {
    cancelAnimationFrame(zoomRafId);
    zoomRafId = null;
  }
  clearTimeout(zoomFullRenderTimer);
});
// 监听引导模式的消息
const listenExtensionMessage = () => {
  window.ascEventBus.on('boot-step-tips', (event) => {
    const message = event.data;
    if (event.type == 'callWebviewMethod') {
      isGuidePage = true;
      switch (message.methodName) {
        case 'addObservationLine': {
          drawVirtualDom();
          const e = {
            clientX: layout.processLabelWidth + (viewState.canvasCssWidth / 2),
            clientY: 0
          };
          flagMouseClick(e);
          const element = document.querySelector('.zoom-controls');
          element.style.border = '';
          break;
        }
        case 'zoomControls': {
          const element = document.querySelector('.zoom-controls');
          element.style.border = '1px dashed';
          break;
        }
        case 'distanceMeasurement': {
          clearFlagCanvas(true);
          break;
        }
        default:
          break;
      }
    }
  });
};

const observationLineResize = () => {
  if (swimConfig.currentStepTargetDomId !== 'observation-line') {
    return;
  }
  drawVirtualDomAsync();
};
const drawVirtualDomAsync = async () => {
  if (await getIsCompleteBoot()) {
    drawVirtualDom();
  }
};
const drawVirtualDom = () => {
  const e = {
    clientX: layout.processLabelWidth + (viewState.canvasCssWidth / 2),
    clientY: 0
  };
  const rect = flagsCanvas.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const existingElement = document.querySelector('#observation-line');
  if (existingElement) {
    existingElement.remove();
  }
  const domRect = document.createElement('div');
  domRect.id = 'observation-line';
  domRect.style.position = 'absolute';
  domRect.style.left = mouseX + 'px';
  domRect.style.top = rect.top + 'px';
  domRect.style.backgroundColor = 'transparent';
  flagsCanvas.value.parentNode.appendChild(domRect);
};
// 暴露方法给父组件
defineExpose({
  resizeCanvases,
  initCanvases,
  fixedtimelineCanvas,
  timelineCanvas,
  fixedtimelineCtx,
  timelineCtx,
  handleWheel,
  flagRender,
  changeScale,
  observationLineResize,
  clearFlagCanvas,
  toggleEditModel,
  flagsCanvas
});
</script>

<style scoped lang="scss">
@import url("../css/swimGraph/Timeline/timeline.css");
.label-input {
  padding-right: 12px;
  :deep() {
    .devui-input__wrapper {
      background: var(--devui-input-bg);
      input:focus {
        outline: none;
      }
    }
  }
}

.flagcolor {
  :deep() {
    .devui-slider__runway {
      background: linear-gradient(270.00deg, rgba(255, 1, 19, 1), rgba(251, 1, 254, 1) 17%, rgba(1, 134, 255, 1) 33%, rgba(0, 164, 255, 1) 47%, rgba(9, 255, 2, 1) 63%, rgba(255, 214, 1, 1) 81%, rgba(255, 50, 1, 1) 100%);
    }
    .devui-slider__button, .devui-slider__bar, .devui-slider__runway:hover .devui-slider__bar:not(.disabled) {
      background-color: transparent;
    } 
  }
}

.saturation {
  :deep() {
    .devui-slider__runway {
      background: linear-gradient(270.00deg, rgba(0, 0, 0, 1), rgba(255, 255, 255, 1) 100%);
    }
    .devui-slider__button, .devui-slider__bar, .devui-slider__runway:hover .devui-slider__bar:not(.disabled) {
      background-color: transparent;
    }
  }
}
</style>
