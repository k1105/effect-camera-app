import type {EffectCategory} from "../components/EffectCategorySelector";

// エフェクトカテゴリーごとのエフェクトID範囲
export const EFFECT_CATEGORY_RANGES: Record<string, number[]> = {
  normal: [0],
  badTV: [1, 2, 3],
  psychedelic: [4, 5, 6, 7],
};

// エフェクトIDからカテゴリーを取得
export const getCategoryFromEffectId = (effectId: number): EffectCategory => {
  if (effectId === 0) return "normal";
  if (effectId >= 1 && effectId <= 3) return "badTV";
  if (effectId >= 4 && effectId <= 7) return "psychedelic";
  return "normal"; // デフォルト
};

// カテゴリー内でのエフェクト強度を計算（0-1の範囲）
export const getEffectIntensity = (
  effectId: number,
  category: EffectCategory
): number => {
  const ranges = EFFECT_CATEGORY_RANGES[category];

  if (category === "normal") {
    return 0; // Normalは常に強度0
  }

  const categoryEffectIds = ranges.filter((id: number) => id !== 0); // Normalを除外
  const index = categoryEffectIds.indexOf(effectId);

  if (index === -1) return 0;

  // カテゴリー内での強度を0-1の範囲で正規化
  return index / (categoryEffectIds.length - 1);
};

// カテゴリーと強度からエフェクトIDを取得
export const getEffectIdFromCategoryAndIntensity = (
  category: EffectCategory,
  intensity: number
): number => {
  if (category === "normal") return 0;

  const ranges = EFFECT_CATEGORY_RANGES[category];
  const categoryEffectIds = ranges.filter((id: number) => id !== 0); // Normalを除外

  if (categoryEffectIds.length === 0) return 0;

  const index = Math.round(intensity * (categoryEffectIds.length - 1));
  return categoryEffectIds[
    Math.max(0, Math.min(index, categoryEffectIds.length - 1))
  ];
};

// カテゴリー内の次のエフェクトIDを取得
export const getNextEffectIdInCategory = (
  currentEffectId: number,
  category: EffectCategory
): number => {
  const ranges = EFFECT_CATEGORY_RANGES[category];
  const categoryEffectIds = ranges.filter((id: number) => id !== 0); // Normalを除外

  if (categoryEffectIds.length === 0) return currentEffectId;

  const currentIndex = categoryEffectIds.indexOf(currentEffectId);
  const nextIndex = (currentIndex + 1) % categoryEffectIds.length;
  return categoryEffectIds[nextIndex];
};
