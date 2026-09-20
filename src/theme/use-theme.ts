/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { ref, onMounted, provide } from 'vue';
import { ThemeServiceInit } from 'devui-theme';
import { ideLightTheme, ideDarkTheme } from './theme-data';

export function useTheme() {
  const themeService = ThemeServiceInit({ ideLightTheme, ideDarkTheme });
  const isDarkTheme = ref(true);

  const updateTheme = (theme: string) => {
    isDarkTheme.value = theme === 'dark';
    (window as any).isAscDark = isDarkTheme.value;
    if (isDarkTheme.value) {
      themeService?.applyTheme(ideDarkTheme);
    } else {
      themeService?.applyTheme(ideLightTheme);
    }
  };

  provide('root', { isDarkTheme });

  onMounted(() => {
    updateTheme((window as any).ascTheme);
  });

  return { isDarkTheme, updateTheme };
}
