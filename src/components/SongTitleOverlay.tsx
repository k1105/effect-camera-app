import {useEffect, useState} from "react";

export interface SongTitleOverlayProps {
  songId: number;
}

const NUM_SONGS = 18;

const songTitleMap = new Map();

songTitleMap.set(-1, "");
songTitleMap.set(0, "toxic_invasion");

songTitleMap.set(1, "black_nails");
songTitleMap.set(2, "no_colors");
songTitleMap.set(3, "totsugeki");
songTitleMap.set(4, "make_a_move");
songTitleMap.set(5, "I-wont-let-you-go");

songTitleMap.set(6, "darma");
songTitleMap.set(7, "");
songTitleMap.set(8, "sexual_conversation");
songTitleMap.set(9, "tokyo_sky_blues");
songTitleMap.set(10, "please");

songTitleMap.set(11, "anyway");
songTitleMap.set(12, "I-hate-u");
songTitleMap.set(13, "blueberry_gum");
songTitleMap.set(14, "heavens_seven");
songTitleMap.set(15, "");

songTitleMap.set(16, "too_young_to_get_it_too_fast_to_live");
songTitleMap.set(17, "gtoer_cracker");

export const SongTitleOverlay: React.FC<SongTitleOverlayProps> = ({
  songId,
}) => {
  const [showImage, setShowImage] = useState(false);
  const isOutOfBound = songId < 0 || songId >= NUM_SONGS ? true : false;
  const imagePath = `/assets/song_title/${songTitleMap.get(songId)}.png`;
  useEffect(() => {
    const cycle = () => {
      // Show image for 1 second
      setShowImage(true);
      
      setTimeout(() => {
        // Hide image for 4 seconds
        setShowImage(false);
      }, 250);
    };

    // Start the cycle immediately
    cycle();

    // Set up the repeating cycle (5 seconds total: 1s show + 4s hide)
    const interval = setInterval(cycle, 500);

    return () => {
      clearInterval(interval);
      setShowImage(false);
    };
  }, [songId]);

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