/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { defaultBaseColorList, defaultBaseColorListInDark, defaultLightColorList, defaultLightColorListInDark } from "./defaultColor";

// 动态导入ES Module
let Hct: any = null;

export async function loadMaterialColorUtilities() {
  if (!Hct) {
    const materialColorUtilities = await import('@material/material-color-utilities').catch(err => {
      return {Hct: null}
    });
    Hct = materialColorUtilities.Hct;
  }
  return Hct;
}

export function getHct() {
  return Hct;
}

function hctToHex(hue, chroma, tone) {
  // 确保模块已加载
  const HctClass = getHct();
  
  // 创建Hct对象并设置参数（库会自动处理色域外值）
  const hctColor = HctClass.from(hue, chroma, tone);

  // 转换为ARGB整数（0xAARRGGBB格式）
  const argb = hctColor.toInt();

  // 提取RGB分量并转换为HEX
  const red = (argb >> 16) & 0xff;
  const green = (argb >> 8) & 0xff;
  const blue = argb & 0xff;

  return `#${red.toString(16).padStart(2, '0')}` +
    `${green.toString(16).padStart(2, '0')}` +
    `${blue.toString(16).padStart(2, '0')}`;
}


function hexToHct(hex) {
  const HctClass = getHct();
  const argb = hexToArgb(hex);
  const hct = HctClass.fromInt(argb);
  
  return {
    hue: hct.hue,
    chroma: hct.chroma,
    tone: hct.tone
  };
}

function hexToArgb(hex) {
  let cleanHex = hex.replace('#', '');
  
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map(c => c + c)
      .join('');
  }
  cleanHex = 'FF' + cleanHex;
  
  return parseInt(cleanHex, 16);
}

export function getLighterColorByHex(color: string) {
  if (!Hct) {
    return color;
  }
  const hctColor = hexToHct(color);
  return hctToHex(hctColor.hue, hctColor.chroma, hctColor.tone + 20 > 100 ? 100 : hctColor.tone + 20);
}

export function generateColorList(count: number, isDark = true) {
  if (!Hct) {
    return isDark ? {
      baseColorList: defaultBaseColorListInDark,
      lightColorList: defaultLightColorListInDark
    } : {
      baseColorList: defaultBaseColorList,
      lightColorList: defaultLightColorList
    }
  }
  const baseColor = isDark ? [268, 47, 43] : [268, 67, 85];
  const baseLightColor = isDark ? [268, 47, 80] : [268, 67, 43];
  const originBaseColorList: string[] = [];
  const originLightColorList: string[] = [];
  const interval = Math.floor(360 / count) + 40;
  
  for (let index = 0; index < count; index ++) {
    originBaseColorList.push(hctToHex((baseColor[0] + interval * index) % 360, baseColor[1], baseColor[2]));
    originLightColorList.push(hctToHex((baseLightColor[0] + interval * index) % 360, baseLightColor[1], baseLightColor[2]));
  }
  
  return {
    baseColorList: originBaseColorList,
    lightColorList: originLightColorList
  }
}

function dbj2Hash(str: string) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * 根据字符串获取颜色
 * @param str
 * @param baseColorList 某种主题下的默认态颜色列表
 * @param lightColorList 某种主题下的高亮态颜色列表
 * @returns 默认态颜色和高亮态颜色
 */
export function getColorByString(str: string, baseColorList: any, lightColorList: any) {
  const hash = dbj2Hash(str);
  const index = hash % baseColorList.length;
  const baseColor = baseColorList[index];
  const lightColor = lightColorList[index];
  return { baseColor, lightColor };
}