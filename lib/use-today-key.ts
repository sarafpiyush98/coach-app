"use client";

import { useEffect, useState } from "react";
import { getTodayKey } from "./monarch-store";

/**
 * Reactively tracks the current local calendar date key (YYYY-MM-DD)
 * across midnight boundaries and background suspension on mobile PWAs.
 */
export function useTodayKey(): string {
  const [todayKey, setTodayKey] = useState<string>(() => getTodayKey());

  useEffect(() => {
    const checkRollover = () => {
      const next = getTodayKey();
      setTodayKey((prev) => (prev === next ? prev : next));
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        checkRollover();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    const id = setInterval(checkRollover, 60000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(id);
    };
  }, []);

  return todayKey;
}
