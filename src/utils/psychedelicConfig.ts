// サイケデリックシェーダー設定
import type {PsychedelicConfig} from "./psychedelicShader";

// 設定プリセット
export const psychedelicPresets = {
  subtle: {
    inversionIntensity: 0.1,
    hueShift: 0.2,
    psychedelicSpeed: 0.3,
    channelShift: 0.1,
    waveIntensity: 0.2,
  },
  moderate: {
    inversionIntensity: 0.3,
    hueShift: 0.5,
    psychedelicSpeed: 0.5,
    channelShift: 0.3,
    waveIntensity: 0.4,
  },
  intense: {
    inversionIntensity: 0.6,
    hueShift: 0.8,
    psychedelicSpeed: 0.7,
    channelShift: 0.6,
    waveIntensity: 0.6,
  },
  extreme: {
    inversionIntensity: 0.9,
    hueShift: 1.0,
    psychedelicSpeed: 1.0,
    channelShift: 0.9,
    waveIntensity: 0.8,
  },
};

// エフェクトIDごとのプリセット割り当て
export const getPsychedelicConfigForEffect = (
  effectId: number
): PsychedelicConfig => {
  // エフェクトIDに基づいて異なるプリセットを割り当て
  switch (effectId) {
    case 0:
      return psychedelicPresets.subtle; // エフェクト0: 微細
    case 1:
      return psychedelicPresets.moderate; // エフェクト1: 中程度
    case 2:
      return psychedelicPresets.intense; // エフェクト2: 強烈
    case 3:
      return psychedelicPresets.extreme; // エフェクト3: 極端
    case 4:
      return psychedelicPresets.subtle; // エフェクト4: 微細（循環）
    case 5:
      return psychedelicPresets.moderate; // エフェクト5: 中程度（循環）
    case 6:
      return psychedelicPresets.intense; // エフェクト6: 強烈（循環）
    case 7:
      return psychedelicPresets.extreme; // エフェクト7: 極端（循環）
    default:
      // デフォルトでは微細プリセットを使用
      return psychedelicPresets.subtle;
  }
};
