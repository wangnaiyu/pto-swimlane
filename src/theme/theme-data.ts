/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { Theme, infinityTheme, galaxyTheme } from 'devui-theme';
import { ptoDarkTheme, ptoLightTheme } from './pto-ui';
import { memoryAllocationLightTheme, memoryAllocationDarkTheme } from './memory-allocation-theme';

export const ideLightTheme = new Theme({
  id: 'ide-light-theme',
  name: 'ideLightTheme',
  cnName: 'IDE浅色主题',
  data: {
    ...infinityTheme.data,
    ...ptoLightTheme,
    ...memoryAllocationLightTheme,
    "devui-brand-foil": "#859bff",
    'devui-global-bg': '#f3f3f3', // 全局背景
    'devui-node-badge-bg': 'rgba(0,0,0,0.1)', // 节点右上角徽标背景色
    'devui-node-badge-text': '#595959', // 节点右上角徽标文字
    'devui-op-node-badge-focus-bg': 'rgba(0,0,0,0.2)', // op节点右上角徽标背景色
    'devui-op-node-badge-focus-text': '#ffffff', // op节点右上角徽标文字
    'devui-page-bg': '#fafafa', // 页面背景
    'devui-select-bg': '#ffffff', // 下拉背景
    'devui-card-bg': '#ffffff', // 卡片、面板、弹窗背景
    'devui-nest-bg': 'rgba(0,0,0,0.05)', // 嵌套内容背景
    'devui-flow-chart-nest-bg': '#fafafa', // 流程图嵌套内容背景
    'devui-tab-bg': '#dfdfdf', // tab背景
    'devui-tab-active-bg': '#ffffff', // 选中tag背景
    'devui-alert-bg': '#fabdc1', // alert背景
    'devui-flow-water-bg': '#fde2bd', // OoOSchedule PIPE卡片背景
    'devui-com-graph-pipe-bg': '#dfdfdf', // 计算图pipe背景色
    'devui-input-bg': 'rgba(0,0,0,0.05)', // 输入控件背景
    'devui-input-hover-bg': 'rgba(0,0,0,0.10)', // 悬浮背景
    'devui-input-active-bg': 'rgba(10,89,247,0.20)', // 激活选中背景
    'devui-input-active-bg-4': 'rgba(10,89,247,0.40)', // 激活选中背景
    'devui-input-disabled-bg': 'rgba(0,0,0,0.03)', // 输入控件禁用
    'devui-primary-button-bg': '#0a59f7', // 主要按钮默认
    'devui-primary-button-hover-bg': '#3979f9', // 主要按钮悬浮
    'devui-primary-button-active-bg': '#0950de', // 主要按钮按下
    'devui-primary-button-disabled-bg': '#9dbdfc', // 主要按钮禁用
    'devui-secondary-button-bg': '#ffffff', // 次要按钮默认
    'devui-secondary-button-border': 'rgba(0,0,0,0.2)', // 次要按钮默认边框
    'devui-secondary-button-hover-bg': 'rgba(0,0,0,0.13)', // 次要按钮悬浮
    'devui-secondary-button-active-bg': '#c9c9c9', // 次要按钮按下
    'devui-secondary-button-disabled-bg': 'rgba(0,0,0,0.05)', // 次要按钮禁用
    'devui-node-selected-text': '#e6e6e6', // 节点选中颜色
    'devui-primary-text-empty': '#C76207', // 空节点明亮颜色
    'devui-empty-node-backgrd': '#FDE2BD',
    'devui-op-node-selected-label-text': 'rgba(255, 255, 255, 0.6)', // op节点选中颜色
    'devui-op-node-selected-value-text': 'rgba(255, 255, 255, 0.9)', // op节点选中颜色
    'devui-node-edge': '#aeaeae', // 节点间连线
    'devui-node-edge-active': '#191919', // 节点间连线
    'devui-node-selected-bg': '#c9c9c9',
    'devui-minimap-node-base-color': '#c9c9c9',
    'devui-tensor-node-base-color': '#d3d4dc',
    'devui-tensor-node-light-color': '#5e657a',
    'devui-op-node-base-color': '#cbd4ec',
    'devui-token-node-base-color': 'rgba(203,212,236,0.3)',
    'devui-op-node-light-color': '#4266a0',
    'devui-title-text': '#000000', // 标题文字
    'devui-operation-text-hover': '#0a59f7', // 操作文字悬浮色
    'devui-primary-text': '#191919', // 主要文字
    'devui-primary-text-weak': 'rgba(25,25,25,0.3)', // 主要文字弱化
    'devui-secondary-text': '#777777', // 次要文字
    'devui-secondary-text-weak': 'rgba(119,119,119,0.3)', // 次要文字弱化
    'devui-placeholder-text': '#aeaeae', // 占位符
    'devui-placeholder-text-weak': 'rgba(174,174,174,0.3)', // 占位符弱化
    'devui-disabled-text': '#c9c9c9', // 禁用
    'devui-link-text': '#0a59f7', // 文字链接
    'devui-node-label-text': '#595959', // 节点label文字
    'devui-node-bg': '#ffffff', // 节点背景色
    'devui-tooltip-text': '#000000', // 提示框文字颜色
    'devui-tooltip-bg': '#ffffff', // 提示框背景颜色
    'devui-icon': '#595959', // 图标
    'devui-overlay-icon': '#777777', // 图标叠加层
    'devui-placeholder-icon': '#aeaeae', // 占位符
    'devui-disabled-icon': '#c9c9c9', // 禁用
    'devui-hover-icon': '#3979f9', // 悬浮
    'devui-active-icon': '#0a59f7', // 激活
    'devui-status-error': '#e7434a', // 错误色
    'devui-status-error-text': '#c7000b', // 错误色-文字
    'devui-status-error-bg': '#fabdc1', // 错误色-背景
    'devui-status-success': '#488f20', // 成功色
    'devui-status-success-bg-weak': 'rgba(72,143,32,0.2)', // 成功色背景弱化
    'devui-status-info': '#1f55b5', // 信息色
    'devui-status-info-bg-weak': 'rgba(31,85,181,0.2)', // 信息色背景弱化
    'devui-status-success-text': '#488e20', // 成功色-文字
    'devui-status-success-bg': '#dff4cc', // 成功色-背景
    'devui-status-warning': '#c76207', // 警告色
    'devui-status-warning-text': '#c76207', // 警告色-文字
    'devui-duff-change-border-color': '#f69e39', // diff节点change类型的边框色
    'devui-status-warning-bg': '#fde2bd', // 警告色-背景
    'devui-split-line': 'rgba(0,0,0,0.1)', // 分割线-浅
    'devui-split-line-deep': '#dfdfdf', // 分割线-深
    'devui-border-line-deep': '#dfdfdf',
    'devui-storage-unit-split': '#999999', // 计算图存储单元分割线
    'devui-pipe-warning-line': '#e7434a', // 计算图pipe告警边框
    'devui-pipe-warning-line-weak': 'rgba(231,67,74,0.3)', // 计算图pipe告警边框弱化
    'devui-modal-line': 'rgba(0,0,0,0.2)', // 弹窗内描边
    'devui-tips-shadow': '0 1px 6px 0px rgba(0,0,0,0.08)', // 卡片一级阴影
    'devui-select-shadow': '0 4px 12px 0 rgba(0,0,0,0.16)', // 下拉菜单阴影
    'devui-modal-shadow': '0 16px 48px 0 rgba(0,0,0,0.16)', // 弹窗阴影
    'devui-running-node-bg': 'rgba(187,214,255,0.2)', // 运行中节点背景色
    'devui-running-node-badge-bg': 'rgba(147,147,147,1)', // 运行中节点徽标背景色
    'devui-running-node-badge-text': 'rgba(255,255,255,0.6)', // 运行中节点徽标字体色
    'devui-running-node-title-text': 'rgba(255,255,255,0.9)', // 运行中节点字体色
    'devui-running-node-key-text': 'rgba(255,255,255,0.6)', // 运行中节点的key字体色
    'devui-running-node-value-text': 'rgba(255,255,255,1)', // 运行中节点的value字体色
    'devui-base-invert-color': '#2f2f2f', // 反色
    'devui-rose-60': '#e61866',
    'devui-red-60': '#e02128',
    'devui-orange-60': '#f4840c',
    'devui-yellow-60': '#fcc800',
    'devui-green-60': '#62b42e',
    'devui-mint-60': '#09aa71',
    'devui-cyan-60': '#2cb8c9',
    'devui-blue-60': '#2070f3',
    'devui-indigo-60': '#715afb',
    'devui-purple-60': '#b62bf7',
    'devui-pink-60': '#d41dbc',
    'devui-gray-40': '#939393',
    'devui-in-tensor-mini': '#C8DDBD',
    'devui-out-tensor-mini': '#F4CCCE',
    'devui-in-tensor-mini-light': '#488e20',
    'devui-out-tensor-mini-light': '#d2333c',
    'devui-in-wave-fill1': 'rgba(72, 142, 32, 1)',
    'devui-in-wave-fill2': 'rgba(200, 221, 189, 1)',
    'devui-out-wave-fill1': '#d2333c',
    'devui-out-wave-fill2': '#e6c6c7',
    'devui-out-wave-fill3': '#beccfa',
    'devui-header-gradient-bg': 'linear-gradient(180.00deg, rgba(243, 243, 243, 1), rgba(243, 243, 243, 0) 100%)',
    'devui-header-label': 'rgba(242,242,242,1)',
    'devui-swim-global-bg': '#ffffff',
    'devui-swim-detail-bg': '#ffffff',
    'devui-search-container': '#f2f2f2',
    'devui-swim-split-line': 'rgba(0,0,0,0.05)', // 分割线
    'devui-swim-text-title': 'rgba(25,25,25,1)',
    'devui-primary-tooltip-text': 'rgba(255,255,255,1)',
    'devui-font-badge-bg': 'rgba(0,0,0,0.1)', // 节点右上角徽标背景色
    'devui-slider-runway': 'rgba(223,223,223,1)',
    'devui-slider-bar': 'rgba(25,25,25,1)',
    'devui-thread-text': 'rgba(119 ,119, 119, 1)',
    'devui-swim-border-color': 'rgba(0,0,0,0.05)', // 分割线
    'devui-search-container-bg': 'rgba(0,0,0,0.05)',
    'devui-slider-container-bg': '#ffffff',
    'devui-button-group-bg': 'rgba(0,0,0,0.05)',
    'devui-button-group-hover': 'rgba(0,0,0,0.1)',
    'devui-detail-text': 'rgba(174,174,174,1)',
    'devui-detail-boxshadow': '0px -16px 48px 0px rgba(0, 0, 0, 0.16)',
    'devui-warning-bg': 'rgba(253,226,189,1)',
    'devui-timebar-bg': 'rgba(0,0,0,0.08)',
    'devui-timefull-bg': 'rgba(231,67,74,1)',
    'devui-search-active-bg': 'rgba(10, 89, 247, 0.2)',
    'devui-select-hover-border-color': 'rgba(57,121,249,1)',
    'devui-select-active-border-color': 'rgba(10,89,247,1)',
    'devui-category-search-bg': 'rgba(0, 0, 0, 0.05)',
    'devui-category-search-placeholder': 'rgba(174, 174, 174, 1)',
    'devui-category-search-font-color': 'rgba(25, 25, 25, 1)',
    'devui-category-search-hover-border': 'rgba(57, 121, 249, 1)',
    'devui-category-search-dropdown-bg': 'rgba(255, 255, 255, 1)',
    'devui-category-search-dropdown-item-bg': 'rgba(0, 0, 0, 0.1)',
    'devui-category-search-dropdown-item-color': 'rgba(25, 25, 25, 1)',
    'devui-brand': 'rgba(10, 89, 247, 1)',
    'control-flow-sidebar-search-title': '#000000',
    'control-flow-sidebar-bg': '#ffffff',
    'control-flow-sidebar-tree-label': '#000000',
    'control-flow-sidebar-search-button': 'rgba(0,0,0,0.1)',
    'control-flow-sidebar-tree-main-label': '#191919',
    'control-flow-sidebar-tree-placeholder': '#AEAEAE',
    'control-flow-panel-table-title-bg': 'rgba(0,0,0,0.05)',
    'control-flow-bg': '#F3F3F3',
    'task-diff-collapse-bg': 'rgba(255,255,255,1)',
    'task-diff-item-bg': 'rgba(0,0,0,0.04)',
    'task-diff-expanded-bg': '#e6e9f4',
    'task-diff-selected-bg': 'rgba(255,255,255,1)',
    'task-diff-item-active-bg': '#f2f4fa',
    'task-diff-header-label-text': 'rgba(119,119,119,1)',
    'task-diff-header-value-text': 'rgba(25,25,25,1)',
    'task-detail-section-title-text': 'rgba(0,0,0,1)',
    'precision-tab-bg': 'rgba(0,0,0,0.04)',
    'precision-tab-active-bg': 'rgba(255,255,255,1)',
    'precision-tab-unselected-text': 'rgba(119,119,119,1)',
    'precision-tab-selected-text': 'rgba(0,0,0,1)',
    'benchmark-header-bg': 'rgba(255,255,255,0.5)',
    'benchmark-footer-bg': 'rgba(255,255,255,1)',
    'precision-table-header-bg': 'rgba(0,0,0,0.05)',
    'precision-table-row-bg': 'rgba(255,255,255,1)',
    'control-flow-search-hover-bg': 'rgba(0, 0, 0, 0.1)',
    'control-flow-search-text': 'rgba(25, 25, 25, 1)',
    'control-flow-tab-active-bg': 'rgba(255, 255, 255, 1)', // 控制流tab选中
    'control-flow-tab-bg': 'rgba(243,243,243,1)', // 控制流tab未选中
    'control-flow-table-header': 'rgba(243,243,243,1)', // 控制流header
    'control-flow-table-hover': 'rgba(49,122,247,0.2)', // hover选中背景
    'control-flow-table-minimap-bg': '#F3F3F3',
    'control-flow-panel-table-tensor': 'rgb(209,159,0)',
    'control-flow-panel-table-Tile': 'rgb(28,148,164)',
    'control-flow-panel-table-block': 'rgb(5,131,88)',
    'control-flow-tip-color': '#363636',
    'control-flow-loop-title-bg-active': '#0950de',
    'control-flow-loop-title-bg-weak': 'rgba(243,243,243,1)',
    'control-flow-loop-title-text-hover': '#0a59f7',
    'control-flow-loop-title-text': '#777777',
    'control-flow-path-left-label': 'rgba(174,174,174,1)',
    'control-flow-path-right-value': '#191919',
    'control-flow-path-hover': 'rgba(0,0,0,0.5)',
    'control-flow-loop-stroke': '#aeaeae',
    'control-flow-path-card-active': 'rgba(255, 255, 255, 1)',
    'control-flow-code-preview': 'rgb(230, 230, 230)', // 代码片段预览背景颜色
    'control-flow-item-detail-bg': 'rgba(255, 255, 255, 0.65)', // 详情项背景色
    'welcome-header-title-version': 'linear-gradient(90.00deg,rgba(15,219,118,0.1),rgba(195,90,246,0.1) 100%)', //欢迎页面version渐变
    'welcome-header-right-imge-bg':
      'linear-gradient(155.67deg,rgba(15,211,114,1),rgba(57,129,239,0) 100%),linear-gradient(-26.57deg,rgba(200,92,237,1),rgba(255,108,150,0) 100%)', //欢迎页面version渐变
    'welcome-box-shadow': '-4px -4px 12px 0px rgba(0,0,0,0.08)',
    'welcome-banner-long': 'rgba(0, 0, 0, 0.5)',
    'welcome-banner-point': 'rgba(0, 0, 0, 0.2)',
    'devui-table-body-bg': '#rgba(0, 0, 0, 0)',
    'devui-page-active-bg': 'rgba(0,0,0,0.15)',
    'core-detail-connect-line': '#C9C9C9',
    'devui-performance-bg': '#c9c9c9',
    'devui-feedback-overlay-text': 'rgba(25, 25, 25, 1)',
    'cube-rate-cycle-text': 'rgba(0, 111, 127, 1)',
    'vec-rate-cycle-text': 'rgba(0, 114, 99, 1)',
    'cube-rate-cycle-bg': 'rgba(0, 233, 255, 1)',
    'vec-rate-cycle-bg': 'rgba(0, 240, 213, 1)',
  },
  isDark: false,
});

export const ideDarkTheme = new Theme({
  id: 'ide-dark-theme',
  name: 'ideDarkTheme',
  cnName: 'IDE深色主题',
  data: {
    ...galaxyTheme.data,
    ...ptoDarkTheme,
    ...memoryAllocationDarkTheme,
    "devui-brand-foil": "#F2F2F3",
    'devui-global-bg': '#1e1e1e', // 全局背景
    'devui-node-badge-bg': 'rgba(255,255,255,0.1)', // 节点右上角徽标背景色
    'devui-node-badge-text': '#ced1db', // 节点右上角徽标文字
    'devui-op-node-badge-focus-bg': 'rgba(0,0,0,0.2)', // op节点右上角徽标背景色
    'devui-op-node-badge-focus-text': '#191919', // op节点右上角徽标文字
    'devui-page-bg': '#1f1f1f', // 页面背景
    'devui-select-bg': '#363636', // 下拉背景
    'devui-card-bg': '#262626', // 卡片、面板、弹窗背景
    'devui-nest-bg': 'rgba(255,255,255,0.05)', // 嵌套内容背景
    'devui-flow-chart-nest-bg': 'rgba(255,255,255,0.05)', // 流程图嵌套内容背景
    'devui-tab-bg': '#1a1a1a', // tab背景
    'devui-tab-active-bg': 'rgba(255,255,255,0.15)', // 选中tag背景
    'devui-alert-bg': 'rgba(231,67,74,0.2)', // alert背景
    'devui-flow-water-bg': '#4d4d4d', // OoOSchedule PIPE卡片背景
    'devui-com-graph-pipe-bg': '#4d4d4d', // 计算图pipe背景色
    'devui-input-bg': 'rgba(255,255,255,0.05)', // 输入控件背景
    'devui-input-hover-bg': 'rgba(255,255,255,0.10)', // 悬浮背景
    'devui-input-active-bg': 'rgba(49,122,247,0.20)', // 激活选中背景
    'devui-input-active-bg-4': 'rgba(49,122,247,0.40)', // 激活选中背景
    'devui-input-disabled-bg': 'rgba(255,255,255,0.03)', // 输入控件禁用
    'devui-primary-button-bg': '#317af7', // 主要按钮默认
    'devui-primary-button-hover-bg': '#5291ff', // 主要按钮悬浮
    'devui-primary-button-active-bg': '#317af7', // 主要按钮按下
    'devui-primary-button-disabled-bg': '#003d83', // 主要按钮禁用
    'devui-secondary-button-bg': '#333333', // 次要按钮默认
    'devui-secondary-button-border': 'rgba(255,255,255,0.05)', // 次要按钮默认边框
    'devui-secondary-button-hover-bg': 'rgba(255,255,255,0.13)', // 次要按钮悬浮
    'devui-secondary-button-active-bg': '#333333', // 次要按钮按下
    'devui-secondary-button-disabled-bg': 'rgba(255,255,255,0.05)', // 次要按钮禁用
    'devui-node-selected-text': 'rgba(25, 25, 25, 1)', // 节点选中颜色
    'devui-primary-text-empty': 'rgba(249, 183, 102, 1)',
    'devui-empty-node-backgrd': '#F69E39', 
    'devui-op-node-selected-label-text': 'rgba(0, 0, 0, 0.6)', // op节点选中颜色
    'devui-op-node-selected-value-text': 'rgba(0, 0, 0, 0.9)', // op节点选中颜色
    'devui-node-edge': '#666666', // 节点间连线
    'devui-node-edge-active': '#ffffff', // 节点间连线
    'devui-node-selected-bg': '#4c4c4c',
    'devui-minimap-node-base-color': '#626571',
    'devui-tensor-node-base-color': '#6f727d',
    'devui-tensor-node-light-color': '#d1d4e1',
    'devui-op-node-base-color': '#5f729c',
    'devui-token-node-base-color': 'rgba(95,114,156,0.3)',
    'devui-op-node-light-color': '#c0d4ff',
    'devui-title-text': '#ffffff', // 标题文字
    'devui-operation-text-hover': '#317af7', // 操作文字悬浮色
    'devui-primary-text': '#e6e6e6', // 主要文字
    'devui-primary-text-weak': 'rgba(230,230,230,0.3)', // 主要文字弱化
    'devui-secondary-text': '#b3b3b3', // 次要文字
    'devui-secondary-text-weak': 'rgba(179,179,179,0.3)', // 次要文字弱化
    'devui-placeholder-text': '#999999', // 占位符
    'devui-placeholder-text-weak': '#999999', // 占位符弱化
    'devui-disabled-text': '#666666', // 禁用
    'devui-link-text': '#317af7', // 文字链接
    'devui-node-label-text': '#999999', // 节点label文字
    'devui-node-bg': '#333333', // 节点背景色
    'devui-tooltip-text': '#e6e6e6', // 提示框文字颜色
    'devui-tooltip-bg': '#363636', // 提示框背景颜色
    'devui-icon': '#e6e6e6', // 图标
    'devui-overlay-icon': '#b3b3b3', // 图标叠加层
    'devui-placeholder-icon': '#999999', // 占位符
    'devui-disabled-icon': '#666666', // 禁用
    'devui-hover-icon': '#5291ff', // 悬浮
    'devui-active-icon': '#317af7', // 激活
    'devui-status-error': '#e7434a', // 错误色
    'devui-status-error-text': '#ee696f', // 错误色-文字
    'devui-status-error-bg': '#59080a', // 错误色-背景
    'devui-status-success': '#a8db81', // 成功色
    'devui-status-success-bg-weak': 'rgba(168,219,129,0.2)', // 成功色背景弱化
    'devui-status-info': '#8ca3fa', // 信息色
    'devui-status-info-bg-weak': 'rgba(140,163,250,0.2)', // 信息色背景弱化
    'devui-status-success-text': '#62b42e', // 成功色-文字
    'devui-status-success-bg': '#1b3e0a', // 成功色-背景
    'devui-status-warning': '#f9b766', // 警告色
    'devui-status-warning-text': '#f9b766', // 警告色-文字
    'devui-duff-change-border-color': '#f69e39', // diff节点change类型的边框色
    'devui-status-warning-bg': '#642802', // 警告色-背景
    'devui-split-line': 'rgba(255,255,255,0.1)', // 分割线
    'devui-split-line-deep': '#4d4d4d', // 分割线-深
    'devui-border-line-deep': '#000000',
    'devui-storage-unit-split': '#999999', // 计算图存储单元分割线
    'devui-pipe-warning-line': '#e7434a', // 计算图pipe告警边框
    'devui-pipe-warning-line-weak': 'rgba(231,67,74,0.3)', // 计算图pipe告警边框弱化
    'devui-modal-line': 'rgba(255,255,255,0.2)', // 弹窗内描边
    'devui-tips-shadow': '0 1px 6px 0px rgba(38,38,38,0.08)', // 卡片一级阴影
    'devui-select-shadow': '0 0 16px 0 rgba(0,0,0,0.2)', // 下拉菜单阴影
    'devui-modal-shadow': '0 10px 70px 0 rgba(0,0,0,0.5)', // 弹窗阴影
    'devui-running-node-bg': 'rgba(55,84,185,0.2)', // 运行中节点背景色
    'devui-running-node-badge-bg': 'rgba(0,0,0,0.1)', // 运行中节点徽标背景色
    'devui-running-node-badge-text': 'rgba(0,0,0,0.6)', // 运行中节点徽标字体色
    'devui-running-node-title-text': 'rgba(0,0,0,0.9)', // 运行中节点字体色
    'devui-running-node-key-text': 'rgba(0,0,0,0.6)', // 运行中节点的key字体色
    'devui-running-node-value-text': 'rgba(0,0,0,1)', // 运行中节点的value字体色
    'devui-base-invert-color': '#ffffff', // 反色
    'devui-rose-60': '#c40054',
    'devui-red-60': '#c7000b',
    'devui-orange-60': '#c76207',
    'devui-yellow-60': '#d19f00',
    'devui-green-60': '#488e20',
    'devui-mint-60': '#058358',
    'devui-cyan-60': '#1c94a4',
    'devui-blue-60': '#1f55b5',
    'devui-indigo-60': '#5531eb',
    'devui-purple-60': '#8a21bc',
    'devui-pink-60': '#9f1c8d',
    'devui-gray-40': '#4d4d4d',
    'devui-in-tensor-mini': '#44513B',
    'devui-out-tensor-mini': '#69383A',
    'devui-in-tensor-mini-light': '#7AB054',
    'devui-out-tensor-mini-light': '#E7434A',
    'devui-in-wave-fill1': 'rgba(122, 176, 84, 1)',
    'devui-in-wave-fill2': 'rgba(68, 81, 59, 1)',
    'devui-out-wave-fill1': 'rgba(231, 67, 74, 1)',
    'devui-out-wave-fill2': 'rgba(105, 56, 58, 1)',
    'devui-out-wave-fill3': 'rgba(190, 204, 250, 1)',
    'devui-header-gradient-bg': 'linear-gradient(180.00deg, rgba(31, 31, 31, 1), rgba(31, 31, 31, 0) 100%)', // 计算图head渐变色
    'devui-header-label': 'rgba(43, 43, 43, 1)',
    'devui-swim-global-bg': '#1F1F1F',
    'devui-swim-detail-bg': 'rgba(38, 38, 38, 1)',
    'devui-search-container': 'rgba(42,42,42,1)',
    'devui-swim-split-line': 'rgba(255,255,255,0.05)', // 分割线
    'devui-swim-text-title': 'rgba(230,230,230,1)',
    'devui-primary-tooltip-text': 'rgba(230,230,230,1)',
    'devui-font-badge-bg': 'rgba(255,255,255,0.1)', // 节点右上角徽标背景色
    'devui-slider-runway': 'rgba(24,24,24,1)',
    'devui-slider-bar': 'rgba(255,255,255,1)',
    'devui-thread-text': 'rgba(153 ,153, 153, 1)',
    'devui-swim-border-color': 'rgba(225,225,225,0.05)', // 分割线
    'devui-search-container-bg': 'rgba(42,42,42,1)',
    'devui-slider-container-bg': 'rgba(225,225,225,0.1)',
    'devui-button-group-bg': 'rgba(255,255,255,0.1)',
    'devui-button-group-hover': 'rgba(255, 255, 255, 0.3)',
    'devui-detail-text': 'rgba(153,153,153,1)',
    'devui-detail-boxshadow': '0px 10px 70px 0px rgba(0, 0, 0 ,0.5)',
    'devui-warning-bg': 'rgba(119,92,60,1)',
    'devui-timebar-bg': 'rgba(255,255,255,0.08)',
    'devui-timefull-bg': 'rgba(118,46,39,1)',
    'devui-search-active-bg': 'rgba(49, 122, 247, 0.2)',
    'devui-select-hover-border-color': 'rgba(82,145,255,1)',
    'devui-select-active-border-color': 'rgba(49,122,247,1)',
    'devui-category-search-bg': 'rgba(255, 255, 255, 0.05)',
    'devui-category-search-placeholder': 'rgba(153, 153, 153, 1)',
    'devui-category-search-font-color': 'rgba(230, 230, 230, 1)',
    'devui-category-search-hover-border': 'rgba(82, 145, 255, 1)',
    'devui-category-search-dropdown-bg': 'rgba(54, 54, 54, 1)',
    'devui-category-search-dropdown-item-bg': 'rgba(255, 255, 255, 0.1)',
    'devui-category-search-dropdown-item-color': 'rgba(230, 230, 230, 1)',
    'devui-brand': 'rgba(49, 122, 247, 1)',
    'control-flow-sidebar-bg': '#181818',
    'control-flow-sidebar-search-title': '#ffffff',
    'control-flow-sidebar-search-button': 'rgba(255,255,255,0.05)',
    'control-flow-sidebar-tree-main-label': '#E6E6E6',
    'control-flow-sidebar-tree-placeholder': '#999999',
    'control-flow-panel-table-title-bg': '#313131',
    'control-flow-sidebar-tree-label': '#ffffff',
    'control-flow-bg': 'rgba(26,26,26,1)',
    'task-diff-collapse-bg': 'rgba(255,255,255,0.03)',
    'task-diff-item-bg': 'rgba(0,0,0,0.16)',
    'task-diff-expanded-bg': '#20242c',
    'task-diff-selected-bg': 'rgba(255,255,255,0.05)',
    'task-diff-item-active-bg': '#1d2028',
    'task-diff-header-label-text': 'rgba(153,153,153,1)',
    'task-diff-header-value-text': 'rgba(230,230,230,1)',
    'task-detail-section-title-text': 'rgba(255,255,255,1)',
    'precision-tab-bg': 'rgba(0,0,0,0.16)',
    'precision-tab-active-bg': 'rgba(255,255,255,0.15)',
    'precision-tab-unselected-text': 'rgba(179,179,179,1)',
    'precision-tab-selected-text': 'rgba(255,255,255,1)',
    'benchmark-header-bg': 'rgba(255,255,255,0.08)',
    'benchmark-footer-bg': 'rgba(255,255,255,0.05)',
    'precision-table-header-bg': 'rgba(255,255,255,0.05)',
    'precision-table-row-bg': 'rgba(31,31,31,1)',
    'control-flow-search-hover-bg': 'rgba(49, 122, 247, 0.2)',
    'control-flow-search-text': 'rgba(230, 230, 230, 1)',
    'control-flow-tab-active-bg': '#333333', // 控制流tab选中
    'control-flow-tab-bg': '#1a1a1a', // 控制流tab未选择
    'control-flow-table-header': '#313131', // 控制流table
    'control-flow-table-hover': 'rgba(49,122,247,0.20)', // hover选中背景
    'control-flow-table-minimap-bg': '#292A2E',
    'control-flow-panel-table-tensor': 'rgb(253,229,92)',
    'control-flow-panel-table-Tile': 'rgb(125,223,231)',
    'control-flow-panel-table-block': 'rgb(99,213,168)',
    'control-flow-tip-color': '#FFFFFF',
    'control-flow-loop-title-bg-active': '#317AF7',
    'control-flow-loop-title-bg-weak': '#1F1F1F',
    'control-flow-loop-title-text-hover': '#317AF7',
    'control-flow-loop-title-text': '#b3b3b3',
    'control-flow-path-left-label': '#999999',
    'control-flow-path-right-value': '#e6e6e6',
    'control-flow-path-hover': '#e6e6e6',
    'control-flow-loop-stroke': '#666666',
    'control-flow-path-card-active': 'rgba(77,77,77,1)',
    'control-flow-code-preview': '#363636', // 代码片段预览背景颜色
    'control-flow-item-detail-bg': 'rgba(26, 26, 26, 0.65)', // 详情项背景色
    'welcome-header-title-version': 'linear-gradient(90.00deg,rgba(15,219,118,0.1),rgba(195,90,246,0.1) 100%)', //欢迎页面version渐变
    'welcome-header-right-imge-bg':
      'linear-gradient(155.67deg,rgba(15,211,114,1),rgba(57,129,239,0) 100%),linear-gradient(-26.57deg,rgba(200,92,237,1),rgba(255,108,150,0) 100%)', //欢迎页面version渐变
    'welcome-box-shadow': '-10px -10px 50px 10px rgba(0,0,0,0.3)',
    'welcome-banner-long': 'rgba(255, 255, 255, 0.5)',
    'welcome-banner-point': 'rgba(255, 255, 255, 0.2)',
    'devui-table-body-bg': '#3A3A3A',
    'devui-page-active-bg': 'rgba(255,255,255,0.15)',
    'core-detail-connect-line': '#404040',
    'devui-performance-bg': '#262626',
    'cube-rate-cycle-text': 'rgba(128, 210, 233, 1)',
    'vec-rate-cycle-text': 'rgba(125, 214, 196, 1)',
    'cube-rate-cycle-bg': 'rgba(0, 113, 133, 1)',
    'vec-rate-cycle-bg': 'rgba(0, 117, 102, 1)',
  },
  isDark: true,
});
