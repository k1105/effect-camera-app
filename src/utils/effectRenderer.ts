import {getLayoutForEffect, calculatePositions} from "./effectLayouts";

export type BlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "soft-light"
  | "hard-light";

export type EffectType = "normal" | "badTV" | "psychedelic";

export interface EffectRenderConfig {
  current: number;
  bitmaps: ImageBitmap[];
  isSwitchingCamera: boolean;
  blendMode: BlendMode;
  canvasWidth: number;
  canvasHeight: number;
  currentTime: number;
}

export interface EffectRenderResult {
  positions: Array<{
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }>;
  effectBitmap: ImageBitmap | null;
  effectType: EffectType;
}

// ブレンドモードの数値変換
export const getBlendModeValue = (mode: BlendMode): number => {
  const blendModes = {
    "source-over": 0,
    multiply: 1,
    screen: 2,
    overlay: 3,
    "soft-light": 4,
    "hard-light": 5,
  };
  return blendModes[mode] || 0;
};

// エフェクトの描画情報を計算
export const calculateEffectRenderData = (
  config: EffectRenderConfig
): EffectRenderResult => {
  const {
    current,
    bitmaps,
    isSwitchingCamera,
    canvasWidth,
    canvasHeight,
    currentTime,
  } = config;

  // カメラ切り替え中はエフェクトを表示しない
  if (isSwitchingCamera || current < 0) {
    return {
      positions: [],
      effectBitmap: null,
      effectType: "normal",
    };
  }

  const effect = bitmaps[current];
  const layout = getLayoutForEffect(current);
  const positions = calculatePositions(
    layout,
    canvasWidth,
    canvasHeight,
    currentTime
  );

  // エフェクトIDに基づいてシェーダータイプを決定
  let effectType: EffectType = "normal";
  if (current >= 0 && current <= 7) {
    // エフェクト0: Normal（エフェクトなし）
    if (current === 0) {
      effectType = "normal";
    }
    // エフェクト1-3: Bad TV Shader
    else if (current >= 1 && current <= 3) {
      effectType = "badTV";
    }
    // エフェクト4-7: サイケデリックシェーダー
    else {
      effectType = "psychedelic";
    }
  }

  return {
    positions,
    effectBitmap: effect,
    effectType,
  };
};

// エフェクトの変換行列を計算
export const calculateEffectTransform = (
  pos: {x: number; y: number; scale: number; rotation: number},
  effect: ImageBitmap,
  canvasWidth: number,
  canvasHeight: number
) => {
  const effectAspect = effect.width / effect.height;
  const targetAspect = canvasWidth / canvasHeight;

  let effectWidth, effectHeight;
  if (effectAspect > targetAspect) {
    effectWidth = canvasWidth * pos.scale;
    effectHeight = effectWidth / effectAspect;
  } else {
    effectHeight = canvasHeight * pos.scale;
    effectWidth = effectHeight * effectAspect;
  }

  // 変換行列の計算
  const scaleX = effectWidth / canvasWidth;
  const scaleY = effectHeight / canvasHeight;
  const translateX = (pos.x - canvasWidth / 2) / (canvasWidth / 2);
  const translateY = (pos.y - canvasHeight / 2) / (canvasHeight / 2);

  return {
    transform: [
      scaleX * Math.cos(pos.rotation),
      -scaleY * Math.sin(pos.rotation),
      translateX,
      scaleX * Math.sin(pos.rotation),
      scaleY * Math.cos(pos.rotation),
      translateY,
      0,
      0,
      1,
    ],
    effectWidth,
    effectHeight,
  };
};
