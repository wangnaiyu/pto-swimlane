/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */

/**
 * CanvasPool —— Canvas 注册中心
 *
 * 设计要点：
 * 1. 只持有 canvas 元信息（命名 / z-index / purpose / lifecycle / 所属区域 / 启用类型）
 *    不托管 DOM 生命周期，DOM 仍由各区域组件自行管理
 * 2. 提供 register / unregister 让区域组件挂载时登记、卸载时注销
 * 3. 提供 getActiveCanvases(type) 由类型决定激活集
 * 4. 提供 featureCanvasMap 功能到 canvas 的跨区域映射
 *
 * 本次改造先纳入 3 个 canvas：
 *   - processHeader 区：process-header-canvas、process-hover-header-canvas
 *   - detail 区：dependency-canvas
 * 后续可逐步扩展到其他区域。
 */

/** Canvas 所属区域 */
export type CanvasRegion =
  | 'global'
  | 'timeline'
  | 'processHeader'
  | 'processEvent'
  | 'pinned'
  | 'detail'
  | 'aicpuCore';

/** Canvas 生命周期类型 */
export type CanvasLifecycle =
  | 'singleton'      // 全局唯一，随泳道图生死
  | 'per-process'    // 每个进程一组
  | 'per-pinned'     // 每个置顶线程一组
  | 'conditional';   // 条件渲染（如选中事件时）

/** Canvas 注册元信息 */
export interface CanvasMeta {
  /** canvas 名称（与 DOM class 对齐） */
  name: string;
  /** 所属区域 */
  region: CanvasRegion;
  /** z-index（'DOM' 表示不显式设置，依赖 DOM 顺序） */
  zIndex: number | 'DOM';
  /** 功能描述 */
  purpose: string;
  /** 生命周期类型 */
  lifecycle: CanvasLifecycle;
  /** 启用该 canvas 的泳道图类型；未列出的类型下该 canvas 不激活 */
  types: string[];
}

/** 功能到 canvas 的跨区域映射 */
export interface FeatureCanvasMap {
  [featureName: string]: string[];
}

/** 注册表条目：meta + 实例句柄（按 instanceKey 索引，支持 per-process/per-pinned 多实例） */
interface RegistryEntry {
  meta: CanvasMeta;
  /** instanceKey → canvas DOM 元素；singleton/conditional 用 '_default' */
  instances: Map<string, HTMLCanvasElement>;
}

/** Canvas 注册表元信息（按区域分组） */
const CANVAS_REGISTRY: CanvasMeta[] = [
  // ===== processHeader 区 =====
  {
    name: 'process-header-canvas',
    region: 'processHeader',
    zIndex: 'DOM',
    purpose: '进程头部点击观测线',
    lifecycle: 'per-process',
    types: ['kernel', 'aicpu', 'mix', 'three'],
  },
  {
    name: 'process-hover-header-canvas',
    region: 'processHeader',
    zIndex: 'DOM',
    purpose: '进程头部悬浮观测线',
    lifecycle: 'per-process',
    types: ['kernel', 'aicpu', 'mix', 'three'],
  },
  // ===== detail 区 =====
  {
    name: 'dependency-canvas',
    region: 'detail',
    zIndex: 'DOM',
    purpose: '选中事件依赖关系图',
    lifecycle: 'conditional',
    types: ['kernel', 'aicpu', 'mix', 'three'],
  },
];

/** 功能到 canvas 映射（覆盖本次改造的 3 个 canvas 相关功能） */
const FEATURE_CANVAS_MAP: FeatureCanvasMap = {
  // 观测线功能跨区域：时间轴 + 进程头部 + 进程事件 + 置顶
  'observation-line': [
    'flags-canvas',
    'hover-flags-canvas',
    'line-events-canvas',
    'process-header-canvas',
    'process-hover-header-canvas',
    'pinned-line-canvas',
  ],
  // 选中事件展示依赖：详情面板 dependency-canvas + 全局连接线
  'show-dependencies': [
    'global-connection-canvas',
    'dependency-events-canvas',
    'dependency-canvas',
  ],
};

export class CanvasPool {
  /** name → RegistryEntry */
  private registry: Map<string, RegistryEntry> = new Map();

  constructor() {
    // 预置元信息（实例由各区域组件运行时 register 填充）
    CANVAS_REGISTRY.forEach(meta => {
      this.registry.set(meta.name, { meta, instances: new Map() });
    });
  }

  /** 区域组件挂载 canvas 时调用：登记实例 */
  register(name: string, instanceKey: string, canvas: HTMLCanvasElement) {
    const entry = this.registry.get(name);
    if (!entry) {
      console.warn(`[CanvasPool] 未注册的 canvas 名称: ${name}`);
      return;
    }
    entry.instances.set(instanceKey, canvas);
  }

  /** 区域组件卸载 canvas 时调用：注销实例 */
  unregister(name: string, instanceKey: string) {
    const entry = this.registry.get(name);
    if (!entry) return;
    entry.instances.delete(instanceKey);
  }

  /** 获取单个实例（singleton / conditional 用 '_default'） */
  getCanvas(name: string, instanceKey: string = '_default'): HTMLCanvasElement | null {
    return this.registry.get(name)?.instances.get(instanceKey) ?? null;
  }

  /** 获取某 canvas 的所有实例（per-process / per-pinned 用） */
  getAllInstances(name: string): Map<string, HTMLCanvasElement> {
    return this.registry.get(name)?.instances ?? new Map();
  }

  /** 获取 canvas 元信息 */
  getMeta(name: string): CanvasMeta | undefined {
    return this.registry.get(name)?.meta;
  }

  /** 判断某 canvas 在指定类型下是否激活 */
  isActiveForType(name: string, type: string): boolean {
    const meta = this.getMeta(name);
    return meta ? meta.types.includes(type) : false;
  }

  /** 获取某区域下当前激活的 canvas 名称列表 */
  getActiveCanvasesByRegion(region: CanvasRegion, type: string): string[] {
    const result: string[] = [];
    this.registry.forEach(entry => {
      if (entry.meta.region === region && entry.meta.types.includes(type)) {
        result.push(entry.meta.name);
      }
    });
    return result;
  }

  /** 获取功能命中的 canvas 列表（跨区域） */
  getFeatureCanvases(featureName: string): string[] {
    return FEATURE_CANVAS_MAP[featureName] ?? [];
  }

  /** 获取完整注册表（用于文档/调试） */
  getRegistry(): CanvasMeta[] {
    return Array.from(this.registry.values()).map(e => e.meta);
  }
}

/** 全局单例 */
export const canvasPool = new CanvasPool();
