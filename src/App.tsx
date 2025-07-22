import {useEffect, useRef, useState} from "react";
import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import {CameraControls} from "./components/CameraControls";
import {PreviewScreen} from "./components/PreviewScreen";
import {EffectSelector} from "./components/EffectSelector";
import {ZoomControl} from "./components/ZoomControl";
import {CameraCanvas} from "./components/CameraCanvas";
import {AudioReceiver} from "./components/AudioReceiver";
import {InitialScreen} from "./components/InitialScreen";
import {HamburgerMenu, type CameraMode} from "./components/HamburgerMenu";
import SimpleCameraPage from "./pages/SimpleCameraPage";
import {loadEffectsFromSpriteSheet} from "./utils/spriteSheetLoader";
import {isIOSBrowser} from "./utils/deviceDetection";

/* ---------- 定数 ---------- */
const NUM_EFFECTS = 8; // スプライトシートから8つのエフェクトを読み込み

const BLEND_MODES = [
  {value: "source-over", label: "通常"},
  {value: "multiply", label: "乗算"},
  {value: "screen", label: "スクリーン"},
  {value: "overlay", label: "オーバーレイ"},
  {value: "soft-light", label: "ソフトライト"},
  {value: "hard-light", label: "ハードライト"},
] as const;

function FullCameraApp() {
  /* ---------- Refs & State ---------- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const initedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const [bitmaps, setBitmaps] = useState<ImageBitmap[]>([]);
  const [current, setCurrent] = useState(-1); // 初期値は-1（エフェクトなし）
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
  const [isNoSignalDetected, setIsNoSignalDetected] = useState(true); // 初期状態では信号なし
  const [cameraMode, setCameraMode] = useState<CameraMode>("signal"); // デフォルトは信号同期モード
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

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

  const handleEffectDetected = (effectId: number) => {
    // 信号同期モードの場合のみエフェクトを切り替え
    if (cameraMode === "signal") {
      setCurrent(effectId);
      setIsNoSignalDetected(false); // エフェクトが検出されたら信号なし状態を解除
    }
  };

  const handleNoSignalDetected = () => {
    // 信号同期モードの場合のみ信号なし状態を設定
    if (cameraMode === "signal") {
      setIsNoSignalDetected(true); // 信号が検出されていない状態に設定
    }
  };

  const handleModeChange = (mode: CameraMode) => {
    setCameraMode(mode);
    if (mode === "manual") {
      // 手動モードに切り替えた時はデフォルトエフェクトを0に設定
      setCurrent(0);
      setIsNoSignalDetected(false); // 手動モードでは信号なし状態を解除
    } else {
      // 信号同期モードに切り替えた時は初期状態に戻す
      setCurrent(-1);
      setIsNoSignalDetected(true);
    }
  };

  const handleEffectChange = (effect: number) => {
    setCurrent(effect);
  };

  // 権限要求関数
  const requestPermissions = async () => {
    try {
      console.log("権限要求開始");
      // カメラとマイクの許可を要求
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: {ideal: 3840},
          height: {ideal: 2160},
          frameRate: {ideal: 30},
          zoom: zoom,
        },
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      console.log("権限が許可されました");
      setPermissionsGranted(true);
      setShowPermissionPrompt(false);

      // 権限が許可された後に初期化を実行
      await initializeCamera();
    } catch (error) {
      console.error("権限の取得に失敗しました:", error);
      setShowPermissionPrompt(false);
    }
  };

  // カメラ初期化関数
  const initializeCamera = async () => {
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
      console.log("FullCameraApp: スプライトシートからエフェクト読み込み中...");
      const imgs = await loadEffectsFromSpriteSheet();
      setBitmaps(imgs);
      setReady(true);
    } catch (error) {
      console.error("カメラ初期化に失敗しました:", error);
    }
  };

  /* ---------- 1) カメラ & エフェクト初期化（初回のみ） ---------- */
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    // iOSブラウザの場合は権限プロンプトを表示
    if (isIOSBrowser()) {
      console.log("iOSブラウザを検出: 権限プロンプトを表示");
      setShowPermissionPrompt(true);
    } else {
      // その他のブラウザでは従来通り自動初期化
      (async () => {
        try {
          await initializeCamera();
        } catch (error) {
          console.error("Init failed:", error);
        }
      })();
    }

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
      <video
        ref={videoRef}
        style={{display: "none"}}
        playsInline
        muted
        autoPlay
      />

      {/* 権限要求プロンプト */}
      {showPermissionPrompt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              borderRadius: "10px",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <h2 style={{marginBottom: "20px", color: "#333"}}>
              カメラとマイクの許可が必要です
            </h2>
            <p style={{marginBottom: "30px", color: "#666", lineHeight: "1.5"}}>
              このアプリケーションではカメラとマイクを使用します。
              <br />
              それぞれ許可してください。
            </p>
            <button
              onClick={requestPermissions}
              style={{
                padding: "12px 24px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              許可する
            </button>
          </div>
        </div>
      )}

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
            blendMode={blendMode}
            isSwitchingCamera={isSwitchingCamera}
            isNoSignalDetected={isNoSignalDetected}
            cameraMode={cameraMode}
            onEffectChange={handleEffectChange}
            numEffects={NUM_EFFECTS}
          />

          <AudioReceiver
            onEffectDetected={handleEffectDetected}
            availableEffects={NUM_EFFECTS}
            onNoSignalDetected={handleNoSignalDetected}
            permissionsGranted={permissionsGranted}
          />

          {/* 初期画面 - 信号同期モードで信号が検出されていない時のみ表示 */}
          <InitialScreen
            isVisible={cameraMode === "signal" && isNoSignalDetected}
            onRequestPermissions={requestPermissions}
            showPermissionRequest={isIOSBrowser() && !permissionsGranted}
          />

          {/* ハンバーガーメニュー */}
          <HamburgerMenu
            currentMode={cameraMode}
            onModeChange={handleModeChange}
            currentEffect={current}
            onEffectChange={handleEffectChange}
            numEffects={NUM_EFFECTS}
          />

          <div
            className="controls"
            style={{
              position: "fixed",
              bottom: 20,
              left: 0,
              right: 0,
              display: "none",
              pointerEvents: "none",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              zIndex: 1,
            }}
          >
            <EffectSelector
              effects={Array.from(
                {length: NUM_EFFECTS},
                (_, i) => `effect${i + 1}`
              )}
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

export default function App() {
  return (
    <Router>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Routes>
          <Route path="/" element={<FullCameraApp />} />
          <Route path="/simple" element={<SimpleCameraPage />} />
        </Routes>
      </div>
    </Router>
  );
}
