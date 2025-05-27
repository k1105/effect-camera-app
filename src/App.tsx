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

  const [bitmaps, setBitmaps] = useState<ImageBitmap[]>([]);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isZoomSupported, setIsZoomSupported] = useState(false);

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          width: {ideal: 3840},
          height: {ideal: 2160},
          frameRate: {ideal: 30},
          zoom: zoom,
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
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

    setZoom(newZoom);
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{zoom: newZoom}],
        });
      } catch (error) {
        console.error("ズームの設定に失敗しました:", error);
      }
    }
  };

  const takePhoto = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = `photo-${new Date().toISOString()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
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

      ctx.drawImage(vid, offsetX, offsetY, drawWidth, drawHeight);

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
    return () => cancelAnimationFrame(raf);
  }, [ready, current, bitmaps]);

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
          <button onClick={takePhoto}>撮影</button>
        </div>

        {isZoomSupported ? (
          <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
            <button onClick={() => handleZoom(Math.max(1, zoom - 0.1))}>
              -
            </button>
            <span>ズーム: {zoom.toFixed(1)}x</span>
            <button onClick={() => handleZoom(Math.min(5, zoom + 0.1))}>
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
