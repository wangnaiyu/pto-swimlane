/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */












import { generateColorList, getColorByString } from './color-list';
const t = (key: string, args?: unknown) => `${key}: ${JSON.stringify(args ?? {})}`;

const getLeafIndex = (event, task2topo) => {
  const { args } = event;
  const seqNo = args?.seqNo;
  const taskId = args?.taskId;
  if (seqNo === undefined || taskId === undefined) {
    return null;
  }
  const key = `${seqNo}-${taskId}`;
  return task2topo[key]?.leafIndex;
};

export function getSemanticColor(event: any, baseColorslist:any, lightColorslist:any): { dark: { base: string; light: string } } {
  let dBaseColor: string, dLightColor: string;
  const label = event?.color || '';
  const dres = getColorByString(label, baseColorslist, lightColorslist);
  dBaseColor = dres.baseColor ?? '#666666';
  dLightColor = dres.lightColor ?? '#666666';
  return { dark: { base: dBaseColor, light: dLightColor }};
}

const FAKE_CORE_KEYWORD = 'Fake Core';

function computeLatestPredEnd(event, allEventsMap) {
  const predecessors = event.dependencies?.predecessors;
  if (!predecessors?.length) {
    return null;
  }
  let latestPredEnd = null;
  for (const id of predecessors) {
    const pred = allEventsMap.get(id);
    if (pred && pred.endTime) {
      if (latestPredEnd === null || pred.endTime > latestPredEnd) {
        latestPredEnd = pred.endTime;
      }
    }
  }
  return latestPredEnd;
}

function computeEarliestSuccStart(event, allEventsMap) {
  const successors = event.dependencies?.successors;
  if (!successors?.length) {
    return null;
  }
  let earliestSuccStart = null;
  for (const id of successors) {
    const succ = allEventsMap.get(id);
    if (succ && succ.startTime) {
      if (earliestSuccStart === null || succ.startTime < earliestSuccStart) {
        earliestSuccStart = succ.startTime;
      }
    }
  }
  return earliestSuccStart;
}

function setEventRender(event, renderStart, renderEnd, lineIndex) {
  event.renderStartTime = renderStart;
  event.renderDuration = Math.round((renderEnd - renderStart) / 10);
  event.renderEndTime = event.renderStartTime + event.renderDuration;
  event.line = lineIndex;
}

function tryPlaceInExistingLine(event, lines, minStart, maxEnd, originalDuration, globalMaxTime) {
  const linesBN = lines.map(line => line || 0);
  for (let i = 0; i < linesBN.length; i++) {
    const renderStart = Math.max(minStart, linesBN[i]);
    if (renderStart >= maxEnd) {
      continue;
    }
    const renderEnd = Math.min(renderStart + originalDuration, maxEnd);
    setEventRender(event, renderStart, renderEnd, i);
    lines[i] = event.renderEndTime;
    return true;
  }
  return false;
}

function placeInNewLine(event, lines, minStart, maxEnd, originalDuration, globalMaxTime) {
  const renderStart = minStart;
  const renderEnd = Math.min(renderStart + originalDuration, maxEnd);
  setEventRender(event, renderStart, renderEnd, lines.length);
  lines.push(event.renderEndTime);
}

function layoutFakeCoreEvent(event, lines, allEventsMap, globalMaxTime) {
  const originalDuration = event.endTime - event.startTime;

  let minStart = event.startTime;
  let maxEnd = event.endTime;

  const latestPredEnd = computeLatestPredEnd(event, allEventsMap);
  if (latestPredEnd !== null) {
    minStart = Math.min(minStart, latestPredEnd);
  }

  const earliestSuccStart = computeEarliestSuccStart(event, allEventsMap);
  if (earliestSuccStart !== null) {
    maxEnd = Math.max(maxEnd, earliestSuccStart);
  }

  if (!tryPlaceInExistingLine(event, lines, minStart, maxEnd, originalDuration, globalMaxTime)) {
    placeInNewLine(event, lines, minStart, maxEnd, originalDuration, globalMaxTime);
  }
}

// --- 工厂函数：生成 calculateLine ---
function createCalculateLine(allEventsMap, globalMaxTime) {

  return function calculateLine(event, label2lines) {
    const isFakeCore = event.threadName?.includes?.(FAKE_CORE_KEYWORD);
    const label = `${event.pid}@${event.tid}`;

    let lines = label2lines[label];
    if (!lines) {
      label2lines[label] = lines = [];
    }

    if (isFakeCore) {
      layoutFakeCoreEvent(event, lines, allEventsMap, globalMaxTime);
    } else {
      // 普通线程：固定 renderTime，传统不重叠布局
      event.renderStartTime = event.startTime;
      event.renderEndTime = event.endTime;
      event.renderDuration = event.duration;

      let placed = false;
      const isZeroDuration = event.duration === 0;
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

    return lines.length;
  };
}

function calculateDuration (eventTasks, processedTasks) {
  let taskIndex = 0;
  let minTime = Infinity;
  let maxTime = -Infinity;
  while (taskIndex <= eventTasks.length - 1) {
    const tStart = eventTasks[taskIndex];
    if (tStart.ph.toUpperCase() === 'X') {      
      
      const ts = tStart.ts;
      const dur = Math.round(tStart.dur * 1000);
      
      const event = {
        ...tStart,
        id: `event_${tStart.originalIndex}`,
        startTime: ts,
        endTime: ts + dur,
        renderStartTime: ts,
        renderEndTime: ts + dur,
        renderDuration: dur,
        duration: dur,
        isCounter: false,
        dependencies: {
          predecessors: [],
          successors: []
        }
      };
      processedTasks.push(event);
      taskIndex += 1;
      minTime = Math.min(minTime, event.startTime);
      maxTime = Math.max(maxTime, event.endTime);
      continue;
    }
    const tEnd = eventTasks[taskIndex + 1];

    if (tEnd && tStart.id === tEnd.id && tStart.ph.toUpperCase() === 'B' && tEnd.ph.toUpperCase() === 'E') {

      const startTs = tStart.ts;
      const endTs = tEnd.ts;

      const processedEvent = {
        ...tStart,
        id: `event_${tStart.originalIndex}`,
        startTime: startTs,
        endTime: endTs,
        duration: endTs - startTs,
        renderStartTime: startTs,
        renderEndTime: endTs,
        isCounter: false,
        dependencies: {
          predecessors: [],
          successors: []
        }
      };
      minTime = Math.min(minTime, processedEvent.startTime);
      maxTime = Math.max(maxTime, processedEvent.endTime);
      processedTasks.push(processedEvent);
      taskIndex += 2;
    } else {
      taskIndex += 1;
    }
  }
  if (minTime === Infinity) minTime = 0;
  if (maxTime === -Infinity) maxTime = 0;
  return [maxTime, minTime];
};

const PMU_FIELD_ALIASES: Record<string, string[]> = {
  vec_busy_cycles: ['vec_busy_cycles', 'pmu_idc_aic_vec_busy_o'],
  cube_busy_cycles: ['cube_busy_cycles', 'cube_instr_busy'],
  scalar_busy_cycles: ['scalar_busy_cycles', 'scalar_instr_busy'],
  mte1_busy_cycles: ['mte1_busy_cycles', 'mte1_instr_busy'],
  mte2_busy_cycles: ['mte2_busy_cycles', 'mte2_instr_busy'],
  mte3_busy_cycles: ['mte3_busy_cycles', 'mte3_instr_busy'],
  pmu_fix_instr_busy: ['pmu_fix_instr_busy']
};

const normalizePmuTaskInfo = (taskInfo: { [key: string]: any }) => {
  const availableFields: Record<string, boolean> = {};
  for (const [targetKey, sourceKeys] of Object.entries(PMU_FIELD_ALIASES)) {
    const sourceKey = sourceKeys.find((key) => taskInfo[key] !== undefined && taskInfo[key] !== '');
    availableFields[targetKey] = Boolean(sourceKey);
    taskInfo[targetKey] = sourceKey ? taskInfo[sourceKey] : '0';
  }
  taskInfo.__available_pmu_fields = availableFields;
  return taskInfo;
};

export function parsePmuInfo(csvData: string) {
  const pmuInfo = {};
  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(header => header.trim());

  const hasSeqNo = headers.includes('seqNo');
  const hasSubGraphId = headers.includes('sub graph id');
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const taskInfo: { [key: string]: any } = {};
    const curLine = lines[i].split(',');

    for (let j = 0; j < headers.length; j++) {
      taskInfo[headers[j]] = curLine[j] ? curLine[j].trim() : ''; 
    }

    let uid: string;
    if (hasSeqNo) {
      if (taskInfo.seqNo === undefined || taskInfo['sub task id'] === undefined) {
        continue;
      }
      uid = String(taskInfo['seqNo']) + '-' + String(taskInfo['sub task id']);
    } else if (hasSubGraphId) {
      if (taskInfo['sub graph id'] === undefined || taskInfo['sub task id'] === undefined) {
        continue;
      }
      uid = String(taskInfo['sub graph id']) + '-' + String(taskInfo['sub task id']);
    } else {
      continue;
    }
    normalizePmuTaskInfo(taskInfo);
    pmuInfo[uid] = taskInfo; 
    pmuInfo[uid]['vec_ratio'] = taskInfo.vec_busy_cycles / taskInfo['total cycle'];
    pmuInfo[uid]['cube_ratio'] = taskInfo.cube_busy_cycles / taskInfo['total cycle'];
    pmuInfo[uid]['scalar_ratio'] = taskInfo.scalar_busy_cycles / taskInfo['total cycle'];
    pmuInfo[uid]['mte1_ratio'] = taskInfo.mte1_busy_cycles / taskInfo['total cycle'];
    pmuInfo[uid]['mte2_ratio'] = taskInfo.mte2_busy_cycles / taskInfo['total cycle'];
    pmuInfo[uid]['mte3_ratio'] = taskInfo.mte3_busy_cycles / taskInfo['total cycle'];
    pmuInfo[uid]['icache_hit'] = 1 - taskInfo.icache_miss / taskInfo.icache_req;
    
  }
  return pmuInfo;
}

const calculateDependenciesBytopo = (events, task2topo) => {
  const predecessors: Record<string, string[]> = Object.fromEntries(Object.keys(task2topo).map(taskId => [taskId, []]));
  for (const taskId in task2topo) {
    const taskInfo = task2topo[taskId];
    for (const successor of taskInfo.successors) {
      predecessors[successor] = [...(predecessors[successor] || []), taskId];
    }
  }
  const topoDependencies: Record<string, { predecessors: string[]; successors: string[]}> = Object.fromEntries(
    Object.keys(task2topo).map(taskId => [
      taskId,
      {
        predecessors: predecessors[taskId],
        successors: task2topo[taskId].successors
      }
    ])
  );
  const taskMap = new Map<string, any>();
  for (const event of events) {
    // Standalone fix: AICPU markers have no task identity; retain their flow dependencies.
    if (event.args?.seqNo === undefined || event.args?.taskId === undefined) continue;
    const taskId = `${event.args.seqNo}-${event.args.taskId}`;
    if (taskMap.has(taskId)) {
      return false;
    }
    taskMap.set(taskId, event);
  }
  for (const taskId of Object.keys(topoDependencies)) {
    const taskDependencies = topoDependencies[taskId];
    const event = taskMap.get(taskId);
    if (event) {
      event.dependencies.predecessors = taskDependencies.predecessors.map(predecessor => taskMap.get(predecessor)?.id || '');
      event.dependencies.successors = taskDependencies.successors.map(successor => taskMap.get(successor)?.id || '');
    }
  }
  return true;
};

const calculateDependencies = (events, connections) => {
    // 初始化所有事件的依赖结构
    events.forEach(event => {
      if (!event.isCounter) {
        event.dependencies = {};
        event.dependencies.predecessors = [];
        event.dependencies.successors = [];
      }
    });

    // 使用 Map 按 id 配对 start/finish 事件，O(n) 一次遍历
    const connectionPairs = new Map();

    for (const conn of connections) {
      const id = conn.id;
      if (!connectionPairs.has(id)) {
        connectionPairs.set(id, { start: null, end: null });
      }
      const pair = connectionPairs.get(id);
      if (conn.ph === 's') {
        pair.start = conn;
      } else if (conn.ph === 'f') {
        pair.end = conn;
      }
    }

    // 构建事件索引用于快速查找
    const eventIndex = new Map();
    events.forEach(event => {
      const key = `${event.pid}_${event.tid}`;
      if (!eventIndex.has(key)) {
        eventIndex.set(key, []);
      }
      eventIndex.get(key).push(event);
    });

    // 对每个 tid 的事件列表按 startTime 排序
    for (let eventsList of eventIndex.values()) {
      eventsList.sort((a, b) => a.startTime - b.startTime);
    }

    // 遍历所有配对，建立依赖关系
    for (const pair of connectionPairs.values()) {
      if (!pair.start || !pair.end) continue;

      const start = pair.start;
      const end = pair.end;

      if (start.ts > end.ts) continue;

      const key1 = `${start.pid}_${start.tid}`;
      const key2 = `${end.pid}_${end.tid}`;

      const parentEvents = eventIndex.get(key1);
      const parent = parentEvents ? findEvent(parentEvents, start.ts) : null;

      const childEvents = eventIndex.get(key2);
      const child = childEvents ? findEvent(childEvents, end.ts) : null;

      if (parent && child) {
        if (!parent.dependencies.successors.includes(child.id)) {
          parent.dependencies.successors.push(child.id);
        }
        if (!child.dependencies.predecessors.includes(parent.id)) {
          child.dependencies.predecessors.push(parent.id);
        }
      }
    }
  };
  
  // 二分查找辅助函数
  const findEvent = (eventsList, timestamp) => {
    let left = 0;
    let right = eventsList.length - 1;
  
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const event = eventsList[mid];
  
      if (timestamp >= event.startTime && timestamp <= event.endTime) {
        return event;
      } else if (timestamp < event.startTime) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
  
    return null;
  }

  function processTaskPmuCalc(event: any, pmuInfo: any, pmuNotFoundList: any, effectPmu: any) {
    if (event.threadName.includes(FAKE_CORE_KEYWORD) == true) {
      return;
    }
    const seqNo = event.args?.seqNo;
    const taskId = event.args?.taskId;
    if (seqNo === undefined || taskId === undefined) {
      return;
    }
    const taskPmuKey = String(event['args']['seqNo']) + '-' + String(event['args']['taskId']);
    const taskPmuInfo = pmuInfo[taskPmuKey];
    if (taskPmuInfo === undefined) {
      pmuNotFoundList.push(taskPmuKey);
      return;
    }
    event['pmu_info'] = taskPmuInfo;
    event['pmu_calc_info'] = {};
    event['pmu_calc_info']['vec_ratio'] = taskPmuInfo.vec_busy_cycles / taskPmuInfo['total cycle'];
    event['pmu_calc_info']['cube_ratio'] = taskPmuInfo.cube_busy_cycles / taskPmuInfo['total cycle'];
    event['pmu_calc_info']['scalar_ratio'] = taskPmuInfo.scalar_busy_cycles / taskPmuInfo['total cycle'];
    event['pmu_calc_info']['mte1_ratio'] = taskPmuInfo.mte1_busy_cycles / taskPmuInfo['total cycle'];
    event['pmu_calc_info']['mte2_ratio'] = taskPmuInfo.mte2_busy_cycles / taskPmuInfo['total cycle'];
    event['pmu_calc_info']['mte3_ratio'] = taskPmuInfo.mte3_busy_cycles / taskPmuInfo['total cycle'];
    event['pmu_calc_info']['icache_hit'] = 1 - taskPmuInfo.icache_miss / taskPmuInfo.icache_req;
    effectPmu[taskPmuKey] = taskPmuInfo;
    delete pmuInfo[taskPmuKey];
    return true;
  }

  export function processTotalPmuCalc(pmuTotal :any) {
    pmuTotal['vec_ratio'] = (Number(pmuTotal.vec_busy_cycles) / Number(pmuTotal['total cycle'])).toString();
    pmuTotal['cube_ratio'] = (Number(pmuTotal.cube_busy_cycles) / Number(pmuTotal['total cycle'])).toString();
    pmuTotal['scalar_ratio'] = (Number(pmuTotal.scalar_busy_cycles) / Number(pmuTotal['total cycle'])).toString();
    pmuTotal['mte1_ratio'] = (Number(pmuTotal.mte1_busy_cycles) / Number(pmuTotal['total cycle'])).toString();
    pmuTotal['mte2_ratio'] = (Number(pmuTotal.mte2_busy_cycles) / Number(pmuTotal['total cycle'])).toString();
    pmuTotal['mte3_ratio'] = (Number(pmuTotal.mte3_busy_cycles) / Number(pmuTotal['total cycle'])).toString();
    pmuTotal['icache_hit'] = (1 - Number(pmuTotal.icache_miss) / Number(pmuTotal.icache_req)).toString();

    pmuTotal['total cycle'] = pmuTotal['total cycle'].toString();
    pmuTotal.vec_busy_cycles = pmuTotal.vec_busy_cycles.toString();
    pmuTotal.cube_busy_cycles = pmuTotal.cube_busy_cycles.toString();
    pmuTotal.scalar_busy_cycles = pmuTotal.scalar_busy_cycles.toString();
    pmuTotal.mte1_busy_cycles = pmuTotal.mte1_busy_cycles.toString();
    pmuTotal.mte2_busy_cycles = pmuTotal.mte2_busy_cycles.toString();
    pmuTotal.mte3_busy_cycles = pmuTotal.mte3_busy_cycles.toString();
    pmuTotal.icache_miss = pmuTotal.icache_miss.toString();
    pmuTotal.icache_req = pmuTotal.icache_req.toString();
    if (pmuTotal.pmu_fix_instr_busy !== undefined) {
      pmuTotal.pmu_fix_instr_busy = pmuTotal.pmu_fix_instr_busy.toString();
    }
  }


const PMU_REQUIRED_FIELDS = [
  'pmu_idc_aic_vec_busy_o', 'cube_instr_busy', 'scalar_instr_busy',
  'mte1_instr_busy', 'mte2_instr_busy', 'mte3_instr_busy',
  'pmu_fix_instr_busy', 'icache_req', 'icache_miss'
];

export function checkPmuDataValid(pmuTotal: any, csvHeaders?: string[]): boolean {
  if (!pmuTotal || Object.keys(pmuTotal).length === 0) {
    return false;
  }

  if (csvHeaders && csvHeaders.length > 0) {
    const missingFields = PMU_REQUIRED_FIELDS.filter(field => !csvHeaders.includes(field));
    if (missingFields.length > 0) {
      return false;
    }
  }

  if (!pmuTotal['total cycle'] || Number(pmuTotal['total cycle']) === 0) {
    return false;
  }

  const busyCycleFields = ['vec_busy_cycles', 'cube_busy_cycles', 'scalar_busy_cycles',
                           'mte1_busy_cycles', 'mte2_busy_cycles', 'mte3_busy_cycles'];
  const hasValidBusyCycle = busyCycleFields.some(field => {
    const value = pmuTotal[field];
    return value !== undefined && value !== '' && Number(value) > 0;
  });

  if (!hasValidBusyCycle) {
    return false;
  }

  return true;
};

const SUPPORTED_PHASES = new Set(['C', 'X', 'M', 's', 'f', 'B', 'E']);
const DURATION_EVENT_PHASES = new Set(['X', 'B', 'E']);

const threadNameError = (event: any): string => {
  if (event.pid && event.tid) {
    return t('pypto.swimGraph.validate.threadWithid', { pid: event.pid, tid: event.tid });
  }
  return t('pypto.swimGraph.validate.thread');
};

const eventError = (event: any): string => {
  return event.name
    ? t('pypto.swimGraph.validate.eventWithName', { name: event.name })
    : t('pypto.swimGraph.validate.event');
};

const hasRequiredFields = (event: any, fields: string[]): boolean => {
  return fields.every((field) => field in event);
};

const validateThreadName = (event: any): string | null => {
  if (!hasRequiredFields(event, ['pid', 'tid', 'args'])) {
    return threadNameError(event);
  }
  if (!('name' in event.args)) {
    return threadNameError(event);
  }
  return null;
};

const validateDurationEvent = (event: any): string | null => {
  if (!hasRequiredFields(event, ['name', 'pid', 'tid', 'ts']) || Number.isNaN(event.ts)) {
    return eventError(event);
  }
  return null;
};

const validateCounterValue = (args: any, name: string): string | null => {
  const hasSize = 'size' in args;
  const hasValue = 'value' in args;
  const hasByte = '/byte' in args;

  if (!hasSize && !hasByte && !hasValue) {
    return t('pypto.swimGraph.validate.cntEvent', { name });
  }
  if ((args.size || args.value) && !(typeof args.size === 'number' || typeof args.value === 'number')) {
    return t('pypto.swimGraph.validate.cntEvent', { name });
  }
  if (args['/byte'] && typeof args['/byte'] !== 'number') {
    return t('pypto.swimGraph.validate.cntEvent', { name });
  }
  return null;
};

const validateCounterEvent = (event: any): string | null => {
  if (!hasRequiredFields(event, ['name', 'pid', 'tid', 'ts', 'args'])) {
    return eventError(event);
  }
  return validateCounterValue(event.args, event.name);
};

async function validate(event: any) {
  const errorMsg: any = {};

  if (!SUPPORTED_PHASES.has(event.ph)) {
    errorMsg.errMsg = t('pypto.swimGraph.validate.unsupportedEventType', { type: event.ph });
    return errorMsg;
  }

  if (event.name === 'thread_name') {
    const err = validateThreadName(event);
    if (err) {
      errorMsg.errMsg = err;
      return errorMsg;
    }
  }

  if (DURATION_EVENT_PHASES.has(event.ph)) {
    const err = validateDurationEvent(event);
    if (err) {
      errorMsg.errMsg = err;
      return errorMsg;
    }
  }

  if (event.ph === 'C') {
    const err = validateCounterEvent(event);
    if (err) {
      errorMsg.errMsg = err;
      return errorMsg;
    }
  }

  if (event.ph === 'X' && !('dur' in event)) {
    errorMsg.errMsg = eventError(event);
  }

  return errorMsg;
}

function calculateMinTs(traceEvents: any[]): number {
  let minThresh = Infinity;
  for (let index = 0; index < traceEvents.length; index++) {
    const ts = traceEvents[index].ts;
    if (ts < minThresh) {
      minThresh = ts;
    }
  }
  return minThresh;
}

function normalizeEventTimestamps(event: any, minThresh: number): void {
  event.ts = Math.round(event.ts * 1000 - minThresh * 1000);
  if (event.args?.syncEvents) {
    for (let i = 0; i < event.args.syncEvents.length; i++) {
      event.args.syncEvents[i].time = Math.round(event.args.syncEvents[i].time * 1000 - minThresh * 1000);
    }
  }
}

function isCounterEvent(event: any): boolean {
  return event.ph === 'C' && (
    typeof(event.args.size) === 'number' ||
    typeof(event.args['/byte']) === 'number' ||
    typeof(event.args.value) === 'number'
  );
}

interface TraceMetadata {
  processNames: Map<any, any>;
  processTypes: Map<any, any>;
  threadNames: Map<string, any>;
  eventTasks: any[];
  connections: any[];
  counterEvents: any[];
}

async function collectTraceMetadata(
  traceEvents: any[],
  task2topo: any,
  minThresh: number
): Promise<TraceMetadata | { errMsg: string }> {
  const processNames = new Map();
  const processTypes = new Map();
  const threadNames = new Map();
  const eventTasks: any[] = [];
  const connections: any[] = [];
  let counterEvents: any[] = [];

  for (let index = 0; index < traceEvents.length; index++) {
    const event = traceEvents[index];
    normalizeEventTimestamps(event, minThresh);

    const errorMsg = await validate(event);
    if ('errMsg' in errorMsg) {
      return errorMsg;
    }

    if (event.name === 'process_name') {
      processNames.set(event.pid, event.args.name);
      if (event.args.type === 'aicpu') {
        processTypes.set(event.pid, 'aicpu');
      }
    } else if (event.name === 'thread_name') {
      threadNames.set(`${event.pid}-${event.tid}`, event.args.name);
    } else if (['X', 'B', 'E', 'C'].includes(event.ph) && !(event.name.startsWith('OOO_'))) {
      if (isCounterEvent(event)) {
        const sId = event.name;
        if (!threadNames.has(sId)) {
          threadNames.set(sId, event.name);
        }
        counterEvents.push({ ...event, isCounter: true });
      } else {
        const leafIndex = getLeafIndex(event, task2topo);
        event['leafIndex'] = leafIndex;
        const color = {};
        const threadName = threadNames.get(`${event.pid}-${event.tid}`);
        eventTasks.push({ ...event, originalIndex: index, color, threadName, leafIndex });
      }
    } else if (['s', 'f'].includes(event.ph)) {
      connections.push(event);
    }
  }

  return { processNames, processTypes, threadNames, eventTasks, connections, counterEvents };
}

function buildProcessThreadMap(
  eventTasks: any[],
  counterEvents: any[],
  processNames: Map<any, any>,
  processTypes: Map<any, any>,
  threadNames: Map<string, any>
): Map<string, any> {
  const processThreadMap = new Map();
  [...eventTasks, ...counterEvents].forEach((event: any) => {
    const processKey = `${event.pid || 0}`;
    const threadKey = event.isCounter ? event.name : `${event.pid || 0}-${event.tid || 0}`;

    if (!processThreadMap.has(processKey)) {
      processThreadMap.set(processKey, {
        pid: event.pid || 0,
        processName: processNames.get(event.pid) || `Process ${event.pid || 0}`,
        type: processTypes.get(event.pid) || 'kernel',
        threads: new Map()
      });
    }

    const process = processThreadMap.get(processKey);
    if (!process.threads.has(threadKey)) {
      const threadName = threadNames.get(threadKey) || `Thread ${event.tid || 0}`;
      process.threads.set(threadKey, {
        tid: event.tid || 0,
        threadName,
        events: []
      });
    }
  });
  return processThreadMap;
}

function determineDataType(processThreadMap: Map<string, any>): { isAicpuData: boolean; isE2ESwim: boolean } {
  let hasAicpu = false;
  let hasKernel = false;
  for (const proc of processThreadMap.values()) {
    if (proc.type === 'aicpu') hasAicpu = true;
    else hasKernel = true;
  }
  return {
    isAicpuData: hasAicpu && !hasKernel,
    isE2ESwim: hasAicpu && hasKernel,
  };
}

function resolveDependencies(
  processedTasks: any[],
  task2topo: any,
  connections: any[],
  isAicpuData: boolean
): void {
  let calcTopoDepRes = false;
  try {
    calcTopoDepRes = calculateDependenciesBytopo(processedTasks, task2topo);
  } catch (error) {
    console.log(error);
  }
  const useTopo = !isAicpuData && Object.keys(task2topo).length > 0;
  const status = useTopo ? calcTopoDepRes : false;
  if (!status) {
    calculateDependencies(processedTasks, connections);
  }
}

function calculateLanesAndPmu(
  processedTasks: any[],
  lane2line: Map<string, any>,
  isAicpuData: boolean,
  pmuInfo: any,
  effectPmu: any
): void {
  const allEventsMap = new Map(processedTasks.map(e => [e.id, e]));
  const globalMaxTime = processedTasks.reduce((max, e) => {
    return e.endTime > max ? e.endTime : max;
  }, -Infinity);
  const calculateLine = createCalculateLine(allEventsMap, globalMaxTime);
  const lable2lines = {};
  const pmuNotFoundList = [];
  for (const event of processedTasks) {
    const lineCount = calculateLine(event, lable2lines);
    lane2line.set(`${event.pid}@${event.tid}`, lineCount);
    if (!isAicpuData && Object.keys(pmuInfo).length > 0) {
      processTaskPmuCalc(event, pmuInfo, pmuNotFoundList, effectPmu);
    }
  }
  if (pmuNotFoundList.length > 0) {
    console.warn('info not found in pmu csv', pmuNotFoundList);
  }
  const uselessPmuInfo = Object.keys(pmuInfo);
  if (uselessPmuInfo.length > 0) {
    console.warn('useless pmu info', uselessPmuInfo);
  }
}

function organizeDataStructure(
  processedTasks: any[],
  counterEvents: any[],
  processes: Map<string, any>,
  processExpanded: Map<string, any>,
  processThreadMap: Map<string, any>
): void {
  let firstExpanded = false;
  [...processedTasks, ...counterEvents].forEach((event: any) => {
    const processKey = `${event.pid || 0}`;
    const threadKey = event.isCounter ? event.name : `${event.pid || 0}-${event.tid || 0}`;

    if (!processes.has(processKey)) {
      const processInfo = processThreadMap.get(processKey);
      let expanded = false;
      if (!firstExpanded) {
        expanded = true;
        firstExpanded = true;
      }
      processes.set(processKey, {
        pid: processInfo.pid,
        processName: processInfo.processName,
        type: processInfo.type,
        threads: new Map(),
        expanded: expanded,
      });
      processExpanded.set(processKey, expanded);
    }

    const process = processes.get(processKey);
    if (!process.threads.has(threadKey)) {
      const threadInfo = processThreadMap.get(processKey).threads.get(threadKey);
      const info = {
        tid: threadInfo.tid,
        threadName: threadInfo.threadName,
        events: [],
        isCounter: false,
        isFakeCore: threadInfo.threadName.includes(FAKE_CORE_KEYWORD),
        maxCount: 0,
        argKey: 'size',
      };
      if (event.isCounter) {
        info.isCounter = true;
        info.maxCount = 0;
        info.argKey = Object.keys(event.args)[0];
      }
      process.threads.set(threadKey, info);
    }

    const thread = process.threads.get(threadKey);
    event.isFakeCore = thread.isFakeCore;
    thread.events.push(event);
    if (thread.isCounter) {
      thread.maxCount = Math.max(thread.maxCount, event.args[thread.argKey]);
    }
  });
}

interface BuildResultParams {
  counterEvents: any[];
  processes: Map<string, any>;
  processExpanded: Map<string, any>;
  lane2line: Map<string, any>;
  maxTime: number;
  minTime: number;
  minThresh: number;
  isAicpuData: boolean;
  isE2ESwim: boolean;
}

function buildResult(params: BuildResultParams): any {
  const { counterEvents, processes, processExpanded, lane2line,
          maxTime, minTime, minThresh, isAicpuData, isE2ESwim } = params;
  const data: any = {};
  data['counterEvents'] = counterEvents;
  data['processes'] = processes;
  data['processExpanded'] = processExpanded;
  data['lane2line'] = lane2line;
  data['timeInfo'] = { maxTime: maxTime, minTime: minTime };
  data['minTs'] = minThresh;
  if (isAicpuData) {
    data['isAicpu'] = true;
  }
  if (isE2ESwim) {
    data['isE2ESwim'] = true;
  }
  return data;
}

export async function parseSwimLaneInfo(traceData: any, pmuInfo: any, task2topo: any, effectPmu: any) {
  if (!traceData || !traceData.traceEvents) {
    return { errMsg: t('pypto.swimGraph.validate.nodata') };
  }

  const traceEvents = traceData.traceEvents;
  const minThresh = calculateMinTs(traceEvents);

  const metadata = await collectTraceMetadata(traceEvents, task2topo, minThresh);
  if ('errMsg' in metadata) {
    return metadata;
  }
  const { processNames, processTypes, threadNames, eventTasks, connections, counterEvents } = metadata;

  const sortedCounterEvents = counterEvents.sort((a, b) => a.ts - b.ts);
  const processThreadMap = buildProcessThreadMap(
    eventTasks, sortedCounterEvents, processNames, processTypes, threadNames
  );

  let processedTasks: any[] = [];
  const [maxTime, minTime] = calculateDuration(eventTasks, processedTasks);
  processedTasks = processedTasks.sort((a, b) => a.startTime - b.startTime);

  const { isAicpuData, isE2ESwim } = determineDataType(processThreadMap);

  resolveDependencies(processedTasks, task2topo, connections, isAicpuData);

  const lane2line = new Map();
  calculateLanesAndPmu(processedTasks, lane2line, isAicpuData, pmuInfo, effectPmu);

  const processes = new Map();
  const processExpanded = new Map();
  organizeDataStructure(processedTasks, sortedCounterEvents, processes, processExpanded, processThreadMap);

  return buildResult({
      counterEvents: sortedCounterEvents, processes, processExpanded, lane2line,
      maxTime, minTime, minThresh, isAicpuData, isE2ESwim
    });
  };

