// ============================================================
// CONSISTENCY ENGINE — Visual rewards for sustained behavior
// ============================================================

export interface ConsistencyTitle {
  minCombo: number;
  title: string;
  color: string;
}

export const CONSISTENCY_TITLES: ConsistencyTitle[] = [
  { minCombo: 90, title: "Shadow Monarch Protocol", color: "#463671" },
  { minCombo: 60, title: "Unbreakable", color: "#FFC107" },
  { minCombo: 30, title: "Relentless", color: "#F59E0B" },
  { minCombo: 21, title: "Forged", color: "#A855F7" },
  { minCombo: 14, title: "Iron Will", color: "#8B5CF6" },
  { minCombo: 7, title: "Committed", color: "#3b6cf6" },
];

export function getConsistencyTitle(
  comboDay: number
): ConsistencyTitle | null {
  return CONSISTENCY_TITLES.find((t) => comboDay >= t.minCombo) ?? null;
}

// Theme evolution — accent color shifts with combo
export interface ComboTheme {
  accent: string;
  glow: string;
  surface: string;
  borderAccent: string;
}

export function getComboTheme(comboDay: number): ComboTheme {
  if (comboDay >= 60)
    return {
      accent: "#FFC107",
      glow: "rgba(255, 193, 7, 0.15)",
      surface: "#1a1510",
      borderAccent: "rgba(255, 193, 7, 0.25)",
    };
  if (comboDay >= 30)
    return {
      accent: "#EF4444",
      glow: "rgba(239, 68, 68, 0.15)",
      surface: "#1a1115",
      borderAccent: "rgba(239, 68, 68, 0.25)",
    };
  if (comboDay >= 14)
    return {
      accent: "#A855F7",
      glow: "rgba(168, 85, 247, 0.15)",
      surface: "#151020",
      borderAccent: "rgba(168, 85, 247, 0.25)",
    };
  if (comboDay >= 7)
    return {
      accent: "#8B5CF6",
      glow: "rgba(139, 92, 246, 0.15)",
      surface: "#111520",
      borderAccent: "rgba(139, 92, 246, 0.2)",
    };
  return {
    accent: "#3b6cf6",
    glow: "rgba(59, 108, 246, 0.15)",
    surface: "#111520",
    borderAccent: "rgba(59, 108, 246, 0.2)",
  };
}

// Combo milestones that trigger the overlay
export const COMBO_MILESTONES = [7, 14, 21, 30, 60, 90];

export function isComboMilestone(comboDay: number): boolean {
  return COMBO_MILESTONES.includes(comboDay);
}

// Shadow greetings — unlocked shadows congratulate on milestones
export interface ShadowMessage {
  name: string;
  message: string;
}

const SHADOW_GREETINGS: Record<string, string[]> = {
  Iron: [
    "The iron does not bend. Neither do you.",
    "Another day. Another rep. Iron approves.",
    "Consistency is strength made visible.",
  ],
  Igris: [
    "Igris acknowledges your discipline.",
    "The loyal knight stands with you.",
    "Your streak burns brighter than any blade.",
  ],
  Tank: [
    "Tank monitors your fuel. Intake consistent.",
    "Nutritional discipline confirmed. Tank is satisfied.",
    "You feed the machine well. It serves you better.",
  ],
  Beru: [
    "Beru senses growing power.",
    "The ant king recognizes relentless protocol adherence.",
    "Your daily completion rate exceeds expectations.",
  ],
  Tusk: [
    "Tusk watches from the shadows. Impressed.",
    "Rank achieved through pure consistency.",
    "The beast stirs. Your power grows.",
  ],
  Bellion: [
    "The marshal salutes your campaign.",
    "Bellion has seen many hunters. Few reach this depth.",
    "Your consistency commands respect across all ranks.",
  ],
};

export function getShadowGreeting(
  unlockedShadows: string[],
  comboDay: number
): ShadowMessage | null {
  if (unlockedShadows.length === 0) return null;
  if (!isComboMilestone(comboDay)) return null;

  // Pick a shadow based on combo day (deterministic)
  const shadowIndex = comboDay % unlockedShadows.length;
  const shadowName = unlockedShadows[shadowIndex];
  const messages = SHADOW_GREETINGS[shadowName];
  if (!messages) return null;

  const msgIndex =
    Math.floor(comboDay / unlockedShadows.length) % messages.length;
  return { name: shadowName, message: messages[msgIndex] };
}

// Streak intensity for fire effects (0-1 scale)
export function getStreakIntensity(streak: number): number {
  if (streak <= 0) return 0;
  if (streak >= 30) return 1;
  return Math.min(streak / 30, 1);
}
