let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

export function playQuestComplete() {
  const ac = getContext();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.value = 1200;
  gain.gain.setValueAtTime(0.3, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.15);
}

export function playLevelUp() {
  const ac = getContext();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ac.currentTime + 0.3);
  gain.gain.setValueAtTime(0.3, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.5);
}

export function playRankUp() {
  const ac = getContext();
  const freqs = [440, 554, 659];
  freqs.forEach((f) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ac.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.0);
    osc.connect(gain).connect(ac.destination);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 1.0);
  });
}

export function playQuestFailed() {
  const ac = getContext();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = 220;
  gain.gain.setValueAtTime(0.3, ac.currentTime);
  gain.gain.setValueAtTime(0.001, ac.currentTime + 0.1);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.1);
}

export function playSystemPing() {
  const ac = getContext();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(0.2, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.1);
}
