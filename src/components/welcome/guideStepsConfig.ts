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

const controlFlowImg = ref(`${window.staticPath}/static-assets/boot_steps_control.svg`);
const native = ref(`${window.staticPath}/static-assets/boot_steps_native.svg`);
const computeImg = ref(`${window.staticPath}/static-assets/boot_steps_compute.svg`);
const swim = ref(`${window.staticPath}/static-assets/boot_steps_swim.svg`);

// DOM定位配置接口（单个配置项，包含id+三角方向+是否显示三角）
export interface GuideTargetDomConfig {
  targetDomId: string; // 目标引导DOM的ID
  triangleDirection: 'top' | 'bottom' | 'left' | 'right'; // 三角方向（上/下/左/右）
  showTriangle: boolean; // 是否显示引导三角
}

// 定义单个步骤的配置类型
export interface GuideStepConfig {
  title: string; // 步骤标题（国际化key）
  content: string; // 步骤内容（国际化key）
  method?: string; // 该步骤要调用的WebView内方法名（如openSidebar）
  methodParams?: Record<string, any>; // 调用方法的参数
  targetDomConfigs: GuideTargetDomConfig[];
  allowClick: boolean; //是否允许点击该DOM区域
  showBorder: boolean; //是否展示边框
}

// 定义大组配置类型
export interface GuideBigGroupConfig {
  groupName: string; // 大组名称（国际化key）
  webviewType: 'controlFlow' | 'navigation' | 'computeGraph' | 'swimlaneGraph' | 'threeColumnGraph'; // 对应WebView类型
  openWebviewFn?: string; // 打开该WebView的方法
  openWebviewParams?: Record<string, any> | null; // 打开WebView的参数
  steps: GuideStepConfig[]; // 该组的小步骤配置
  imgUrl: string;
  showProgressBar?: boolean; // 是否显示进度条，步骤三设为false
}

// 全局引导步骤2配置（4个大组）
export const guideStepsConfigStep2: GuideBigGroupConfig[] = [
  // 第一组：控制流
  {
    groupName: 'bootStep.controlFlow.groupName',
    webviewType: 'controlFlow',
    openWebviewParams: { outputPath: '', controlFlowPath: '' }, // 实际参数按需传
    imgUrl: controlFlowImg.value,
    showProgressBar: true,
    steps: [
      {
        title: 'bootStep.controlFlow.step1.title',
        content: 'bootStep.controlFlow.step1.content',
        method: 'checkControlFlow',
        allowClick: true,
        showBorder:false,
        targetDomConfigs: [
          {
            targetDomId: 'boot-steps-controlFlow',
            triangleDirection: 'bottom',
            showTriangle: false,
          },
        ],
      },
      {
        title: 'bootStep.controlFlow.step2.title',
        content: 'bootStep.controlFlow.step2.content',
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'boot-steps-controlFlow-right-panel',
            triangleDirection: 'right',
            showTriangle: true,
          },
        ],
        method: 'bootStepOpenSideBar',
      },
      {
        title: 'bootStep.controlFlow.step3.title',
        content: 'bootStep.controlFlow.step3.content',
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'boot-steps-controlFlow-searchPnal',
            triangleDirection: 'top',
            showTriangle: true,
          },
          {
            targetDomId: 'devui-input',
            triangleDirection: 'top',
            showTriangle: true,
          },
        ],
        method: 'bootStepSearch',
      },
    ],
  },
  // 第二组：导航系统
  {
    groupName: 'bootStep.navigation.groupName',
    webviewType: 'navigation',
    openWebviewFn: 'openComputeGraph',
    imgUrl: native.value,
    openWebviewParams: null,
    showProgressBar: true,
    steps: [
      {
        title: 'bootStep.navigation.step1.title',
        content: 'bootStep.navigation.step1.content',
        method: 'viewNavigationHistory',
        methodParams: {},
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'history-list-menu-wrap',
            triangleDirection: 'top',
            showTriangle: true,
          },
          {
            targetDomId: 'boot-steps-navbar-history',
            triangleDirection: 'top',
            showTriangle: true,
          },
        ],
      },
      {
        title: 'bootStep.navigation.step2.title',
        content: 'bootStep.navigation.step2.content',
        method: 'loadNavMenu',
        methodParams: {},
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'boot-steps-navbar-open-com-graph',
            triangleDirection: 'top',
            showTriangle: true,
          },
        ],
      },
    ],
  },
  // 第三组：计算图
  {
    groupName: 'bootStep.computeGraph.groupName',
    webviewType: 'computeGraph',
    openWebviewFn: 'openSwimlaneGraph',
    imgUrl: computeImg.value,
    openWebviewParams: { outputPath: '', computeGraphPath: '', pathName: 'compute' },
    showProgressBar: true,
    steps: [
      {
        title: 'bootStep.computeGraph.step1.title',
        content: 'bootStep.computeGraph.step1.content',
        method: 'viewComGraph',
        methodParams: {},
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'path-list-menu-wrap',
            triangleDirection: 'top',
            showTriangle: true,
          },
          {
            targetDomId: 'pass-list-menu-wrap',
            triangleDirection: 'top',
            showTriangle: true,
          },
          {
            targetDomId: 'navbarComGraphTab',
            triangleDirection: 'top',
            showTriangle: true,
          },
        ],
      },
      {
        title: 'bootStep.computeGraph.step2.title',
        content: 'bootStep.computeGraph.step2.content',
        method: 'viewNodeDetail',
        methodParams: {
          nodeId: 'tensor-6030-7',
        },
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'sprotty_tensor-6030-7',
            triangleDirection: 'top',
            showTriangle: true,
          },
        ],
      },
      {
        title: 'bootStep.computeGraph.step3.title',
        content: 'bootStep.computeGraph.step3.content',
        method: 'searchNode',
        methodParams: {
          nodeId: 'tensor-6030-7',
          searchKey: '6036',
          selectedTags: [
            {
              label: 'Tensor',
              field: 'Tensor',
              value: { Option: 'magic', value: { Option: 'magic' } },
            },
          ],
        },
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'com-graph-header-search-dropdown',
            triangleDirection: 'top',
            showTriangle: true,
          },
          {
            targetDomId: '.devui-flexible-overlay:not(.hide-category-search-dropdown):has(.dp-category-search-dropdown)',
            triangleDirection: 'top',
            showTriangle: true,
          },
          {
            targetDomId: '.com-graph-global-select.show-global-select-menu',
            triangleDirection: 'top',
            showTriangle: true,
          },
          {
            targetDomId: 'comGraphHeaderSearch',
            triangleDirection: 'top',
            showTriangle: true,
          },
        ],
      },
      {
        title: 'bootStep.computeGraph.step4.title',
        content: 'bootStep.computeGraph.step4.content',
        method: 'focusCurrentPath',
        methodParams: {
          searchNodeId: 'tensor-6036-13',
          searchKey: '6036',
          selectedTags: [
            {
              label: 'Tensor',
              field: 'Tensor',
              value: { Option: 'magic', value: { Option: 'magic' } },
            },
          ],
        },
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'sprotty_tensor-6036-13',
            triangleDirection: 'top',
            showTriangle: true,
          },
        ],
      },
      {
        title: 'bootStep.computeGraph.step5.title',
        content: 'bootStep.computeGraph.step5.content',
        method: '',
        methodParams: {},
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'openDiffViewerIcon',
            triangleDirection: 'right',
            showTriangle: true,
          },
        ],
      },
      {
        title: 'bootStep.computeGraph.step6.title',
        content: 'bootStep.computeGraph.step6.content',
        method: '',
        methodParams: {},
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'boot-steps-navbar-open-swm-graph',
            triangleDirection: 'top',
            showTriangle: true,
          },
        ],
      },
    ],
  },
  // 第四组：泳道图
  {
    groupName: 'bootStep.swimlaneGraph.groupName',
    webviewType: 'swimlaneGraph',
    openWebviewFn: 'openSwimlaneGraph',
    imgUrl: swim.value,
    openWebviewParams: { swimlaneGraphPath: '' },
    showProgressBar: true,
    steps: [
      {
        title: 'bootStep.swimlaneGraph.step1.title',
        content: 'bootStep.swimlaneGraph.step1.content',
        method: 'distanceMeasurement',
        methodParams: {},
        allowClick: true,
        showBorder: false,
        targetDomConfigs: [
          {
            targetDomId: 'distance-measurement',
            triangleDirection: 'top',
            showTriangle: true,
          },
        ],
      },
      {
        title: 'bootStep.swimlaneGraph.step2.title',
        content: 'bootStep.swimlaneGraph.step2.content',
        method: 'addObservationLine',
        methodParams: {},
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'observation-line',
            triangleDirection: 'right',
            showTriangle: true,
          },
          {
            targetDomId: 'timeline-area',
            triangleDirection: 'top',
            showTriangle: true,
          },
          {
            targetDomId: 'edit-model',
            triangleDirection: 'top',
            showTriangle: true,
          },
        ],
      },
      {
        title: 'bootStep.swimlaneGraph.step3.title',
        content: 'bootStep.swimlaneGraph.step3.content',
        method: 'zoomControls',
        methodParams: {},
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'zoom-controls',
            triangleDirection: 'top',
            showTriangle: true,
          },
          {
            targetDomId: 'shortCutKeyDescriptionEdit',
            triangleDirection: 'top',
            showTriangle: true,
          },
          {
            targetDomId: 'cfgEdit',
            triangleDirection: 'top',
            showTriangle: true,
          },
          {
            targetDomId: 'dp-category-search-dropdown',
            triangleDirection: 'top',
            showTriangle: true,
          },
        ],
      },
      {
        title: 'bootStep.swimlaneGraph.step4.title',
        content: 'bootStep.swimlaneGraph.step4.content',
        method: 'measureDetailSearch',
        methodParams: {},
        allowClick: true,
        showBorder: false,
        targetDomConfigs: [
          {
            targetDomId: 'main-swim',
            triangleDirection: 'bottom',
            showTriangle: false,
          },
        ],
      },
      {
        title: 'bootStep.swimlaneGraph.step5.title',
        content: 'bootStep.swimlaneGraph.step5.content',
        method: 'showGuideDetailsPanel',
        methodParams: {},
        allowClick: false,
        showBorder: true,
        targetDomConfigs: [
          {
            targetDomId: 'details-content',
            triangleDirection: 'bottom',
            showTriangle: true,
          },
        ],
      },
      {
        title: 'bootStep.swimlaneGraph.step6.title',
        content: 'bootStep.swimlaneGraph.step6.content',
        allowClick: true,
        showBorder: true,
        targetDomConfigs: [
          {
            targetDomId: 'canvas-container',
            triangleDirection: 'bottom',
            showTriangle: true,
          },
        ],
      },
      {
        title: 'bootStep.swimlaneGraph.step7.title',
        content: 'bootStep.swimlaneGraph.step7.content',
        method: 'showGuideDetailsPanel',
        methodParams: {},
        allowClick: true,
        showBorder:true,
        targetDomConfigs: [
          {
            targetDomId: 'rootHash',
            triangleDirection: 'bottom',
            showTriangle: true,
          },
        ],
      },
    ],
  },
];

// 全局引导步骤3配置
export const guideStepsConfigStep3: GuideBigGroupConfig[] = [
  {
    groupName: 'bootStep.threeColumnGraph.groupName',
    webviewType: 'threeColumnGraph',
    openWebviewFn: undefined,
    openWebviewParams: null,
    imgUrl: '',
    showProgressBar: false,
    steps: [
      {
        title: 'bootStep.threeColumnGraph.step1.title',
        content: 'bootStep.threeColumnGraph.step1.content',
        method: 'viewThreeColumnGraph',
        methodParams: {
          calleehash: '12780147721777633745',
          subFuncmagicname: 'TENSOR_dense_moe_main_2',
        },
        allowClick: true,
        showBorder: false,
        targetDomConfigs: [
          {
            targetDomId: 'guideThreeColumn',
            triangleDirection: 'bottom',
            showTriangle: false,
          },
        ],
      },
      {
        title: 'bootStep.threeColumnGraph.step2.title',
        content: 'bootStep.threeColumnGraph.step2.content',
        method: 'guideLink',
        methodParams: {},
        allowClick: true,
        showBorder: false,
        targetDomConfigs: [
          {
            targetDomId: 'timeline-middle-virtual',
            triangleDirection: 'bottom',
            showTriangle: true,
          },
          {
            targetDomId: 'threads-container',
            triangleDirection: 'bottom',
            showTriangle: true,
          },
        ],
      },
    ],
  },
];

// 工具函数：获取当前步骤的「优先定位配置」（找到第一个存在的DOM对应的配置）
const getCurrentPriorityTargetConfig = (bigGroup: number, smallIndex: number, graphType: string) => {
  const groupConfig = graphType === 'threeColumnGraph' ? guideStepsConfigStep3[bigGroup] : guideStepsConfigStep2[bigGroup];
  if (!groupConfig) return null;
  
  const stepConfig = groupConfig.steps[smallIndex];
  if (!stepConfig || !stepConfig.targetDomConfigs.length) return null;

  // 复用通用DOM存在性判断逻辑（优先ID，降级class）
  const isDomExist = (selector: string): boolean => {
    // 查ID
    if (document.getElementById(selector)) return true;
    // 查class（存在至少一个匹配元素）
    const classElements = document.getElementsByClassName(selector);
    if (classElements.length) {
      return true
    }
    // 查选择器
    return Boolean(document.querySelector(selector));
  };

  // 遍历配置数组（索引越小优先级越高），返回第一个存在的DOM对应的配置
  for (const config of stepConfig.targetDomConfigs) {
    if (isDomExist(config.targetDomId)) {
      return config;
    }
  }

  // 若所有DOM都不存在，返回数组第一个配置（兜底）
  return stepConfig.targetDomConfigs[0];
};

// 工具函数：根据进度获取当前步骤配置
export const getCurrentStepConfig = (bigGroup: number, smallIndex: number, graphType: string) => {
  const groupConfig = graphType === 'threeColumnGraph' ? guideStepsConfigStep3[bigGroup] : guideStepsConfigStep2[bigGroup];
  if (!groupConfig) return null;
  return groupConfig.steps[smallIndex] || null;
};

// 工具函数：获取下一个大组的配置
export const getNextBigGroupConfig = (currentBigGroup: number, graphType: string) => {
  return graphType === 'threeColumnGraph' ? guideStepsConfigStep3[currentBigGroup] : guideStepsConfigStep2[currentBigGroup] || null;
};

// 工具函数：获取当前步骤的目标DOM ID（优先返回索引小的存在的DOM）
export const getCurrentStepTargetDomId = (bigGroup: number, smallIndex: number, graphType: string) => {
  const priorityConfig = getCurrentPriorityTargetConfig(bigGroup, smallIndex, graphType);
  const targetDomId = priorityConfig?.targetDomId || '';
  swimConfig.currentStepTargetDomId = targetDomId;
  return targetDomId;
};

// 工具函数：获取当前步骤的三角配置（优先使用索引小的存在的DOM对应的配置）
export const getCurrentStepTriangleConfig = (bigGroup: number, smallIndex: number, graphType: string) => {
  const priorityConfig = getCurrentPriorityTargetConfig(bigGroup, smallIndex, graphType);
  return {
    showTriangle: priorityConfig?.showTriangle,
    triangleDirection: priorityConfig?.triangleDirection,
  };
};

export let swimConfig = {
  threadKey: '1-1002',
  sampleEventNamePre: '0-0-87-13-2(matmul)',
  sampleEventNameNext: '0-0-81-13-6(cast)',
  currentStepTargetDomId: '',
};
