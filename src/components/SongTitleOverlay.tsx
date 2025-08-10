import {useEffect, useState} from "react";
import type { CameraMode } from "./HamburgerMenu";

export interface SongTitleOverlayProps {
  songId: number;
  cameraMode: CameraMode;
  currentId: number;
}

const SONG_TITLES = [
  "anyway",
  "black_nails", 
  "blueberry_gum",
  "darma",
  "gtoer_cracker",
  "heavens_seven",
  "I-hate-u",
  "I-wont-let-you-go",
  "make_a_move",
  "no_colors",
  "please",
  "sexual_conversation",
  "tokyo_sky_blues",
  "too_young_to_get_it_too_fast_to_live",
  "totsugeki",
  "toxic_invasion"
];

export const SongTitleOverlay: React.FC<SongTitleOverlayProps> = ({
  songId,
  cameraMode,
  currentId
}) => {
  const [showImage, setShowImage] = useState(false);
  const isOutOfBound = songId < 0 || songId >= SONG_TITLES.length ? true : false;
  const imagePath = cameraMode === 'signal' ? `/assets/song_title/${SONG_TITLES[currentId]}.png` : `/assets/song_title/${SONG_TITLES[songId]}.png`;
  useEffect(() => {
    const cycle = () => {
      // Show image for 1 second
      setShowImage(true);
      
      setTimeout(() => {
        // Hide image for 4 seconds
        setShowImage(false);
      }, 1000);
    };

    // Start the cycle immediately
    cycle();

    // Set up the repeating cycle (5 seconds total: 1s show + 4s hide)
    const interval = setInterval(cycle, 5000);

    return () => {
      clearInterval(interval);
      setShowImage(false);
    };
  }, [songId, currentId]);

  if (!showImage || isOutOfBound) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1000,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={imagePath}
        alt={`Song Title ${songId}`}
        style={{
          maxWidth: "80%",
          maxHeight: "80%",
          top: "0%",
          left: "0%",
          translate: "0% -10%",
          objectFit: "contain",
          opacity: showImage ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
        }}
        onError={(e) => {
          console.error(`Failed to load image: ${imagePath}`);
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}; 