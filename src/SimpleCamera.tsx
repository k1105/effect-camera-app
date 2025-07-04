import {useEffect, useRef, useState} from "react";
import {openDB} from "idb";
import {CameraCanvas} from "./components/CameraCanvas";
import {AudioReceiver} from "./components/AudioReceiver";

/* ---------- 定数 ---------- */
const DB_NAME = "effects-db";
const STORE = "effects";
const EFFECTS = ["effect1", "effect2"]; // public/assets/effect?.png

export default function SimpleCamera() {
  /* ---------- Refs & State ---------- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const initedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const [bitmaps, setBitmaps] = useState<ImageBitmap[]>([]);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);
  const [blendMode] = useState<"source-over">("source-over");

  /* ---------- 1) カメラ & エフェクト初期化（初回のみ） ---------- */
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;

    console.log("SimpleCamera: 初期化開始");

    (async () => {
      try {
        /* -- a) カメラ -- */
        console.log("SimpleCamera: カメラアクセス要求中...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: {ideal: 3840},
            height: {ideal: 2160},
            frameRate: {ideal: 30},
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
        console.log("SimpleCamera: カメラ初期化完了");

        /* -- b) エフェクト画像 -- */
        console.log("SimpleCamera: エフェクト画像読み込み中...");
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
      <video ref={videoRef} style={{display: "none"}} playsInline muted />

      <CameraCanvas
        videoRef={videoRef}
        bitmaps={bitmaps}
        current={current}
        ready={ready}
        isPreviewMode={false}
        onTakePhoto={() => {}} // 空の関数
        blendMode={blendMode}
        isSwitchingCamera={false}
      />

      <AudioReceiver
        onEffectDetected={(effectId) => {
          console.log(`SimpleCamera: エフェクト ${effectId} に切り替え`);
          setCurrent(effectId);
        }}
        availableEffects={EFFECTS.length}
      />
    </div>
  );
}
