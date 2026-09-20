/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { reactive, computed } from 'vue';
import { pushState, pullState } from '../../../core/state';
import { swimDataManager } from '../swimData';
import { getThreadStartY } from '../swimGraphUtils';

export function usePinnedThreads(lane2line, layout) {
  // 置顶线程状态
  const pinnedThreads = reactive(new Map());

  const pinnedThreadsList = computed(() => {
    return Array.from(pinnedThreads.entries()).map(([key, value]) => ({
      id: key,
      ...value
    }));
  });

  // 保存置顶状态到 vscode state
  const savePinnedState = () => {
    const pinnedState = Array.from(pinnedThreads.entries()).map(([key, value]) => ({
      processKey: value.processKey,
      threadKey: value.threadKey
    }));
    pushState({ pinnedThreads: pinnedState });
  };

  // 从 vscode state 恢复置顶状态
  const restorePinnedState = () => {
    const state = pullState();
    if (!state || !state.pinnedThreads || !Array.isArray(state.pinnedThreads)) {
      return;
    }
    
    state.pinnedThreads.forEach(pinned => {
      restoreSinglePinnedThread(pinned);
    });
  };
  
  const restoreSinglePinnedThread = (pinned) => {
    const process = swimDataManager.getProcess(pinned.processKey);
    if (!process) return;
    
    const thread = process.threads.get(pinned.threadKey);
    if (!thread) return;
    
    const key = `${pinned.processKey}-${pinned.threadKey}`;
    pinnedThreads.set(key, {
      processKey: pinned.processKey,
      threadKey: pinned.threadKey,
      thread,
      process
    });
    thread.isPinned = true;
  };

  // 置顶线程
  const pinThread = (processKey, threadKey, offsetY) => {
    const process = swimDataManager.getProcess(processKey);
    if (!process) { return; }
    
    let thread = process.threads.get(threadKey);
    
    if (!thread) {
      for (const [key, t] of process.threads.entries()) {
        if (t.tid === threadKey || t.threadName === threadKey) {
          thread = t;
          threadKey = key;
          break;
        }
      }
    }
    
    if (!thread) { return; }
    
    const key = `${processKey}-${threadKey}`;
    pinnedThreads.set(key, {
      processKey,
      threadKey,
      thread,
      process
    });
    
    thread.isPinned = true;
    thread.offsetY = offsetY;
    
    const swimLaneOrder = swimDataManager.getSwimLaneOrder();
    const threadIdentifier = thread.isCounter ? thread.threadName : String(thread.tid);
    for (const lane of swimLaneOrder) {
      if (lane.type === 'thread' && lane.thread) {
        const laneIdentifier = lane.thread.isCounter ? lane.thread.threadName : String(lane.thread.tid);
        if (laneIdentifier === threadIdentifier) {
          lane.thread.isPinned = true;
          break;
        }
      }
    }
    
    savePinnedState();
  };

  // 取消置顶
  const unpinThread = (processKey, threadKey) => {
    const key = `${processKey}-${threadKey}`;
    const pinnedData = pinnedThreads.get(key);
    
    if (pinnedData) {
      pinnedData.thread.isPinned = false;
      delete pinnedData.thread.offsetY;
      
      const swimLaneOrder = swimDataManager.getSwimLaneOrder();
      const threadIdentifier = pinnedData.thread.isCounter ? pinnedData.thread.threadName : String(pinnedData.thread.tid);
      for (const lane of swimLaneOrder) {
        if (lane.type === 'thread' && lane.thread) {
          const laneIdentifier = lane.thread.isCounter ? lane.thread.threadName : String(lane.thread.tid);
          if (laneIdentifier === threadIdentifier) {
            lane.thread.isPinned = false;
            break;
          }
        }
      }
    }
    
    pinnedThreads.delete(key);
    
    savePinnedState();
  };

  const findLaneYByThreadIdentifier = (swimLaneOrder, threadIdentifier) => {
    for (const lane of swimLaneOrder) {
      if (lane.type === 'thread' && lane.thread) {
        const laneIdentifier = lane.thread.isCounter ? lane.thread.threadName : String(lane.thread.tid);
        if (laneIdentifier === threadIdentifier) {
          return lane.y;
        }
      }
    }
    return 0;
  };
  
  // 重新计算所有置顶线程的offsetY（用于mix模式切换）
  const recalculateOffsetY = (isMixMode: Boolean) => {
    const swimLaneOrder = swimDataManager.getSwimLaneOrder();
    const pinnedArray = Array.from(pinnedThreads.entries());
    
    for (const [key, pinnedData] of pinnedArray) {
      const thread = pinnedData.thread;
      const threadIdentifier = thread.isCounter ? thread.threadName : String(thread.tid);
      let heightIdentifier = '';
      
      // 计算已置顶线程占用的总高度
      let pinnedY = 0;
      for (const [pk, pd] of pinnedArray) {
        if (pk === key) break;
        const t = pd.thread;
        const tk = t.isCounter ? t.threadName : String(t.tid);
        heightIdentifier = `${pd.processKey}@${tk}`;
        const lc = lane2line.get(heightIdentifier) || 1;
        pinnedY += layout.threadHeight * lc;
      }
      
      // 从swimLaneOrder获取新的laneY
      let laneY = 0;
      if (isMixMode) {
        laneY = findLaneYByThreadIdentifier(swimLaneOrder, threadIdentifier);
      } else {
        if (thread.isCounter) {
          const process = pinnedData.process;
          const threadKey = thread.threadName;
          laneY = getThreadStartY(process, pinnedData.processKey, threadKey, lane2line, layout);
        } else {
          const lc = lane2line.get(heightIdentifier) || 1;
          laneY = thread.bottomY - (layout.threadHeight * lc);
        }
      }
      
      // 重新计算offsetY
      thread.offsetY = laneY - pinnedY;
    }
  };

  const clearAllPinned = () => {
    const swimLaneOrder = swimDataManager.getSwimLaneOrder();
    
    Array.from(pinnedThreads.entries()).forEach(([key, pinnedData]) => {
      clearThreadPinnedStatus(pinnedData.thread, swimLaneOrder);
    });
    
    pinnedThreads.clear();
    savePinnedState();
  };
  
  const clearThreadPinnedStatus = (thread, swimLaneOrder) => {
    thread.isPinned = false;
    delete thread.offsetY;
    
    const threadIdentifier = thread.isCounter ? thread.threadName : String(thread.tid);
    for (const lane of swimLaneOrder) {
      if (lane.type === 'thread' && lane.thread) {
        const laneIdentifier = lane.thread.isCounter ? lane.thread.threadName : String(lane.thread.tid);
        if (laneIdentifier === threadIdentifier) {
          lane.thread.isPinned = false;
          break;
        }
      }
    }
  };

  return {
    pinnedThreads,
    pinnedThreadsList,
    pinThread,
    unpinThread,
    restorePinnedState,
    recalculateOffsetY,
    clearAllPinned
  };
}
