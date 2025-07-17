// モバイル用軽量シェーダー
// パフォーマンスを重視した簡易エフェクト

export const mobileVertexShader = `
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

export const mobileFragmentShader = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_time;
  uniform float u_brightness; // 明度調整 (0.0 - 2.0)
  uniform float u_contrast; // コントラスト調整 (0.0 - 2.0)
  uniform float u_saturation; // 彩度調整 (0.0 - 2.0)
  uniform float u_tint; // 色調調整 (0.0 - 1.0)
  
  varying vec2 v_texCoord;
  
  void main() {
    vec4 texColor = texture2D(u_texture, v_texCoord);
    
    // 明度調整
    vec3 color = texColor.rgb * u_brightness;
    
    // コントラスト調整
    color = (color - 0.5) * u_contrast + 0.5;
    
    // 彩度調整
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(gray), color, u_saturation);
    
    // 色調調整（簡単な色相シフト）
    float tintAmount = u_tint * 0.3;
    color.r += tintAmount;
    color.b += tintAmount;
    
    // 最終的な色を制限
    color = clamp(color, 0.0, 1.0);
    
    gl_FragColor = vec4(color, texColor.a);
  }
`;

// モバイル設定のインターフェース
export interface MobileConfig {
  brightness: number; // 明度調整 (0.0 - 2.0)
  contrast: number; // コントラスト調整 (0.0 - 2.0)
  saturation: number; // 彩度調整 (0.0 - 2.0)
  tint: number; // 色調調整 (0.0 - 1.0)
}
