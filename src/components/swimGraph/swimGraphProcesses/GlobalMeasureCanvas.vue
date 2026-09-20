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
  <canvas
    ref="globalMeasureCanvas"
    class="global-measure-canvas"
    :data-global-measure="true"
    :style="{ left: layout.processLabelWidth + 'px' }"
  ></canvas>
  <div
    v-if="measureResult.visible"
    class="measure-info-box"
    :style="{
      left: measureResult.x + 'px',
      top: measureResult.y + 'px',
      width: measureResult.width + 'px',
      height: measureResult.height + 'px',
    }"
  >
    {{ measureResult.text }}
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject, watch, nextTick, reactive } from 'vue';
import { isEqual } from 'lodash-es';
import { devicePixelRatio, formatTimeWithUnit, meaureTextSize, getFontStyle, nodeSpaceMin, COLOR_CFG, eventTextSize } from '../swimGraphUtils';
import { getNoZoomX, getEventColor } from './render/utils';
import { EventRender } from './render/eventRender';
import { altClickData, measureState } from './render/meatureRender';
import { swimDataManager } from '../swimData';

const { isDarkTheme } = inject('root');
const props = defineProps({
  containerWidth: {
    type: Number,
    required: true
  },
  containerHeight: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['canvas-ready']);

const globalMeasureCanvas = ref(null);
let ctx = null;
const processDomCache = new Map();

const measureResult = reactive({
  visible: false,
  x: 0,
  y: 0,
  width: boxWidth,
  height: 0,
  text: ''
});

const swimGraphState = inject('swimGraphState');
const {
  viewState,
  processExpanded,
  layout,
  selectedEvent,
  highlightedPaths,
  mixRelatedPaths,
  searchedEvent,
  tsScale,
  isMsProf,
  isMixMode
} = swimGraphState;

const { userConfig } = inject('swimGraphCfg');
const eventRenderer = new EventRender({...swimGraphState, userConfig});

const boxWidth = 45;
const boxPadding = 8;
const lessThan0usMsg = 'less than 1ns';
let colorCfg = isDarkTheme.value ? COLOR_CFG.dark : COLOR_CFG.light;

const getProcessDomElement = (processKey) => {
  if (processDomCache.has(processKey)) {
    return processDomCache.get(processKey);
  }
  const element = document.querySelector(`[data-process-key="${processKey}"]`);
  if (element) {
    processDomCache.set(processKey, element);
  }
  return element;
};

const clearDomCache = () => {
  processDomCache.clear();
};

const initCanvas = () => {
  const canvas = globalMeasureCanvas.value;
  if (!canvas) {
    return;
  }
  const eles = document.getElementsByClassName('processes-container');
  const [containerEle] = eles;
  if (!containerEle) {
    return;
  }
  const { width: eleWidth, height: eleHeight } = containerEle.getBoundingClientRect();
  
  const width = eleWidth - layout.processLabelWidth;
  const height = eleHeight;
  
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  ctx = canvas.getContext('2d');
  ctx.scale(devicePixelRatio, devicePixelRatio);
  
  restoreActiveMeasurement();
  
  emit('canvas-ready', ctx);
};

const restoreActiveMeasurement = () => {
  if (!ctx) {
    return;
  }
  if (altClickData.preData && altClickData.lastData && measureState.isMeasureFixed) {
    drawRoundedRect(altClickData.preData, altClickData.preData.pid.toString());
    drawRoundedRect(altClickData.lastData, altClickData.lastData.pid.toString());
    calculateAndDrawConnection();
  } else if (altClickData.preData && measureState.isMeasureFirst && !measureState.isMeasureFixed) {
    drawRoundedRect(altClickData.preData, altClickData.preData.pid.toString());
  } else if (measureResult.visible) {
    measureResult.visible = false;
  } else {
    return;
  }
};

const clearCanvas = (drawPre = false) => {
  if (!ctx) {
    return;
  }
  const canvas = globalMeasureCanvas.value;
  if (!canvas) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
  measureResult.visible = false;
  // 补画第一个手动测距的节点
  if (drawPre && altClickData.preData) {
    ctx.strokeStyle = isDarkTheme.value ? '#FFFFFF' : '#191919';
    ctx.lineWidth = 2 / viewState.scale;
    drawRoundedRect(altClickData.preData, altClickData.preData.pid.toString());
  }
};

const getEventCoordinates = (event) => {
  if (!event.renderInfo) {
    return null;
  }
  
  const processKey = event.pid.toString();
  const isExpanded = processExpanded.get(processKey);
  
  if (!isExpanded) {
    return null;
  }
  
  const process = swimDataManager.getProcess(processKey);
  if (!process) {
    return null;
  }
  
  const processElement = getProcessDomElement(processKey);
  if (!processElement) {
    return null;
  }
  
  const processRect = processElement.getBoundingClientRect();
  const containerRect = globalMeasureCanvas.value?.getBoundingClientRect();
  
  if (!containerRect) {
    return null;
  }
  
  const processOffsetX = processRect.left - containerRect.left;
  const processOffsetY = processRect.top - containerRect.top;
  
  const eventWidth = event.renderInfo.width || event.drawData?.eventWidth;
  const eventHeight = event.renderInfo.height || event.drawData?.height;
  
  const eventX = event.renderInfo.x;
  const eventY = event.renderInfo.y;
  
  const x = eventX * devicePixelRatio;
  const y = (processOffsetY + eventY + eventHeight / 2) * devicePixelRatio;
  
  return { x, y, processKey, eventX, eventY, eventWidth, eventHeight, processOffsetX, processOffsetY };
};

const getMeasureDistance = (diffTime) => {
  const timeInfo = formatTimeWithUnit(diffTime * 1000 / tsScale.value);
  if (Number(timeInfo.value) === 0) {
    return lessThan0usMsg;
  }
  return timeInfo.value + timeInfo.unit;
};

const drawConnector = (preCoords, lastCoords, largeSpacing) => {
  const scrollableDiv = document.querySelector('.scroller-container');
  const scrollTop = scrollableDiv ? scrollableDiv.scrollTop : 0;
  
  const rect = calculateRect(preCoords, lastCoords, largeSpacing);
  
  let scrollY = scrollTop > 0 && scrollTop - rect.y > layout.threadHeight && !largeSpacing ? rect.y + layout.threadHeight * 2 : rect.y;
  
  measureResult.visible = true;
  measureResult.x = rect.x / devicePixelRatio + layout.processLabelWidth;
  measureResult.y = scrollY / devicePixelRatio;
  measureResult.width = rect.width / devicePixelRatio;
  measureResult.height = rect.height / devicePixelRatio;
  measureResult.text = rect.text;
  
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  
  if (largeSpacing) {
    drawDoubleArrow(rect);
  } else {
    drawDistanceSelectionBox(preCoords, lastCoords);
  }
  ctx.restore();
};

const calculateBoxWidth = (text) => {
  ctx.font = getFontStyle(meaureTextSize);
  const textWidth = ctx.measureText(text).width;
  return Math.max(boxWidth, textWidth + boxPadding * 2);
};

const calculateRect = (preCoords, lastCoords, largeSpacing) => {
  const preX = preCoords.eventX;
  const preWidth = preCoords.eventWidth;
  const preY = preCoords.eventY;
  const preHeight = preCoords.eventHeight;
  const offsetY = preCoords.processOffsetY;
  
  let rectY = preY;
  if (!largeSpacing) {
    rectY = preY < layout.threadHeight ? preY + layout.threadHeight : preY - layout.threadHeight;
  }
  
  const lastX = lastCoords.eventX;
  
  const start = altClickData.lastData.startTime;
  const end = altClickData.preData.endTime;
  const diffTime = Math.abs(start - end);
  const text = getMeasureDistance(diffTime);
  
  const width = calculateBoxWidth(text);
  const height = preHeight;
  
  const leftX = getNoZoomX(preX + preWidth, viewState);
  const rightX = getNoZoomX(lastX, viewState);
  const rectX = leftX + (rightX - leftX - width) / 2;
  
  const centerY = offsetY + rectY + height / 2;
  
  return {
    x: rectX,
    y: (offsetY + rectY) * devicePixelRatio,
    height: height * devicePixelRatio,
    centerX: rectX + (width / 2 - text.length) / 2,
    centerY: centerY * devicePixelRatio,
    arrowWidth: (rightX - leftX - width - 6) / 2,
    text,
    width,
    leftX,
    rightX,
  };
};

const drawDoubleArrow = (rect) => {
  const arrowSize = 8;

  const actLeft = rect.leftX;
  const leftLineWidth = actLeft + arrowSize - 2;
  const { centerY } = rect;
  ctx.beginPath();
  ctx.moveTo(rect.x, centerY);
  ctx.lineTo(leftLineWidth, centerY);
  ctx.strokeStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftLineWidth - arrowSize / 2, centerY);
  ctx.lineTo(leftLineWidth - arrowSize / 2 + arrowSize, centerY - arrowSize / 2);
  ctx.lineTo(leftLineWidth - arrowSize / 2 + arrowSize, centerY + arrowSize / 2);
  ctx.closePath();
  ctx.fillStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
  ctx.fill();

  const rightLineWidth = rect.rightX - arrowSize + 2;
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width, centerY);
  ctx.lineTo(rightLineWidth, centerY);
  ctx.strokeStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightLineWidth + arrowSize / 2, centerY);
  ctx.lineTo(rightLineWidth + arrowSize / 2 - arrowSize + 1, centerY - arrowSize / 2);
  ctx.lineTo(rightLineWidth + arrowSize / 2 - arrowSize + 1, centerY + arrowSize / 2);
  ctx.closePath();
  ctx.fillStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
  ctx.fill();
};

const drawDistanceSelectionBox = (preCoords, lastCoords) => {
  const preX = preCoords.eventX;
  const preWidth = preCoords.eventWidth;
  const preY = preCoords.eventY;
  const preHeight = preCoords.eventHeight;
  const offsetY = preCoords.processOffsetY;
  
  const lastX = lastCoords.eventX;
  
  const noZoomPreX = getNoZoomX(preX + preWidth, viewState);
  const noZoomLastX = getNoZoomX(lastX, viewState);
  
  ctx.fillStyle = 'rgba(49, 122, 247, 0.4)';
  ctx.strokeStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.roundRect(noZoomPreX + 1, (offsetY + preY - 2) * devicePixelRatio, noZoomLastX - noZoomPreX, (preHeight + 4) * devicePixelRatio, 4);
  ctx.fill();
  ctx.stroke();
};

const drawDiffConnector = (preCoords, lastCoords, largeSpacing) => {
  const rect = calculateDiffRect(preCoords, lastCoords, largeSpacing);
  
  measureResult.visible = true;
  measureResult.x = rect.x / devicePixelRatio + layout.processLabelWidth;
  measureResult.y = rect.y / devicePixelRatio;
  measureResult.width = rect.width / devicePixelRatio;
  measureResult.height = rect.height / devicePixelRatio;
  measureResult.text = rect.text;
  
  if (!largeSpacing) {
    return;
  }
  
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  
  const preX = getNoZoomX(preCoords.eventX, viewState);
  const preWidth = preCoords.eventWidth * viewState.pixelScale;
  const preY = preCoords.eventY;
  const preHeight = preCoords.eventHeight;
  const offsetY = preCoords.processOffsetY;
  
  const lastX = getNoZoomX(lastCoords.eventX, viewState);
  const lastY = lastCoords.eventY;
  const lastProcessOffsetY = lastCoords.processOffsetY;
  
  const arrowLeftStartX = preX + preWidth;
  const leftLineHeight = (offsetY + preY + preHeight / 2) * devicePixelRatio;
  
  ctx.beginPath();
  ctx.moveTo(arrowLeftStartX, leftLineHeight);
  ctx.lineTo(lastX, leftLineHeight);
  ctx.strokeStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  const arrowSize = 8;
  ctx.beginPath();
  ctx.moveTo(arrowLeftStartX, leftLineHeight);
  ctx.lineTo(arrowLeftStartX + arrowSize, leftLineHeight - arrowSize / 2);
  ctx.lineTo(arrowLeftStartX + arrowSize, leftLineHeight + arrowSize / 2);
  ctx.closePath();
  ctx.fillStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
  ctx.fill();
  
  ctx.beginPath();
  ctx.setLineDash([5, 3]);
  ctx.moveTo(lastX, leftLineHeight);
  ctx.lineTo(lastX, (lastProcessOffsetY + lastY + preHeight / 2) * devicePixelRatio);
  ctx.strokeStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
  
  ctx.beginPath();
  ctx.moveTo(lastX, leftLineHeight);
  ctx.lineTo(lastX - arrowSize, leftLineHeight - arrowSize / 2);
  ctx.lineTo(lastX - arrowSize, leftLineHeight + arrowSize / 2);
  ctx.closePath();
  ctx.fillStyle = isDarkTheme.value ? '#317af7' : '#0a59f7';
  ctx.fill();
  
  ctx.restore();
};

const calculateDiffRect = (preCoords, lastCoords, largeSpacing) => {
  const preX = preCoords.eventX;
  const preWidth = preCoords.eventWidth;
  const preY = preCoords.eventY;
  const preHeight = preCoords.eventHeight;
  const offsetY = preCoords.processOffsetY;
  
  let rectY = preY;
  if (!largeSpacing) {
    rectY = preY < layout.threadHeight ? preY + layout.threadHeight : preY - layout.threadHeight;
  }
  
  const lastX = lastCoords.eventX;
  
  const start = altClickData.lastData.startTime;
  const end = altClickData.preData.endTime;
  const diffTime = Math.abs(start - end);
  const text = getMeasureDistance(diffTime);
  
  const width = calculateBoxWidth(text);
  const height = preHeight;
  
  const noZoomPreX = getNoZoomX(preX + preWidth, viewState);
  const noZoomLastX = getNoZoomX(lastX, viewState);
  
  const rectX = noZoomPreX + (noZoomLastX - noZoomPreX) / 2 - width / 2;
  const finalRectY = (offsetY + rectY - height < 0 ? offsetY + rectY + height : offsetY + rectY - height) * devicePixelRatio;
  
  return {
    x: rectX,
    y: finalRectY,
    height: height * devicePixelRatio,
    text,
    width,
  };
};

const drawRoundedRect = (event, processKey) => {
  const coords = getEventCoordinates(event);
  if (!coords) {
    return;
  }
  
  const { eventWidth, eventHeight, processOffsetY, eventX, eventY, x, y } = coords;
  
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = isDarkTheme.value ? '#FFFFFF' : '#191919';
  ctx.lineWidth = 2 / viewState.scale;
  ctx.beginPath();

  const rectY = (processOffsetY + eventY) * devicePixelRatio;
  const rectWidth = eventWidth * viewState.scale;
  const rectHeight = eventHeight * devicePixelRatio;
  ctx.rect(eventX, rectY, rectWidth, rectHeight);
  
  const temp = JSON.parse(JSON.stringify(event));
  const dep = { colorCfg, isDarkTheme, selectedEvent, highlightedPaths, searchedEvent, userConfig, mixRelatedPaths, isMsProf };
  const { fillColor, fontColor, strokeColor } = getEventColor(temp, dep, processKey, true, true);
  temp.drawData.rectColor = fillColor;
  temp.drawData.strokeColor = strokeColor;
  temp.drawData.fontColor = fontColor;

  const startY = y - ((temp.drawData.height * devicePixelRatio) / 2);
  temp.drawData.textY = startY + eventTextSize;
  
  const drawData = {
    ...temp.drawData,
    rectX: eventX,
    rectY: rectY / devicePixelRatio,
    rectPixelX: eventX,
    rectPixelY: rectY,
    eventWidth: rectWidth / viewState.scale,
    height: rectHeight / devicePixelRatio,
  };
  
  if (drawData.eventWidth * viewState.scale < 15) {
    drawData.text = '';
  }
  
  eventRenderer.drawEvent([drawData], ctx, false, false);
  eventRenderer.drawEventText([drawData], ctx, false, false);
  
  ctx.restore();
};

const calculateAndDrawConnection = () => {
  if (!altClickData.preData || !altClickData.lastData) {
    return;
  }
  
  const preCoords = getEventCoordinates(altClickData.preData);
  const lastCoords = getEventCoordinates(altClickData.lastData);
  
  if (!preCoords || !lastCoords) {
    return;
  }
  
  const preX = altClickData.preData.renderInfo.x;
  const preWidth = altClickData.preData.renderInfo.width;
  const lastX = altClickData.lastData.renderInfo.x;
  
  const nodeSpacingX = Math.min(Math.abs(lastX - (preX + preWidth)), Math.abs(lastX - preX)) * viewState.scale;
  if (nodeSpacingX < 3) {
    return;
  }
  
  let largeSpacing = nodeSpacingX > nodeSpaceMin;
  
  const preY = altClickData.preData.renderInfo.y;
  const lastY = altClickData.lastData.renderInfo.y;
  
  if (preCoords.y === lastCoords.y) {
    drawConnector(preCoords, lastCoords, largeSpacing);
  } else {
    largeSpacing = nodeSpacingX > 60;
    drawDiffConnector(preCoords, lastCoords, largeSpacing);
  }
};

const handleDistanceMeasurement = (event, processKey, isZoomMode = false) => {
  const shouldClearDrawConnector = !isZoomMode && altClickData.preData && altClickData.lastData && (measureState.isMeasureFixed || !measureState.isMeasureFirst);
  
  if (shouldClearDrawConnector) {
    clearMeasure();
  }
  
  if (!isZoomMode) {
    if (!altClickData.preData) {
      altClickData.preData = event;
      measureState.isMeasureFirst = true;
    } else {
      if (isEqual(altClickData.preData, event) && !altClickData.lastData) {
        return;
      }
      measureState.isMeasureFixed = true;
      altClickData.lastData = event;
    }
  }
  
  drawRoundedRect(event, processKey);
  
  if (isZoomMode && altClickData.preData) {
    drawRoundedRect(altClickData.preData, processKey);
  }
  
  calculateAndDrawConnection();
};

const measureDistanceHover = () => {
  if (!altClickData.preData || !altClickData.lastData) {
    return;
  }
  const preRenderInfo = altClickData.preData.renderInfo;
  const lastRenderInfo = altClickData.lastData.renderInfo;
  
  const preX = preRenderInfo.x;
  const preY = preRenderInfo.y;
  const preWidth = preRenderInfo.width;
  
  const lastX = lastRenderInfo.x;
  const lastY = lastRenderInfo.y;
  
  const nodeSpacingX = Math.min(Math.abs(lastX - (preX + preWidth)), Math.abs(lastX - preX)) * viewState.scale;
  
  if (nodeSpacingX < 3) {
    return;
  }
  
  let largeSpacing = nodeSpacingX > nodeSpaceMin;
  
  if (lastX < preX) {
    let temp = altClickData.preData;
    altClickData.preData = altClickData.lastData;
    altClickData.lastData = temp;
    measureState.isMeasureChange = true;
  } else {
    measureState.isMeasureChange = false;
  }
  
  const preCoords = getEventCoordinates(altClickData.preData);
  const lastCoords = getEventCoordinates(altClickData.lastData);
  
  if (!preCoords || !lastCoords) {
    return;
  }
  if (preCoords.y === lastCoords.y) {
    drawConnector(preCoords, lastCoords, largeSpacing);
  } else {
    largeSpacing = nodeSpacingX > 60;
    drawDiffConnector(preCoords, lastCoords, largeSpacing);
  }
};

const drawMeasurePreview = (preData, lastData, nodeSpacingX) => {
  if (!preData || !lastData || measureState.isMeasureFixed) {
    return;
  }
  
  const actSpacingX = nodeSpacingX * viewState.pixelScale;
  if (actSpacingX <= 3) {
    return;
  }
  
  altClickData.preData = preData;
  altClickData.lastData = lastData;
  altClickData.largeSpacing = actSpacingX > nodeSpaceMin;
  
  const preCoords = getEventCoordinates(preData);
  const lastCoords = getEventCoordinates(lastData);
  
  if (!preCoords || !lastCoords) {
    return;
  }
  drawConnector(preCoords, lastCoords, altClickData.largeSpacing);
};

const clearMeasure = () => {
  clearCanvas();
  altClickData.preData = null;
  altClickData.lastData = null;
  altClickData.largeSpacing = false;
  measureState.isMeasureFirst = false;
  measureState.isMeasureFixed = false;
  measureState.isMeasureChange = false;
};

watch([() => props.containerWidth, () => props.containerHeight], () => {
  clearDomCache();
  initCanvas();
});

watch(processExpanded, () => {
  clearDomCache();
  nextTick(() => {
    initCanvas();
  });
}, { deep: true });

watch(isMixMode, () => {
  clearDomCache();
  nextTick(() => {
    initCanvas();
  });
});

onMounted(() => {
  initCanvas();
});

onUnmounted(() => {
  if (ctx) {
    ctx = null;
  }
});

defineExpose({
  handleDistanceMeasurement,
  measureDistanceHover,
  drawMeasurePreview,
  clearMeasure,
  clearCanvas,
  getEventCoordinates,
  drawRoundedRect,
});
</script>

<style scoped>
.global-measure-canvas {
  position: absolute;
  top: 0;
  pointer-events: none;
  z-index: 3;
}

.measure-info-box {
  position: absolute;
  background-color: #317af7;
  color: #ffffff;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 100;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
