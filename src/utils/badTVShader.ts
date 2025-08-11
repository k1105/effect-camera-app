// Bad TV Shader for WebGL
// Based on https://github.com/felixturner/bad-tv-shader

export const badTVVertexShader = `
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

export const badTVFragmentShader = `
  precision mediump float;
  
  uniform sampler2D u_texture;
  uniform float u_time;
  uniform float u_distortion;
  uniform float u_distortion2;
  uniform float u_speed;
  uniform float u_rollSpeed;
  uniform float u_chromaticAberration;
  uniform float u_interlaceIntensity;
  uniform float u_interlaceLineWidth;
  
  varying vec2 v_texCoord;
  
  // Ashima 2D Simplex Noise
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec3 permute(vec3 x) {
    return mod289(((x*34.0)+1.0)*x);
  }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
    
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  void main() {
    vec2 p = v_texCoord;
    float ty = u_time * u_speed;
    float yt = p.y - ty;
    
    // Smooth distortion
    float offset = snoise(vec2(yt * 3.0, 0.0)) * 0.2;
    // Boost distortion
    offset = offset * u_distortion * offset * u_distortion * offset;
    // Add fine grain distortion
    offset += snoise(vec2(yt * 50.0, 0.0)) * u_distortion2 * 0.001;
    
    // Combine distortion on X with roll on Y
    vec2 distortedUV = vec2(fract(p.x + offset), fract(p.y - u_time * u_rollSpeed));
    
    // Chromatic aberration (色収差)
    vec4 colorR = texture2D(u_texture, distortedUV + vec2(u_chromaticAberration * 0.01, 0.0));
    vec4 colorG = texture2D(u_texture, distortedUV);
    vec4 colorB = texture2D(u_texture, distortedUV - vec2(u_chromaticAberration * 0.01, 0.0));
    
    vec4 color = vec4(colorR.r, colorG.g, colorB.b, 1.0);
    
    // Interlace effect (インターレース)
    float interlace = mod(gl_FragCoord.y, u_interlaceLineWidth) < u_interlaceLineWidth * 0.5 ? 1.0 : u_interlaceIntensity;
    color.rgb *= interlace;
    
    gl_FragColor = color;
  }
`;

export interface BadTVUniforms {
  distortion: number;
  distortion2: number;
  speed: number;
  rollSpeed: number;
  chromaticAberration: number;
  interlaceIntensity: number;
  interlaceLineWidth: number;
}

export const defaultBadTVUniforms: BadTVUniforms = {
  distortion: 0.001,
  distortion2: 0.001,
  speed: 0.001,
  rollSpeed: 0.001,
  chromaticAberration: 0.001,
  interlaceIntensity: 1.0,
  interlaceLineWidth: 1.0,
};

// Bad TVシェーダーの適用を一元管理するユーティリティ
export interface BadTVShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  time: number;
  config: BadTVUniforms;
}

export const applyBadTVShader = (context: BadTVShaderContext): void => {
  const {gl, program, time, config} = context;

  // シェーダープログラムを使用
  gl.useProgram(program);

  // ユニフォーム変数を設定
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const distortionLocation = gl.getUniformLocation(program, "u_distortion");
  const distortion2Location = gl.getUniformLocation(program, "u_distortion2");
  const speedLocation = gl.getUniformLocation(program, "u_speed");
  const rollSpeedLocation = gl.getUniformLocation(program, "u_rollSpeed");
  const chromaticAberrationLocation = gl.getUniformLocation(
    program,
    "u_chromaticAberration"
  );
  const interlaceIntensityLocation = gl.getUniformLocation(
    program,
    "u_interlaceIntensity"
  );
  const interlaceLineWidthLocation = gl.getUniformLocation(
    program,
    "u_interlaceLineWidth"
  );

  if (timeLocation) gl.uniform1f(timeLocation, time);
  if (distortionLocation) gl.uniform1f(distortionLocation, config.distortion);
  if (distortion2Location)
    gl.uniform1f(distortion2Location, config.distortion2);
  if (speedLocation) gl.uniform1f(speedLocation, config.speed);
  if (rollSpeedLocation) gl.uniform1f(rollSpeedLocation, config.rollSpeed);
  if (chromaticAberrationLocation)
    gl.uniform1f(chromaticAberrationLocation, config.chromaticAberration);
  if (interlaceIntensityLocation)
    gl.uniform1f(interlaceIntensityLocation, config.interlaceIntensity);
  if (interlaceLineWidthLocation)
    gl.uniform1f(interlaceLineWidthLocation, config.interlaceLineWidth);

  // シェーダーの設定が完了
  // テクスチャの描画は呼び出し側で行う
};
