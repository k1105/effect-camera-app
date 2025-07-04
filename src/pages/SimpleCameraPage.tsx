import {useState, useEffect} from "react";
import SimpleCamera from "../SimpleCamera";

export default function SimpleCameraPage() {
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const requestPermissions = async () => {
    try {
      console.log("SimpleCameraPage: 権限要求開始");
      // カメラとマイクの許可を要求
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("SimpleCameraPage: 権限取得成功");
      setPermissionsGranted(true);
      setShowPermissionModal(false);
      setPermissionError(null);
    } catch (error) {
      console.error("権限の取得に失敗しました:", error);

      // カメラのみでも試してみる
      try {
        console.log("SimpleCameraPage: カメラのみで再試行");
        await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        console.log("SimpleCameraPage: カメラ権限取得成功");
        setPermissionsGranted(true);
        setShowPermissionModal(false);
        setPermissionError(
          "マイクの権限が拒否されましたが、カメラは使用できます。"
        );
      } catch (cameraError) {
        console.error("カメラ権限も失敗:", cameraError);
        setPermissionError(
          "カメラとマイクの権限が拒否されました。ブラウザの設定でカメラの許可を確認してください。"
        );
        setShowPermissionModal(false);
      }
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

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
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
      ) : (
        <>
          {permissionError && (
            <div
              style={{
                position: "fixed",
                top: "10px",
                left: "10px",
                right: "10px",
                backgroundColor: "#ffebee",
                color: "#c62828",
                padding: "10px",
                borderRadius: "5px",
                fontSize: "14px",
                zIndex: 1001,
              }}
            >
              {permissionError}
            </div>
          )}
          <SimpleCamera />
        </>
      )}
    </div>
  );
}
