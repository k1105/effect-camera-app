import {useState, useEffect} from "react";
import tourTitle from "/txt/tour_title.txt?raw";

export const Countdown = ({startTime}: {startTime: number}) => {
  const [countdown, setCountdown] = useState(startTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(startTime - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.8)",
      }}
    >
      {/* ツアータイトルテキスト */}
      <pre
        style={{
          whiteSpace: "pre",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          lineHeight: 1,
          fontSize: "0.8rem",
          color: "white",
          textShadow: "0 0 10px rgba(255, 255, 255, 0.8)",
          margin: 0,
          textAlign: "center",
        }}
      >
        {tourTitle}
      </pre>

      {/* カウントダウンタイマー */}
      <div
        style={{
          marginTop: "2rem",
          fontSize: "2rem",
          fontWeight: "bold",
          color: "white",
          textShadow: "0 0 10px rgba(255, 255, 255, 0.8)",
        }}
      >
        {countdown > 0
          ? new Date(countdown).toISOString().slice(11, 19)
          : "00:00:00"}
      </div>
    </div>
  );
};
