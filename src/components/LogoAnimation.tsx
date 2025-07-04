import {useEffect, useRef, useState} from "react";
import img0 from "../assets/dlt-logo-animation/img0.png";
import img1 from "../assets/dlt-logo-animation/img1.png";

interface LogoAnimationProps {
  isVisible: boolean;
}

export function LogoAnimation({isVisible}: LogoAnimationProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // アニメーション設定
  const TOTAL_FRAMES = 120; // 0-119のフレーム
  const FRAME_DURATION = 50; // 50ms per frame (20fps)

  useEffect(() => {
    if (!isVisible) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let lastTime = 0;
    const animate = (currentTime: number) => {
      if (currentTime - lastTime >= FRAME_DURATION) {
        setCurrentFrame((prev) => (prev + 1) % TOTAL_FRAMES);
        lastTime = currentTime;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isVisible]);

  // 画像のプリロード
  useEffect(() => {
    const preloadImages = async () => {
      try {
        const image0 = new Image();
        const image1 = new Image();

        const loadPromise0 = new Promise((resolve) => {
          image0.onload = resolve;
          image0.src = img0;
        });

        const loadPromise1 = new Promise((resolve) => {
          image1.onload = resolve;
          image1.src = img1;
        });

        await Promise.all([loadPromise0, loadPromise1]);
        setImageLoaded(true);
      } catch (error) {
        console.error("ロゴ画像の読み込みに失敗しました:", error);
      }
    };

    preloadImages();
  }, []);

  // フレームに基づいてbackground-positionを計算
  const getBackgroundPosition = (frame: number) => {
    // フレームを0-119の範囲に正規化
    const normalizedFrame = frame % TOTAL_FRAMES;

    // 画像1（img0.png）のアニメーション（フレーム0-99）
    if (normalizedFrame < 100) {
      const gridX = normalizedFrame % 10; // 0-9
      const gridY = Math.floor(normalizedFrame / 10); // 0-9
      const xPercent = (gridX * 100) / 9; // 0%, 11.11%, 22.22%, ..., 100%
      const yPercent = (gridY * 100) / 9; // 0%, 11.11%, 22.22%, ..., 100%
      return `${xPercent}% ${yPercent}%`;
    }
    // 画像2（img1.png）のアニメーション（フレーム100-119）
    else {
      const frameInImg1 = normalizedFrame - 100; // 0-19
      const gridX = frameInImg1 % 10; // 0-9
      const gridY = Math.floor(frameInImg1 / 10); // 0-1 (上から2段分のみ)
      const xPercent = (gridX * 100) / 9; // 0%, 11.11%, 22.22%, ..., 100%
      const yPercent = (gridY * 100) / 9; // 0%, 11.11% (上から2段分のみ)
      return `${xPercent}% ${yPercent}%`;
    }
  };

  // 現在のフレームに基づいて使用する画像を決定
  const getCurrentImage = (frame: number) => {
    const normalizedFrame = frame % TOTAL_FRAMES;
    return normalizedFrame < 100 ? img0 : img1;
  };

  if (!isVisible || !imageLoaded) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "300px", // 表示サイズを調整
        height: "300px",
        backgroundImage: `url(${getCurrentImage(currentFrame)})`,
        backgroundSize: "1000% 1000%", // 10x10のグリッド
        backgroundPosition: getBackgroundPosition(currentFrame),
        backgroundRepeat: "no-repeat",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    />
  );
}
