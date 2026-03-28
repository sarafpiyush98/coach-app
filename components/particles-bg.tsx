"use client";

import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

const options: ISourceOptions = {
  fullScreen: false,
  fpsLimit: 30,
  particles: {
    number: { value: 18 },
    color: { value: "#1B45D7" },
    opacity: {
      value: { min: 0.2, max: 0.4 },
    },
    size: {
      value: { min: 1, max: 3 },
    },
    move: {
      enable: true,
      speed: 0.3,
      direction: "top",
      outModes: { default: "out" },
    },
  },
  detectRetina: true,
};

export function ParticlesBg() {
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    if (mq.matches) return;

    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  if (reducedMotion || !ready) return null;

  return (
    <Particles
      id="system-particles"
      className="pointer-events-none fixed inset-0 z-0"
      options={options}
    />
  );
}
