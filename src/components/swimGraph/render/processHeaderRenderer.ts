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
 * processHeaderRenderer —— 进程头部区渲染器
 *
 * 渲染层职责：从 CanvasPool 取 canvas 实例，执行纯绘制逻辑。
 * 不管理 DOM（canvas 创建/销毁由 swimGraphProcessHeader.vue 负责），
 * 不管理资源（实例索引由 CanvasPool 负责）。
 *
 * 命名按区域（processHeader）而非单一功能，便于后续在该区域扩展其他渲染能力。
 */

import { canvasPool } from './canvasPool';

/** 观测线类型：'' 点击层 / 'over' 悬浮层 */
export type HeaderLineFlag = '' | 'over';

/** canvas 名称按 flag 映射 */
const FLAG_NAME_MAP: Record<HeaderLineFlag, string> = {
  '': 'process-header-canvas',
  'over': 'process-hover-header-canvas',
};

export class ProcessHeaderRenderer {
  /**
   * 在所有进程的头部 canvas 上画观测线
   * @param x 观测线 x 坐标
   * @param color 颜色
   * @param flag '' 点击层 / 'over' 悬浮层
   * @param height 线高度（默认 30）
   */
  drawObservationLine(x: number, color: string, flag: HeaderLineFlag, height: number = 30) {
    const name = FLAG_NAME_MAP[flag];
    const instances = canvasPool.getAllInstances(name);
    instances.forEach(canvasRef => {
      if (!canvasRef) return;
      const ctx = canvasRef.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });
  }

  /**
   * 清除所有进程头部 canvas 上的观测线
   * @param flag '' 点击层 / 'over' 悬浮层
   */
  eraseObservationLine(flag: HeaderLineFlag) {
    const name = FLAG_NAME_MAP[flag];
    const instances = canvasPool.getAllInstances(name);
    instances.forEach(canvasRef => {
      if (!canvasRef) return;
      const ctx = canvasRef.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    });
  }
}

/** 全局单例 */
export const processHeaderRenderer = new ProcessHeaderRenderer();
