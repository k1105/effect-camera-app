import {useEffect, useMemo, useRef} from "react";
import {getBadTVConfigForEffect} from "../../utils/badTVConfig";
import {getPsychedelicConfigForEffect} from "../../utils/psychedelicConfig";
import {getMosaicConfigForEffect} from "../../utils/mosaicConfig";
import {applyBadTVShader} from "../../utils/badTVShader";
import {applyPsychedelicShader} from "../../utils/psychedelicShader";
import {applyMosaicShader} from "../../utils/mosaicShader";
import {drawQuad} from "../../utils/webglUtils";
import {initWebGL} from "../../utils/webGLInitializer";
import indexInformation from "../../../public/index_information.json";

/* ============================= Types & Config ============================= */

export interface CameraCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  current: number;
  ready: boolean;
  isNoSignalDetected?: boolean;
  onEffectChange?: (effect: number) => void;
  fitMode?: "contain" | "cover"; // 既定: contain（黒帯OK）
}

/** 効果タイプ */
type EffectKind = "badTV" | "psychedelic" | "mosaic" | "typography" | "normal";
interface EffectDefinition {
  type: EffectKind;
  badTVIntensity?: "subtle" | "moderate" | "heavy" | "extreme";
  psychedelicIntensity?: "subtle" | "moderate" | "intense" | "extreme";
}

// index_information.jsonからエフェクト定義を動的に取得する関数
const getEffectDefinition = (songId: number): EffectDefinition => {
  const songInfo = indexInformation.find((item) => item.index === songId);
  console.log(songInfo);
  console.log(songInfo?.effect);
  if (!songInfo || !songInfo.effect) {
    return {type: "normal"};
  }

  return songInfo.effect as EffectDefinition;
};

/* ============================= Math helpers ============================= */

const IDENTITY3 = [1, 0, 0, 0, 1, 0, 0, 0, 1] as const;

function makeScaleTranslate(sx: number, sy: number, tx = 0, ty = 0): number[] {
  return [sx, 0, tx, 0, sy, ty, 0, 0, 1];
}

function computeQuadTransform(
  canvasW: number,
  canvasH: number,
  videoW: number,
  videoH: number,
  fitMode: "contain" | "cover"
): number[] {
  if (!canvasW || !canvasH || !videoW || !videoH) return [...IDENTITY3];
  const canvasAR = canvasW / canvasH;
  const videoAR = videoW / videoH;
  let sx = 1.0,
    sy = 1.0;
  if (fitMode === "contain") {
    if (canvasAR > videoAR) {
      sx = videoAR / canvasAR;
      sy = 1.0;
    } else {
      sx = 1.0;
      sy = canvasAR / videoAR;
    }
  } else {
    if (canvasAR > videoAR) {
      sx = 1.0;
      sy = canvasAR / videoAR;
    } else {
      sx = videoAR / canvasAR;
      sy = 1.0;
    }
  }
  return makeScaleTranslate(sx, sy, 0, 0);
}

/* ============================= WebGL helpers ============================= */

function ensureVideoTexture(
  gl: WebGLRenderingContext,
  vid: HTMLVideoElement,
  existing: WebGLTexture | null,
  opts?: {minFilter?: number; magFilter?: number; flipY?: boolean}
): WebGLTexture {
  const minF = opts?.minFilter ?? gl.LINEAR;
  const magF = opts?.magFilter ?? gl.LINEAR;
  const flipY = opts?.flipY ?? false;
  let tex = existing;
  if (!tex) {
    tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (flipY) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minF);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magF);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
  } else {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (flipY) gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
  }
  return tex;
}

function setTextureFilter(
  gl: WebGLRenderingContext,
  tex: WebGLTexture,
  nearest: boolean
) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    nearest ? gl.NEAREST : gl.LINEAR
  );
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    nearest ? gl.NEAREST : gl.LINEAR
  );
}

function sizeCanvasToDisplay(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext
) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || canvas.offsetWidth || window.innerWidth;
  const cssH = canvas.clientHeight || canvas.offsetHeight || window.innerHeight;
  const w = Math.floor(cssW * dpr);
  const h = Math.floor(cssH * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
}

/* ============================= Typography (ASP) ============================= */

class Mover {
  pos = {x: 0, y: 0};
  vel = {x: 0, y: 0};
  target = {x: 0, y: 0};
  size = 48;
  sizeVel = 0;
  targetSize = 48;
  k = 0.1;
  damping = 0.8;
  constructor(x: number, y: number, size: number) {
    this.pos = {x, y};
    this.target = {x, y};
    this.size = size;
    this.targetSize = size;
  }
  setTarget(x: number, y: number, size: number) {
    this.target = {x, y};
    this.targetSize = size;
  }
  update() {
    // 位置のスプリング
    const fx = (this.target.x - this.pos.x) * this.k;
    const fy = (this.target.y - this.pos.y) * this.k;
    this.vel.x = (this.vel.x + fx) * this.damping;
    this.vel.y = (this.vel.y + fy) * this.damping;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    // サイズのスプリング
    const fs = (this.targetSize - this.size) * this.k;
    this.sizeVel = (this.sizeVel + fs) * this.damping;
    this.size += this.sizeVel;
  }
}

function getCssSize(el: HTMLCanvasElement) {
  const w = el.clientWidth || el.offsetWidth || window.innerWidth;
  const h = el.clientHeight || el.offsetHeight || window.innerHeight;
  return {w, h};
}

/* ============================= Component ============================= */

export const CameraCanvas: React.FC<CameraCanvasProps> = ({
  videoRef,
  current,
  ready,
  fitMode = "contain",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  // Programs
  const baseProgramRef = useRef<WebGLProgram | null>(null);
  const badTVProgramRef = useRef<WebGLProgram | null>(null);
  const psychedelicProgramRef = useRef<WebGLProgram | null>(null);
  const mosaicProgramRef = useRef<WebGLProgram | null>(null);

  // Video texture
  const videoTexRef = useRef<WebGLTexture | null>(null);
  const lastNearestRef = useRef<boolean>(false);

  // RAF & timers
  const rafRef = useRef<number>(0);
  const timersRef = useRef<number[]>([]);

  // Mosaic state
  const mosaicEffectStartRef = useRef<number>(-1);
  const mosaicAngleRef = useRef<number>(0);

  // Typography overlay: offscreen canvas + texture + movers
  const typoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const typoCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const typoTexRef = useRef<WebGLTexture | null>(null);
  const moversRef = useRef<Mover[] | null>(null);
  const letters = ["A", "S", "P"];
  const typoInitedRef = useRef<boolean>(false);

  // Effect def
  const effectDef = useMemo<EffectDefinition>(() => {
    return getEffectDefinition(current);
  }, [current]);

  // WebGL init
  const initializeWebGL = () => {
    const canvas = canvasRef.current!;
    const result = initWebGL(canvas);
    if (!result.gl || !result.programs.program) {
      console.error("WebGL initialization failed");
      return false;
    }
    glRef.current = result.gl;
    baseProgramRef.current = result.programs.program;
    badTVProgramRef.current = result.programs.badTVProgram;
    psychedelicProgramRef.current = result.programs.psychedelicProgram;
    mosaicProgramRef.current = result.programs.mosaicProgram;
    return true;
  };

  // Typography init (called when entering typography effect or on resize)
  const ensureTypographyResources = () => {
    const canvas = canvasRef.current!;
    const {w: cssW, h: cssH} = getCssSize(canvas);
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // Offscreen canvas
    if (!typoCanvasRef.current) {
      typoCanvasRef.current = document.createElement("canvas");
    }
    const tcv = typoCanvasRef.current!;
    tcv.width = Math.max(1, Math.floor(cssW * dpr));
    tcv.height = Math.max(1, Math.floor(cssH * dpr));
    const ctx = (typoCtxRef.current = tcv.getContext("2d", {
      alpha: true,
    }) as CanvasRenderingContext2D);
    if (!ctx) return;

    // 1 CSS px = dpr 画素に
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Movers 初期化（画面中央付近）
    if (!moversRef.current || !typoInitedRef.current) {
      const cx = cssW * 0.5;
      const cy = cssH * 0.5;
      const spread = Math.min(cssW, cssH) * 0.18;
      moversRef.current = [
        new Mover(cx - spread, cy, 72),
        new Mover(cx, cy - spread * 0.2, 72),
        new Mover(cx + spread, cy, 72),
      ];
      typoInitedRef.current = true;
    }

    // WebGL テクスチャ
    const gl = glRef.current!;
    if (!typoTexRef.current) {
      typoTexRef.current = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, typoTexRef.current);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tcv);
    }
  };

  const drawTypographyToCanvas = () => {
    const ctx = typoCtxRef.current!;
    const canvas = canvasRef.current!;
    const {w: cssW, h: cssH} = getCssSize(canvas);
    if (!moversRef.current) return;

    // クリア（透明）
    ctx.clearRect(0, 0, cssW, cssH);

    // アップデート
    for (const m of moversRef.current) m.update();

    // ❷ 線（A→S→P）
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(moversRef.current[0].pos.x, moversRef.current[0].pos.y);
    ctx.lineTo(moversRef.current[1].pos.x, moversRef.current[1].pos.y);
    ctx.lineTo(moversRef.current[2].pos.x, moversRef.current[2].pos.y);
    ctx.stroke();

    // ❸ 文字
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < moversRef.current.length; i++) {
      const m = moversRef.current[i];
      ctx.font = `${Math.max(
        8,
        m.size
      )}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.fillText(letters[i], m.pos.x, m.pos.y);
    }
  };

  const uploadTypographyTexture = () => {
    const gl = glRef.current!;
    const tcv = typoCanvasRef.current!;
    const tex = typoTexRef.current!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0); // 2Dはそのまま
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tcv);
  };

  const randomizeTypographyTargets = () => {
    const canvas = canvasRef.current!;
    const {w: cssW, h: cssH} = getCssSize(canvas);
    if (!moversRef.current) return;
    for (const m of moversRef.current) {
      const x = Math.random() * cssW * 0.6 + cssW * 0.2;
      const y = Math.random() * cssH * 0.6 + cssH * 0.2;
      const size = 48 + Math.random() * 48;
      m.setTarget(x, y, size);
    }
  };

  /* --------------------------- Effects lifecycle --------------------------- */

  useEffect(() => {
    if (!ready) return;

    if (!glRef.current) {
      if (!initializeWebGL()) return;
    }
    const gl = glRef.current!;
    const canvas = canvasRef.current!;
    sizeCanvasToDisplay(canvas, gl);

    const onResize = () => {
      if (!glRef.current || !canvasRef.current) return;
      sizeCanvasToDisplay(canvasRef.current, glRef.current);
      if (effectDef.type === "typography") {
        // サイズ変更に追随
        ensureTypographyResources();
      }
    };
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, [ready]);

  // Typography へ切り替えた瞬間に初期化
  useEffect(() => {
    if (!ready || !glRef.current) return;
    if (effectDef.type === "typography") {
      ensureTypographyResources();
    }
  }, [ready, effectDef.type]);

  /* ------------------------------- Draw loop -------------------------------- */

  useEffect(() => {
    if (!ready || !glRef.current) return;

    const gl = glRef.current!;
    const canvas = canvasRef.current!;

    const draw = (t: number) => {
      try {
        const vid = videoRef.current!;
        if (!vid || !vid.videoWidth || !vid.videoHeight) {
          rafRef.current = requestAnimationFrame(draw);
          return;
        }

        // DPR/リサイズ
        sizeCanvasToDisplay(canvas, gl);

        // 背景クリア（containの黒帯）
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 動画テクスチャ更新
        videoTexRef.current = ensureVideoTexture(gl, vid, videoTexRef.current, {
          flipY: false,
        });

        // フィット行列

        // ※ 上のイレギュラーは保険。実際は下の fitMode を使う:
        const transform2 = computeQuadTransform(
          canvas.width,
          canvas.height,
          vid.videoWidth,
          vid.videoHeight,
          typeof fitMode === "string" ? fitMode : "contain"
        );
        const ndcScaleX = transform2[0];
        const ndcScaleY = transform2[4];

        let programToUse: WebGLProgram | null = baseProgramRef.current;

        // --- エフェクト適用（1フレーム1パス）
        if (effectDef.type === "badTV" && badTVProgramRef.current) {
          applyBadTVShader({
            gl,
            program: badTVProgramRef.current,
            time: (t % 10000) * 0.001,
            config: getBadTVConfigForEffect(current),
          });
          programToUse = badTVProgramRef.current;
          if (videoTexRef.current && lastNearestRef.current) {
            setTextureFilter(gl, videoTexRef.current, false);
            lastNearestRef.current = false;
          }
        } else if (
          effectDef.type === "psychedelic" &&
          psychedelicProgramRef.current
        ) {
          applyPsychedelicShader({
            gl,
            program: psychedelicProgramRef.current,
            time: (t % 10000) * 0.001,
            config: getPsychedelicConfigForEffect(current),
          });
          programToUse = psychedelicProgramRef.current;
          if (videoTexRef.current && lastNearestRef.current) {
            setTextureFilter(gl, videoTexRef.current, false);
            lastNearestRef.current = false;
          }
        } else if (effectDef.type === "mosaic" && mosaicProgramRef.current) {
          const nowSec = t * 0.001;
          const cfg = getMosaicConfigForEffect(current);
          const active =
            mosaicEffectStartRef.current >= 0 &&
            nowSec - mosaicEffectStartRef.current < cfg.effectDuration;

          if (videoTexRef.current) {
            if (active && !lastNearestRef.current) {
              setTextureFilter(gl, videoTexRef.current, true);
              lastNearestRef.current = true;
            } else if (!active && lastNearestRef.current) {
              setTextureFilter(gl, videoTexRef.current, false);
              lastNearestRef.current = false;
            }
          }

          applyMosaicShader({
            gl,
            program: mosaicProgramRef.current,
            time: nowSec,
            effectStart: mosaicEffectStartRef.current,
            shakeAngle: mosaicAngleRef.current,
            viewWidth: canvas.width,
            viewHeight: canvas.height,
            texWidth: vid.videoWidth,
            texHeight: vid.videoHeight,
            ndcScaleX,
            ndcScaleY,
            config: cfg,
          });
          programToUse = mosaicProgramRef.current;
        } else {
          // base / typography ではカメラは素描画
          if (videoTexRef.current && lastNearestRef.current) {
            setTextureFilter(gl, videoTexRef.current, false);
            lastNearestRef.current = false;
          }
        }

        // 1) カメラを描画
        drawQuad(gl, programToUse!, transform2, videoTexRef.current!);

        // 2) Typography オーバーレイ（常時：エフェクト=typography の間）
        if (effectDef.type === "typography") {
          ensureTypographyResources();
          drawTypographyToCanvas();
          uploadTypographyTexture();

          // アルファ合成でオーバーレイ
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          // 画面全体にそのまま貼るので transform=IDENTITY3
          drawQuad(
            gl,
            baseProgramRef.current!,
            IDENTITY3 as unknown as number[],
            typoTexRef.current!
          );
          gl.disable(gl.BLEND);
        }

        rafRef.current = requestAnimationFrame(draw);
      } catch {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, videoRef, effectDef, current, fitMode]);

  /* ------------------------------ Input ------------------------------ */

  const handlePointerDown = () => {
    if (effectDef.type === "typography") {
      // 文字のターゲットだけ更新（常時表示）
      randomizeTypographyTargets();
      return;
    }

    // それ以外は従来のワンショット系
    const cfg = getMosaicConfigForEffect(current);
    mosaicEffectStartRef.current = performance.now() / 1000;
    mosaicAngleRef.current = Math.random() * Math.PI * 2;

    // ちょい長めにON（mosaicのエンベロープに同期）
    const ms = Math.max(50, Math.floor(cfg.effectDuration * 1000 + 30));
    const id = window.setTimeout(() => {
      // no-op：mosaicは effectStart で制御、isEffectOn は実質使ってないが将来用に残す
    }, ms);
    timersRef.current.push(id);
  };

  /* --------------------------- Cleanup --------------------------- */

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
      if (glRef.current && videoTexRef.current)
        glRef.current.deleteTexture(videoTexRef.current);
      if (glRef.current && typoTexRef.current)
        glRef.current.deleteTexture(typoTexRef.current);
      videoTexRef.current = null;
      typoTexRef.current = null;
    };
  }, []);

  /* ----------------------------- Render ----------------------------- */

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{width: "100%", height: "100%", display: "block"}}
        onPointerDown={handlePointerDown}
      />
    </div>
  );
};
