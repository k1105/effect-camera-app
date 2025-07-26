import type {FC} from "react";

export type EffectCategory = "normal" | "badTV" | "psychedelic";

interface EffectCategorySelectorProps {
  currentCategory: EffectCategory;
  onCategoryChange: (category: EffectCategory) => void;
  isVisible: boolean;
}

export const EffectCategorySelector: FC<EffectCategorySelectorProps> = ({
  currentCategory,
  onCategoryChange,
  isVisible,
}) => {
  if (!isVisible) return null;

  const categories: Array<{id: EffectCategory; label: string}> = [
    {id: "normal", label: "Normal"},
    {id: "badTV", label: "Bad TV"},
    {id: "psychedelic", label: "Psychedelic"},
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "10px",
        zIndex: 1000,
      }}
    >
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          style={{
            padding: "12px 20px",
            borderRadius: "6px",
            border: "2px solid #333",
            backgroundColor:
              currentCategory === category.id ? "#007bff" : "#222",
            color: currentCategory === category.id ? "white" : "#ccc",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "1px",
            minWidth: "100px",
            transition: "all 0.2s ease",
            boxShadow:
              currentCategory === category.id
                ? "0 0 10px rgba(0, 123, 255, 0.5)"
                : "0 2px 4px rgba(0, 0, 0, 0.3)",
          }}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
};
