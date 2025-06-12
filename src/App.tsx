import {useEffect, useRef, useState} from "react";
import {openDB} from "idb";
import {CameraControls} from "./components/CameraControls";
import {PreviewScreen} from "./components/PreviewScreen";
import {EffectSelector} from "./components/EffectSelector";
import {ZoomControl} from "./components/ZoomControl";
import {CameraCanvas} from "./components/CameraCanvas";
import {AudioReceiver} from "./components/AudioReceiver";

/* ---------- 定数 ---------- */
const DB_NAME = "effects-db";
const STORE = "effects";
const EFFECTS = ["effect1", "effect2"]; // public/assets/effect?.png

const BLEND_MODES = [
  {value: "source-over", label: "通常"},
  {value: "multiply", label: "乗算"},
  {value: "screen", label: "スクリーン"},
  {value: "overlay", label: "オーバーレイ"},
  {value: "soft-light", label: "ソフトライト"},
  {value: "hard-light", label: "ハードライト"},
] as const;

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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [blendMode, setBlendMode] =
    useState<(typeof BLEND_MODES)[number]["value"]>("source-over");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

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

      setIsSwitchingCamera(true);

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
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const handleZoom = async (newZoom: number) => {
    // インカムの場合はズーム制御を無効化
    if (isFrontCamera) {
      console.log("インカムではズーム機能は利用できません");
      return;
    }

    if (!isZoomSupported) {
      console.log("ズーム機能はこのデバイスではサポートされていません");
      return;
    }

    // ズーム値を1.0から1.9の範囲に制限
    const clampedZoom = Math.max(1.0, Math.min(1.9, newZoom));
    setZoom(clampedZoom);

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        const capabilities = track.getCapabilities();
        if (capabilities.zoom) {
          // デバイスがサポートするズーム範囲を確認
          const minZoom = capabilities.zoom.min || 1.0;
          const maxZoom = Math.min(1.9, capabilities.zoom.max || 1.9);
          const deviceClampedZoom = Math.max(
            minZoom,
            Math.min(maxZoom, clampedZoom)
          );

          await track.applyConstraints({
            advanced: [{zoom: deviceClampedZoom}],
          });
        }
      } catch (error) {
        console.error("ズームの設定に失敗しました:", error);
        // ズーム設定に失敗した場合は、前の値に戻す
        setZoom(zoom);
      }
    }
  };

  const takePhoto = (canvas: HTMLCanvasElement) => {
    const imageData = canvas.toDataURL("image/png");
    setPreviewImage(imageData);
    setIsPreviewMode(true);
  };

  const downloadPhoto = () => {
    if (!previewImage) return;

    const link = document.createElement("a");
    link.download = `photo-${new Date().toISOString()}.png`;
    link.href = previewImage;
    link.click();
  };

  const backToCamera = () => {
    setPreviewImage(null);
    setIsPreviewMode(false);
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

  /* ---------- UI ---------- */
  return (
    <>
      <video ref={videoRef} style={{display: "none"}} playsInline muted />

      {isPreviewMode && previewImage ? (
        <PreviewScreen
          previewImage={previewImage}
          onBack={backToCamera}
          onDownload={downloadPhoto}
        />
      ) : (
        <>
          <CameraCanvas
            videoRef={videoRef}
            bitmaps={bitmaps}
            current={current}
            ready={ready}
            isPreviewMode={isPreviewMode}
            onTakePhoto={takePhoto}
            blendMode={blendMode}
            isSwitchingCamera={isSwitchingCamera}
          />

          <AudioReceiver
            onEffectDetected={setCurrent}
            availableEffects={EFFECTS.length}
          />

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
            <EffectSelector
              effects={EFFECTS}
              current={current}
              onChange={setCurrent}
            />

            <select
              value={blendMode}
              onChange={(e) => setBlendMode(e.target.value as typeof blendMode)}
              style={{
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: "white",
                color: "black",
              }}
            >
              {BLEND_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>

            <CameraControls
              hasMultipleCameras={hasMultipleCameras}
              isFrontCamera={isFrontCamera}
              onSwitchCamera={switchCamera}
              onTakePhoto={() =>
                canvasRef.current && takePhoto(canvasRef.current)
              }
            />

            {isZoomSupported && !isFrontCamera && (
              <ZoomControl zoom={zoom} onZoomChange={handleZoom} />
            )}
          </div>
        </>
      )}
    </>
  );
}
