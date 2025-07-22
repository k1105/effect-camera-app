// デバイス検出ユーティリティ
export const isMobileDevice = (): boolean => {
  // ユーザーエージェントによる検出
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    "android",
    "iphone",
    "ipad",
    "ipod",
    "blackberry",
    "windows phone",
    "mobile",
  ];

  const isMobileByUserAgent = mobileKeywords.some((keyword) =>
    userAgent.includes(keyword)
  );

  // 画面サイズによる検出
  const isMobileByScreen =
    window.innerWidth <= 768 || window.innerHeight <= 768;

  // タッチ機能による検出
  const isMobileByTouch =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  return isMobileByUserAgent || isMobileByScreen || isMobileByTouch;
};

// iOS Chromeの検出
export const isIOSChrome = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes("iphone") ||
    userAgent.includes("ipad") ||
    userAgent.includes("ipod")
  );
};

// Safariの検出
export const isSafari = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes("safari") && !userAgent.includes("chrome");
};

// iOS ChromeかSafariかどうかの検出
export const isIOSBrowser = (): boolean => {
  return isIOSChrome() || isSafari();
};

// WebGLサポートチェック
export const isWebGLSupported = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
};

// モバイルデバイスでシェーダーを無効化するかどうか
export const shouldDisableShaders = (): boolean => {
  return isMobileDevice();
};
