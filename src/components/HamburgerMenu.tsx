import React, {useState} from "react";

export type CameraMode = "signal" | "manual";

interface HamburgerMenuProps {
  currentMode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  currentEffect: number;
  onEffectChange: (effect: number) => void;
  numEffects: number;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  currentMode,
  onModeChange,
  currentEffect,
  onEffectChange,
  numEffects,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleModeChange = (mode: CameraMode) => {
    onModeChange(mode);
    if (mode === "manual") {
      // 手動モードに切り替えた時はデフォルトエフェクトを0に設定
      onEffectChange(0);
    }
    setIsOpen(false);
  };

  const handleEffectChange = (effect: number) => {
    onEffectChange(effect);
  };

  return (
    <>
      {/* ハンバーガーメニューボタン */}
      <button
        onClick={toggleMenu}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          width: "50px",
          height: "50px",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          border: "2px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "8px",
          color: "white",
          fontSize: "24px",
          cursor: "pointer",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
        }}
      >
        ☰
      </button>

      {/* メニューオーバーレイ */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            zIndex: 999,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* メニューコンテンツ */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            right: "20px",
            width: "280px",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "12px",
            padding: "20px",
            zIndex: 1001,
            color: "white",
            backdropFilter: "blur(10px)",
          }}
        >
          <h3
            style={{margin: "0 0 20px 0", fontSize: "18px", fontWeight: "bold"}}
          >
            設定
          </h3>

          {/* モード選択 */}
          <div style={{marginBottom: "20px"}}>
            <h4 style={{margin: "0 0 10px 0", fontSize: "14px", opacity: 0.8}}>
              カメラモード
            </h4>
            <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
              <button
                onClick={() => handleModeChange("signal")}
                style={{
                  padding: "12px",
                  backgroundColor:
                    currentMode === "signal"
                      ? "#007AFF"
                      : "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  textAlign: "left",
                }}
              >
                📡 信号同期モード
                <div style={{fontSize: "12px", opacity: 0.7, marginTop: "4px"}}>
                  音声信号を受信してエフェクトを自動切り替え
                </div>
              </button>
              <button
                onClick={() => handleModeChange("manual")}
                style={{
                  padding: "12px",
                  backgroundColor:
                    currentMode === "manual"
                      ? "#007AFF"
                      : "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  borderRadius: "8px",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  textAlign: "left",
                }}
              >
                👆 手動切り替えモード
                <div style={{fontSize: "12px", opacity: 0.7, marginTop: "4px"}}>
                  画面タップでエフェクトを手動切り替え
                </div>
              </button>
            </div>
          </div>

          {/* 手動モード時のエフェクト選択 */}
          {currentMode === "manual" && (
            <div style={{marginBottom: "20px"}}>
              <h4
                style={{margin: "0 0 10px 0", fontSize: "14px", opacity: 0.8}}
              >
                エフェクト選択
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "8px",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {Array.from({length: numEffects}, (_, i) => (
                  <button
                    key={i}
                    onClick={() => handleEffectChange(i)}
                    style={{
                      padding: "8px",
                      backgroundColor:
                        currentEffect === i
                          ? "#007AFF"
                          : "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      borderRadius: "6px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "12px",
                      minHeight: "40px",
                    }}
                  >
                    エフェクト {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 現在の状態表示 */}
          <div
            style={{
              padding: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              fontSize: "12px",
              opacity: 0.8,
            }}
          >
            <div>
              現在のモード:{" "}
              {currentMode === "signal" ? "信号同期" : "手動切り替え"}
            </div>
            {currentMode === "manual" && (
              <div>現在のエフェクト: {currentEffect + 1}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
