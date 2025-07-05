import {useEffect, useRef, useState} from "react";
import img0 from "../assets/dlt-logo-animation/img0.png";
import img1 from "../assets/dlt-logo-animation/img1.png";
import {getLayoutForEffect, calculatePositions} from "../utils/effectLayouts";

type BlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "soft-light"
  | "hard-light";

interface CameraCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  bitmaps: ImageBitmap[];
  current: number;
  ready: boolean;
  isPreviewMode: boolean;
  onTakePhoto?: (canvas: HTMLCanvasElement) => void;
  blendMode?: BlendMode;
  isSwitchingCamera?: boolean;
  isNoSignalDetected?: boolean; // 信号が検出されていない状態
}

export const CameraCanvas: React.FC<CameraCanvasProps> = ({
  videoRef,
  bitmaps,
  current,
  ready,
  isPreviewMode,
  onTakePhoto,
  blendMode = "source-over",
  isSwitchingCamera = false,
  isNoSignalDetected = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logoBitmaps, setLogoBitmaps] = useState<
    [ImageBitmap, ImageBitmap] | null
  >(null);
  const currentFrameRef = useRef(0);

  // ロゴ画像のプリロード
  useEffect(() => {
    const preloadLogoImages = async () => {
      try {
        const [bitmap0, bitmap1] = await Promise.all([
          createImageBitmap(await fetch(img0).then((r) => r.blob())),
          createImageBitmap(await fetch(img1).then((r) => r.blob())),
        ]);
        setLogoBitmaps([bitmap0, bitmap1]);
      } catch (error) {
        console.error("ロゴ画像の読み込みに失敗しました:", error);
      }
    };

    preloadLogoImages();
  }, []);

  // ロゴアニメーションのフレーム計算
  const getLogoFrameData = (frame: number) => {
    const TOTAL_FRAMES = 120;
    const normalizedFrame = frame % TOTAL_FRAMES;

    if (normalizedFrame < 100) {
      // img0.png (フレーム0-99)
      const gridX = normalizedFrame % 10;
      const gridY = Math.floor(normalizedFrame / 10);
      return {
        bitmap: logoBitmaps![0],
        sourceX: gridX * 400, // 4000px / 10 = 400px per grid
        sourceY: gridY * 400,
        sourceWidth: 400,
        sourceHeight: 400,
      };
    } else {
      // img1.png (フレーム100-119)
      const frameInImg1 = normalizedFrame - 100;
      const gridX = frameInImg1 % 10;
      const gridY = Math.floor(frameInImg1 / 10); // 0-1 (上から2段分のみ)
      return {
        bitmap: logoBitmaps![1],
        sourceX: gridX * 400,
        sourceY: gridY * 400,
        sourceWidth: 400,
        sourceHeight: 400,
      };
    }
  };

  useEffect(() => {
    if (!ready || isPreviewMode) return;

    let raf = 0;
    let lastTime = 0;
    const FRAME_DURATION = 50; // 50ms per frame (20fps)

    const draw = (currentTime: number) => {
      const cvs = canvasRef.current!;
      const ctx = cvs.getContext("2d")!;
      const vid = videoRef.current!;

      // canvasの実際の解像度は1080x1920に固定
      const targetWidth = 1080;
      const targetHeight = 1920;
      cvs.width = targetWidth;
      cvs.height = targetHeight;

      // カメラ映像のアスペクト比を計算
      const videoAspect = vid.videoWidth / vid.videoHeight;
      const targetAspect = targetWidth / targetHeight;

      let sourceX = 0,
        sourceY = 0,
        sourceWidth = vid.videoWidth,
        sourceHeight = vid.videoHeight;

      // カメラ映像を中央部分でクロップ
      if (videoAspect > targetAspect) {
        // カメラが横長の場合、左右をクロップ
        sourceWidth = vid.videoHeight * targetAspect;
        sourceX = (vid.videoWidth - sourceWidth) / 2;
      } else {
        // カメラが縦長の場合、上下をクロップ
        sourceHeight = vid.videoWidth / targetAspect;
        sourceY = (vid.videoHeight - sourceHeight) / 2;
      }

      // カメラ映像を描画（中央部分をクロップして1080x1920に合わせる）
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(
        vid,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight, // ソース（カメラ映像）の切り取り範囲
        0,
        0,
        targetWidth,
        targetHeight // デスティネーション（canvas）の描画範囲
      );

      // カメラ切り替え中はエフェクトを表示しない
      if (!isSwitchingCamera && current >= 0) {
        // currentが-1の場合はエフェクトを表示しない
        const effect = bitmaps[current];
        const layout = getLayoutForEffect(current);
        const positions = calculatePositions(
          layout,
          targetWidth,
          targetHeight,
          currentTime
        );

        // 各位置にエフェクトを描画
        for (const pos of positions) {
          const effectAspect = effect.width / effect.height;
          let effectWidth, effectHeight;

          if (effectAspect > targetAspect) {
            // エフェクトが横長の場合
            effectWidth = targetWidth * pos.scale;
            effectHeight = effectWidth / effectAspect;
          } else {
            // エフェクトが縦長の場合
            effectHeight = targetHeight * pos.scale;
            effectWidth = effectHeight * effectAspect;
          }

          // 回転とスケールを適用
          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate(pos.rotation);
          ctx.globalCompositeOperation = blendMode;
          ctx.drawImage(
            effect,
            -effectWidth / 2,
            -effectHeight / 2,
            effectWidth,
            effectHeight
          );
          ctx.restore();
        }
      }

      // ロゴアニメーションの描画（信号が検出されていない時）
      if (isNoSignalDetected && logoBitmaps) {
        // アニメーションフレームの更新
        if (currentTime - lastTime >= FRAME_DURATION) {
          currentFrameRef.current = (currentFrameRef.current + 1) % 120;
          lastTime = currentTime;
        }

        const frameData = getLogoFrameData(currentFrameRef.current);

        // ロゴを中央に配置（サイズは調整可能）
        const logoSize = 300;
        const logoX = (targetWidth - logoSize) / 2;
        const logoY = (targetHeight - logoSize) / 2;

        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(
          frameData.bitmap,
          frameData.sourceX,
          frameData.sourceY,
          frameData.sourceWidth,
          frameData.sourceHeight,
          logoX,
          logoY,
          logoSize,
          logoSize
        );
      }

      raf = requestAnimationFrame(draw);
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
    logoBitmaps,
  ]);

  return (
    <canvas
      ref={canvasRef}
      onClick={() => onTakePhoto?.(canvasRef.current!)}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  );
};
