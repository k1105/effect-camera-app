import {useEffect, useState} from "react";
import aspLogo from "../assets/asp-logo.png";

interface InitialScreenProps {
  isVisible: boolean;
}

export const InitialScreen: React.FC<InitialScreenProps> = ({isVisible}) => {
  const [logoScale, setLogoScale] = useState(1);
  const [logoOpacity, setLogoOpacity] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);
  const [pulseOpacity, setPulseOpacity] = useState(0);

  // アニメーション効果
  useEffect(() => {
    if (isVisible) {
      // ロゴのフェードインとスケールアニメーション
      setLogoOpacity(0);
      setLogoScale(0.8);

      setTimeout(() => {
        setLogoOpacity(1);
        setLogoScale(1);
      }, 100);

      // テキストのフェードイン
      setTimeout(() => {
        setTextOpacity(1);
      }, 800);

      // パルス効果の開始
      setTimeout(() => {
        setPulseOpacity(1);
      }, 1200);
    } else {
      // フェードアウト
      setLogoOpacity(0);
      setTextOpacity(0);
      setPulseOpacity(0);
      setLogoScale(0.8);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      {/* 背景のグラデーション効果 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "radial-gradient(circle at center, #1a1a1a 0%, #000 70%)",
          opacity: 0.8,
        }}
      />

      {/* パルス効果 */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          animation:
            pulseOpacity > 0 ? "pulse 2s ease-in-out infinite" : "none",
          opacity: pulseOpacity,
        }}
      />

      {/* メインコンテンツ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          textAlign: "center",
        }}
      >
        {/* ASPロゴ */}
        <div
          style={{
            position: "relative",
            marginBottom: "40px",
            transform: `scale(${logoScale})`,
            transition: "all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            opacity: logoOpacity,
          }}
        >
          <img
            src={aspLogo}
            alt="ASP Logo"
            style={{
              width: "200px",
              height: "200px",
              filter: "drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))",
            }}
          />

          {/* ロゴの光沢効果 */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "220px",
              height: "220px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
              animation: "rotate 10s linear infinite",
            }}
          />
        </div>

        {/* 信号待機インジケーター */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "30px",
            opacity: textOpacity,
            transition: "opacity 1s ease-in-out",
          }}
        >
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#fff",
                animation: `signalPulse 1.5s ease-in-out infinite ${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* 説明テキスト */}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            opacity: textOpacity * 0.7,
            transition: "opacity 1s ease-in-out",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#888",
              margin: "0",
              lineHeight: "1.4",
              maxWidth: "300px",
            }}
          >
            音声信号を受信すると
            <br />
            リアルタイムでエフェクトが適用されます
          </p>
        </div>
      </div>

      {/* CSS アニメーション */}
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.3;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.1);
              opacity: 0.1;
            }
            100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.3;
            }
          }

          @keyframes rotate {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes signalPulse {
            0%, 100% {
              opacity: 0.3;
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(1.2);
            }
          }
        `}
      </style>
    </div>
  );
};
