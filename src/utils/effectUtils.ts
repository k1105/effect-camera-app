// エフェクト関連のユーティリティ関数

// エフェクト名の取得
export const getEffectName = (effectId: number): string => {
  const effectNames = [
    "Bad TV - Subtle",
    "Bad TV - Moderate",
    "Bad TV - Heavy",
    "Bad TV - Extreme",
    "Psychedelic - Subtle",
    "Psychedelic - Moderate",
    "Psychedelic - Intense",
    "Psychedelic - Extreme",
  ];
  return effectNames[effectId] || `Effect ${effectId}`;
};

// エフェクトに応じた背景色の取得
export const getBackgroundColorForEffect = (
  effectId: number
): [number, number, number, number] => {
  switch (effectId) {
    case 0: // Bad TV - Subtle
      return [0.1, 0.1, 0.1, 1.0]; // 暗いグレー
    case 1: // Bad TV - Moderate
      return [0.05, 0.05, 0.05, 1.0]; // より暗いグレー
    case 2: // Bad TV - Heavy
      return [0.02, 0.02, 0.02, 1.0]; // 非常に暗いグレー
    case 3: // Bad TV - Extreme
      return [0.0, 0.0, 0.0, 1.0]; // 完全な黒
    case 4: // Psychedelic - Subtle
      return [0.1, 0.05, 0.15, 1.0]; // 暗い紫
    case 5: // Psychedelic - Moderate
      return [0.15, 0.05, 0.2, 1.0]; // 紫
    case 6: // Psychedelic - Intense
      return [0.2, 0.05, 0.25, 1.0]; // 明るい紫
    case 7: // Psychedelic - Extreme
      return [0.25, 0.05, 0.3, 1.0]; // 非常に明るい紫
    default:
      return [0.0, 0.0, 0.0, 1.0]; // デフォルトは黒
  }
};

// エフェクトに応じたオーバーレイ色の取得
export const getEffectOverlayColor = (effectId: number): string => {
  switch (effectId) {
    case 0: // Bad TV - Subtle
      return "rgba(20, 20, 20, 0.3)"; // 暗いグレー
    case 1: // Bad TV - Moderate
      return "rgba(10, 10, 10, 0.5)"; // より暗いグレー
    case 2: // Bad TV - Heavy
      return "rgba(5, 5, 5, 0.7)"; // 非常に暗いグレー
    case 3: // Bad TV - Extreme
      return "rgba(0, 0, 0, 0.9)"; // 完全な黒
    case 4: // Psychedelic - Subtle
      return "rgba(40, 10, 60, 0.3)"; // 暗い紫
    case 5: // Psychedelic - Moderate
      return "rgba(60, 15, 90, 0.4)"; // 紫
    case 6: // Psychedelic - Intense
      return "rgba(80, 20, 120, 0.5)"; // 明るい紫
    case 7: // Psychedelic - Extreme
      return "rgba(100, 25, 150, 0.6)"; // 非常に明るい紫
    default:
      return "rgba(0, 0, 0, 0.8)"; // デフォルトは黒
  }
};
