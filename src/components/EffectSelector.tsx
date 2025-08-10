import type {FC} from "react";
import {getLayoutForEffect} from "../utils/effectLayouts";

interface EffectSelectorProps {
  effects: string[];
  current: number;
  onChange: (index: number) => void;
}

const LAYOUT_LABELS: Record<string, string> = {
  center: "中央",
  circle: "円形",
  random: "ランダム",
  wave: "波状",
  grid: "グリッド",
  spiral: "螺旋",
};

export const EffectSelector: FC<EffectSelectorProps> = ({
  effects,
  current,
  onChange,
}) => {
  return (
    <div style={{display: "flex", gap: "10px", flexWrap: "wrap"}}>
      {effects.map((_, i) => {
        const layout = getLayoutForEffect(i);
        const layoutLabel = LAYOUT_LABELS[layout.type] || layout.type;
        return (
          <button
            key={i}
            className={current === i ? "active" : ""}
            onClick={() => onChange(i)}
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: current === i ? "2px solid #007bff" : "1px solid #ccc",
              backgroundColor: current === i ? "#007bff" : "white",
              color: current === i ? "white" : "black",
              cursor: "pointer",
              fontSize: "12px",
              minWidth: "80px",
            }}
          >
            <div style={{fontSize: "10px", opacity: 0.8}}>{layoutLabel}</div>
          </button>
        );
      })}
    </div>
  );
};
