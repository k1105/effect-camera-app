import {useEffect, useMemo, useRef, useState} from "react";
import {getBadTVConfigForEffect} from "../../utils/badTVConfig";
import {getPsychedelicConfigForEffect} from "../../utils/psychedelicConfig";
import {getMosaicConfigForEffect} from "../../utils/mosaicConfig";
import {applyBadTVShader} from "../../utils/badTVShader";
import {applyPsychedelicShader} from "../../utils/psychedelicShader";
import {applyMosaicShader} from "../../utils/mosaicShader";
import {drawQuad} from "../../utils/webglUtils";
import {initWebGL} from "../../utils/webGLInitializer";

export interface CameraCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  current: number;
  ready: boolean;
  isNoSignalDetected?: boolean;
  onEffectChange?: (effect: number) => void;
  numEffects?: number;
  /** 追加: アスペクトの合わせ方。既定は 'contain'（黒帯OK、引き伸ばしなし） */
  fitMode?: "contain" | "cover";
}

/** 効果タイプ */
type EffectKind = "badTV" | "psychedelic" | "mosaic" | "normal";
interface EffectDefinition {
  type: EffectKind;
  badTVIntensity?: "subtle" | "moderate" | "heavy" | "extreme";
  psychedelicIntensity?: "subtle" | "moderate" | "intense" | "extreme";
  description?: string;
}

/** 固定のエフェクト定義（必要最小限） */
const EFFECT_DEFINITIONS: Record<number, EffectDefinition> = {
  0: {type: "normal", description: "エフェクトなし - 通常表示"},
  1: {type: "badTV", badTVIntensity: "moderate", description: "Bad TV - 中"},
  2: {type: "badTV", badTVIntensity: "heavy", description: "Bad TV - 強"},
  3: {
    type: "psychedelic",
    psychedelicIntensity: "moderate",
    description: "Psychedelic - 中",
  },
  4: {
    type: "psychedelic",
    psychedelicIntensity: "intense",
    description: "Psychedelic - 強",
  },
  5: {type: "mosaic", description: "Mosaic - 中"},
  6: {type: "mosaic", description: "Mosaic - 強"},
  // 7以降は必要に応じて追加
};

/** 3x3 行列（drawQuad 側の解釈と一致していればOK） */
const IDENTITY3 = [1, 0, 0, 0, 1, 0, 0, 0, 1] as const;

/** 2D アフィン（行列）ヘルパ：スケール＆平行移動のみ */
function makeScaleTranslate(sx: number, sy: number, tx = 0, ty = 0): number[] {
  // | sx  0  tx |
  // |  0 sy  ty |
  // |  0  0   1 |
  return [sx, 0, tx, 0, sy, ty, 0, 0, 1];
}

/** fitMode: contain=黒帯 / cover=トリミング（NDCフルスクリーンのスケール） */
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
  let sx = 1.0;
  let sy = 1.0;

  if (fitMode === "contain") {
    if (canvasAR > videoAR) {
      sx = videoAR / canvasAR;
      sy = 1.0;
    } else {
      sx = 1.0;
      sy = canvasAR / videoAR;
    }
  } else {
    // cover
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

/** 動画テクスチャ（1枚）を作成・更新 */
function ensureVideoTexture(
  gl: WebGLRenderingContext,
  vid: HTMLVideoElement,
  existing: WebGLTexture | null,
  opts?: {minFilter?: number; magFilter?: number; flipY?: boolean}
): WebGLTexture {
  const minF = opts?.minFilter ?? gl.LINEAR;
  const magF = opts?.magFilter ?? gl.LINEAR;
  const flipY = opts?.flipY ?? false; // 上下反転はここではしない

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

/** MIN/MAG のフィルタを切替（NEAREST/LINEAR） */
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

/** DPRに合わせてキャンバスの実ピクセルを設定 */
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

export const CameraCanvas: React.FC<CameraCanvasProps> = ({
  videoRef,
  current,
  ready,
  fitMode = "contain",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  // プログラム（必要最小限）
  const baseProgramRef = useRef<WebGLProgram | null>(null);
  const badTVProgramRef = useRef<WebGLProgram | null>(null);
  const psychedelicProgramRef = useRef<WebGLProgram | null>(null);
  const mosaicProgramRef = useRef<WebGLProgram | null>(null);

  // テクスチャ再利用
  const videoTexRef = useRef<WebGLTexture | null>(null);
  const lastNearestRef = useRef<boolean>(false); // 直前のフィルタ状態（mosaic用）

  // タップ時のワンショット
  const [isEffectOn, setIsEffectOn] = useState(false);
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);

  // mosaic 用（発火タイム＆角度）
  const mosaicEffectStartRef = useRef<number>(-1);
  const mosaicAngleRef = useRef<number>(0);

  // currentのエフェクト
  const effectDef = useMemo<EffectDefinition>(() => {
    return EFFECT_DEFINITIONS[current] || EFFECT_DEFINITIONS[0];
  }, [current]);

  // WebGL初期化
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
    mosaicProgramRef.current = result.programs.mosaicProgram; // ← 必須
    return true;
  };

  // mount/ready時
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
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ready]);

  // 描画ループ（1フレーム=1パス）
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

        // DPR / リサイズ追従
        sizeCanvasToDisplay(canvas, gl);

        // 背景クリア（contain時の黒帯）
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 動画テクスチャを更新
        videoTexRef.current = ensureVideoTexture(gl, vid, videoTexRef.current, {
          flipY: false,
        });

        // フィット行列（drawQuad に渡す）
        const transform = computeQuadTransform(
          canvas.width,
          canvas.height,
          vid.videoWidth,
          vid.videoHeight,
          fitMode
        );
        const ndcScaleX = transform[0]; // makeScaleTranslate の定義と対応
        const ndcScaleY = transform[4];

        // 使うプログラムを決める（1回だけ描画）
        let programToUse: WebGLProgram | null = baseProgramRef.current;

        if (isEffectOn) {
          if (effectDef.type === "badTV" && badTVProgramRef.current) {
            applyBadTVShader({
              gl,
              program: badTVProgramRef.current,
              time: (t % 10000) * 0.001,
              config: getBadTVConfigForEffect(current),
            });
            programToUse = badTVProgramRef.current;
            // 非mosaic時はフィルタをLINEARに戻す（必要なら）
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

            // 発火中かどうか
            const active =
              mosaicEffectStartRef.current >= 0 &&
              nowSec - mosaicEffectStartRef.current < cfg.effectDuration;

            // 発火中はNEAREST、終わればLINEAR（無駄切替を避ける）
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
          }
        } else {
          // エフェクトOFF時はフィルタを標準（LINEAR）に戻す
          if (videoTexRef.current && lastNearestRef.current) {
            setTextureFilter(gl, videoTexRef.current, false);
            lastNearestRef.current = false;
          }
        }

        // 1描画
        drawQuad(gl, programToUse!, transform, videoTexRef.current!);

        rafRef.current = requestAnimationFrame(draw);
      } catch (e) {
        // 落ちないように継続
        console.error(e);
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, videoRef, isEffectOn, effectDef, current, fitMode]);

  // タップ（pointer）: ワンショット発火
  const handlePointerDown = () => {
    setIsEffectOn(true);

    // mosaic の発火情報（他エフェクトの場合は無視される）
    mosaicEffectStartRef.current = performance.now() / 1000;
    mosaicAngleRef.current = Math.random() * Math.PI * 2;

    // タイムアウトでOFF（mosaicはConfigの継続時間に同期）
    const cfg = getMosaicConfigForEffect(current);
    const ms = Math.max(50, Math.floor(cfg.effectDuration * 1000 + 30));
    const id1 = window.setTimeout(() => setIsEffectOn(false), ms);
    timersRef.current.push(id1);
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
      if (glRef.current && videoTexRef.current) {
        glRef.current.deleteTexture(videoTexRef.current);
        videoTexRef.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%", // 親が高さを持つ前提（例: 100vh）
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
