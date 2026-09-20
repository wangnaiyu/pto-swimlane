/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { request } from '@/core/request';
import { UpdateWelcomeStateParams } from 'ext:/types/welcome';

const WELCOME = 'welcome';

/**
 * 运行脚本初始化工程
 */
export function getInitPythonProject(): Promise<boolean> {
  return request.post(`${WELCOME}/getInitPythonProject`, null);
}

/**
 * 获取引导弹窗进度
 */
export function getWelcomeState(params): Promise<any> {
  return request.post(`${WELCOME}/getWelcomeState`, params);
}

/**
 * 设置引导弹窗进度
 */
export function updateWelcomeState(params: UpdateWelcomeStateParams): Promise<number> {
  return request.post(`${WELCOME}/updateWelcomeState`, params);
}

/**
 * 检测当前系统是否为Linux系统
 */
export function isLinuxEnvironment(): Promise<boolean> {
  return request.post(`${WELCOME}/isLinuxEnvironment`, null);
}

/**
 * 获取当前是否在引导中
 */
export function getIsCompleteBoot(): Promise<boolean> {
  return request.post(`${WELCOME}/getIsCompleteBoot`, null);
}

/**
 * 获取output根目录
 */
export function getUserRunRoot(): Promise<string> {
  return request.post(`${WELCOME}/getUserRunRoot`, null);
}

/**
 * 获取output programe目录
 */
export function getProgramPath(): Promise<string> {
  return request.post(`${WELCOME}/getProgramPath`, null);
}

/**
 * 获取泳道图目录
 */
export function getSwimPath(): Promise<string> {
  return request.post(`${WELCOME}/getSwimPath`, null);
}

/**
 * 获取插件版本号
 */
export function getPluginVersion(): Promise<string> {
  return request.post(`${WELCOME}/getPluginVersion`, null);
}

/**
 * 获取python脚本代码
 */
export function getPythonFileCode(): Promise<string> {
  return request.post(`${WELCOME}/getPythonFileCode`, null);
}

/**
 * 获取三栏数据地址
 */
export function getThreeColumnSamplePath(): Promise<string>{
  return request.post(`${WELCOME}/getThreeColumnSamplePath`, null);
}

/**
 * 完成步骤二查看运行结果
 */
export function completeResultsStep(): Promise<string>{
  return request.post(`${WELCOME}/completeResultsStep`, null);
}

/**
 * 重置步骤二查看运行结果
 */
export function reductionResultsStep(): Promise<string>{
  return request.post(`${WELCOME}/reductionResultsStep`, null);
}

/**
 * 完成步骤三查看三栏联动
 */
export function completeTreeColumnStep(): Promise<string>{
  return request.post(`${WELCOME}/completeTreeColumnStep`, null);
}

/**
 * 重置步骤三查看三栏联动
 */
export function reductionTreeColumnStep(): Promise<string>{
  return request.post(`${WELCOME}/reductionTreeColumnStep`, null);
}