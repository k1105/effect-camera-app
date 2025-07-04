import {useEffect, useRef} from "react";

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ready || isPreviewMode) return;

    let raf = 0;
    const draw = () => {
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
        // エフェクト画像を合成モードを指定して描画
        const effect = bitmaps[current];
        const effectAspect = effect.width / effect.height;

        let effectWidth,
          effectHeight,
          effectX = 0,
          effectY = 0;

        if (effectAspect > targetAspect) {
          // エフェクトが横長の場合
          effectWidth = targetWidth;
          effectHeight = effectWidth / effectAspect;
          effectY = (targetHeight - effectHeight) / 2;
        } else {
          // エフェクトが縦長の場合
          effectHeight = targetHeight;
          effectWidth = effectHeight * effectAspect;
          effectX = (targetWidth - effectWidth) / 2;
        }

        ctx.globalCompositeOperation = blendMode;
        ctx.drawImage(effect, effectX, effectY, effectWidth, effectHeight);
      }

      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [
    ready,
    current,
    bitmaps,
    isPreviewMode,
    videoRef,
    blendMode,
    isSwitchingCamera,
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
