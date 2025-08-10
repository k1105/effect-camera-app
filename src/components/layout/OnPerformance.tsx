import { FrameLayer } from "../layers/FrameLayer";
import { StaticLayer } from "../layers/StaticLayer";

interface OnPerformanceProps {
  current: number;
};

export const OnPerformance = ({
  current,
}: OnPerformanceProps) => {
  return (
    <>
      <StaticLayer
        songId={current}
      />

      <FrameLayer/>
    </>
  );
};
