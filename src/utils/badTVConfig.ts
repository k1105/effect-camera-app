// Bad TV Shader設定
export interface BadTVConfig {
  distortion: number; // 太い歪みの強度 (0.0 - 10.0)
  distortion2: number; // 細かい歪みの強度 (0.0 - 10.0)
  speed: number; // 歪みの垂直移動速度 (0.0 - 1.0)
  rollSpeed: number; // 垂直ロール速度 (0.0 - 1.0)
  chromaticAberration: number; // 色収差の強度 (0.0 - 1.0)
  interlaceIntensity: number; // インターレースの強度 (0.0 - 1.0)
  interlaceLineWidth: number; // インターレースの線幅 (1.0 - 10.0)
}

// デフォルト設定（元のシェーダーと同じ値）
export const defaultBadTVConfig: BadTVConfig = {
  distortion: 3.0, // 太い歪み
  distortion2: 5.0, // 細かい歪み
  speed: 0.2, // 歪みの垂直移動速度
  rollSpeed: 0, // 垂直ロール速度
  chromaticAberration: 0.5, // 色収差
  interlaceIntensity: 0.3, // インターレース
  interlaceLineWidth: 2.0, // インターレースの線幅
};

// 設定プリセット
export const badTVPresets = {
  subtle: {
    distortion: 1.0,
    distortion2: 2.0,
    speed: 0.1,
    rollSpeed: 0,
    chromaticAberration: 0.2,
    interlaceIntensity: 1.0, // インターレース効果を無効化（1.0 = 100%明度）
    interlaceLineWidth: 1.0,
  },
  moderate: {
    distortion: 3.0,
    distortion2: 5.0,
    speed: 0.2,
    rollSpeed: 0,
    chromaticAberration: 0.5,
    interlaceIntensity: 0.3,
    interlaceLineWidth: 2.0,
  },
  heavy: {
    distortion: 6.0,
    distortion2: 8.0,
    speed: 0.3,
    rollSpeed: 0,
    chromaticAberration: 0.8,
    interlaceIntensity: 0.6,
    interlaceLineWidth: 4.0,
  },
  extreme: {
    distortion: 10.0,
    distortion2: 10.0,
    speed: 1.0,
    rollSpeed: 0,
    chromaticAberration: 1.0,
    interlaceIntensity: 1.0,
    interlaceLineWidth: 10.0,
  },
};

// エフェクトIDごとのプリセット割り当て
export const getBadTVConfigForEffect = (effectId: number): BadTVConfig => {
  // エフェクトIDに基づいて異なるプリセットを割り当て
  switch (effectId) {
    case 0:
      // エフェクト0: Normal（エフェクトなし）- すべての値を0に設定
      return {
        distortion: 0.0,
        distortion2: 0.0,
        speed: 0.0,
        rollSpeed: 0.0,
        chromaticAberration: 0.0,
        interlaceIntensity: 1.0, // インターレース効果を無効化
        interlaceLineWidth: 1.0,
      };
    case 1:
      return badTVPresets.moderate; // エフェクト1: 中程度
    case 2:
      return badTVPresets.heavy; // エフェクト2: 強烈
    case 3:
      return badTVPresets.extreme; // エフェクト3: 極端
    case 4:
      return badTVPresets.subtle; // エフェクト4: 微細（循環）
    case 5:
      return badTVPresets.moderate; // エフェクト5: 中程度（循環）
    case 6:
      return badTVPresets.heavy; // エフェクト6: 強烈（循環）
    case 7:
      // エフェクト7: 複合エフェクト用の特別な設定
      return {
        distortion: 8.0, // 強い歪み
        distortion2: 9.0, // 強い細かい歪み
        speed: 0.4, // 中程度の速度
        rollSpeed: 0.15, // 中程度のロール
        chromaticAberration: 0.9, // 強い色収差
        interlaceIntensity: 0.4, // 中程度のインターレース
        interlaceLineWidth: 6.0, // 太いインターレース
      };
    default:
      // デフォルトでは微細プリセットを使用
      return badTVPresets.subtle;
  }
};
