/// <reference types="vite/client" />

interface MediaTrackConstraints {
  zoom?: number;
}

interface MediaTrackCapabilities {
  zoom?: {
    min: number;
    max: number;
    step: number;
  };
}

interface MediaTrackConstraintSet {
  zoom?: number;
}
