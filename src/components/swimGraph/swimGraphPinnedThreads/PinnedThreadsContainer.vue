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
  <div 
    v-if="pinnedThreadsList.length > 0"
    ref="pinnedContainer"
    class="pinned-threads-container"
    :class="{ 'no-shadow': isMixedAicpuKernel || !hasScrolled }"
  >
    <!-- 置顶线程标签区域 -->
    <div class="pinned-threads-labels">
      <template v-for="item in renderOrder" :key="item.id">
        <!-- Normal thread: single-column layout -->
        <pinned-thread-label 
          v-if="item.type === 'normal'"
          :pinned-thread="item.thread"
          :index="item.index"
        />
        
        <!-- Group threads: four-column layout -->
        <div 
          v-else-if="item.type === 'group'"
          class="thread-labels-container"
          :style="{ width: layout.processLabelWidth + 'px' }"
        >
          <!-- Column 1: Pin buttons (36px) -->
          <div class="pin-column">
            <div 
              class="pin-cell"
              :style="{ height: item.group.totalHeight + 'px' }"
            >
              <d-tooltip :content="$t('unpinThread')" position="right">
                <d-icon
                  name="icon-pushpin-fill"
                  class="unpin-icon"
                  @click="handleUnpinGroup(item.group)"
                />
              </d-tooltip>
            </div>
          </div>
          
          <!-- Column 2: Group headers (50px) -->
          <div class="group-header-column">
            <div 
              class="group-header-cell"
              :style="{ height: item.group.totalHeight + 'px' }"
            >
              <d-tooltip :content="item.group.parentThreadName" position="right">
                <div class="group-header-text">
                  {{ item.group.parentThreadName }}
                </div>
              </d-tooltip>
            </div>
          </div>
          
          <!-- Column 3: Thread names -->
          <div class="threads-content-column">
            <div 
              v-for="groupThread in item.group.threads"
              :key="groupThread.id"
              class="thread-row"
              :style="{ height: getThreadHeight(groupThread.processKey, groupThread.thread.tid, lane2line, layout, groupThread.thread.isCounter) + 'px' }"
            >
              <div class="thread-name">
                {{ getDisplayThreadName(groupThread.thread) }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    
    <!-- 置顶线程事件区域 -->
    <div class="pinned-threads-events">
      <pinned-thread-event ref="pinnedthreadsEventComponent"/>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import PinnedThreadLabel from './PinnedThreadLabel.vue';
import PinnedThreadEvent from './PinnedThreadEvent.vue';
import { getThreadHeight, getDisplayThreadName } from '../swimGraphUtils';

const { t: $t } = useI18n();
const pinnedthreadsEventComponent = ref(null);
const pinnedContainer = ref(null);
const hasScrolled = ref(false);
const { pinnedThreadsList, unpinThread } = inject('swimGraphPinnedState', {
  pinnedThreadsList: { value: [] }
});

const {
  childContextMap,
  isMixedAicpuKernel,
  swimlaneContainer,
  layout,
  lane2line
} = inject('swimGraphState');

// Group threads info
const pinnedGroups = computed(() => {
  const groups = new Map();
  
  for (const pinnedThread of pinnedThreadsList.value) {
    if (pinnedThread.thread.parentTid !== undefined) {
      if (!groups.has(pinnedThread.thread.parentTid)) {
        groups.set(pinnedThread.thread.parentTid, {
          parentThreadName: pinnedThread.thread.parentThreadName,
          parentTid: pinnedThread.thread.parentTid,
          threads: [],
          totalHeight: 0
        });
      }
      
      const group = groups.get(pinnedThread.thread.parentTid);
      group.threads.push(pinnedThread);
      
      const height = getThreadHeight(
        pinnedThread.processKey,
        pinnedThread.thread.tid,
        lane2line,
        layout,
        pinnedThread.thread.isCounter
      );
      group.totalHeight += height;
    }
  }
  
  return groups;
});

// Render order preserving pinned order
const renderOrder = computed(() => {
  const result = [];
  const renderedGroups = new Set();
  let index = 0;
  
  for (const pinnedThread of pinnedThreadsList.value) {
    if (pinnedThread.thread.parentTid === undefined) {
      // Normal thread
      result.push({
        type: 'normal',
        thread: pinnedThread,
        index: index++,
        id: pinnedThread.id
      });
    } else {
      // Group thread - only add once when first encountered
      const parentTid = pinnedThread.thread.parentTid;
      if (!renderedGroups.has(parentTid)) {
        renderedGroups.add(parentTid);
        const group = pinnedGroups.value.get(parentTid);
        result.push({
          type: 'group',
          group: group,
          id: `group-${parentTid}`
        });
      }
    }
  }
  
  return result;
});

const handleUnpinGroup = (group) => {
  for (const pinnedThread of group.threads) {
    unpinThread(pinnedThread.processKey, pinnedThread.threadKey);
  }
};

const handleScroll = () => {
  if (swimlaneContainer && swimlaneContainer.value) {
    hasScrolled.value = swimlaneContainer.value.scrollTop > 0;
  }
};

onMounted(() => {
  if (swimlaneContainer && swimlaneContainer.value) {
    swimlaneContainer.value.addEventListener('scroll', handleScroll);
  }
});

onUnmounted(() => {
  if (swimlaneContainer && swimlaneContainer.value) {
    swimlaneContainer.value.removeEventListener('scroll', handleScroll);
  }
});

const Pinnedtransform = () => {
  pinnedthreadsEventComponent.value.transformPinned();
};

const pinnedDrawLine = (x, color, flag) => {
  pinnedthreadsEventComponent.value.drawPinnedThreadEventline(x, color, flag);
};

const pinnedEraseLine = (flag) => {
  pinnedthreadsEventComponent.value.erasePinnedThreadEventline(flag);
};

const pinnedInitCanvases = () => {
  pinnedthreadsEventComponent.value.pinnedInitCanvases();
};

const pinnedRender = () => {
  pinnedthreadsEventComponent.value.pinnedRender();
};

const changePinnedColor = (isDimmed) => {
  pinnedthreadsEventComponent.value.changePinnedColor(isDimmed);
};

const highlightPinnedEvent = (event, isTemp) => {
  pinnedthreadsEventComponent.value.highlightPinnedEvent(event, true, true, isTemp);
};

const getPinnedHeight = () => {
  if (!pinnedContainer.value) {
    return 0;
  }
  return pinnedContainer.value.scrollHeight;
};

defineExpose({
  Pinnedtransform,
  pinnedDrawLine,
  pinnedEraseLine,
  pinnedInitCanvases,
  pinnedRender,
  changePinnedColor,
  highlightPinnedEvent,
  getPinnedHeight,
});
</script>

<style scoped>
.pinned-threads-container {
  display: flex;
  scrollbar-gutter: stable;
  border-bottom: 1px solid var(--devui-swim-split-line);
  box-shadow: 0 8px 8px -2px var(--devui-page-bg);
  z-index: 4;
  max-height: 300px;
  overflow-y: auto;
  overflow-x: hidden;
}

.pinned-threads-container.no-shadow {
  box-shadow: none;
}

.pinned-threads-labels {
  width: 250px;
}

.pinned-threads-events {
  flex: 1;
  position: relative;
}

/* Four-column layout for split threads in pinned area */
.thread-labels-container {
  display: flex;
  flex-direction: row;
  width: 100%;
  position: relative;
}

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
  border-right: 1px solid var(--devui-swim-split-line);
  color: var(--devui-thread-text);
}

.thread-name {
  flex-shrink: 0;
  min-width: 80px;
  padding-left: 8px;
  padding-right: 8px;
  font-size: 13px;
  font-weight: 400;
  color: var(--devui-thread-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
