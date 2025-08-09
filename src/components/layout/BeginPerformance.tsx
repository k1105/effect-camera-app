import { CameraCanvas, type CameraCanvasProps } from "../layers/CameraCanvas";
import { FrameLayer } from "../layers/FrameLayer";
import { SongTitleOverlay, type SongTitleOverlayProps } from "../SongTitleOverlay";

interface BeginPerformanceProps extends CameraCanvasProps, SongTitleOverlayProps {
};

export const BeginPerformance = ({
  videoRef,
  bitmaps,
  current,
  ready,
  isNoSignalDetected,
  cameraMode,
  onEffectChange,
  numEffects,
  currentCategory,
  songId,
}: BeginPerformanceProps) => {
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

      <SongTitleOverlay
        songId={songId}
        cameraMode={cameraMode}
        currentId={current}
      />

    </>
  );
};
