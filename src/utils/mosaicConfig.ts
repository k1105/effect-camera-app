// utils/mosaicConfig.ts
import type {MosaicConfig} from "./mosaicShader";

export const mosaicPresets: Record<
  "subtle" | "moderate" | "heavy" | "extreme",
  MosaicConfig
> = {
  subtle: {
    minPixel: 4,
    maxPixel: 24,
    basePad: 60,
    effectDuration: 0.2,
    springFreq: 13,
    springDamp: 10,
    shakeMax: 24,
    zoomExtraMax: 18,
  },
  moderate: {
    minPixel: 4,
    maxPixel: 48,
    basePad: 60,
    effectDuration: 0.2,
    springFreq: 13,
    springDamp: 10,
    shakeMax: 30,
    zoomExtraMax: 20,
  },
  heavy: {
    minPixel: 4,
    maxPixel: 80,
    basePad: 60,
    effectDuration: 0.2,
    springFreq: 13,
    springDamp: 10,
    shakeMax: 36,
    zoomExtraMax: 24,
  },
  extreme: {
    minPixel: 4,
    maxPixel: 100,
    basePad: 60,
    effectDuration: 0.2,
    springFreq: 13,
    springDamp: 10,
    shakeMax: 42,
    zoomExtraMax: 28,
  },
};

export const getMosaicConfigForEffect = (effectId: number): MosaicConfig => {
  switch (effectId) {
    case 5:
      return mosaicPresets.moderate;
    case 6:
      return mosaicPresets.heavy;
    case 7:
      return mosaicPresets.extreme; // 複合用など
    default:
      return mosaicPresets.subtle;
  }
};
