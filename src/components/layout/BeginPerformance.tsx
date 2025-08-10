import { FrameLayer } from "../layers/FrameLayer";
import { SongTitleOverlay, type SongTitleOverlayProps } from "../SongTitleOverlay";

interface BeginPerformanceProps extends SongTitleOverlayProps {
};

export const BeginPerformance = ({
  songId,
}: BeginPerformanceProps) => {
  return (
    <>
      <FrameLayer/>
      <SongTitleOverlay
        songId={songId}
      />
    </>
  );
};
