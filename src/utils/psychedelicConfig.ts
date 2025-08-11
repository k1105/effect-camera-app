// サイケデリックシェーダー設定
import type {PsychedelicConfig} from "./psychedelicShader";

// 設定プリセット
export const psychedelicPresets = {
  subtle: {
    thermalIntensity: 0.3,
    contrastIntensity: 0.4,
    psychedelicSpeed: 0.2,
    channelShift: 0.1,
    glowIntensity: 0.2,
  },
  moderate: {
    thermalIntensity: 0.6,
    contrastIntensity: 0.7,
    psychedelicSpeed: 0.4,
    channelShift: 0.3,
    glowIntensity: 0.5,
  },
  intense: {
    thermalIntensity: 0.8,
    contrastIntensity: 0.9,
    psychedelicSpeed: 0.6,
    channelShift: 0.6,
    glowIntensity: 0.8,
  },
  extreme: {
    thermalIntensity: 1.0,
    contrastIntensity: 1.0,
    psychedelicSpeed: 0.8,
    channelShift: 0.9,
    glowIntensity: 1.0,
  },
};

// エフェクトIDごとのプリセット割り当て
export const getPsychedelicConfigForEffect = (
  effectId: number
): PsychedelicConfig => {
  // エフェクトIDに基づいて異なるプリセットを割り当て
  switch (effectId) {
    case 0:
      // エフェクト0: Normal（エフェクトなし）- すべての値を0に設定
      return {
        thermalIntensity: 0.0,
        contrastIntensity: 0.0,
        psychedelicSpeed: 0.0,
        channelShift: 0.0,
        glowIntensity: 0.0,
      };
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
      // エフェクト7: 複合エフェクト用の特別な設定
      return {
        thermalIntensity: 0.85,    // 強い熱効果
        contrastIntensity: 0.95,   // 強いコントラスト
        psychedelicSpeed: 0.7,     // 中程度の速度
        channelShift: 0.7,         // 強いチャンネルシフト
        glowIntensity: 0.9,        // 強いグロー効果
      };
    default:
      // デフォルトでは微細プリセットを使用
      return psychedelicPresets.subtle;
  }
};
