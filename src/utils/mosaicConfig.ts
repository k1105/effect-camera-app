// Mosaic Shader設定
import type {MosaicConfig} from "./mosaicShader";

// 設定プリセット
export const mosaicPresets = {
  subtle: {
    mosaicSize: 4.0, // 4ピクセルサイズのモザイク
    mosaicIntensity: 0.4, // 40%のモザイク効果
  },
  moderate: {
    mosaicSize: 8.0, // 8ピクセルサイズのモザイク
    mosaicIntensity: 0.6, // 60%のモザイク効果
  },
  heavy: {
    mosaicSize: 16.0, // 16ピクセルサイズのモザイク
    mosaicIntensity: 0.8, // 80%のモザイク効果
  },
  extreme: {
    mosaicSize: 32.0, // 32ピクセルサイズのモザイク
    mosaicIntensity: 1.0, // 100%のモザイク効果
  },
};

// エフェクトIDごとのプリセット割り当て
export const getMosaicConfigForEffect = (effectId: number): MosaicConfig => {
  // エフェクトIDに基づいて異なるプリセットを割り当て
  switch (effectId) {
    case 0:
      // エフェクト0: Normal（エフェクトなし）- モザイク無効
      return {
        mosaicSize: 1.0,
        mosaicIntensity: 0.0,
      };
    case 1:
      return mosaicPresets.moderate; // エフェクト1: 中程度
    case 2:
      return mosaicPresets.heavy; // エフェクト2: 強烈
    case 3:
      return mosaicPresets.extreme; // エフェクト3: 極端
    case 4:
      return mosaicPresets.subtle; // エフェクト4: 微細（循環）
    case 5:
      return mosaicPresets.moderate; // エフェクト5: モザイク効果
    case 6:
      return mosaicPresets.heavy; // エフェクト6: 強烈（循環）
    case 7:
      // エフェクト7: 複合エフェクト用の特別な設定
      return {
        mosaicSize: 12.0, // 複合エフェクト用の中程度のモザイク
        mosaicIntensity: 0.7, // 70%のモザイク効果
      };
    default:
      // デフォルトでは微細プリセットを使用
      return mosaicPresets.subtle;
  }
};
