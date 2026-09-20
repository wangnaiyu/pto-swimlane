<!--
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 -->
<template>
<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" fill="none">
	<rect id="ic_测距/16px" width="16" height="16" x="0" y="0" fill="rgb(255,229.5,229.5)" fill-opacity="0" transform="matrix(0,1,-1,0,16,0)" />
	<g id="ic_ict_vertically_aligned_top-垂直对齐顶部/base/ic_ict_vertically_aligned_top">
		<path id="path4" d="M0 0L12 0" :stroke="active ? 'var(--devui-operation-text-hover)' : 'var(--devui-overlay-icon)'" stroke-linecap="round" stroke-width="1.5" transform="matrix(0,1,-1,0,15.25,2)" />
		<path id="path4" d="M0 0L12 0" :stroke="active ? 'var(--devui-operation-text-hover)' : 'var(--devui-overlay-icon)'" stroke-linecap="round" stroke-width="1.5" transform="matrix(0,1,-1,0,0.75,2)" />
		<path id="合并" d="M1.28145 3.76402L2.50322 2.55117L2.5034 4.71359C2.50285 4.72567 2.50257 4.73783 2.50257 4.75006L2.50292 8.94878L1.2814 7.73642C0.983299 7.44056 0.516613 7.44231 0.220747 7.74041C-0.0751183 8.03851 -0.0733626 8.5052 0.224738 8.80107L2.72474 11.2823Q2.94408 11.5 3.25311 11.5Q3.56214 11.5 3.78145 11.2823L6.28145 8.80052C6.57952 8.50462 6.58123 8.03793 6.28534 7.73986C5.98944 7.44179 5.52276 7.44008 5.22468 7.73598L4.00292 8.94883L4.00274 6.78641C4.00329 6.77434 4.00357 6.76217 4.00357 6.74994L4.00322 2.55122L5.22474 3.76358C5.52284 4.05944 5.98952 4.05769 6.28539 3.75959C6.58126 3.46149 6.5795 2.9948 6.2814 2.69894L3.7814 0.217678Q3.67173 0.108832 3.53964 0.054412Q3.40755 -7.72625e-06 3.25303 0Q3.09852 7.72625e-06 2.96643 0.0544408Q2.83434 0.108874 2.72468 0.217731L0.224685 2.69948C-0.0733862 2.99538 -0.0750954 3.46207 0.2208 3.76014C0.516695 4.05821 0.983382 4.05992 1.28145 3.76402Z" :fill="active ? 'var(--devui-operation-text-hover)' : 'var(--devui-overlay-icon)'" fill-rule="evenodd" transform="matrix(0,1,-1,0,13.75,4.74707)" />
	</g>
</svg>
</template>

<script setup lang="ts">
defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});
</script>
