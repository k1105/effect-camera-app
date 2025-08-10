import {useEffect, useRef, useState} from "react";
import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import {PreviewScreen} from "./components/PreviewScreen";
import {EffectSelector} from "./components/EffectSelector";

import {ZoomControl} from "./components/ZoomControl";
import {AudioReceiver} from "./components/AudioReceiver";
import {InitialScreen} from "./components/InitialScreen";
import {
  NewHamburgerMenu,
  type SignalLogEntry,
} from "./components/NewHamburgerMenu";
import type {CameraMode, LayoutMode} from "./components/HamburgerMenu";
import {loadEffectsFromSpriteSheet} from "./utils/spriteSheetLoader";
import {OnPerformance} from "./components/layout/OnPerformance";
import {BeginPerformance} from "./components/layout/BeginPerformance";
import {NoSignal} from "./components/layout/NoSignal";
import {isMobileDevice} from "./utils/deviceDetection";
import { CameraCanvas } from "./components/layers/CameraCanvas";

/* ---------- 定数 ---------- */
const NUM_EFFECTS = 8; // スプライトシートから8つのエフェクトを読み込み

function FullCameraApp() {
  /* ---------- Refs & State ---------- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const initedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const [bitmaps, setBitmaps] = useState<ImageBitmap[]>([]);
  const [current, setCurrent] = useState(-1); // 初期値は-1（エフェクトなし）
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isZoomSupported, setIsZoomSupported] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isNoSignalDetected, setIsNoSignalDetected] = useState(true); // 初期状態では信号なし
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [layout, setLayout] = useState<LayoutMode>("NoSignal");
  
  // エフェクト制御
  const [isBeginSong, setIsBeginSong] = useState(false);

  const [countdownDate, setCountdownDate] = useState("2025-08-10");
  const [countdownTime, setCountdownTime] = useState("00:00");
  const [halfTime, setHalfTime] = useState(15);
  const [startTime, setStartTime] = useState(new Date(`${countdownDate}T${countdownTime}:00`).getTime());
  const [ellapsedTime, setEllapsedTime] = useState(0);
  const isHalfTimeEllapsed = ellapsedTime > 60;

  setInterval(() => {
    setEllapsedTime(Math.floor((Date.now() - startTime) / 1000 / 60));
  }, 5000)

  // 新しいハンバーガーメニュー用のstate
  const [signalLog, setSignalLog] = useState<SignalLogEntry[]>([
    {timestamp: "2025-08-10 00:00:00", signal: "BEGIN"},
    {timestamp: "2025-08-10 00:00:00", signal: "FINISH"},
  ]);

  /* ---------- カメラ制御関数 ---------- */
  const checkZoomSupport = async () => {
    if (!streamRef.current) return false;
    const track = streamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    const supported = !!capabilities.zoom;
    setIsZoomSupported(supported);
    return supported;
  };

  const handleZoom = async (newZoom: number) => {
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

  const onBeginSignal = () => {
    setLayout("BeginPerformance");
    setIsBeginSong(true);
    setTimeout(() => {
      setLayout("OnPerformance");
      setIsBeginSong(false);
    }, 3000);
  }

  const onFinnishSignal = () => {
    setLayout("NoSignal");
  }

  const onNoSignal = () => {
    setLayout("NoSignal");
    setCurrent(-1);
  }

  const handleEffectDetected = (effectId: number) => {
    setIsNoSignalDetected(false);
    if (isBeginSong) return;
    if (effectId === 14) {
      onBeginSignal();
      return;
    }
    if (effectId === 15) {
      onFinnishSignal();
      return;
    }
    if(isHalfTimeEllapsed){
      setCurrent(effectId + 10);
      setLayout("OnPerformance");
      return
    }
    setCurrent(effectId);
    setLayout("OnPerformance");
  };

  const handleNoSignalDetected = () => {
    setIsNoSignalDetected(true);
  };

  const handleEffectChange = (effect: number) => {
    setCurrent(effect);
  };

  // 新しいハンバーガーメニュー用の関数
  const handleBeginSignal = () => {
    const timestamp = new Date().toLocaleTimeString();
    setSignalLog((prev) => [...prev, {timestamp, signal: "BEGIN"}]);
    onBeginSignal();
  };

  const handleFinishSignal = () => {
    const timestamp = new Date().toLocaleTimeString();
    setSignalLog((prev) => [...prev, {timestamp, signal: "FINISH"}]);
    onFinnishSignal();
  };

  const handleSimulatorIndexChange = (index: number) => {
    setCurrent(index);
  };

  // レイアウト名を表示用の文字列に変換
  const getLayoutDisplayName = (layout: LayoutMode): string => {
    switch (layout) {
      case "OnPerformance":
        return "OnPerformance";
      case "BeginPerformance":
        return "BeginPerformance";
      case "NoSignal":
        return "NoSignal";
      case "Countdown":
        return "Countdown";
      default:
        return "Unknown";
    }
  };

  // 権限要求関数
  const requestPermissions = async () => {
    try {
      console.log("権限要求開始");
      const width = isMobileDevice() ? 1920 : 1080;
      const height = isMobileDevice() ? 1080 : 1920;
      // 基本制約で権限を要求
      const constraints = {
        video: {
          facingMode: "environment",
          width: {ideal: width},
          height: {ideal: height},
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
      };

      console.log("使用する制約:", constraints);

      // カメラとマイクの許可を要求
      await navigator.mediaDevices.getUserMedia(constraints);

      console.log("権限が許可されました");
      setPermissionsGranted(true);
      setShowPermissionPrompt(false);

      // 権限が許可された後に初期化を実行
      await initializeCamera();
    } catch (error) {
      console.error("権限の取得に失敗しました:", error);

      // エラーの詳細をログ出力
      if (error instanceof Error) {
        console.error("エラー名:", error.name);
        console.error("エラーメッセージ:", error.message);
      }

      // より基本的な制約で再試行
      if (error instanceof Error && error.name === "NotAllowedError") {
        console.log("基本制約で再試行");
        try {
          const basicConstraints = {
            video: true,
            audio: true,
          };

          await navigator.mediaDevices.getUserMedia(basicConstraints);
          console.log("基本制約での権限取得に成功");
          setPermissionsGranted(true);
          setShowPermissionPrompt(false);
          await initializeCamera();
          return;
        } catch (retryError) {
          console.error("再試行も失敗:", retryError);
        }
      }

      setShowPermissionPrompt(false);
    }
  };

  // カメラ初期化関数
  const initializeCamera = async () => {
    try {
      /* -- a) カメラ -- */
      const width = isMobileDevice() ? 1920 : 1080;
      const height = isMobileDevice() ? 1080 : 1920;

      const cameraConstraints = {
        video: {
          facingMode: "environment",
          width: {ideal: width},
          height: {ideal: height},
          frameRate: {ideal: 30},
          zoom: zoom,
        },
      };

      console.log("カメラ初期化用制約:", cameraConstraints);

      const stream = await navigator.mediaDevices.getUserMedia(
        cameraConstraints
      );
      streamRef.current = stream;
      const vid = videoRef.current!;
      vid.srcObject = stream;

      // metadata が来てから play
      await new Promise<void>((res) => {
        vid.onloadedmetadata = () => res();
      });
      await vid.play();

      // ズーム機能のサポートを確認
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

    // 全てのブラウザで権限プロンプトを表示
    console.log("権限プロンプトを表示");
    setShowPermissionPrompt(true);

    /* -- クリーンアップ -- */
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // signal 
  useEffect(() => {
    if(isNoSignalDetected && !isBeginSong){
      onNoSignal();
    }
  }, [isNoSignalDetected])

  // time
  useEffect(() => {
    setStartTime(new Date(`${countdownDate}T${countdownTime}:00`).getTime());
  }, [countdownDate, countdownTime])

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
          <AudioReceiver
            onEffectDetected={handleEffectDetected}
            availableEffects={NUM_EFFECTS}
            onNoSignalDetected={handleNoSignalDetected}
            permissionsGranted={permissionsGranted}
          />

          {/* 初期画面 - 信号同期モードで信号が検出されていない時のみ表示 */}

          <CameraCanvas
            videoRef={videoRef}
            bitmaps={bitmaps}
            current={current}
            ready={ready}
            isNoSignalDetected={isNoSignalDetected}
            onEffectChange={handleEffectChange}
            numEffects={NUM_EFFECTS}
          />

          {layout === "OnPerformance" && (
            <OnPerformance
              current={current}
            />
          )}

          {layout === "BeginPerformance" && (
            <BeginPerformance
              songId={current}
            />
          )}

          {layout === "NoSignal" && (
            <NoSignal/>
          )}

          {!permissionsGranted && (
            <InitialScreen
              isVisible={isNoSignalDetected}
              onRequestPermissions={requestPermissions}
              showPermissionRequest={!permissionsGranted}
            />
          )}

          {/* ハンバーガーメニュー */}
          <NewHamburgerMenu
            currentState={getLayoutDisplayName(layout)}
            currentIndex={current}
            signalLog={signalLog}
            onBeginSignal={handleBeginSignal}
            onFinishSignal={handleFinishSignal}
            onIndexChange={handleSimulatorIndexChange}
            currentSimulatorIndex={current}
            countdownDate={countdownDate}
            countdownTime={countdownTime}
            halfTime={halfTime}
            onDateChange={setCountdownDate}
            onTimeChange={setCountdownTime}
            onHalfTimeChange={setHalfTime}
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

            {isZoomSupported && (
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
        </Routes>
      </div>
    </Router>
  );
}
