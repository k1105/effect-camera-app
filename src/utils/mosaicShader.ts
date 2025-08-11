// utils/mosaicShader.ts
// p5js の挙動に揃えた WebGL モザイク（px基準, クリック時スプリング）

export const mosaicVertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform mat3 u_transform;    // 画面フィット用（contain/cover）の行列
  varying vec2 v_texCoord;

  void main() {
    vec2 pos = (u_transform * vec3(a_position, 1.0)).xy;
    gl_Position = vec4(pos, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

// --- 重要ポイント ---
// ・pixelSize は「画面ピクセル基準」で決める
// ・pad(=basePad+extra) で UV を中心からスケール（=拡大）
// ・dx,dy は screen px → UV に変換してから適用
// ・contain/cover の拡縮(u_transform)を考慮するため、NDCスケール(sx,sy)も渡す
export const mosaicFragmentShader = `
  precision mediump float;

  uniform sampler2D u_texture;

  // 時間・イベント
  uniform float u_time;              // 秒
  uniform float u_effectStart;       // 発火秒。<0 なら非アクティブ
  uniform float u_effectDuration;    // 例: 0.20

  // p5同値パラメータ（すべて px or 物理値）
  uniform float u_minPixel;          // 4
  uniform float u_maxPixel;          // 80
  uniform float u_basePad;           // 60
  uniform float u_zoomExtraMax;      // 24
  uniform float u_springFreq;        // 13 Hz
  uniform float u_springDamp;        // 10
  uniform float u_shakeMax;          // 36 px
  uniform float u_shakeAngle;        // 0..2π

  // キャンバス/動画 実寸
  uniform vec2  u_viewSize;          // [canvasW, canvasH] (px)
  uniform vec2  u_texSize;           // [videoW,  videoH]  (px)

  // 頂点側のフィット拡縮（u_transform のスケール成分）
  // NDCフルスクリーン(2)に対して、表示領域のスケールが sx, sy
  uniform vec2  u_ndcScale;          // [sx, sy] 例: contain で横に黒帯なら sx<1, sy=1

  varying vec2 v_texCoord;

  float spring(float t) {
    return exp(-u_springDamp * t) * cos(6.28318530718 * u_springFreq * t);
  }
  float lerpf(float a, float b, float t){ return a + (b - a) * t; }

  void main(){
    vec2 uv = v_texCoord;

    // アイドルまたは終了後は素の絵
    bool inactive = (u_effectStart < 0.0);
    float elapsed = u_time - u_effectStart;
    if (inactive || elapsed >= u_effectDuration) {
      gl_FragColor = texture2D(u_texture, uv);
      return;
    }

    // --- スプリング（減衰振動） ---
    float s = spring(elapsed);                // -1..+1 を振動し 0 へ
    float env = clamp(abs(s), 0.0, 1.0);

    // --- ピクセルサイズ（画面px基準） ---
    float pixelSizePx = max(1.0, floor(lerpf(u_minPixel, u_maxPixel, env)));

    // --- pad（拡大） ---
    float extraPad = u_zoomExtraMax * env;
    float totalPad = u_basePad + extraPad;
    // UVの中心拡大： scale = view / (view + 2*pad)
    vec2 scale = u_viewSize / (u_viewSize + 2.0 * totalPad);
    vec2 uvZoomed = (uv - 0.5) / scale + 0.5;

    // --- シェイク（px→UV）。“拡大後に” 1px動かすUV量 = scale/(sx*view)
    vec2 uvPerPixel = scale / (u_ndcScale * u_viewSize);   // [UV / screenPx]
    float ampPx = u_shakeMax * s;
    vec2 dxyPx = vec2(cos(u_shakeAngle), sin(u_shakeAngle)) * ampPx;
    vec2 dxyUV = dxyPx * uvPerPixel;

    // --- 画面px基準の量子化（拡大とフィットを考慮） ---
    // content の 1UV あたりの screen px は (u_ndcScale * u_viewSize) / scale
    // ⇒ UV の量子化ステップ = pixelSizePx * uvPerPixel
    vec2 stepUV = pixelSizePx * uvPerPixel;
    // 0除算ガード
    stepUV = max(stepUV, vec2(1.0/65536.0));

    vec2 pixelatedUV = floor(uvZoomed / stepUV) * stepUV;

    // シェイク適用
    vec2 finalUV = pixelatedUV + dxyUV;

    // サンプリング（端はクランプ）
    finalUV = clamp(finalUV, vec2(0.0), vec2(1.0));
    gl_FragColor = texture2D(u_texture, finalUV);
  }
`;

export interface MosaicConfig {
  // p5準拠パラメータ
  minPixel: number; // 4
  maxPixel: number; // 80
  basePad: number; // 60
  effectDuration: number; // 0.20
  springFreq: number; // 13
  springDamp: number; // 10
  shakeMax: number; // 36
  zoomExtraMax: number; // 24
}

export const defaultMosaicConfig: MosaicConfig = {
  minPixel: 4,
  maxPixel: 80,
  basePad: 60,
  effectDuration: 0.2,
  springFreq: 13,
  springDamp: 10,
  shakeMax: 36,
  zoomExtraMax: 24,
};

// 呼び出し側から “いまの描画状態” をすべて流し込む
export interface MosaicShaderContext {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  time: number; // 秒
  effectStart: number; // 秒（未発火なら -1）
  shakeAngle: number; // 0..2π
  viewWidth: number; // canvas.width
  viewHeight: number; // canvas.height
  texWidth: number; // video.videoWidth
  texHeight: number; // video.videoHeight
  ndcScaleX: number; // computeQuadTransform の sx
  ndcScaleY: number; // computeQuadTransform の sy
  config: MosaicConfig;
}

export const applyMosaicShader = (ctx: MosaicShaderContext): void => {
  const {
    gl,
    program,
    time,
    effectStart,
    shakeAngle,
    viewWidth,
    viewHeight,
    texWidth,
    texHeight,
    ndcScaleX,
    ndcScaleY,
    config,
  } = ctx;

  gl.useProgram(program);

  const u = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1f(u("u_time"), time);
  gl.uniform1f(u("u_effectStart"), effectStart);
  gl.uniform1f(u("u_effectDuration"), config.effectDuration);

  gl.uniform1f(u("u_minPixel"), config.minPixel);
  gl.uniform1f(u("u_maxPixel"), config.maxPixel);
  gl.uniform1f(u("u_basePad"), config.basePad);
  gl.uniform1f(u("u_zoomExtraMax"), config.zoomExtraMax);
  gl.uniform1f(u("u_springFreq"), config.springFreq);
  gl.uniform1f(u("u_springDamp"), config.springDamp);
  gl.uniform1f(u("u_shakeMax"), config.shakeMax);
  gl.uniform1f(u("u_shakeAngle"), shakeAngle);

  gl.uniform2f(u("u_viewSize"), viewWidth, viewHeight);
  gl.uniform2f(u("u_texSize"), texWidth, texHeight);
  gl.uniform2f(u("u_ndcScale"), ndcScaleX, ndcScaleY);
};
