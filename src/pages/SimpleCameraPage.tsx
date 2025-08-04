import {useState, useEffect} from "react";
import SimpleCamera from "../SimpleCamera";

export default function SimpleCameraPage() {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const requestPermissions = async () => {
    try {
      // 基本制約で権限を要求
      const constraints = {
        video: {
          facingMode: "environment",
          width: {ideal: 3840},
          height: {ideal: 2160},
          frameRate: {ideal: 30},
        },
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };

      console.log("SimpleCameraPage: 使用する制約:", constraints);

      // カメラとマイクの許可を要求
      await navigator.mediaDevices.getUserMedia(constraints);

      setPermissionsGranted(true);
      setShowPermissionModal(false);
    } catch (error) {
      console.error("権限の取得に失敗しました:", error);

      // エラーの詳細をログ出力
      if (error instanceof Error) {
        console.error("エラー名:", error.name);
        console.error("エラーメッセージ:", error.message);
      }

      // より基本的な制約で再試行
      if (error instanceof Error && error.name === "NotAllowedError") {
        console.log("SimpleCameraPage: 基本制約で再試行");
        try {
          const basicConstraints = {
            video: true,
            audio: true,
          };

          await navigator.mediaDevices.getUserMedia(basicConstraints);
          console.log("SimpleCameraPage: 基本制約での権限取得に成功");
          setPermissionsGranted(true);
          setShowPermissionModal(false);
          return;
        } catch (retryError) {
          console.error("SimpleCameraPage: 再試行も失敗:", retryError);
        }
      }

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

  // 全てのブラウザで権限プロンプトを表示
  useEffect(() => {
    console.log("権限プロンプトを表示");
    setShowPermissionModal(true);
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
