import {useState, useEffect} from "react";

export const Countdown = ({startTime}: {startTime: number}) => {
  const [countdown, setCountdown] = useState(startTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(startTime - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);
  return (
    <>
      {countdown > 0 ? (
        <div>{new Date(countdown).toISOString().slice(11, 19)}</div>
      ) : (
        <div>
          <div>00:00:00</div>
        </div>
      )}
    </>
  );
};
