import { CameraCanvas, type CameraCanvasProps } from "../layers/CameraCanvas";
import { FrameLayer } from "../layers/FrameLayer";

interface NoSignalProps extends CameraCanvasProps {

};

export const NoSignal = ({
  videoRef,
  bitmaps,
  current,
  ready,
  isNoSignalDetected,
  cameraMode,
  onEffectChange,
  numEffects,
  currentCategory
}: NoSignalProps) => {
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

      <FrameLayer/>
    </>
  );
};
