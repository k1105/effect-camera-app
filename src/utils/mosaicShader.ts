// Mosaic Shader for WebGL
// モザイク効果を実現するシェーダー

export const mosaicVertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform mat3 u_transform;
  varying vec2 v_texCoord;
  
  void main() {
    vec2 position = (u_transform * vec3(a_position, 1.0)).xy;
    gl_Position = vec4(position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

export const mosaicFragmentShader = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_mosaicSize; // モザイクのサイズ（ピクセル単位）
  uniform float u_mosaicIntensity; // モザイク効果の強度 (0.0 - 1.0)
  
  varying vec2 v_texCoord;
  
  void main() {
    vec2 uv = v_texCoord;
    
    // モザイク効果が無効な場合は、元のテクスチャをそのまま表示
    if (u_mosaicIntensity <= 0.0) {
      gl_FragColor = texture2D(u_texture, uv);
      return;
    }
    
    // モザイクサイズに基づいてUV座標を量子化
    vec2 mosaicUV = floor(uv * u_mosaicSize) / u_mosaicSize;
    
    // 元のテクスチャから色を取得
    vec4 color = texture2D(u_texture, mosaicUV);
    
    // モザイク効果の強度に応じて、元の色とモザイク色をブレンド
    vec4 originalColor = texture2D(u_texture, uv);
    vec4 finalColor = mix(originalColor, color, u_mosaicIntensity);
    
    gl_FragColor = finalColor;
  }
`;

// モザイクシェーダーの設定インターフェース
export interface MosaicConfig {
  mosaicSize: number; // モザイクのサイズ（ピクセル単位、1.0-50.0）
  mosaicIntensity: number; // モザイク効果の強度 (0.0 - 1.0)
}

// デフォルト設定
export const defaultMosaicConfig: MosaicConfig = {
  mosaicSize: 8.0, // 8ピクセルサイズのモザイク
  mosaicIntensity: 0.8, // 80%のモザイク効果
};

// モザイクシェーダーの適用を一元管理するユーティリティ
export interface MosaicShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  config: MosaicConfig;
}

export const applyMosaicShader = (context: MosaicShaderContext): void => {
  const {gl, program, config} = context;

  // シェーダープログラムを使用
  gl.useProgram(program);

  // ユニフォーム変数を設定
  const mosaicSizeLocation = gl.getUniformLocation(program, "u_mosaicSize");
  const mosaicIntensityLocation = gl.getUniformLocation(
    program,
    "u_mosaicIntensity"
  );

  if (mosaicSizeLocation) gl.uniform1f(mosaicSizeLocation, config.mosaicSize);
  if (mosaicIntensityLocation)
    gl.uniform1f(mosaicIntensityLocation, config.mosaicIntensity);

  // シェーダーの設定が完了
  // テクスチャの描画は呼び出し側で行う
};
