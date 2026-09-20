/**
 * Copyright (c) 2025-2026 Huawei Technologies Co., Ltd.
 * This program is free software, you can redistribute it and/or modify it under the terms and conditions of
 * CANN Open Software License Agreement Version 2.0 (the "License").
 * Please refer to the License for details. You may not use this file except in compliance with the License.
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * See LICENSE in the root of the software repository for the full text of the License.
 */
import { InjectionKey, Ref } from 'vue';

export interface ILayoutInfo {
  showLeft?: boolean;
  showRight?: boolean;
  showBottom?: boolean;
  currentWidth?: string;
  currentHeight?: string;
}
export type LayoutMode = 'triangular' | 'threeColumn';
export type BlockType = 'left' | 'right' | 'bottom' | '';
export type GraphType = 'editor' | 'comGraph' | 'swimGraph';
export interface IBlockToGraphMap extends Record<Exclude<BlockType, ''>, GraphType> {}
export interface IShowBlockMap extends Record<Exclude<BlockType, ''>, Ref<boolean>> {}

export interface IThreeColumnCtx {
  resizing: Ref<boolean>;
  currentActiveBlock: Ref<BlockType>;
  currentLayoutMode: Ref<LayoutMode>;
  isComGraphFullscreen: Ref<boolean>;
  isSwimFullscreen: Ref<boolean>;
  BlockToGraphMap: IBlockToGraphMap;
  dragStartBlock: Ref<BlockType>;
  onToggleComGraphFullscreen: () => void;
  onToggleSwimFullscreen: () => void;
  emitSizeChange(): void;
  resetLayout(): void;
}

export const ThreeColumnProvideKey = 'three-column' as unknown as InjectionKey<IThreeColumnCtx>;

export interface ISwimGraphState {
  detailsPanelExpanded: Ref<boolean>;
}

export const SwimGraphStateKey = 'swim-graph-state' as unknown as InjectionKey<ISwimGraphState>;
