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
  <div>
  <div class="zoom-controls" :id=zoomControl :class="{ 'zoom-controls-threeColumn': isThreeColumn}" @click.stop>
    <div class="left-container" :class="{ 'left-container-search': isSearchActive}" v-if="threeColumnHeaderVisible">
      <div class="search-container-res" v-if="threeColumnSearchVisible">
        <div class="search-container">
          <d-tooltip :content="getTooltipContent()" position="right" v-if="isLockStatus || isPathLockStatus">
            <d-search class="swim-search" :disabled="isLockStatus || isPathLockStatus"  v-model="searchQuery" icon-position="left" :placeholder="searchPlaceholder"
              :show-glow-style="false" size="sm" is-keyup-search :delay="200" @search="onSearch" />
          </d-tooltip>
          <d-category-search v-else 
            ref="searchEl"
            class="swim-search"
            :category="category" 
            :selected-tags="catSelectedTags"
            :search-key="categorySearchKey"
            :extend-config="{show:true, clear: {show : isSearchActive}, save: { show: false }, more: {show : false} }"
            :placeholder="searchPlaceholder"
            :text-config="textConfig"
            :show-search-category="searchConfig"
            :collapseTags="true"
            :appendToBody="false"
            :menuBtnConfig="{ confirmText: $t('yes'), cancelText: $t('no')}"
            @search="onSearch"
            @selectedTagsChange="onSelectChange"
            @searchKeyChange="onSearchKeyChange"
            @clearAll="onClearAll">
            <template #RootTag="scope">
              <span>{{ scope.tag.label }}: </span>
              <span class="swim-header-search">{{ scope.tag.value.value }}</span>
            </template>
          </d-category-search>
          <d-tooltip :content="$t('caseSensitive')" v-if="searchedKey" position="bottom">
            <button class="case-sensitive" @click="toggleCaseSensitivity" :class="{'case-dark': isCaseSensitive}">
              <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
                <path d="M339.62496 186.78272H249.8816L4.26496 834.56H97.3824l62.75584-177.46432h269.90592L496.84992 834.56h93.11744L339.62496 186.78272z m-155.19744 396.76416L292.39296 269.1072h1.35168l107.96032 314.43968H184.42752zM927.21664 584.35584c-4.32128 8.09984-17.67424 15.25248-40.07936 21.45792-22.4 6.20544-54.38464 10.65984-95.9488 13.35808-42.6496 4.85376-74.22464 14.84288-94.74048 29.96224s-29.96224 34.816-28.3392 59.1104c3.23584 46.41792 38.05696 69.63712 104.448 69.63712 93.93152-6.4768 145.4848-50.74432 154.65984-132.79744v-60.72832z m-315.79136-97.97632c21.59104-93.93152 90.14272-139.27424 205.66528-136.03328 62.08512-1.61792 107.96544 12.416 137.65632 42.10688 29.69088 29.69088 43.72992 74.76736 42.10688 135.22432v187.04896c-1.61792 25.36448-0.13312 46.82752 4.4544 64.36864 4.58752 17.54112 11.4688 31.70816 20.64896 42.51136h-66.40128c-7.55712-7.55712-13.09184-16.8704-16.59904-27.93472-3.5072-11.06944-5.25824-22.8096-5.25824-35.2256-37.79584 50.74432-97.97632 76.11392-180.57216 76.11392-96.62464-3.24096-148.17792-43.1872-154.65984-119.8336 1.62304-44.80512 16.06144-79.62624 43.32544-104.45824 27.25888-24.832 68.68992-39.67488 124.288-44.53376 44.26752-4.85376 79.89248-9.85088 106.88512-14.976 26.98752-5.13536 45.07648-11.74528 54.25152-19.84 3.24096-42.64448-4.58752-73.68704-23.48032-93.12256-18.88768-19.4304-48.85504-28.3392-89.8816-26.72128-39.94624-1.61792-71.53152 5.39648-94.73536 21.05344-23.2192 15.65696-36.98176 40.21248-41.29792 73.68192l-66.39616-19.4304z" p-id="5425"></path>
              </svg>
            </button>
          </d-tooltip>
        </div>
        <span class="result-count" v-if="isSearchActive"> {{ currentResultIndex }} / {{ searchResultCount }} </span>
        <div class="search-res" v-if="isSearchActive">
          <d-icon name="icon-arrow-left-l" class="pre-button" @click="navigateResults('prev')" style="font-size: 16px;" ></d-icon>
          <d-icon name="icon-arrow-right-l" class="right-button" @click="navigateResults('next')" style="font-size: 16px;"></d-icon>
        </div>
      </div>
    </div>
    <div class="right-container" v-if="threeColumnHeaderVisible">
      <d-button class="icon-container" @click="isThreeColumnSearchActive()" style="height: 28px; width: 28px; padding:4px;" v-if="!threeColumnSearchVisible">
          <d-icon name="icon-search" size="16px" color="var(--devui-overlay-icon)"></d-icon>
      </d-button>
      <div class="slider-container" :class="{'slider-container-border': !isDarkTheme}">
        <d-icon name="icon-zoom-out-2" id="swim-header-decrease" size="16px" @click="decrease()"></d-icon>
        <div class="slider-wrapper">
          <d-slider id="swimSlider" :min="0" :max="sliderMaxCount" v-model="sliderValue" :tips-renderer="null" @update:modelValue="updataScale()" style="width: 110px"></d-slider>
        </div>
        <d-icon name="icon-enlarge" id="swim-header-increase" size="16px" @click="increase()"></d-icon>
      </div>
      <d-tooltip position="bottom" :content="$t('ShortcutKeyDescription')">
        <d-button class="shortcut-keys-button" @click="ShortcutKeyShow()" style="height: 28px; width: 28px; padding: 0 4px;">
          <KeyboradIcon :active="isShortcutKeyShow"/>
        </d-button>
      </d-tooltip>
      <d-tooltip :content="$t('exportImageGraph')" position="bottom" v-if="!isThreeColumn">
        <d-button class="icon-container" :disabled="isExporting" @click="exportSwimGraph" style="height: 28px; width: 28px; padding:4px">
          <d-icon name="icon-download" size="15px" color="var(--devui-overlay-icon)"></d-icon>
        </d-button>
      </d-tooltip>
      <d-tooltip :content="$t('configButtonTip')" :mouse-enter-delay="100" overlay-class="corner-tips">
        <d-button class="cfg-button" @click="showSwimCfg()" style="height: 28px; width: 28px; padding: 0 4px;">
          <LayerControlIcon :active="isCfgEditing"/>
        </d-button>
      </d-tooltip>
      <d-tooltip :content="$t('Measure')">
        <d-button id="measure-button" @click="measureModel()" :class="{'dark-model': isMeasureModel}" style="height: 28px; width: 28px; padding: 0 4px;">
          <MeasureIcon :active="isMeasureModel"/>
        </d-button>
      </d-tooltip>
      <d-tooltip :content="$t('PerformanceStatus')" position="bottom">
        <d-button class="icon-container" @click="showPerformance" style="height: 28px; width: 28px; padding:4px">
          <d-icon name="line-chart" size="15px" color="var(--devui-overlay-icon)"></d-icon>
        </d-button>
      </d-tooltip>
      <d-button class="icon-container" @click="onToggleSwimFullscreenFunction()" style="height: 28px; width: 28px; padding:4px;" v-if="isThreeColumn">
          <i :class="[isSwimFullscreen ? 'icon-zoom-screen' : 'icon-full-screen']"></i>
      </d-button>
      <d-button class="right-container-buttor hidden" @click="toggleDetailsCores()">{{ $t("data") }}</d-button>
    </div>
  </div>
  <div>
    <export-modal  :data-url="dataUrl" :file-name="fileName"/>
  </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, watch, onMounted, provide, nextTick, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { devicePixelRatio, getThreadHeight, getThreadStartY, getDisplayThreadName } from '../swimGraphUtils';
import { swimDataManager } from '../swimData';
import { canvasPool } from '../render/canvasPool';
import SwimGraphBarChart from '../swimGraphBarChart/swimGraphBarChart.vue';
import LayerControlIcon from '../../comGraph/layerControl/layerControlIcon.vue';
import KeyboradIcon from '../icon/keyboardIcon.vue';
import MeasureIcon from '../icon/measureIcon.vue';
import { useViewServer } from '../../../core/use-view-server';
import ExportModal from '../../exportModal/exportModal.vue';
const swimGraphBarChartComponent = ref(null);

const { t: $t } = useI18n();
const { server } = useViewServer();
// 注入父组件提供的状态和方法
const {
  tsScale,
  viewState,
  sliderValue,
  sliderMax,
  sliderMaxCount,
  timeLineX,
  processExpanded,
  detailsPanelExpanded,
  selectedEvent,
  lastSelected,
  highlightedPaths,
  swimlaneContainer,
  isMeasureModel,
  measureDragStartX,
  measureDragEndX,
  isDarkTheme,
  mulDetailsExpanded,
  isLockStatus,
  isCfgEditing,
  isShortcutKeyShow,
  searchedEvent,
  isThreeColumn,
  fileName,
  isAicpu,
  isE2ESwim,
  isSwimGraphActive,
  isSwimFullscreen,
  isPathLockStatus,
  timelineComponent,
  layout,
  lane2line,
  performanceVisible,
  performanceWidth,
  isWideScreen,
  isMaxSchedule,
  pinnedthreadsComponent,
  isMixMode,
  hasSplitThreads,
} = inject('swimGraphState');

const {
  searchQuery,
  searchResult,
  currentResultIndex,
  isSearchActive,
  isCaseSensitive,
} = inject('swimGraphSearch');

const {
  pinnedThreadsList
} = inject('swimGraphPinnedState', {
  pinnedThreadsList: { value: [] }
});

const {
  transform,
  exportRender,
  toggleDetailsCores,
  getTimelineCanvas,
  resizeMeasure,
  selectEvent,
  getDisplayName,
  onToggleSwimFullscreenFunction,
  resetMaxScheduleState,
  toggleProcess
} = inject('swimGraphMethods');

const {
  pmuTotal
} = inject('swimGraphPmuTotal');

const mPath = ref(`${window.staticPath}/static-assets/measure.svg`);
const caseSensitivePathNoActive = `${window.staticPath}/static-assets/upper_lower.svg`;
const caseSensitivePathActive = `${window.staticPath}/static-assets/upper_blue.svg`;
const backgroundColor = ref('#606061');

const caseSensitivePath = computed(() => isCaseSensitive.value ? caseSensitivePathActive : caseSensitivePathNoActive);

const searchPlaceholder = $t("searchKeyword");
const selectedTagsRef = ref([]);
const searchedKey = ref('');
const searchEl = ref();
const reportTabId = ref('tab1');
const timeOptionsList = ["按子图", "按语义标签"];
const option1 = ref("按子图");
const timeOptions1111 = reactive(timeOptionsList);
let dataUrl = ref('');
const catSelectedTags = ref([]);
const categorySearchKey = ref('');
let category = [
    {
      label: 'Root Func. Hash',
      field: 'Root',
      type: 'textInput',
      group: 'Basic',
      maxLength: 50,
      validateRules:[
        {required: true, message: $t('noNull'), trigger: 'change'},
        {min: 1, max: 100, message: $t('hashInput'), trigger: 'change'},
        ],
    },
    {
      label: 'Leaf Func. Hash',
      field: 'Leaf',
      type: 'textInput',
      group: 'Basic',
      maxLength: 50,
      validateRules:[
        {required: true, message: $t('noNull'), trigger: 'change'},
        {min: 1, max: 100, message: $t('hashInput'), trigger: 'change'},
        ],
    }
  ];

const searchConfig = {
  keywordDescription: (key) => $t('swimGraphkeywordDesc', { key }),
  fieldDescription: (label) => $t('swimGraphfieldDesc', { label }),
  categoryDescription: $t('swimGraphcategoryDesc')
};
const textConfig = {
  noCategoriesAvailable: $t('noSearchCondition'),
  tagMenuEmpty: $t('noSearchMeasureDetaildata'),
  keywordName: $t('comGraph.keyword')
};
const searchResultCount = ref(0);

const reportVisible = ref(false);
const isExporting = ref(false);
const threeColumnHeaderVisible = ref(false);
const threeColumnSearchVisible = ref(true);
const zoomControl = ref('');

const clearSearch = async () => {
  categorySearchKey.value = '';
  await nextTick();
  catSelectedTags.value = [];
  const params = {
    searchKey: categorySearchKey.value,
    selectedTags: catSelectedTags.value,
  };
  onSearch(params);
};

const showSwimCfg = () => {
  isCfgEditing.value = !isCfgEditing.value;
  isShortcutKeyShow.value = false;
};

const closeDrawer = () => {
  reportVisible.value = false;
};

const showPerformance = () => {
  performanceVisible.value = !performanceVisible.value;
  nextTick(()=> {
    if (performanceVisible.value) {
      performanceWidth.value = isWideScreen.value ? 500 : 370;
    } else {
    performanceWidth.value = 0;
    }
  });
};

const exportSwimGraph = () => {
  if (!timelineComponent?.value) {
    return;
  }
  isExporting.value = true;
  try {
    exportRender();
    const dpr = window.devicePixelRatio || 1;
    const { processLabelWidth } = layout;
    const { canvasCssWidth } = viewState;
    // 1. 计算总尺寸
    const { totalWidth, totalHeight, timelineHeight, pinnedHeight } = calculateCanvasSize(
      processLabelWidth,
      canvasCssWidth,
      timelineComponent.value.$el
    );
    // 2. 创建导出画布
    const { canvas, ctx } = createExportCanvas(totalWidth, totalHeight, dpr);
    // 3. 绘制顶部时间轴（fixed + scroll + flags）
    drawTimelineArea(ctx, processLabelWidth, canvasCssWidth, dpr);
    // 4. 绘制置顶泳道
    const startY = timelineHeight;
    drawPinnedThreads(ctx, processLabelWidth, canvasCssWidth, startY, dpr);
    // 5. 绘制所有 Process 块
    drawProcessBlocks(
      ctx,
      canvasCssWidth,
      startY + pinnedHeight
    );
    // 6. 导出图片
    dataUrl.value = canvas.toDataURL('image/png');
    server.checkSys();
  } catch (error) {
    postMessage($t('imageExportErrorInfo'));
  } finally {
    isExporting.value = false;
  }
};

const calculateContentHeight = (params) => {
  const {key, process,  isMixModeValue} = params;
  let contentHeight = 0;
  if (isMixModeValue && swimDataManager.hasMixConfig()) {
    const swimLaneOrder = swimDataManager.getSwimLaneOrder();
    for (const lane of swimLaneOrder) {
      if (lane.type === 'wrap-label') {
        contentHeight += lane.height;
      } else if (lane.type === 'thread') {
        contentHeight += lane.height;
      }
    }
  } else {
    for (const [threadKey, thread] of process.threads.entries()) {
      const tKey = thread.isCounter ? thread.threadName : thread.tid;
      contentHeight += getThreadHeight(key, tKey, lane2line, layout, thread.isCounter);
    }
  }

  return contentHeight;
};

function getDrawingColors(isDarkTheme) {
  return {
    textColor: isDarkTheme ? '#e8e8e8' : '#333333',
    lineColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    iconColor: '#0066cc',
    bgColor: isDarkTheme ? '#1F1F1F' : '#ffffff',
    headerBgColor: isDarkTheme ? '#2b2b2b' : '#f0f0f0'
  };
}

function drawPinIcon(ctx, x, y, size = 16) {
  ctx.save();
  ctx.translate(x - (size / 2), y - (size / 2));
  const path = new Path2D('M11.5,1 C11.8993477,1 12.1375434,1.44507273 11.9160251,1.7773501 L11.9160251,1.7773501 L11.014,3.13 L11.485,8.075 L12.9160251,10.22264949 C13.1217207,10.5311932 12.9310302,10.9369937 12.5829991,10.993391 L12.5829991,10.993391 L12.5,11 L8.49915929,11 L8.5,15 L7.5,15 L7.49915929,11 L3.5,11 C3.12917714,11 2.89730677,10.6162383 3.04343429,10.2953753 L3.08397485,10.2226499 L4.514,8.075 L4.985,3.13 L4.08397485,1.7773501 C3.87827934,1.46880683 4.06896983,1.06300633 4.41700091,1.00660903 L4.41700091,1.00660903 L4.5,1 Z');
  ctx.fill(path);
  ctx.restore();
}

function drawSeparator(ctx, startX, startY, endX, endY, lineColor, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawTruncatedText(ctx, text, x, y, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  const widthPerChar = ctx.measureText(text).width / text.length;
  const maxChars = Math.floor(maxWidth / widthPerChar);
  const truncatedText = text.substring(0, Math.max(0, maxChars - 3)) + '...';
  ctx.fillText(truncatedText, x, y);
}

function drawGroupThreadLabels(ctx, groupThreads, startY, processKey, layoutConfig, showPinIcon = true) {
  const { lane2line, layout, processLabelWidth, getThreadHeight } = layoutConfig;
  const colors = getDrawingColors(isDarkTheme.value);
  const PIN_COLUMN_WIDTH = 36;
  const GROUP_COLUMN_WIDTH = 85;
  
  let groupTotalHeight = 0;
  for (const pt of groupThreads) {
    const height = getThreadHeight(processKey, pt.thread.tid, lane2line, layout, pt.thread.isCounter);
    groupTotalHeight += height;
  }
  
  const groupHeight = groupTotalHeight;
  drawSeparator(ctx, PIN_COLUMN_WIDTH + GROUP_COLUMN_WIDTH, startY, PIN_COLUMN_WIDTH + GROUP_COLUMN_WIDTH, startY + groupHeight, colors.lineColor);
  
  if (showPinIcon) {
    const iconX = 10;
    const iconY = startY + (groupHeight / 2);
    ctx.fillStyle = colors.iconColor;
    drawPinIcon(ctx, iconX, iconY);
  }
  
  ctx.fillStyle = colors.textColor;
  drawTruncatedText(ctx, groupThreads[0].thread.parentThreadName, PIN_COLUMN_WIDTH + 4, startY + (groupHeight / 2), GROUP_COLUMN_WIDTH - 8);
  
  let threadY = startY;
  for (const pt of groupThreads) {
    const threadHeight = getThreadHeight(processKey, pt.thread.tid, lane2line, layout, pt.thread.isCounter);
    ctx.fillStyle = colors.textColor;
    ctx.fillText(getDisplayThreadName(pt.thread), PIN_COLUMN_WIDTH + GROUP_COLUMN_WIDTH + 8, threadY + (threadHeight / 2));
    drawSeparator(ctx, PIN_COLUMN_WIDTH + GROUP_COLUMN_WIDTH, threadY + threadHeight, processLabelWidth, threadY + threadHeight, colors.lineColor);
    threadY += threadHeight;
  }
  
  drawSeparator(ctx, 0, startY + groupHeight, PIN_COLUMN_WIDTH + GROUP_COLUMN_WIDTH, startY + groupHeight, colors.lineColor);
  return startY + groupHeight;
}

function drawSingleThreadLabel(ctx, thread, startY, height, processLabelWidth, hasPinIcon) {
  const colors = getDrawingColors(isDarkTheme.value);
  const PIN_COLUMN_WIDTH = 36;
  
  if (hasPinIcon) {
    const iconX = 10;
    const iconY = startY + (height / 2);
    ctx.fillStyle = colors.iconColor;
    drawPinIcon(ctx, iconX, iconY);
  }
  
  ctx.fillStyle = colors.textColor;
  const textStartX = PIN_COLUMN_WIDTH + 8;
  const maxTextWidth = processLabelWidth - textStartX - 10;
  const labelText = getDisplayThreadName(thread) || thread.tid;
  drawTruncatedText(ctx, labelText, textStartX, startY + (height / 2), maxTextWidth);
  drawSeparator(ctx, 0, startY + height, processLabelWidth, startY + height, colors.lineColor);
}

// 辅助函数 1：计算画布总尺寸
function calculateCanvasSize(
  processLabelWidth,
  canvasCssWidth,
  timelineEl
) {
  const timelineHeight = timelineEl ? timelineEl.offsetHeight : 40;
  let pinnedHeight = 0;
  if (pinnedthreadsComponent?.value) {
    pinnedHeight = pinnedthreadsComponent.value.getPinnedHeight();
  }
  let totalProcessHeight = 0;
  for (const [key, process] of swimDataManager.getAllProcesses()) {
    totalProcessHeight += layout.processHeaderHeight;
    if (processExpanded.get(key)) {
      const contentHeight = calculateContentHeight({
        key,
        process,
        isMixModeValue: isMixMode.value
      });
      totalProcessHeight += contentHeight;
    }
    totalProcessHeight += layout.processMargin;
  }
  const totalHeight = timelineHeight + pinnedHeight + totalProcessHeight;
  const totalWidth = processLabelWidth + canvasCssWidth;
  return { totalWidth, totalHeight, timelineHeight, pinnedHeight };
}

// 辅助函数 2：创建并初始化画布
function createExportCanvas(totalWidth, totalHeight, dpr) {
  const canvas = document.createElement('canvas');
  canvas.width = totalWidth * dpr;
  canvas.height = totalHeight * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  // 背景
  ctx.fillStyle = isDarkTheme.value ? '#1F1F1F' : '#ffffff';
  ctx.fillRect(0, 0, totalWidth, totalHeight);
  return { canvas, ctx };
}

// 辅助函数 3：绘制顶部时间轴区域
function drawTimelineArea(ctx, processLabelWidth, canvasCssWidth, dpr) {
  const fixedCanvas = timelineComponent.value.fixedtimelineCanvas;
  const scrollCanvas = timelineComponent.value.timelineCanvas;
  const { flagsCanvas } = timelineComponent.value;
  if (!fixedCanvas || !scrollCanvas) {
    return;
  }
  const fixedHeight = fixedCanvas.height / dpr;
  const scrollHeight = scrollCanvas.height / dpr;
  // 左侧背景矩形（覆盖 fixed + scroll 高度）
  ctx.fillStyle = isDarkTheme.value ? '#2b2b2b' : '#f0f0f0';
  ctx.fillRect(0, 0, processLabelWidth, fixedHeight + scrollHeight);
  // 绘制各层
  ctx.drawImage(fixedCanvas, processLabelWidth, 0, canvasCssWidth, fixedHeight);
  ctx.drawImage(scrollCanvas, processLabelWidth, fixedHeight, canvasCssWidth, scrollHeight);
  if (flagsCanvas) {
    ctx.drawImage(flagsCanvas, processLabelWidth, fixedHeight, canvasCssWidth, scrollHeight);
  }
}

// 辅助函数 4：绘制置顶泳道区域
function drawPinnedThreads(ctx, processLabelWidth, canvasCssWidth, startY, dpr) {
  if (!pinnedthreadsComponent?.value) {
    return;
  }
  const pinnedContainer = pinnedthreadsComponent.value.$el;
  if (!pinnedContainer) {
    return;
  }
  const pinnedHeight = pinnedContainer.scrollHeight;
  if (pinnedHeight === 0) {
    return;
  }
  
  const colors = getDrawingColors(isDarkTheme.value);
  
  ctx.fillStyle = colors.bgColor;
  ctx.fillRect(0, startY, processLabelWidth, pinnedHeight);
  ctx.fillRect(processLabelWidth, startY, canvasCssWidth, pinnedHeight);
  
  const pinnedEventsCanvas = pinnedContainer.querySelector('.pinned-events-canvas');
  const pinnedDepCanvas = pinnedContainer.querySelector('.pinned-dep-canvas');
  const pinnedUiCanvas = pinnedContainer.querySelector('.pinned-ui-canvas');
  const pinnedHoverCanvas = pinnedContainer.querySelector('.pinned-hover-canvas');
  const pinnedLineCanvas = pinnedContainer.querySelector('.pinned-line-canvas');
  
  if (pinnedEventsCanvas) {
    ctx.drawImage(pinnedEventsCanvas, processLabelWidth, startY, canvasCssWidth, pinnedHeight);
  }
  if (pinnedDepCanvas) {
    ctx.drawImage(pinnedDepCanvas, processLabelWidth, startY, canvasCssWidth, pinnedHeight);
  }
  if (pinnedUiCanvas) {
    ctx.drawImage(pinnedUiCanvas, processLabelWidth, startY, canvasCssWidth, pinnedHeight);
  }
  if (pinnedHoverCanvas) {
    ctx.drawImage(pinnedHoverCanvas, processLabelWidth, startY, canvasCssWidth, pinnedHeight);
  }
  if (pinnedLineCanvas) {
    ctx.drawImage(pinnedLineCanvas, processLabelWidth, startY, canvasCssWidth, pinnedHeight);
  }
  
  drawSeparator(ctx, processLabelWidth, startY, processLabelWidth, startY + pinnedHeight, colors.lineColor);
  
  ctx.font = '13px Arial';
  ctx.textBaseline = 'middle';
  
  const renderedGroups = new Set();
  let currentY = startY;
  
  for (const pinnedThread of pinnedThreadsList.value) {
    if (pinnedThread.thread.parentTid === undefined) {
      const threadHeight = getThreadHeight(
        pinnedThread.processKey,
        pinnedThread.thread.tid,
        lane2line,
        layout,
        pinnedThread.thread.isCounter
      );
      
      drawSingleThreadLabel(ctx, pinnedThread.thread, currentY, threadHeight, processLabelWidth, true);
      currentY += threadHeight;
    } else {
      const parentTid = pinnedThread.thread.parentTid;
      if (!renderedGroups.has(parentTid)) {
        renderedGroups.add(parentTid);
        
        const groupThreads = [];
        for (const pt of pinnedThreadsList.value) {
          if (pt.thread.parentTid === parentTid) {
            groupThreads.push(pt);
          }
        }
        
        const layoutConfig = {
          lane2line,
          layout,
          processLabelWidth,
          getThreadHeight
        };
        
        currentY = drawGroupThreadLabels(ctx, groupThreads, currentY, pinnedThread.processKey, layoutConfig);
      }
    }
  }
}

// 辅助函数 5：绘制所有 Process 块
function drawProcessBlocks(
  ctx,
  canvasCssWidth,
  startY
) {
  let currentY = startY;
  ctx.font = '12px Arial';
  ctx.textBaseline = 'middle';
  for (const [key, process] of swimDataManager.getAllProcesses()) {
    currentY = drawProcess(
      ctx,
      key,
      process,
      currentY,
      canvasCssWidth
    );
  }
}

// 绘制单个 Process（Header + Body）
function drawProcess(
  ctx,
  key,
  process,
  currentY,
  canvasCssWidth
) {
  const { processLabelWidth, processHeaderHeight, processMargin } = layout;
  const textColor = isDarkTheme.value ? '#e8e8e8' : '#333333';
  const lineColor = isDarkTheme.value ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  // Header
  ctx.fillStyle = textColor === '#e8e8e8' ? '#2b2b2b' : '#f0f0f0'; // 根据主题反推背景色
  ctx.fillRect(0, currentY, processLabelWidth + canvasCssWidth, processHeaderHeight);
  ctx.fillStyle = textColor;
  ctx.fillText(process.name, 10, currentY + (processHeaderHeight / 2));
  let y = currentY + processHeaderHeight;
  // Body
  if (processExpanded.get(key)) {
    let contentHeight = 0;
    
    if (isMixMode.value && swimDataManager.hasMixConfig()) {
      const swimLaneOrder = swimDataManager.getSwimLaneOrder();
      for (const lane of swimLaneOrder) {
        if (lane.type === 'wrap-label' || lane.type === 'thread') {
          contentHeight += lane.height;
        }
      }
    } else {
      for (const [threadKey, thread] of process.threads.entries()) {
        const tKey = thread.isCounter ? thread.threadName : thread.tid;
        contentHeight += getThreadHeight(key, tKey, lane2line, layout, thread.isCounter);
      }
    }
    // 绘制左侧 labels
    drawThreadLabels(ctx, process, key, y, contentHeight);
    // 绘制右侧 layers
    drawProcessLayers(ctx, key, y, canvasCssWidth, contentHeight);
    y += contentHeight;
  }
  drawProcessHeaderLayers(ctx, key, y, canvasCssWidth);
  // 分割线
  const totalProcessHeight = y - currentY; 
  const bottomY = currentY + totalProcessHeight;
  ctx.beginPath();
  ctx.moveTo(0, bottomY);
  ctx.lineTo(processLabelWidth + canvasCssWidth, bottomY);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  return bottomY;
}

// 绘制 Thread Labels - 适配四栏布局
function drawThreadLabels(ctx, process, processKey, startY, contentHeight) {
  const { processLabelWidth } = layout;
  const { canvasCssWidth } = viewState;
  const colors = getDrawingColors(isDarkTheme.value);
  
  let hasProcessSplitThreads = false;
  for (const thread of process.threads.values()) {
    if (thread.parentTid !== undefined) {
      hasProcessSplitThreads = true;
      break;
    }
  }
  
  ctx.save();
  drawSeparator(ctx, processLabelWidth, startY, processLabelWidth, startY + contentHeight, colors.lineColor);
  
  if (isMixMode.value && swimDataManager.hasMixConfig()) {
    const swimLaneOrder = swimDataManager.getSwimLaneOrder();
    let labelY = startY;
    let isFirstWrapLabel = true;
    
    for (const lane of swimLaneOrder) {
      if (lane.type === 'wrap-label') {
        const laneHeight = lane.height;
        if (isFirstWrapLabel) {
          ctx.fillStyle = isDarkTheme.value ? '#666666' : '#C9C9C9';
          ctx.fillText($t('mixTasks'), 30, labelY + laneHeight / 2);
          isFirstWrapLabel = false;
        }
        drawSeparator(ctx, 0, labelY + laneHeight, processLabelWidth, labelY + laneHeight, colors.lineColor);
        labelY += laneHeight;
      } else if (lane.type === 'thread') {
        const { thread } = lane;
        const tHeight = lane.height;
        const { isPinned } = thread;
        
        if (isPinned) {
          ctx.fillStyle = colors.iconColor;
          drawPinIcon(ctx, 10, labelY + (tHeight / 2));
        }
        
        ctx.fillStyle = colors.textColor;
        const labelText = getDisplayThreadName(thread) || thread.tid;
        drawTruncatedText(ctx, labelText, 36, labelY + (tHeight / 2), processLabelWidth - 36 - 10);
        
        drawSeparator(ctx, 0, labelY + tHeight, processLabelWidth, labelY + tHeight, colors.lineColor);
        labelY += tHeight;
      }
    }
  } else if (hasProcessSplitThreads) {
    const groups = new Map();
    for (const [tid, thread] of process.threads) {
      if (thread.parentTid !== undefined) {
        if (!groups.has(thread.parentTid)) {
          groups.set(thread.parentTid, {
            parentThreadName: thread.parentThreadName,
            parentTid: thread.parentTid,
            threads: [],
            totalHeight: 0
          });
        }
        
        const group = groups.get(thread.parentTid);
        group.threads.push({ tid, thread });
        
        const height = getThreadHeight(processKey, thread.tid, lane2line, layout, thread.isCounter);
        group.totalHeight += height;
      }
    }
    
    const groupsArray = Array.from(groups.values());
    
    const PIN_COLUMN_WIDTH = 36;
    const GROUP_COLUMN_WIDTH = 85;
    drawSeparator(ctx, PIN_COLUMN_WIDTH + GROUP_COLUMN_WIDTH, startY, PIN_COLUMN_WIDTH + GROUP_COLUMN_WIDTH, startY + contentHeight, colors.lineColor);
    
    let currentY = startY;
    ctx.font = '13px Arial';
    
    for (const group of groupsArray) {
      const groupThreads = group.threads.map(item => ({
        thread: item.thread,
        processKey
      }));
      
      const isGroupPinned = groupThreads.some(pt => pt.thread.isPinned);
      
      const layoutConfig = {
        lane2line,
        layout,
        processLabelWidth,
        getThreadHeight
      };
      
      currentY = drawGroupThreadLabels(ctx, groupThreads, currentY, processKey, layoutConfig, isGroupPinned);
    }
  } else {
    ctx.font = '13px Arial';
    
    for (const [threadKey, thread] of process.threads.entries()) {
      const tKey = thread.isCounter ? thread.threadName : thread.tid;
      const tHeight = getThreadHeight(processKey, tKey, lane2line, layout, thread.isCounter);
      const tStartY = getThreadStartY(process, processKey, tKey, lane2line, layout);
      const labelY = startY + tStartY;
      const { isPinned } = thread;
      
      if (isPinned) {
        ctx.fillStyle = colors.iconColor;
        drawPinIcon(ctx, 10, labelY + (tHeight / 2));
      }
      
      ctx.fillStyle = colors.textColor;
      const labelText = getDisplayThreadName(thread) || thread.tid;
      drawTruncatedText(ctx, labelText, 36, labelY + (tHeight / 2), processLabelWidth - 36 - 10);
      
      drawSeparator(ctx, 0, labelY + tHeight, processLabelWidth, labelY + tHeight, colors.lineColor);
    }
  }
  
  ctx.restore();
}

// 绘制 Process 的各图层（bg, event, dep 等）, E2ESwim和单aicpu的依赖节点用的是data-dep，其他用的是global
function drawProcessLayers(ctx, processKey, y, width, height) {
  const { processLabelWidth } = layout;
  let selectors = [
    `[data-background-process-key="${processKey}"]`,
    `[data-wrap-container-process-key="${processKey}"]`,
    `[data-process-key="${processKey}"]`,
    `[data-mix-dep-process-key="${processKey}"]`,
    `[data-dep-process-key="${processKey}"]`,
    `.global-connection-canvas`,
    `[data-selection-process-key="${processKey}"]`,
    `[data-ui-process-key="${processKey}"]`,
    `[data-hover-wrap-container-process-key="${processKey}"]`,
    `[data-line-process-key="${processKey}"]`
  ];
const selectedProcessKey = selectedEvent.value?.pid?.toString() ?? null;
const searchedProcessKey = searchedEvent.value?.pid?.toString() ?? null;
const activeProcessKey = selectedProcessKey || searchedProcessKey;
if (!isE2ESwim.value && activeProcessKey && processKey != activeProcessKey) {
  selectors = [
    `[data-background-process-key="${processKey}"]`,
    `[data-wrap-container-process-key="${processKey}"]`,
    `[data-process-key="${processKey}"]`,
    `[data-mix-dep-process-key="${processKey}"]`,
    `[data-selection-process-key="${processKey}"]`,
    `[data-ui-process-key="${processKey}"]`,
    `[data-hover-wrap-container-process-key="${processKey}"]`,
    `[data-line-process-key="${processKey}"]`
  ];
}
  const globalRef = document.querySelector('.global-connection-canvas');
  const globalHeight = globalRef ? globalRef.offsetHeight : 0;
  const offsetHeight = globalRef ? getCanvasOffsetHeight() : 0;
  for (const selector of selectors) {
    const canvasEl = document.querySelector(selector);
    if (canvasEl) {
      const isGlobalCanvas = (selector === '.global-connection-canvas');
      const drawY = isGlobalCanvas ? y - offsetHeight : y;
      const drawHeight = isGlobalCanvas ? globalHeight : height;
      ctx.drawImage(canvasEl, processLabelWidth, drawY, width, drawHeight);
      if (isMeasureModel.value && canvasEl.hasAttribute('data-process-key')) {
        const totalExportWidth = processLabelWidth + width;
        const g = ctx.createLinearGradient(0, 0, totalExportWidth, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.3)');
        g.addColorStop(measureDragStartX.value / totalExportWidth, 'rgba(0,0,0,0.3)');
        g.addColorStop(measureDragStartX.value / totalExportWidth, 'rgba(0,0,0,0)');
        g.addColorStop(measureDragEndX.value / totalExportWidth, 'rgba(0,0,0,0)');
        g.addColorStop(measureDragEndX.value / totalExportWidth, 'rgba(0,0,0,0.3)');
        g.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.save();
        // 限制绘制区域为当前 Process 的 body 区域（避免影响其他部分）
        ctx.beginPath();
        ctx.rect(processLabelWidth, drawY, width, drawHeight);
        ctx.clip();
        // 绘制遮罩
        ctx.fillStyle = g;
        ctx.fillRect(processLabelWidth, drawY, width, drawHeight);
        // 恢复
        ctx.restore();
      }
    }
  }
}
function getCanvasOffsetHeight() {
  const ROW_GAP = 30; 
  const selectedKey = selectedEvent.value?.pid?.toString();
  const searchedKey = searchedEvent.value?.pid?.toString();
  const activeKey = selectedKey || searchedKey;
  if (!activeKey) {
    return 0;
  }
  let currentOffset = 0;
  for (const [key, process] of swimDataManager.getAllProcesses().entries()) {
    const isExpanded = processExpanded.get(key);
    const canvasRef = document.querySelector(`[data-process-key="${key}"]`);
    const canvasHeight = canvasRef ? canvasRef.offsetHeight : 0;
    if (activeKey === key) {
      return currentOffset + ROW_GAP; 
    }
    if (isExpanded) {
      currentOffset += (canvasHeight + ROW_GAP);
    } else {
      currentOffset += ROW_GAP;
    }
  }
  return currentOffset;
}
function drawProcessHeaderLayers(ctx, processKey, y, width) {
  const { processLabelWidth } = layout;
  const labelHeight = 30;
  // 直接从 CanvasPool 取实例
  const canvasEl = canvasPool.getCanvas('process-header-canvas', processKey);
  const eventCanvas = `[data-process-key="${processKey}"]`;
  const eventCanvasEl = document.querySelector(eventCanvas);
  if (canvasEl && eventCanvasEl) {
    //  源图像 X 坐标 Y 坐标 宽度 高度
    const h = eventCanvasEl.offsetHeight;
    ctx.drawImage(canvasEl, processLabelWidth, y - h - labelHeight, width, labelHeight);
  }
}
const pmuRowCoordList = ref([]);
const pmuColCoordList = ref([]);
const pmuRowCoordLoc = ref([]);
const pmuBarColorList = ref([]);
const pmuChartDataLeft = ref([]);
const pmuChartDataRight = ref([]);
const pmuBackLineLoc = ref([]);

const pmuExist = ref(true);
const reportTitle = ref($t('ReportTitle'));
const icacheHitRateTitle = ref($t('ICacheHitRate'));
const aicoreRateTitle = ref($t('aiCoreUtilization'));
const occupyRateTitle = ref($t('occupyRateTitle'));

const taskTime = ref(0);
const aicoreTime = ref(0);
const aicoreRate = ref(0);
const icacheHitRate = ref('/');

const cubeTimeWidth = ref(203);
const vectorTimeWidth = ref(203);
const cubeTimePercentage = ref(50);
const vectorTimePercentage = ref(50);

const vectorRateWidth = ref(0);
const cubeRateWidth = ref(0);
const scalarRateWidth = ref(0);
const mte1RateWidth = ref(0);
const mte2RateWidth = ref(0);
const mte3RateWidth = ref(0);

const vectorRateCycle = ref('/');
const cubeRateCycle = ref('/');
const scalarRateCycle = ref('/');
const mte1RateCycle = ref('/');
const mte2RateCycle = ref('/');
const mte3RateCycle = ref('/');

const vectorRatePercentage = ref(0);
const cubeRatePercentage = ref(0);
const scalarRatePercentage = ref(0);
const mte1RatePercentage = ref(0);
const mte2RatePercentage = ref(0);
const mte3RatePercentage = ref(0);

provide('swimGraphPmuBarChartInfo', {pmuRowCoordList, pmuColCoordList, pmuRowCoordLoc, pmuBarColorList, pmuChartDataLeft, pmuChartDataRight, reportTitle, pmuBackLineLoc, isDarkTheme});


const onSearch = (e) => {
  if (currentResultIndex.value >= 1 && e.searchKey === searchedKey.value) {
    return;
  }
  e.category = e.selectedTags[0]?.field;
  searchedKey.value = e.searchKey;
  categorySearchKey.value = e.searchKey;
  catSelectedTags.value = e.selectedTags;
  if (!(e.category) || e.category === '') {
    fuzzSearch(e.searchKey);
  } else {
    onSelectChange(e);
  }
};

const onSelectChange = (e) => {
  let { selectedTags } = e;
  selectedTagsRef.value = selectedTags;
  if (selectedTags.length === 0) {
    fuzzSearch(e.currentChangeTag?.value.value);
  } else if (selectedTags.length === 1) {
    const [tag] = selectedTags;
    searchBySingleHash(tag.field, tag.value.value);
  } else {
    const rootTag = selectedTags.find(tag => tag.field === 'Root');
    const leafTag = selectedTags.find(tag => tag.field === 'Leaf');
    if (rootTag && leafTag) {
      searchByComHash(rootTag.value.value, leafTag.value.value);
    }
  }
};

const onSearchKeyChange = (e) => {
  searchedKey.value = e;
};

const onClearAll = (e) => {
  searchedKey.value = '';
  resetsearchState();
};
const processThreadEvents = (thread, processKey, filterFn) => {
  const results = [];
  for (const eventId of thread.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (filterFn(event, thread, processKey)) {
      results.push([event, thread.threadName, processKey, thread.tid]);
      if (!processExpanded.get(processKey)) {
        toggleProcess(processKey);
      }
    }
  }
  return results;
};

const handleSubEvents = (params) => {
 	const { subEvents, thread, processKey, results, parentName } = params;
 	for (const subEvent of subEvents) {
 	  results.push([subEvent, thread.threadName, processKey, thread.tid, parentName]);
 	  if (!processExpanded.get(processKey)) {
 	    toggleProcess(processKey);
 	  }
 	}
};
 	 
const handleWaitTasks = (params) => {
 	const { waitTasks, thread, processKey, filterFn, results } = params;
 	for (const waitTask of waitTasks) {
 	  if (filterFn(waitTask, thread, processKey)) {
 	    results.push([waitTask, thread.threadName, processKey, thread.tid]);
 	    if (!processExpanded.get(processKey)) {
 	      toggleProcess(processKey);
 	    }
 	  }
 	}
};

const processMixThreadEvents = (thread, processKey, filterFn) => {
  let results = [];
  
  const processInfo = swimDataManager.processInfo.get(processKey);
  if (!processInfo) { 
    return results; 
  }
  
  let threadInfo = null;
  for (const [threadKey, t] of processInfo.threads.entries()) {
    if (t.tid === thread.tid) {
      threadInfo = t;
      break;
    }
  }
  
  if (!threadInfo) { 
    return results; 
  }
  
  const parentEvents = threadInfo.eventIds
    .map(id => swimDataManager.getEventById(id))
    .filter(e => e && swimDataManager.isMixParentEvent(e));
  
  for (const parentEvent of parentEvents) {
    const parentName = parentEvent.name;
    if (filterFn(parentEvent, thread, processKey)) {
      if (parentEvent.id === selectedEvent?.value?.parentEventId) {
        const subEvents = swimDataManager.getSubEvents(parentEvent.id);
        handleSubEvents({subEvents, thread, processKey, results, parentName});

        const waitTasks = swimDataManager.getWaitTasks(parentEvent.id);
        handleWaitTasks({waitTasks, thread, processKey, filterFn, results});
      } else {
        results = processThreadEvents(thread, processKey, filterFn);
      }
    }
  }

  for (const parentEvent of parentEvents) {
    const parentName = parentEvent.name;
    const subEvents = swimDataManager.getSubEvents(parentEvent.id);
    for (const subEvent of subEvents) {
      if (filterFn(subEvent, thread, processKey)) {
        results.push([subEvent, thread.threadName, processKey, thread.tid, parentName]);
        if (!processExpanded.get(processKey)) {
          toggleProcess(processKey);
 	      }
      }
 	  }
  }
  
  const normalEvents = threadInfo.eventIds
    .map(id => swimDataManager.getEventById(id))
    .filter(e => e && !swimDataManager.isMixParentEvent(e));
  
  for (const event of normalEvents) {
    if (filterFn(event, thread, processKey)) {
      results.push([event, thread.threadName, processKey, thread.tid]);
      if (!processExpanded.get(processKey)) {
        toggleProcess(processKey);
      }
    }
  }
  
  return results;
};

const removeDuplicateEvents = (results) => {
  const seenNames = new Set();
  return results.filter(item => {
    const eventName = item[0].name;
    if (seenNames.has(eventName)) {
      return false;
    } else {
      seenNames.add(eventName);
      return true;
    }
  });
};

const performSearch = (filterFn) => {
  searchResult.value = [];
  searchResultCount.value = 0;
  currentResultIndex.value = 0;
  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    for (const [threadKey, thread] of process.threads.entries()) {
      let results;
      if (isMixMode?.value && swimDataManager.hasMixConfig() && selectedEvent.value?.parentEventId) {
        results = processMixThreadEvents(thread, processKey, filterFn);
      } else {
        results = processThreadEvents(thread, processKey, filterFn);
      }
      searchResult.value.push(...results);
    }
  }
  if (isMaxSchedule.value) {
    resetMaxScheduleState();
  }
  if (!searchResult.value.length) {
    clearSearchData();
  }
  if (isMeasureModel.value) {
    measureModel();
  }
  searchResult.value.sort((a, b) => a[0].startTime - b[0].startTime);
  // 过滤针对mix模式下微观节点的场景
  if (isMixMode?.value && swimDataManager.hasMixConfig() && selectedEvent.value?.parentEventId) {
    searchResult.value = removeDuplicateEvents(searchResult.value);
  }
  searchResultCount.value = searchResult.value.length;
  isSearchActive.value = true;
  if (searchResultCount.value > 0) {
    currentResultIndex.value += 1;
    const target = searchResult.value.at(currentResultIndex.value - 1);
    if (target) {
      selectEventChild(target.at(0));
      scrollToEvent(target.at(0));
    }
  }
};

const searchByComHash = (rootHash, leafHash) => {
  const rootRegex = new RegExp(`rootHash:(?<hash>\\d+)`);
  const leafRegex = new RegExp(`leafHash:(?<hash>\\d+)`);
  performSearch((event) => {
    if (!event.args) {
      return false;
    }
    const eventHint = event.args['event-hint'];
    if (!eventHint) {
      return false; 
    }
    const rootMatch = eventHint.match(rootRegex);
    const leafMatch = eventHint.match(leafRegex);
    if (!rootMatch || !leafMatch) {
      return false; 
    }
    const eventName = isCaseSensitive.value ? event.name : event.name.toLowerCase();
    const searchKey = searchedKey?.value;
    if (!searchKey) {
      return rootMatch.groups.hash.includes(rootHash) && leafMatch.groups.hash.includes(leafHash);
    }
    const searchKeyLower = searchKey.toLowerCase();
    const isMatch = eventName.includes(isCaseSensitive.value ? searchKey : searchKeyLower);
    return isMatch && rootMatch.groups.hash.includes(rootHash) && leafMatch.groups.hash.includes(leafHash);
  });
};

const searchBySingleHash = (hashCate, hash) => {
  const regex = new RegExp(`${hashCate.toLowerCase()}Hash:(?<hash>\\d+)`);
  performSearch((event) => {
    if (!event.args) {
      return false;
    }
    const eventHint = event.args['event-hint'];
    if (!eventHint) { 
      return false; 
    }
    const match = eventHint.match(regex);
    if (!match?.groups.hash) { 
      return false; 
    }
    const eventName = isCaseSensitive.value ? event.name : event.name.toLowerCase();
    const searchKey = searchedKey?.value;
    if (!searchKey) {
      return match.groups.hash.includes(hash);
    }
    const searchKeyLower = searchKey.toLowerCase();
    return eventName.includes(isCaseSensitive.value ? searchKey : searchKeyLower) && match.groups.hash.includes(hash);
  });
};

const fuzzSearch = (e) => {
  let searchKey = e;
  if (!searchKey || searchKey.trim() === '') {
    if (searchedKey.value) {
      searchKey = searchedKey.value;
    } else {
      resetsearchState();
      return;
    }
  }
  const searchKeyL = isCaseSensitive.value ? searchKey : searchKey.toLowerCase();
  
  performSearch((event) => {
    const eventName = isCaseSensitive.value ? event.name : event.name.toLowerCase();
    return eventName.includes(isCaseSensitive.value ? searchKey : searchKeyL);
  });
};

const clearSearchData = () => {
  highlightedPaths.clear();
  for (const [processkey, process] of swimDataManager.getAllProcesses().entries()) {
    if (!processExpanded.get(processkey)) {
      continue;
    }
    selectEvent(null, processkey, false, true);
    if (detailsPanelExpanded.value) {
      detailsPanelExpanded.value = false;
    }
  }
};

const toggleCaseSensitivity = () => {
  isCaseSensitive.value = !isCaseSensitive.value;
  currentResultIndex.value = 0;
  const icon = searchEl.value.$el.querySelector('.dp-category-search-icon');
  icon?.click();
};
// 导航搜索结果
const navigateResults = async (direction) => {
  if (searchResultCount.value === 0) { return };
  if (direction === 'prev') {
    currentResultIndex.value = currentResultIndex.value > 1 ? currentResultIndex.value - 1 : searchResultCount.value;
  } else if (direction === 'next') {
    currentResultIndex.value = currentResultIndex.value < searchResultCount.value ? currentResultIndex.value + 1 : 1;
  }
  const target = searchResult.value.at(currentResultIndex.value - 1);
  const event = target.at(0);
  const processKey = target.at(2);
  const isExpanded = processExpanded.get(processKey);
  if (!isExpanded) {
    toggleProcess(processKey);
    await nextTick();
  }
  selectEventChild(event);
  scrollToEvent(event);
};

const selectEventChild = (event) => {
  searchedEvent.value = event;
  if (isMixMode?.value && swimDataManager.hasMixConfig() && selectedEvent.value?.parentEventId) {
    lastSelected.value = null;
    detailsPanelExpanded.value = false;
    highlightedPaths.clear();
    highlightedPaths.add(event.id);
    return;
  }
  selectedEvent.value = null;
  lastSelected.value = null;
  detailsPanelExpanded.value = false;
  highlightedPaths.clear();
  highlightedPaths.add(event.id);
};

const scrollToEvent = (event) => {
  let needRender = true;
  const eventLeftX = (event.renderInfo?.x * viewState.scale) + viewState.offsetX;
  if (eventLeftX < 0) {
    rightmove(0 - eventLeftX);
    needRender = false;
  }
  const eventWidth = event.renderInfo?.width * viewState.scale;
  const divElement = document.getElementsByClassName('swimlane-container');
  const scrollWidth = divElement[0].offsetWidth - divElement[0].clientWidth; // 滚动条的宽度
  const eventRightX = eventLeftX + eventWidth;
  
  // 获取canvas的CSS宽度，兼容高DPI和标准DPI
  const canvasCSSWidth = viewState.canvasCssWidth;
  const actualMaxX = canvasCSSWidth - scrollWidth; // 视口最右x坐标
  
  if (eventLeftX < actualMaxX && eventRightX > actualMaxX) {
    // 节点的一半被隐藏在视口之外
    const hiddenWidth = eventRightX - canvasCSSWidth;
    leftmove(hiddenWidth + scrollWidth);
    needRender = false;
  } else if (eventLeftX > actualMaxX) {
    // 节点整个被隐藏在视口之外
    leftmove((eventLeftX - canvasCSSWidth + eventWidth) + scrollWidth);
    needRender = false;
  }
  scrollToEventByDom(event);
  if (needRender) {transform();}
};

const updataScale = () => {
  let scale = Math.pow(1.25, sliderValue.value);
  if (scale * 10 > sliderMax.value) {
    scale = sliderMax.value / 10;
  }
  viewState.scaleChange = scale / viewState.scale;
  viewState.offsetX = viewState.offsetX * viewState.scaleChange;
  const timeLineEndX = Math.abs(timeLineX.value);
  const timelineCanvas = getTimelineCanvas();
  const cssWidth = viewState.canvasCssWidth;
  if(timelineCanvas && cssWidth > timeLineEndX){
    const tempOffsetX = cssWidth - timeLineEndX;
    viewState.offsetX += tempOffsetX;
  }
  if (viewState.offsetX > 0) {
    viewState.offsetX = 0;
  }
  viewState.scale = scale;
  viewState.pixelOffsetX = viewState.offsetX * devicePixelRatio;
  viewState.pixelScale = viewState.scale * devicePixelRatio;
  viewState.minWidth = 1 / scale;
  transform();
};

const isThreeColumnSearchActive = () => {
  threeColumnSearchVisible.value = !threeColumnSearchVisible.value;
};

const increase = () => {
  if (sliderValue.value < sliderMaxCount.value) {
    sliderValue.value += 1;
    updataScale();
  }
};

const decrease = () => {
  if (sliderValue.value > 0) {
    sliderValue.value -= 1;
    updataScale();
  } 
  if (sliderValue.value === 0) {
    updataScale();
  }
};
const leftmove = (step=30, forceTransform=false) => {
  if (viewState.scale === 1 && !forceTransform) {
    return;
  } else {
    const timeLineEndX = Math.abs(timeLineX.value);
    const canvasWidth = viewState.canvasCssWidth;
    if (canvasWidth > timeLineEndX - step) {
      step = timeLineEndX - canvasWidth;
    }
    viewState.offsetX -= step;
    viewState.pixelOffsetX = viewState.offsetX * devicePixelRatio;
    transform();
  }
};

const rightmove = (step=30, forceTransform=false) => {
  if (viewState.scale === 1 && !forceTransform) {
    return;
  } else {
    viewState.offsetX += step;
    if (viewState.offsetX > 0) {
      viewState.offsetX = 0;
    }
    viewState.pixelOffsetX = viewState.offsetX * devicePixelRatio;
    transform();
  }
};

const scrollToEventByDom = (event, behavior = 'smooth') => {
  let container;
  let isAicpuKernel = false;
  const pid = event?.pid;
  const processKey = String(pid);
  const process = swimDataManager.getProcess(processKey);
  
  if (isE2ESwim.value) {
    isAicpuKernel = process?.type === 'aicpu';
    container = isAicpuKernel ? swimlaneContainer.value.querySelector('.aicpu-section') : swimlaneContainer.value.querySelector('.kernel-section');
  } else {
    container = swimlaneContainer.value;
  }
  if (!container) {
    return;
  }
  
  const processSectionElement = document.querySelector(`[data-process="${processKey}"]`);
  if (!processSectionElement) {
    return;
  }
  
  const processSection = processSectionElement.closest('.process-section');
  if (!processSection) {
    return;
  }
  
  const containerRect = container.getBoundingClientRect();
  const processRect = processSection.getBoundingClientRect();
  
  const eventY = event.renderInfo?.y || 0;
  const processOffsetInContainer = processRect.top - containerRect.top + container.scrollTop;
  const targetPosition = processOffsetInContainer + eventY;
  const containerHeight = container.clientHeight;
  
  const targetScrollTop = Math.max(0, targetPosition - containerHeight / 2);
  
  container.scrollTo({
    top: targetScrollTop,
    behavior
  });
};

const ShortcutKeyShow = () => {
  isShortcutKeyShow.value = !isShortcutKeyShow.value;
  isCfgEditing.value = false;
};

const clearHeadState = () => {
  closeDrawer();
  clearSearch();
  isCfgEditing.value = false;
  isShortcutKeyShow.value = false;
};

const measureModel = () => {
  isMeasureModel.value = !isMeasureModel.value;
  if (mPath.value.includes('measure.svg')) {
    mPath.value = `${window.staticPath}/static-assets/measure-active.svg`;
  } else {
    mPath.value = `${window.staticPath}/static-assets/measure.svg`;
  }
  if (isMaxSchedule.value) {
    resetMaxScheduleState();
  }
  measureDragStartX.value = 0;
  measureDragEndX.value = 0;
  resizeMeasure();
  transform();
  mulDetailsExpanded.value = false;
}

const handleClickOutsize = (event) => {
  if (!event || !event.target) {
    return;
  }
  const container = document.querySelector('.zoom-controls');
  const flagsCanvas = document.querySelector('.flags-canvas');
  const eventsCanvas = document.querySelector('.events-canvas');
  const searchFocus = () => {
    return (
      event.target.innerHTML.includes('Hash') || 
      event.target.classList.contains('devui-input__inner') || 
      event.target.classList.contains('button-content') || 
      searchedKey.value !== '' || 
      selectedTagsRef.value.length > 0
    );
  }; 
  if (!container || !flagsCanvas || !eventsCanvas) {
    return;
  }
  if (isSearchActive.value && (flagsCanvas.contains(event.target) || eventsCanvas.contains(event.target))) {
    resetsearchState();
  }
  if (isSwimGraphActive.value && (!container.contains(event.target) && !searchFocus())) {
    threeColumnSearchVisible.value = false;
  }
};

const resetsearchState = (needSelectEvent=true) => {
  searchResultCount.value = 0;
  currentResultIndex.value = 0;
  isSearchActive.value = false;
  detailsPanelExpanded.value = false;
  searchedEvent.value = null;
  if (needSelectEvent) {
    clearSearchData();
  }
};

const getTooltipContent = () => {
  if (isLockStatus.value) {
    return $t('interlockModeSearchTip');
  } else {
    return $t('pathwayLockTip');
  }
};

const isThreeColumnHeader =() => {
  if (!isThreeColumn) {
    threeColumnHeaderVisible.value = true;
  } else {
    if (isSwimGraphActive.value) {
      threeColumnHeaderVisible.value = true;
    } else {
      threeColumnHeaderVisible.value = false;
    }
  }
};

watch(isDarkTheme, () => {
  updateTheme();
});
watch(isLockStatus, () => {
  if (!isLockStatus.value && !searchQuery.value) {
    return;
  }
  searchQuery.value = '';
  searchResultCount.value = 0;
  currentResultIndex.value = 0;
  isSearchActive.value = false;
  detailsPanelExpanded.value = false;
  sendMsg('clearSearchEvent');
});
watch(isPathLockStatus, () => {
  if (!isPathLockStatus.value && !searchQuery.value) {
    return;
  }
  searchQuery.value = '';
  searchResultCount.value = 0;
  currentResultIndex.value = 0;
  isSearchActive.value = false;
  searchedEvent.value = null;
  detailsPanelExpanded.value = false;
});
watch(isSwimGraphActive, () => {
  isThreeColumnHeader();
  if (isSwimGraphActive.value) {
    threeColumnSearchVisible.value = false;
  } else {
    threeColumnSearchVisible.value = true;
  }
});
watch(searchEl, () => {
  if (searchEl.value) {
    const inputEl = searchEl.value.$el.querySelector('.dp-category-search-toggle');
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isSearchActive.value) {
          navigateResults('next');
        }
      } else if (e.key === 'Escape') {
        resetsearchState();
      }
    }, true);
  }
});
const updateTheme = () => {
  backgroundColor.value = isDarkTheme.value ? `#606061` : `rgba(0, 0, 0, 0)`;
  document.documentElement.style.setProperty('--backgroundcolor', `${backgroundColor.value}`);
};
const sendMsg = (command, param) => {
  Promise.resolve().then(() => {
    window.ascEventBus.emit(command, param);
  });
};
const postMessage = (message) => {
  if (window.vscode) {
    window.vscode.postMessage({ command: 'showMessage', paramObj: { text: message } });
  }
};
onMounted(() => {
  updateTheme();
  document.addEventListener('click', handleClickOutsize, true);
  isThreeColumnHeader();
  zoomControl.value = isThreeColumn.value ? 'zoom-controls-three' : 'zoom-controls';
});

defineExpose({
  leftmove,
  rightmove,
  clearHeadState,
  closeDrawer,
  resetsearchState,
  scrollToEvent,
  scrollToEventByDom
})
</script>

<style lang="scss">
@import url("../css/swimGraph/Header/header.css");
.swim-search {
  height: 28px;
  width: 320px;
  .devui-search__icon {
    width: 20px !important;
    height: 20px !important;
    margin: 4px 4px 4px 8px;
  }

  &.devui-search:not(.devui-search--error):not(.devui-search--disabled):not(.devui-search--glow-style):hover .devui-input {
    border-color: var(--devui-select-hover-border-color);
  }

  &.devui-search.devui-search--focus .devui-input {
    border-color: var(--devui-select-active-border-color);
  }

  &.devui-search.devui-search--focus:not(.devui-search--error):not(.devui-search--disabled)::not(.devui-search--glow-style):hover .devui-input {
    border-color: var(--devui-select-active-border-color);
  }

  .devui-input {
    height: 28px !important;
    background: var(--devui-input-bg) !important;
    border-color: transparent;
    .devui-input__wrapper {
      background: none;

      input {
        margin-top: 3px;
        height: 20px;
        font-size: 13px;
        font-weight: 400;
        line-height: 20px;
      }
    }
  }
}

.cfg-button.devui-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background-color: var(--devui-secondary-button-bg);
  box-shadow: var(--devui-tips-shadow);
  cursor: pointer;
  .button-content {
    color: var(--devui-overlay-icon);
    top: 3px;
  }
  &.devui-button--outline--secondary:disabled {
    color: var(--devui-disabled-icon);
    border: var(--devui-secondary-button-border);
    background-color: var(--devui-secondary-button-disabled-bg);
    svg {
      path {
        stroke: var(--devui-disabled-icon) !important;
      }
    }
  }
}

#swimSlider .devui-slider__runway .devui-slider__bar {
  background-color: var(--devui-slider-bar);
}

#swimSlider .devui-slider__runway {
  background-color: var(--devui-slider-runway);
}

#swimSlider .devui-slider__runway .devui-slider__button {
  background-color: #CED1DB;
  border: none;
  margin-left: 0px  !important;
}
#swim-header-decrease{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 4px;
}
#swim-header-increase {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
<style scoped lang="scss">
:deep() {
  .swim-search.dp-category-search-container {
    height: 28px;
    border: 1px solid transparent;
    background: var(--devui-category-search-bg);
  }

  .swim-search.dp-category-search-container:focus-within {
    border: 1px solid var(--devui-select-active-border-color);
  }

  .swim-search.container-hover {
    border: 1px solid var(--devui-select-hover-border-color);
  }

  .swim-search.dp-category-search-container {
    .dp-category-search-extended-container {
      border-left-color: transparent;
      padding-left: 28px;
      .dp-category-search-icon {
        padding-right: 0px;
      }
    }

    .dp-category-search-line-container {
      height: 26px;
      .dp-category-search-toggle {
        height: 28px;
        font-size: 13px;
        &::placeholder {
          color: var(--devui-category-search-placeholder);
        }
      }
      &:hover {
        overflow-y: hidden;
      }
    }
  }
  .swim-search.dp-category-search-container .dp-category-search-line-container .dp-category-search-toggle { 
 	  min-width: auto; 
  } 
  .swim-search.dp-category-search-container .dp-category-search-line-container .dp-category-search-line .dp-category-search-input { 
    min-width: 100px; 
  }
  .swim-search.devui-button--solid--primary {
    background-color: var(--devui-primary-button-bg);

    &:hover {
      background-color: var(--devui-primary-button-hover-bg);
    }
  }

  .swim-search.devui-button--solid--secondary {
    background-color: var(--devui-secondary-button-bg);

    &:hover {
      background-color: var(--devui-secondary-button-hover-bg);
    }
  }

  .devui-select__selection {
  width: 120px;
  height: 28px;
  }
}

.first-child {
    :deep() {
      .devui-tabs__nav--pills > li {
        margin-left: 0px;
      }}}

.report-tabs {
    :deep() {
      .devui-tabs__nav--pills > li {
        margin-left: 24px;
      }
      .devui-tabs__nav--pills > li:first-child {
        margin-left: 0px !important
      }
      .devui-tabs__nav--tabs li.active:after, .devui-tabs__nav--pills li.active:after{
        background: var(--devui-primary-text);
      }
      .devui-tabs__nav--tabs  li.active a, .devui-tabs__nav--tabs li:hover:not(.disabled) a, 
      .devui-tabs__nav--pills li.active a, .devui-tabs__nav--pills li:hover:not(.disabled) a{
        color: var(--devui-primary-text);
      }
    }
  }
</style>