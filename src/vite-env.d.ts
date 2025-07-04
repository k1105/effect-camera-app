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

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.gif" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}
