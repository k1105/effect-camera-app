// モバイルシェーダー設定
import type {MobileConfig} from "./mobileShader";

// 設定プリセット
export const mobilePresets = {
  normal: {
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    tint: 0.0,
  },
  warm: {
    brightness: 1.1,
    contrast: 1.2,
    saturation: 1.3,
    tint: 0.2,
  },
  cool: {
    brightness: 0.9,
    contrast: 1.1,
    saturation: 0.8,
    tint: 0.4,
  },
  dramatic: {
    brightness: 1.3,
    contrast: 1.5,
    saturation: 1.4,
    tint: 0.6,
  },
};

// エフェクトIDごとのプリセット割り当て
export const getMobileConfigForEffect = (effectId: number): MobileConfig => {
  // エフェクトIDに基づいて異なるプリセットを割り当て
  switch (effectId) {
    case 0:
      return mobilePresets.normal; // エフェクト0: 通常
    case 1:
      return mobilePresets.warm; // エフェクト1: 暖色
    case 2:
      return mobilePresets.cool; // エフェクト2: 寒色
    case 3:
      return mobilePresets.dramatic; // エフェクト3: ドラマチック
    case 4:
      return mobilePresets.normal; // エフェクト4: 通常（循環）
    case 5:
      return mobilePresets.warm; // エフェクト5: 暖色（循環）
    case 6:
      return mobilePresets.cool; // エフェクト6: 寒色（循環）
    case 7:
      return mobilePresets.dramatic; // エフェクト7: ドラマチック（循環）
    default:
      // デフォルトでは通常プリセットを使用
      return mobilePresets.normal;
  }
};
