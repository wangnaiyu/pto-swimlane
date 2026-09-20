/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { ref } from 'vue';
export interface ThreadInfo {
  tid: string;
  threadName: string;
  eventIds: string[];
  isCounter?: boolean;
  isFakeCore?: boolean;
  isPinned?: boolean;
  renderInfo?: {
    startY: number;
    height?: number;
  };
  parentThreadName?: string;
  parentTid?: string;
  _sliceMipmap?: any;
  _counterMipmap?: any;
  _maxRenderDuration?: number;
  _visibleDrawDatas?: any[];
  _counterBaseY?: number;
  _pinnedCounterBaseY?: number;
  _isMipmapMode?: boolean;
  maxCount?: number;
  argKey?: string;
  ph?: string;
  line?: string;
}

export interface ProcessInfo {
  pid: string;
  name: string;
  type: string;
  threads: Map<string, ThreadInfo>;
  isRendered: Boolean;
}

export interface EventDetail {
  id: string;
  name: string;
  pid: string;
  tid: string;
  threadName: string;
  startTime: number;
  endTime: number;
  duration?: number;
  ph?: string;
  args?: any;
  dependencies?: {
    predecessors: string[];
    successors: string[];
  };
  color?: any;
  pmu_info?: any;
  renderInfo?: any;
  drawData?: any;
  leafIndex?: number;
  [key: string]: any;
  
  subEventIds?: string[];
  parentEventId?: string;
}

export interface MixConfig {
  wrapId: number;
  parentEventId: string;
  subEventIds: string[];
  waitTaskIds: string[];
  discardIntervals: [number, number][];
}

export interface SyncEvent {
  idx: number;
  time: number;
  type: 'CV_SYNC_SET' | 'CV_SYNC_WAIT';
  eventid: number;
  parentEventId?: string;
  channel?: 'C' | 'V';
}

export interface SwimLaneWrapLabel {
  type: 'wrap-label';
  wrapId: number;
  wrapIds: number[];
  wrapStartTimes: number[];
  label: string;
  y: number;
  height: number;
  startTime: number;
}

export interface SwimLaneThread {
  type: 'thread';
  thread: ThreadInfo;
  y: number;
  height: number;
  wrapIds: number[];
}

export type SwimLaneItem = SwimLaneWrapLabel | SwimLaneThread;

export interface WrapContainerInfo {
  wrapId: number;
  label: string;
  minStartTime: number;
  maxEndTime: number;
  threadTids: string[];
}

class SwimDataManager {
  private static instance: SwimDataManager;
  public updateFlag = ref(0); // 响应式更新标志
  public processInfo: Map<string, ProcessInfo>;
  public eventMap: Map<string, EventDetail>;
  public mixConfig: MixConfig[];
  private eventsByWrapId: Map<number, EventDetail[]>;
  private wrapContainers: Map<number, WrapContainerInfo>;
  private swimLaneOrder: SwimLaneItem[];
  private isMixModeActive: boolean;
  private isDeviceViewMerged: boolean;
  private mixThreads: ThreadInfo[];
  private wrapThreadMap: Map<number, ThreadInfo[]>;
  private lane2line: Map<string, number>;
  private seqNoTaskMap: Map<string, string>;
  
  private constructor() {
    this.processInfo = new Map();
    this.eventMap = new Map();
    this.mixConfig = [];
    this.eventsByWrapId = new Map();
    this.wrapContainers = new Map();
    this.swimLaneOrder = [];
    this.isMixModeActive = false;
    this.isDeviceViewMerged = false;
    this.mixThreads = [];
    this.wrapThreadMap = new Map();
    this.lane2line = new Map();
    this.seqNoTaskMap = new Map();
  }
  
  public static getInstance(): SwimDataManager {
    if (!SwimDataManager.instance) {
      SwimDataManager.instance = new SwimDataManager();
    }
    return SwimDataManager.instance;
  }
  
  /**
   * 从原始data初始化
   *
   * @param data - 原始数据对象
   * @param lane2line - lane到line的映射（可选）
   * @param isPerfSwim - 是否PerfSwim模式
   */
  public initializeFromData(
    data: any,
    _processExpanded?: Map<string, boolean>,
    lane2line?: Map<string, number>,
    isPerfSwim?: boolean,
    isThreeColumn?: boolean
  ): void {
    this.resetState();
    this.parseProcesses(data, isPerfSwim);
    for (const [key, count] of Object.entries(data.lane2line || {})) this.lane2line.set(key, Number(count));
    
    if (!isThreeColumn) {
      this.mergeAicpuIntoMachineView(_processExpanded);
    }
    
    if (lane2line) {
      const entries = [...this.lane2line];
      lane2line.clear();
      for (const [key, count] of entries) lane2line.set(key, count);
    }
    this.buildSeqNoTaskMap(this.processInfo);
    this.updateFlag.value++;
  }

  /** 重置内部状态 */
  private resetState(): void {
    this.isDeviceViewMerged = false;
    this.processInfo.clear();
    this.eventMap.clear();
    this.eventsByWrapId.clear();
    this.mixConfig = [];
    this.wrapContainers.clear();
    this.swimLaneOrder = [];
    this.isMixModeActive = false;
    this.mixThreads = [];
    this.wrapThreadMap.clear();
    this.lane2line.clear();
    this.seqNoTaskMap.clear();
  }

  /** 解析 data.processes，构建 processInfo / eventMap / eventsByWrapId */
  private parseProcesses(data: any, isPerfSwim?: boolean): void {
    if (!data.processes) return;

    for (const processKey in data.processes) {
      if (!Object.prototype.hasOwnProperty.call(data.processes, processKey)) {
        continue;
      }

      const process = data.processes[processKey];
      const threadInfoMap = this.parseThreadsOfProcess(process, processKey);

      const processInfoItem: ProcessInfo = {
        pid: process.pid ?? processKey,
        name: process.processName || '',
        type: isPerfSwim ? 'PerfSwim' : (process.type || 'kernel'),
        threads: threadInfoMap,
        isRendered: process.isRendered,
      };

      this.processInfo.set(processKey, processInfoItem);
    }
  }

  /** 解析单个 process 的 threads，返回 threadInfoMap */
  private parseThreadsOfProcess(process: any, processKey: string): Map<string, ThreadInfo> {
    const threadInfoMap = new Map<string, ThreadInfo>();
    if (!process.threads) return threadInfoMap;

    // 调用方（prepareProcesses）已保证 process.threads 为 Map
    const threadsArray = Array.from((process.threads as Map<string, any>).entries());

    // 先处理非counter线程，后处理counter线程（排序逻辑）
    const sortedThreads = threadsArray.sort((a, b) => {
      const threadA = a[1];
      const threadB = b[1];

      // counter线程排在后面
      if (threadA.isCounter !== threadB.isCounter) {
        return threadA.isCounter ? 1 : -1;
      }

      // 非counter线程按tid排序
      if (!threadA.isCounter) {
        const tidA = a[0].split('-')[1];
        const tidB = b[0].split('-')[1];
        return Number(tidA) - Number(tidB);
      }

      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    });

    for (const [threadKey, thread] of sortedThreads) {
      const eventIds = this.parseEventsOfThread(thread, processKey, threadKey);

      // 保留events数组
      thread.eventIds = eventIds;

      const threadInfo: ThreadInfo = {
        tid: thread.tid ?? threadKey,
        threadName: thread.threadName || '',
        eventIds,
        isCounter: thread.isCounter,
        isFakeCore: thread.threadName?.includes('Fake Core'),
        parentThreadName: thread.parentThreadName,
        parentTid: thread.parentTid,
        ph: thread.ph,
        line: thread.line,
        maxCount: thread.maxCount,
        argKey: thread.argKey,
      };

      threadInfoMap.set(threadKey, threadInfo);
    }

    return threadInfoMap;
  }

  /** 解析单个 thread 的 events，填充 eventMap / eventsByWrapId，返回 eventIds */
  private parseEventsOfThread(thread: any, processKey: string, threadKey: string): string[] {
    const eventIds: string[] = [];
    if (!thread.events || !Array.isArray(thread.events)) return eventIds;

    // counter事件只有ts（无id/startTime），需补齐字段以便统一索引和排序
    if (thread.isCounter) {
      thread.events.forEach((event: any, idx: number) => {
        if (event.id === undefined) {
          event.id = `counter_${processKey}_${threadKey}_${idx}`;
        }
        if (event.startTime === undefined && event.ts !== undefined) {
          event.startTime = event.ts;
        }
      });
    }

    // 先排序events（按startTime）
    thread.events.sort((a, b) => a.startTime - b.startTime);

    for (const event of thread.events) {
      eventIds.push(event.id);

      // 存储event到eventMap
      event.processKey = processKey;
      event.threadKey = threadKey;
      this.eventMap.set(event.id, event);

      // 处理wrapId
      this.indexEventByWrapId(event);
    }

    return eventIds;
  }

  /** 将事件按 wrapId 索引到 eventsByWrapId（无效 wrapId 跳过） */
  private indexEventByWrapId(event: any): void {
    const wrapId = event.args?.wrapId;
    if (wrapId === undefined || wrapId === -1) return;
    if (!this.eventsByWrapId.has(wrapId)) {
      this.eventsByWrapId.set(wrapId, []);
    }
    this.eventsByWrapId.get(wrapId)?.push(event);
  }

  /** 将 data.lane2line 复制到调用方传入的 lane2line Map */
  private copyLane2Line(data: any, lane2line?: Map<string, number>): void {
    if (!data.lane2line || !lane2line) return;
    for (const key in data.lane2line) {
      if (Object.prototype.hasOwnProperty.call(data.lane2line, key)) {
        lane2line.set(key, data.lane2line[key]);
      }
    }
  }
  
  public getUpdateFlag() {
    return this.updateFlag;
  }

  public getEventById(eventId: string): EventDetail | undefined {
    return this.eventMap.get(eventId);
  }
  
  public getEventsByIds(eventIds: string[]): EventDetail[] {
    return eventIds
      .map(id => this.eventMap.get(id))
      .filter((event): event is EventDetail => event !== undefined);
  }
  
  public getProcessByEvent(eventId: string): ProcessInfo | undefined {
    const event = this.eventMap.get(eventId);
    if (!event) return undefined;
    
    return this.processInfo.get(event.processKey);
  }
  
  public getThreadByEvent(eventId: string): ThreadInfo | undefined {
    const event = this.eventMap.get(eventId);
    if (!event) return undefined;
    
    const process = this.processInfo.get(event.processKey);
    if (!process) return undefined;
    
    return process.threads.get(event.threadKey);
  }
  
  public getEventsByProcess(processKey: string): EventDetail[] {
    const process = this.processInfo.get(processKey);
    if (!process) return [];
    
    const events: EventDetail[] = [];
    for (const threadInfo of process.threads.values()) {
      for (const eventId of threadInfo.eventIds) {
        const event = this.eventMap.get(eventId);
        if (event) {
          events.push(event);
        }
      }
    }
    return events;
  }
  
  public getEventsByThread(processKey: string, threadKey: string): EventDetail[] {
    const process = this.processInfo.get(processKey);
    if (!process) return [];
    
    const threadInfo = process.threads.get(threadKey);
    if (!threadInfo) return [];
    
    return this.getEventsByIds(threadInfo.eventIds);
  }
  
  public getProcess(processKey: string): ProcessInfo | undefined {
    return this.processInfo.get(processKey);
  }
  
  public getThread(processKey: string, threadKey: string): ThreadInfo | undefined {
    const process = this.processInfo.get(processKey);
    if (!process) return undefined;
    
    return process.threads.get(threadKey);
  }
  
  public getAllProcesses(): Map<string, ProcessInfo> {
    return this.processInfo;
  }
  
  public updateThreadProperty(processKey: string, threadKey: string, updates: Partial<ThreadInfo>): void {
    const process = this.processInfo.get(processKey);
    if (!process) return;
    
    const threadInfo = process.threads.get(threadKey);
    if (!threadInfo) return;
    
    Object.assign(threadInfo, updates);
  }
  
  public clear(): void {
    this.processInfo.clear();
    this.eventMap.clear();
    this.eventsByWrapId.clear();
    this.mixConfig = [];
    this.wrapContainers.clear();
    this.swimLaneOrder = [];
    this.isMixModeActive = false;
    this.mixThreads = [];
    this.wrapThreadMap.clear();
    this.lane2line.clear();
    this.seqNoTaskMap.clear();
  }

  public buildSeqNoTaskMap(processInfo: Map<string, any>): void {
    for (const [processKey, process] of processInfo.entries()) {
      if (!process.threads) continue;
      for (const [, thread] of process.threads.entries()) {
        if (!thread.eventIds?.length || thread.isCounter) continue;
        for (const eventId of thread.eventIds) {
          const event = this.eventMap.get(eventId);
          if (event.args?.seqNo === undefined || event.args?.taskId === undefined) continue;
          const key = `${event.args.seqNo}-${event.args.taskId}`;
          if (!this.seqNoTaskMap.has(key)) {
            this.seqNoTaskMap.set(key, event.id);
          }
        }
      }
    }
  }

  public getEventBySeqNoTaskId(seqNo: number | string, taskId: number | string): { event: any; processKey: string } | undefined {
    const eventId = this.seqNoTaskMap.get(`${seqNo}-${taskId}`);
    if (!eventId) return undefined;
    const event = this.eventMap.get(eventId);
    if (!event) return undefined;
    return { event, processKey: event.processKey };
  }
  public updateEvent(eventId: string, updates: Partial<EventDetail>): void {
    const event = this.eventMap.get(eventId);
    if (event) {
      Object.assign(event, updates);
    }
  }

  public splitMixSubTask(): MixConfig[] {
    return this.mixConfig;
  }

  public getSubEvents(parentEventId: string): EventDetail[] {
    const config = this.mixConfig.find(c => c.parentEventId === parentEventId);
    if (!config?.subEventIds) { return []; }
    return config.subEventIds
      .map(id => this.eventMap.get(id))
      .filter((e): e is EventDetail => e !== undefined);
  }

  public getWaitTasks(parentEventId: string): EventDetail[] {
    const config = this.getSplitConfig(parentEventId);
    if (!config?.waitTaskIds) { return []; }
    return config.waitTaskIds
      .map(id => this.eventMap.get(id))
      .filter((e): e is EventDetail => e !== undefined);
  }

  public getSplitConfig(parentEventId: string): MixConfig | undefined {
    return this.mixConfig.find(c => c.parentEventId === parentEventId);
  }

  public getSubEventDependencies(subEventId: string): {
    predecessors: EventDetail[];
    successors: EventDetail[];
  } {
    const subEvent = this.eventMap.get(subEventId);
    if (!subEvent?.parentEventId) {
      return { predecessors: [], successors: [] };
    }

    const predecessors = (subEvent.dependencies?.predecessors || [])
      .map(id => this.eventMap.get(id))
      .filter((e): e is EventDetail => !!e);

    const successors = (subEvent.dependencies?.successors || [])
      .map(id => this.eventMap.get(id))
      .filter((e): e is EventDetail => !!e);

    return { predecessors, successors };
  }

  public getParentDependencies(subEventId: string): {
    parentEvent: EventDetail | null;
    predecessors: EventDetail[];
    successors: EventDetail[];
  } {
    const subEvent = this.eventMap.get(subEventId);
    if (!subEvent?.parentEventId) {
      return { parentEvent: null, predecessors: [], successors: [] };
    }

    const parentEvent = this.eventMap.get(subEvent.parentEventId);
    if (!parentEvent) {
      return { parentEvent: null, predecessors: [], successors: [] };
    }

    const predecessors = (parentEvent.dependencies?.predecessors || [])
      .map(id => this.eventMap.get(id))
      .filter((e): e is EventDetail => !!e);

    const successors = (parentEvent.dependencies?.successors || [])
      .map(id => this.eventMap.get(id))
      .filter((e): e is EventDetail => !!e);

    return { parentEvent, predecessors, successors };
  }

  public splitAllEvents(): void {
    for (const [eventId, event] of Array.from(this.eventMap.entries())) {
      const wrapId = event.args?.wrapId;
      if (wrapId === undefined || wrapId === -1) {
        continue;
      }
      this.splitSingleEvent(eventId);
    }
    this.generateAllDependencies();
  }

  private createMinimalSubEvent(
    parentEvent: EventDetail,
    subEventId: string,
    subEventName: string,
    startTime: number,
    endTime: number
  ): EventDetail {
    return {
      id: subEventId,
      name: subEventName,
      pid: parentEvent.pid,
      tid: parentEvent.tid,
      threadName: parentEvent.threadName,
      threadKey: parentEvent.threadKey,
      startTime,
      endTime,
      args: { wrapId: parentEvent.args?.wrapId, hashorder: parentEvent.args?.['hashOrder-hint'], 'ioperand-hint':parentEvent.args?.['ioperand-hint'], 'ooperand-hint': parentEvent.args?.['ooperand-hint']},
      dependencies: { predecessors: [], successors: [] },
      parentEventId: parentEvent.id,
      leafIndex: parentEvent.leafIndex,
    };
  }

  private isValidSyncEvent(syncEvent: any): boolean {
    return (
      syncEvent !== null &&
      syncEvent !== undefined &&
      typeof syncEvent.eventid === 'number' &&
      typeof syncEvent.time === 'number' &&
      (syncEvent.type === 'CV_SYNC_SET' || syncEvent.type === 'CV_SYNC_WAIT')
    );
  }

  private filterValidSyncEvents(syncEvents: any[]): SyncEvent[] {
    return syncEvents.filter(se => this.isValidSyncEvent(se)) as SyncEvent[];
  }

  private mergeIntervals(intervals: [number, number][]): [number, number][] {
    if (intervals.length === 0) return [];
    const sorted = intervals.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];
      if (current[0] <= last[1]) {
        last[1] = Math.max(last[1], current[1]);
      } else {
        merged.push(current);
      }
    }
    return merged;
  }

  private getWaitDependencyTime(
    waitTime: number,
    setTime: number,
    discardIntervals: [number, number][]
  ): number {
    if (waitTime > setTime) {
      for (const [start, end] of discardIntervals) {
        if (start <= waitTime && waitTime <= end) {
          return end;
        }
      }
      return waitTime;
    } else if (waitTime < setTime) {
      const allIntervals: [number, number][] = [...discardIntervals, [waitTime, setTime]];
      const merged = this.mergeIntervals(allIntervals);
      for (const [start, end] of merged) {
        if (start <= waitTime && waitTime <= end) {
          return end;
        }
      }
      return setTime;
    } else {
      return waitTime;
    }
  }

  private splitSingleEvent(parentEventId: string): void {
    const parentEvent = this.eventMap.get(parentEventId);
    if (!parentEvent || parentEvent.subEventIds) {
      return;
    }

    const wrapId = parentEvent.args?.wrapId;
    const rawSyncEvents: any[] = parentEvent.args?.syncEvents || [];
    const syncEvents = this.filterValidSyncEvents(rawSyncEvents);
    const pool = this.buildSyncEventPool(wrapId);

    const subEvents: EventDetail[] = [];
    const subEventIds: string[] = [];
    let discardIntervals: [number, number][] = [];

    if (syncEvents.length === 0) {
      this.createAndRegisterSubEvent(parentEvent, parentEventId, 0, parentEvent.startTime, parentEvent.endTime, subEvents, subEventIds);
    } else {
      const sortedSyncEvents = [...syncEvents].sort((a, b) => a.time - b.time);
      discardIntervals = this.computeDiscardIntervals(sortedSyncEvents, pool, parentEvent);
      const mergedDiscardIntervals = this.mergeIntervals(discardIntervals);
      this.buildSubEventsFromSyncEvents(parentEvent, parentEventId, sortedSyncEvents, mergedDiscardIntervals, subEvents, subEventIds);
    }

    parentEvent.subEventIds = subEventIds;

    const waitTaskIds = this.registerWaitTasks(subEvents, parentEventId);

    const mergedDiscardIntervals = discardIntervals.length > 0 ? this.mergeIntervals(discardIntervals) : [];
    this.mixConfig.push({
      wrapId: wrapId ?? -1,
      parentEventId,
      subEventIds,
      waitTaskIds,
      discardIntervals: mergedDiscardIntervals,
    });
  }

  private createAndRegisterSubEvent(
    parentEvent: EventDetail,
    parentEventId: string,
    nameIndex: number,
    startTime: number,
    endTime: number,
    subEvents: EventDetail[],
    subEventIds: string[]
  ): void {
    const subEventId = `${parentEventId}_sub_${nameIndex}`;
    const subEvent = this.createMinimalSubEvent(
      parentEvent,
      subEventId,
      `${parentEvent.name}_${nameIndex}`,
      startTime,
      endTime
    );
    subEvents.push(subEvent);
    subEventIds.push(subEventId);
    this.eventMap.set(subEventId, subEvent);
  }

  private computeDiscardIntervals(
    sortedSyncEvents: SyncEvent[],
    pool: Map<number, { sets: SyncEvent[]; waits: SyncEvent[] }>,
    parentEvent: EventDetail
  ): [number, number][] {
    const discardIntervals: [number, number][] = [];
    for (const syncEvent of sortedSyncEvents) {
      if (syncEvent.type === 'CV_SYNC_WAIT') {
        const pairSetEvent = this.findAndRemoveSyncEventPair(pool, syncEvent.eventid, 'CV_SYNC_SET', syncEvent.channel);
        if (pairSetEvent && pairSetEvent.time > syncEvent.time) {
          discardIntervals.push([syncEvent.time, Math.min(pairSetEvent.time, parentEvent.endTime)]);
        }
      }
    }
    return discardIntervals;
  }

  private findMatchingDiscardIndex(mergedDiscardIntervals: [number, number][], syncTime: number): number {
    for (let di = 0; di < mergedDiscardIntervals.length; di++) {
      const [start, end] = mergedDiscardIntervals[di];
      if (start <= syncTime && syncTime <= end) {
        return di;
      }
    }
    return -1;
  }

  private buildSubEventsFromSyncEvents(
    parentEvent: EventDetail,
    parentEventId: string,
    sortedSyncEvents: SyncEvent[],
    mergedDiscardIntervals: [number, number][],
    subEvents: EventDetail[],
    subEventIds: string[]
  ): void {
    let currentStartTime = parentEvent.startTime;

    for (let si = 0; si < sortedSyncEvents.length; si++) {
      const syncTime = sortedSyncEvents[si].time;
      const matchedDiscardIdx = this.findMatchingDiscardIndex(mergedDiscardIntervals, syncTime);

      if (matchedDiscardIdx >= 0) {
        const [start, end] = mergedDiscardIntervals[matchedDiscardIdx];
        if (currentStartTime < start) {
          this.createAndRegisterSubEvent(parentEvent, parentEventId, si, currentStartTime, start, subEvents, subEventIds);
        }
        currentStartTime = end;
      } else {
        if (syncTime > currentStartTime) {
          this.createAndRegisterSubEvent(parentEvent, parentEventId, si, currentStartTime, syncTime, subEvents, subEventIds);
        }
        currentStartTime = syncTime;
      }
    }

    if (currentStartTime < parentEvent.endTime) {
      this.createAndRegisterSubEvent(parentEvent, parentEventId, sortedSyncEvents.length, currentStartTime, parentEvent.endTime, subEvents, subEventIds);
    }
  }

  private registerWaitTasks(subEvents: EventDetail[], parentEventId: string): string[] {
    const waitTasks = this.computeWaitTasks(subEvents, parentEventId);
    const waitTaskIds: string[] = [];
    for (const waitTask of waitTasks) {
      this.eventMap.set(waitTask.id, waitTask);
      waitTaskIds.push(waitTask.id);
    }
    return waitTaskIds;
  }

  private computeWaitTasks(subEvents: EventDetail[], parentEventId: string): EventDetail[] {
    if (subEvents.length < 2) {
      return [];
    }

    const sortedSubEvents = [...subEvents].sort((a, b) => a.startTime - b.startTime);
    const waitTasks: EventDetail[] = [];

    for (let i = 0; i < sortedSubEvents.length - 1; i++) {
      const currentTask = sortedSubEvents[i];
      const { pid, tid, threadName, args, endTime: currentEnd } = currentTask;
      const nextStart = sortedSubEvents[i + 1].startTime;
      if (nextStart > currentEnd) {
        const waitTaskId = `${parentEventId}_wait_${i}`;
        const waitTask: EventDetail = {
          id: waitTaskId,
          name: 'Wait',
          startTime: currentEnd,
          endTime: nextStart,
          parentEventId,
          isWait: true,
          pid: pid,
          tid: tid,
          threadName: threadName,
          args: { wrapId: args?.wrapId}
        };
        waitTasks.push(waitTask);
      }
    }

    return waitTasks;
  }

  private buildSyncEventPool(wrapId: number): Map<number, { sets: SyncEvent[]; waits: SyncEvent[] }> {
    const pool = new Map<number, { sets: SyncEvent[]; waits: SyncEvent[] }>();
    const events = this.eventsByWrapId.get(wrapId);
    if (!events) return pool;

    for (const event of events) {
      if (event.args?.syncEvents) {
        for (const se of event.args.syncEvents) {
          if (!this.isValidSyncEvent(se)) continue;
          if (!pool.has(se.eventid)) {
            pool.set(se.eventid, { sets: [], waits: [] });
          }
          const entry = pool.get(se.eventid)!;
          let channel: 'C' | 'V' | undefined;
          if (event.threadName?.includes('AIC_')) {
            channel = 'C';
          } else if (event.threadName?.includes('AIV_')) {
            channel = 'V';
          }
          const enrichedSe: SyncEvent = { ...se, parentEventId: event.id, channel };
          if (se.type === 'CV_SYNC_SET') {
            entry.sets.push(enrichedSe);
          } else {
            entry.waits.push(enrichedSe);
          }
        }
      }
    }
    
    for (const entry of pool.values()) {
      entry.sets.sort((a, b) => a.time - b.time);
      entry.waits.sort((a, b) => a.time - b.time);
    }
    return pool;
  }

  private findAndRemoveSyncEventPair(
    pool: Map<number, { sets: SyncEvent[]; waits: SyncEvent[] }>,
    eventid: number,
    targetType: 'CV_SYNC_SET' | 'CV_SYNC_WAIT',
    sourceChannel?: 'C' | 'V'
  ): SyncEvent | null {
    const entry = pool.get(eventid);
    if (!entry) return null;
    
    const targetList = targetType === 'CV_SYNC_SET' ? entry.sets : entry.waits;
    if (targetList.length === 0) return null;
    
    if (!sourceChannel) {
      return targetList.shift()!;
    }
    const idx = targetList.findIndex(e => e.channel !== sourceChannel);
    if (idx === -1) return null;
    return targetList.splice(idx, 1)[0];
  }

  private findEventBySyncEvent(wrapId: number, syncEvent: SyncEvent): EventDetail | null {
    const events = this.eventsByWrapId.get(wrapId);
    if (!events) {
      return null;
    }
    for (const event of events) {
      if (event.args?.syncEvents) {
        const syncEvents: SyncEvent[] = event.args.syncEvents;
        if (syncEvents.some(se => se.eventid === syncEvent.eventid && se.type === syncEvent.type)) {
          return event;
        }
      }
    }
    return null;
  }

  private findSubEventByEndTime(parentEventId: string, endTime: number): EventDetail | null {
    const subEvents = this.getSubEvents(parentEventId);
    const sorted = [...subEvents].sort((a, b) => b.endTime - a.endTime);
    return sorted.find(se => se.endTime <= endTime) || null;
  }

  private findSubEventByStartTime(parentEventId: string, startTime: number): EventDetail | null {
    const subEvents = this.getSubEvents(parentEventId);
    const sorted = [...subEvents].sort((a, b) => a.startTime - b.startTime);
    return sorted.find(se => se.startTime >= startTime) || null;
  }

  private generateAllDependencies(): void {
    const poolByWrapId = new Map<number, Map<number, { sets: SyncEvent[]; waits: SyncEvent[] }>>();
    const processedWrapIds = new Set<number>();

    for (const config of this.mixConfig) {
      const wrapId = config.wrapId;
      if (processedWrapIds.has(wrapId)) continue;
      processedWrapIds.add(wrapId);

      if (!poolByWrapId.has(wrapId)) {
        poolByWrapId.set(wrapId, this.buildSyncEventPool(wrapId));
      }
      const pool = poolByWrapId.get(wrapId)!;

      const allSets: SyncEvent[] = [];
      for (const entry of pool.values()) {
        allSets.push(...entry.sets);
      }
      allSets.sort((a, b) => a.time - b.time);

      for (const setEvent of allSets) {
        const pairWaitEvent = this.findAndRemoveSyncEventPair(pool, setEvent.eventid, 'CV_SYNC_WAIT', setEvent.channel);
        if (!pairWaitEvent) {
          continue;
        }

        const setParentEventId = setEvent.parentEventId!;
        const subEventA = this.findSubEventByEndTime(setParentEventId, setEvent.time);
        if (!subEventA) {
          continue;
        }

        const waitParentEventId = pairWaitEvent.parentEventId!;
        const waitParentEvent = this.eventMap.get(waitParentEventId);
        if (!waitParentEvent) {
          continue;
        }

        const waitConfig = this.getSplitConfig(waitParentEvent.id);
        const waitDiscardIntervals = waitConfig?.discardIntervals || [];

        const dependencyTime = this.getWaitDependencyTime(
          pairWaitEvent.time,
          setEvent.time,
          waitDiscardIntervals
        );

        const subEventC = this.findSubEventByStartTime(waitParentEvent.id, dependencyTime);
        if (!subEventC) {
          continue;
        }

        if (!subEventA.dependencies.successors.includes(subEventC.id)) {
          subEventA.dependencies.successors.push(subEventC.id);
        }
        if (!subEventC.dependencies.predecessors.includes(subEventA.id)) {
          subEventC.dependencies.predecessors.push(subEventA.id);
        }
      }
    }
  }

  public getSubEventsByWrapId(wrapId: number): EventDetail[] {
    const configs = this.mixConfig.filter(c => c.wrapId === wrapId);
    return configs
      .flatMap(c => c.subEventIds)
      .map(id => this.eventMap.get(id))
      .filter((e): e is EventDetail => e !== undefined);
  }

  public getAllSubEvents(): EventDetail[] {
    return this.mixConfig
      .flatMap(c => c.subEventIds)
      .map(id => this.eventMap.get(id))
      .filter((e): e is EventDetail => e !== undefined);
  }

  public isMixedData(): boolean {
    let hasAicpu = false;
    let hasKernel = false;
    for (const [_, process] of Array.from(this.processInfo.entries())) {
        if (process.type === 'aicpu') {
            hasAicpu = true;
        } else {
            hasKernel = true;
        }
    }
    return hasAicpu && hasKernel;
  }

  private categorizeAicpuThreads(aicpuProcess: ProcessInfo): {
    ctrlSchedThreads: [string, ThreadInfo][];
    coreThreads: [string, ThreadInfo][];
    otherThreads: [string, ThreadInfo][];
    counterThreads: [string, ThreadInfo][];
  } {
    const ctrlSchedThreads: [string, ThreadInfo][] = [];
    const coreThreads: [string, ThreadInfo][] = [];
    const otherThreads: [string, ThreadInfo][] = [];
    const counterThreads: [string, ThreadInfo][] = [];
    for (const [threadKey, thread] of aicpuProcess.threads.entries()) {
      if (thread.threadName.includes('AICPU-CTRL') || thread.threadName.includes('AICPU-SCHED')) {
        ctrlSchedThreads.push([threadKey, thread]);
      } else if (/^(SCHED\d+-(AIC|AIV)-\d+|(AIC|AIV)-\d+-SCHED\d+)$/.test(thread.threadName)) {
        coreThreads.push([threadKey, thread]);
      } else if (thread.isCounter) {
        counterThreads.push([threadKey, thread]);
      } else {
        otherThreads.push([threadKey, thread]);
      }
    }
    return { ctrlSchedThreads, coreThreads, otherThreads, counterThreads };
  }

  private mergeCoreThreadsIntoMachine(
    coreThreads: [string, ThreadInfo][],
    aicpuProcessKey: string,
    machineProcessKey: string,
    machineProcess: ProcessInfo
  ): void {
    for (const [threadKey, thread] of coreThreads) {
      const match = thread.threadName.match(/^SCHED\d+-(AIC|AIV)-(\d+)$/) || thread.threadName.match(/^(AIC|AIV)-(\d+)-SCHED\d+$/);
      if (!match) continue;
      const coreType = match[1];
      const coreId = match[2];
      const targetThreadName = `${coreType}_${coreId}`;
      let targetThreadKey: string | null = null;
      let targetThread: ThreadInfo | null = null;
      for (const [tk, t] of machineProcess.threads.entries()) {
        if (t.threadName === targetThreadName) {
          targetThreadKey = tk;
          targetThread = t;
          break;
        }
      }
      if (!targetThreadKey || !targetThread) {
        const aicpuThreadName = thread.threadName;
        this.moveThreadToProcess(threadKey, thread, aicpuProcessKey, machineProcessKey, machineProcess, `${coreType}_${coreId}`);
        (thread as any)._mergedFromThreadName = aicpuThreadName;
        continue;
      }
      this.mergeCoreThreadEvents(threadKey, thread, aicpuProcessKey, targetThreadKey, targetThread, machineProcessKey, machineProcess);
      (targetThread as any)._mergedFromThreadName = thread.threadName;
    }
  }

  private mergeAicpuIntoMachineView(processExpanded?: Map<string, boolean>): void {
    let aicpuProcessKey: string | null = null;
    let machineProcessKey: string | null = null;
    for (const [key, process] of this.processInfo.entries()) {
      if (process.type === 'aicpu') aicpuProcessKey = key;
      else if (process.type !== 'PerfSwim') machineProcessKey = key;
    }
    // 仅在混合模式下执行合并（AICPU + Machine View 同时存在）
    // 纯 AICPU 数据或纯 Machine View 数据不受影响
    if (!aicpuProcessKey || !machineProcessKey) return;
    const aicpuProcess = this.processInfo.get(aicpuProcessKey)!;
    const machineProcess = this.processInfo.get(machineProcessKey)!;
    const { ctrlSchedThreads, coreThreads, otherThreads, counterThreads } = this.categorizeAicpuThreads(aicpuProcess);
    for (const [threadKey, thread] of ctrlSchedThreads) {
      this.moveThreadToProcess(threadKey, thread, aicpuProcessKey, machineProcessKey, machineProcess);
    }
    for (const [threadKey, thread] of otherThreads) {
      this.moveThreadToProcess(threadKey, thread, aicpuProcessKey, machineProcessKey, machineProcess);
    }
    for (const [threadKey, thread] of counterThreads) {
      this.moveThreadToProcess(threadKey, thread, aicpuProcessKey, machineProcessKey, machineProcess);
    }
    this.mergeCoreThreadsIntoMachine(coreThreads, aicpuProcessKey, machineProcessKey, machineProcess);
    this.processInfo.delete(aicpuProcessKey);
    this.reorderMachineViewThreads(machineProcess);
    this.recalculateLane2Line();
    machineProcess.name = 'Device View';
    machineProcess.isRendered = true;
    this.isDeviceViewMerged = true;
    
    // 更新 processExpanded：删除 AICPU 进程，展开 Machine View 进程
    if (processExpanded) {
      processExpanded.delete(aicpuProcessKey);
      processExpanded.set(machineProcessKey, true);
    }
  }

  private moveThreadToProcess(
    threadKey: string, thread: ThreadInfo,
    fromProcessKey: string, toProcessKey: string, toProcess: ProcessInfo,
    newThreadName?: string
  ): void {
    const originalThreadName = thread.threadName;
    (thread as any)._originalThreadName = originalThreadName;
    if (newThreadName) {
      thread.threadName = newThreadName;
    }
    for (const eventId of thread.eventIds) {
      const event = this.eventMap.get(eventId);
      if (event) {
        event.originalThreadName = originalThreadName;
        if (newThreadName) {
          event.threadName = newThreadName;
        }
        event.pid = toProcess.pid;
        event.processKey = toProcessKey;
        event.threadKey = threadKey;
      }
    }
    
    // 更新 lane2line 的 key
    const oldLaneKey = `${fromProcessKey}@${thread.tid}`;
    const newLaneKey = `${toProcessKey}@${thread.tid}`;
    if (this.lane2line.has(oldLaneKey)) {
      const lineCount = this.lane2line.get(oldLaneKey)!;
      this.lane2line.delete(oldLaneKey);
      this.lane2line.set(newLaneKey, lineCount);
    }
    
    toProcess.threads.set(threadKey, thread);
    const fromProcess = this.processInfo.get(fromProcessKey);
    if (fromProcess) fromProcess.threads.delete(threadKey);
  }

  private mergeCoreThreadEvents(
    srcThreadKey: string, srcThread: ThreadInfo, fromProcessKey: string,
    tgtThreadKey: string, tgtThread: ThreadInfo, toProcessKey: string, toProcess: ProcessInfo
  ): void {
    const BOUNDARY_PREFIXES = ['DEV_TASK_ALL_CALLOP_TASK_EXEC', 'DEV_TASK_ALL_LEAF_TASK_EXEC'];
    const srcEvents = srcThread.eventIds.map(id => this.eventMap.get(id)).filter((e): e is EventDetail => !!e);
    const segments: EventDetail[][] = [];
    let currentSegment: EventDetail[] = [];
    const boundaryNames: string[] = [];
    for (const event of srcEvents) {
      if (BOUNDARY_PREFIXES.some(prefix => event.name.startsWith(prefix))) {
        segments.push(currentSegment);
        currentSegment = [];
        boundaryNames.push(event.name);
      } else {
        currentSegment.push(event);
      }
    }
    segments.push(currentSegment);
    const tgtEventIds = [...tgtThread.eventIds];
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment.length === 0 && i < boundaryNames.length) continue;
      for (const event of segment) {
        event.originalThreadName = srcThread.threadName;
        event.pid = toProcess.pid;
        event.processKey = toProcessKey;
        event.threadKey = tgtThreadKey;
        event.threadName = tgtThread.threadName;
      }
      if (i < boundaryNames.length) {
        const boundaryName = boundaryNames[i];
        const insertIdx = tgtEventIds.findIndex(id => {
          const e = this.eventMap.get(id);
          return e && e.name === boundaryName;
        });
        if (insertIdx >= 0) {
          const segIds = segment.map(e => e.id);
          tgtEventIds.splice(insertIdx, 0, ...segIds);
        } else {
          const segIds = segment.map(e => e.id);
          tgtEventIds.push(...segIds);
        }
      } else {
        const segIds = segment.map(e => e.id);
        tgtEventIds.push(...segIds);
      }
    }
    tgtEventIds.sort((a, b) => {
      const ea = this.eventMap.get(a);
      const eb = this.eventMap.get(b);
      return (ea?.startTime ?? 0) - (eb?.startTime ?? 0);
    });
    tgtThread.eventIds = tgtEventIds;
    const fromProcess = this.processInfo.get(fromProcessKey);
    if (fromProcess) fromProcess.threads.delete(srcThreadKey);
  }

  private reorderMachineViewThreads(process: ProcessInfo): void {
    const ctrlSched: [string, ThreadInfo][] = [];
    const others: [string, ThreadInfo][] = [];
    const counters: [string, ThreadInfo][] = [];
    for (const [key, thread] of process.threads.entries()) {
      if (thread.threadName.includes('AICPU-CTRL') || thread.threadName.includes('AICPU-SCHED')) {
        ctrlSched.push([key, thread]);
      } else if (thread.isCounter) {
        counters.push([key, thread]);
      } else {
        others.push([key, thread]);
      }
    }
    const getCoreSortKey = (threadName: string): [string, number] => {
      let match = threadName.match(/^(AIC|AIV)[_-](\d+)$/);
      if (match) return [match[1], parseInt(match[2], 10)];
      match = threadName.match(/^SCHED\d+-(AIC|AIV)-(\d+)$/) || threadName.match(/^(AIC|AIV)-(\d+)-SCHED\d+$/);
      if (match) return [match[1], parseInt(match[2], 10)];
      return ['', Infinity];
    };
    others.sort((a, b) => {
      const [typeA, idA] = getCoreSortKey(a[1].threadName);
      const [typeB, idB] = getCoreSortKey(b[1].threadName);
      if (typeA !== typeB) return typeA.localeCompare(typeB);
      return idA - idB;
    });
    process.threads.clear();
    for (const [key, thread] of ctrlSched) process.threads.set(key, thread);
    for (const [key, thread] of others) process.threads.set(key, thread);
    for (const [key, thread] of counters) process.threads.set(key, thread);
  }

  private recalculateLane2Line(): void {
    this.lane2line.clear();
    
    for (const [processKey, process] of this.processInfo.entries()) {
      for (const [threadKey, thread] of process.threads.entries()) {
        if (thread.isCounter) continue;
        
        const events = this.getEventsByIds(thread.eventIds);
        const lineCount = events.reduce((count, e) => Math.max(count, (e.line || 0) + 1), 1);
        const laneKey = `${processKey}@${thread.tid}`;
        this.lane2line.set(laneKey, lineCount);
      }
    }
  }

  private calculateLineCount(events: EventDetail[]): number {
    if (events.length === 0) return 1;
    
    const sortedEvents = [...events].sort((a, b) => a.startTime - b.startTime);
    let maxConcurrent = 1;
    let currentConcurrent = 0;
    const endTimes: number[] = [];
    
    for (const event of sortedEvents) {
      while (endTimes.length > 0 && endTimes[0] <= event.startTime) {
        endTimes.shift();
        currentConcurrent--;
      }
      
      endTimes.push(event.endTime);
      endTimes.sort((a, b) => a - b);
      currentConcurrent++;
      
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
    }
    
    return maxConcurrent;
  }

  public setMixMode(isMixMode: boolean): void {
    this.isMixModeActive = isMixMode;
  }

  public getMixMode(): boolean {
    return this.isMixModeActive;
  }

  public isDeviceView(): boolean {
    return this.isDeviceViewMerged;
  }

  public hasMixConfig(): boolean {
    return this.mixConfig.length > 0;
  }

  public getSwimLaneOrder(): SwimLaneItem[] {
    return this.swimLaneOrder;
  }

  public getWrapContainers(): WrapContainerInfo[] {
    return Array.from(this.wrapContainers.values());
  }

  public getWrapContainerByWrapId(wrapId: number): WrapContainerInfo | undefined {
    return this.wrapContainers.get(wrapId);
  }

  public getTotalLaneHeight(): number {
    let totalHeight = 0;
    for (const lane of this.swimLaneOrder) {
      totalHeight += lane.height;
    }
    return totalHeight;
  }

  public calculateMixLayout(layout: any, lane2line: Map<string, number>): void {
    this.lane2line = lane2line;
    this.buildWrapThreadMap();
    this.buildMixThreads();
    this.buildSwimLaneOrder(layout);
    this.buildWrapContainers();
    this.calculateYPositions(layout);
  }

  private buildWrapThreadMap(): void {
    this.wrapThreadMap.clear();
    
    for (const config of this.mixConfig) {
      const wrapId = config.wrapId;
      if (!this.wrapThreadMap.has(wrapId)) {
        this.wrapThreadMap.set(wrapId, []);
      }
      
      const parentEvent = this.eventMap.get(config.parentEventId);
      if (parentEvent) {
        const thread = this.getThreadByEvent(parentEvent.id);
        if (thread) {
          const existingThreads = this.wrapThreadMap.get(wrapId);
          if (existingThreads && !existingThreads.some(t => t.tid === thread.tid)) {
            existingThreads.push(thread);
          }
        }
      }
    }
  }

  private buildMixThreads(): void {
    this.mixThreads = [];
    
    const allMixThreads = new Set<ThreadInfo>();
    for (const threads of Array.from(this.wrapThreadMap.values())) {
      for (const thread of threads) {
        allMixThreads.add(thread);
      }
    }
    
    this.mixThreads = Array.from(allMixThreads);
    this.sortMixThreads();
  }

  private sortMixThreads(): void {
    const computeThreads = this.mixThreads.filter(t => this.isComputeThread(t));
    const vectorThreads = this.mixThreads.filter(t => this.isVectorThread(t));
    
    vectorThreads.sort((a, b) => Number(a.tid) - Number(b.tid));
    computeThreads.sort((a, b) => Number(a.tid) - Number(b.tid));
    
    this.mixThreads = [...vectorThreads, ...computeThreads];
  }

  private buildSwimLaneOrder(layout: any): void {
    this.swimLaneOrder = [];
    
    const { aicpuOriginThreads, nonCounterThreads, counterThreads } = this.getNonMixThreadsSorted();
    
    for (const thread of aicpuOriginThreads) {
      const threadHeight = this.getThreadHeight(thread, layout);
      this.swimLaneOrder.push({
        type: 'thread',
        thread,
        y: 0,
        height: threadHeight,
        wrapIds: []
      });
    }
    
    const fakeCoreThreads = this.getFakeCoreThreads();
    for (const thread of fakeCoreThreads) {
      const threadHeight = this.getThreadHeight(thread, layout);
      this.swimLaneOrder.push({
        type: 'thread',
        thread,
        y: 0,
        height: threadHeight,
        wrapIds: []
      });
    }
    
    const wrapGroups = this.buildWrapGroups();
    const wrapLabelHeight = layout.threadHeight;
    
    for (const group of wrapGroups) {
      const wrapStartTimes = group.wrapIds.map(id => this.getWrapStartTime(id));
      const wrapStartTime = Math.min(...wrapStartTimes);
      
      this.swimLaneOrder.push({
        type: 'wrap-label',
        wrapId: group.wrapIds[0],
        wrapIds: group.wrapIds,
        wrapStartTimes,
        label: `Wrap`,
        y: 0,
        height: wrapLabelHeight,
        startTime: wrapStartTime
      });
      
      const sortedThreads = this.sortThreadsForWrap(group.threads);
      
      for (const thread of sortedThreads) {
        const threadHeight = this.getThreadHeight(thread, layout);
        this.swimLaneOrder.push({
          type: 'thread',
          thread,
          y: 0,
          height: threadHeight,
          wrapIds: group.wrapIds
        });
      }
    }
    
    for (const thread of nonCounterThreads) {
      const threadHeight = this.getThreadHeight(thread, layout);
      this.swimLaneOrder.push({
        type: 'thread',
        thread,
        y: 0,
        height: threadHeight,
        wrapIds: []
      });
    }
    
    for (const thread of counterThreads) {
      const threadHeight = this.getThreadHeight(thread, layout);
      this.swimLaneOrder.push({
        type: 'thread',
        thread,
        y: 0,
        height: threadHeight,
        wrapIds: []
      });
    }
  }
  
  private buildWrapGroups(): { wrapIds: number[]; threads: ThreadInfo[]; cTid: number }[] {
    const wrapIds = Array.from(this.wrapThreadMap.keys());
    const parent: Map<number, number> = new Map();
    
    for (const wrapId of wrapIds) {
      parent.set(wrapId, wrapId);
    }
    
    const find = (id: number): number => {
      if (parent.get(id) !== id) {
        parent.set(id, find(parent.get(id)!));
      }
      return parent.get(id)!;
    };
    
    const union = (id1: number, id2: number): void => {
      const root1 = find(id1);
      const root2 = find(id2);
      if (root1 !== root2) {
        parent.set(root1, root2);
      }
    };
    
    const threadToWraps: Map<string, number[]> = new Map();
    for (const wrapId of wrapIds) {
      const threads = this.wrapThreadMap.get(wrapId) || [];
      for (const thread of threads) {
        if (!threadToWraps.has(thread.tid)) {
          threadToWraps.set(thread.tid, []);
        }
        threadToWraps.get(thread.tid)!.push(wrapId);
      }
    }
    
    for (const [, wraps] of threadToWraps) {
      if (wraps.length > 1) {
        for (let i = 1; i < wraps.length; i++) {
          union(wraps[0], wraps[i]);
        }
      }
    }
    
    const groups: Map<number, { wrapIds: number[]; threads: ThreadInfo[] }> = new Map();
    for (const wrapId of wrapIds) {
      const root = find(wrapId);
      if (!groups.has(root)) {
        groups.set(root, { wrapIds: [], threads: [] });
      }
      const group = groups.get(root)!;
      group.wrapIds.push(wrapId);
      const threads = this.wrapThreadMap.get(wrapId) || [];
      for (const thread of threads) {
        if (!group.threads.some(t => t.tid === thread.tid)) {
          group.threads.push(thread);
        }
      }
    }
    
    const result = Array.from(groups.values()).map(group => ({
      ...group,
      cTid: this.getComputeTidFromThreads(group.threads)
    }));
    
    result.sort((a, b) => a.cTid - b.cTid);
    
    return result;
  }

  private buildWrapContainers(): void {
    this.wrapContainers.clear();
    
    for (const [wrapId, subEvents] of Array.from(this.eventsByWrapId.entries())) {
      const parentEvents = subEvents.filter(e => e.subEventIds && e.subEventIds.length > 0);
      
      if (parentEvents.length === 0) continue;
      
      const allSubEvents = parentEvents.flatMap(e => 
        this.getSubEvents(e.id)
      );
      
      if (allSubEvents.length === 0) continue;
      
      const minStartTime = Math.min(...allSubEvents.map(e => e.startTime));
      const maxEndTime = Math.max(...allSubEvents.map(e => e.endTime));
      
      const threadTids = new Set<string>();
      for (const parentEvent of parentEvents) {
        const thread = this.getThreadByEvent(parentEvent.id);
        if (thread) {
          threadTids.add(thread.tid);
        }
      }
      
      this.wrapContainers.set(wrapId, {
        wrapId,
        label: `Wrap ${wrapId}`,
        minStartTime,
        maxEndTime,
        threadTids: Array.from(threadTids)
      });
    }
  }

  private calculateYPositions(layout: any): void {
    let currentY = 0;
    
    for (const lane of this.swimLaneOrder) {
      lane.y = currentY;
      
      if (lane.type === 'thread') {
        lane.thread.renderInfo = {
          startY: currentY,
          height: lane.height
        };
      }
      
      currentY += lane.height;
    }
  }

  private sortThreadsForWrap(threads: ThreadInfo[]): ThreadInfo[] {
    const computeThreads = threads.filter(t => this.isComputeThread(t));
    const vectorThreads = threads.filter(t => this.isVectorThread(t));
    
    vectorThreads.sort((a, b) => Number(a.tid) - Number(b.tid));
    computeThreads.sort((a, b) => Number(a.tid) - Number(b.tid));
    
    if (vectorThreads.length === 1 && computeThreads.length === 1) {
      return [vectorThreads[0], computeThreads[0]];
    } else if (vectorThreads.length === 2 && computeThreads.length === 1) {
      return [vectorThreads[0], computeThreads[0], vectorThreads[1]];
    }
    
    return [...vectorThreads, ...computeThreads];
  }

  private getComputeTidFromThreads(threads: ThreadInfo[]): number {
    const computeThread = threads.find(t => this.isComputeThread(t));
    return computeThread ? Number(computeThread.tid) : 0;
  }

  private isComputeThread(thread: ThreadInfo): boolean {
    return thread.threadName.includes('AIC_') || thread.threadName.includes('AIC-');
  }

  private isVectorThread(thread: ThreadInfo): boolean {
    return thread.threadName.includes('AIV_') || thread.threadName.includes('AIV-');
  }

  public getWrapStartTime(wrapId: number): number {
    const subEvents = this.getSubEventsByWrapId(wrapId);
    if (subEvents.length === 0) return 0;
    return Math.min(...subEvents.map(e => e.startTime));
  }

  private getFakeCoreThreads(): ThreadInfo[] {
    const fakeCoreThreads: ThreadInfo[] = [];
    
    for (const [processKey, process] of Array.from(this.processInfo.entries())) {
      for (const [threadKey, thread] of Array.from(process.threads.entries())) {
        if (thread.isFakeCore || thread.threadName.includes('Fake Core')) {
          fakeCoreThreads.push(thread);
          break;
        }
      }
    }
    
    return fakeCoreThreads;
  }

  private getNonMixThreads(): ThreadInfo[] {
    const nonMixThreads: ThreadInfo[] = [];
    
    for (const [processKey, process] of Array.from(this.processInfo.entries())) {
      for (const [threadKey, thread] of Array.from(process.threads.entries())) {
        const isMixThread = this.mixThreads.some(mt => mt.tid === thread.tid);
        if (!isMixThread) {
          nonMixThreads.push(thread);
        }
      }
    }
    
    return nonMixThreads;
  }

  private isAicpuOriginThread(thread: ThreadInfo): boolean {
    const originalName = (thread as any)._originalThreadName;
    if (!originalName) return false;
    return originalName.includes('AICPU-CTRL') ||
           originalName.includes('AICPU-SCHED') ||
           /^(SCHED\d+-(AIC|AIV)-\d+|(AIC|AIV)-\d+-SCHED\d+)$/.test(originalName);
  }

  private getNonMixThreadsSorted(): { aicpuOriginThreads: ThreadInfo[], nonCounterThreads: ThreadInfo[], counterThreads: ThreadInfo[] } {
    const nonMixThreads = this.getNonMixThreads();
    const isNotFake = (t: ThreadInfo) => !t.isFakeCore && !t.threadName.includes('Fake Core');

    const aicpuOriginThreads = nonMixThreads.filter(t => this.isAicpuOriginThread(t) && !t.isCounter && isNotFake(t));
    const nonCounterThreads = nonMixThreads.filter(t => !this.isAicpuOriginThread(t) && !t.isCounter && isNotFake(t));
    const counterThreads = nonMixThreads.filter(t => t.isCounter && isNotFake(t));

    aicpuOriginThreads.sort((a, b) => Number(a.tid) - Number(b.tid));
    nonCounterThreads.sort((a, b) => Number(a.tid) - Number(b.tid));
    counterThreads.sort((a, b) => Number(a.tid) - Number(b.tid));

    return { aicpuOriginThreads, nonCounterThreads, counterThreads };
  }

  private getThreadHeight(thread: ThreadInfo, layout: any): number {
    if (thread.isCounter) {
      return layout.counterHeight;
    }
    
    const processKey = this.getProcessKeyByThread(thread);
    const cacheKey = `${processKey}@${thread.tid}`;
    const lineCount = this.lane2line.get(cacheKey) || 1;
    return layout.threadHeight * lineCount;
  }
  
  private getProcessKeyByThread(thread: ThreadInfo): string {
    for (const [processKey, process] of Array.from(this.processInfo.entries())) {
      for (const [threadKey, t] of Array.from(process.threads.entries())) {
        if (t.tid === thread.tid) {
          return processKey;
        }
      }
    }
    return '';
  }

  public isMixParentEvent(event: EventDetail): boolean {
    return Array.isArray(event.subEventIds) && event.subEventIds.length > 0;
  }

  public getMixThreadFlattenedEvents(thread: ThreadInfo): EventDetail[] {
    const parentEvents = thread.eventIds
      .map(id => this.getEventById(id))
      .filter(e => e && this.isMixParentEvent(e));

    const events: EventDetail[] = [];

    for (const parentEvent of parentEvents) {
      const subEvents = this.getSubEvents(parentEvent.id);
      for (const subEvent of subEvents) {
        (subEvent as any)._mixEventType = 'subEvent';
        events.push(subEvent);
      }
      const waitTasks = this.getWaitTasks(parentEvent.id);
      for (const waitTask of waitTasks) {
        (waitTask as any)._mixEventType = 'waitTask';
        events.push(waitTask);
      }
    }

    const normalEvents = thread.eventIds
      .map(id => this.getEventById(id))
      .filter(e => e && !this.isMixParentEvent(e));
    for (const normalEvent of normalEvents) {
      (normalEvent as any)._mixEventType = 'normalEvent';
      events.push(normalEvent);
    }

    events.sort((a, b) => a.startTime - b.startTime);
    return events;
  }

  public getThreadYByTid(tid: string): number {
    for (const lane of this.swimLaneOrder) {
      if (lane.type === 'thread' && lane.thread.tid === tid) {
        return lane.y;
      }
    }
    return 0;
  }

  public getWrapLabelY(wrapId: number): number {
    for (const lane of this.swimLaneOrder) {
      if (lane.type === 'wrap-label' && lane.wrapId === wrapId) {
        return lane.y;
      }
    }
    return 0;
  }
}

export const swimDataManager = SwimDataManager.getInstance();

export default SwimDataManager;
