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
  const initedRef = useRef(false); // ★二重実行防止フラグ

  const [bitmaps, setBitmaps] = useState<ImageBitmap[]>([]);
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false); // video + effects 完了

  /* ---------- 1) カメラ & エフェクト初期化（初回のみ） ---------- */
  useEffect(() => {
    if (initedRef.current) return; // ← StrictMode の 2 回目を無視
    initedRef.current = true;

    (async () => {
      /* -- a) カメラ -- */
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: {ideal: 3840}, // 4K解像度
          height: {ideal: 2160},
          frameRate: {ideal: 30},
        },
      });
      const vid = videoRef.current!;
      vid.srcObject = stream;

      // metadata が来てから play
      await new Promise<void>((res) => {
        vid.onloadedmetadata = () => res();
      });
      await vid.play();

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
    })().catch((e) => console.error("Init failed:", e));

    /* -- クリーンアップ -- */
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
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
          justifyContent: "center",
          gap: "10px",
          zIndex: 1,
        }}
      >
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
    </>
  );
}
