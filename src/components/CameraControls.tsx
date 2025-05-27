import type {FC} from "react";

interface CameraControlsProps {
  hasMultipleCameras: boolean;
  isFrontCamera: boolean;
  onSwitchCamera: () => void;
  onTakePhoto: () => void;
}

export const CameraControls: FC<CameraControlsProps> = ({
  hasMultipleCameras,
  isFrontCamera,
  onSwitchCamera,
  onTakePhoto,
}) => {
  return (
    <div style={{display: "flex", gap: "10px"}}>
      {hasMultipleCameras && (
        <button onClick={onSwitchCamera}>
          {isFrontCamera ? "外カメラ" : "インカム"}
        </button>
      )}
      <button onClick={onTakePhoto}>撮影</button>
    </div>
  );
};
