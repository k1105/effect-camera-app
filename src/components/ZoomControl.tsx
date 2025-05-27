import type {FC} from "react";

interface ZoomControlProps {
  zoom: number;
  onZoomChange: (newZoom: number) => void;
}

export const ZoomControl: FC<ZoomControlProps> = ({zoom, onZoomChange}) => {
  return (
    <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
      <button onClick={() => onZoomChange(Math.max(1.0, zoom - 0.1))}>-</button>
      <span>ズーム: {zoom.toFixed(1)}x</span>
      <button onClick={() => onZoomChange(Math.min(1.9, zoom + 0.1))}>+</button>
    </div>
  );
};
