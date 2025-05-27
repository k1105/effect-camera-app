import {useEffect, useRef, useState} from "react";
import {openDB} from "idb";

/* ---------- 定数 ---------- */
const DB_NAME = "effects-db";
const STORE = "effects";
const EFFECTS = ["effect1", "effect2"]; // public/assets/effect?.png

export default function App() {
  /* ---------- Refs & State ---------- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const isCapturingRef = useRef(false);

  const [bitmaps, setBitmaps] = useState<ImageBitmap[]>([]);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [displayZoom, setDisplayZoom] = useState(1); // 表示用のズーム値
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isZoomSupported, setIsZoomSupported] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  /* ---------- カメラ制御関数 ---------- */
  const checkCameraAvailability = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      setHasMultipleCameras(videoDevices.length > 1);
      return videoDevices.length > 1;
    } catch (error) {
      console.error("カメラの確認に失敗しました:", error);
      return false;
    }
  };

  const checkZoomSupport = async () => {
    if (!streamRef.current) return false;
    const track = streamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    const supported = !!capabilities.zoom;
    setIsZoomSupported(supported);
    return supported;
  };

  const switchCamera = async () => {
    try {
      const canSwitch = await checkCameraAvailability();
      if (!canSwitch) {
        console.log("利用可能なカメラが1つしかありません");
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const newFacingMode = isFrontCamera ? "environment" : "user";
      // インカムの場合は解像度を下げる
      const constraints = {
        video: {
          facingMode: newFacingMode,
          width: newFacingMode === "user" ? {ideal: 1280} : {ideal: 3840},
          height: newFacingMode === "user" ? {ideal: 720} : {ideal: 2160},
          frameRate: {ideal: 30},
          zoom: zoom,
        },
      };

      console.log("カメラ切り替え:", constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // 新しいストリームを設定する前に、古いストリームを確実に停止
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // 新しいストリームの準備ができるまで待機
        await new Promise<void>((res) => {
          videoRef.current!.onloadedmetadata = () => res();
        });
        await videoRef.current.play();
      }

      setIsFrontCamera(!isFrontCamera);

      // ズーム機能のサポートを再確認
      await checkZoomSupport();
    } catch (error) {
      console.error("カメラの切り替えに失敗しました:", error);
      // エラーが発生した場合は元の状態を維持
      if (streamRef.current) {
        const currentStream = streamRef.current;
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
        }
      }
    }
  };

  const handleZoom = async (newZoom: number) => {
    if (!isZoomSupported) {
      console.log("ズーム機能はこのデバイスではサポートされていません");
      return;
    }

    // インカムの場合はズームを適用しない
    if (isFrontCamera) {
      console.log("インカムではズーム機能は利用できません");
      return;
    }

    // ズーム値を1.0から1.9の範囲に制限
    const clampedZoom = Math.max(1.0, Math.min(1.9, newZoom));

    // アニメーション開始
    const startZoom = displayZoom;
    const endZoom = clampedZoom;
    const duration = 300; // アニメーション時間（ミリ秒）
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // イージング関数（easeInOutQuad）
      const easeProgress =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const currentZoom = startZoom + (endZoom - startZoom) * easeProgress;
      setDisplayZoom(currentZoom);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // アニメーション完了時に実際のズームを設定
        setZoom(clampedZoom);
        if (streamRef.current) {
          const track = streamRef.current.getVideoTracks()[0];
          try {
            const capabilities = track.getCapabilities();
            if (capabilities.zoom) {
              const minZoom = capabilities.zoom.min || 1.0;
              const maxZoom = Math.min(1.9, capabilities.zoom.max || 1.9);
              const deviceClampedZoom = Math.max(
                minZoom,
                Math.min(maxZoom, clampedZoom)
              );

              track.applyConstraints({
                advanced: [{zoom: deviceClampedZoom}],
              });
            }
          } catch (error) {
            console.error("ズームの設定に失敗しました:", error);
            setZoom(zoom);
            setDisplayZoom(zoom);
          }
        }
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);
  };

  const takePhoto = async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    setIsCapturing(true);

    try {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;

      // 撮影時のフラッシュエフェクト
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // WebP形式で画像を生成（高品質、低サイズ）
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
          },
          "image/webp",
          0.9
        );
      });

      // メタデータを追加
      const metadata = {
        type: "image/webp",
        lastModified: Date.now(),
        name: `photo-${new Date().toISOString()}.webp`,
      };

      // ファイルとして保存
      const file = new File([blob], metadata.name, {
        type: metadata.type,
        lastModified: metadata.lastModified,
      });

      // ダウンロードリンクを作成
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = metadata.name;
      link.click();

      // メモリリークを防ぐためにURLを解放
      URL.revokeObjectURL(url);

      // 撮影成功のフィードバック
      const flash = document.createElement("div");
      flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.1s ease-out;
      `;
      document.body.appendChild(flash);

      // フラッシュアニメーション
      requestAnimationFrame(() => {
        flash.style.opacity = "0.3";
        setTimeout(() => {
          flash.style.opacity = "0";
          setTimeout(() => {
            document.body.removeChild(flash);
          }, 100);
        }, 50);
      });
    } catch (error) {
      console.error("撮影に失敗しました:", error);
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  };

  /* ---------- 1) カメラ & エフェクト初期化（初回のみ） ---------- */
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    (async () => {
      try {
        /* -- a) カメラ -- */
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: {ideal: 3840},
            height: {ideal: 2160},
            frameRate: {ideal: 30},
            zoom: zoom,
          },
        });
        streamRef.current = stream;
        const vid = videoRef.current!;
        vid.srcObject = stream;

        // metadata が来てから play
        await new Promise<void>((res) => {
          vid.onloadedmetadata = () => res();
        });
        await vid.play();

        // カメラの可用性とズーム機能のサポートを確認
        await checkCameraAvailability();
        await checkZoomSupport();

        /* -- b) エフェクト画像 -- */
        const db = await openDB(DB_NAME, 1, {
          upgrade(db) {
            db.createObjectStore(STORE);
          },
        });
        const imgs: ImageBitmap[] = [];

        for (const key of EFFECTS) {
          let blob = await db.get(STORE, key);
          if (!blob) {
            blob = await fetch(`/assets/${key}.png`).then((r) => r.blob());
            await db.put(STORE, blob, key);
          }
          imgs.push(await createImageBitmap(blob));
        }
        setBitmaps(imgs);
        setReady(true);
      } catch (error) {
        console.error("Init failed:", error);
      }
    })();

    /* -- クリーンアップ -- */
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  /* ---------- 2) 描画ループ ---------- */
  useEffect(() => {
    if (!ready) return;

    let raf = 0;
    const draw = () => {
      const cvs = canvasRef.current!;
      const ctx = cvs.getContext("2d")!;
      const vid = videoRef.current!;

      // カメラの解像度を維持したまま、canvasの表示サイズをビューポートに合わせる
      const displayWidth = window.innerWidth;
      const displayHeight = window.innerHeight;

      // canvasの実際の解像度はカメラの解像度に合わせる
      if (cvs.width !== vid.videoWidth || cvs.height !== vid.videoHeight) {
        cvs.width = vid.videoWidth;
        cvs.height = vid.videoHeight;
      }

      // カメラ映像を描画（アスペクト比を維持）
      const videoAspect = vid.videoWidth / vid.videoHeight;
      const displayAspect = displayWidth / displayHeight;

      let drawWidth,
        drawHeight,
        offsetX = 0,
        offsetY = 0;

      if (videoAspect > displayAspect) {
        // カメラが横長の場合
        drawWidth = cvs.width;
        drawHeight = drawWidth / videoAspect;
        offsetY = (cvs.height - drawHeight) / 2;
      } else {
        // カメラが縦長の場合
        drawHeight = cvs.height;
        drawWidth = drawHeight * videoAspect;
        offsetX = (cvs.width - drawWidth) / 2;
      }

      // ズーム効果を適用（外カムの場合のみ）
      if (!isFrontCamera) {
        const zoom = displayZoom;
        const zoomedWidth = drawWidth / zoom;
        const zoomedHeight = drawHeight / zoom;
        const zoomedOffsetX = offsetX + (drawWidth - zoomedWidth) / 2;
        const zoomedOffsetY = offsetY + (drawHeight - zoomedHeight) / 2;

        ctx.drawImage(
          vid,
          zoomedOffsetX,
          zoomedOffsetY,
          zoomedWidth,
          zoomedHeight
        );
      } else {
        ctx.drawImage(vid, offsetX, offsetY, drawWidth, drawHeight);
      }

      // エフェクト画像のアスペクト比を維持して描画
      const effect = bitmaps[current];
      const effectAspect = effect.width / effect.height;

      if (effectAspect > displayAspect) {
        drawWidth = cvs.width;
        drawHeight = drawWidth / effectAspect;
        offsetY = (cvs.height - drawHeight) / 2;
      } else {
        drawHeight = cvs.height;
        drawWidth = drawHeight * effectAspect;
        offsetX = (cvs.width - drawWidth) / 2;
      }

      ctx.drawImage(effect, offsetX, offsetY, drawWidth, drawHeight);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ready, current, bitmaps, displayZoom, isFrontCamera]);

  /* ---------- UI ---------- */
  return (
    <>
      <video ref={videoRef} style={{display: "none"}} playsInline muted />

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
      ></canvas>

      <div
        className="controls"
        style={{
          position: "fixed",
          bottom: 20,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          zIndex: 1,
        }}
      >
        <div style={{display: "flex", gap: "10px"}}>
          {EFFECTS.map((_, i) => (
            <button
              key={i}
              className={current === i ? "active" : ""}
              onClick={() => setCurrent(i)}
            >
              Effect {i + 1}
            </button>
          ))}
        </div>

        <div style={{display: "flex", gap: "10px"}}>
          {hasMultipleCameras && (
            <button onClick={switchCamera}>
              {isFrontCamera ? "外カメラ" : "インカム"}
            </button>
          )}
          <button
            onClick={takePhoto}
            disabled={isCapturing}
            style={{
              opacity: isCapturing ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {isCapturing ? "撮影中..." : "撮影"}
          </button>
        </div>

        {isZoomSupported ? (
          <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
            <button
              onClick={() => handleZoom(Math.max(1.0, zoom - 0.1))}
              disabled={isFrontCamera}
            >
              -
            </button>
            <span>ズーム: {displayZoom.toFixed(1)}x</span>
            <button
              onClick={() => handleZoom(Math.min(1.9, zoom + 0.1))}
              disabled={isFrontCamera}
            >
              +
            </button>
          </div>
        ) : (
          <div style={{color: "#666", fontSize: "0.9em"}}>
            ズーム機能はこのデバイスでは利用できません
          </div>
        )}
      </div>
    </>
  );
}
