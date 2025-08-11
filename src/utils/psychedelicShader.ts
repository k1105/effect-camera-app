// サイケデリックシェーダー（モバイル最適化版）
// サーマルビジョン/ヒートマップ風のサイケデリック効果

export const psychedelicVertexShader = `
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

export const psychedelicFragmentShader = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_time;
  uniform float u_thermalIntensity; // サーマル効果の強度 (0.0 - 1.0)
  uniform float u_contrastIntensity; // コントラスト効果の強度 (0.0 - 1.0)
  uniform float u_psychedelicSpeed; // サイケデリック効果の速度 (0.0 - 1.0)
  uniform float u_channelShift; // チャンネルシフトの強度 (0.0 - 1.0)
  uniform float u_glowIntensity; // グロー効果の強度 (0.0 - 1.0)
  
  varying vec2 v_texCoord;
  
  // 簡略化されたサーマルカラーマッピング
  vec3 thermalColorMap(float intensity) {
    // 温度に基づく色マッピング（青→緑→黄→赤→白）
    if (intensity < 0.25) {
      return mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), intensity * 4.0);
    } else if (intensity < 0.5) {
      return mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), (intensity - 0.25) * 4.0);
    } else if (intensity < 0.75) {
      return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0), (intensity - 0.5) * 4.0);
    } else {
      return mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0), (intensity - 0.75) * 4.0);
    }
  }
  
  // 簡略化された高コントラスト効果
  vec3 highContrast(vec3 color, float contrast) {
    return pow(color, vec3(1.0 / (1.0 + contrast)));
  }
  
  // 簡略化されたグロー効果
  vec3 addGlow(vec3 color, float glow) {
    vec3 glowEffect = color * glow * 0.3;
    return clamp(color + glowEffect, 0.0, 1.0);
  }
  
  // 簡略化されたチャンネルシフト効果
  vec3 channelShift(vec3 color, float shift, float time) {
    vec3 shifted = vec3(
      color.r + sin(time * 1.0) * shift * 0.2,
      color.g + sin(time * 0.8) * shift * 0.2,
      color.b + sin(time * 1.2) * shift * 0.2
    );
    return clamp(shifted, 0.0, 1.0);
  }
  
  void main() {
    vec2 uv = v_texCoord;
    vec4 texColor = texture2D(u_texture, uv);
    
    // 明度を計算（サーマル効果のベース）
    float brightness = (texColor.r + texColor.g + texColor.b) / 3.0;
    
    // サーマルカラーマッピング
    vec3 thermalColor = thermalColorMap(brightness);
    
    // 時間に基づく動的な色変化（簡略化）
    float timeEffect = sin(u_time * u_psychedelicSpeed * 0.5) * 0.5 + 0.5;
    vec3 dynamicColor = mix(thermalColor, 1.0 - thermalColor, timeEffect * u_thermalIntensity);
    
    // チャンネルシフト
    vec3 shiftedColor = channelShift(dynamicColor, u_channelShift, u_time * u_psychedelicSpeed * 0.3);
    
    // 高コントラスト効果
    vec3 contrastColor = highContrast(shiftedColor, u_contrastIntensity);
    
    // グロー効果
    vec3 finalColor = addGlow(contrastColor, u_glowIntensity);
    
    // 最終的な色を適切に制限（0.0-1.0の範囲に）
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    // 過度な明度を防ぐための追加制限
    float maxBrightness = 0.85; // 最大明度を85%に制限
    float currentBrightness = (finalColor.r + finalColor.g + finalColor.b) / 3.0;
    if (currentBrightness > maxBrightness) {
      float scale = maxBrightness / currentBrightness;
      finalColor = finalColor * scale;
    }
    
    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

// サイケデリック設定のインターフェース
export interface PsychedelicConfig {
  thermalIntensity: number; // サーマル効果の強度 (0.0 - 1.0)
  contrastIntensity: number; // コントラスト効果の強度 (0.0 - 1.0)
  psychedelicSpeed: number; // サイケデリック効果の速度 (0.0 - 1.0)
  channelShift: number; // チャンネルシフトの強度 (0.0 - 1.0)
  glowIntensity: number; // グロー効果の強度 (0.0 - 1.0)
}

// サイケデリックシェーダーの適用を一元管理するユーティリティ
export interface PsychedelicShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  time: number;
  config: PsychedelicConfig;
}

export const applyPsychedelicShader = (
  context: PsychedelicShaderContext
): void => {
  const {gl, program, time, config} = context;

  // シェーダープログラムを使用
  gl.useProgram(program);

  // ユニフォーム変数を設定
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const thermalIntensityLocation = gl.getUniformLocation(
    program,
    "u_thermalIntensity"
  );
  const contrastIntensityLocation = gl.getUniformLocation(
    program,
    "u_contrastIntensity"
  );
  const psychedelicSpeedLocation = gl.getUniformLocation(
    program,
    "u_psychedelicSpeed"
  );
  const channelShiftLocation = gl.getUniformLocation(program, "u_channelShift");
  const glowIntensityLocation = gl.getUniformLocation(
    program,
    "u_glowIntensity"
  );

  if (timeLocation) gl.uniform1f(timeLocation, time);
  if (thermalIntensityLocation)
    gl.uniform1f(thermalIntensityLocation, config.thermalIntensity);
  if (contrastIntensityLocation)
    gl.uniform1f(contrastIntensityLocation, config.contrastIntensity);
  if (psychedelicSpeedLocation)
    gl.uniform1f(psychedelicSpeedLocation, config.psychedelicSpeed);
  if (channelShiftLocation)
    gl.uniform1f(channelShiftLocation, config.channelShift);
  if (glowIntensityLocation)
    gl.uniform1f(glowIntensityLocation, config.glowIntensity);

  // シェーダーの設定が完了
  // テクスチャの描画は呼び出し側で行う
};
