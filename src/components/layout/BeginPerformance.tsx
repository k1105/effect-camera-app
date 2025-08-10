import {FrameLayer} from "../layers/FrameLayer";
import {
  SongTitleOverlay,
  type SongTitleOverlayProps,
} from "../SongTitleOverlay";

export const BeginPerformance = ({songId}: SongTitleOverlayProps) => {
  return (
    <>
<<<<<<< HEAD
      <FrameLayer/>
      <SongTitleOverlay
        songId={songId}
      />
=======
      <FrameLayer />

      <SongTitleOverlay songId={songId} />
>>>>>>> e91785a6bc2413a22127b81684f7a290962a4c02
    </>
  );
};
