import {useEffect, useRef, useState} from "react";
import aspLogo from "../assets/asp-logo.png";
import {
  calculateEffectRenderData,
  type BlendMode,
} from "../utils/effectRenderer";
import {getBadTVConfigForEffect} from "../utils/badTVConfig";
import {getPsychedelicConfigForEffect} from "../utils/psychedelicConfig";

import {shouldDisableShaders} from "../utils/deviceDetection";
import {createTexture, drawQuad} from "../utils/webglUtils";
import {initWebGL} from "../utils/webGLInitializer";
import {
  getEffectName,
  getBackgroundColorForEffect,
  getEffectOverlayColor,
} from "../utils/effectUtils";

interface CameraCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  bitmaps: ImageBitmap[];
  current: number;
  ready: boolean;
  isPreviewMode: boolean;
  blendMode?: BlendMode;
  isSwitchingCamera?: boolean;
  isNoSignalDetected?: boolean;
}

export const CameraCanvas: React.FC<CameraCanvasProps> = ({
  videoRef,
  bitmaps,
  current,
  ready,
  isPreviewMode,
  blendMode = "source-over",
  isSwitchingCamera = false,
  isNoSignalDetected = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const blendProgramRef = useRef<WebGLProgram | null>(null);
  const badTVProgramRef = useRef<WebGLProgram | null>(null);
  const psychedelicProgramRef = useRef<WebGLProgram | null>(null);
  const mobileProgramRef = useRef<WebGLProgram | null>(null);
  const [aspLogoBitmap, setAspLogoBitmap] = useState<ImageBitmap | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  const [showEffectText, setShowEffectText] = useState(false);
  const [effectTextOpacity, setEffectTextOpacity] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // モバイルデバイス検出
  useEffect(() => {
    setIsMobile(shouldDisableShaders());
  }, []);

  // エフェクト切り替え時のテキスト表示
  useEffect(() => {
    if (ready && !isPreviewMode) {
      setShowEffectText(true);
      setEffectTextOpacity(1.0);

      // 2秒後にフェードアウト
      const fadeOutTimer = setTimeout(() => {
        setEffectTextOpacity(0);
        setTimeout(() => setShowEffectText(false), 500);
      }, 2000);

      return () => clearTimeout(fadeOutTimer);
    }
  }, [current, ready, isPreviewMode]);

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
      mobileProgramRef.current = result.programs.mobileProgram;

      console.log("WebGL initialized successfully");
      return true;
    } catch (error) {
      console.error("WebGL initialization error:", error);
      return false;
    }
  };

  // ロゴ画像のプリロード
  useEffect(() => {
    const preloadLogoImages = async () => {
      try {
        const bitmap = await createImageBitmap(
          await fetch(aspLogo).then((r) => r.blob())
        );
        setAspLogoBitmap(bitmap);
      } catch (error) {
        console.error("ロゴ画像の読み込みに失敗しました:", error);
      }
    };

    preloadLogoImages();
  }, []);

  // エフェクトが検出された時のオーバーレイフェードアウト
  useEffect(() => {
    if (!isNoSignalDetected && overlayOpacity > 0) {
      const fadeOutDuration = 500;
      const fadeOutSteps = 20;
      const opacityStep = overlayOpacity / fadeOutSteps;
      const stepDuration = fadeOutDuration / fadeOutSteps;

      const fadeOutInterval = setInterval(() => {
        setOverlayOpacity((prev) => {
          const newOpacity = prev - opacityStep;
          if (newOpacity <= 0) {
            clearInterval(fadeOutInterval);
            return 0;
          }
          return newOpacity;
        });
      }, stepDuration);

      return () => clearInterval(fadeOutInterval);
    } else if (isNoSignalDetected && overlayOpacity < 0.8) {
      setOverlayOpacity(0.8);
    }
  }, [isNoSignalDetected, overlayOpacity]);

  useEffect(() => {
    if (!ready || isPreviewMode) return;

    const canvas = canvasRef.current!;

    // WebGL初期化
    if (!glRef.current) {
      if (!initializeWebGL()) return;
    }

    const gl = glRef.current!;
    const program = programRef.current!;
    const blendProgram = blendProgramRef.current!;
    const badTVProgram = badTVProgramRef.current!;
    const psychedelicProgram = psychedelicProgramRef.current!;
    const mobileProgram = mobileProgramRef.current!;

    if (
      !gl ||
      !program ||
      !blendProgram ||
      !badTVProgram ||
      !psychedelicProgram ||
      !mobileProgram
    ) {
      console.error("WebGL initialization failed");
      return;
    }

    // canvasの解像度設定（固定解像度）
    const targetWidth = 1080;
    const targetHeight = 1920;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    gl.viewport(0, 0, targetWidth, targetHeight);

    let raf = 0;
    let lastDrawTime = 0;
    const targetFPS = 30; // モバイル用に30fpsに制限
    const frameInterval = 1000 / targetFPS;

    // モバイルデバイスの場合は軽量シェーダーを使用
    if (isMobile) {
      console.log("Mobile device detected - using lightweight shader");

      // モバイル用の軽量描画ループ
      const mobileDraw = (currentTime: number) => {
        try {
          const vid = videoRef.current!;
          if (!vid.videoWidth || !vid.videoHeight) {
            raf = requestAnimationFrame(mobileDraw);
            return;
          }

          // エフェクトに応じた背景色を設定
          const backgroundColor = getBackgroundColorForEffect(current);
          gl.clearColor(
            backgroundColor[0],
            backgroundColor[1],
            backgroundColor[2],
            backgroundColor[3]
          );
          gl.clear(gl.COLOR_BUFFER_BIT);

          // カメラ映像のテクスチャを作成
          let videoTexture: WebGLTexture;
          try {
            videoTexture = createTexture(gl, vid);
          } catch (error) {
            console.error("Failed to create video texture:", error);
            raf = requestAnimationFrame(mobileDraw);
            return;
          }

          // エフェクトの描画データを取得
          const effectRenderData = calculateEffectRenderData({
            current,
            bitmaps,
            isSwitchingCamera,
            blendMode,
            canvasWidth: targetWidth,
            canvasHeight: targetHeight,
            currentTime,
          });

          // カメラ映像を描画（PC版と同じエフェクトロジックを使用）
          const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];

          if (effectRenderData.effectType === "badTV") {
            // Bad TV Shaderでカメラ映像を描画
            gl.useProgram(badTVProgramRef.current!);

            // エフェクトIDに基づいてBad TV設定を取得
            const badTVConfig = getBadTVConfigForEffect(current);

            // Bad TV Shaderのユニフォームを設定
            const timeLocation = gl.getUniformLocation(
              badTVProgramRef.current!,
              "u_time"
            );
            const distortionLocation = gl.getUniformLocation(
              badTVProgramRef.current!,
              "u_distortion"
            );
            const distortion2Location = gl.getUniformLocation(
              badTVProgramRef.current!,
              "u_distortion2"
            );
            const speedLocation = gl.getUniformLocation(
              badTVProgramRef.current!,
              "u_speed"
            );
            const rollSpeedLocation = gl.getUniformLocation(
              badTVProgramRef.current!,
              "u_rollSpeed"
            );
            const chromaticAberrationLocation = gl.getUniformLocation(
              badTVProgramRef.current!,
              "u_chromaticAberration"
            );
            const interlaceIntensityLocation = gl.getUniformLocation(
              badTVProgramRef.current!,
              "u_interlaceIntensity"
            );
            const interlaceLineWidthLocation = gl.getUniformLocation(
              badTVProgramRef.current!,
              "u_interlaceLineWidth"
            );

            gl.uniform1f(timeLocation, currentTime * 0.001);
            gl.uniform1f(distortionLocation, badTVConfig.distortion);
            gl.uniform1f(distortion2Location, badTVConfig.distortion2);
            gl.uniform1f(speedLocation, badTVConfig.speed);
            gl.uniform1f(rollSpeedLocation, badTVConfig.rollSpeed);
            gl.uniform1f(
              chromaticAberrationLocation,
              badTVConfig.chromaticAberration
            );
            gl.uniform1f(
              interlaceIntensityLocation,
              badTVConfig.interlaceIntensity
            );
            gl.uniform1f(
              interlaceLineWidthLocation,
              badTVConfig.interlaceLineWidth
            );

            drawQuad(gl, badTVProgramRef.current!, identity, videoTexture);
          } else if (effectRenderData.effectType === "psychedelic") {
            // サイケデリックシェーダーでカメラ映像を描画
            gl.useProgram(psychedelicProgramRef.current!);

            // エフェクトIDに基づいてサイケデリック設定を取得
            const psychedelicConfig = getPsychedelicConfigForEffect(current);

            // サイケデリックシェーダーのユニフォームを設定
            const timeLocation = gl.getUniformLocation(
              psychedelicProgramRef.current!,
              "u_time"
            );
            const thermalIntensityLocation = gl.getUniformLocation(
              psychedelicProgramRef.current!,
              "u_thermalIntensity"
            );
            const contrastIntensityLocation = gl.getUniformLocation(
              psychedelicProgramRef.current!,
              "u_contrastIntensity"
            );
            const psychedelicSpeedLocation = gl.getUniformLocation(
              psychedelicProgramRef.current!,
              "u_psychedelicSpeed"
            );
            const channelShiftLocation = gl.getUniformLocation(
              psychedelicProgramRef.current!,
              "u_channelShift"
            );
            const glowIntensityLocation = gl.getUniformLocation(
              psychedelicProgramRef.current!,
              "u_glowIntensity"
            );

            gl.uniform1f(timeLocation, currentTime * 0.001);
            gl.uniform1f(
              thermalIntensityLocation,
              psychedelicConfig.thermalIntensity
            );
            gl.uniform1f(
              contrastIntensityLocation,
              psychedelicConfig.contrastIntensity
            );
            gl.uniform1f(
              psychedelicSpeedLocation,
              psychedelicConfig.psychedelicSpeed
            );
            gl.uniform1f(channelShiftLocation, psychedelicConfig.channelShift);
            gl.uniform1f(
              glowIntensityLocation,
              psychedelicConfig.glowIntensity
            );

            drawQuad(
              gl,
              psychedelicProgramRef.current!,
              identity,
              videoTexture
            );
          } else {
            // 通常のシェーダーでカメラ映像を描画
            drawQuad(gl, program, identity, videoTexture);
          }

          // カメラ映像テクスチャを解放
          gl.deleteTexture(videoTexture);

          raf = requestAnimationFrame(mobileDraw);
        } catch (error) {
          console.error("Mobile WebGL rendering error:", error);
          raf = requestAnimationFrame(mobileDraw);
        }
      };

      raf = requestAnimationFrame(mobileDraw);
      return () => cancelAnimationFrame(raf);
    }

    const draw = (currentTime: number) => {
      try {
        // フレームレート制限
        if (currentTime - lastDrawTime < frameInterval) {
          raf = requestAnimationFrame(draw);
          return;
        }
        lastDrawTime = currentTime;

        const vid = videoRef.current!;
        if (!vid.videoWidth || !vid.videoHeight) {
          raf = requestAnimationFrame(draw);
          return;
        }

        // エフェクトに応じた背景色を設定
        const backgroundColor = getBackgroundColorForEffect(current);
        gl.clearColor(
          backgroundColor[0],
          backgroundColor[1],
          backgroundColor[2],
          backgroundColor[3]
        );
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

        // エフェクトの描画データを取得
        const effectRenderData = calculateEffectRenderData({
          current,
          bitmaps,
          isSwitchingCamera,
          blendMode,
          canvasWidth: targetWidth,
          canvasHeight: targetHeight,
          currentTime,
        });

        // カメラ映像を先に描画（effect0の場合はBad TV Shaderを使用）
        const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];

        if (effectRenderData.effectType === "badTV") {
          // Bad TV Shaderでカメラ映像を描画
          gl.useProgram(badTVProgramRef.current!);

          // エフェクトIDに基づいてBad TV設定を取得
          const badTVConfig = getBadTVConfigForEffect(current);

          // Bad TV Shaderのユニフォームを設定
          const timeLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_time"
          );
          const distortionLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_distortion"
          );
          const distortion2Location = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_distortion2"
          );
          const speedLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_speed"
          );
          const rollSpeedLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_rollSpeed"
          );
          const chromaticAberrationLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_chromaticAberration"
          );
          const interlaceIntensityLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_interlaceIntensity"
          );
          const interlaceLineWidthLocation = gl.getUniformLocation(
            badTVProgramRef.current!,
            "u_interlaceLineWidth"
          );

          gl.uniform1f(timeLocation, currentTime * 0.001);
          gl.uniform1f(distortionLocation, badTVConfig.distortion);
          gl.uniform1f(distortion2Location, badTVConfig.distortion2);
          gl.uniform1f(speedLocation, badTVConfig.speed);
          gl.uniform1f(rollSpeedLocation, badTVConfig.rollSpeed);
          gl.uniform1f(
            chromaticAberrationLocation,
            badTVConfig.chromaticAberration
          );
          gl.uniform1f(
            interlaceIntensityLocation,
            badTVConfig.interlaceIntensity
          );
          gl.uniform1f(
            interlaceLineWidthLocation,
            badTVConfig.interlaceLineWidth
          );

          drawQuad(gl, badTVProgramRef.current!, identity, videoTexture);
        } else if (effectRenderData.effectType === "psychedelic") {
          // サイケデリックシェーダーでカメラ映像を描画
          gl.useProgram(psychedelicProgramRef.current!);

          // エフェクトIDに基づいてサイケデリック設定を取得
          const psychedelicConfig = getPsychedelicConfigForEffect(current);

          // サイケデリックシェーダーのユニフォームを設定
          const timeLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_time"
          );
          const thermalIntensityLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_thermalIntensity"
          );
          const contrastIntensityLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_contrastIntensity"
          );
          const psychedelicSpeedLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_psychedelicSpeed"
          );
          const channelShiftLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_channelShift"
          );
          const glowIntensityLocation = gl.getUniformLocation(
            psychedelicProgramRef.current!,
            "u_glowIntensity"
          );

          gl.uniform1f(timeLocation, currentTime * 0.001);
          gl.uniform1f(
            thermalIntensityLocation,
            psychedelicConfig.thermalIntensity
          );
          gl.uniform1f(
            contrastIntensityLocation,
            psychedelicConfig.contrastIntensity
          );
          gl.uniform1f(
            psychedelicSpeedLocation,
            psychedelicConfig.psychedelicSpeed
          );
          gl.uniform1f(channelShiftLocation, psychedelicConfig.channelShift);
          gl.uniform1f(glowIntensityLocation, psychedelicConfig.glowIntensity);

          drawQuad(gl, psychedelicProgramRef.current!, identity, videoTexture);
        } else {
          // 通常のシェーダーでカメラ映像を描画
          drawQuad(gl, program, identity, videoTexture);
        }

        // エフェクトの描画（カメラ映像の上に重ねる）
        // if (
        //   effectRenderData.effectBitmap &&
        //   effectRenderData.positions.length > 0
        // ) {
        //   const effectTexture = createTexture(
        //     gl,
        //     effectRenderData.effectBitmap
        //   );

        //   for (const pos of effectRenderData.positions) {
        //     const {transform} = calculateEffectTransform(
        //       pos,
        //       effectRenderData.effectBitmap,
        //       targetWidth,
        //       targetHeight
        //     );

        //     // 通常のブレンドモードを使用
        //     const blendModeValue = getBlendModeValue(blendMode);
        //     gl.useProgram(blendProgram);

        //     const blendModeLocation = gl.getUniformLocation(
        //       blendProgram,
        //       "u_blendMode"
        //     );
        //     gl.uniform1i(blendModeLocation, blendModeValue);

        //     // 背景テクスチャの設定（カメラ映像の代わりに現在のフレームバッファを使用）
        //     const backgroundLocation = gl.getUniformLocation(
        //       blendProgram,
        //       "u_background"
        //     );
        //     gl.activeTexture(gl.TEXTURE1);
        //     gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        //     gl.uniform1i(backgroundLocation, 1);

        //     drawQuad(gl, blendProgram, transform, effectTexture);
        //   }
        //   // エフェクトテクスチャを解放
        //   gl.deleteTexture(effectTexture);
        // }

        // カメラ映像テクスチャを解放（描画完了後）
        gl.deleteTexture(videoTexture);

        // ロゴの描画
        if (isNoSignalDetected && aspLogoBitmap) {
          let logoTexture: WebGLTexture;
          try {
            logoTexture = createTexture(gl, aspLogoBitmap);
          } catch (error) {
            console.error("Failed to create logo texture:", error);
            raf = requestAnimationFrame(draw);
            return;
          }
          const logoSize = 300; // 固定サイズ
          const logoX = (targetWidth - logoSize) / 2;
          const logoY = (targetHeight - logoSize) / 2;

          const scaleX = logoSize / targetWidth;
          const scaleY = logoSize / targetHeight;
          const translateX = (logoX - targetWidth / 2) / (targetWidth / 2);
          const translateY = (logoY - targetHeight / 2) / (targetHeight / 2);

          const logoTransform = [
            scaleX,
            0,
            translateX,
            0,
            scaleY,
            translateY,
            0,
            0,
            1,
          ];

          drawQuad(gl, program, logoTransform, logoTexture);
          // ロゴテクスチャを解放
          gl.deleteTexture(logoTexture);
        }

        raf = requestAnimationFrame(draw);
      } catch (error) {
        console.error("WebGL rendering error:", error);
        // エラーが発生しても描画ループを継続
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    ready,
    current,
    bitmaps,
    isPreviewMode,
    videoRef,
    blendMode,
    isSwitchingCamera,
    isNoSignalDetected,
    aspLogoBitmap,
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
      />

      {/* エフェクトオーバーレイレイヤー */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: getEffectOverlayColor(current),
          opacity: overlayOpacity,
          pointerEvents: "none",
          zIndex: 1,
          transition: "opacity 0.1s ease-out",
        }}
      />
      {/* エフェクト名表示 */}
      {showEffectText && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "48px",
            fontWeight: "bold",
            textAlign: "center",
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
            pointerEvents: "none",
            zIndex: 10,
            opacity: effectTextOpacity,
            transition: "opacity 0.5s ease-in-out",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            padding: "20px 40px",
            borderRadius: "10px",
            border: "2px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          {getEffectName(current)}
        </div>
      )}
    </>
  );
};
