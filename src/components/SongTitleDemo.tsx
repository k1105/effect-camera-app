import {useState} from "react";

interface SongTitleDemoProps {
  onSongIdChange: (songId: number) => void;
  onShowSongTitleChange: (show: boolean) => void;
  currentSongId: number;
  showSongTitle: boolean;
  isVisible: boolean;
}

const SONG_NAMES = [
  "Anyway",
  "Black Nails", 
  "Blueberry Gum",
  "Darma",
  "Gtoer Cracker",
  "Heavens Seven",
  "I Hate U",
  "I Won't Let You Go",
  "Make A Move",
  "No Colors",
  "Please",
  "Sexual Conversation",
  "Tokyo Sky Blues",
  "Too Young To Get It Too Fast To Live",
  "Totsugeki",
  "Toxic Invasion"
];

export const SongTitleDemo: React.FC<SongTitleDemoProps> = ({
  onSongIdChange,
  onShowSongTitleChange,
  currentSongId,
  showSongTitle,
  isVisible
}) => {
  const [selectedSongId, setSelectedSongId] = useState(currentSongId);

  const handleSongChange = (songId: number) => {
    setSelectedSongId(songId);
    onSongIdChange(songId);
  };

  const handleToggleOverlay = () => {
    onShowSongTitleChange(!showSongTitle);
  };

  if(!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "20px",
        borderRadius: "10px",
        maxWidth: "300px",
        zIndex: 1000,
        fontSize: "14px",
      }}
    >
      <h3 style={{margin: "0 0 15px 0", fontSize: "16px"}}>
        Song Title Overlay Demo
      </h3>
      
      <div style={{marginBottom: "15px"}}>
        <label style={{display: "block", marginBottom: "5px"}}>
          Select Song:
        </label>
        <select
          value={selectedSongId}
          onChange={(e) => handleSongChange(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            backgroundColor: "white",
            color: "black",
          }}
        >
          <option value={-1}>No Song</option>
          {SONG_NAMES.map((name, index) => (
            <option key={index} value={index}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div style={{marginBottom: "15px"}}>
        <label style={{display: "flex", alignItems: "center", gap: "8px"}}>
          <input
            type="checkbox"
            checked={showSongTitle}
            onChange={handleToggleOverlay}
          />
          Show Song Title Overlay
        </label>
      </div>

      <div style={{fontSize: "12px", opacity: 0.8}}>
        <p style={{margin: "0 0 5px 0"}}>
          <strong>HTML Overlay:</strong> Renders as HTML element on top
        </p>
        <p style={{margin: "0 0 5px 0"}}>
          <strong>Canvas Overlay:</strong> Renders inside WebGL canvas
        </p>
        <p style={{margin: "0"}}>
          <strong>Cycle:</strong> 1s show, 4s hide
        </p>
      </div>
    </div>
  );
}; 