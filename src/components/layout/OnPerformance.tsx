import { CameraCanvas, type CameraCanvasProps } from "../layers/CameraCanvas";
import { FrameLayer } from "../layers/FrameLayer";
import { StaticLayer } from "../layers/StaticLayer";

interface OnPerformanceProps extends CameraCanvasProps {

};

export const OnPerformance = ({
  videoRef,
  bitmaps,
  current,
  ready,
  isNoSignalDetected,
  cameraMode,
  onEffectChange,
  numEffects,
  currentCategory
}: OnPerformanceProps) => {
  return (
    <>
      <CameraCanvas
        videoRef={videoRef}
        bitmaps={bitmaps}
        current={current}
        ready={ready}
        isNoSignalDetected={isNoSignalDetected}
        cameraMode={cameraMode}
        onEffectChange={onEffectChange}
        numEffects={numEffects}
        currentCategory={currentCategory}
      />

      <StaticLayer
        songId={current}
      />

      <FrameLayer/>

    </>
  );
};
