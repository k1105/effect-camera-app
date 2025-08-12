import {useEffect, useMemo, useRef, useState} from "react";
import indexInformation from "../../public/index_information.json";

export interface SongTitleOverlayProps {
  songId: number;
}

const getSongTitle = (songId: number): string => {
  const songInfo = indexInformation.find((item) => item.index === songId);
  return songInfo ? songInfo.title_index : "";
};

const loadTextFile = async (songTitle: string): Promise<string> => {
  try {
    const filePath = `/txt/${songTitle}.txt`;
    const res = await fetch(filePath);
    if (res.ok) {
      const text = await res.text();
      const ct = res.headers.get("content-type");
      if (
        (ct && ct.includes("text/html")) ||
        /<!DOCTYPE|<html|<body/i.test(text)
      ) {
        throw new Error("HTML content detected");
      }
      return text;
    }
  } catch (e) {
    console.warn(`Failed to load ${songTitle}.txt`, e);
  }
  try {
    const fb = await fetch("/txt/tour_title.txt");
    if (fb.ok) {
      const text = await fb.text();
      const ct = fb.headers.get("content-type");
      if (ct && ct.includes("text/html")) return "Tour Title";
      return text;
    }
  } catch (e) {
    console.error("Failed to load fallback", e);
  }
  return "Tour Title";
};

// ===== 波 & フリップ演出パラメータ =====
const WAVE_AMPLITUDE_CH = 8; // 波の振幅（文字数）
const WAVE_FREQUENCY = 1.2; // 縦方向の波数
const WAVE_PHASE_SPEED = 2.0; // 波の進む速さ

const FLIP_BAND_CH = 10; // 前線から何文字ぶんを“パタパタ帯”にするか
const FLIP_RATE_HZ = 14; // パタパタ速度（Hz目安）
const FLIP_SET = ["A", "S", "P", "/", "\\", "|", "-", "+", "*"]; // █ 以外で巡回

export const SongTitleOverlay: React.FC<SongTitleOverlayProps> = ({songId}) => {
  const [rawText, setRawText] = useState<string>("");
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // 0: appear, 1: steady, 2: fade
  const [renderText, setRenderText] = useState<string>("");

  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const elapsedRef = useRef<number>(0);

  const isOutOfBound = getSongTitle(songId) === "";

  useEffect(() => {
    if (isOutOfBound) return;
    const title = getSongTitle(songId);
    loadTextFile(title).then(setRawText);
  }, [songId, isOutOfBound]);

  useEffect(() => {
    console.log(phase);
  }, [phase]);

  const lines = useMemo(
    () => rawText.replace(/\r\n/g, "\n").split("\n"),
    [rawText]
  );
  const maxLen = useMemo(
    () => lines.reduce((m, l) => Math.max(m, l.length), 0),
    [lines]
  );

  useEffect(() => {
    if (!rawText || isOutOfBound) return;

    setVisible(true);
    setPhase(0);
    startTimeRef.current = null;

    const tick = (t: number) => {
      if (startTimeRef.current == null) startTimeRef.current = t;
      const elapsed = (t - startTimeRef.current) / 1000;
      elapsedRef.current = elapsed;

      // フェーズ
      if (elapsed < 3) setPhase(0);
      else if (elapsed < 6) setPhase(1);
      else setPhase(2);

      const appearProgress = Math.min(1, Math.max(0, elapsed / 3)); // 0-3s
      const fadeProgress = Math.min(1, Math.max(0, (elapsed - 6) / 1)); // 6-7s
      const timePhase = elapsed * WAVE_PHASE_SPEED;
      const freq = Math.PI * 2 * WAVE_FREQUENCY;

      // パタパタ用の時刻インデックス（行・列で位相をずらす）
      const flipT = elapsed * FLIP_RATE_HZ;

      const out = lines
        .map((line, i) => {
          const lineRatio = lines.length > 1 ? i / (lines.length - 1) : 0;
          const wave = Math.sin(lineRatio * freq + timePhase);
          const amp = WAVE_AMPLITUDE_CH;

          let threshold: number;
          let band = FLIP_BAND_CH;

          if (elapsed < 3) {
            // 出現：左→右へ前線が進む
            const baseFront = appearProgress * (maxLen + amp);
            threshold = Math.floor(
              Math.min(maxLen, Math.max(0, baseFront + wave * amp))
            );
          } else if (elapsed < 6) {
            // 静止：全面表示、パタパタなし
            threshold = line.length;
            band = 0;
          } else {
            // アウト：右→左へ戻りつつ振幅を縮小
            const baseRetreat = (1 - fadeProgress) * (maxLen + amp);
            const ampScale = 1 - fadeProgress;
            threshold = Math.floor(
              Math.min(
                maxLen,
                Math.max(0, baseRetreat + wave * (amp * ampScale))
              )
            );
            // 消える縁でだけパタパタ
            band = Math.ceil(FLIP_BAND_CH * 0.8);
          }

          // 文字列を構築（= 重いspan分割なし）
          let row = "";
          const L = line.length;

          for (let col = 0; col < Math.max(L, threshold); col++) {
            const inSrc = col < L;
            const ch = inSrc ? line[col] : " ";

            if (col < threshold) {
              // 可視領域
              if (band > 0) {
                const distToEdge = threshold - 1 - col; // 前線からの距離（0が前線）
                if (distToEdge >= 0 && distToEdge < band) {
                  // パタパタ帯：█ 以外を巡回
                  if (ch !== "█") {
                    // 行・列・時間から決まる巡回インデックス（擬似ランダムだが毎フレーム連続）
                    const idx = Math.abs(
                      Math.floor(
                        (flipT + i * 0.37 + col * 0.13) % FLIP_SET.length
                      )
                    );
                    row += FLIP_SET[idx];
                    continue;
                  }
                }
              }
              // 通常表示
              row += inSrc ? ch : " ";
            } else {
              // 未表示領域はスペースで埋めてAAの幅を保つ
              row += " ";
            }
          }

          return row;
        })
        .join("\n");

      setRenderText(out);

      if (elapsed < 7) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setVisible(false);
        setPhase(0);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setVisible(false);
    };
  }, [rawText, isOutOfBound, maxLen, lines]);

  if (!visible || isOutOfBound) return null;

  // CSSは素のまま（装飾ナシ）
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1000,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <pre
        style={{
          whiteSpace: "pre",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          lineHeight: 1,
          fontSize: "0.8rem",
          color: "white",
          margin: 0,
        }}
      >
        {renderText}
      </pre>
    </div>
  );
};
