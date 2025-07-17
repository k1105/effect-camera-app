// サイケデリックシェーダー
// 色反転と色相シフトによるサイケデリック効果

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
  uniform float u_inversionIntensity; // 色反転の強度 (0.0 - 1.0)
  uniform float u_hueShift; // 色相シフトの強度 (0.0 - 1.0)
  uniform float u_psychedelicSpeed; // サイケデリック効果の速度 (0.0 - 1.0)
  uniform float u_channelShift; // チャンネルシフトの強度 (0.0 - 1.0)
  uniform float u_waveIntensity; // 波効果の強度 (0.0 - 1.0)
  
  varying vec2 v_texCoord;
  
  // RGB to HSV変換
  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }
  
  // HSV to RGB変換
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }
  
  // 波効果の計算
  float wave(vec2 uv, float time) {
    return sin(uv.x * 10.0 + time) * sin(uv.y * 10.0 + time * 0.5) * 0.5 + 0.5;
  }
  
  void main() {
    vec2 uv = v_texCoord;
    vec4 texColor = texture2D(u_texture, uv);
    
    // 波効果によるUV歪み
    float waveEffect = wave(uv, u_time * u_psychedelicSpeed);
    vec2 distortedUV = uv + vec2(waveEffect * u_waveIntensity * 0.1);
    texColor = texture2D(u_texture, distortedUV);
    
    // RGB to HSV変換
    vec3 hsv = rgb2hsv(texColor.rgb);
    
    // 色相シフト（時間と位置に基づく）
    float hueShift = u_hueShift * sin(u_time * u_psychedelicSpeed) * 0.5 + 0.5;
    hsv.x = mod(hsv.x + hueShift + waveEffect * 0.3, 1.0);
    
    // HSV to RGB変換
    vec3 shiftedColor = hsv2rgb(hsv);
    
    // チャンネルシフト（RGB各チャンネルを個別にシフト）
    vec3 channelShifted = vec3(
      shiftedColor.r + sin(u_time * u_psychedelicSpeed * 2.0) * u_channelShift * 0.3,
      shiftedColor.g + sin(u_time * u_psychedelicSpeed * 1.5) * u_channelShift * 0.3,
      shiftedColor.b + sin(u_time * u_psychedelicSpeed * 3.0) * u_channelShift * 0.3
    );
    
    // 色反転
    vec3 invertedColor = 1.0 - channelShifted;
    
    // 反転とオリジナルのブレンド
    vec3 finalColor = mix(channelShifted, invertedColor, u_inversionIntensity);
    
    // 明度の調整（サイケデリック効果で明るく）
    finalColor = finalColor * (1.0 + waveEffect * u_waveIntensity * 0.5);
    
    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

// サイケデリック設定のインターフェース
export interface PsychedelicConfig {
  inversionIntensity: number; // 色反転の強度 (0.0 - 1.0)
  hueShift: number; // 色相シフトの強度 (0.0 - 1.0)
  psychedelicSpeed: number; // サイケデリック効果の速度 (0.0 - 1.0)
  channelShift: number; // チャンネルシフトの強度 (0.0 - 1.0)
  waveIntensity: number; // 波効果の強度 (0.0 - 1.0)
}
