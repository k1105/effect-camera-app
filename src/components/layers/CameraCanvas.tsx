import {useEffect, useRef, useState} from "react";
import {getBadTVConfigForEffect} from "../../utils/badTVConfig";
import {getPsychedelicConfigForEffect} from "../../utils/psychedelicConfig";
import {getMosaicConfigForEffect} from "../../utils/mosaicConfig";
import {applyBadTVShader} from "../../utils/badTVShader";
import {applyPsychedelicShader} from "../../utils/psychedelicShader";
import {applyMosaicShader} from "../../utils/mosaicShader";

import {
  createTexture,
  createTextureFromCanvas,
  drawQuad,
} from "../../utils/webglUtils";
import {initWebGL} from "../../utils/webGLInitializer";
// import {SongTitleCanvasOverlay} from "./SongTitleCanvasOverlay";

export interface CameraCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  current: number;
  ready: boolean;
  isNoSignalDetected?: boolean;
  onEffectChange?: (effect: number) => void;
  numEffects?: number;
}

export const CameraCanvas: React.FC<CameraCanvasProps> = ({
  videoRef,
  current,
  ready,
  isNoSignalDetected = false,
  onEffectChange,
  numEffects = 8,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const blendProgramRef = useRef<WebGLProgram | null>(null);
  const badTVProgramRef = useRef<WebGLProgram | null>(null);
  const psychedelicProgramRef = useRef<WebGLProgram | null>(null);
  const mosaicProgramRef = useRef<WebGLProgram | null>(null);
  const [showTapFeedback, setShowTapFeedback] = useState(false);
  const [effectTriggerId, setEffectTriggerId] = useState(0);
  const [isEffectOn, setIsEffectOn] = useState(false);

  // タップハンドラー
  const handleCanvasTap = () => {
    setIsEffectOn(true);
    setEffectTriggerId((id) => id + 1);
    setTimeout(() => setIsEffectOn(false), 500);

    // タップフィードバックを表示
    setShowTapFeedback(true);
    setTimeout(() => setShowTapFeedback(false), 300);
  };

  // エフェクト定義の型
  interface EffectDefinition {
    type: "badTV" | "psychedelic" | "mosaic" | "normal";
    badTVIntensity?: "subtle" | "moderate" | "heavy" | "extreme";
    psychedelicIntensity?: "subtle" | "moderate" | "intense" | "extreme";
    mosaicIntensity?: "subtle" | "moderate" | "heavy" | "extreme";
    isComposite?: boolean; // 複合エフェクトかどうか
    description?: string; // エフェクトの説明（デバッグ用）
  }

  // エフェクト定義の一元管理
  const effectDefinitions: Record<number, EffectDefinition> = {
    0: {
      type: "normal",
      description: "エフェクトなし - 通常表示",
    },
    1: {
      type: "badTV",
      badTVIntensity: "moderate",
      description: "Bad TV - 中程度の歪み効果",
    },
    2: {
      type: "badTV",
      badTVIntensity: "heavy",
      description: "Bad TV - 強烈な歪み効果",
    },
    3: {
      type: "psychedelic",
      psychedelicIntensity: "moderate",
      description: "サイケデリック - 中程度の色彩効果",
    },
    4: {
      type: "psychedelic",
      psychedelicIntensity: "intense",
      description: "サイケデリック - 強烈な色彩効果",
    },
    5: {
      type: "mosaic",
      mosaicIntensity: "moderate",
      description: "モザイク - 中程度のモザイク効果",
    },
    6: {
      type: "mosaic",
      mosaicIntensity: "heavy",
      description: "モザイク - 強烈なモザイク効果",
    },
    7: {
      type: "badTV",
      badTVIntensity: "extreme",
      isComposite: true, // 複合エフェクトとして扱う
      description: "複合エフェクト - Bad TV + サイケデリック + モザイク",
    },
  };

  // currentの値に基づいて適用するエフェクトを決定
  const getEffectTypeForCurrent = (currentValue: number): EffectDefinition => {
    return effectDefinitions[currentValue] || effectDefinitions[0];
  };

  // WebGL初期化
  const initializeWebGL = () => {
    try {
      const canvas = canvasRef.current!;
      const result = initWebGL(canvas);

      if (!result.gl || !result.programs.program) {
        console.error("WebGL initialization failed");
        return false;
      }

      glRef.current = result.gl;
      programRef.current = result.programs.program;
      blendProgramRef.current = result.programs.blendProgram;
      badTVProgramRef.current = result.programs.badTVProgram;
      psychedelicProgramRef.current = result.programs.psychedelicProgram;
      mosaicProgramRef.current = result.programs.mosaicProgram;

      console.log("WebGL initialized successfully");
      return true;
    } catch (error) {
      console.error("WebGL initialization error:", error);
      return false;
    }
  };
  // WebGL初期化用のuseEffect
  useEffect(() => {
    if (!ready) return;

    const canvas = canvasRef.current!;

    if (!glRef.current) {
      if (!initializeWebGL()) return;
    }

    // canvasの解像度設定（固定解像度）
    const targetWidth = 1080;
    const targetHeight = 1920;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    if (glRef.current) {
      glRef.current.viewport(0, 0, targetWidth, targetHeight);
    }
  }, [ready]);

  // 描画ループ用のuseEffect
  useEffect(() => {
    if (!ready || !glRef.current) return;

    const gl = glRef.current!;
    const program = programRef.current!;
    const blendProgram = blendProgramRef.current!;
    const badTVProgram = badTVProgramRef.current!;
    const psychedelicProgram = psychedelicProgramRef.current!;
    const mosaicProgram = mosaicProgramRef.current!;

    if (
      !gl ||
      !program ||
      !blendProgram ||
      !badTVProgram ||
      !psychedelicProgram ||
      !mosaicProgram
    ) {
      console.error("WebGL initialization failed");
      return;
    }

    let raf = 0;

    // モバイル用の軽量描画ループ
    const draw = (currentTime: number) => {
      try {
        const vid = videoRef.current!;
        if (!vid.videoWidth || !vid.videoHeight) {
          raf = requestAnimationFrame(draw);
          return;
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // カメラ映像のテクスチャを作成
        let videoTexture: WebGLTexture;
        try {
          videoTexture = createTexture(gl, vid);
        } catch (error) {
          console.error("Failed to create video texture:", error);
          raf = requestAnimationFrame(draw);
          return;
        }

        // カメラ映像を描画（currentの値に基づいてエフェクトを適用）
        const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
        const effectDef = getEffectTypeForCurrent(current);

        if (isEffectOn) {
          // Bad TVエフェクトの適用
          if (effectDef.type === "badTV") {
            const badTVConfig = getBadTVConfigForEffect(current);

            // シェーダーの設定をシェーダーファイルに委譲
            applyBadTVShader({
              gl,
              program: badTVProgramRef.current!,
              time: (currentTime % 10000) * 0.001,
              config: badTVConfig,
            });

            drawQuad(gl, badTVProgramRef.current!, identity, videoTexture);
          }

          // サイケデリックエフェクトの適用
          if (effectDef.type === "psychedelic" || effectDef.isComposite) {
            const psychedelicConfig = getPsychedelicConfigForEffect(current);

            // シェーダーの設定をシェーダーファイルに委譲
            applyPsychedelicShader({
              gl,
              program: psychedelicProgramRef.current!,
              time: (currentTime % 10000) * 0.001,
              config: psychedelicConfig,
            });

            drawQuad(
              gl,
              psychedelicProgramRef.current!,
              identity,
              videoTexture
            );
          }

          // モザイクエフェクトの適用
          if (effectDef.type === "mosaic" || effectDef.isComposite) {
            const mosaicConfig = getMosaicConfigForEffect(current);

            // シェーダーの設定をシェーダーファイルに委譲
            applyMosaicShader({
              gl,
              program: mosaicProgramRef.current!,
              config: mosaicConfig,
            });

            drawQuad(gl, mosaicProgramRef.current!, identity, videoTexture);
          }
        }

        if (!isEffectOn) {
          // 通常のシェーダーでカメラ映像を描画
          drawQuad(gl, program, identity, videoTexture);
        }

        // モザイクシェーダーを別レイヤーとしてオーバーレイ（currentの値に基づいて適用）
        if (
          isEffectOn &&
          (effectDef.type === "mosaic" || effectDef.isComposite)
        ) {
          const mosaicConfig = getMosaicConfigForEffect(current);

          console.log("Applying mosaic effect:", {
            current,
            effectDef,
            mosaicConfig,
            isEffectOn,
          });

          // シェーダーの設定をシェーダーファイルに委譲
          applyMosaicShader({
            gl,
            program: mosaicProgramRef.current!,
            config: mosaicConfig,
          });

          // 現在のフレームバッファをテクスチャとして使用してモザイクシェーダーを適用
          const frameBufferTexture = createTextureFromCanvas(
            gl,
            canvasRef.current!
          );

          // モザイクシェーダーで描画
          drawQuad(gl, mosaicProgramRef.current!, identity, frameBufferTexture);

          // テクスチャを解放
          gl.deleteTexture(frameBufferTexture);
        }

        // カメラ映像テクスチャを解放
        gl.deleteTexture(videoTexture);
        raf = requestAnimationFrame(draw);
      } catch (error) {
        console.error("Mobile WebGL rendering error:", error);
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    ready,
    current,
    videoRef,
    isNoSignalDetected,
    onEffectChange,
    numEffects,
    effectTriggerId,
    isEffectOn,
  ]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
        onClick={handleCanvasTap}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          opacity: 0,
          pointerEvents: "none",
          zIndex: 1,
          transition: "opacity 0.1s ease-out",
        }}
      />

      {/* タップフィードバック */}
      {showTapFeedback && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            pointerEvents: "none",
            zIndex: 15,
            animation: "tapFeedback 0.3s ease-out",
          }}
        />
      )}

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
