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
  time: number;
  distortion: number;
  speed: number;
}

export const defaultBadTVUniforms: BadTVUniforms = {
  time: 0,
  distortion: 0.001,
  speed: 0.001,
};
