"use client";

import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { toggleMute, isMuted } from "@/lib/sounds";

function subscribeMute(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("monarch-mute-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("monarch-mute-change", callback);
    window.removeEventListener("storage", callback);
  };
}

export function MuteToggle() {
  const mute = useSyncExternalStore(subscribeMute, isMuted, () => false);

  return (
    <button
      onClick={() => toggleMute()}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)] transition-opacity hover:opacity-80 active:scale-95"
      aria-label={mute ? "Unmute sounds" : "Mute sounds"}
    >
      {mute ? (
        <VolumeX size={13} className="text-[var(--text-muted)]" />
      ) : (
        <Volume2 size={13} className="text-[var(--text-muted)]" />
      )}
    </button>
  );
}
