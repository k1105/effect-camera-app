import type {FC} from "react";

interface PreviewScreenProps {
  previewImage: string;
  onBack: () => void;
  onDownload: () => void;
}

export const PreviewScreen: FC<PreviewScreenProps> = ({
  previewImage,
  onBack,
  onDownload,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        zIndex: 2,
      }}
    >
      <img
        src={previewImage}
        style={{
          maxWidth: "100%",
          maxHeight: "80vh",
          objectFit: "contain",
        }}
        alt="Preview"
      />
      <div
        style={{
          display: "flex",
          gap: "20px",
        }}
      >
        <button onClick={onBack}>戻る</button>
        <button onClick={onDownload}>保存</button>
      </div>
    </div>
  );
};
