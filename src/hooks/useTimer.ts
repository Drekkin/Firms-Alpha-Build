import { useEffect } from "react";

export function useTimer(active: boolean, endsAt: number, onTimeout: () => void) {
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      if (Date.now() >= endsAt) onTimeout();
    }, 250);
    return () => window.clearInterval(id);
  }, [active, endsAt, onTimeout]);
}
