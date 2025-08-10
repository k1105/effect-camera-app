const staticImgMap = new Map();

staticImgMap.set(-1, "default");
staticImgMap.set(0, "");

staticImgMap.set(1, "");
staticImgMap.set(2, "");
staticImgMap.set(3, "");
staticImgMap.set(4, "");
staticImgMap.set(5, "default");

staticImgMap.set(6, "");
staticImgMap.set(7, "");
staticImgMap.set(8, "");
staticImgMap.set(9, "");
staticImgMap.set(10, "");

staticImgMap.set(11, "");
staticImgMap.set(12, "");
staticImgMap.set(13, "blueberry_gum.gif");
staticImgMap.set(14, "");
staticImgMap.set(15, "");

staticImgMap.set(16, "default");
staticImgMap.set(17, "");
staticImgMap.set(18, "");

interface StaticLayerProps {
  songId: number;
}

export const StaticLayer = ({songId}: StaticLayerProps) => {
  const imagePath =
    staticImgMap.get(songId) === "default" || ""
      ? "/assets/static/blueberry_gum.gif"
      : "/assets/static/" + staticImgMap.get(songId);
  const isShowImage = staticImgMap.get(songId) === "" ? false : true;
  const heightOffset = 600;
  const widthOffset = Math.floor(heightOffset * (9 / 16));

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100svw",
        height: "100svh",
        zIndex: 999,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isShowImage && (
        <img
          src={imagePath}
          style={{
            width: `calc(1080px - ${widthOffset}px)`,
            height: `calc(1920px - ${heightOffset}px)`,
            transform: "rotate(90deg)",
            objectFit: "contain",
            transition: "opacity 0.3s ease-in-out",
          }}
          onError={(e) => {
            console.error(`Failed to load image: ${imagePath}`);
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
};
