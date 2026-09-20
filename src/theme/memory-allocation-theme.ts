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
 * MemoryAllocation 组件主题配置
 * @description [浅色，深色]
 */
type Theme = Record<string, [string, string]>;

const memoryAllocationTheme: Theme = {
  // ==================== 图例颜色 ====================
  // 图例 - 方形颜色
  'ma-legend-square': ['rgba(10, 89, 247, 0.4)', '#336EB2'],
  // 图例 - 圆形颜色
  'ma-legend-circle': ['rgba(10, 89, 247, 0.2)', '#6E7B8B'],
  // 图例 - 六边形颜色
  'ma-legend-hexagon': ['rgba(174, 174, 174, 1)', '#626263'],
  // 图例 - 文字颜色
  'ma-legend-text': ['rgba(136, 136, 136, 1)', 'rgba(180, 180, 180, 1)'],
  'ma-box-bg': ['rgba(0, 0, 0, 0.03)', 'rgba(255, 255, 255, 0)'],

  // ==================== 内存内容区域 ====================
  // 芯片容器背景色
  'ma-memory-container-bg': ['rgba(255, 255, 255, 1)', 'rgba(26, 26, 26, 1)'],
  // 内存容器背景色
  'ma-memoryType-bg': ['rgba(233, 233, 233, 1)', 'rgba(46, 46, 46, 1)'],
  // 内存容器边框
  'ma-memory-container-border': ['rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.1)'],

  // ==================== 事件列表 ====================
  // 事件项 - 播放中边框颜色
  'ma-event-playing-border': ['#336EB2', '#4A90D9'],
  // 事件项 - 播放中背景颜色
  'ma-event-playing-bg': ['rgba(51, 110, 178, 0.15)', 'rgba(74, 144, 217, 0.2)'],

  // ==================== 弹窗详情 ====================
  // 弹窗背景
  'ma-modal-bg': ['rgba(255, 255, 255, 1)', 'rgba(45, 45, 45, 1)'],
  // 弹窗阴影
  'ma-modal-shadow': ['rgba(0, 0, 0, 0.15)', 'rgba(0, 0, 0, 0.4)'],
  // 弹窗拖拽区域背景
  'ma-modal-drag-bg': ['#F3F6F8', '#2A2A2A'],
  // 弹窗内容背景
  'ma-modal-content-bg': ['#FAFAFA', '#1E1E1E'],
  'ma-L2-BG': ['rgba(10, 89, 247, 0.2)', 'rgb(137, 154, 174)'],
  'ma-L2-cell': ['rgba(10, 89, 247, 0.2)', 'rgba(110, 123, 139, 1)'],
  'ma-Gm-bg': ['rgba(201,201,201,1)', 'rgba(57, 57, 57, 1)'],
  'ma-Gm-cell': ['rgba(174, 174, 174, 1)', '#626263'],
  'ma-MTE-bg': ['rgba(246,158,57,1)','#b8860b'],
  'ma-arrow': ['rgb(174, 174, 174)','rgb(137, 154, 174)'],
  'ma-percentage': ['rgba(72, 142, 32, 1)', '#4ade80'],
  'ma-square': ['rgba(10, 89, 247, 0.2)', '#626263'],
  'ma-L1-square-bg': ['rgba(10, 89, 247, 0.4)', 'rgb(60,129,209)'],
  'ma-L0A-bg': ['', 'rgb(60,129,209)'],
  'ma-DCache-bg': ['rgba(10, 89, 247, 0.2)', 'transparent'],
  'ma-Scalar-bg': ['rgba(135, 200, 89, 1)', 'rgba(53, 159, 0, 1)'],
  'ma-border': ['rgba(0,0,0,0.16)', '#4a90e66'],
  'ma-cube-bg': ['rgba(9, 170, 113, 1)', 'rgba(34, 197, 94, 0.55)'],
  'ma-cube-border': ['rgba(255, 255, 255, 0)', 'rgba(34, 197, 94, 0.55)'],
  'ma-playbtn-bg': ['rgba(255, 255, 255, 0.4)', 'rgba(51, 51, 51, 0.4)'],
  'ma-playbtn-border': ['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0)'],
  'ma-progress-dot': ['rgba(147, 147, 147, 1)', '#6e6e6e'],
  'ma-speed-bg': ['rgba(119, 119, 119, 0.12)', 'rgba(0, 0, 0, 0)'],
  'ma-speed-active-bg': ['rgba(10, 89, 247, 0.12)', '#007acc'],
  'ma-speed-active-text': ['#007acc', '#ffffff'],

  // hover popup buffer info
  'ma-popup-bg': ['rgba(255, 255, 255, 1)', 'rgba(42, 42, 42, 1)'],
  'ma-popup-border': ['rgba(0, 0, 0, 0.15)', 'rgba(58, 58, 58, 1)'],
  'ma-popup-title': ['#000000', '#ffffff'],
  'ma-popup-key': ['#666666', '#888888'],
  'ma-popup-value': ['#191919', '#ffffff'],
  'ma-popup-divider': ['rgba(0, 0, 0, 0.1)', '#555555'],

  // memoryType状态颜色
  'ma-memory-empty': ['rgba(201,201,201,1)', 'rgba(102,102,102,1)'],
  'ma-memory-initialized': ['rgba(10, 89, 247, 0.4)', 'rgba(63, 100, 174, 1)'],
  'ma-memory-valid': ['#DBE5F8', 'rgba(175, 198, 255, 1)'],

  // edge animation dots (from left to right)

  'ma-edge-dot-1': ['#000000', '#FFFFFF'],
  'ma-edge-dot-2': ['#595959', '#B3B3B3'],
  'ma-edge-dot-3': ['#939393', '#666666'],
  'ma-edge-dot-4': ['#C9C9C9', '#4D4D4D'],
};

export const memoryAllocationLightTheme = Object.fromEntries(
  Object.entries(memoryAllocationTheme).map(([key, [light]]) => [key, light])
);

export const memoryAllocationDarkTheme = Object.fromEntries(
  Object.entries(memoryAllocationTheme).map(([key, [_, dark]]) => [key, dark])
);