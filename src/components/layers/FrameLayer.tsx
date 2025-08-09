export const FrameLayer = () => {
  const imagePath = "/assets/frame/asp_interface_prototype_white.png"
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
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transition: "opacity 0.3s ease-in-out",
        }}
        onError={(e) => {
          console.error(`Failed to load image: ${imagePath}`);
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  )
}