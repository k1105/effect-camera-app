import {useEffect, useRef, useState} from "react";
import {AudioReceiver} from "./components/AudioReceiver";
import {InitialScreen} from "./components/InitialScreen";
import {
  NewHamburgerMenu,
  type SignalLogEntry,
} from "./components/NewHamburgerMenu";
import type {LayoutMode} from "./components/NewHamburgerMenu";
import {OnPerformance} from "./components/layout/OnPerformance";
import {BeginPerformance} from "./components/layout/BeginPerformance";
import {NoSignal} from "./components/layout/NoSignal";
import {isMobileDevice} from "./utils/deviceDetection";
import {CameraCanvas} from "./components/layers/CameraCanvas";
import {Countdown} from "./components/layout/Countdown";

/* ---------- 定数 ---------- */
const NUM_EFFECTS = 16;

function FullCameraApp() {
  /* ---------- Refs & State ---------- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const initedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const [current, setCurrent] = useState(-1); // 初期値は-1（エフェクトなし）
  const [ready, setReady] = useState(false);
  const [isNoSignalDetected, setIsNoSignalDetected] = useState(true); // 初期状態では信号なし
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [layout, setLayout] = useState<LayoutMode>("NoSignal");

  // エフェクト制御
  const isBeginingSongRef = useRef(false);
  const beginFlagRef = useRef(false);

  const [countdownDate, setCountdownDate] = useState("2025-08-10");
  const [countdownTime, setCountdownTime] = useState("00:00");
  const [halfTime, setHalfTime] = useState(15);
  const [startTime, setStartTime] = useState(
    new Date(`${countdownDate}T${countdownTime}:00`).getTime()
  );
  const [ellapsedTime, setEllapsedTime] = useState(0);
  const isHalfTimeEllapsed = ellapsedTime > 60;

  setInterval(() => {
    setEllapsedTime(Math.floor((Date.now() - startTime) / 1000 / 60));
  }, 5000);

  // 新しいハンバーガーメニュー用のstate
  const [signalLog, setSignalLog] = useState<SignalLogEntry[]>([]);

  const onBeginSignal = () => {
    if (!beginFlagRef.current && layout !== "Countdown") {
      setLayout("BeginPerformance");
      isBeginingSongRef.current = true;
      beginFlagRef.current = true;
      setTimeout(() => {
        // カウントダウン中でない場合のみレイアウト変更
        setLayout((currentLayout) =>
          currentLayout === "Countdown" ? "Countdown" : "OnPerformance"
        );
        isBeginingSongRef.current = false;
      }, 7000);
    }
  };

  const onFinnishSignal = () => {
    if (layout !== "Countdown") {
      setLayout("NoSignal");
    }
  };

  const onNoSignal = () => {
    if (layout !== "Countdown") {
      setLayout("NoSignal");
      setCurrent(-1);
    }
  };

  const handleEffectDetected = (effectId: number) => {
    setIsNoSignalDetected(false);
    if (isBeginingSongRef.current) return;
    if (layout === "Countdown") return; // カウントダウン中は何もしない
    if (effectId === 14) {
      onBeginSignal();
      return;
    }
    if (effectId === 15) {
      onFinnishSignal();
      return;
    }
    if (isHalfTimeEllapsed) {
      beginFlagRef.current = current !== effectId + 10 ? false : true;
      setCurrent(effectId + 10);
      setLayout("OnPerformance");
      return;
    }
    beginFlagRef.current = current !== effectId ? false : true;
    setCurrent(effectId);
    setLayout("OnPerformance");
  };

  const handleNoSignalDetected = () => {
    if (isBeginingSongRef.current) return;
    setIsNoSignalDetected(true);
  };

  const handleEffectChange = (effect: number) => {
    if (layout === "Countdown") return; // カウントダウン中は何もしない
    setCurrent(effect);
  };

  // 新しいハンバーガーメニュー用の関数
  const handleBeginSignal = () => {
    if (layout === "Countdown") return; // カウントダウン中は何もしない
    const timestamp = new Date().toLocaleTimeString();
    setSignalLog((prev) => [...prev, {timestamp, signal: "BEGIN"}]);
    onBeginSignal();
  };

  const handleFinishSignal = () => {
    if (layout === "Countdown") return; // カウントダウン中は何もしない
    const timestamp = new Date().toLocaleTimeString();
    setSignalLog((prev) => [...prev, {timestamp, signal: "FINISH"}]);
    onFinnishSignal();
  };

  const handleSimulatorIndexChange = (index: number) => {
    if (layout === "Countdown") return; // カウントダウン中は何もしない
    beginFlagRef.current = current !== index ? false : true;
    setCurrent(index);
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
    if (isNoSignalDetected && !isBeginingSongRef) {
      onNoSignal();
    }
  }, [isNoSignalDetected]);

  // time
  useEffect(() => {
    setStartTime(new Date(`${countdownDate}T${countdownTime}:00`).getTime());
  }, [countdownDate, countdownTime]);

  // カウントダウン完了チェック（1秒ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() >= startTime && layout === "Countdown") {
        setLayout("NoSignal");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, layout]);

  // カウントダウン開始時の処理
  useEffect(() => {
    if (Date.now() < startTime) {
      setLayout("Countdown");
    }
  }, [startTime]);

  useEffect(() => {
    console.log(layout);
  }, [layout]);

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

      <>
        <AudioReceiver
          onEffectDetected={handleEffectDetected}
          availableEffects={NUM_EFFECTS}
          onNoSignalDetected={handleNoSignalDetected}
          permissionsGranted={permissionsGranted}
        />

        {/* 初期画面 - 信号同期モードで信号が検出されていない時のみ表示 */}

        {layout === "Countdown" ? (
          <Countdown startTime={startTime} />
        ) : (
          <>
            <CameraCanvas
              videoRef={videoRef}
              current={current}
              ready={ready}
              isNoSignalDetected={isNoSignalDetected}
              onEffectChange={handleEffectChange}
            />

            {layout === "OnPerformance" && <OnPerformance current={current} />}

            {layout === "BeginPerformance" && (
              <BeginPerformance songId={current} />
            )}

            {layout === "NoSignal" && <NoSignal />}
          </>
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
          currentState={layout}
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
      </>
    </>
  );
}

export default function App() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <FullCameraApp />
    </div>
  );
}
