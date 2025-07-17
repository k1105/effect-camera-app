// サイケデリックシェーダー
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
  
  // サーマルカラーマッピング
  vec3 thermalColorMap(float intensity) {
    // 温度に基づく色マッピング（青→緑→黄→赤→白）
    if (intensity < 0.2) {
      return mix(vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), (intensity - 0.0) / 0.2);
    } else if (intensity < 0.4) {
      return mix(vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0), (intensity - 0.2) / 0.2);
    } else if (intensity < 0.6) {
      return mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 0.5, 0.0), (intensity - 0.4) / 0.2);
    } else if (intensity < 0.8) {
      return mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 0.0, 0.0), (intensity - 0.6) / 0.2);
    } else {
      return mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0), (intensity - 0.8) / 0.2);
    }
  }
  
  // 高コントラスト効果
  vec3 highContrast(vec3 color, float contrast) {
    return pow(color, vec3(1.0 / (1.0 + contrast * 2.0)));
  }
  
  // グロー効果
  vec3 addGlow(vec3 color, float glow) {
    // グロー効果を制限して、加算され続けないようにする
    vec3 glowEffect = color * glow * 0.5;
    return clamp(color + glowEffect, 0.0, 1.0);
  }
  
  // チャンネルシフト効果
  vec3 channelShift(vec3 color, float shift, float time) {
    vec3 shifted = vec3(
      color.r + sin(time * 2.0) * shift * 0.3,
      color.g + sin(time * 1.5) * shift * 0.3,
      color.b + sin(time * 3.0) * shift * 0.3
    );
    // チャンネルシフトも制限して極端な変化を防ぐ
    return clamp(shifted, 0.0, 1.0);
  }
  
  void main() {
    vec2 uv = v_texCoord;
    vec4 texColor = texture2D(u_texture, uv);
    
    // 明度を計算（サーマル効果のベース）
    float brightness = (texColor.r + texColor.g + texColor.b) / 3.0;
    
    // サーマルカラーマッピング
    vec3 thermalColor = thermalColorMap(brightness);
    
    // 時間に基づく動的な色変化
    float timeEffect = sin(u_time * u_psychedelicSpeed) * 0.5 + 0.5;
    vec3 dynamicColor = mix(thermalColor, 1.0 - thermalColor, timeEffect * u_thermalIntensity);
    
    // チャンネルシフト
    vec3 shiftedColor = channelShift(dynamicColor, u_channelShift, u_time * u_psychedelicSpeed);
    
    // 高コントラスト効果
    vec3 contrastColor = highContrast(shiftedColor, u_contrastIntensity);
    
    // グロー効果
    vec3 finalColor = addGlow(contrastColor, u_glowIntensity);
    
    // 最終的な色を適切に制限（0.0-1.0の範囲に）
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    // 過度な明度を防ぐための追加制限
    float maxBrightness = 0.9; // 最大明度を90%に制限
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
