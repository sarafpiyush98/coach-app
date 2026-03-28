// ============================================================
// HUNTER RANK SYSTEM — Solo Leveling hierarchy
// ============================================================

export interface HunterRank {
  title: string;
  minLevel: number;
  color: string;
  glow: string;
}

export const HUNTER_RANKS: HunterRank[] = [
  { title: "E-Rank", minLevel: 1, color: "#4A5568", glow: "none" },
  { title: "D-Rank", minLevel: 5, color: "#0891B2", glow: "teal" },
  { title: "C-Rank", minLevel: 10, color: "#1B45D7", glow: "blue" },
  { title: "B-Rank", minLevel: 18, color: "#4F46E5", glow: "indigo" },
  { title: "A-Rank", minLevel: 28, color: "#7C3AED", glow: "purple" },
  { title: "S-Rank", minLevel: 40, color: "#FFC107", glow: "gold" },
  { title: "National Level", minLevel: 55, color: "#F8FAFC", glow: "white" },
  { title: "Shadow Monarch", minLevel: 75, color: "#463671", glow: "purple" },
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
