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
  <svg
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    width="16.000000"
    height="16.000000"
    fill="none"
  >
    <rect width="16.000000" height="16.000000" x="0.000000" y="0.000000" />
    <g>
      <path
        d="M8.50814 8.46852C8.20686 8.6434 7.83493 8.64392 7.53314 8.4699L2.24315 5.41929C1.91947 5.23265 1.91883 4.76631 2.24196 4.57876L7.49186 1.53157C7.79314 1.3567 8.16507 1.35617 8.46686 1.5302L13.7569 4.5808C14.0805 4.76744 14.0812 5.23379 13.758 5.42134L8.50814 8.46852Z"
        fill-rule="evenodd"
        :stroke="active ? 'var(--devui-operation-text-hover)' : 'var(--devui-overlay-icon)'"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M13.5149 8.40209L8.26499 11.4493C7.96371 11.6242 7.59179 11.6247 7.28999 11.4506L2 8.40005"
        :stroke="active ? 'var(--devui-operation-text-hover)' : 'var(--devui-overlay-icon)'"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
      <path
        d="M13.5149 11.4021L8.26499 14.4493C7.96371 14.6242 7.59179 14.6247 7.28999 14.4506L2 11.4"
        :stroke="active ? 'var(--devui-operation-text-hover)' : 'var(--devui-overlay-icon)'"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
      />
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
