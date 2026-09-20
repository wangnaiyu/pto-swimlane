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
  <div class="thread-labels" :style="{ width: layout.processLabelWidth + 'px' }">
<template v-if="isMixMode && swimLaneOrder.length > 0">
      <div 
        v-for="(lane, index) in swimLaneOrder" 
        :key="index"  
        class="thread-labels-loop"
        :class="{ 'active': `${processKey}-${index}` === curThread, 'activeS': lane.type === 'thread' && activeThreadId === `${processKey}-${lane.thread.tid}` }"
        :style="{ height: lane.height + 'px' }"
        @mouseover="handleMixLabelHover(lane, index)"
        @mouseleave="handleMixLabelLeave(index)"
      >
        <div 
          v-if="lane.type === 'wrap-label'"
          class="thread-label-item wrap-label-item"
          :style="{ height: lane.height + 'px', lineHeight: lane.height + 'px', color: isDarkTheme ? '#666666' : '#C9C9C9', fontSize: '12px' }"
        >
          {{ index === firstWrapLabelIndex ? $t('mixTasks') : '' }}
        </div>
        <template v-else-if="lane.type === 'thread'">
          <!-- 取消置顶图标 - 直接检查线程是否在 pinnedThreadsList 中 -->
          <d-tooltip :content="$t('unpinThread')" position="right" v-if="isThreadPinned(lane.thread)">
            <d-icon
              name="icon-pushpin-fill"
              class="pin-icon-position unpin-icon"
              @click="handleMixUnpin(lane.thread)"
            >
            </d-icon>
          </d-tooltip>
          <!-- 置顶图标 -->
          <d-tooltip :content="$t('pinThread')" position="right" v-if="!isThreeColumn && hoveredThreadIndex === index && !isThreadPinned(lane.thread)">
            <d-icon 
              :name="isHoveringPinIcon ? 'icon-pushpin-fill' : 'icon-pushpin'"
              class="pin-icon-position pin-icon"
              @click="handleMixPinThread(lane.thread)"
              @mouseenter="isHoveringPinIcon = true"
              @mouseleave="isHoveringPinIcon = false"
            >
            </d-icon>
          </d-tooltip>
          <div 
            class="thread-label-item"
            :class="[{ 'has-threads-box': isCoreThread(lane.thread.threadName) || lane.thread.parentTid !== undefined || isAicpuThread(lane.thread.threadName) }]"
            :style="{ height: lane.height + 'px' }"
          >
            {{ getDisplayThreadName(lane.thread) }}
            <div class="fake-core-tip" v-if="lane.thread.threadName.includes('Fake')">
              <d-tooltip :content="$t('FakeCoreTip')">
                <d-icon name="helping" size="16px"></d-icon>
              </d-tooltip>
            </div>
          </div>
          <div 
            class="threads-box" 
            v-if="isPrefProcess || isAicpuProcess || isCoreThread(lane.thread.threadName) || lane.thread.parentTid !== undefined || isAicpuThread(lane.thread.threadName)" 
            :style="{'--thread-fill-width': threadFillWidth(lane.thread.tid, selectedOption) + '%', '--thread-fill-width-complement': (100 - threadFillWidth(lane.thread.tid, selectedOption)) + '%', 
            }"
          >
            <div class="threads-fill" :style="{ width: threadFillWidth(lane.thread.tid, selectedOption) + '%', 'background': getBackground(lane.thread.tid, selectedOption)}"></div>
            <div class="threads-text" :class="{ 'utilization-text': selectedOption === 'utilization' }"> {{ threadTotaltime(lane.thread.tid, selectedOption) }}</div>
          </div>
        </template>
      </div>
    </template>
    <template v-else>
      <!-- Conditional rendering for split threads vs normal threads -->
      <template v-if="hasSplitThreads">
        <!-- Four-column layout for split threads -->
        <div class="thread-labels-container" :style="{ width: layout.processLabelWidth + 'px' }">
          
          <!-- Column 1: Pin buttons (36px) -->
          <div class="pin-column">
            <div 
              v-for="group in threadGroups"
              :key="group.parentTid"
              class="pin-cell"
              :style="{ height: group.totalHeight + 'px' }"
              @mouseover="hoveredGroupParentTid = group.parentTid"
              @mouseleave="hoveredGroupParentTid = null; isHoveringPinIcon = false"
            >
              <!-- Always show unpin icon when group is pinned -->
              <d-tooltip v-if="isGroupPinned(group)" :content="$t('unpinThread')" position="right">
                <d-icon name="icon-pushpin-fill" class="unpin-icon" @click="handlePinGroupThread(group)" />
              </d-tooltip>
              <!-- Show pin icon only on hover when not pinned -->
              <d-tooltip v-else-if="hoveredGroupParentTid === group.parentTid" :content="$t('pinThread')" position="right">
                <d-icon
                  :name="isHoveringPinIcon ? 'icon-pushpin-fill' : 'icon-pushpin'"
                  class="pin-icon"
                  @click="handlePinGroupThread(group)"
                  @mouseenter="isHoveringPinIcon = true"
                  @mouseleave="isHoveringPinIcon = false"
                />
              </d-tooltip>
            </div>
          </div>
          
          <!-- Column 2: Group headers (50px) -->
          <div class="group-header-column">
            <div 
              v-for="group in threadGroups"
              :key="group.parentTid"
              class="group-header-cell"
              :style="{ height: group.totalHeight + 'px' }"
              @mouseover="hoveredGroupParentTid = group.parentTid"
              @mouseleave="hoveredGroupParentTid = null"
            >
              <d-tooltip :content="group.parentThreadName" position="right">
                <div class="group-header-text">
                  {{ group.parentThreadName }}
                </div>
              </d-tooltip>
            </div>
          </div>
          
          <!-- Column 3+4: Thread content -->
          <div class="threads-content-column">
            <div 
              v-for="(threadEntry, index) in process.threads"
              :key="threadEntry[0]"
              class="thread-row"
              :style="{ height: getThreadHeight(processKey, threadEntry[1].tid, lane2line, layout, threadEntry[1].isCounter) + 'px' }"
              :class="{
                'active': `${props.processKey}-${index}` === curThread,
                'activeS': activeThreadId === `${props.processKey}-${threadEntry[1].tid}`
              }"
              @mouseover="handleLabelHover(index); hoveredGroupParentTid = threadEntry[1].parentTid"
              @mouseleave="handleLabelLeave(index); hoveredGroupParentTid = null"
            >
              <!-- Column 3: Thread name -->
              <div class="thread-name">
                {{ getDisplayThreadName(threadEntry[1]) }}
              </div>
              
              <!-- Column 4: Threads box -->
              <div 
                class="threads-box"
                v-if="isPrefProcess || isAicpuProcess || isCoreThread(threadEntry[1].threadName) || isAicpuThread(threadEntry[1].threadName)"
                :style="{
                  '--thread-fill-width': threadFillWidth(threadEntry[1].tid, selectedOption) + '%',
                  '--thread-fill-width-complement': (100 - threadFillWidth(threadEntry[1].tid, selectedOption)) + '%'
                }"
              >
                <div 
                  class="threads-fill"
                  :style="{
                    width: threadFillWidth(threadEntry[1].tid, selectedOption) + '%',
                    background: getBackground(threadEntry[1].tid, selectedOption)
                  }"
                />
                <div 
                  class="threads-text"
                  :class="{ 'utilization-text': selectedOption === 'utilization' }"
                >
                  {{ threadTotaltime(threadEntry[1].tid, selectedOption) }}
                </div>
                <div 
                  class="average-line"
                  :style="{ left: averageValue + '%' }"
                />
              </div>
            </div>
          </div>
          
        </div>
      </template>
      
      <!-- Single-column layout for normal threads -->
      <template v-else>
        <div 
          v-for="(threadEntry, index) in process.threads"
          :key="threadEntry[0]"
          class="thread-labels-loop"
          :class="{
            'active': `${props.processKey}-${index}` === curThread,
            'activeS': activeThreadId === `${props.processKey}-${threadEntry[1].tid}`
          }"
          @mouseover="handleLabelHover(index)"
          @mouseleave="handleLabelLeave(index)"
        >
          <!-- 取消置顶图标 -->
          <d-tooltip :content="$t('unpinThread')" position="right" v-if="threadEntry[1].isPinned">
            <d-icon
              name="icon-pushpin-fill"
              class="pin-icon-position unpin-icon"
              @click="handleUnpin(threadEntry[0])"
            />
          </d-tooltip>
          <!-- 置顶图标 -->
          <d-tooltip :content="$t('pinThread')" position="right" v-if="!isThreeColumn && hoveredThreadIndex === index && !threadEntry[1].isPinned">
            <d-icon
              :name="isHoveringPinIcon ? 'icon-pushpin-fill' : 'icon-pushpin'"
              class="pin-icon-position pin-icon"
              @click="handlePinThread(threadEntry[0])"
              @mouseenter="isHoveringPinIcon = true"
              @mouseleave="isHoveringPinIcon = false"
            />
          </d-tooltip>
          
          <div
            class="thread-label-item"
            :class="[{ 'has-threads-box': isCoreThread(threadEntry[1].threadName) || isAicpuThread(threadEntry[1].threadName) }]"
            :style="{ height: getThreadHeight(processKey, threadEntry[1].tid, lane2line, layout, threadEntry[1].isCounter) + 'px' }"
          >
            {{ getDisplayThreadName(threadEntry[1]) }}
            <div class="fake-core-tip" v-if="threadEntry[1].threadName.includes('Fake')">
              <d-tooltip :content="$t('FakeCoreTip')">
                <d-icon name="helping" size="16px"></d-icon>
              </d-tooltip>
            </div>
          </div>
          
          <div
            class="threads-box"
            v-if="isPrefProcess || isAicpuProcess || isCoreThread(threadEntry[1].threadName) || isAicpuThread(threadEntry[1].threadName)"
            :style="{
              '--thread-fill-width': threadFillWidth(threadEntry[1].tid, selectedOption) + '%',
              '--thread-fill-width-complement': (100 - threadFillWidth(threadEntry[1].tid, selectedOption)) + '%'
            }"
          >
            <div class="threads-fill" :style="{ width: threadFillWidth(threadEntry[1].tid, selectedOption) + '%', background: getBackground(threadEntry[1].tid, selectedOption) }"/>
            <div class="threads-text" :class="{ 'utilization-text': selectedOption === 'utilization' }">{{ threadTotaltime(threadEntry[1].tid, selectedOption) }}</div>
            <div class="average-line" :style="{ left: averageValue + '%' }"/>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getThreadHeight, getDisplayThreadName } from '../swimGraphUtils';
import { swimDataManager } from '../swimData';
import { intervalUtilization, formatUtilization } from '../statistics';

const { t: $t } = useI18n();
const { isDarkTheme } = inject('root');

// 注入父组件提供的状态
const {
  layout,
  lane2line,
  isThreeColumn,
  viewState,
  isMixMode,
} = inject('swimGraphState');
const {
  postMessageInfo,
} = inject('swimGraphMethods');
const swimLaneOrder = computed(() => {
  if (!isMixMode?.value) {
    return [];
  }
  return swimDataManager.getSwimLaneOrder();
});

const isThreadPinned = (thread) => {
  const identifier = thread.isCounter ? thread.threadName : thread.tid;
  return pinnedThreadsList.value.some(p => {
    const pinnedIdentifier = p.thread?.isCounter ? p.thread?.threadName : p.thread?.tid;
    return pinnedIdentifier === identifier;
  });
};

const firstWrapLabelIndex = computed(() => {
  const order = swimLaneOrder.value;
  for (let i = 0; i < order.length; i++) {
    if (order[i].type === 'wrap-label') {
      return i;
    }
  }
  return -1;
});

const {
  searchResult,
  currentResultIndex
} = inject('swimGraphSearch');

const curThread = inject('curThread');
const { cycleDisplay, selectedOption, options } = inject('swimCycleDisplay');

// 注入置顶线程状态
const { pinThread, unpinThread, pinnedThreadsList } = inject('swimGraphPinnedState');

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

const averageValue = ref(0);
const hoveredThreadIndex = ref(-1);
const isHoveringPinIcon = ref(false);
const hoveredGroupParentTid = ref(null);

const isAicpuProcess = computed(() => {
  const process = swimDataManager.getProcess(props.processKey);
  if (process) {
    return process.type === 'aicpu';
  }
  return false;
});

const isAicpuThread = (threadName) => {
  return threadName.includes('AICPU-CTRL') || threadName.includes('AICPU-SCHED');
};
const isCoreThread = (threadName) => {
  return threadName.includes('AIV_') || threadName.includes('AIC_') || threadName.includes('AIV-') || threadName.includes('AIC-');
};

const isPrefProcess = computed(() => {
  const process = swimDataManager.getProcess(props.processKey);
  if (process) {
    return process.type === 'PerfSwim';
  }
  return false;
});

const threadGroups = computed(() => {
  let hasSplitThreads = false;
  for (const thread of props.process.threads.values()) {
    if (thread.parentTid !== undefined) {
      hasSplitThreads = true;
      break;
    }
  }
  
  if (!hasSplitThreads) {
    return [];
  }
  
  const groups = new Map();
  
  for (const [tid, thread] of props.process.threads) {
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
      group.threads.push(thread);
      
      const height = getThreadHeight(
        props.processKey,
        thread.tid,
        lane2line,
        layout,
        thread.isCounter
      );
      group.totalHeight += height;
    }
  }
  
  return Array.from(groups.values());
});

const hasSplitThreads = computed(() => {
  for (const thread of props.process.threads.values()) {
    if (thread.parentTid !== undefined) {
      return true;
    }
  }
  return false;
});

const calculateThreadCycles = (allProcesses, proKey) => {
  if (isAicpuProcess.value) {
    cycleDisplay.value = 'none';
    options.splice(0, options.length, ...options.filter(option => option.value !== 'clockCycle' && option.value !== 'cacheHit'));
    return [null, null];
  }
  const threadCyclesMap = new Map();
  const threadCacheHitMap = new Map();
  const { threads = new Map() } = allProcesses.get(proKey) || {};
  let hasPmu = false;
  for(const [threadKey, thread] of threads) {
    let totleCycles = 0n;
    let icacheMiss = 0n;
    let icacheReq = 0n;
    if (isCoreThread(thread.threadName) || thread.parentTid !== undefined) {
      for (const eventId of thread.eventIds) {
        const event = swimDataManager.getEventById(eventId);
        if (!event['pmu_info'] || Object.keys(event['pmu_info']).length === 0) {
          cycleDisplay.value = 'none';
          options.splice(0, options.length, ...options.filter(option => option.value !== 'clockCycle' && option.value !== 'cacheHit'));
          return [null, null];
        }
        if (event['pmu_info']['total cycle'] == 0 || event['pmu_info']['total cycle']==undefined) {
          continue;
        }
        hasPmu = true;
        totleCycles += BigInt(event['pmu_info']['total cycle']);
        icacheMiss += BigInt(event['pmu_info']['icache_miss']);
        icacheReq += BigInt(event['pmu_info']['icache_req']);
      }
      cycleDisplay.value = 'flex';
      threadCyclesMap.set(thread.tid, totleCycles.toString());
      const missRate = Number(icacheMiss) / Number(icacheReq);
      threadCacheHitMap.set(thread.tid, (1 - missRate).toString());
    }
  }
  if (!hasPmu) {
    cycleDisplay.value = 'none';
    options.splice(0, options.length, ...options.filter(option => option.value !== 'clockCycle' && option.value !== 'cacheHit'));
    return [null, null];
  }
  return [threadCyclesMap, threadCacheHitMap];
};

const calculateThreadTask = (allProcesses, proKey) => {
  const threadTaskMap = new Map();
  const currentProcess = allProcesses.get(proKey);
  const { threads = new Map() } = currentProcess || {};
  
  for (const [threadKey, thread] of threads) {
    const typeValided = isPrefProcess.value || isAicpuProcess.value;
    const nameValided = isCoreThread(thread.threadName) || isAicpuThread(thread.threadName);
    const isSplitThread = thread.parentTid !== undefined;
    if (typeValided || nameValided || isSplitThread) {
      threadTaskMap.set(thread.tid, thread.eventIds.length);
    }
  }
  if (cycleDisplay.value === 'none') {
    // 设置默认显示选项
    if (isAicpuProcess.value) {
       selectedOption.value = 'utilization';
    } else {
       selectedOption.value = 'task';
    }
  }
  return threadTaskMap;
};

const calculateThreadUtilization = (allProcesses, proKey) => {
  const threadUtilizationMap = new Map();
  const currentProcess = allProcesses.get(proKey);
  const { threads = new Map() } = currentProcess || {};
  
  for (const [, thread] of threads) {
    if (thread.isCounter) continue;
    const events = swimDataManager.getEventsByIds(thread.eventIds);
    threadUtilizationMap.set(thread.tid, intervalUtilization(events, viewState.minTime, viewState.maxTime));
  }
  return threadUtilizationMap;
};

const calculateThreadExecUtilization = (allProcesses, proKey) => {
  const threadExecUtilizationMap = new Map();
  const currentProcess = allProcesses.get(proKey);
  const { threads = new Map() } = currentProcess || {};
  
  for (const [, thread] of threads) {
    if (thread.isCounter) continue;
    const events = swimDataManager.getEventsByIds(thread.eventIds);
    let executionEvents;
    if (thread.threadName.startsWith('AICPU-SCHED-')) {
      executionEvents = events.filter(e => e.name?.startsWith('DEV_TASK_SCHED_EXEC'));
    } else if (thread.threadName.startsWith('AIC_') || thread.threadName.startsWith('AIV_')) {
      executionEvents = events.filter(e => !e.originalThreadName);
    }
    threadExecUtilizationMap.set(thread.tid, executionEvents?.length
      ? intervalUtilization(executionEvents, viewState.minTime, viewState.maxTime) : null);
  }
  return threadExecUtilizationMap;
};

const [threadCyclesMap, threadCacheHitMap] = calculateThreadCycles(swimDataManager.getAllProcesses(), props.processKey);
const threadTaskMap = calculateThreadTask(swimDataManager.getAllProcesses(), props.processKey);
const threadUtilizationMap = calculateThreadUtilization(swimDataManager.getAllProcesses(), props.processKey);
const threadExecUtilizationMap = calculateThreadExecUtilization(swimDataManager.getAllProcesses(), props.processKey);

const getBackground = (threadId, option) => {
  let values;
  let utilization;
  if (option === 'clockCycle' && threadCyclesMap) {
    values = Array.from(threadCyclesMap.values()).map(value => BigInt(value));
    if (values.every((value, _, arr) => value === arr[0])) {
      return 'var(--devui-timebar-bg)';
    }
  } else if (option === 'task' && threadTaskMap) {
    values = Array.from(threadTaskMap.values());
    if (values.every((value, _, arr) => value === arr[0])) {
      return 'var(--devui-timebar-bg)';
    }
  } else if (option === 'utilization' && threadUtilizationMap) {
    utilization = threadUtilizationMap.get(threadId);
    if (utilization < 50 || utilization === 50) {
      return 'var(--devui-timefull-bg)';
    } else {
      return 'var(--devui-timebar-bg)';
    }
  } else if (option === 'execUtilization' && threadExecUtilizationMap) {
    utilization = threadExecUtilizationMap.get(threadId);
    if (utilization !== undefined) {
      if (utilization < 50 || utilization === 50) {
        return 'var(--devui-timefull-bg)';
      } else {
        return 'var(--devui-timebar-bg)';
      }
    }
    return 'var(--devui-timebar-bg)';
  } else if (option === 'cacheHit' && threadCacheHitMap) {
    values = Array.from(threadCacheHitMap.values()).map(value => Number(value));
    if (values.every((value, _, arr) => value === arr[0])) {
      return 'var(--devui-timebar-bg)';
    }
  } else {
    return 'var(--devui-timebar-bg)';
  }
  return threadFillWidth(threadId, option) === 100 ? 'var(--devui-timefull-bg)' : 'var(--devui-timebar-bg)';
};

const threadTotaltime = (threadId, option) => {
  if (option === 'clockCycle' && threadCyclesMap) {
    return threadCyclesMap.get(threadId);
  } else if (option === 'task' && threadTaskMap) {
    return threadTaskMap.get(threadId);
  } else if (option === 'utilization' && threadUtilizationMap) {
    return formatUtilization(threadUtilizationMap.get(threadId));
  } else if (option === 'execUtilization' && threadExecUtilizationMap) {
    const execUtil = threadExecUtilizationMap.get(threadId);
    return formatUtilization(execUtil);
  } else if (option === 'cacheHit' && threadCacheHitMap) {
    const hitRate = threadCacheHitMap.get(threadId);
    if (hitRate) {
      return parseFloat(hitRate).toFixed(2);
    }
  } else {
    return 0;
  }
  return 0;
};

const threadFillWidth = (threadId, option) => {
  let values;
  if (option === 'clockCycle' && threadCyclesMap) {
    const currenThreadTime = BigInt(threadCyclesMap.get(threadId));
    let maxThreadTime = 0n;
    values = Array.from(threadCyclesMap.values()).map(value => BigInt(value));
    let sum = 0n;
    maxThreadTime = values.reduce((max, value) => max > value ? max : value);
    sum = values.reduce((acc, value) => acc + value, 0n);
    const average = Number(sum) / values.length;
    averageValue.value = (average / Number(maxThreadTime)) * 100;
    return (Number(currenThreadTime) / Number(maxThreadTime)) * 100;
  } else if (option === 'task' && threadTaskMap) {
    values = Array.from(threadTaskMap.values());
    const maxTaskNum = values.length > 0 ? Math.max(...values) : 0;
    averageValue.value = ((values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0) / maxTaskNum) * 100;
    return (threadTaskMap.get(threadId) / maxTaskNum) * 100;
  } else if (option === 'utilization' && threadUtilizationMap) {
    averageValue.value = 50;
    return threadUtilizationMap.get(threadId) ?? 0;
  } else if (option === 'execUtilization' && threadExecUtilizationMap) {
    averageValue.value = 50;
    const execUtil = threadExecUtilizationMap.get(threadId);
    return execUtil !== undefined ? Number(execUtil) : 0;
  } else if (option === 'cacheHit' && threadCacheHitMap) {
    const currenThreadHit = Number(threadCacheHitMap.get(threadId));
    let maxThreadHit = 0;
    values = Array.from(threadCacheHitMap.values()).map(value => Number(value));
    let sum = 0;
    maxThreadHit = values.reduce((max, value) => max > value ? max : value);
    sum = values.reduce((acc, value) => acc + value, 0);
    const average = sum / values.length;
    averageValue.value = (average / maxThreadHit) * 100;
    return (currenThreadHit / maxThreadHit) * 100;
  } else {
    return 0;
  }
};

const handleLabelHover = (threadIndex) => {
  let hoverId = `${props.processKey}-${threadIndex}`;
  if (hoverId != curThread.value) {
    curThread.value = hoverId;
  }
  hoveredThreadIndex.value = threadIndex;
};

const handleLabelLeave = (threadIndex) => {
  hoveredThreadIndex.value = -1;
  isHoveringPinIcon.value = false;
};

const handleMixLabelHover = (lane, index) => {
  if (lane.type === 'thread') {
    const hoverId = `${props.processKey}-${index}`;
    if (hoverId !== curThread.value) {
      curThread.value = hoverId;
    }
    hoveredThreadIndex.value = index;
  }
};

const handleMixLabelLeave = (index) => {
  hoveredThreadIndex.value = -1;
  isHoveringPinIcon.value = false;
};

const handleMixPinThread = (thread) => {
  // Mix模式下有Mix数据时，不允许置顶
  if (isMixMode?.value && swimDataManager.hasMixConfig()) {
    postMessageInfo($t('mixModeNotSupportPin'));
    return;
  }
  
  if (!thread) {
    return;
  }
  
  const threadKey = thread.isCounter ? thread.threadName : String(thread.tid);
  let pinnedY = 0;
  for (const pinnedThread of pinnedThreadsList.value) {
    const t = pinnedThread.thread;
    const tk = t.isCounter ? t.threadName : String(t.tid);
    const lc = lane2line.get(`${pinnedThread.processKey}@${tk}`) || 1;
    pinnedY += layout.threadHeight * lc;
  }
  const lc = thread.isCounter ? 1 : (lane2line.get(`${props.processKey}@${threadKey}`) || 1);
  const swimLaneOrderlist = swimDataManager.getSwimLaneOrder();

  let laneY = 0;
  const threadIdentifier = thread.isCounter ? thread.threadName : String(thread.tid);
  for (const lane of swimLaneOrderlist) {
    if (lane.type === 'thread') {
      const laneIdentifier = lane.thread.isCounter ? lane.thread.threadName : String(lane.thread.tid);
      if (laneIdentifier === threadIdentifier) {
        laneY = lane.y;
        lane.thread.isPinned = true;
        break;
      }
    }
  }
  
  const offsetY = laneY - pinnedY;
  const threadKeyInfo = `${props.processKey}-${threadKey}`;
  pinThread(props.processKey, threadKeyInfo, offsetY);
};

const handleMixUnpin = (thread) => {
  if (!thread) {
    return;
  }
  
  const identifier = thread.isCounter ? thread.threadName : String(thread.tid);
  
  // 从 pinnedThreadsList 中找到对应的 threadKey
  const pinnedThread = pinnedThreadsList.value.find(p => {
    const t = p.thread;
    const pinnedIdentifier = t.isCounter ? t.threadName : String(t.tid);
    return pinnedIdentifier === identifier;
  });
  
  if (!pinnedThread) {
    return;
  }
  // 同步 isPinned 状态到 swimLaneOrder
  const swimLaneOrderlist = swimDataManager.getSwimLaneOrder();
  for (const lane of swimLaneOrderlist) {
    if (lane.type === 'thread') {
      const laneIdentifier = lane.thread.isCounter ? lane.thread.threadName : String(lane.thread.tid);
      if (laneIdentifier === identifier) {
        lane.thread.isPinned = false;
        break;
      }
    }
  }

  unpinThread(pinnedThread.processKey, pinnedThread.threadKey);
};

const handlePinThread = (threadKey) => {
  // Mix模式下有Mix数据时，不允许置顶
  if (isMixMode?.value && swimDataManager.hasMixConfig()) {
    postMessageInfo($t('mixModeNotSupportPin'));
    return;
  }
  
  let thread = props.process.threads.get(threadKey);
  
  if (!thread) {
    for (const [key, t] of props.process.threads.entries()) {
      if (t.tid === threadKey || t.threadName === threadKey) {
        thread = t;
        threadKey = key;
        break;
      }
    }
  }
  
  if (!thread) {
    return;
  }
  
  let pinnedY = 0;
  for (const pinnedThread of pinnedThreadsList.value) {
    const t = pinnedThread.thread;
    const tk = t.isCounter ? t.threadName : t.tid;
    const lc = lane2line.get(`${pinnedThread.processKey}@${tk}`) || 1;
    pinnedY += layout.threadHeight * lc;
  }

  const lc = thread.isCounter ? 1 : (lane2line.get(`${props.processKey}@${threadKey}`) || 1);
  const originalY = thread.bottomY - (layout.threadHeight * lc);

  const offsetY = originalY - pinnedY;
  pinThread(props.processKey, threadKey, offsetY);
};

const handleUnpin = (threadKey) => {
  unpinThread(props.processKey, threadKey);
};

const isGroupPinned = (group) => {
  if (!group?.threads) return false;
  
  return group.threads.some(thread => {
    const threadKey = thread.isCounter ? thread.threadName : String(thread.tid);
    return pinnedThreadsList.value.some(pinned => {
      const pinnedKey = pinned.thread?.isCounter ? pinned.thread.threadName : String(pinned.thread?.tid);
      return pinned.processKey === props.processKey && pinnedKey === threadKey;
    });
  });
};

const handlePinGroupThread = (group) => {
  // Mix模式下有Mix数据时，不允许置顶
  if (isMixMode?.value && swimDataManager.hasMixConfig()) {
    postMessageInfo($t('mixModeNotSupportPin'));
    return;
  }
  
  const isPinned = isGroupPinned(group);
  
  if (isPinned) {
    for (const thread of group.threads) {
      const threadKey = thread.isCounter ? thread.threadName : String(thread.tid);
      handleUnpin(threadKey);
    }
  } else {
    for (const thread of group.threads) {
      const threadKey = thread.isCounter ? thread.threadName : String(thread.tid);
      handlePinThread(threadKey);
    }
  }
};

const activeThreadId = computed(() => {
  if(searchResult.value.length === 0) {
    return "";
  }
  if (searchResult.value[currentResultIndex.value - 1]) {
    const result = searchResult.value[currentResultIndex.value - 1];
    const processKey = result.at(2);
    const tid = result.at(3);
    return `${processKey}-${tid}`;
  } else {
    return "";
  }
});
</script>

<style scoped lang="scss">
@import url("../css/swimGraph/Processes/labels.css");
.thread-label-item {
  padding-left: 36px;
  align-items: center;
  display: flex;
  height: 24px;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  min-width: 140px;
  text-align: left;
  position: relative;
}

.pin-icon-position {
  position: absolute;
  right: 223px;
  top: 6px;
  z-index: 1;
  cursor: pointer;
}

.pin-icon {
  color: var(--devui-thread-text);
}

.unpin-icon {
  color: var(--devui-primary-button-bg);
}

.pin-icon:hover {
  color: var(--devui-primary-button-hover-bg);
}
 
.threads-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: var(--thread-fill-width);
  width: var(--thread-fill-width-complement);
  height: 100%;
  background: repeating-linear-gradient(
    135deg,
    transparent,
    transparent 1px,
    var(--devui-timebar-bg) 4px
  );
  z-index: 0;
}

.average-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  border-left: 1px dashed var(--devui-slider-bar);
  opacity: 0.1;
  z-index: 2;
}

/* NEW: Four-column layout for split threads */
.thread-labels-container {
  display: flex;
  flex-direction: row;
  width: 100%;
  position: relative;
}

/* Column 1: Pin buttons (36px) */
.pin-column {
  width: 36px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pin-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 100%;
  border-bottom: 1px solid var(--devui-swim-split-line);
}

.pin-cell .pin-icon {
  cursor: pointer;
  color: var(--devui-text);
  opacity: 0.6;
  transition: opacity 0.2s;
}

.pin-cell .pin-icon:hover {
  opacity: 1;
  color: var(--devui-primary);
}

.pin-cell .unpin-icon {
  cursor: pointer;
  color: var(--devui-primary);
}

/* Column 2: Group headers (50px) */
.group-header-column {
  width: calc(50% - 36px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.group-header-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0 4px;
  border-bottom: 1px solid var(--devui-swim-split-line);
  border-right: 1px solid var(--devui-swim-split-line);
}

.group-header-text {
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  width: 100%;
  line-height: 1.2;
  color: var(--devui-thread-text);
}

/* Column 3+4: Thread content */
.threads-content-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.thread-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
  width: 100%;
  border-bottom: 1px solid var(--devui-swim-split-line);
  color: var(--devui-thread-text);
}

.thread-row.active {
  background-color: var(--devui-font-badge-bg);
}

.thread-name {
  flex-shrink: 0;
  min-width: 80px;
  padding-left: 8px;
  padding-right: 8px;
  font-size: 13px;
  font-weight: 400;
  line-height: 24px;
  color: var(--devui-thread-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.threads-content-column .threads-box {
  flex: 1;
  position: relative;
  min-width: 60px;
}
</style>
