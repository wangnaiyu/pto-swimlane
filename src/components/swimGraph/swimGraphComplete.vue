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
  <div :style="{height: isThreeColumn ? '100%' : '100vh'}" class="swim-global-container">
    <div :class="['sticky-block', isSwimGraphActive ? 'visible' : 'hidden']">
      <div class="drag-icon-container">
        <DragIcon v-if="isThreeColumn" />
      </div>
      <swim-graph-header ref="swimgraphHeaderComponent" v-if="isThreeColumn"/>
    </div>
    <div :style="{display: 'flex',height: isSwimGraphActive ? 'calc(100% - 40px)' : '100%' }">
    <div class="container event-container"   
      :style="containerStyle">
      <Loading v-if="loading" :loadingText="loadingText" :warningText="warningText" />
      <div class="head-container" v-show="!loading">
        <div class="title" :style="{ width: layout.processLabelWidth + 'px' }" :class="{ 'title-threeColumn': isThreeColumn}">
          <div class="title_up_threecolum" v-show="isThreeColumn" id="swim-title_up_threecolum">
            <img class="title_pic_threecolum" :src="titlePath" alt="title-picture" />
            <div class="title_up_r_threecolum">
              <div class="title_up_threecolum_filename">
                <fileSelect v-if="isThreeColumn" :file-name="swimFileName" :file-paths="filePaths" />
                <div class="title_time">{{ formattedTime }}</div>
              </div>
            </div>
          </div>
          
          <div class="title_up" v-if="!isThreeColumn && !outPutPath">
            <img class="title_pic" :src="titlePath" alt="title-picture" />
            <div class="title_up_r">
              <div class="workflow-container">
                <d-tooltip :content="fileName + '.json'">
                  <div class="simple-file-name">{{ fileName }}.json</div>
                </d-tooltip>
              </div>
              <div class="title_time">{{ formattedTime }}</div>
            </div>
          </div>
          <div class="title_up" v-if="!isThreeColumn && !outPutPath"></div>
          <div class="title_down" v-if="!isThreeColumn && !outPutPath">
            <d-tooltip :content="$t('tips1')">
              <img class="title_icon1" :src="iconPath1" alt="iconPath1-picture" />
            </d-tooltip>
            <div class="dashed-line"></div>
            <d-tooltip :content="$t('tips2')">
              <img class="title_icon2" :src="iconPath2" alt="iconPath2-picture" @click="onJumpCom"/>
            </d-tooltip>
            <div class="dashed-line"></div>
            <div class="title_down3">
              <img class="title_icon3" :src="iconPath3" alt="iconPath3-picture" />
              <div class="title_name">{{ $t('swimGraph') }}</div>
            </div>
          </div>
        </div>
        <div class="right-header-content" style="width: calc(100% - 250px)">
          <!-- 按钮操作区 -->
          <swim-graph-header v-if="!isThreeColumn" ref="swimgraphHeaderComponent" />
          <div class="swimlane-container" :class="{ mr16: !isGuidePage }" ref="swimlaneContainer">
            <!-- 时间轴区域 -->
            <swim-graph-timeline ref="timelineComponent" />
          </div>
          <swim-graph-config ref="configComponent" />
          <swim-graph-shortCutKey-descrition ref="shortCutKeyDescritionComponent" />
        </div>
      </div>
      <!-- 置顶线程区域 -->
      <pinned-threads-container v-if="!isThreeColumn && pinnedThreadsList.length > 0" ref="pinnedthreadsComponent"/>
      <div class="main-view" v-show="!loading" ref="swimMainView">
        <!-- 度量蒙板 -->
        <div
            class="measure-mask"
            v-if="isMeasureModel || isMaxSchedule"
            @mousedown="measureMouseDown($event)"
            @mousemove="measureMouseMove($event)"
            @mouseup="measureMouseUp()"
            @mouseleave="measureMouseLeave($event)"
            @wheel="measureHandleWheel($event)"
          >
            <div class="measure-drag-area"></div>
        </div>
        <div id="main-swim" class="swimlane-container scroller-container swimlane-scroller-container" ref="swimlaneContainer" :style="containerStyles">
          <!-- 全局跨 process 连接线画布 -->
          <global-connection-canvas 
            v-if="!isE2ESwim"
            ref="globalConnectionCanvas"
            :container-width="containerWidth"
            :container-height="containerHeight"
          />
          <!-- 全局测距画布 -->
          <global-measure-canvas 
            ref="globalMeasureCanvas"
            :container-width="containerWidth"
            :container-height="containerHeight"
          />
          <!-- 进程和线程区域 -->
          <swim-graph-processes v-if="traceReady" ref="graphProcessesComponent" />
          <!-- 通路锁定场景下高亮节点dom -->
          <div v-if="pathLockedHighlightStyle.visible" class="path-locked-node-highlight" :style="{
              left: pathLockedHighlightStyle.left + 'px',
              top: pathLockedHighlightStyle.top + 'px',
              width: pathLockedHighlightStyle.width + 'px',
              height: pathLockedHighlightStyle.height + 'px',
              borderColor: pathLockedHighlightStyle.borderColor,
              backgroundColor: pathLockedHighlightStyle.backgroundColor,
              color: pathLockedHighlightStyle.fontColor,
            }">
              <span v-if="pathLockedHighlightStyle.text" class="highlight-text"
                :style="{ left: pathLockedHighlightStyle.textLeft + 'px' }">{{ pathLockedHighlightStyle.text }}</span>
          </div>
        </div>
        <swim-graph-measure-detail ref="measureDetailComponent" />
        <swim-graph-detail ref="detailComponent" />
        <aicpu-control-detail ref="aicpuControlDetailComponent" />
        <aicpu-schedule-detail ref="aicpuscheduleDetailComponent" />        
        <aicpu-core-detail ref="aicpuCoreDetailComponent" />
      </div>
    </div>
      <div 
        :style="{
        width: performanceWidth.value + 'px',
        height: '100%'
        }" 
        v-if="(!loadingComplete) && performanceVisible" >
        <Teleport to="body">
          <swim-graph-performance ref="swimGraphPerformacneComponent" v-if="performanceVisible"/>
        </Teleport>
      </div>
    </div>
    <div class="tooltip" ref="tooltip" :style="tooltipStyle"></div>
    <div class="linetooltip" ref="lineTooltip" :style="lineTooltipStyle"></div>
    <div 
      v-if="pinnedMeasureInfo.show"
      class="pinned-measure-info"
      :style="{
        left: pinnedMeasureInfo.x + 'px',
        top: pinnedMeasureInfo.y + 'px',
      }"
    >
      {{ pinnedMeasureInfo.text }}
    </div>
  </div>
  <global-message></global-message>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch, nextTick, provide, inject, toRef, toRaw } from 'vue';
import { useI18n } from 'vue-i18n';
import SwimGraphHeader from './swimGraphHeader/swimGraphHeader.vue';
import SwimGraphTimeline from './swimGraphTimeline/swimGraphTimeline.vue';
import SwimGraphProcesses from './swimGraphProcesses/swimGraphProcesses.vue';
import SwimGraphDetail from './swimGraphDetail/swimGraphDetail.vue';
import SwimGraphMeasureDetail from './swimGrapMeasurehDetail/swimGraphMeasureDetail.vue';
import SwimGraphConfig from './swimGraphConfig/swimGraphConfig.vue';
import SwimGraphShortCutKeyDescrition from './swimGraphShortCutKeyDescripiton/swimGraphShortCutKeyDescripiton.vue';
import swimGraphPerformance from './swimGraphPerformance/swimGraphPerformance.vue';
import aicpuControlDetail from './swimGraphAicpuDetail/aicpuControlDetail.vue';
import aicpuScheduleDetail from './swimGraphAicpuDetail/aicpuScheduleDetail.vue';
import globalMessage from './globalMessage.vue';
import aicpuCoreDetail from './swimGraphAicpuDetail/aicpuCoreDetail.vue';
import PinnedThreadsContainer from './swimGraphPinnedThreads/PinnedThreadsContainer.vue';
import { usePinnedThreads } from './swimGraphPinnedThreads/usePinnedThreads';
import GlobalConnectionCanvas from './swimGraphProcesses/GlobalConnectionCanvas.vue';
import GlobalMeasureCanvas from './swimGraphProcesses/GlobalMeasureCanvas.vue';
import { swimDataManager } from './swimData';
import { getQuery } from '@/core/query';
import { getTextWidth } from '../../utils';
import {
  threadCache,
  calculateGridInterval,
  ctxs,
  TimelineWithUnit,
  formatTimeWithUnit,
  devicePixelRatio,
  setDevicePixelRatio,
  updateProcessSize,
  processTimeInfo,
  getCanvasCSSHeight,
  getCanvasCSSWidth,
  getDevicePixelRatio,
  COLOR_CFG,
  SNAP_THRESHOLD,
  NARROW_WIDTH_THRESHOLD,
  findSchedTaskByNo,
  findBuildTaskByNo,
  clearWholeProcess,
  findSchedGraphMap,
  findSchedCoreMapByNo,
  findSchedCoreEventsByNo,
  findSchedMapByNo,
  findSchedEventsByNo,
  findCoreMapByNo,
  findCoreEventsByNo,
  parseSuffixNumbers,
  collectSubEventDependencyPathNodes,
  calculateHighlightedPaths,
  calculateMixMacroPaths,
  parseCompressedData,
  hashMatchDataGet,
  drawMeasureArrow,
} from './swimGraphUtils';
import { ARROW_WIDTH } from './swimGraphProcesses/render/eventRender';
import { SliceMipmap, CounterMipmap } from './swimGraphProcesses/render/mipmapRender';
import Loading from '../comGraph/loading.vue';
import { throttle } from 'lodash-es';
import { ThreeColumnProvideKey, SwimGraphStateKey } from '../threeColumn/types';
import DragIcon from '../threeColumn/drag-icon.vue';
import fileSelect from '../threeColumn/file-select.vue';
import { useViewServer } from '../../core/use-view-server';
import { pushState, pullState } from '../../core/state';
import { swimConfig } from '../welcome/guideStepsConfig';
import { intelligentSearchHelper } from './swimGrapMeasurehDetail/helper';
import { globalKeyEvent } from './eventHandler';
import { getKernalEventColor } from './swimGraphProcesses/render/utils';
import { getPositionByTime, getWidthByDuration } from './swimGraphProcesses/processInfo';
import { eventTextSize, getFontStyle, getThreadStartY, getThreadHeight, drawDependencyHighlightEvent } from './swimGraphUtils';
import { perfLogger, setDebugMode, setTotalStartTime, setTransformTime, isDebugEnabled } from './perfLogger';

const { server } = useViewServer();

const swimGraphPerformacneComponent = ref(null);

const props = defineProps({
  isThreeColumn: {
    type: Boolean,
    default: false,
  },
  swimFileName: {
    type: String,
    default: ''
  },
  filePaths: {type: Object, default: {}}
});

const { isDarkTheme } = inject('root');
const threeColumnCtx = inject(ThreeColumnProvideKey, undefined);
const { t: $t } = useI18n();
const titlePath = ref(`${window.staticPath}/static-assets/title_40px.svg`);
const iconPath1 = ref(`${window.staticPath}/static-assets/icon_title_1.svg`);
const iconPath2 = ref(`${window.staticPath}/static-assets/icon_title_2.svg`);
let iconPath3 = ref(`${window.staticPath}/static-assets/icon_title_3.svg`);
let down_16px = ref(`${window.staticPath}/static-assets/down_16px.svg`);
const {
  isSwimFullscreen = ref(false),
  currentActiveBlock = ref(''),
  BlockToGraphMap = {},
  onToggleSwimFullscreen = () => {},
} = inject(ThreeColumnProvideKey, {});
// 响应式状态
const swimlaneContainer = ref(null);
const timelineComponent = ref(null);
const swimMainView = ref(null);
const detailComponent = ref(null);
const measureDetailComponent = ref(null);
const graphProcessesComponent = ref(null);
const swimgraphHeaderComponent = ref(null);
const aicpuCoreDetailComponent = ref(null);
const globalConnectionCanvas = ref(null); 
const globalMeasureCanvas = ref(null);
const configComponent = ref(null);
const shortCutKeyDescritionComponent = ref(null);
const pinnedthreadsComponent = ref(null);
const timeLineX = ref(null);
const traceData = ref(null);
const tsScale = ref(1000);
const minTs = ref(0);
const counterEvents = ref([]);
const lastSelected = ref(null);
const selectedEvent = ref(null);
const canvasclickedEvent = ref(null);
const pathLockedEvent = ref(null);
const isPathLockStatus = ref(false);
const highlightedPaths = reactive(new Set());
const mixRelatedPaths = reactive(new Set());
let depLinesTimer = null;
const processExpanded = reactive(new Map());
const loading = ref(false);
const traceReady = ref(false);
const loadingComplete = ref(true);
const loadingText = ref($t('loadTraceData'));
const warningText = ref('');
const detailsPanelExpanded = ref(false);
const detailsCoresExpanded = ref(false);
const tooltip = ref(null);
const lineTooltip = ref(null);
const tooltipStyle = reactive({ display: 'none', left: '0px', top: '0px' });
const lineTooltipStyle = reactive({ display: 'none', left: '0px', top: '0px' });
const pinnedMeasureInfo = reactive({ show: false, x: 0, y: 0, text: '' });
const isMixMode = ref(true);
const isFromPerformanceClick = ref(false);
const isFromPerformancePmuTabClick = ref(false);
const bindFile = ref(false);
const bindButton = ref($t('bindComGraphJson'));
const isSwimGraphActive = ref(false);
const fileName = ref('');
const modeOption = ref('');
const hashOrderRending = ref('');
const isCfgEditing = ref(false);
const isShortcutKeyShow = ref(false);
const isAicpu = ref(false);
const isPerfSwim = ref(false);
const isMsProf = ref(false);
const hasSplitThreads = ref(false);
const aicpuControlDetailsExpanded = ref(false);
const aicpuScheduleDetailsExpanded = ref(false);
const aicpuCoreDetailsExpanded = ref(false);
const scheduleList = ref([]);
const aicpuBuildTask = ref();
const aicpuSchedTask = ref('');
const aicpuHasRelevent = ref(false);

const isE2ESwim = ref(false);
const isDeviceView = ref(false);
const isGuidePage = ref(false);

const isMeasureModel = ref(false);
const isMeasureDragging = ref(false);
const showDragAreaBorders = ref(false);
const measureDragStartX = ref(0);
const measureDragEndX = ref(0);
const measureDragStartTime = ref(0);
const measureDragEndTime = ref(0);
const measureDragStartY = ref(0);
const measureDragEndY = ref(0);
const measureDragHeight = ref(0);
const measureDragCtrl = ref(false);
const measureDragCtrlX = ref(0);
const mulDetailsExpanded = ref(false);

let globalMousePosition = { x: 0, y: 0 };
const measureDetailsExpanded = ref(false);
const measureDetailsData = ref([]);
const rootHashes = ref([]);
const leafHashes = ref([]);
const leafHashMap = ref(new Map());
const deviceDataMap = ref(new Map());
let isLockStatus = ref(false);
const labelRender = ref(false);
const dependencyLinesInfo = ref([]);
const outPutPath = ref();
const aicpuScheduleEventMaps = ref([]);
const aicpuScheduleMaps = ref(new Map());
const globalDependencyLinesInfo = ref([]);
const draggingSelection = ref(null);
const draggingSelectionProcessKey = ref(null);

let sliderValue = ref(0);
const sliderMax = ref(100);
const sliderMaxCount = ref(100);
const initialScale = ref(1);
const isMaxSchedule = ref(false);
let startEventId;
let endEventId;
const kernelThreadData = ref(new Map());
const freezeVisibleRange = ref(false);
let _frozenStartTime = 0;
let _frozenEndTime = 0;
const focusedWrapId = ref(null); 
const pathLockedWrapId = ref(null);
const viewState = reactive({
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  minTime: 0,
  maxTime: 0,
  timeRange: 0,
  canvasCssWidth: 0,
  canvasWidth: 0,
  clearInfo: {},
  windowWidth: window.innerWidth,
  depMode: 'all',
  scaleChange: 1,
  pixelOffsetX: 0,
  pixelScale: devicePixelRatio,
  offsetXChange: 0,
  minWidth: 1,
});

const layout = reactive({
  processLabelWidth: 250,
  eventHeight: 16,
  processHeaderHeight: 30,
  threadHeight: 24,
  counterHeight: 24,
  eventMargin: 2,
  processMargin: 5,
  marginRight: 10,
});

const timelineState = reactive({
  startTime: 0,
  endTime: 0,
  startTimeX: 0,
  endTimeX: 0,
  isInLeftTag: false,
  isInRightTag: false,
  isOnTag: false,
  isOutTag: false,
  startTimeDecimal: 0,
  endTimeDecimal: 0,
});
const pathLockedHighlightStyle = reactive({
  visible: false,
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  borderColor: '',
  backgroundColor: '',
  fontColor: '',
  text: '',
  textLeft: 0,
});
let pathLockedHighlightEvent = ref(null);
let pathLockedHighlightProcessKey = ref('');
const formattedTime = computed(() => {
  let date = new Date();
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let day = String(date.getDate()).padStart(2, '0');
  let hours = String(date.getHours()).padStart(2, '0');
  let minutes = String(date.getMinutes()).padStart(2, '0');
  let seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
});

const lane2line = reactive(new Map());
const userConfig = reactive(new Map());

const childContextMap = {};
const addChildContext = (childName, ctx) => {
  childContextMap[childName] = ctx;
};

const searchResult = ref([]);
const currentResultIndex = ref(0);
const isSearchActive = ref(false);
const searchedEvent = ref(null);
const dependencyHighlightEvent = ref(null);
const searchQuery = ref('');
const isCaseSensitive = ref(false);

const pmuTotal = ref({});
const pmuValid = ref(false);
const timeInfo = ref({});

const performanceVisible = ref(false);
const performanceWidth = ref(480);
const emit = defineEmits(['update-shared-swim-data']);
const isWideScreen = ref(true);
const screenWidth = ref(window.innerWidth);

if (screenWidth.value < 1500) {
  isWideScreen.value = false;
}

if (isWideScreen.value) {
  performanceWidth.value = 480;
} else {
  performanceWidth.value = 370;
}

watch(performanceWidth, async (newValue) => {
  await nextTick();
  doResizeRender();
});
watch(performanceVisible, async (newValue) => {
  emit('update-shared-swim-data', {
    performanceWidth,
    performanceVisible
  });
  if (newValue) {
    await nextTick();
    doResizeRender();
  }
});
const containerStyle = computed(() => ({
  width: performanceVisible.value && !props.isThreeColumn ? `calc(100% - ${performanceWidth.value}px)` : '100%',
}));

// 使用置顶线程 composable
const { pinnedThreads, pinnedThreadsList, pinThread, unpinThread, restorePinnedState, recalculateOffsetY, clearAllPinned } = usePinnedThreads(
  lane2line,
  layout
);

const handleGlobalMouseMove = (e) => {
  globalMousePosition = { x: e.clientX, y: e.clientY };
};

const handleGlobalKeyDown = (e) => { globalKeyEvent(e, globalMousePosition, layout, 'keydown') };

const handleGlobalKeyUp = (e) => { globalKeyEvent(e, globalMousePosition, layout, 'keyup') };

const initEventListeners = () => {
  window.addEventListener('mousemove', handleGlobalMouseMove);
  window.addEventListener('keydown', handleGlobalKeyDown);
  window.addEventListener('keyup', handleGlobalKeyUp);
  if (swimlaneContainer.value) {
    swimlaneContainer.value.addEventListener('scroll', onVerticalScroll);
  }
};

function generateErrorMsg(msg) {
  return { msg };
}

function setupSwimWatchers() {
  watch(server.bindResult, (newValue) => {
    if (newValue.success) {
      bindFile.value = newValue.comGraphPath;
      bindButton.value = $t('unbindComGraph');
    } else {
      bindFile.value = false;
      bindButton.value = $t('bindComGraphJson');
    }
  });
  watch(server.unbindResult, (newValue) => {
    if (newValue.success) {
      bindFile.value = false;
      bindButton.value = $t('bindComGraphJson');
    } else {
      bindFile.value = newValue.comGraphPath;
      bindButton.value = $t('unbindComGraph');
    }
  });
  watch(server.noSwimFile, (newValue) => {
    const errorMsg = generateErrorMsg(`${ERROR_MESSAGES.FILE_NOT_FOUND}`);
    errorMsg.log = newValue.errMsg;
    window.ascEventBus.emit('jsonParseError', errorMsg);
  });
  watch(server.dataError, (newValue) => {
    window.ascEventBus.emit('jsonParseError', newValue);
  });
  watch(server.performanceWarn, (newValue) => {
    warningText.value = newValue;
  });
}

let ERROR_MESSAGES = {
  INVALID_FILE: $t('swimErroMsgINVALID_FILE'),
  MISSING_EVENT_FIELDS: $t('swimErroMsgMISSING_EVENT_FIELDS'),
  MISSING_END_EVENT: $t('swimErroMsgMISSING_END_EVENT'),
  MISSING_DUR: $t('swimErroMsgMISSING_DUR'),
  INVALID_ARGS: $t('swimErroMsgINVALID_ARGS'),
  MISSING_PROCESS_NAME: $t('swimErroMsgMISSING_PROCESS_NAME'),
  MISSING_THREADS_FIELDS: $t('swimErroMsgMISSING_THREADS_FIELDS'),
  NO_THREADS: $t('swimErroMsgNO_THREADS'),
  NO_PROCESS_NAME: $t('swimErroMsgNO_PROCESS_NAME'),
  FILE_NOT_FOUND: $t('swimErroMsgFILE_NOT_FOUND'),
  NOT_JSON: $t('swimErroMsgNot_JSON'),
};

window.ascEventBus.on('threeColumnSizeChange', () => {
  scheduleResizeRender();
});

const validData = (dataStr) => {
  let data = {};
  try {
    data = JSON.parse(dataStr);
  } catch (error) {
    window.ascEventBus.emit('jsonParseError', generateErrorMsg(`${ERROR_MESSAGES.NOT_JSON}`));
    return;
  }
  if (!data || !data.traceEvents || !Array.isArray(data.traceEvents)) {
    window.ascEventBus.emit('jsonParseError', generateErrorMsg(`${ERROR_MESSAGES.INVALID_FILE}`));
    return;
  }

  let hasProcessName = false;
  let countThread = 0;

  const eventMap = new Map();
  data.traceEvents.forEach((event) => {
    const key = `${event.name}-${event.id}`;
    if (!eventMap.has(key)) {
      eventMap.set(key, []);
    }
    eventMap.get(key).push(event);
  });

  data.traceEvents.forEach((event) => {
    if (
      ['B', 'E', 'X'].includes(event.ph) &&
      (!event.name || typeof event.pid === 'undefined' || typeof event.tid === 'undefined' || typeof event.ts === 'undefined')
    ) {
      window.ascEventBus.emit('jsonParseError', generateErrorMsg(`${ERROR_MESSAGES.MISSING_EVENT_FIELDS}: ["${event.name || event.id}"]`));
    }

    if (event.ph === 'B') {
      const key = `${event.name}-${event.id}`;
      const endEvent = eventMap.get(key) || [];
      const hasE = endEvent.some((e) => e.ph === 'E');
      if (!hasE) {
        window.ascEventBus.emit('jsonParseError', generateErrorMsg(`${ERROR_MESSAGES.MISSING_END_EVENT}: ["${event.name}"]`));
      }
    } else if (event.ph === 'X') {
      if (!event.dur) {
        window.ascEventBus.emit('jsonParseError', generateErrorMsg(`${ERROR_MESSAGES.MISSING_DUR}: ["${event.name}"]`));
      }
    } else if (event.ph === 'C') {
      if (!event.args || (typeof event.args.size !== 'number' && typeof event.args['/byte'] !== 'number')) {
        window.ascEventBus.emit('jsonParseError', generateErrorMsg(`${ERROR_MESSAGES.INVALID_ARGS}: ["${event.name}"]`));
      }
    }

    if (event.name === 'process_name') {
      hasProcessName = true;
      if (typeof event.pid === 'undefined' || !event.args || !event.args.name) {
        window.ascEventBus.emit('jsonParseError', generateErrorMsg(`${ERROR_MESSAGES.MISSING_PROCESS_NAME}: ["${event.args.name}"]`));
      }
    }

    if (event.name.includes('thread')) {
      countThread += 1;
      if (typeof event.pid === 'undefined' || typeof event.tid === 'undefined' || !event.args || !event.args.name) {
        window.ascEventBus.emit('jsonParseError', generateErrorMsg(`${ERROR_MESSAGES.MISSING_THREADS_FIELDS}: ["${event.args.name}"]`));
      }
    }
  });

  if (countThread === 0) {
    window.ascEventBus.emit('jsonParseError', generateErrorMsg(ERROR_MESSAGES.NO_THREADS));
  }

  if (!hasProcessName) {
    window.ascEventBus.emit('jsonParseError', generateErrorMsg(ERROR_MESSAGES.NO_PROCESS_NAME));
  }
};

const loadTraceData = (data, locateTarget) => {
  try {
    processTraceData(data, locateTarget);
    loading.value = false;
    loadingComplete.value = false;
  } catch (error) {
    console.error($t('loadTraceDataError'), error);
    loading.value = true;
    loadingComplete.value = true;
  }
};

const extractNamePrefix = (name) => {
  if (!name) {
    return '';
  }
  const leftParenIndex = name.indexOf('(');
  if (leftParenIndex !== -1) {
    return name.substring(0, leftParenIndex);
  }
  return name;
};

const calculateEventLines = (events) => {
  if (!events || events.length === 0) {
    return { events, lineCount: 0 };
  }
  
  const lines = [];
  
  for (const event of events) {
    event.renderStartTime = event.startTime;
    event.renderEndTime = event.endTime;
    event.renderDuration = event.duration || (event.endTime - event.startTime);
    
    let placed = false;
    const isZeroDuration = event.renderDuration === 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (isZeroDuration && event.startTime === lines[i]) {
        continue;
      }
      if (event.startTime >= lines[i]) {
        event.line = i;
        lines[i] = event.endTime;
        placed = true;
        break;
      }
    }
    
    if (!placed) {
      event.line = lines.length;
      lines.push(event.endTime);
    }
  }
  
  return { events, lineCount: lines.length };
};
const sortThreadsMap = (threadsMap) => {
    const parseThreadName = (threadName) => {
      const aicMatch = threadName.match(/^Group(\d+)-aic$/i);
      if (aicMatch) {
        return { type: 'aic', group: parseInt(aicMatch[1], 10), index: 0 };
      }
      const aivMatch = threadName.match(/^Group(\d+)-aiv(\d+)$/i);
      if (aivMatch) {
        return { type: 'aiv', group: parseInt(aivMatch[1], 10), index: parseInt(aivMatch[2], 10) };
      }
      return null;
    };
    const entries = Array.from(threadsMap.entries());
    const sortedEntries = entries.sort((a, b) => {
      const nameA = a[1].parentThreadName || a[1].threadName;
      const nameB = b[1].parentThreadName || b[1].threadName;
      const parsedA = parseThreadName(nameA);
      const parsedB = parseThreadName(nameB);
      if (!parsedA || !parsedB) {
        return 0;
      }
      if (parsedA.type !== parsedB.type) {
        const result = parsedA.type === 'aic' ? -1 : 1;
        return result;
      }
      if (parsedA.group !== parsedB.group) {
        const result = parsedA.group - parsedB.group;
        return result;
      }
      const result = parsedA.index - parsedB.index;
      return result;
    });
    return new Map(sortedEntries);
  };
 
const splitThreadsByEventName = (process, processKey) => {
  const newThreads = new Map();
  hasSplitThreads.value = true;
  
  const usedTids = new Set();
  for (const thread of process.threads.values()) {
    usedTids.add(Number(thread.tid));
  }
  
  const tidArray = Array.from(usedTids.values());
  const maxTid = tidArray.length > 0 ? Math.max(...tidArray) : 0;
  let nextTid = maxTid + 1;
  
  for (const [threadKey, thread] of process.threads) {
    const eventGroups = new Map();
    
    for (const event of thread.events) {
      const namePrefix = extractNamePrefix(event.name);
      if (!eventGroups.has(namePrefix)) {
        eventGroups.set(namePrefix, []);
      }
      eventGroups.get(namePrefix).push(event);
    }
    
    const originalThreadName = thread.threadName;
    const originalTid = thread.tid;
    
    for (const [namePrefix, events] of eventGroups) {
      while (usedTids.has(nextTid)) {
        nextTid++;
      }
      
      const { events: reorderedEvents, lineCount } = calculateEventLines(events);
      
      const newThread = {
        ...thread,
        threadName: namePrefix,
        tid: nextTid,
        events: reorderedEvents,
        parentThreadName: originalThreadName,
        parentTid: originalTid,
      };
      
      newThreads.set(String(newThread.tid), newThread);
      lane2line.set(`${processKey}@${nextTid}`, lineCount);
      usedTids.add(nextTid);
      nextTid++;
    }
  }
  
  process.threads = sortThreadsMap(newThreads);
};

const processTraceData = (data, locateTarget) => {
  traceReady.value = false;
  threadCache.clear();
  initBasicTraceInfo(data);
  prepareProcesses(data);
  handleMsProfSplit(data);
  initSwimDataManager(data);
  processExtraData(data);
  initViewStateFromTimeInfo();
  buildThreadMipmapsAndCheckAicpu();
  swimDataManager.splitAllEvents();
  finalizeE2EStatus();
  handleMixModeLayout();
  traceReady.value = true;
  scheduleRender(locateTarget);
};

const initBasicTraceInfo = (data) => {
  pmuTotal.value = data.pmu_total;
  pmuValid.value = data.pmuValid || false;
  timeInfo.value = data.timeInfo;
};

const prepareProcesses = (data) => {
  let isFirst = true;
  let firstExpanded = true;
  for (const key in data.processes) {
    if (!Object.prototype.hasOwnProperty.call(data.processes, key)) {
      continue;
    }
    if (props.isThreeColumn && data.processes[key].type === 'aicpu') {
      delete data.processes[key];
      continue;
    }
    if (firstExpanded) {
      processExpanded.set(key, true);
      firstExpanded = false;
    }
    data.processes[key].isRendered = isFirst;
    isFirst = false;
    data.processes[key].threads = new Map(Object.entries(data.processes[key].threads));
  }
};

const handleMsProfSplit = (data) => {
  if (!isMsProf.value) {
    return;
  }
  for (const key in data.processes) {
    if (Object.prototype.hasOwnProperty.call(data.processes, key)) {
      if (data.processes[key].processName === 'Biu Perf') {
        splitThreadsByEventName(data.processes[key], key);
      }
    }
  }
};

const initSwimDataManager = (data) => {
  perfLogger.time('swimDataManager.initializeFromData');
  swimDataManager.initializeFromData(
    data,
    processExpanded,
    lane2line,
    isPerfSwim.value,
    props.isThreeColumn
  );
  perfLogger.timeEnd('swimDataManager.initializeFromData');
};

const processExtraData = (data) => {
  if (props.isThreeColumn) {
    processTimeInfo(timeInfo, data);
  }
  if (data.tsScale) {
    tsScale.value = data.tsScale;
  }
  if (data.minTs) {
    minTs.value = data.minTs;
  }
  counterEvents.value = data.counterEvents;
};

const initViewStateFromTimeInfo = () => {
  if (!timeInfo.value) {
    return;
  }
  viewState.minTime = timeInfo.value.minTime;
  viewState.maxTime = timeInfo.value.maxTime;
  viewState.timeRange = viewState.maxTime - viewState.minTime;
};

const buildThreadMipmapsAndCheckAicpu = () => {
  let allAicpu = true;
  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    if (process.type !== 'aicpu') {
      allAicpu = false;
    }
    for (const [threadKey, threadData] of process.threads.entries()) {
      if (!threadData.eventIds || threadData.eventIds.length === 0) {
        continue;
      }
      buildSingleThreadMipmap(threadData, processKey, threadKey);
    }
  }
  isAicpu.value = allAicpu;
};

const buildSingleThreadMipmap = (threadData, processKey, threadKey) => {
  const events = swimDataManager.getEventsByIds(threadData.eventIds);
  if (!threadData.isCounter) {
    threadData._maxRenderDuration = events.reduce(
      (max, e) => Math.max(max, (e.renderEndTime || e.endTime) - (e.renderStartTime || e.startTime)), 0
    );
    threadData._sliceMipmap = new SliceMipmap(events);
  } else {
    threadData._counterMipmap = new CounterMipmap(events, threadData.argKey);
  }
};

const finalizeE2EStatus = () => {
  isE2ESwim.value = swimDataManager.isMixedData();
  isDeviceView.value = swimDataManager.isDeviceView();
  if (props.isThreeColumn) {
    isE2ESwim.value = false;
  }
};

const handleMixModeLayout = () => {
  if (!swimDataManager.hasMixConfig()) {
    return;
  }
  swimDataManager.setMixMode(true);
  swimDataManager.calculateMixLayout(layout, lane2line);

  const mixLaneOrder = swimDataManager.getSwimLaneOrder();
  for (const lane of mixLaneOrder) {
    if (lane.type !== 'thread') {
      continue;
    }
    const { thread, wrapIds } = lane;
    if (wrapIds.length > 0 && !thread.isCounter) {
      const flattenedEvents = swimDataManager.getMixThreadFlattenedEvents(thread);
      if (flattenedEvents.length > 0) {
        thread._maxRenderDuration = flattenedEvents.reduce(
          (max, e) => Math.max(max, (e.renderEndTime || e.endTime) - (e.renderStartTime || e.startTime)), 0
        );
        thread._mixSliceMipmap = new SliceMipmap(flattenedEvents);
      }
    }
  }
};

const scheduleRender = (locateTarget) => {
  nextTick(() => {
    initCanvases();
    resizeCanvases();
    render();
    // 恢复置顶状态
    restorePinnedState();
    initResizeObserver();
    if (locateTarget) {
      nextTick(() => {
        locateEventBySeqNoTaskId(locateTarget.seqNo, locateTarget.taskId);
      });
    }
  });
};

const transformCanvasOnly = () => {
  renderTwoTimeline();
  for (const [processKey, ctxInfo] of Object.entries(ctxs)) {
    for (const [ctxKey, ctx] of Object.entries(ctxInfo)) {
      ctx.save();
      ctx.setTransform(viewState.pixelScale, 0, 0, getDevicePixelRatio(), viewState.pixelOffsetX, 0);
    }
  }
};

const exportRender = () => {
  transformCanvasOnly();
  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    if (processExpanded.get(processKey)) {
      childContextMap.threadEvent.transformEvents(process, processKey, true);
      const ctx = ctxs[processKey].eventCtx;
      childContextMap.threadEvent.renderProcessText(process, ctx, processKey, false, true);
    }
  }
  if (pinnedthreadsComponent && pinnedthreadsComponent.value) {
    pinnedthreadsComponent.value.Pinnedtransform();
  }
  timelineComponent.value.flagRender();
};

const updateEventPosition = (event) => {
  if (!event.renderInfo || !freezeVisibleRange.value) { return };
  const range = viewState.maxTime - viewState.minTime;
  const newX = (((event.renderStartTime || event.startTime) - viewState.minTime) / range) * viewState.canvasCssWidth;
  const dur = event.renderDuration || event.duration || (event.endTime - event.startTime);
  const newW = dur / range * viewState.canvasCssWidth;
  event.renderInfo.x = newX;
  event.renderInfo.width = newW;
  if (event.drawData) {
    event.drawData.rectX = newX;
    event.drawData.eventWidth = newW;
    event.drawData.width = newW;
  }
};

const transform = (needClean=false) => {
  perfLogger.time('time of transform');
  transformCanvasOnly();
  const isFrozen = freezeVisibleRange.value;
  if (isFrozen) {
    if (_frozenStartTime === 0 || _frozenEndTime === 0) {
      _frozenStartTime = timelineState.startTime;
      _frozenEndTime = timelineState.endTime;
    }
    timelineState.startTime = _frozenStartTime;
    timelineState.endTime = _frozenEndTime;
  } else {
    _frozenStartTime = timelineState.startTime;
    _frozenEndTime = timelineState.endTime;
  }
  if (globalMeasureCanvas.value) {
    globalMeasureCanvas.value.clearMeasure();
  }
  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    if (processExpanded.get(processKey)) {
      childContextMap.threadEvent.transformEvents(process, processKey);
      const ctx = ctxs[processKey].eventCtx;
      childContextMap.threadEvent.renderProcessText(process, ctx, processKey);
    }
  }
  if (pinnedthreadsComponent && pinnedthreadsComponent.value) {
    pinnedthreadsComponent.value.Pinnedtransform();
  }
  if (needClean) {
    return;
  }
  clearTimeout(depLinesTimer);
  depLinesTimer = setTimeout(() => {
    if (freezeVisibleRange.value) {
      if (globalConnectionCanvas.value) {
        globalConnectionCanvas.value.clearCanvas();
      }
    } else {
      renderDependencyLines();
      drawDependencyHighlightEvent(dependencyHighlightEvent.value, processExpanded, globalConnectionCanvas.value, { updateEventPosition, highlightEvent: childContextMap.threadEvent.highlightEvent });
      for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
        const shouldHighlightAicpu = processExpanded.get(processKey) && selectedEvent.value && (process.type === 'aicpu' || selectedEvent.value.originalThreadName);
        if (shouldHighlightAicpu) {
          highlightAicpu(process, processKey, true);
        }
      }
    }
  }, 50);

  if (globalConnectionCanvas.value) {
    globalConnectionCanvas.value.clearCanvas();
  }

  for (const [key] of swimDataManager.getAllProcesses().entries()) {
    if (processExpanded.get(key)) {
      childContextMap.threadEvent.clearDependencyLines(key);
    }
  }

  const depKey = selectedEvent.value?.pid?.toString();
  if (depKey && processExpanded.get(depKey) && selectedEvent.value) {
    const depCanvas = document.querySelector(`[data-dep-process-key="${depKey}"]`);
    if (depCanvas) {
      const depCtx = depCanvas.getContext('2d');
      depCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      depCtx.clearRect(0, 0, depCanvas.width / devicePixelRatio, depCanvas.height / devicePixelRatio);
      updateEventPosition(selectedEvent.value);
      childContextMap.threadEvent.highlightEvent(depCtx, selectedEvent.value, depKey, true);
    }
  }
  drawDependencyHighlightEvent(dependencyHighlightEvent.value, processExpanded, globalConnectionCanvas.value, { updateEventPosition, highlightEvent: childContextMap.threadEvent.highlightEvent });
  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    const shouldHighlightAicpu = processExpanded.get(processKey) && selectedEvent.value && (process.type === 'aicpu' || selectedEvent.value.originalThreadName);
    if (shouldHighlightAicpu) {
      highlightAicpu(process, processKey, true);
    }
  }
  if (isPathLockStatus.value && canvasclickedEvent.value) {
    const event = canvasclickedEvent.value;
    const processKey = event.pid?.toString();
    if (processKey && processExpanded.get(processKey)) {
      childContextMap.threadEvent.updatePathLockedHighlightOnTransform();
    }
  }
  drawMeasureTime();
  timelineComponent.value.flagRender();
  if (props.isThreeColumn) {
    childContextMap.threadEvent.resizeDrawBoundary();
    childContextMap.threadEvent.toggleLock();
  }
  if (mulDetailsExpanded.value && !isMeasureModel.value) {
    childContextMap.threadEvent.drawSelectionBox();
    childContextMap.threadEvent.drawSelectionHightlight();
  }
  perfLogger.timeEnd('time of transform');
};

const renderTwoTimeline = () => {
  renderFixedTimeline();
  renderTimeline();
};

const renderEvent = () => {
  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    childContextMap.threadEvent.renderProcessEvents(process, processKey);
    const ctx = ctxs[processKey].eventCtx;
    if (processExpanded.get(processKey)) {
      childContextMap.threadEvent.renderProcessText(process, ctx, processKey);
    }
  }
};

const renderDependencyLines = (processKey) => {
  if (!processKey && !selectedEvent.value && !searchedEvent.value) {
    if (globalConnectionCanvas.value) {
      globalConnectionCanvas.value.clearCanvas();
    }
    return;
  }
  const mode = viewState.depMode;
  let key = processKey || selectedEvent.value?.pid?.toString() || searchedEvent.value?.pid?.toString();
  if (isPathLockStatus.value) {
    key = pathLockedEvent.value?.pid?.toString();
  }
  if (key) {
    const process = swimDataManager.getProcess(key);
    if (!globalConnectionCanvas.value) {
      if (isMaxSchedule.value) {
        childContextMap.threadEvent.drawMaxScheduleLine(startEventId, endEventId, process, key);
      } else {
        childContextMap.threadEvent.drawDependencyLines(process, key, mode);
      }
    } else {
      if (isMaxSchedule.value) {
        globalConnectionCanvas.value.drawMaxScheduleLine(startEventId, endEventId);
      } else {
        if (isMixMode?.value) {
          globalConnectionCanvas.value.drawMacroDependencyLines();
        } else {
          globalConnectionCanvas.value.drawGlobalConnectionLines();
        }
      }
    }
  }
};

const clearDependencyLines = (processKey) => {
  if (globalConnectionCanvas.value) {
    globalConnectionCanvas.value.clearCanvas();
  }
  childContextMap.threadEvent.clearDependencyLines(processKey);
};
const getAicpuDependencyCanvas = (processKey) => {
  const dependencyCanvasRef = document.querySelector(`[data-dep-process-key="${processKey}"]`);
  if (!dependencyCanvasRef) { return false };
  const dependencyCtx = dependencyCanvasRef.getContext('2d');
  clearWholeProcess(dependencyCtx, viewState, processKey);
  return dependencyCtx;
};
const guideRestore = async () => {
  timelineComponent.value.clearFlagCanvas(true);
  timelineComponent.value.toggleEditModel();
  await swimgraphHeaderComponent?.value.clearHeadState();
  detailComponent?.value.resetReleventState();
  resetState();
  transform(true);
  mulDetailsExpanded.value = false;
  swimlaneContainer.value.scrollTo({ top: 0, behavior: 'smooth' });
  isMeasureDragging.value = false;
  isMeasureModel.value = false;
  showDragAreaBorders.value = false;
};

const render = () => {
  perfLogger.time('render');
  resetState();
  renderTwoTimeline();
  renderEvent();
  renderDependencyLines();
  if (detailsPanelExpanded.value) {
    const event = isPathLockStatus.value ? canvasclickedEvent.value : selectedEvent.value;
    detailComponent?.value.showDependencies(event, 'both');
  }
  timelineComponent.value.flagRender();
  if (props.isThreeColumn) {
    childContextMap.threadEvent.drawLockedOutline();
  }
  perfLogger.timeEnd('render');
  perfLogger.measure('end to end', perfLogger.getStartTime());
};

const drawFixedTimelineSlider = (ctx, canvas, startTimex, endTimex) => {
  ctx.strokeStyle = isDarkTheme.value ? 'rgba(255, 255, 255)' : 'rgba(25, 25, 25)';
  ctx.lineWidth = 6;

  let startx = startTimex;
  let endx = endTimex;

  // 极端场景处理用于区分
  if (endx - startx < 3) {
    endx = endx + 3;
  }

  if (endx > viewState.canvasCssWidth || endx === viewState.canvasCssWidth) {
    endx = viewState.canvasCssWidth;
  }

  const canvasCSSHeight = getCanvasCSSHeight(canvas);

  ctx.beginPath();
  ctx.moveTo(startx, 0);
  ctx.lineTo(startx, canvasCSSHeight / 3);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endx, 0);
  ctx.lineTo(endx, canvasCSSHeight / 3);
  ctx.stroke();

  ctx.strokeStyle = isDarkTheme.value ? 'rgba(255, 255, 255)' : 'rgba(25, 25, 25)';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(startx, canvasCSSHeight / 3);
  ctx.lineTo(startx, canvasCSSHeight);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endx, 0);
  ctx.lineTo(endx, canvasCSSHeight);
  ctx.stroke();
};

const renderFixedTimeline = () => {
  const component = timelineComponent.value;
  if (!component || !component.fixedtimelineCtx || !component.fixedtimelineCanvas) return;

  const ctx = component.fixedtimelineCtx;
  const canvas = component.fixedtimelineCanvas;

  ctx.clearRect(0, 0, viewState.canvasCssWidth, canvas.offsetHeight);

  // 绘制背景
  ctx.fillStyle = isDarkTheme.value ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  ctx.fillRect(0, 0, viewState.canvasCssWidth, canvas.offsetHeight);

  // 绘制时间网格
  ctx.strokeStyle = isDarkTheme.value ? '#3e3e42' : 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(viewState.canvasCssWidth, 20);
  ctx.stroke();

  let lastx = 0;
  let distance = 0;
  const canvasWidth = viewState.canvasCssWidth;
  const timePerPixel = viewState.timeRange / canvasWidth;
  const gridInterval = calculateGridInterval(timePerPixel);

  // 联动二段轴逻辑
  const timelinePerPixel = viewState.timeRange / (canvasWidth * viewState.scale);
  const startTime = viewState.minTime + Math.abs(viewState.offsetX * timelinePerPixel);
  const startTimex = fixedTimeToX(startTime) - layout.processLabelWidth;

  const endTime = startTime + canvasWidth * timelinePerPixel;
  const endTimex = fixedTimeToX(endTime) - layout.processLabelWidth;
  const endSecondTimex = timeToX(viewState.maxTime) - layout.processLabelWidth;

  timelineState.startTime = startTime;
  timelineState.startTimeDecimal = startTime;
  timelineState.startTimeX = startTimex;
  timelineState.endTime = endTime;
  timelineState.endTimeDecimal = endTime;
  timelineState.endTimeX = endTimex;
  timeLineX.value = endSecondTimex;
  for (let time = viewState.minTime; time <= viewState.maxTime; time += gridInterval) {
    const x = fixedTimeToX(time, true) - layout.processLabelWidth;
    if (x >= 0 && x <= canvasWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      distance = x - lastx;
      const segmentWidth = distance / 10;
      for (let i = 1; i < 10; i++) {
        const segmentX = x + i * segmentWidth;
        ctx.beginPath();
        ctx.moveTo(segmentX, 20);
        ctx.lineTo(segmentX, 10);
        ctx.stroke();
      }

      const { value, unit } = TimelineWithUnit(viewState.timeRange * 1000 / tsScale.value, (time - viewState.minTime) * 1000 / tsScale.value);
      ctx.fillStyle = isDarkTheme.value ? '#cccccc' : 'rgba(25, 25, 25, 1)';
      ctx.font = '14px Arial';
      if (x < startTimex || x > endTimex) {
        ctx.fillStyle = isDarkTheme.value ? 'rgba(102, 102, 102, 0.8)' : '#cccccc';
      }
      ctx.fillText(`${value}${unit}`, x + 2, 15);
    }
    lastx = x;
  }

  // 补齐未绘制的轴线
  for (let i = 1; i < 10; i++) {
    const segmentx = i * (distance / 10);
    ctx.beginPath();
    ctx.moveTo(segmentx, 20);
    ctx.lineTo(segmentx, 10);
    ctx.stroke();
  }
  if (isMeasureDragging.value && viewState.scale === 1) {
    const measureStartTimeX = measureDragStartX.value - layout.processLabelWidth;
    const measureEndTimeX = measureDragEndX.value - layout.processLabelWidth;
    drawFixedTimelineSlider(ctx, canvas, measureStartTimeX, measureEndTimeX);
    return;
  }
  drawFixedTimelineSlider(ctx, canvas, startTimex, endTimex);
};

const renderTimeline = () => {
  const component = timelineComponent.value;
  if (!component || !component.timelineCtx || !component.timelineCanvas) return;

  const ctx = component.timelineCtx;
  const canvas = component.timelineCanvas;

  ctx.clearRect(0, 0, viewState.canvasCssWidth, canvas.offsetHeight);

  // 绘制背景
  ctx.fillStyle = isDarkTheme.value ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  ctx.fillRect(0, 0, viewState.canvasCssWidth, canvas.offsetHeight);

  // 绘制时间网格
  ctx.strokeStyle = isDarkTheme.value ? '#3e3e42' : 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;

  const timelineTimeRange = timelineState.endTime - timelineState.startTime;
  const canvasWidth = viewState.canvasCssWidth;
  const timePerPixel = timelineTimeRange / canvasWidth;
  const gridInterval = calculateGridInterval(timePerPixel);

  const timelinePoints = [];
  for (let time = timelineState.startTime; time <= timelineState.endTime; time += gridInterval) {
    let x = timeToX(time, true) - layout.processLabelWidth;
    if (x < 0) {
      x = 0;
    }
    if (x >= 0 && x <= viewState.canvasCssWidth) {
      timelinePoints.push({ time, x });
    }
  }

  const timelineLabels = timelinePoints.map(point => {
    const { value, unit } = TimelineWithUnit(
      viewState.timeRange * 1000 / tsScale.value,
      (point.time - viewState.minTime) * 1000 / tsScale.value
    );
    return `${value}${unit}`;
  });

  const uniqueLabels = new Set(timelineLabels);
  let shouldDowngradeUnit = uniqueLabels.size < timelineLabels.length;

  const formatTimelineLabel = (timeInNanoseconds) => {
    if (!shouldDowngradeUnit) {
      const { value, unit } = TimelineWithUnit(
        viewState.timeRange * 1000 / tsScale.value,
        timeInNanoseconds
      );
      return `${value}${unit}`;
    }

    const unitPriority = ['min', 's', 'ms', 'μs', 'ns'];
    const currentUnit = timelineLabels[0].match(/[a-zA-Zμ]+/)?.[0] || 'ns';
    const currentUnitIndex = unitPriority.indexOf(currentUnit);

    for (let downgradeLevel = 1; downgradeLevel <= 3; downgradeLevel++) {
      const targetUnitIndex = currentUnitIndex + downgradeLevel;
      if (targetUnitIndex >= unitPriority.length) break;

      const targetUnit = unitPriority[targetUnitIndex];
      const divisorMap = {
        's': 1000000000,
        'ms': 1000000,
        'μs': 1000,
        'ns': 1
      };

      const divisor = divisorMap[targetUnit] || 1;
      const convertedValue = timeInNanoseconds / divisor;
      
      const intervalInTargetUnit = gridInterval / divisor;
      let decimals = 1;
      if (intervalInTargetUnit < 10) decimals = 2;
      if (intervalInTargetUnit < 1) decimals = 3;

      const label = `${convertedValue.toFixed(decimals)}${targetUnit}`;

      const testLabels = timelinePoints.map(p => {
        const testTime = (p.time - viewState.minTime) * 1000 / tsScale.value;
        const testValue = testTime / divisor;
        return `${testValue.toFixed(decimals)}${targetUnit}`;
      });

      if (new Set(testLabels).size === testLabels.length) {
        return label;
      }
    }

    const { value, unit } = TimelineWithUnit(
      viewState.timeRange * 1000 / tsScale.value,
      timeInNanoseconds
    );
    return `${value}${unit}`;
  };

  timelinePoints.forEach(point => {
    ctx.beginPath();
    ctx.moveTo(point.x, 0);
    ctx.lineTo(point.x, canvas.height);
    ctx.stroke();

    const label = formatTimelineLabel((point.time - viewState.minTime) * 1000 / tsScale.value);
    ctx.fillStyle = isDarkTheme.value ? 'rgba(230, 230, 230)' : 'rgba(25, 25, 25)';
    ctx.font = '12px Arial';
    ctx.fillText(label, point.x + 2, 15);
    
    const timeValue = xToTimeValue(point.time, true);
    ctx.fillText(`${timeValue}`, point.x + 2, 35);
  });

  if (isMeasureDragging.value) {
    const measureStartTimeX = measureDragStartX.value - layout.processLabelWidth;
    const measureEndTimeX = measureDragEndX.value - layout.processLabelWidth;
    drawMeasureTimeRange(ctx, measureStartTimeX, measureEndTimeX);
  }
};

const xToTimeValue = (time) => {
  const timeDelta = time - viewState.minTime;
  if (timeDelta < 0) {
    return '000 000 000';
  }
  const timeInNs = Math.round(timeDelta * 1000 / tsScale.value);
  const str = timeInNs.toString();
  let formattedStr;
  if (str.length < 9) {
    formattedStr = str.padStart(9, '0');
  } else {
    formattedStr = str;
  }
  return formattedStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const durationToWidth = (duration) => {
  if (!timelineComponent || !timelineComponent.value?.timelineCanvas) return 0;

  const canvasWidth = viewState.canvasCssWidth;
  const normalizedDuration = duration / viewState.timeRange;
  return normalizedDuration * canvasWidth * viewState.scale;
};

const fixedTimeToX = (time) => {
  if (!timelineComponent.value.fixedtimelineCanvas) return 0;

  const canvasWidth = viewState.canvasCssWidth;
  const relativeTime = time - viewState.minTime;
  const normalizedTime = relativeTime / viewState.timeRange;
  return layout.processLabelWidth + (normalizedTime * canvasWidth);
};

const xToFixedTime = (x) => {
  if (!timelineComponent.value.fixedtimelineCanvas) return null;

  const canvasWidth = getCanvasCSSWidth(timelineComponent.value.fixedtimelineCanvas);
  const xWithoutLabel = x - layout.processLabelWidth;
  const normalizedTime = xWithoutLabel / canvasWidth;
  return viewState.minTime + (normalizedTime * viewState.timeRange);
};

const timeToX = (time) => {
  if (!timelineComponent.value?.timelineCanvas) return 0;

  const canvasWidth = viewState.canvasCssWidth;
  const relativeTime = time - viewState.minTime;
  const normalizedTime = relativeTime / viewState.timeRange;
  return layout.processLabelWidth + (normalizedTime * canvasWidth * viewState.scale) + viewState.offsetX;
};

const xToTime = (x) => {
  if (!timelineComponent.value?.timelineCanvas) return 0;

  const canvasWidth = getCanvasCSSWidth(timelineComponent.value.timelineCanvas);
  const adjustedX = x - layout.processLabelWidth - viewState.offsetX;
  const normalizedTime = adjustedX / (canvasWidth * viewState.scale);
  const relativeTime = normalizedTime * viewState.timeRange;
  return viewState.minTime + relativeTime;
};

const toggleReRenderProcess = (processKey, process) => {
  nextTick(() => {
    resizeCanvases(processKey, false);
    const ctxInfo = ctxs[processKey];
    if (!ctxInfo) {
      return;
    }
    for (const [ctxKey, ctx] of Object.entries(ctxInfo)) {
      ctx.save();
      ctx.setTransform(viewState.pixelScale, 0, 0, getDevicePixelRatio(), viewState.pixelOffsetX, 0);
    }
    const ctx = ctxInfo.eventCtx;
    childContextMap.threadEvent.transformEvents(process, processKey);
    childContextMap.threadEvent.renderProcessText(process, ctx, processKey);
    timelineComponent.value.flagRender();
    drawKernalEvents();
  });
};

const toggleProcess = (processKey) => {
  const isExpanded = processExpanded.get(processKey);
  processExpanded.set(processKey, !isExpanded);
  // 如果当前打开的就是该process，折叠该process，且为了保证其他process正常显示，重绘其他打开的process
  if (isExpanded) {
    for (const [key, process] of swimDataManager.getAllProcesses().entries()) {
      if (processExpanded.get(key)) {
        toggleReRenderProcess(key, process);
      }
    }
    return;
  }

  // 如果曾经打开过，为了保证缩放比例等正确，也需要再次绘制
  const process = swimDataManager.getProcess(processKey);
  process.isRendered = true;
  toggleReRenderProcess(processKey, process);
};
const drawKernalEvents = () => {
  let processKey = '';
  let process = null;
  for (const [key, processItem] of swimDataManager.getAllProcesses().entries()) {
    if (processItem.type === 'kernel') {
      processKey = key;
      process = processItem;
      break;
    }
  }
  const ctxInfo = ctxs[processKey];
  if (!ctxInfo || !process) {
    return;
  }
  const ctx = ctxInfo.eventCtx;
  const kernalEvents = kernelThreadData.value.events || [];
  if (!aicpuCoreDetailsExpanded.value && kernalEvents.length === 0) {
    return;
  }
  const { threadName } = kernelThreadData.value;
  const threadKey = kernelThreadData.value.tid || threadName;
  
  let thread = null;
  for (const [key, t] of process.threads.entries()) {
    if (t.tid === threadKey || t.threadName === threadKey) {
      thread = t;
      break;
    }
  }
  
  const threadY = getThreadStartY(process, processKey, threadKey, lane2line, layout);
  const threadHeight = getThreadHeight(processKey, threadKey, lane2line, layout, false);
  const baseY = threadY + threadHeight / 2;
  const eventY = baseY - layout.eventHeight / 2;
  
  const isPinned = thread && thread.isPinned;
  let pinnedEventY;
  
  if (isPinned) {
    let pinnedThreadY = 0;
    for (const pinnedThread of pinnedThreadsList.value) {
      const ptTid = pinnedThread.thread?.tid;
      const ptThreadName = pinnedThread.thread?.threadName;
      if (ptTid === threadKey || ptThreadName === threadKey) { break };
      const t = pinnedThread.thread;
      const tk = t.isCounter ? t.threadName : t.tid;
      const lc = lane2line.get(`${pinnedThread.processKey}@${tk}`) || 1;
      pinnedThreadY += layout.threadHeight * lc;
    }
    const pinnedBaseY = pinnedThreadY + threadHeight / 2;
    pinnedEventY = pinnedBaseY - layout.eventHeight / 2;
  } else {
    pinnedEventY = eventY;
  }
  let eventDatas = [];
  ctx.font = getFontStyle(eventTextSize);
  kernalEvents.forEach((event, index, array) => {
    const colors = handleKernalEventColors(event, processKey, false, false);
    const { fillColor, fontColor, strokeColor } = colors;
    const x = getPositionByTime(event.startTime, viewState, layout) - layout.processLabelWidth;
    const width = getWidthByDuration(event.endTime - event.startTime, viewState, layout);
    const duration = event.duration ?? (event.endTime - event.startTime);
    if (!event.drawData) {
      event.drawData = {};
    }
    Object.assign(event.drawData, {
      rectX: x,
      rectY: eventY,
      rectPixelX: x * devicePixelRatio,
      rectPixelY: eventY * devicePixelRatio,
      eventWidth: width,
      width,
      height: layout.eventHeight,
      rectColor: fillColor,
      strokeColor,
      fontColor,
      show: width > viewState.minWidth,
      startTime: event.startTime,
      endTime: event.endTime,
      duration,
      pinnedEventY,
    });
    childContextMap.threadEvent.fillTextInfo(event, ctx, event.drawData, true, false);
    eventDatas.push(event.drawData);
  });
  childContextMap.threadEvent.eventRenderer.drawEvent(eventDatas, ctx);
  childContextMap.threadEvent.eventRenderer.drawEventText(eventDatas, ctx);
};
const handleKernalEventColors = (event, processKey, highlight = false, stroke = true) => {
  return getKernalEventColor(event, childContextMap.threadEvent.eventRenderer.deps, processKey, highlight, stroke);
};
const updatePanelState = (event, processKey, showkernelDetail) => {
  if (event) {
    const process = swimDataManager.getProcess(processKey);
    const effectiveThreadName = event.originalThreadName || event.threadName;
    const isAicpuEvent = process.type === 'aicpu' || event.originalThreadName;
    if (isAicpuEvent) {
      const isCtrl = effectiveThreadName.includes('AICPU-CTRL');
      const isSched = effectiveThreadName.includes('AICPU-SCHED');
      aicpuControlDetailsExpanded.value = isCtrl;
      aicpuScheduleDetailsExpanded.value = isSched;
      aicpuCoreDetailsExpanded.value = !isCtrl && !isSched;
      detailsPanelExpanded.value = false;
    } else {
      aicpuControlDetailsExpanded.value = false;
      aicpuScheduleDetailsExpanded.value = false;
      aicpuCoreDetailsExpanded.value = !showkernelDetail;
      showDetailsPanel(showkernelDetail);
    }
  } else {
    detailsPanelExpanded.value = false;
    aicpuControlDetailsExpanded.value = false;
    aicpuScheduleDetailsExpanded.value = false;
    aicpuCoreDetailsExpanded.value = false;
  }
};

let selectEventToken = 0;

const handleMixSubEventClick = (event, processKey, pathLocked) => {
  mixRelatedPaths.clear();
  highlightedPaths.clear();
  const { mixHoverCtx } = ctxs[processKey];
  const canvas = document.querySelector(`[data-mix-hover-process-key="${processKey}"]`);
  mixHoverCtx.clearRect(0, 0, viewState.canvasCssWidth, canvas.offsetHeight);
  childContextMap.threadEvent.focusWrap(event.args.wrapId, pathLocked);
  globalConnectionCanvas.value.clearCanvas();

  const token = ++selectEventToken;
  setTimeout(() => {
    if (token !== selectEventToken)
    {
        return;
    }

    const relatedEvents = collectSubEventDependencyPathNodes(event);
    for (const pathId of relatedEvents) {
      mixRelatedPaths.add(pathId);
    }
    mixRelatedPaths.add(event.id);

    calculateMixMacroPaths(event.parentEventId, highlightedPaths, userConfig.value.connectionLevel);

    childContextMap.threadEvent.changeNodeColor(processKey, false);
    const wrapCtx = globalConnectionCanvas.value.globalConnectionCanvas.getContext('2d');
    childContextMap.threadEvent.drawClickWrapContainner(event, wrapCtx);
    if (isMaxSchedule.value) {
      const subEvents = swimDataManager.getSubEvents(event.parentEventId);
      for (const subEvent of subEvents) {
        if (!subEvent.drawData) { 
          continue; 
        }
        const selectedCoords = globalConnectionCanvas.value.getEventCoordinates(subEvent, false);
        if (selectedCoords) {
          globalConnectionCanvas.value.highlightEventNode(subEvent, selectedCoords, true);
        }
      }
    } else {
      const selectedCoords = globalConnectionCanvas.value.getEventCoordinates(event, false);
      if (selectedCoords) {
        globalConnectionCanvas.value.highlightEventNode(event, selectedCoords, true);
      }
    }
    if (event?.isWait) {
      return;
    }
    if (!isMaxSchedule.value) {
      childContextMap.threadEvent.renderDimmedNodesInWrap(event, wrapCtx);
    }
    globalConnectionCanvas.value.drawMacroDependencyLines();

    const parentEvent = swimDataManager.getEventById(event.parentEventId);
    if (parentEvent) {
      canvasclickedEvent.value = {
        ...parentEvent,
        id: event.id,
        name: event.name,
        startTime: event.startTime,
        endTime: event.endTime,
        duration: event.endTime - event.startTime,
        renderInfo: event.renderInfo,
      };
    }
  }, 0);
};

const handleMixNormalEventClick = (event, processKey) => {
  highlightedPaths.clear();
  mixRelatedPaths.clear();
  childContextMap.threadEvent.changeNodeColor(processKey, false);
  childContextMap.threadEvent.clearDependencyLines(processKey);

  const token = ++selectEventToken;
  setTimeout(() => {
    if (token !== selectEventToken) {
      return;
    }
    const isMacroTask = swimDataManager.isMixParentEvent(event);
    if (isMacroTask) {
      calculateMixMacroPaths(event.id, highlightedPaths, userConfig.value.connectionLevel);
    } else {
      calculateHighlightedPaths(event, highlightedPaths, userConfig.value.connectionLevel);
    }
    childContextMap.threadEvent.changeNodeColor(processKey, false);
    renderDependencyLines(processKey);
  }, 0);
};

const handleNormalEventClick = (event, processKey) => {
  childContextMap.threadEvent.changeNodeColor(processKey, true);
  childContextMap.threadEvent.clearDependencyLines(processKey);

  const token = ++selectEventToken;
  setTimeout(() => {
    if (token !== selectEventToken) {
      return;
    }
    calculateHighlightedPaths(event, highlightedPaths, userConfig.value.connectionLevel);
    childContextMap.threadEvent.changeNodeColor(processKey, true);
    renderDependencyLines(processKey);
  }, 0);
};

const clearSelection = (processKey) => {
  lastSelected.value = null;
  dependencyHighlightEvent.value = null;
  if (isMaxSchedule.value) {
    isMaxSchedule.value = false;
    highlightedPaths.clear();
  }
  childContextMap.threadEvent.changeNodeColor(processKey);
  clearDependencyLines(processKey);
  if (pinnedthreadsComponent && pinnedthreadsComponent.value) {
    pinnedthreadsComponent.value.changePinnedColor(false);
  }
};

const updateOtherProcesses = (processKey) => {
  for (const [key, process] of swimDataManager.getAllProcesses().entries()) {
    if (!process.isRendered || !processExpanded.get(key) || !ctxs[key]) {
      continue;
    }
    if (key !== processKey) {
      childContextMap.threadEvent.changeNodeColor(key, Boolean(selectedEvent.value));
      if (!globalConnectionCanvas.value && !isPathLockStatus.value) {
        clearDependencyLines(key);
      }
    }
    const { eventCtx } = ctxs[key];
    childContextMap.threadEvent.drawThreadSeparators(eventCtx, swimDataManager.getProcess(key), key);
  }
};

const selectEvent = (event, processKey, showkernelDetail = true, forceExec = false, pathLocked = false) => {
  updatePanelState(event, processKey, showkernelDetail);
  const noChange = (event && event.id === lastSelected.value) || (!event && !lastSelected.value);
  if (!forceExec && noChange) {
    if (isMaxSchedule.value) {
      resetMaxScheduleState();
    }
    return;
  }
  ++selectEventToken;
  mixRelatedPaths.clear();
  if (!isPathLockStatus.value) {
    highlightedPaths.clear();
  }
  globalConnectionCanvas?.value?.clearCanvas();
  selectedEvent.value = event;
  canvasclickedEvent.value = event;
  
  if (event) {
    ++resetScheduleToken;
    lastSelected.value = event.id;
    const process = swimDataManager.getProcess(processKey);
    const isAicpuEvent = process.type === 'aicpu' || event.originalThreadName;
    
    if (isAicpuEvent) {
      if (!isPathLockStatus.value) {
        highlightedPaths.clear();
      }
      highlightAicpu(process, processKey, false);
    } else if (isMixMode?.value && swimDataManager.hasMixConfig()) {
      if (event?.parentEventId) {
        handleMixSubEventClick(event, processKey, pathLocked);
        if (event?.isWait) {
          return;
        }
      } else {
        handleMixNormalEventClick(event, processKey);
      }
    } else {
      handleNormalEventClick(event, processKey);
    }
    
    if (pinnedthreadsComponent && pinnedthreadsComponent.value) {
      pinnedthreadsComponent.value.changePinnedColor(true);
      pinnedthreadsComponent.value.highlightPinnedEvent(event);
    }
  } else {
    clearTimeout(resizeFullRenderTimer);
    clearSelection(processKey);
  }
  
  updateOtherProcesses(processKey);
  if (isPathLockStatus.value && event) {
    renderDependencyLines();
    childContextMap.threadEvent.updatePathLockedHighlightOnTransform();
  }
};

const highlightAicpu = (process, processKey, isResize) => {
  const eventName = selectedEvent.value.name;
  if (process.pid != selectedEvent.value.pid) {
    return;
  }
  if (eventName.includes('DEV_')) {
    aicpuHasRelevent.value = true;
  } else {
    aicpuHasRelevent.value = false;
  }
  const result = parseSuffixNumbers(eventName);
  const { roundNo, taskNo } = result;
  const { threads } = process;
  const threadName = selectedEvent.value.originalThreadName || selectedEvent.value.threadName;
  childContextMap.threadEvent.changeNodeColor(processKey, true);
  const ctx = getAicpuDependencyCanvas(processKey);
  if (!ctx) { return };
  const isCtrl = threadName.includes('AICPU-CTRL');
  const isSched = threadName.includes('AICPU-SCHED');
  let aicpuEventsData = [];
  let drawDatas = [];
  const schedGraphMap= findSchedGraphMap(threads, roundNo, taskNo, selectedEvent.value);
  aicpuScheduleMaps.value = schedGraphMap;
  if (isCtrl) {
    const schedCoreMap = findSchedCoreMapByNo(selectedEvent.value, threads);
    aicpuEventsData = findSchedCoreEventsByNo(schedCoreMap);
    scheduleList.value = findSchedTaskByNo(taskNo, roundNo, processKey);
  } else if (isSched) {
    const schedNo = threadName.split('-').pop();
    const schedMap = findSchedMapByNo({roundNo, taskNo, schedNo}, eventName, threads, selectedEvent.value);
    aicpuEventsData = findSchedEventsByNo(schedMap);
    aicpuScheduleEventMaps.value = [];
    aicpuScheduleEventMaps.value = aicpuEventsData;
    aicpuBuildTask.value = findBuildTaskByNo(schedMap);
  } else {
    if (aicpuCoreDetailComponent.value && !isResize) {
      aicpuCoreDetailComponent.value.renderCoreDetailCanvas();
    }
    const threadNameMatch = threadName.match(/SCHED(?<schedNo>\d+)/);
    const schedNo = threadNameMatch?.groups?.schedNo;
    const coreMap = findCoreMapByNo(schedNo, threadName, selectedEvent.value, threads);
    aicpuEventsData = findCoreEventsByNo(coreMap);
    aicpuBuildTask.value = findBuildTaskByNo(coreMap);
    aicpuSchedTask.value = `AICPU-SCHED-${schedNo}`;
  }
  const isAicpuProcess = process.type === 'aicpu';
  ctx.font = getFontStyle(eventTextSize);
  for (const eventItme of aicpuEventsData) {
    highlightedPaths.add(eventItme.id);
    childContextMap.threadEvent.updateDrawDataColor(eventItme, childContextMap.threadEvent.eventRenderer.deps, processKey);
    if (eventItme.drawData) {
      eventItme.drawData.width = eventItme.drawData.eventWidth;
      childContextMap.threadEvent.fillTextInfo(eventItme, ctx, eventItme.drawData, true, isAicpuProcess);
    }
    drawDatas.push(eventItme.drawData);
  }
  childContextMap.threadEvent.eventRenderer.drawEvent(drawDatas, ctx);
  childContextMap.threadEvent.eventRenderer.drawEventText(drawDatas, ctx);
  childContextMap.threadEvent.highlightEvent(ctx, selectedEvent.value, processKey, true, true);
  if (!kernelThreadData.value || typeof kernelThreadData.value !== 'object' || Object.keys(kernelThreadData.value).length === 0) {
    return;
  }
  if (kernelThreadData.value.events) {
    for (const kEvent of kernelThreadData.value.events) {
      highlightedPaths.add(kEvent.id);
    }
  }
  if (!isPathLockStatus.value && !selectedEvent.value?.originalThreadName) {
    shadingKernal();
  }
};
const shadingKernal = () => {
  let processKey = '';
  for (const [key, processItem] of swimDataManager.getAllProcesses().entries()) { 
    const {type, pid} = processItem;
    if (type === 'kernel') {
      processKey = pid.toString();
      break; 
    }
  }
  processExpanded.set(processKey, false);
  toggleProcess(processKey);
};
let resetScheduleToken = 0;

const resetMaxScheduleState = () => {
  isMaxSchedule.value = false;
  selectedEvent.value = null;
  highlightedPaths.clear();
  mixRelatedPaths.clear();
  if (globalConnectionCanvas.value) {
    globalConnectionCanvas.value.clearCanvas();
  }
  const token = ++resetScheduleToken;
  nextTick(() => {
    if (token !== resetScheduleToken) {
      return;
    }
    for (const [key] of swimDataManager.getAllProcesses().entries()) {
      if (processExpanded.get(key)) {
        childContextMap.threadEvent.changeNodeColor(key, false);
        childContextMap.threadEvent.clearDependencyLines(key);
      }
    }
    renderTwoTimeline();
  });
};

const autoExpandkernelProcess = async () => {
  const kernelProcesses = Array.from(swimDataManager.getAllProcesses().values()).filter(p => p.type === 'kernel');
  for (const kernelPro of kernelProcesses) {
    const kernelKey = String(kernelPro.pid);
    const isExpanded = processExpanded.get(kernelKey);
    if (!isExpanded) {
      childContextMap.processHeaderEvent.handleToggleProcess();
      await nextTick();
    }
  }
};

const autoExpandProcess = async (processKeys) => {
  for (const [key,] of swimDataManager.processInfo.entries()) {
    const isExpanded = processExpanded.get(key);
    if (isExpanded || !processKeys.includes(key)) {
      continue;
    }
    toggleProcess(key);
    childContextMap.threadEvent.eraseEventLine('over');
    await nextTick();
  }
};

const showMaxScheduleEvent = async (startEvent, endEvent) => {
  if (!startEvent || !endEvent) {
    return;
  }
  if (isSearchActive.value) {
    swimgraphHeaderComponent?.value.resetsearchState();
  }
  if (isE2ESwim.value) {
    await autoExpandkernelProcess();
  } else if (isPerfSwim.value) {
    await autoExpandProcess([startEvent.pid.toString(), endEvent.pid.toString()]);
  }
  isMaxSchedule.value = true;
  startEventId = startEvent.id;
  endEventId = endEvent.id;
  highlightedPaths.clear();
  highlightedPaths.add(startEventId);
  highlightedPaths.add(endEventId);
  lastSelected.value = startEvent.id;
  selectedEvent.value = startEvent;
  const processKey = String(startEvent.pid);
  const process = swimDataManager.getProcess(processKey);
  detailsPanelExpanded.value = false;
  mulDetailsExpanded.value = false;

  if (process) { 
    measureDragStartX.value =  timeToX(startEvent.endTime);
    measureDragEndY.value = timeToX(endEvent.startTime);
    measureDragStartTime.value = xToTime(measureDragStartX.value);
    measureDragEndTime.value = xToTime(measureDragEndY.value);
    setMeasureDragHeight();
  }
};

const setMeasureDragHeight = () => {
  const processHeight = graphProcessesComponent.value.getProcessContainerHeight();
  let measureHeight = processHeight;
  if (pinnedthreadsComponent && pinnedthreadsComponent.value) {
    const pinnedHeight = pinnedthreadsComponent.value.getPinnedHeight();
    measureHeight += pinnedHeight;
  }
  if (isE2ESwim.value) {
    const expandedPanel = document.querySelector('.details-panel.expanded, .control-details.expanded, .core-details.expanded');
    if (expandedPanel) {
      measureHeight += expandedPanel.offsetHeight;
    }
  }
  measureDragHeight.value = measureHeight;
  document.documentElement.style.setProperty('--maskHeight', `${measureDragHeight.value}px`);
};

const findEventAtPosition = (x, y, processKey, isfindMixSubEvents = true) => {
  let processObj = {
    event: null,
    altClickData: {
      preData: null,
      lastData: null,
      nodeSpacingX: 0,
    },
  };
  const process = swimDataManager.getProcess(processKey);
  if (!process) return null;
  
  if (isMixMode.value && swimDataManager.hasMixConfig() && isfindMixSubEvents) {
    const result = findSubEventAtPosition(x, y);
    if (result) {
      processObj.event = result.event;
      if (result.altClickData) {
        processObj.altClickData = result.altClickData;
      }
      return processObj;
    }
  }
  
  // 用于记录最后一个有效的间隙（仅当无吸附时使用）
  let fallbackAltClickData = null;
  for (const [threadKey, thread] of process.threads.entries()) {
    const tempId = thread.eventIds[0];
    if (!tempId) {
      continue;
    }
    const temp = swimDataManager.getEventById(tempId);
    const label = `${processKey}@${thread.tid}`;
    const lineCount = lane2line.get(label) || 1;
    if (temp.renderInfo) {
      const minY = temp.renderInfo.y;
      const maxY = minY + layout.threadHeight * lineCount;
      if (y < minY || y > maxY) {
        continue;
      }
    }
    const result = searchEventsInThread(thread, x, y);
    if (result.foundEvent) {
      processObj.event = result.foundEvent;
      return processObj;
    }
    if (result.fallback) {
      fallbackAltClickData = result.fallback;
    }
  }
  if (fallbackAltClickData) {
    processObj.altClickData = fallbackAltClickData;
  }
  return processObj;
};

const findWrapAtPosition = (x, y, ctx, timeToPosFn) => {
  const swimLaneOrder = swimDataManager.getSwimLaneOrder();
  for (const lane of swimLaneOrder) {
    if (lane.type !== 'wrap-label') { continue };
    if (y < lane.y || y > lane.y + lane.height) { continue };
    const { startTime } = lane;
    const startX = timeToPosFn(startTime, viewState, layout) - layout.processLabelWidth;
    const labelX = startX * viewState.pixelScale + viewState.pixelOffsetX;
    const padding = 8 * devicePixelRatio;
    const textWidth = ctx.measureText(lane.label).width;
    const boxWidth = textWidth + padding * 2;
    const wrapX = labelX - padding;
    if (x >= wrapX && x <= wrapX + boxWidth) {
      return lane;
    }
  }
  return null;
};

const isPositionInEventBounds = ({ x, y, renderInfo, duration }) => {
  if (!renderInfo) {
    return false;
  }
  
  const { x: eventX, y: eventY, width: eventWidth, height: eventHeight } = renderInfo;
  
  if (y < eventY || y > eventY + eventHeight) {
    return false;
  }

  if (duration === 0) {
    const halfArrowWidth = (ARROW_WIDTH / 2) / viewState.scale;
    const centerX = eventX + (eventWidth / 2);
    if (x < centerX - halfArrowWidth || x > centerX + halfArrowWidth) {
      return false;
    }
  } else {
    if (x < eventX || x > eventX + eventWidth) {
      return false;
    }
  }
  
  return true;
};

const isPositionOnSameLineAsEvent = ({ y, renderInfo }) => {
  if (!renderInfo) { return false};
  const { y: eventY, height: eventHeight } = renderInfo;
  return y >= eventY && y <= eventY + eventHeight;
};

const collectNormalEvents = (thread) => {
  return thread.eventIds
    .map(id => swimDataManager.getEventById(id))
    .filter(e => e && !swimDataManager.isMixParentEvent(e));
};

const collectParentEvents = (thread) => {
  return thread.eventIds
    .map(id => swimDataManager.getEventById(id))
    .filter(e => e && swimDataManager.isMixParentEvent(e));
};

const checkEventCollision = ({ event, x, y, allEventsOnLane }) => {
  if (!isPositionOnSameLineAsEvent({ y, renderInfo: event.renderInfo })) {
    return null;
  }
  
  const duration = event.duration ?? (event.endTime - event.startTime);
  if (isPositionInEventBounds({ x, y, renderInfo: event.renderInfo, duration })) {
    return { event };
  }
  
  const { x: eventX, width: eventWidth, y: eventY, height: eventHeight } = event.renderInfo;
  allEventsOnLane.push({ event, eventX, eventWidth, eventY, eventHeight });
  
  return null;
};

const checkSubEventsCollision = ({ parentEvent, x, y, allEventsOnLane }) => {
  const subEvents = swimDataManager.getSubEvents(parentEvent.id);
  
  for (const subEvent of subEvents) {
    const result = checkEventCollision({ event: subEvent, x, y, allEventsOnLane });
    if (result) {
      return result;
    }
  }
  
  return null;
};

const checkWaitTasksCollision = ({ parentEvent, x, y }) => {
  const waitTasks = swimDataManager.getWaitTasks(parentEvent.id);
  
  for (const waitTask of waitTasks) {
    const duration = waitTask.duration ?? (waitTask.endTime - waitTask.startTime);
    if (isPositionInEventBounds({ x, y, renderInfo: waitTask.renderInfo, duration })) {
      return { event: waitTask };
    }
  }
  
  return null;
};

const findGapBetweenEvents = ({ allEventsOnLane, x }) => {
  if (allEventsOnLane.length < 2) {
    return null;
  }
  
  allEventsOnLane.sort((a, b) => a.eventX - b.eventX);
  
  for (let i = 0; i < allEventsOnLane.length - 1; i++) {
    const { event, eventX, eventWidth } = allEventsOnLane[i];
    const { event: nextEvent, eventX: nextEventX } = allEventsOnLane[i + 1];
    
    if (x >= eventX + eventWidth && x <= nextEventX) {
      const nodeSpacingX = nextEventX - (eventX + eventWidth);
      return {
        event: null,
        altClickData: {
          preData: event,
          lastData: nextEvent,
          nodeSpacingX,
        },
      };
    }
  }
  
  return null;
};

const findEventsInThread = ({ thread, lane, x, y }) => {
  const allEventsOnLane = [];
  
  const normalEvents = collectNormalEvents(thread);
  for (const event of normalEvents) {
    const result = checkEventCollision({ event, x, y, allEventsOnLane });
    if (result) {
      return result;
    }
  }
  
  if (lane.wrapIds.length === 0) {
    return findGapBetweenEvents({ allEventsOnLane, x });
  }
  
  const parentEvents = collectParentEvents(thread);
  for (const parentEvent of parentEvents) {
    const subEventResult = checkSubEventsCollision({ parentEvent, x, y, allEventsOnLane });
    if (subEventResult) {
      return subEventResult;
    }
    
    const waitTaskResult = checkWaitTasksCollision({ parentEvent, x, y });
    if (waitTaskResult) {
      return waitTaskResult;
    }
  }
  
  return findGapBetweenEvents({ allEventsOnLane, x });
};

const findLaneAtPosition = ({ y, swimLaneOrder }) => {
  for (const lane of swimLaneOrder) {
    if (lane.type !== 'thread') {
      continue;
    }
    
    if (y >= lane.y && y <= lane.y + lane.height) {
      return lane;
    }
  }
  
  return null;
};

const findSubEventAtPosition = (x, y) => {
  const swimLaneOrder = swimDataManager.getSwimLaneOrder();
  const lane = findLaneAtPosition({ y, swimLaneOrder });
  if (!lane) { return null };
  return findEventsInThread({ thread: lane.thread, lane, x, y });
};


const findMipmapGap = (rowDatas, x) => {
  rowDatas.sort((a, b) => a.rectX - b.rectX);
  for (let i = 0; i < rowDatas.length - 1; i++) {
    const { rectX: prevX, eventWidth: prevW, drawData: prevDD } = rowDatas[i];
    const { rectX: nextX, drawData: nextDD } = rowDatas[i + 1];
    if (x >= prevX + prevW && x <= nextX) {
      const preEvent = prevDD._mipmapEventId ? swimDataManager.getEventById(prevDD._mipmapEventId) : null;
      const lastEvent = nextDD._mipmapEventId ? swimDataManager.getEventById(nextDD._mipmapEventId) : null;
      return {
        preData: preEvent,
        lastData: lastEvent,
        nodeSpacingX: nextX - (prevX + prevW),
      };
    }
  }
  return null;
};

const searchEventsInThread = (thread, x, y) => {
  if (thread._sliceMipmap && thread._visibleDrawDatas) {
    const halfArrowWidth = (ARROW_WIDTH / 2) / viewState.scale;
    const rowDatas = [];
    for (const drawData of thread._visibleDrawDatas) {
      if (!drawData || !drawData.show)
      {
          continue;
      }
      const { rectX, rectY, eventWidth, height, duration } = drawData;
      if (y < rectY || y > rectY + height)
      {
          continue;
      }

      if (duration === 0) {
        const centerX = rectX + (eventWidth / 2);
        if (x >= centerX - halfArrowWidth && x <= centerX + halfArrowWidth && drawData._mipmapEventId)
        {
            const event = swimDataManager.getEventById(drawData._mipmapEventId);
            return { foundEvent: event, fallback: null };
        }
      } else {
        const hitWidth = Math.max(eventWidth, viewState.minWidth);
        if (x >= rectX && x <= rectX + hitWidth && drawData._mipmapEventId)
        {
            const event = swimDataManager.getEventById(drawData._mipmapEventId);
            return { foundEvent: event, fallback: null };
        }
      }
      rowDatas.push({ rectX, eventWidth, drawData });
    }
    const gap = findMipmapGap(rowDatas, x);
    if (gap)
    {
        return { foundEvent: null, fallback: gap };
    }
    return { foundEvent: null, fallback: null };
  }

  let fallbackAltClickData = null;
  const eventsOnCurrentLine = [];
  for (const eventId of thread.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (!event.renderInfo || !event.drawData) {
      continue;
    }
    const { x: eventX, y: eventY, height: eventHeight } = event.renderInfo;
    const { eventWidth } = event.drawData;
    const duration = event.duration ?? (event.endTime - event.startTime);
    
    if (y >= eventY && y <= eventY + eventHeight) {
      if (duration === 0) {
        const halfArrowWidth = (ARROW_WIDTH / 2) / viewState.scale;
        const centerX = eventX + (eventWidth / 2);
        if (x >= centerX - halfArrowWidth && x <= centerX + halfArrowWidth) {
          return { foundEvent: event, fallback: null };
        }
      } else if (x >= eventX && x <= eventX + eventWidth) {
        return { foundEvent: event, fallback: null };
      }
      
      const { pixelScale } = viewState;
      const isNarrow = eventWidth * pixelScale <= NARROW_WIDTH_THRESHOLD;
      if (isNarrow && event.renderEndTime >= timelineState.startTime && event.renderStartTime <= timelineState.endTime) {
        // 吸附
        const snapThresholdInTime = SNAP_THRESHOLD / pixelScale;
        const eventRange = [eventX - snapThresholdInTime, eventX + eventWidth];
        if (x >= eventRange[0] && x <= eventRange[1]) {
          return { foundEvent: event, fallback: null };
        }
      }
      
      eventsOnCurrentLine.push({ event, eventX, eventWidth });
    }
  }
  
  if (eventsOnCurrentLine.length < 2) {
    return {
      foundEvent: null,
      fallback: null
    };
  }
  
  for (let i = 0; i < eventsOnCurrentLine.length - 1; i++) {
    const { event, eventX, eventWidth } = eventsOnCurrentLine[i];
    const { event: nextEvent, eventX: nextEventX } = eventsOnCurrentLine[i + 1];
    
    if (x >= eventX + eventWidth && x <= nextEventX) {
      fallbackAltClickData = {
        preData: event,
        lastData: nextEvent,
        nodeSpacingX: nextEventX - (eventX + eventWidth),
      };
      break;
    }
  }
  return {
    foundEvent: null,
    fallback: fallbackAltClickData
  };
};

const getMixModeDisplayName = (name) => {
  let displayName = name;
  const firstParenthesesIndex = name.indexOf('(');
  if (firstParenthesesIndex !== -1) {
    const secondParenthesesIndex = name.indexOf(')', firstParenthesesIndex);
    if (secondParenthesesIndex !== -1) {
      displayName = name.substring(0, firstParenthesesIndex) + name.substring(secondParenthesesIndex + 1);
    }
  }
  return displayName;
};

const getMixModeTaskLabelName = (labelPart, name) => {
  let displayName = '';
  if (labelPart) {
    const laberContent = labelPart.groups.label.trim();
    const rightPart = name.substring(labelPart.index + labelPart[0].length).trim();
    displayName = laberContent + (rightPart ? String(rightPart) : '');
  }
  return displayName;
};

const getHashOrderContent = (hashOrderStr, key) => {
  const hashOrdermatch = hashOrderStr.match(new RegExp(`${key} hashOrder: (\\S+), subGraphCount: (\\d+)`));
  const hashOrdertext = hashOrdermatch ? hashOrdermatch[1] : null;
  return hashOrdertext;
};

const gethashOrderName = (event) => {
  let displayName = ''
  if (event.args?.['hashOrder-hint'] !== undefined || event.hashorder !== undefined || event.args?.hashorder !== undefined) {
    const hashOrderStr = event.args?.['hashOrder-hint'] ?? event.hashorder ?? event.args?.hashorder;
    if (hashOrderStr.includes('cubeMergeInfo')) {
      if (hashOrderRending.value === 'L1ReuseHashOrder') {
        displayName = getHashOrderContent(hashOrderStr, 'l1ReuseInfo');
      } else if (hashOrderRending.value === 'cubeMergeHashOrder') {
        displayName = getHashOrderContent(hashOrderStr, 'cubeMergeInfo');
      }
    } else if (hashOrderStr.includes('vecMergeInfo')) {
      displayName = getHashOrderContent(hashOrderStr, 'vecMergeInfo');
    }
  }
  return displayName;
};

const combineNames = (firstpart, secondpart) => {
  let result = ''
  if (firstpart && secondpart) {
    result = `${firstpart}(${secondpart})`;
  } else if (firstpart) {
    result = `${firstpart}()`;
  } else if (secondpart) {
    result = secondpart;
  }
  return result;
};

const getTwoConfigName = (event, name) => {
  let { name: displayName } = event;
  let hashOrderName = '';
  const textOption = userConfig.value.kernelTextRending ?? ['taskName', 'taskLabel'];
  if (textOption.includes('isomorphicSubGraphGroup')) {
    hashOrderName = gethashOrderName(event);
    if (textOption.includes('taskName')) {
      const taskName = displayName.split('(')[0].trim();
      displayName = combineNames(taskName, hashOrderName);
    } else if (textOption.includes('taskLabel')) {
      const labelPart = displayName.match(/\((?<label>[^)]+)\)/);
      const taskLabelName = labelPart ? labelPart.groups.label.trim() : '';
      displayName = combineNames(taskLabelName, hashOrderName);
    }
    if (isMixMode.value && swimDataManager.hasMixConfig()) {
      const rightPart = name.includes('_') ? name.split('_').pop() : '';
      displayName = displayName + (rightPart ? '_' + String(rightPart) : '');
    }
  }
  return displayName;
};

const getDisplayName = (event) => {
  let { name: displayName } = event;
  if (event.originalThreadName || swimDataManager.getProcess(event.processKey)?.type === 'aicpu') {
    return displayName;
  }
  const textOption = userConfig.value.kernelTextRending ?? ['taskName', 'taskLabel'];
  if (textOption.length === 1 && textOption[0] === 'taskName') {
    if(isMixMode?.value) {
      displayName = getMixModeDisplayName(displayName);
    } else {
      displayName = displayName.split('(')[0].trim();
    }
  } else if (textOption.length === 1 && textOption[0] === 'taskLabel') {
    const labelPart = displayName.match(/\((?<label>[^)]+)\)/);
    if (isMixMode?.value) {
      displayName = getMixModeTaskLabelName(labelPart, displayName);
    } else {
      displayName = labelPart ? labelPart.groups.label.trim() : '';
    }
  } else if (textOption.length === 1 && textOption[0] === 'isomorphicSubGraphGroup') {
    if (isMixMode.value && swimDataManager.hasMixConfig()) {
    const rightPart = displayName.includes('_') ? displayName.split('_').pop() : '';
    displayName = gethashOrderName(event, displayName);
    displayName = displayName + (rightPart ? '_' + String(rightPart) : '');
    } else {
      displayName = gethashOrderName(event, displayName);
    }
  }

  if(textOption.length === 2) {
    displayName = getTwoConfigName(event, displayName);
  }
  return displayName;
};

const setHashOrderTipColor = (event) => {
  document.documentElement.style.setProperty('--tool-tip-key-width', window.ascLang === 'zh' ? `80px` : `170px`);
  if (userConfig.value.kernelColorRending === 'isomorphicSubGraph') {
    if (isDarkTheme.value) {
      document.documentElement.style.setProperty('--hashOrder-color', `${event.color.dark['base']}`);
    } else {
      document.documentElement.style.setProperty('--hashOrder-color', `${event.color.dark['light']}`);
    }
  } else {
    if (isDarkTheme.value) {
      document.documentElement.style.setProperty('--hashOrder-color', `#999999`);
    } else {
      document.documentElement.style.setProperty('--hashOrder-color', `#AEAEAE`);
    }
  }
};

const overflowText = (actualWidth, text) => {
  let textWidth = getTextWidth(text, 12);
  const widthPerChar = textWidth / text.length;
  let maxCharsToFit = Math.floor(actualWidth / widthPerChar);

  let displayText = '';
  if (textWidth >= actualWidth && maxCharsToFit > 3) {
    maxCharsToFit -= 3;
    displayText = text.substr(0, maxCharsToFit) + '...';
  } else if (textWidth < actualWidth) {
    displayText = text;
  }

  let textStartX = (actualWidth - getTextWidth(displayText, 12)) / 2;
  return [displayText, textStartX];
};

const dynamicWidthStyle = (event) => {
  if (event) {
    const eventColor = isDarkTheme.value ? event.color.dark : event.color.light;
    const colorCfg = isDarkTheme.value ? COLOR_CFG.dark : COLOR_CFG.light;
    let fillColor = eventColor ? eventColor.base : 'rgba(10, 89, 247, 0.3)';
    const fontColor = colorCfg.eventFont;
    return {background:fillColor, color: fontColor};
  }
  return {};
};

const showDetailsPanel = (showkernelDetail) => {
  if (!showkernelDetail) {
    return;
  }
  detailsPanelExpanded.value = true;
};

const toggleDetailsPanel = () => {
  detailsPanelExpanded.value = !detailsPanelExpanded.value;
};

const toggleDetailsCores = () => {
  detailsCoresExpanded.value = !detailsCoresExpanded.value;
};

const calculateMaxScale = () => {
  if (!timelineComponent.value.fixedtimelineCtx || !timelineComponent.value.fixedtimelineCanvas) return 10;
  const canvasWidth = viewState.canvasWidth;
  const calculateScale = (viewState.timeRange / canvasWidth) * 1000 * 100;
  const maxScale = Math.floor(calculateScale);
  return maxScale;
};

const initCanvases = () => {
  // 初始化画布
  if (timelineComponent.value) {
    timelineComponent.value.initCanvases();
  }
  const maxScale = calculateMaxScale();
  sliderMax.value = maxScale * 10;
  sliderMaxCount.value = Math.round(Math.log(maxScale) / Math.log(1.25));
};

const resetState = () => {
  viewState.scale = 1;
  viewState.pixelScale = viewState.scale * getDevicePixelRatio();
  viewState.offsetX = 0;
  viewState.pixelOffsetX = viewState.offsetX * getDevicePixelRatio();
  sliderValue.value = 0;
};

let resizeRafId = null;
let resizeFullRenderTimer = null;
let resizeObserver = null;

const doResizeFastPhase = () => {
  const currentDevicePixelRatio = getDevicePixelRatio();

  setDevicePixelRatio(currentDevicePixelRatio);
  const oldCanvasCssWidth = viewState.canvasCssWidth;
  const oldOffsetX = viewState.offsetX;

  freezeVisibleRange.value = true;
  resizeCanvases();
  if (timelineComponent.value) {
    timelineComponent.value.resizeCanvases();
  }

  const newCanvasCssWidth = viewState.canvasCssWidth;
  if (oldCanvasCssWidth && newCanvasCssWidth && oldCanvasCssWidth !== newCanvasCssWidth) {
    const widthRatio = newCanvasCssWidth / oldCanvasCssWidth;
    viewState.offsetX = oldOffsetX * widthRatio;
    viewState.pixelOffsetX = viewState.offsetX * getDevicePixelRatio();
    viewState.pixelScale = viewState.scale * getDevicePixelRatio();
    if (draggingSelection.value) {
      draggingSelection.value = {
        ...draggingSelection.value,
        startLocalX: draggingSelection.value.startLocalX * widthRatio,
        endLocalX: draggingSelection.value.endLocalX * widthRatio,
      };
    }
  }

  transform();
  for (const [key] of swimDataManager.getAllProcesses().entries()) {
    if (processExpanded.get(key)) {
      childContextMap.threadEvent.changeNodeColor(key, Boolean(selectedEvent.value));
    }
  }
};

const doResizeFullPhase = () => {
  freezeVisibleRange.value = false;
  const savedSelected = selectedEvent.value;
  const savedSearched = searchedEvent.value;
  selectedEvent.value = null;
  searchedEvent.value = null;
  perfLogger.time('time of computeDrawData');
  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    childContextMap.threadEvent.computeProcessDrawData(process, processKey);
  }
  perfLogger.timeEnd('time of computeDrawData');
  selectedEvent.value = savedSelected;
  searchedEvent.value = savedSearched;
  transform();
  for (const [key] of swimDataManager.getAllProcesses().entries()) {
    if (processExpanded.get(key)) {
      childContextMap.threadEvent.changeNodeColor(key, Boolean(selectedEvent.value));
    }
  }
  if (pinnedthreadsComponent && pinnedthreadsComponent.value) {
    pinnedthreadsComponent.value.pinnedInitCanvases();
    pinnedthreadsComponent.value.pinnedRender();
  }
  drawMeasureTime();
  timelineComponent.value.observationLineResize();
  childContextMap.threadEvent?.distanceMeasurementResize();
  if (aicpuCoreDetailsExpanded.value) {
    aicpuCoreDetailComponent.value.renderCoreDetailCanvas();
    drawKernalEvents();
    setTimeout(() => {
      aicpuCoreDetailComponent.value.handleHighKernelEvents();
    });
  }
};

const doResizeRender = () => {
  const currentWindowWidth = window.innerWidth;
  if (resizeRafId !== null) { return };
  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null;
    doResizeFastPhase();
    scheduleResizeFullRender();
    viewState.windowWidth = currentWindowWidth;
  });
};

const scheduleResizeRender = () => {
  const currentDevicePixelRatio = getDevicePixelRatio();
  const currentWindowWidth = window.innerWidth;
  // 如果只是纵向内容被遮盖且没有缩放变化，不需要重绘
  if (currentWindowWidth === viewState.windowWidth && currentDevicePixelRatio === devicePixelRatio && !isSwimGraphActive.value) {
    return;
  }
  doResizeRender();
};

const scheduleResizeFullRender = () => {
  clearTimeout(resizeFullRenderTimer);
  resizeFullRenderTimer = setTimeout(() => {
    doResizeFullPhase();
  }, 150);
};

const initResizeObserver = () => {
  if (!swimlaneContainer.value) { return };
  resizeObserver = new ResizeObserver(() => {
    scheduleResizeRender();
  });
  resizeObserver.observe(swimlaneContainer.value);
};

const transformVerticalScroll = () => {
  perfLogger.time('time of transformVerticalScroll');
  transformCanvasOnly();
  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    if (processExpanded.get(processKey)) {
      childContextMap.threadEvent.transformEvents(process, processKey);
      const ctx = ctxs[processKey].eventCtx;
      childContextMap.threadEvent.renderProcessText(process, ctx, processKey);
    }
  }
  if (isPathLockStatus.value && canvasclickedEvent.value) {
    const event = canvasclickedEvent.value;
    const processKey = event.pid?.toString();
    if (processKey && processExpanded.get(processKey)) {
      childContextMap.threadEvent.updatePathLockedHighlightOnTransform();
    }
  }
  if (globalConnectionCanvas.value) {
    globalConnectionCanvas.value.clearCanvas();
  }
  for (const [key] of swimDataManager.getAllProcesses().entries()) {
    if (processExpanded.get(key)) {
      childContextMap.threadEvent.clearDependencyLines(key);
    }
  }
  clearTimeout(depLinesTimer);
  renderDependencyLines();
  timelineComponent.value.flagRender();
  if (props.isThreeColumn) {
    childContextMap.threadEvent.resizeDrawBoundary();
    childContextMap.threadEvent.toggleLock();
  }
  const depKey = selectedEvent.value?.pid?.toString();
  if (depKey && processExpanded.get(depKey) && selectedEvent.value) {
    const process = swimDataManager.getProcess(depKey);
    if (process && (process.type === 'aicpu' || selectedEvent.value?.originalThreadName)) {
      highlightAicpu(process, depKey, true);
    } else {
      const depCanvas = document.querySelector(`[data-dep-process-key="${depKey}"]`);
      if (depCanvas) {
        const depCtx = depCanvas.getContext('2d');
        depCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        childContextMap.threadEvent.highlightEvent(depCtx, selectedEvent.value, depKey, true);
      }
    }
  }
  if (mulDetailsExpanded.value && !isMeasureModel.value) {
    childContextMap.threadEvent.drawSelectionBox();
    childContextMap.threadEvent.drawSelectionHightlight();
  }
  drawDependencyHighlightEvent(dependencyHighlightEvent.value, processExpanded, globalConnectionCanvas.value, { updateEventPosition, highlightEvent: childContextMap.threadEvent.highlightEvent });
  perfLogger.timeEnd('time of transformVerticalScroll');
  drawMeasureTime();
};

const onVerticalScroll = throttle(() => {
  transformVerticalScroll();
}, 32);

const resizeCanvases = (processKey, needResizeTimeline = true) => {
  if (!swimlaneContainer.value) return;

  const containerRect = swimlaneContainer.value.getBoundingClientRect();

  // 调整时间轴画布大小
  if (needResizeTimeline && timelineComponent.value) {
    timelineComponent.value.resizeCanvases();
  }

  if (processKey) {
    const process = swimDataManager.getProcess(processKey);
    if (!process) return;
    updateProcessSize(process, processKey, containerRect, layout, lane2line, viewState, isMixMode.value);
    return;
  }

  for (const [key, process] of swimDataManager.getAllProcesses().entries()) {
    updateProcessSize(process, key, containerRect, layout, lane2line, viewState, isMixMode.value);
  }
};

const resizeMeasure = () => {
  showDragAreaBorders.value = false;
  setMeasureDragHeight();
  document.documentElement.style.setProperty('--maskstart', `${measureDragStartX.value}px`);
  document.documentElement.style.setProperty('--maskend', `${measureDragEndX.value}px`);
};

const measureMouseDown = (e) => {
  measureDetailsExpanded.value = false;
  renderFixedTimeline();
  renderTimeline();

  if (!isMeasureModel.value) {
    return;
  }

  if (e.ctrlKey && e.buttons === 1) {
    measureDragCtrl.value = true;
    measureDragCtrlX.value = e.clientX;
    if (measureDragCtrlX.value - layout.processLabelWidth < 0) {
      measureDragCtrlX.value = layout.processLabelWidth;
    }
    return;
  }

  measureDragStartX.value = e.clientX;
  measureDragStartY.value = e.clientY;
  measureDragEndX.value = e.clientX;
  measureDragEndY.value = e.clientY;
  if (measureDragStartX.value - layout.processLabelWidth < 0) {
    measureDragStartX.value = layout.processLabelWidth;
  }
  isMeasureDragging.value = true;

  showDragAreaBorders.value = true;
  return;
};

const measureHandleWheel = (e) => {
  timelineComponent.value.handleWheel(e);
  drawMeasureTime();
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    swimlaneContainer.value.scrollTop += e.deltaY;
  }
};

const drawMeasureTime = () => {
  if (!isMeasureModel.value && !isMaxSchedule.value) {
    return;
  }
  let drawMeasureStartX = timeToX(measureDragStartTime.value);
  let drawMeasureEndX = timeToX(measureDragEndTime.value);

  if (drawMeasureStartX > drawMeasureEndX) {
    const temp = drawMeasureEndX;
    drawMeasureEndX = drawMeasureStartX;
    drawMeasureStartX = temp;
  }

  if (drawMeasureStartX - layout.processLabelWidth < 0) {
    drawMeasureStartX = layout.processLabelWidth;
  }

  if (drawMeasureEndX - layout.processLabelWidth > viewState.canvasCssWidth) {
    drawMeasureEndX = viewState.canvasCssWidth + layout.processLabelWidth;
  }

  document.documentElement.style.setProperty('--maskstart', `${drawMeasureStartX}px`);
  document.documentElement.style.setProperty('--maskend', `${drawMeasureEndX}px`);

  const measureStartTimeX = drawMeasureStartX - layout.processLabelWidth;
  const measureEndTimeX = drawMeasureEndX - layout.processLabelWidth;
  const component = timelineComponent.value;
  if (!component || !component.timelineCtx || !component.timelineCanvas) {
    return;
  }
  const ctx = component.timelineCtx;
  drawMeasureTimeRange(ctx, measureStartTimeX, measureEndTimeX);
};

const drawMeasureTimeTip = (ctx, rect, value, unit) => {
  ctx.fillStyle = 'rgba(49, 122, 247, 1)';
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '9px sans-serif';
  let displayValue = value;
  if (unit === 'ns' && value < 1) {
    displayValue = '<1';
  }
  const text = `${displayValue}${unit}`;
  const textWidth = ctx.measureText(text).width;
  const textStart = rect.x + ((rect.width - textWidth) / 2);
  ctx.fillText(text, textStart, 25);
};

const drawMeasureTimeRange = (ctx, startx, endx) => {
  let startX = startx;
  let endX = endx;
  if (endx > viewState.canvasCssWidth) {
    endX = viewState.canvasCssWidth;
  }
  if (startx > endx) {
    startX = endx;
    endX = startx;
  }
  const range = Math.abs(endx - startx);
  const timerange = Math.abs(xToTime(endx) - xToTime(startx));
  let { value, unit } = formatTimeWithUnit(timerange * 1000 / tsScale.value);
  const RectWidth = 46;
  const RectHigh = 12;

  // 绘制边距线
  ctx.strokeStyle = 'rgba(49, 122, 247, 1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, 10);
  ctx.lineTo(startX, 30);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(endX, 10);
  ctx.lineTo(endX, 30);
  ctx.stroke();

  const distance = (range - RectWidth) / 2;
  let rect = {
    x: startX + distance,
    y: 15,
    width: RectWidth,
    height: RectHigh,
  };
  // 绘制长方形
  if (range < RectWidth + 10) {
    rect.x = startX - 40;
    if (startX < 40) {
      rect.x = endX + 5;
    }
    drawMeasureTimeTip(ctx, rect, value, unit);
    return;
  }
  drawMeasureTimeTip(ctx, rect, value, unit);
  // 绘制箭头
  drawMeasureArrow(ctx, startX, endX, distance);
};

const measureMouseMove = (e) => {
  if (e.ctrlKey && e.buttons === 1) {
    if (viewState.scale === 1) {
      return;
    }
    const timeLineEndX = Math.abs(timeLineX.value);
    const deltaX = e.clientX - measureDragCtrlX.value;
    const cssWidth = viewState.canvasCssWidth;
    if (deltaX < 0 && cssWidth > timeLineEndX) {
      return;
    }
    viewState.offsetX += childContextMap.threadEvent.getOffset(deltaX, viewState.scale);
    if (deltaX > 0 && viewState.offsetX > 0) {
      viewState.offsetX = 0;
    }
    viewState.pixelOffsetX = viewState.offsetX * devicePixelRatio;
    transform();
    return;
  }

  if (!isMeasureDragging.value) {
    return;
  }

  measureDragEndX.value = e.clientX;
  measureDragEndY.value = e.clientY;

  document.documentElement.style.setProperty('--maskstart', `${measureDragStartX.value}px`);
  document.documentElement.style.setProperty('--maskend', `${measureDragEndX.value}px`);
  return;
};

const measureMouseUp = () => {
  if (isMaxSchedule.value) {
    resetMaxScheduleState();
    return;
  }

  if (measureDragCtrl.value) {
    measureDragCtrl.value = false;
    return;
  }

  if (!isMeasureDragging.value) {
    return;
  }

  if (measureDragEndX.value - layout.processLabelWidth < 0) {
    measureDragEndX.value = layout.processLabelWidth;
  }

  intelligentSearch();
  measureDetailSearch();

  isMeasureDragging.value = false;
  showDragAreaBorders.value = false;
  if (Math.abs(measureDragEndX.value - measureDragStartX.value) > 5) {
    isCoreUtilizationSupported(false);
    if (!(isMixMode.value && swimDataManager.hasMixConfig()) && !isMsProf.value) {
      mulDetailsExpanded.value = true;
      measureDetailsExpanded.value = true;
    }
    detailsPanelExpanded.value = false;
    aicpuControlDetailsExpanded.value = false;
    aicpuScheduleDetailsExpanded.value = false;
    aicpuCoreDetailsExpanded.value = false;
    return;
  }
  return;
};

const measureMouseLeave = (e) => {
  if (!isMeasureDragging.value) {
    return;
  }

  const rect = e.currentTarget.getBoundingClientRect();
  const mouseX = e.clientX;
  if (mouseX < rect.left) {
    measureDragEndX.value = layout.processLabelWidth;
  } else if (mouseX > rect.right) {
    measureDragEndX.value = viewState.canvasCssWidth + layout.processLabelWidth;
  }

  intelligentSearch();
  measureDetailSearch();
  isMeasureDragging.value = false;
  if (Math.abs(measureDragEndX.value - measureDragStartX.value) > 5) {
    isCoreUtilizationSupported(false);
    if (!(isMixMode.value && swimDataManager.hasMixConfig()) && !isMsProf.value) {
      mulDetailsExpanded.value = true;
      measureDetailsExpanded.value = true;
    }
    detailsPanelExpanded.value = false;
    return;
  }
  return;
};

const processThreadEventSearch = (thread, startTime, endTime) => {
  const matchedEvents = [];
  for (const eventId of thread.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (event.originalThreadName) {
      continue;
    }
    if (event.startTime >= startTime && event.endTime <= endTime) {
      matchedEvents.push(event);
    }
  }
  return matchedEvents;
};

const processAICPUThreadEventSearch = (thread, startTime, endTime) => {
  const matchedEvents = [];
  for (const eventId of thread.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (event.name && event.name.startsWith('DEV_TASK_SCHED_EXEC')) {
      if (event.startTime >= startTime && event.endTime <= endTime) {
        matchedEvents.push(event);
      }
    }
  }
  return matchedEvents;
};

const measureDetailGet = (matchingAICEvents, matchingAIVEvents, timeRange, AICCount, AIVCount) => {
  let AICoretime = 0;
  let AICtime = 0;
  let AIVtime = 0;

  let cubeCycle = 0;
  let vectorCycle = 0;

  if (matchingAICEvents.length !== 0) {
    for (const [key, event] of matchingAICEvents.entries()) {
      const eventTime = event.endTime - event.startTime;
      AICtime += eventTime;
      if (event.pmu_info) {
        cubeCycle += Number(event.pmu_info.cube_busy_cycles);
        vectorCycle += Number(event.pmu_info.vec_busy_cycles);
      }
      const eventHint = event.args['event-hint'];
      hashMatchDataGet(eventHint, eventTime, { rootHashes, leafHashes, leafHashMap });
    }
  }

  if (matchingAIVEvents.length !== 0) {
    for (const [key, event] of matchingAIVEvents.entries()) {
      const eventTime = event.endTime - event.startTime;
      AIVtime += eventTime;
      if (event.pmu_info) {
        cubeCycle += Number(event.pmu_info.cube_busy_cycles);
        vectorCycle += Number(event.pmu_info.vec_busy_cycles);
      }
      const eventHint = event.args['event-hint'];
      hashMatchDataGet(eventHint, eventTime, { rootHashes, leafHashes, leafHashMap });
    }
  }

  const AICoreCount = AICCount + AIVCount;
  AICoretime = AICtime + AIVtime;
  const AICoreUsage = (AICoretime / (timeRange * AICoreCount)) * 100;
  const AICUsage = (AICtime / (timeRange * AICCount)) * 100;
  const AIVUsage = (AIVtime / (timeRange * AIVCount)) * 100;

  const eventNum = matchingAICEvents.length + matchingAIVEvents.length;

  measureDetailsData.value.push({
    AICoreusage: AICoreUsage.toFixed(2),
    AICusage: AICUsage.toFixed(2),
    AIVusage: AIVUsage.toFixed(2),
    cubecycle: cubeCycle,
    vectorcycle: vectorCycle,
    eventnum: eventNum,
    coreWaitTime: 0,
    coreExecutTime: 0,
    coreEventNum: 0,
  });
};

const calculateAndAddAICPUusage = (matchingAICPUEvents, timeRange, AICPUCount) => {
  let AICPUtime = 0;
  if (matchingAICPUEvents.length !== 0) {
    for (const [key, event] of matchingAICPUEvents.entries()) {
      const eventTime = event.endTime - event.startTime;
      AICPUtime += eventTime;
    }
  }

  const AICPUusage = AICPUCount > 0 ? (AICPUtime / (timeRange * AICPUCount)) * 100 : undefined;

  if (measureDetailsData.value.length > 0 && AICPUusage !== undefined) {
    measureDetailsData.value[measureDetailsData.value.length - 1].AICPUusage = AICPUusage.toFixed(2);
  }
};

const processThreadEventSearchWithOriginalThreadName = (thread, startTime, endTime) => {
  const matchedEvents = [];
  for (const eventId of thread.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (event.originalThreadName !== undefined) {
      if (event.startTime >= startTime && event.endTime <= endTime) {
        matchedEvents.push(event);
      }
    }
  }
  return matchedEvents;
};

const processAicpuThreadCoreEventSearch = (thread, startTime, endTime) => {
  const matchedEvents = [];
  for (const eventId of thread.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (event.startTime >= startTime && event.endTime <= endTime) {
      matchedEvents.push(event);
    }
  }
  return matchedEvents;
};

const isKernelEvent = (event) => {
  return !(event.originalThreadName !== undefined && event.originalThreadName !== null);
};

const extractEventIndex = (eventName) => {
  if (!eventName) {
    return -1;
  }
  const match = eventName.match(/\((\d+)\)$/);
  return match ? parseInt(match[1], 10) : -1;
};


const isBeginOrInitEvent = (eventName) => {
  if (!eventName) {
    return false;
  }
  return eventName.startsWith('BEGIN') || eventName.startsWith('INIT');
};

const hasKernelInRound = (events, startIndex, currentRound) => {
  for (let i = startIndex; i < events.length; i++) {
    const eventRound = extractEventIndex(events[i].name || '');
    if (eventRound !== -1 && eventRound !== currentRound) {
      break;
    }
    if (isKernelEvent(events[i])) {
      return true;
    }
  }
  return false;
};

const collectSortedEvents = (threadInfo) => {
  const events = [];
  for (const eventId of threadInfo.eventIds) {
    const event = swimDataManager.getEventById(eventId);
    if (!event) {
      continue;
    }
    events.push(event);
  }
  events.sort((a, b) => a.startTime - b.startTime);
  return events;
};

const firstEventFound = (events) => {
  let isFirst = false;
  let earlastEvent;
  if (!events || events.length === 0) {
    return false;
  }
  for (const [processKey, processInfo] of Array.from(swimDataManager.processInfo.entries())) {
    for (const threadInfo of Array.from(processInfo.threads.values())) {
      const { threadName } = threadInfo;
      if (threadName === events[0].threadName) {
        const allEvent = collectSortedEvents(threadInfo);
        for (const event of allEvent) {
          if (isKernelEvent(event)) {
            earlastEvent = event;
            break;
          }
        }
      }
    }
  }

  if (earlastEvent) {
    const isContained = events.some(event => event.name === earlastEvent.name);
    if (isContained) {
      isFirst = true;
    }
  }

  return isFirst;
};

const lastEventFound = (events) => {
  let isLast = false;
  let lastKernelEvent;
  if (!events || events.length === 0) {
    return false;
  }
  for (const [processKey, processInfo] of Array.from(swimDataManager.processInfo.entries())) {
    for (const threadInfo of Array.from(processInfo.threads.values())) {
      const { threadName } = threadInfo;
      if (threadName === events[0].threadName) {
        const allEvent = collectSortedEvents(threadInfo);
        for (const event of allEvent) {
          if (isKernelEvent(event)) {
            lastKernelEvent = event;
          }
        }
      }
    }
  }

  if (lastKernelEvent) {
    const isContained = events.some(event => event.name === lastKernelEvent.name);
    if (isContained) {
      isLast = true;
    }
  }

  return isLast;
};

const calculateThreadHeadTime = (events)=> {
  let isFirst = firstEventFound(events);
  if (!isFirst) {
    return 0;
  }
  let i = 0;

  let headTime = 0;
  while (i < events.length && isBeginOrInitEvent(events[i].name || '')) {
    headTime += events[i].duration || 0;
    i++;
  }

  if (i >= events.length) {
    return 0;
  }

  const firstRound = extractEventIndex(events[i].name || '');
  if (firstRound === -1) {
    if (isKernelEvent(events[i])) {
      return headTime;
    }
    return headTime + (events[i].duration || 0);
  }

  if (!hasKernelInRound(events, i, firstRound)) {
    while (i < events.length) {
      const currentRound = extractEventIndex(events[i].name || '');
      if (currentRound !== firstRound) {
        break;
      }
      if (!isKernelEvent(events[i])) {
        headTime += events[i].duration || 0;
      }
      i++;
    }
    const remainingHeadTime = calculateThreadHeadTime(events.slice(i));
    return headTime + remainingHeadTime;
  }

  for (let j = i; j < events.length; j++) {
    const eventRound = extractEventIndex(events[j].name || '');
    if (eventRound !== -1 && eventRound !== firstRound) {
      break;
    }
    if (isKernelEvent(events[j])) {
      break;
    }
    headTime += events[j].duration || 0;
  }

  return headTime;
};

const calculateThreadTailTime = (events) => {
  let isLast = lastEventFound(events);
  if (!isLast) {
    return 0;
  }
  if (events.length === 0) {
    return 0;
  }

  let kernelIndex = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (isKernelEvent(events[i])) {
      kernelIndex = i;
      break;
    }
  }

  if (kernelIndex === -1) {
    return 0;
  }

  let validRound = -1;
  for (let i = kernelIndex + 1; i < events.length; i++) {
    if (!isKernelEvent(events[i])) {
      const round = extractEventIndex(events[i].name || '');
      if (round !== -1) {
        validRound = round;
        break;
      }
    }
  }

  if (validRound === -1) {
    return 0;
  }

  let tailTime = 0;
  for (let i = kernelIndex + 1; i < events.length; i++) {
    const eventRound = extractEventIndex(events[i].name || '');
    if (eventRound !== -1 && eventRound !== validRound) {
      break;
    }
    if (!isKernelEvent(events[i])) {
      tailTime += events[i].duration || 0;
    }
  }

  return tailTime;
};

const calculateAndAddCoreWaitTime = (aicpuThreadEvents, coreWaitEvents, startTime, endTime) => {
  let coreWaitTime = 0;

  let earliestKernelThreadEvents = null;
  let minKernelStartTime = Infinity;

  for (const threadEvents of aicpuThreadEvents) {
    const sortedEvents = [...threadEvents].sort((a, b) => a.startTime - b.startTime);
    for (const event of sortedEvents) {
      if (isKernelEvent(event)) {
        if (event.startTime < minKernelStartTime) {
          minKernelStartTime = event.startTime;
          earliestKernelThreadEvents = sortedEvents;
        }
        break;
      }
    }
  }

  if (earliestKernelThreadEvents) {
    coreWaitTime = calculateThreadHeadTime(earliestKernelThreadEvents);
  }

  if (measureDetailsData.value.length > 0) {
    measureDetailsData.value[measureDetailsData.value.length - 1].coreWaitTime = parseFloat(((coreWaitTime * 1000 / tsScale.value) / 1000).toFixed(2));
    measureDetailsData.value[measureDetailsData.value.length - 1].coreEventNum = coreWaitEvents.length;
  }

  calculateDeviceDataMap(coreWaitEvents, startTime, endTime);
};

const calculateDeviceDataMap = (coreWaitEvents, startTime, endTime) => {
  deviceDataMap.value.clear();

  const groupedEvents = new Map();

  for (const event of coreWaitEvents) {
    if (event.startTime >= startTime && event.endTime <= endTime) {
      const eventName = event.name;
      const duration = event.endTime - event.startTime;

      if (!groupedEvents.has(eventName)) {
        groupedEvents.set(eventName, []);
      }
      groupedEvents.get(eventName).push ({
        event,
        duration,
        threadName: event.threadName
      });
    }
  }

  for(const [eventName, events] of groupedEvents.entries()) {
    let maxDuration = 0;
    let maxDurationLine = '';
    let totalDuration = 0;

    for (const eventData of events) {
      const { duration, threadName } = eventData;
      totalDuration += duration;

      if (duration > maxDuration) {
        maxDuration = duration;
        maxDurationLine = threadName;
      }
    }

    const avgDuration = totalDuration / events.length;

    deviceDataMap.value.set(eventName, {
      'Event name': eventName,
      'Max duration line': maxDurationLine,
      'Max duration': parseFloat(((maxDuration * 1000 / tsScale.value) / 1000).toFixed(2)),
      'Avg duration': parseFloat(((avgDuration * 1000 / tsScale.value) / 1000).toFixed(2))
    });
  }
};

const calculateAndAddCoreExecutTime = (aicpuThreadEvents, startTime, endTime) => {
  let coreExecutTime = 0;

  let latestKernelThreadEvents = null;
  let maxKernelEndTime = 0;

  for (const threadEvents of aicpuThreadEvents) {
    const sortedEvents = [...threadEvents].sort((a, b) => a.startTime - b.startTime);
    for (let i = sortedEvents.length - 1; i >= 0; i--) {
      if (isKernelEvent(sortedEvents[i])) {
        if (sortedEvents[i].endTime > maxKernelEndTime) {
          maxKernelEndTime = sortedEvents[i].endTime;
          latestKernelThreadEvents = sortedEvents;
        }
        break;
      }
    }
  }

  if (latestKernelThreadEvents) {
    coreExecutTime = calculateThreadTailTime(latestKernelThreadEvents);
  }

  if (measureDetailsData.value.length > 0) {
    measureDetailsData.value[measureDetailsData.value.length - 1].coreExecutTime = parseFloat(((coreExecutTime * 1000 / tsScale.value) / 1000).toFixed(2));
  }
};

const collectThreadMeasureEvents = (thread, startTime, endTime) => {
  const result = { aicEvents: [], aivEvents: [], aicpuEvents: [], aicpuThreadEvents: [], coreWaitEvents: [], aicCount: 0, aivCount: 0, aicpuCount: 0 };
  if (thread.threadName.startsWith('AIC_')) {
    result.coreWaitEvents = processThreadEventSearchWithOriginalThreadName(thread, startTime, endTime);
    const matched = processThreadEventSearch(thread, startTime, endTime);
    if (matched.length) {
      result.aicCount = 1;
    }
    result.aicEvents = matched;
    result.aicpuThreadEvents = processAicpuThreadCoreEventSearch(thread, startTime, endTime);
  } else if (thread.threadName.startsWith('AIV_')) {
    result.coreWaitEvents = processThreadEventSearchWithOriginalThreadName(thread, startTime, endTime);
    const matched = processThreadEventSearch(thread, startTime, endTime);
    if (matched.length) {
      result.aivCount = 1;
    }
    result.aivEvents = matched;
    result.aicpuThreadEvents = processAicpuThreadCoreEventSearch(thread, startTime, endTime);
  } else if (thread.threadName.startsWith('AICPU-SCHED-')) {
    const matched = processAICPUThreadEventSearch(thread, startTime, endTime);
    if (matched.length) {
      result.aicpuCount = 1;
    }
    result.aicpuEvents = matched;
  } else if(thread.threadName.includes('AIC-') || thread.threadName.includes('AIV-')) {
    result.coreWaitEvents = processAicpuThreadCoreEventSearch(thread, startTime, endTime);
    result.aicpuThreadEvents = processAicpuThreadCoreEventSearch(thread, startTime, endTime);
  } else {}
  return result;
};

const measureDetailSearch = () => {
  measureDetailsData.value = [];
  rootHashes.value = [];
  leafHashes.value = [];
  leafHashMap.value.clear();
  deviceDataMap.value.clear();

  let startTime = measureDragStartTime.value;
  let endTime = measureDragEndTime.value;

  if (startTime > endTime) {
    const temp = startTime;
    startTime = endTime;
    endTime = temp;
  }

  const timeRange = endTime - startTime;
  const matchingAICEvents = [];
  const matchingAIVEvents = [];
  const matchingAICPUEvents = [];
  const allAicpuThreadEvents = [];
  const coreWaitEvents = [];

  let AICCount = 0;
  let AIVCount = 0;
  let AICPUCount = 0;

  const processedThreads = new Set();

  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    const processType = process.type || 'kernel';
    const isNotExcludedPerfSwim = (processType === 'PerfSwim' && process.name === 'AICore View') || 
                                  (processType === 'aicpu' && process.name === 'AICPU View');
    if (!(processExpanded.get(processKey) && (processType === 'kernel' || isNotExcludedPerfSwim))) {
      continue;
    }
    const { threads } = process;
    for (const [threadKey, thread] of threads.entries()) {
      const threadId = `${processKey}-${threadKey}`;
      processedThreads.add(threadId);
      const result = collectThreadMeasureEvents(thread, startTime, endTime);
      AICCount += result.aicCount;
      AIVCount += result.aivCount;
      AICPUCount += result.aicpuCount;
      matchingAICEvents.push(...result.aicEvents);
      matchingAIVEvents.push(...result.aivEvents);
      matchingAICPUEvents.push(...result.aicpuEvents);
      coreWaitEvents.push(...result.coreWaitEvents);
      if (result.aicpuThreadEvents.length > 0) {
        allAicpuThreadEvents.push(result.aicpuThreadEvents);
      }
    }
  }

  for (const [key, pinnedData] of pinnedThreads.entries()) {
    const { process, thread } = pinnedData;
    const processType = process.type || 'kernel';
    if (processType != 'kernel') {
      continue;
    }
    const threadId = `${pinnedData.processKey}-${pinnedData.threadKey}`;
    if (processedThreads.has(threadId)) {
      continue;
    }
    const result = collectThreadMeasureEvents(thread, startTime, endTime);
    AICCount += result.aicCount;
    AIVCount += result.aivCount;
    AICPUCount += result.aicpuCount;
    matchingAICEvents.push(...result.aicEvents);
    matchingAIVEvents.push(...result.aivEvents);
    matchingAICPUEvents.push(...result.aicpuEvents);
    coreWaitEvents.push(...result.coreWaitEvents);
    if (result.aicpuThreadEvents.length > 0) {
      allAicpuThreadEvents.push(result.aicpuThreadEvents);
    }
  }
  measureDetailGet(matchingAICEvents, matchingAIVEvents, timeRange, AICCount, AIVCount);
  calculateAndAddAICPUusage(matchingAICPUEvents, timeRange, AICPUCount);
  calculateAndAddCoreWaitTime(allAicpuThreadEvents, coreWaitEvents, startTime, endTime);
  calculateAndAddCoreExecutTime(allAicpuThreadEvents, startTime, endTime);
};

const intelligentSearch = () => {
  intelligentSearchHelper({
    measureDragStartX,
    measureDragEndX,
    measureDragStartY: measureDragStartY.value,
    measureDragEndY: measureDragEndY.value,
    measureDragStartTime,
    measureDragEndTime,
    xToTime,
    timeToX,
    childContextMap,
    processExpanded,
    pinnedThreads,
    pinnedthreadsComponent,
    renderFixedTimeline,
    renderTimeline,
    swimDataManager,
    isMixMode
  });
};

const setPageState = (message) => {
  userConfig.value = message.config;
  if (message.config && message.config.showPerformancePanel !== undefined) {
    performanceVisible.value = message.config.showPerformancePanel && !props.isThreeColumn && !isGuidePage.value;
  }

  modeOption.value = userConfig.value.kernelColorRending;
  hashOrderRending.value = userConfig.value.hashOrderRending;
  configComponent.value.connectionLevel = userConfig.value.connectionLevel;
  detailComponent.value.connectionLevel = userConfig.value.connectionLevel;
  configComponent.value.showPerformancePanel = userConfig.value.showPerformancePanel;
  configComponent.value.showIsMixMode = userConfig.value.showIsMixMode;
  nextTick(() => {
    const newMixMode = !props.isThreeColumn && userConfig.value.showIsMixMode;
    
    // 如果切换到Mix模式且有Mix数据，清空所有置顶线程
    if (newMixMode && swimDataManager.hasMixConfig() && pinnedThreadsList.value.length > 0) {
      clearAllPinned();
    }
    
    isMixMode.value = newMixMode;
  });
  if (message.comGraphPath) {
    bindFile.value = message.comGraphPath;
    bindButton.value = $t('unbindComGraph');
  }
  if (isLockStatus.value) {
    isLockStatus.value = false;
    window.ascEventBus.emit('deactivateLock');
  }
};

const onToggleSwimFullscreenFunction = () => {
  onToggleSwimFullscreen();
};

const onJumpCom = () => {
  const jumpType = 'nohash';
  server.jumpToComGraph({paramObj: { hash: jumpType }});
}; 

// 生命周期钩子
onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  cancelAnimationFrame(resizeRafId);
  clearTimeout(resizeFullRenderTimer);
  window.removeEventListener('mousemove', handleGlobalMouseMove);
  window.removeEventListener('keydown', handleGlobalKeyDown);
  window.removeEventListener('keyup', handleGlobalKeyUp);
  if (swimlaneContainer.value) {
    swimlaneContainer.value.removeEventListener('scroll', onVerticalScroll);
  }
  onVerticalScroll.cancel();
});

const locateEventBySeqNoTaskId = async (seqNo, taskId, native = null) => {
  native?.guard();
  if (isPerfSwim.value || isMsProf.value) {
    if (native) throw Error('TASK_NOT_FOUND');
    server.showMessage({ paramObj: { text: $t('swimGraphUnsupportedType') } });
    return;
  }
  const exact = native ? swimDataManager.getEventById(native.event_id) : null;
  const entry = native ? (exact && String(exact.args?.seqNo) === seqNo && String(exact.args?.taskId) === taskId ? {event: exact, processKey: exact.processKey} : null) : swimDataManager.getEventBySeqNoTaskId(seqNo, taskId);
  if (!entry) {
    if (native) throw Error('TASK_NOT_FOUND');
    server.showMessage({ paramObj: { text: $t('swimGraphNodeNotFound', { seqNo, taskId }) } });
    return;
  }
  const { event: foundEvent, processKey: foundProcessKey } = entry;
  if (!processExpanded.get(foundProcessKey)) {
    toggleProcess(foundProcessKey);
  }
  await nextTick();
  native?.guard();
  {
    const eventX = foundEvent.renderInfo?.x || 0;
    const eventW = foundEvent.renderInfo?.width || 0;
    const eventWidth = eventW * viewState.scale;
    const canvasCssWidth = viewState.canvasCssWidth || containerWidth.value;
    if (eventWidth < 160 && eventWidth > 0) {
      const zoomFactor = 160 / eventWidth;
      const screenCenterX = (eventX + eventW / 2) * viewState.scale + viewState.offsetX;
      timelineComponent.value?.changeScale(zoomFactor, screenCenterX, false, false);
    }
    const wasPanelClosed = !detailsPanelExpanded.value;
    selectEvent(foundEvent, foundProcessKey, true, !!native);
    if (wasPanelClosed) {
      await new Promise(resolve => {
        const detailPanel = document.querySelector('.details-panel');
        if (detailPanel) {
          detailPanel.addEventListener('transitionend', resolve, { once: true });
          setTimeout(resolve, 350);
        } else {
          resolve();
        }
      });
    }
    native?.guard();
    swimgraphHeaderComponent.value?.scrollToEventByDom(foundEvent, native ? 'instant' : 'smooth');
    const scaledCenterX = (eventX + eventW / 2) * viewState.scale;
    const targetOffsetX = (viewState.canvasCssWidth || canvasCssWidth) / 2 - scaledCenterX;
    const shift = targetOffsetX - viewState.offsetX;
    if (shift > 0) {
      swimgraphHeaderComponent.value?.rightmove(shift, true);
    } else if (shift < 0) {
      swimgraphHeaderComponent.value?.leftmove(-shift, true);
    }
  }
  return foundEvent;
};


let focusMounted = true;
onUnmounted(() => { focusMounted = false; });
const canFocusTask = () => focusMounted && traceReady.value && !loading.value && !!swimgraphHeaderComponent.value;
// The caller binds this component instance to an immutable dataset and guards every async boundary.
const focusTask = async (command, isCurrent) => {
  const guard = () => {
    if (!focusMounted || !isCurrent()) throw Error('SELECTION_CHANGED');
    if (document.visibilityState !== 'visible') throw Error('PAGE_NOT_VISIBLE');
  };
  guard();
  if (!canFocusTask()) throw Error('RENDER_NOT_READY');
  const event = await locateEventBySeqNoTaskId(command.task.seqNo, command.task.taskId, {event_id:command.task.event_id, guard});
  await nextTick();
  // Two frames allow selection and scroll-triggered canvas painting before acknowledgment.
  await new Promise((resolve, reject) => {
    let frame = 0;
    const timeout = setTimeout(() => { cancelAnimationFrame(frame); reject(Error('RENDER_NOT_READY')); }, 1000);
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => { clearTimeout(timeout); resolve(); }); });
  });
  guard();
  const processKey = CSS.escape(String(event.processKey));
  const process = swimlaneContainer.value?.querySelector(`[data-process-container="${processKey}"]`);
  const canvas = swimlaneContainer.value?.querySelector(`[data-process-key="${processKey}"]`);
  const scroll = isE2ESwim.value ? swimlaneContainer.value?.querySelector(swimDataManager.getProcess(event.processKey)?.type === 'aicpu' ? '.aicpu-section' : '.kernel-section') : swimlaneContainer.value;
  if (!process || !canvas || !scroll || !event.renderInfo) throw Error('TASK_NOT_VISIBLE');
  const rect = process.getBoundingClientRect(), viewport = scroll.getBoundingClientRect(), c = canvas.getBoundingClientRect();
  const x = c.left + event.renderInfo.x * viewState.scale + viewState.offsetX;
  const y = rect.top + event.renderInfo.y;
  const right = Math.min(c.right, viewport.right, window.innerWidth), bottom = Math.min(viewport.bottom, window.innerHeight);
  const visible = x < right && x + Math.max(1,event.renderInfo.width * viewState.scale) > Math.max(c.left,viewport.left,0) && y < bottom && y + event.renderInfo.height > Math.max(viewport.top,0);
  if (selectedEvent.value?.id !== event.id || !detailsPanelExpanded.value || !visible) throw Error('TASK_NOT_VISIBLE');
  return {event_id:event.id,seqNo:String(event.args.seqNo),taskId:String(event.args.taskId)};
};

watch(() => server.locateNodeResult?.value, (newVal) => {
  if (newVal && newVal.seqNo !== undefined && newVal.taskId !== undefined) {
    nextTick(() => {
      locateEventBySeqNoTaskId(newVal.seqNo, newVal.taskId);
    });
  }
});

onMounted(async () => {
  setupSwimWatchers();
  initEventListeners();
  loading.value = true;
  labelRender.value = true;
  const {
    server: { getOtherData, getData, getPerformanceInfo },
  } = useViewServer();

  loading.value = true;
  let data = {};
  const state = pullState();
  loadingText.value = $t('receiveTraceData');

  const resData = await getQuery();
  if (resData && resData.outputPath) {
    outPutPath.value = resData.outputPath;
  } else {
    outPutPath.value = '';
  }
  isGuidePage.value = resData?.isBootStep;

  let locateTargetObj = null;
  try {
    const res = await getOtherData();
    data.config = res.configuration;
    data.comGraphPath = res.comGraphPath;
    data.swimPath = res.swimPath;
    fileName.value = res.title;
    isPerfSwim.value = res.isPerfSwim;
    isMsProf.value = res.isMsProf || false;
    setDebugMode(res.isDebug || false);
    locateTargetObj = res.locateTarget;
  } catch (err) {
    console.log('parse other data error:', err);
  }

  const swimInfo = await getData({swimDataPath:state.swimDataPath}); 

  if (isDebugEnabled()) {
    const perfInfo = await getPerformanceInfo();
    setTotalStartTime(perfInfo.startTime);
    setTransformTime(perfInfo.transformStartTime);
    perfLogger.measure('transform data', perfInfo.transformStartTime);
  }

  loadingText.value = $t('receiveTraceData');

  if (swimInfo.meta) {
    data.swimData = parseCompressedData(swimInfo, processExpanded, perfLogger);
  } else {
    const originalReader = swimInfo.getReader();
    let result = await originalReader.read();
    while (!result.done) {
      const val = result.value;
      if (val.type == 'first') {
        data.swimData = val.data;
      } else {
        data.swimData.processes[val.processId].threads[val.threadId].events.push(...val.data);
      }
      result = await originalReader.read();
    }
  }

  setPageState(data);
  loadTraceData(data.swimData, locateTargetObj);

  if (BlockToGraphMap[currentActiveBlock.value] && BlockToGraphMap[currentActiveBlock.value] === 'swimGraph') {
    isSwimGraphActive.value = true;
  }

  updateTheme();
  listenExtensionMessage();
});

const containerStyles = computed(() => ({
  overflowY: isE2ESwim.value ? 'hidden' : 'auto',
  scrollbarGutter: !isE2ESwim.value ? 'stable' : 'auto'
}));

const containerWidth = computed(() => {
  if (!swimlaneContainer.value) {
    return 0;
  }
  return swimlaneContainer.value.clientWidth || 0;
});

const containerHeight = computed(() => {
  if (!swimlaneContainer.value) {
    return 0;
  }
  return swimlaneContainer.value.clientHeight || 0;
});
const postMessageInfo = (message) => {
  if (window.vscode) {
    server.showMessage({ paramObj: { text: message } });
  }
};
const isCoreUtilizationSupported = (isSelection, process = null) => {
  if (isMixMode.value && swimDataManager.hasMixConfig()) {
    postMessageInfo($t('mixUnavailableInfo'));
  }
  if (isMsProf.value) {
    postMessageInfo($t('MsProfUnavailableInfo'));
  }
  if (!isSelection) {
    return;
  }
  if (process.type === 'PerfSwim') {
    if (process.processName !== 'AICore View') {
      postMessageInfo($t('perfSwimUnavailableInfo'));
    }
  }
};
defineExpose({
  canFocusTask,
  focusTask,
  setPageState,
  loadTraceData,
  loading,
  labelRender,
  loadingText,
  validData,
  processExpanded,
});

provide('swimGraphContext', { addChildContext });

provide(SwimGraphStateKey, {
  detailsPanelExpanded,
});
// 提供搜索状态
provide('swimGraphSearch', { searchResult, currentResultIndex, isSearchActive, searchQuery, isCaseSensitive });

provide('swimGraphCfg', { userConfig });

// provide pmu info
provide('swimGraphPmuTotal', { pmuTotal, pmuValid });

// 提供置顶线程状态
provide('swimGraphPinnedState', {
  pinnedThreads,
  pinnedThreadsList,
  pinThread,
  unpinThread,
  recalculateOffsetY,
  clearAllPinned,
  pinnedMeasureInfo
});
 
// 提供状态给子组件
provide('swimGraphState', {
  tsScale,
  minTs,
  timelineComponent,
  viewState,
  layout,
  timeLineX,
  sliderValue,
  sliderMax,
  sliderMaxCount,
  initialScale,
  lastSelected,
  selectedEvent,
  canvasclickedEvent,
  pathLockedEvent,
  highlightedPaths,
  mixRelatedPaths,
  processExpanded,
  loading,
  detailsPanelExpanded,
  detailsCoresExpanded,
  swimlaneContainer,
  swimMainView,
  lane2line,
  timelineState,
  childContextMap,
  tooltip,
  tooltipStyle,
  lineTooltip,
  lineTooltipStyle,
  bindFile,
  bindButton,
  isMeasureModel,
  measureDragStartX,
  measureDragEndX,
  measureDragEndY,
  measureDragStartTime,
  measureDragEndTime,
  isDarkTheme,
  hasSplitThreads,
  mulDetailsExpanded,
  measureDetailsExpanded,
  measureDetailsData,
  rootHashes,
  leafHashes,
  leafHashMap,
  deviceDataMap,
  isLockStatus,
  dependencyLinesInfo,
  isCfgEditing,
  isShortcutKeyShow,
  isThreeColumn: props.isThreeColumn,
  searchedEvent,
  kernelColorRending: modeOption,
  labelRender,
  fileName,
  isSwimGraphActive,
  isSwimFullscreen,
  isPathLockStatus,
  isAicpu,
  isE2ESwim,
  isDeviceView,
  performanceVisible,
  performanceWidth,
  isWideScreen,
  isMaxSchedule,
  aicpuControlDetailsExpanded,
  aicpuCoreDetailsExpanded,
  aicpuScheduleDetailsExpanded,
  scheduleList,
  aicpuBuildTask,
  aicpuSchedTask,
  aicpuHasRelevent,
  aicpuScheduleEventMaps,
  pinnedthreadsComponent,
  aicpuScheduleMaps,
  kernelThreadData,
  isPerfSwim,
  isMsProf,
  globalMeasureCanvas,
  globalDependencyLinesInfo,
  isMixMode,
  globalConnectionCanvas,
  isFromPerformanceClick,
  isFromPerformancePmuTabClick,
  hashOrderRending,
  freezeVisibleRange,
  focusedWrapId,
  pathLockedWrapId,
  pathLockedHighlightStyle,
  pathLockedHighlightEvent,
  pathLockedHighlightProcessKey,
  draggingSelection,
  draggingSelectionProcessKey,
});

// 提供方法给子组件
provide('swimGraphMethods', {
  postMessage,
  render,
  renderFixedTimeline,
  renderTimeline,
  calculateGridInterval,
  toggleDetailsPanel,
  toggleDetailsCores,
  toggleProcess,
  selectEvent,
  findEventAtPosition,
  timeToX,
  exportRender,
  xToTime,
  xToFixedTime,
  durationToWidth,
  renderDependencyLines,
  resizeMeasure,
  renderEvent,
  transform,
  transformVerticalScroll,
  measureDetailGet,
  processThreadEventSearch,
  processAICPUThreadEventSearch,
  processAicpuThreadCoreEventSearch,
  processThreadEventSearchWithOriginalThreadName,
  calculateAndAddAICPUusage,
  calculateAndAddCoreWaitTime,
  calculateAndAddCoreExecutTime,
  getDisplayName,
  resetState,
  overflowText,
  guideRestore,
  showMaxScheduleEvent,
  resetMaxScheduleState,
  drawMeasureTime,
  setMeasureDragHeight,
  autoExpandkernelProcess,
  postMessageInfo,
  clearHeadState: () => {
    return swimgraphHeaderComponent?.value.clearHeadState();
  },
  dynamicWidthStyle,
  resetsearchState: (needSelectEvent=true) => {
    return swimgraphHeaderComponent?.value.resetsearchState(needSelectEvent);
  },
  showDependencies: (e, mode) => {
    return detailComponent?.value.showDependencies(e, mode);
  },
  scrollToEvent: (e) => {
    return swimgraphHeaderComponent?.value.scrollToEvent(e);
  },
  highlightDependencyEvent: (event) => {
    dependencyHighlightEvent.value = event;
    transform();
  },
  getTimelineCanvas: () => {
    return timelineComponent?.value.timelineCanvas;
  },
  handleWheel: (e) => {
    timelineComponent?.value.handleWheel(e);
  },
  flagRender: () => {
    timelineComponent?.value.flagRender();
  },
  leftmove: (step, forceTransform) => {
    swimgraphHeaderComponent?.value.leftmove(step, forceTransform);
  },
  rightmove: (step, forceTransform) => {
    swimgraphHeaderComponent?.value.rightmove(step, forceTransform);
  },
  changeScale: (zoomFactor, centerPositionX, needRender = true, isManual = true) => {
    timelineComponent?.value.changeScale(zoomFactor, centerPositionX, needRender, isManual);
  },
  onToggleSwimFullscreenFunction,
  canvasStatusReset: () => {
    childContextMap.threadEvent.canvasStatusReset();
  },
  pinnedDrawLine: (x, color, flag) => {
    pinnedthreadsComponent?.value?.pinnedDrawLine(x, color, flag);
  },
  pinnedEraseLine: (flag) => {
    pinnedthreadsComponent?.value?.pinnedEraseLine(flag);
  },
  highlightPinnedEvent: (event, isTemp) => {pinnedthreadsComponent?.value?.highlightPinnedEvent(event, true, true, isTemp)},
  drawFixedTimelineSlider,
  drawEventThread: (thread, eventCtx, threadY, processKey) => {
    childContextMap.threadEvent.drawEventThread(thread, eventCtx, threadY, processKey);
  },
  showTooltip: (e, event) => {
    childContextMap.threadEvent.showTooltip(e, event);
  },
  renderThreadText: (thread, ctx, selectedInfo, isHighlighting, isAicpuProcess) => {
    childContextMap.threadEvent.renderThreadText(thread, ctx, selectedInfo, isHighlighting, isAicpuProcess);
  },
  handleKernalEventColors,
  findWrapAtPosition,
  drawClickWrapContainner: (event, ctx) => {
    childContextMap.threadEvent.drawClickWrapContainner(event, ctx);
  },
  renderDimmedNodesInWrap: (event, ctx)=> {
    childContextMap.threadEvent.renderDimmedNodesInWrap(event, ctx);
  },
  changeNodeColor: (processKey, isDimmed)=> {
    childContextMap.threadEvent.changeNodeColor(processKey, isDimmed);
  },
  fillTextInfo: (event, ctx, drawData, isTextXChange, isAicpuProcess) => {
    childContextMap.threadEvent.fillTextInfo(event, ctx, drawData, isTextXChange, isAicpuProcess);
  },
  setHashOrderTipColor,
  isCoreUtilizationSupported,
  updatePathLockedHighlightOnTransform: ()=> {
    childContextMap.threadEvent.updatePathLockedHighlightOnTransform();
  },
  showPathLockedHighlight: (event, processKey)=> {
    childContextMap.threadEvent.showPathLockedHighlight(event, processKey);
  },
  hidePathLockedHighlight: ()=> {
    childContextMap.threadEvent.hidePathLockedHighlight();
  },
});
watch(isDarkTheme, () => {
  updateTheme();
  transform();
});

watch(isMixMode, () => {
  initCanvases();
  resizeCanvases();
  transform();
});

watch(currentActiveBlock, (val) => {
  if (val) {
    isSwimGraphActive.value = val && BlockToGraphMap[val] === 'swimGraph';
  }
});

const updateTheme = () => {
  iconPath3.value = isDarkTheme.value
    ? `${window.staticPath}/static-assets/icon_title_3.svg`
    : `${window.staticPath}/static-assets/icon_title_3_light.svg`;
  down_16px.value = isDarkTheme.value
    ? `${window.staticPath}/static-assets/down_16px.svg`
    : `${window.staticPath}/static-assets/down_16px_light.svg`;
};
// 监听引导模式的消息
const listenExtensionMessage = () => {
  window.ascEventBus.on('boot-step-tips', async (event) => {
    const message = event.data;
    if (event.type === 'welcomeSkipAll') {
      server.closeWebview();
    }
    if (event.type == 'callWebviewMethod') {
      switch (message.methodName) {
        case 'showGuideDetailsPanel':
          await guideRestore();
          getEventInfo();
          break;
        case 'measureDetailSearch': {
          await guideRestore();
          const totalWidth = viewState.canvasCssWidth + layout.processLabelWidth;
          measureDragStartX.value = totalWidth * (1 / 4);
          measureDragEndX.value = totalWidth * (3 / 4);
          isMeasureDragging.value = true;
          isMeasureModel.value = true;
          showDragAreaBorders.value = true;
          const element = document.querySelector('.zoom-controls');
          element.style.border = '';
          measureMouseUp();
          setMeasureDragHeight();
          break;
        }
        case 'zoomControls': {
          await guideRestore();
          clearMeasureDetailSearch();
          break;
        }
        case 'guideLink': {
          await guideRestore();
          const component = timelineComponent.value;
          const ctx = component.fixedtimelineCtx;
          const domRect = document.createElement('div');
          domRect.id = 'timeline-middle-virtual';
          domRect.style.position = 'absolute';
          domRect.style.left = ((viewState.canvasCssWidth - layout.processLabelWidth) / 2) + 'px';
          domRect.style.top = '90px';
          domRect.style.width = '10px';
          domRect.style.height = '3px';
          domRect.style.backgroundColor = 'red';
          ctx.canvas.parentNode.appendChild(domRect);
          break;
        }
        case 'viewThreeColumnGraph': {
          window.ascEventBus.emit('returnSemanticLabelFromCode', { label: '' });
          window.ascEventBus.emit('deactivateLock', '');
          guideRestore();
          break;
        }
        default:
          break;
      }
    }
  });
};
const clearMeasureDetailSearch = () => {
  mulDetailsExpanded.value = false;
  measureDetailsExpanded.value = false;
  measureDragStartX.value = 0;
  measureDragEndX.value = 0;
  isMeasureDragging.value = false;
  showDragAreaBorders.value = false;
  isMeasureModel.value = false;
  measureDragHeight.value = graphProcessesComponent.value.getProcessContainerHeight();
  document.documentElement.style.setProperty('--maskHeight', `0px`);
  renderTwoTimeline();
};
const getEventInfo = (flag) => {
  for (const [processKey, process] of swimDataManager.getAllProcesses().entries()) {
    if (!processExpanded.get(processKey)) {
      continue;
    }
    const thread = process.threads.get(swimConfig.threadKey);
    if (!thread || thread.eventIds.length === 0) {
      continue;
    }
    let matchedEventId = thread.eventIds.find(eventId => swimDataManager.getEventById(eventId).name === swimConfig.sampleEventNamePre);
    const [firstEventId] = thread.eventIds;
    const targetEventId = matchedEventId ?? firstEventId;
    if (targetEventId) {
      selectEvent(swimDataManager.getEventById(targetEventId), processKey);
      return;
    }
  }
};
</script>
<style>
@import url('css/common.css');
</style>
<style scoped>
@import url('css/mainGraph.css');
</style>