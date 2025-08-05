import {useEffect, useRef, useState} from "react";
import {CameraCanvas} from "./components/CameraCanvas";
import {AudioReceiver} from "./components/AudioReceiver";
import {InitialScreen} from "./components/InitialScreen";
import {loadEffectsFromSpriteSheet} from "./utils/spriteSheetLoader";

/* ---------- 定数 ---------- */
const NUM_EFFECTS = 8; // スプライトシートから8つのエフェクトを読み込み

export default function SimpleCamera() {
  /* ---------- Refs & State ---------- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const initedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const [bitmaps, setBitmaps] = useState<ImageBitmap[]>([]);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [blendMode] = useState<"source-over">("source-over");
  const [isNoSignalDetected, setIsNoSignalDetected] = useState(true);

  /* ---------- 1) カメラ & エフェクト初期化（初回のみ） ---------- */
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    console.log("SimpleCamera: 初期化開始");

    (async () => {
      try {
        /* -- a) カメラ -- */
        console.log("SimpleCamera: カメラアクセス要求中...");

        const cameraConstraints = {
          video: {
            facingMode: "environment",
            width: {ideal: 3840},
            height: {ideal: 2160},
            frameRate: {ideal: 30},
          },
        };

        console.log("SimpleCamera: 使用する制約:", cameraConstraints);

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
        console.log("SimpleCamera: カメラ初期化完了");

        /* -- b) エフェクト画像 -- */
        console.log(
          "SimpleCamera: スプライトシートからエフェクト読み込み中..."
        );
        const imgs = await loadEffectsFromSpriteSheet();
        setBitmaps(imgs);
        setReady(true);
        console.log("SimpleCamera: エフェクト画像読み込み完了");
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
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        backgroundColor: "#000",
      }}
    >
      <video
        ref={videoRef}
        style={{display: "none"}}
        playsInline
        muted
        autoPlay
      />

      <CameraCanvas
        videoRef={videoRef}
        bitmaps={bitmaps}
        current={current}
        ready={ready}
        isPreviewMode={false}
        blendMode={blendMode}
        isNoSignalDetected={isNoSignalDetected}
      />

      <AudioReceiver
        onEffectDetected={(effectId) => {
          console.log(`SimpleCamera: エフェクト ${effectId} に切り替え`);
          setCurrent(effectId);
          setIsNoSignalDetected(false);
        }}
        availableEffects={NUM_EFFECTS}
        onNoSignalDetected={() => setIsNoSignalDetected(true)}
        permissionsGranted={true} // SimpleCameraPageで権限が許可された後にマウントされるため
      />

      <InitialScreen isVisible={isNoSignalDetected} />
    </div>
  );
}
