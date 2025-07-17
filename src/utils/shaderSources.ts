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
