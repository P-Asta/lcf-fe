import { useEffect, useState } from "react";

const FRAME_MS = 33;

export function useClock(running = true) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let last = 0;
    let id = requestAnimationFrame(function tick(now) {
      if (now - last >= FRAME_MS) {
        last = now;
        setSeconds((now - start) / 1000);
      }
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [running]);
  return seconds;
}
