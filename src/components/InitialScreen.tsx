import {useEffect, useState} from "react";
import aspLogo from "../assets/asp-logo.png";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InitialScreenProps {
  isVisible: boolean;
  onRequestPermissions?: () => void;
  showPermissionRequest?: boolean;
}

export const InitialScreen: React.FC<InitialScreenProps> = ({
  isVisible,
  onRequestPermissions,
  showPermissionRequest = false,
}) => {
  const [logoScale, setLogoScale] = useState(1);
  const [logoOpacity, setLogoOpacity] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);
  const [pulseOpacity, setPulseOpacity] = useState(0);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // PWAインストールプロンプトの処理
  useEffect(() => {
    // PWAが既にインストールされているかチェック
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as {standalone?: boolean}).standalone ===
        true
    ) {
      setIsInstalled(true);
      return;
    }

    // beforeinstallpromptイベントをリッスン
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // 少し遅延させてからプロンプトを表示
      setTimeout(() => setShowInstallPrompt(true), 1000);
    };

    // appinstalledイベントをリッスン
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("PWAがインストールされました");
      setIsInstalled(true);
    } else {
      console.log("PWAのインストールがキャンセルされました");
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

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
            bottom:
              showPermissionRequest || showInstallPrompt ? "200px" : "60px",
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

      {/* 権限要求UI */}
      {showPermissionRequest && onRequestPermissions && (
        <div
          style={{
            position: "absolute",
            bottom: showInstallPrompt ? "120px" : "60px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            maxWidth: "320px",
            width: "90%",
            zIndex: 3,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              📹
            </div>
            <div>
              <h3
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "16px",
                  color: "#fff",
                  fontWeight: "600",
                }}
              >
                カメラとマイクの許可
              </h3>
              <p
                style={{
                  margin: "0",
                  fontSize: "14px",
                  color: "#ccc",
                  lineHeight: "1.4",
                }}
              >
                このサイトではカメラとマイクを使用します
              </p>
            </div>
          </div>
          <button
            onClick={onRequestPermissions}
            style={{
              width: "100%",
              backgroundColor: "#007AFF",
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0056CC";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#007AFF";
            }}
          >
            許可する
          </button>
        </div>
      )}

      {/* PWAインストール促進UI */}
      {showInstallPrompt && !isInstalled && (
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            maxWidth: "320px",
            width: "90%",
            zIndex: 3,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              📱
            </div>
            <div>
              <h3
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "16px",
                  color: "#fff",
                  fontWeight: "600",
                }}
              >
                アプリをインストール
              </h3>
              <p
                style={{
                  margin: "0",
                  fontSize: "14px",
                  color: "#ccc",
                  lineHeight: "1.4",
                }}
              >
                ホーム画面に追加して、より快適に使用できます
              </p>
            </div>
          </div>
          <div style={{display: "flex", gap: "8px"}}>
            <button
              onClick={handleInstallClick}
              style={{
                flex: 1,
                backgroundColor: "#007AFF",
                color: "white",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#0056CC";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#007AFF";
              }}
            >
              インストール
            </button>
            <button
              onClick={() => setShowInstallPrompt(false)}
              style={{
                backgroundColor: "transparent",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                padding: "12px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
              }}
            >
              後で
            </button>
          </div>
        </div>
      )}

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
