// WebGLシェーダーソース

// 基本頂点シェーダー
export const vertexShaderSource = `
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

// 基本フラグメントシェーダー
export const fragmentShaderSource = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_alpha;
  
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    gl_FragColor = vec4(color.rgb, color.a * u_alpha);
  }
`;

// ブレンドモード用フラグメントシェーダー
export const blendFragmentShaderSource = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform sampler2D u_background;
  uniform float u_alpha;
  uniform int u_blendMode;
  
  varying vec2 v_texCoord;
  
  vec3 blend(vec3 base, vec3 blend, int mode) {
    if (mode == 0) return blend; // source-over
    if (mode == 1) return base * blend; // multiply
    if (mode == 2) return 1.0 - (1.0 - base) * (1.0 - blend); // screen
    if (mode == 3) { // overlay
      return vec3(
        base.r < 0.5 ? 2.0 * base.r * blend.r : 1.0 - 2.0 * (1.0 - base.r) * (1.0 - blend.r),
        base.g < 0.5 ? 2.0 * base.g * blend.g : 1.0 - 2.0 * (1.0 - base.g) * (1.0 - blend.g),
        base.b < 0.5 ? 2.0 * base.b * blend.b : 1.0 - 2.0 * (1.0 - base.b) * (1.0 - blend.b)
      );
    }
    if (mode == 4) { // soft-light
      return vec3(
        blend.r < 0.5 ? 2.0 * base.r * blend.r + base.r * base.r * (1.0 - 2.0 * blend.r) : sqrt(base.r) * (2.0 * blend.r - 1.0) + 2.0 * base.r * (1.0 - blend.r),
        blend.g < 0.5 ? 2.0 * base.g * blend.g + base.g * base.g * (1.0 - 2.0 * blend.g) : sqrt(base.g) * (2.0 * blend.g - 1.0) + 2.0 * base.g * (1.0 - blend.g),
        blend.b < 0.5 ? 2.0 * base.b * blend.b + base.b * base.b * (1.0 - 2.0 * blend.b) : sqrt(base.b) * (2.0 * blend.b - 1.0) + 2.0 * base.b * (1.0 - blend.b)
      );
    }
    if (mode == 5) { // hard-light
      return vec3(
        blend.r < 0.5 ? 2.0 * base.r * blend.r : 1.0 - 2.0 * (1.0 - base.r) * (1.0 - blend.r),
        blend.g < 0.5 ? 2.0 * base.g * blend.g : 1.0 - 2.0 * (1.0 - base.g) * (1.0 - blend.g),
        blend.b < 0.5 ? 2.0 * base.b * blend.b : 1.0 - 2.0 * (1.0 - base.b) * (1.0 - blend.b)
      );
    }
    return blend;
  }
  
  void main() {
    vec4 textureColor = texture2D(u_texture, v_texCoord);
    vec4 bgColor = texture2D(u_background, v_texCoord);
    
    vec3 blended = blend(bgColor.rgb, textureColor.rgb, u_blendMode);
    gl_FragColor = vec4(blended, textureColor.a * u_alpha);
  }
`;

// Static Shader (based on https://github.com/felixturner/bad-tv-shader)
export const staticVertexShader = `
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

export const staticFragmentShader = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_time;
  uniform float u_staticIntensity;
  uniform float u_staticSize;
  
  varying vec2 v_texCoord;
  
  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  void main() {
    vec2 p = v_texCoord;
    vec4 color = texture2D(u_texture, p);
    
    // カメラ映像の色を保持
    vec3 finalColor = color.rgb;
    
    // スタティック効果が無効な場合は、カメラ映像をそのまま表示
    if (u_staticIntensity <= 0.0) {
      gl_FragColor = color;
      return;
    }
    
    // Calculate noise based on screen coordinates and size
    float xs = floor(gl_FragCoord.x / u_staticSize);
    float ys = floor(gl_FragCoord.y / u_staticSize);
    float noise = rand(vec2(xs * u_time, ys * u_time));
    
    // ノイズの強度を制御（0.0-1.0の範囲）
    float noiseIntensity = noise * u_staticIntensity;
    
    // 安全なノイズオーバーレイ：カメラ映像を保持しながらノイズを追加
    if (noiseIntensity > 0.05) {
      // ノイズの色（白っぽい、強度を制限）
      vec3 noiseColor = vec3(noiseIntensity * 0.6);
      
      // カメラ映像とノイズを適切にブレンド
      // ノイズが強すぎないように制限（最大30%まで）
      float blendFactor = min(noiseIntensity * 0.3, 0.3);
      finalColor = mix(color.rgb, noiseColor, blendFactor);
    }
    
    // 最終的な色を適切に制限（カメラ映像が暗くなりすぎないように）
    finalColor = clamp(finalColor, 0.0, 1.0);
    
    gl_FragColor = vec4(finalColor, color.a);
  }
`;
