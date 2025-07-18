import {useEffect, useState} from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

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

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  // インストール済みまたはプロンプトが表示されていない場合は何も表示しない
  if (isInstalled || !showInstallPrompt) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        color: "white",
        padding: "16px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        textAlign: "center",
      }}
    >
      <div style={{fontSize: "16px", fontWeight: "bold"}}>
        📱 アプリをインストール
      </div>
      <div style={{fontSize: "14px", opacity: 0.8}}>
        ホーム画面に追加して、より快適に使用できます
      </div>
      <div style={{display: "flex", gap: "8px"}}>
        <button
          onClick={handleInstallClick}
          style={{
            backgroundColor: "#007AFF",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          インストール
        </button>
        <button
          onClick={handleDismiss}
          style={{
            backgroundColor: "transparent",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          後で
        </button>
      </div>
    </div>
  );
};
