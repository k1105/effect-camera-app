import {useState, useEffect} from "react";
import SimpleCamera from "../SimpleCamera";
import {isIOSBrowser} from "../utils/deviceDetection";

export default function SimpleCameraPage() {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const requestPermissions = async () => {
    try {
      // カメラとマイクの許可を要求
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setPermissionsGranted(true);
      setShowPermissionModal(false);
    } catch (error) {
      console.error("権限の取得に失敗しました:", error);
      // エラーが発生してもモーダルを閉じる（ユーザーが拒否した場合など）
      setShowPermissionModal(false);
    }
  };

  // 権限が許可された後にSimpleCameraをマウント
  useEffect(() => {
    if (permissionsGranted) {
      console.log(
        "SimpleCameraPage: 権限が許可されました。SimpleCameraをマウントします。"
      );
    }
  }, [permissionsGranted]);

  // iOSブラウザの場合は権限プロンプトを表示
  useEffect(() => {
    if (isIOSBrowser()) {
      console.log("iOSブラウザを検出: 権限プロンプトを表示");
      setShowPermissionModal(true);
    } else {
      // その他のブラウザでは従来通り自動的に権限を要求
      requestPermissions();
    }
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#000", // 背景色を黒に設定
      }}
    >
      {showPermissionModal ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              borderRadius: "10px",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <h2 style={{marginBottom: "20px", color: "#333"}}>
              権限の許可が必要です
            </h2>
            <p style={{marginBottom: "30px", color: "#666", lineHeight: "1.5"}}>
              このアプリケーションではマイク・カメラを使用します。
              <br />
              それぞれ許可してください。
            </p>
            <button
              onClick={requestPermissions}
              style={{
                padding: "12px 24px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              許可する
            </button>
          </div>
        </div>
      ) : permissionsGranted ? (
        <SimpleCamera />
      ) : null}
    </div>
  );
}
