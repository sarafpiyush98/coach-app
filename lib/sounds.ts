let ctx: AudioContext | null = null;
let muted = false;

if (typeof window !== "undefined") {
  muted = localStorage.getItem("system-muted") === "true";
}

export function toggleMute(): boolean {
  muted = !muted;
  if (typeof window !== "undefined") {
    localStorage.setItem("system-muted", String(muted));
  }
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) return null;
  if (!ctx) {
    ctx = new AudioCtor();
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function playQuestComplete() {
  if (muted) return;
  try {
    const ac = getContext();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.25, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.16);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.16);
  } catch {
    // audio optional
  }
}

export function playLevelUp() {
  if (muted) return;
  try {
    const ac = getContext();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ac.currentTime + 0.3);
    gain.gain.setValueAtTime(0.28, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.5);
  } catch {
    // audio optional
  }
}

export function playRankUp() {
  if (muted) return;
  try {
    const ac = getContext();
    if (!ac) return;
    const freqs = [440, 554, 659];
    freqs.forEach((f) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.001, ac.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ac.currentTime + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.95);
      osc.connect(gain).connect(ac.destination);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.95);
    });
  } catch {
    // audio optional
  }
}

export function playShadowArise() {
  if (muted) return;
  try {
    const ac = getContext();
    if (!ac) return;
    const freqs = [110, 220, 329.63, 440];
    freqs.forEach((f, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = idx === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(f * 0.92, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f, ac.currentTime + 0.25);
      gain.gain.setValueAtTime(0.001, ac.currentTime);
      gain.gain.linearRampToValueAtTime(0.14 / (idx + 1), ac.currentTime + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.7);
      osc.connect(gain).connect(ac.destination);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.7);
    });
  } catch {
    // audio optional
  }
}

export function playQuestFailed() {
  if (muted) return;
  try {
    const ac = getContext();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0.25, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ac.currentTime + 0.12);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.12);
  } catch {
    // audio optional
  }
}

export function playSystemPing() {
  if (muted) return;
  try {
    const ac = getContext();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.16, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.1);
  } catch {
    // audio optional
  }
}
