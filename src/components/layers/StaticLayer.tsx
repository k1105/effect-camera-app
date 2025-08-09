const staticImgMap = new Map();

staticImgMap.set(-1, "default");
staticImgMap.set(0, "default");


staticImgMap.set(1, "default");
staticImgMap.set(2, "default");
staticImgMap.set(3, "default");
staticImgMap.set(4, "default");
staticImgMap.set(5, "default");

staticImgMap.set(6, "");
staticImgMap.set(7, "default");
staticImgMap.set(8, "default");
staticImgMap.set(9, "default");
staticImgMap.set(10, "default");

staticImgMap.set(11, "default");
staticImgMap.set(12, "default");
staticImgMap.set(13, "default");
staticImgMap.set(14, "blueberry_gum.gif");
staticImgMap.set(15, "default");

staticImgMap.set(16, "default");
staticImgMap.set(17, "");
staticImgMap.set(18, "default");

interface StaticLayerProps {
  songId: number;
}

export const StaticLayer = ({
  songId
}: StaticLayerProps) => {

  const imagePath = staticImgMap.get(songId) === "default" || "" 
    ? "/assets/static/blueberry_gum.gif" 
    : "/assets/static/" + staticImgMap.get(songId)
  const isShowImage = staticImgMap.get(songId) === "" ? false : true;
  const heightOffset = 600;
  const widthOffset = Math.floor(heightOffset * (9 / 16));

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 999,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isShowImage &&
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
      }
    </div>
  )
} 