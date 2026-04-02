// ============================================================
// GATE REWARDS — Real-life treats earned through the System
// ============================================================

export type RewardType = "ration_upgrade" | "rest_permit" | "cheat_code" | "boss_loot";

export interface RewardEntry {
  id: string;
  type: RewardType;
  earned_at: string;
  claimed: boolean;
  claimed_at: string | null;
  claimed_details: string | null;
}

export interface RewardsState {
  earned: RewardEntry[];
  boss_loot_wishlist: string[];
  last_checked_rank: string | null;
  last_checked_bosses: number[];
  last_streak_milestone: number;
  last_good_week_milestone: number;
}

export const REWARD_DEFINITIONS: Record<RewardType, {
  name: string;
  earnMessage: string;
  claimMessage: string;
  description: string;
  maxUnclaimed: number;
}> = {
  ration_upgrade: {
    name: "RATION UPGRADE",
    earnMessage: "5 consecutive A-grade weeks. The System authorizes controlled indulgence.",
    claimMessage: "Ration upgrade deployed. 1500 cal ceiling. No fasting seal penalty. One meal.",
    description: "Guilt-free indulgence meal — earned, not stolen",
    maxUnclaimed: 3,
  },
  rest_permit: {
    name: "REST PERMIT",
    earnMessage: "14-day exercise streak achieved. The System grants recovery.",
    claimMessage: "Rest permit activated. One additional recovery day authorized.",
    description: "Extra rest day mid-week — System-approved",
    maxUnclaimed: 3,
  },
  cheat_code: {
    name: "CHEAT CODE",
    earnMessage: "New rank achieved. The System suspends the seal.",
    claimMessage: "Cheat code activated. Fasting seal suspended for 24 hours.",
    description: "24-hour fasting seal suspension — rank promotion reward",
    maxUnclaimed: 3,
  },
  boss_loot: {
    name: "BOSS LOOT",
    earnMessage: "Boss defeated. Claim your spoils.",
    claimMessage: "Loot claimed. The hunter takes what is earned.",
    description: "Real-world reward from your wishlist — boss defeated",
    maxUnclaimed: 3,
  },
};

export function getDefaultRewardsState(): RewardsState {
  return {
    earned: [],
    boss_loot_wishlist: [],
    last_checked_rank: null,
    last_checked_bosses: [],
    last_streak_milestone: 0,
    last_good_week_milestone: 0,
  };
}

export function parseRewardsState(raw: unknown): RewardsState {
  if (!raw || typeof raw !== "object") return getDefaultRewardsState();
  const r = raw as Partial<RewardsState>;
  return {
    earned: Array.isArray(r.earned) ? r.earned : [],
    boss_loot_wishlist: Array.isArray(r.boss_loot_wishlist) ? r.boss_loot_wishlist : [],
    last_checked_rank: r.last_checked_rank ?? null,
    last_checked_bosses: Array.isArray(r.last_checked_bosses) ? r.last_checked_bosses : [],
    last_streak_milestone: r.last_streak_milestone ?? 0,
    last_good_week_milestone: r.last_good_week_milestone ?? 0,
  };
}

interface RewardCheckInput {
  consecutiveGoodWeeks: number;
  exerciseStreak: number;
  currentRank: string;
  defeatedBossWeights: number[]; // boss targetWeights where currentWeight <= targetWeight
}

export function checkAndGrantRewards(
  state: RewardsState,
  input: RewardCheckInput
): { newState: RewardsState; newRewards: RewardEntry[] } {
  const newState = { ...state, earned: [...state.earned] };
  const newRewards: RewardEntry[] = [];
  const now = new Date().toISOString();

  function countUnclaimed(type: RewardType): number {
    return newState.earned.filter((r) => r.type === type && !r.claimed).length;
  }

  function grant(type: RewardType) {
    if (countUnclaimed(type) >= REWARD_DEFINITIONS[type].maxUnclaimed) return;
    const entry: RewardEntry = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      earned_at: now,
      claimed: false,
      claimed_at: null,
      claimed_details: null,
    };
    newState.earned.push(entry);
    newRewards.push(entry);
  }

  // RATION UPGRADE: every 5 consecutive A-grade weeks
  const goodWeekMilestone = Math.floor(input.consecutiveGoodWeeks / 5) * 5;
  if (goodWeekMilestone > 0 && goodWeekMilestone > newState.last_good_week_milestone) {
    grant("ration_upgrade");
    newState.last_good_week_milestone = goodWeekMilestone;
  }

  // REST PERMIT: every 14-day exercise streak
  const streakMilestone = Math.floor(input.exerciseStreak / 14) * 14;
  if (streakMilestone > 0 && streakMilestone > newState.last_streak_milestone) {
    grant("rest_permit");
    newState.last_streak_milestone = streakMilestone;
  }

  // CHEAT CODE: new rank reached
  if (input.currentRank !== newState.last_checked_rank && newState.last_checked_rank !== null) {
    grant("cheat_code");
  }
  newState.last_checked_rank = input.currentRank;

  // BOSS LOOT: new boss defeated
  for (const bossWeight of input.defeatedBossWeights) {
    if (!newState.last_checked_bosses.includes(bossWeight)) {
      grant("boss_loot");
      newState.last_checked_bosses.push(bossWeight);
    }
  }

  return { newState, newRewards };
}

export function getUnclaimedRewards(state: RewardsState): RewardEntry[] {
  return state.earned.filter((r) => !r.claimed);
}
