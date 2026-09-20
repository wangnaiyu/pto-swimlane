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
    <svg class="gradient-dashed-line">
        <defs>
            <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" id="startStop" :stop-color="leftColor"/>
                <stop offset="100%" id="endStop" :stop-color="rightColor" />
            </linearGradient>
        </defs>
        <path
            d="M0 0 L40 1"
            :stroke="`url(#${gradientId})`"
            stroke-width="1"
            fill="none"
            stroke-dasharray="4,4"
        />
    </svg>
</template>

<script setup>
import { ref, inject, watch} from 'vue';
const gradientId = ref(`gradDashedLine-${Math.random().toString(36).substr(2,9)}`);
const props = defineProps({
    leftColor: {
        type: String,
        default: '#ffffff'
    },
    rightColor: {
        type: String,
        default: '#ffffff'
    }
});
</script>

<style scoped lang="scss">
.gradient-dashed-line {
    width: 40px;
    height: 1px;
    min-width: 40px;
}
</style>