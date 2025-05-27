import type {FC} from "react";

interface EffectSelectorProps {
  effects: string[];
  current: number;
  onChange: (index: number) => void;
}

export const EffectSelector: FC<EffectSelectorProps> = ({
  effects,
  current,
  onChange,
}) => {
  return (
    <div style={{display: "flex", gap: "10px"}}>
      {effects.map((_, i) => (
        <button
          key={i}
          className={current === i ? "active" : ""}
          onClick={() => onChange(i)}
        >
          Effect {i + 1}
        </button>
      ))}
    </div>
  );
};
