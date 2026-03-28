"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { toggleMute, isMuted } from "@/lib/sounds";

export function MuteToggle() {
  const [mute, setMute] = useState(false);

  useEffect(() => {
    setMute(isMuted());
  }, []);

  const handleToggle = () => {
    const newState = toggleMute();
    setMute(newState);
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed top-4 right-4 z-20 flex h-7 w-7 items-center justify-center rounded-md bg-[var(--surface-1)] transition-opacity hover:opacity-80 active:scale-95"
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
