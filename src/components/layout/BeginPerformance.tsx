import {FrameLayer} from "../layers/FrameLayer";
import {
  SongTitleOverlay,
  type SongTitleOverlayProps,
} from "../SongTitleOverlay";

export const BeginPerformance = ({songId}: SongTitleOverlayProps) => {
  return (
    <>
      <FrameLayer/>
      <SongTitleOverlay
        songId={songId}
      />
    </>
  );
};
