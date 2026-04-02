// ============================================================
// HUNTER RANK SYSTEM — Solo Leveling hierarchy
// ============================================================

export interface HunterRank {
  title: string;
  minLevel: number;
  color: string;
  glow: string;
  benefit: string;
}

export const HUNTER_RANKS: HunterRank[] = [
  { title: "E-Rank", minLevel: 1, color: "#4A5568", glow: "none", benefit: "The journey begins" },
  { title: "D-Rank", minLevel: 5, color: "#0891B2", glow: "teal", benefit: "Stat allocation expands" },
  { title: "C-Rank", minLevel: 10, color: "#1B45D7", glow: "blue", benefit: "Bonus quest variety grows" },
  { title: "B-Rank", minLevel: 18, color: "#4F46E5", glow: "indigo", benefit: "Shadow soldier Tusk awakens" },
  { title: "A-Rank", minLevel: 28, color: "#7C3AED", glow: "purple", benefit: "Grade thresholds relax" },
  { title: "S-Rank", minLevel: 40, color: "#FFC107", glow: "gold", benefit: "Shadow soldier Bellion awakens" },
  { title: "National Level", minLevel: 55, color: "#F8FAFC", glow: "white", benefit: "Emergency quest XP tripled" },
  { title: "Shadow Monarch", minLevel: 75, color: "#463671", glow: "purple", benefit: "The System bows to none" },
];

export function getHunterRank(level: number): HunterRank {
  for (let i = HUNTER_RANKS.length - 1; i >= 0; i--) {
    if (level >= HUNTER_RANKS[i].minLevel) return HUNTER_RANKS[i];
  }
  return HUNTER_RANKS[0];
}

export function getNextHunterRank(
  level: number
): { rank: HunterRank; levelsRemaining: number } | null {
  const current = getHunterRank(level);
  const currentIdx = HUNTER_RANKS.findIndex(
    (r) => r.title === current.title
  );
  if (currentIdx >= HUNTER_RANKS.length - 1) return null;
  const next = HUNTER_RANKS[currentIdx + 1];
  return { rank: next, levelsRemaining: next.minLevel - level };
}
