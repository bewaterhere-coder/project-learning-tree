import { useEffect, useState } from "react";

/** Keep a surface mounted briefly after `open` becomes false so exit CSS can run. */
export function useExitHold(open: boolean, durationMs: number): boolean {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (durationMs <= 0) {
      setMounted(open);
      return;
    }
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) {
      return;
    }
    const timer = window.setTimeout(() => setMounted(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [open, durationMs, mounted]);

  if (durationMs <= 0) {
    return open;
  }
  return open || mounted;
}
