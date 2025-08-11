import {useEffect, useState} from "react";
import sexualConversation from "/txt/tour-title.txt?raw";

export interface SongTitleOverlayProps {
  songId: number;
}

const NUM_SONGS = 18;

const songTitleMap = new Map();

songTitleMap.set(-1, "");
songTitleMap.set(0, "toxic_invasion");

songTitleMap.set(1, "black_nails");
songTitleMap.set(2, "no_colors");
songTitleMap.set(3, "totsugeki");
songTitleMap.set(4, "make_a_move");
songTitleMap.set(5, "I-wont-let-you-go");

songTitleMap.set(6, "darma");
songTitleMap.set(7, "");
songTitleMap.set(8, "sexual_conversation");
songTitleMap.set(9, "tokyo_sky_blues");
songTitleMap.set(10, "please");

songTitleMap.set(11, "anyway");
songTitleMap.set(12, "I-hate-u");
songTitleMap.set(13, "blueberry_gum");
songTitleMap.set(14, "heavens_seven");
songTitleMap.set(15, "");

songTitleMap.set(16, "too_young_to_get_it_too_fast_to_live");
songTitleMap.set(17, "gtoer_cracker");

// アニメーション用の文字セット
const GLITCH_CHARS = ["A", "S", "P"];

export const SongTitleOverlay: React.FC<SongTitleOverlayProps> = ({songId}) => {
  const [showImage, setShowImage] = useState(false);
  const [glitchText, setGlitchText] = useState(sexualConversation);
  const [animationPhase, setAnimationPhase] = useState(0); // 0: flickering, 1: stable, 2: fade
  const [flickerOpacity, setFlickerOpacity] = useState(1);
  const [glitchIntensity, setGlitchIntensity] = useState(1); // グリッチの強度（1.0 → 0.0）

  const isOutOfBound =
    songId < 0 || songId >= NUM_SONGS || songTitleMap.get(songId) === "";

  useEffect(() => {
    const cycle = () => {
      setShowImage(true);
      setAnimationPhase(0);
      setFlickerOpacity(1);
      setGlitchIntensity(1);
      setGlitchText(sexualConversation); // 初期化時にリセット
      // フェーズ1: 3秒でフリッキングしながら徐々に安定
      const flickerInterval = setInterval(() => {
        setFlickerOpacity(() => {
          const timeProgress = (Date.now() % 3000) / 3000; // 0-1の進行度
          const baseOpacity = 0.3 + timeProgress * 0.7; // 0.3 → 1.0
          const randomFlicker = Math.random() * 0.3 * (1 - timeProgress); // 徐々に減少
          return baseOpacity + randomFlicker;
        });
      }, 50);

      // グリッチ強度を徐々に下げる
      const glitchInterval = setInterval(() => {
        setGlitchIntensity(() => {
          const timeProgress = (Date.now() % 3000) / 3000;
          return Math.max(0, 1 - timeProgress); // 1.0 → 0.0
        });
      }, 100);

      // フェーズ2: 3秒間の安定表示
      setTimeout(() => {
        setAnimationPhase(1);
        setFlickerOpacity(1);
        setGlitchIntensity(0);
        clearInterval(flickerInterval);
        clearInterval(glitchInterval);
      }, 3000);

      // フェーズ3: 1秒でフェードアウト
      setTimeout(() => {
        setShowImage(false);
      }, 7000);
    };

    cycle();
    const interval = setInterval(cycle, 7000);

    return () => {
      clearInterval(interval);
      setShowImage(false);
    };
  }, [songId]);

  // グリッチ効果（フェーズ1のみ、強度に応じて減少）
  useEffect(() => {
    if (animationPhase === 0 && glitchIntensity > 0) {
      const glitchInterval = setInterval(() => {
        // 毎回初期状態から開始（前回の変更をリセット）
        let newText = sexualConversation;
        const maxGlitchCount = Math.floor(30 * glitchIntensity); // 強度に応じて減少（20 → 30に増加）
        const glitchCount = Math.floor(Math.random() * maxGlitchCount) + 1;

        for (let i = 0; i < glitchCount; i++) {
          // █の文字を探して、glitchIntensityに基づいて確率的に置換
          const blockCharIndexes: number[] = [];
          for (let j = 0; j < newText.length; j++) {
            if (newText[j] === "█") {
              blockCharIndexes.push(j);
            }
          }

          if (blockCharIndexes.length > 0) {
            // glitchIntensityに基づいて置き換える█の数を決定
            // 開始時は90%の█を置き換え、徐々に0%に
            const replaceRatio = glitchIntensity * 0.9; // 最大90%の比率
            const replaceCount = Math.floor(
              blockCharIndexes.length * replaceRatio
            );

            if (replaceCount > 0) {
              // 置き換える█のインデックスをランダムに選択
              const shuffledIndexes = [...blockCharIndexes].sort(
                () => Math.random() - 0.5
              );
              const indexesToReplace = shuffledIndexes.slice(0, replaceCount);

              // 選択されたインデックスの█を置き換え
              for (const index of indexesToReplace) {
                const randomChar =
                  GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
                newText =
                  newText.slice(0, index) +
                  randomChar +
                  newText.slice(index + 1);
              }
            }
          }

          // 従来のランダム文字置換も残す（ただし強度を下げる）
          if (Math.random() < glitchIntensity * 0.2) {
            const randomIndex = Math.floor(Math.random() * newText.length);
            const randomChar =
              GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
            newText =
              newText.slice(0, randomIndex) +
              randomChar +
              newText.slice(randomIndex + 1);
          }
        }

        setGlitchText(newText);
      }, 50); // 更新頻度を大幅に上げる（100ms → 50ms）

      return () => clearInterval(glitchInterval);
    }
  }, [animationPhase, glitchIntensity]);

  if (!showImage || isOutOfBound) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1000,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          transform: `translate(${
            animationPhase === 0
              ? (Math.random() - 0.5) * 2 * glitchIntensity
              : 0
          }px, ${
            animationPhase === 0
              ? (Math.random() - 0.5) * 2 * glitchIntensity
              : 0
          }px)`,
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
            textShadow: "0 0 10px rgba(255, 255, 255, 0.8)",
            opacity: flickerOpacity,
            transition: animationPhase === 1 ? "all 0.5s ease" : "none",
          }}
        >
          {glitchText}
        </pre>

        {/* グリッチ効果の重ね合わせ（フェーズ1のみ、強度に応じて減少） */}
        {animationPhase === 0 && glitchIntensity > 0.1 && (
          <pre
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              whiteSpace: "pre",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              lineHeight: 1,
              fontSize: "8px",
              color: "rgba(255, 255, 255, 0.6)",
              opacity: glitchIntensity * 0.5,
              transform: `translate(${
                (Math.random() - 0.5) * 3 * glitchIntensity
              }px, ${(Math.random() - 0.5) * 3 * glitchIntensity}px)`,
              pointerEvents: "none",
            }}
          >
            {glitchText}
          </pre>
        )}
      </div>
    </div>
  );
};
