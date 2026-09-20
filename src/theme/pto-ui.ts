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
 * 主题配置
 * @description [浅色，深色]
 */
type Theme = Record<string, [string, string]>;

const ptoTextTheme: Theme = {
  // 标题文字
  'pto-font-color-title': ['#000000', '#FFFFFF'],
  // 主要文字
  'pto-font-color-main': ['#191919', '#E6E6E6'],
  // 次要文字
  'pto-font-color-sub': ['#777777', '#B3B3B3'],
  // 占位符
  'pto-font-color-placeholder': ['#AEAEAE', '#999999'],
  // 禁用文字
  'pto-font-color-disabled': ['#C9C9C9', '#666666'],
  // 文字链接
  'pto-font-color-link': ['#0A59F7', '#317AF7'],
  // 文字链接 - 悬浮
  'pto-font-color-link-hover': ['#3979F9', '#5291FF'],
};

const ptoBorderTheme: Theme = {
  // 分割线-浅
  'pto-border-default': ['rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.1)'],
  // 分割线-深
  'pto-border-deep': ['#DFDFDF', 'rgba(255, 255, 255, 0.1)'],
};

const ptoBackgroundTheme: Theme = {
  // 普通背景
  'pto-background': ['rgba(0, 0, 0, 0.05)', 'rgba(255, 255, 255, 0.05)'],
  // 悬浮背景
  'pto-background-hover': ['rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.1)'],
  // 禁用背景
  'pto-background-disable': ['rgba(0, 0, 0, 0.02)', 'rgba(255, 255, 255, 0.02)'],
};

const ptoButtonTheme: Theme = {
  // 【次要按钮】【背景】默认
  'pto-button-background': ['rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.1)'],
  // 【次要按钮】【背景】悬浮
  'pto-button-background-hover': ['rgba(0, 0, 0, 0.13)', 'rgba(255, 255, 255, 0.13)'],
  // 【次要按钮】【背景】按下
  'pto-button-background-active': ['#C9C9C9', '#333333'],
  // 【次要按钮】【背景】禁用
  'pto-button-background-disabled': ['rgba(0, 0, 0, 0.05)', 'rgba(255, 255, 255, 0.05)'],
  // 【次要按钮】【边框】默认
  'pto-button-border-color': ['rgba(0, 0, 0, 0.2)', 'transparent'],
  // 【次要按钮】【边框】悬浮
  'pto-button-border-hover': ['rgba(0, 0, 0, 0.2)', 'transparent'],

  // 【主要按钮】【背景】默认
  'pto-button-primary-background': ['#0A59F7', '#317AF7'],
  // 【主要按钮】【背景】悬浮
  'pto-button-primary-background-hover': ['#3979F9', '#5291FF'],
  // 【主要按钮】【背景】按下
  'pto-button-primary-background-active': ['#0950DE', '#317AF7'],
  // 【主要按钮】【背景】禁用
  'pto-button-primary-background-disabled': ['#9DBDFC', '#003D83'],
  // 【主要按钮】【文字】默认
  'pto-button-primary-font-color': ['rgba(255, 255, 255, 1)', 'rgba(230, 230, 230, 1)'],
};

const ptoRadioTheme: Theme = {
  // 【单选】【边框】未选中
  'pto-radio-border': ['#191919', '#E6E6E6'],
};

/**
 * 插件通用主题（左侧light，右侧dark）
 */
const ptoTheme: Theme = {
  ...ptoTextTheme,
  ...ptoBorderTheme,
  ...ptoBackgroundTheme,
  ...ptoButtonTheme,
  ...ptoRadioTheme,
};

export const ptoLightTheme = Object.fromEntries(Object.entries(ptoTheme).map(([key, [light]]) => [key, light]));

export const ptoDarkTheme = Object.fromEntries(Object.entries(ptoTheme).map(([key, [_, dark]]) => [key, dark]));
