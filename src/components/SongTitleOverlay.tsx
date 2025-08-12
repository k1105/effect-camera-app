import {useEffect, useState} from "react";
import indexInformation from "../../public/index_information.json";

export interface SongTitleOverlayProps {
  songId: number;
}

// index_information.jsonから曲名を取得する関数
const getSongTitle = (songId: number): string => {
  const songInfo = indexInformation.find((item) => item.index === songId);
  return songInfo ? songInfo.title_index : "";
};

// アニメーション用の文字セット
const GLITCH_CHARS = ["A", "S", "P"];

// テキストファイルを動的に読み込む関数
const loadTextFile = async (songTitle: string): Promise<string> => {
  try {
    // 曲名に対応するテキストファイルを読み込み
    const filePath = `/txt/${songTitle}.txt`;
    const response = await fetch(filePath);

    if (response.ok) {
      const text = await response.text();

      // Content-Typeをチェックして、HTMLが返された場合はフォールバック処理に移行
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error("HTML content returned instead of text file");
      }

      // ファイルサイズもチェック（HTMLエラーページは通常大きい）
      if (text.length > 1000) {
        // HTMLタグが含まれているかチェック
        if (
          text.includes("<html") ||
          text.includes("<body") ||
          text.includes("<!DOCTYPE")
        ) {
          throw new Error("HTML content detected, treating as missing file");
        }
      }

      return text;
    } else {
      console.log(
        `File ${songTitle}.txt not found (status: ${response.status})`
      );
    }
  } catch (error) {
    console.warn(`Failed to load text file for ${songTitle}:`, error);
  }

  try {
    const fallbackResponse = await fetch("/txt/tour_title.txt");

    if (fallbackResponse.ok) {
      const fallbackText = await fallbackResponse.text();
      // フォールバックファイルもHTMLが返された場合は最終フォールバックを使用
      const fallbackContentType = fallbackResponse.headers.get("content-type");
      if (fallbackContentType && fallbackContentType.includes("text/html")) {
        return "Tour Title"; // 最終的なフォールバック
      }

      return fallbackText;
    }
  } catch (error) {
    console.error("Failed to load fallback tour_title.txt:", error);
    return "Tour Title"; // 最終的なフォールバック
  }

  return "Tour Title";
};

export const SongTitleOverlay: React.FC<SongTitleOverlayProps> = ({songId}) => {
  const [showImage, setShowImage] = useState(false);
  const [glitchText, setGlitchText] = useState("");
  const [animationPhase, setAnimationPhase] = useState(0); // 0: flickering, 1: stable, 2: fade
  const [flickerOpacity, setFlickerOpacity] = useState(1);
  const [glitchIntensity, setGlitchIntensity] = useState(1); // グリッチの強度（1.0 → 0.0）

  // 曲名が取得できない場合は境界外とみなす
  const isOutOfBound = getSongTitle(songId) === "";

  // 曲名が変更されたときにテキストファイルを読み込む
  useEffect(() => {
    if (!isOutOfBound) {
      const songTitle = getSongTitle(songId);

      loadTextFile(songTitle).then((text) => {
        setGlitchText(text);
      });
    }
  }, [songId, isOutOfBound]);

  useEffect(() => {
    const cycle = () => {
      setShowImage(true);
      setAnimationPhase(0);
      setFlickerOpacity(1);
      setGlitchIntensity(1);
      // 初期化時にテキストをリセット（loadTextFileで更新される）
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
        let newText = glitchText;
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
  }, [animationPhase, glitchIntensity, glitchText]);

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
