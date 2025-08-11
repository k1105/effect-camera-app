import React, {useState, useEffect} from "react";

export type LayoutMode =
  | "OnPerformance"
  | "BeginPerformance"
  | "NoSignal"
  | "Countdown";

export interface SignalLogEntry {
  timestamp: string;
  signal: string;
}

export interface NewHamburgerMenuProps {
  // Current State
  currentState: string;
  currentIndex: number;

  // Signal Log
  signalLog: SignalLogEntry[];

  // Signal Simulator
  onBeginSignal: () => void;
  onFinishSignal: () => void;
  onIndexChange: (index: number) => void;
  currentSimulatorIndex: number;

  // Countdown Timer
  countdownDate: string;
  countdownTime: string;
  halfTime: number;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onHalfTimeChange: (halfTime: number) => void;
}

export const NewHamburgerMenu: React.FC<NewHamburgerMenuProps> = ({
  currentState,
  currentIndex,
  signalLog,
  onBeginSignal,
  onFinishSignal,
  onIndexChange,
  currentSimulatorIndex,
  countdownDate,
  countdownTime,
  halfTime,
  onDateChange,
  onTimeChange,
  onHalfTimeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  // ローカル状態としてシミュレーター用のインデックスを管理
  const [localSimulatorIndex, setLocalSimulatorIndex] = useState(
    currentSimulatorIndex
  );

  // currentSimulatorIndexが変更されたときにローカル状態を更新
  useEffect(() => {
    setLocalSimulatorIndex(currentSimulatorIndex);
  }, [currentSimulatorIndex]);

  // セレクトボックスの変更ハンドラー
  const handleIndexChange = (newIndex: number) => {
    setLocalSimulatorIndex(newIndex);
  };

  // Sendボタンのハンドラー
  const handleSendIndex = () => {
    onIndexChange(localSimulatorIndex);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
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
            zIndex: 999,
          }}
          onClick={closeMenu}
        />
      )}

      {/* メニューコンテンツ */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            right: "20px",
            width: "320px",
            height: "700px",
            overflowY: "auto",
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
            style={{
              margin: "0 0 20px 0",
              fontSize: "18px",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Control Panel
          </h3>

          {/* Current State Section */}
          <div style={{marginBottom: "25px"}}>
            <h4
              style={{
                margin: "0 0 15px 0",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#007AFF",
              }}
            >
              Current State
            </h4>
            <div
              style={{
                padding: "15px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <div style={{marginBottom: "8px"}}>{currentState}</div>
              <div style={{fontSize: "14px", opacity: 0.8}}>
                index: {currentIndex}
              </div>
            </div>
          </div>

          {/* Received Signal Log Section */}
          <div style={{marginBottom: "25px"}}>
            <h4
              style={{
                margin: "0 0 15px 0",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#007AFF",
              }}
            >
              Received Signal Log
            </h4>
            <div
              style={{
                maxHeight: "150px",
                overflowY: "auto",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "8px",
                padding: "10px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {signalLog.length === 0 ? (
                <div style={{opacity: 0.6, fontSize: "14px"}}>
                  No signals received
                </div>
              ) : (
                signalLog.reverse().map((entry, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "8px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      fontSize: "14px",
                    }}
                  >
                    <span style={{opacity: 0.7}}>{entry.timestamp}</span>
                    <span style={{marginLeft: "10px"}}>{entry.signal}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Signal Simulator Section */}
          <div style={{marginBottom: "25px"}}>
            <h4
              style={{
                margin: "0 0 15px 0",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#007AFF",
              }}
            >
              Signal Simulator
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              {/* BEGIN/FINISH Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                }}
              >
                <button
                  onClick={onBeginSignal}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#28a745",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#218838";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#28a745";
                  }}
                >
                  BEGIN
                </button>
                <button
                  onClick={onFinishSignal}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "#dc3545",
                    border: "none",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#c82333";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#dc3545";
                  }}
                >
                  FINISH
                </button>
              </div>

              {/* Index Selector */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <label
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    minWidth: "60px",
                  }}
                >
                  Index:
                </label>
                <select
                  value={localSimulatorIndex}
                  onChange={(e) => handleIndexChange(Number(e.target.value))}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  {Array.from({length: 10}, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSendIndex}
                  style={{
                    padding: "8px 12px",
                    backgroundColor: "#007AFF",
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Countdown Timer Section */}
          <div style={{marginBottom: "20px"}}>
            <h4
              style={{
                margin: "0 0 15px 0",
                fontSize: "16px",
                fontWeight: "bold",
                color: "#007AFF",
              }}
            >
              Countdown Timer
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <label
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    minWidth: "50px",
                  }}
                >
                  Date:
                </label>
                <input
                  type="date"
                  value={countdownDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <label
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    minWidth: "50px",
                  }}
                >
                  Time:
                </label>
                <input
                  type="time"
                  value={countdownTime}
                  onChange={(e) => onTimeChange(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <label
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    minWidth: "50px",
                  }}
                >
                  Half Time (min):
                </label>
                <input
                  type="number"
                  min="0"
                  value={halfTime}
                  onChange={(e) => onHalfTimeChange(Number(e.target.value))}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "6px",
                    color: "white",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={closeMenu}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              color: "white",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.1)";
            }}
          >
            Close
          </button>
        </div>
      )}
    </>
  );
};
