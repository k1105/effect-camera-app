// Static Shader設定
export interface StaticConfig {
  staticIntensity: number; // スタティック効果の強度 (0.0 - 1.0)
  staticSize: number; // スタティックノイズのサイズ (ピクセル単位)
}

// デフォルト設定
export const defaultStaticConfig: StaticConfig = {
  staticIntensity: 0.3, // スタティック効果の強度
  staticSize: 4.0, // ノイズのサイズ（ピクセル単位）
};

// エフェクトIDに基づいてStatic設定を取得
export const getStaticConfigForEffect = (effectId: number): StaticConfig => {
  const baseConfig = {...defaultStaticConfig};

  switch (effectId) {
    case 0:
      return {
        ...baseConfig,
        staticIntensity: 0.0, // Normal（エフェクトなし）- スタティック無効
        staticSize: 1.0,
      };
    case 1:
      return {
        ...baseConfig,
        staticIntensity: 0.3, // 中程度のスタティック
        staticSize: 4.0,
      };
    case 2:
      return {
        ...baseConfig,
        staticIntensity: 0.4, // やや強いスタティック
        staticSize: 5.0,
      };
    case 3:
      return {
        ...baseConfig,
        staticIntensity: 0.5, // 強いスタティック
        staticSize: 6.0,
      };
    case 4:
      return {
        ...baseConfig,
        staticIntensity: 0.25, // 軽いスタティック
        staticSize: 3.5,
      };
    case 5:
      return {
        ...baseConfig,
        staticIntensity: 0.35, // 中程度のスタティック
        staticSize: 4.5,
      };
    case 6:
      return {
        ...baseConfig,
        staticIntensity: 0.45, // やや強いスタティック
        staticSize: 5.5,
      };
    case 7:
      return {
        ...baseConfig,
        staticIntensity: 0.55, // 最も強いスタティック
        staticSize: 7.0,
      };
    default:
      return baseConfig;
  }
};
