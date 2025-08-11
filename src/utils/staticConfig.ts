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
        staticIntensity: 0.15, // 非常に軽いスタティック
        staticSize: 3.0,
      };
    case 2:
      return {
        ...baseConfig,
        staticIntensity: 0.25, // 軽いスタティック
        staticSize: 4.0,
      };
    case 3:
      return {
        ...baseConfig,
        staticIntensity: 0.35, // 中程度のスタティック
        staticSize: 5.0,
      };
    case 4:
      return {
        ...baseConfig,
        staticIntensity: 0.1, // 非常に軽いスタティック
        staticSize: 2.5,
      };
    case 5:
      return {
        ...baseConfig,
        staticIntensity: 0.2, // 軽いスタティック
        staticSize: 3.5,
      };
    case 6:
      return {
        ...baseConfig,
        staticIntensity: 0.3, // 中程度のスタティック
        staticSize: 4.5,
      };
    case 7:
      // エフェクト7: 複合エフェクト用の特別な設定
      return {
        ...baseConfig,
        staticIntensity: 0.35, // 複合エフェクト用の適度なスタティック
        staticSize: 6.0, // 中程度のノイズサイズ
      };
    default:
      return baseConfig;
  }
};

// スタティックシェーダーの適用を一元管理するユーティリティ
export interface StaticShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  time: number;
  config: StaticConfig;
}

export const applyStaticShader = (context: StaticShaderContext): void => {
  const {gl, program, time, config} = context;

  // シェーダープログラムを使用
  gl.useProgram(program);

  // ユニフォーム変数を設定
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const staticIntensityLocation = gl.getUniformLocation(
    program,
    "u_staticIntensity"
  );
  const staticSizeLocation = gl.getUniformLocation(program, "u_staticSize");

  if (timeLocation) gl.uniform1f(timeLocation, time);
  if (staticIntensityLocation)
    gl.uniform1f(staticIntensityLocation, config.staticIntensity);
  if (staticSizeLocation) gl.uniform1f(staticSizeLocation, config.staticSize);

  // シェーダーの設定が完了
  // テクスチャの描画は呼び出し側で行う
};
