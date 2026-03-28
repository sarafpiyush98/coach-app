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
      className="fixed top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-[#1B45D7]/30 bg-[rgba(10,20,60,0.85)] backdrop-blur-[16px] transition-opacity hover:opacity-80 active:scale-95"
      aria-label={mute ? "Unmute sounds" : "Mute sounds"}
    >
      {mute ? (
        <VolumeX size={14} className="text-[#4A5568]" />
      ) : (
        <Volume2 size={14} className="text-[#1B45D7]" />
      )}
    </button>
  );
}
