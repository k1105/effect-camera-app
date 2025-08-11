import {useEffect, useMemo, useRef, useState} from "react";
import {getBadTVConfigForEffect} from "../../utils/badTVConfig";
import {getPsychedelicConfigForEffect} from "../../utils/psychedelicConfig";
import {applyBadTVShader} from "../../utils/badTVShader";
import {applyPsychedelicShader} from "../../utils/psychedelicShader";
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

/** 0..1で効果定義 */
type EffectKind = "badTV" | "psychedelic" | "normal";
interface EffectDefinition {
  type: EffectKind;
  badTVIntensity?: "subtle" | "moderate" | "heavy" | "extreme";
  psychedelicIntensity?: "subtle" | "moderate" | "intense" | "extreme";
  description?: string;
}

/** 固定のエフェクト定義（再生成を避けるためモジュールスコープに） */
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
  // 5,6,7 は一旦使用しない（mosaic後日）
};

/** 3x3 行列（列優先でも行優先でも、drawQuad側と一致していればOK） */
const IDENTITY3 = [1, 0, 0, 0, 1, 0, 0, 0, 1] as const;

/** 2D アフィン（行列）ヘルパ：スケール＆平行移動のみ */
function makeScaleTranslate(sx: number, sy: number, tx = 0, ty = 0): number[] {
  // | sx  0  tx |
  // |  0 sy  ty |
  // |  0  0   1 |
  return [sx, 0, tx, 0, sy, ty, 0, 0, 1];
}

/** fitMode に応じて、-1..+1 のフルスクリーンクワッドをスケール（contain=黒帯、cover=トリミング） */
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

  // 基本は NDC のフルスクリーン（-1..+1）。ここにスケールを掛ける。
  // contain: 短辺側に合わせる→スケール < 1 で黒帯
  // cover:  長辺側に合わせる→スケール > 1 でトリミング
  let sx = 1.0;
  let sy = 1.0;

  if (fitMode === "contain") {
    if (canvasAR > videoAR) {
      // キャンバスの方が横長→横を縮める
      sx = videoAR / canvasAR;
      sy = 1.0;
    } else {
      // キャンバスの方が縦長→縦を縮める
      sx = 1.0;
      sy = canvasAR / videoAR;
    }
  } else {
    // cover
    if (canvasAR > videoAR) {
      // キャンバスの方が横長→縦を拡大して横を満たす
      sx = 1.0;
      sy = canvasAR / videoAR;
    } else {
      // キャンバスの方が縦長→横を拡大して縦を満たす
      sx = videoAR / canvasAR;
      sy = 1.0;
    }
  }

  // 中心基準のスケール。平行移動は不要（0,0）
  return makeScaleTranslate(sx, sy, 0, 0);
}

function ensureVideoTexture(
  gl: WebGLRenderingContext,
  vid: HTMLVideoElement,
  existing: WebGLTexture | null,
  opts?: {minFilter?: number; magFilter?: number; flipY?: boolean}
): WebGLTexture {
  const minF = opts?.minFilter ?? gl.LINEAR;
  const magF = opts?.magFilter ?? gl.LINEAR;
  const flipY = opts?.flipY ?? false; // ← 反転しない（上下そのまま）

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

  // テクスチャ1枚だけ再利用
  const videoTexRef = useRef<WebGLTexture | null>(null);

  // タップ時のワンショットエフェクトON/OFFのみ
  const [isEffectOn, setIsEffectOn] = useState(false);
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);

  // currentのエフェクトをメモ化
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
    return true;
  };

  // mount/ready時に初期化 & DPRリサイズ対応
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

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [ready]);

  // 描画ループ：1フレーム=1回描画（パスは1つだけ）
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

        // DPR変化・CSSリサイズ監視
        sizeCanvasToDisplay(canvas, gl);

        // 背景クリア（contain 時の黒帯に使われる）
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // 動画テクスチャを1枚だけ更新（上下反転はしない）
        videoTexRef.current = ensureVideoTexture(gl, vid, videoTexRef.current, {
          flipY: false,
        });

        // アスペクトに応じた頂点スケール行列を計算
        const transform = computeQuadTransform(
          canvas.width,
          canvas.height,
          vid.videoWidth,
          vid.videoHeight,
          fitMode
        );

        // そのフレームで使用するプログラムを決定（1回だけ描画）
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
          }
          // mosaicは後日。今は一切適用しない
        }

        // 1描画（transform を渡してレターボックス／トリミング）
        drawQuad(gl, programToUse!, transform, videoTexRef.current!);

        rafRef.current = requestAnimationFrame(draw);
      } catch (e) {
        // 落ちないようにループ継続
        console.error(e);
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, videoRef, isEffectOn, effectDef, current, fitMode]);

  // タップ（pointer）ハンドラ：ワンショット
  const handlePointerDown = () => {
    setIsEffectOn(true);
    const id1 = window.setTimeout(() => setIsEffectOn(false), 500);
    timersRef.current.push(id1);
  };

  // アンマウント時のクリーンアップ（タイマー/テクスチャ）
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
    <>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%", // 親が高さを持つ前提（FullCameraApp 側で 100vh 等）
          overflow: "hidden",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
          onPointerDown={handlePointerDown}
        />
      </div>
      <style>
        {`
          @keyframes tapFeedback {
            0% {
              transform: translate(-50%, -50%) scale(0);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(2);
              opacity: 0;
            }
          }
        `}
      </style>
    </>
  );
};
