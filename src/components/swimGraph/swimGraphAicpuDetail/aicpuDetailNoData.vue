<!--
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 -->
<script setup lang="ts">
import { onMounted, ref, computed, inject } from 'vue';
import { useI18n } from 'vue-i18n';
const { t: $t } = useI18n();
const { isDarkTheme } = inject('root');
let iconPath = computed(() => `${(window as any).staticPath}/static-assets/noFile${isDarkTheme.value ? 'Dark' : ''}.png`);
</script>

<template>
    <div class="no-file-container">
        <div><img :src="iconPath" alt="" class="no-file-icon" /></div>
        <div class="no-file-title">{{ $t('noDataText')}}</div>
    </div>
</template>

<style scoped>

</style>
<style lang="scss">
.no-file-container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    height: 100%;
    .devui-button {
        border-radius: 8px;
    }
}
.no-file-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--devui-category-search-font-color)
}
.no-file-icon {
    width: 100px;
    height: 100px;
}
.mt10 {
    margin-top: 10px;
}
.no-file-back {
    background: var(--devui-primary-button-bg) !important;

    &:hover {
        background: var(--devui-primary-button-hover-bg) !important;
    }
}
</style>
