export type ContextId = "cg_home" | "hsr_office" | "raid_social" | "travel";
export type ArenaId = "cg_gym" | "home_zero" | "nomad_hotel";
export type SplitId = "push" | "pull" | "legs" | "pool_steps";
export type GateRankId = "floor_5m" | "express_25m" | "full_45m";

export interface ContextSpec {
  id: ContextId;
  label: string;
  shortLabel: string;
  sub: string;
  defaultArena: ArenaId;
  avoidNote: string;
}

export const CONTEXTS: Record<ContextId, ContextSpec> = {
  cg_home: {
    id: "cg_home",
    label: "CG / HOME",
    shortLabel: "CG / HOME",
    sub: "Basapura · E-City · 25kg DB Cap",
    defaultArena: "cg_gym",
    avoidNote: "Avoid late-night 22:00-04:00 Swiggy stacks; hit 5 PM Whey+Skyr before skipping dinner.",
  },
  hsr_office: {
    id: "hsr_office",
    label: "HSR OFFICE",
    shortLabel: "HSR",
    sub: "Sec 3 Walk-In · Hebe's & Grill Daddy",
    defaultArena: "cg_gym",
    avoidNote: "Hebe's Salsa Egg is only ~19g P - stack side chicken/shrimps or lock 5 PM Whey+Skyr.",
  },
  raid_social: {
    id: "raid_social",
    label: "RAID / OUT",
    shortLabel: "RAID",
    sub: "AB's Weekly OMAD · Sun Badminton · Social",
    defaultArena: "cg_gym",
    avoidNote: "At AB's skip Cajun potatoes & cold-stone ice cream. Pre-load curd+whey before Taprooms.",
  },
  travel: {
    id: "travel",
    label: "TRAVEL",
    shortLabel: "NOMAD",
    sub: "Hotel Room · Wedding · De-Bloat",
    defaultArena: "nomad_hotel",
    avoidNote: "Shoes ON for cardio (zero Crocs/barefoot); semi-fast protein before wedding feasts.",
  },
};

export const CONTEXT_LIST: ContextSpec[] = [
  CONTEXTS.cg_home,
  CONTEXTS.hsr_office,
  CONTEXTS.raid_social,
  CONTEXTS.travel,
];

export function autoDetectContext(now: Date = new Date()): ContextId {
  const day = now.getDay(); // 0 = Sun
  const mins = now.getHours() * 60 + now.getMinutes();
  if (day === 0 && mins >= 360 && mins <= 690) {
    return "raid_social"; // Sunday 06:00-11:30 Badminton crew window
  }
  if (day >= 1 && day <= 5 && mins >= 630 && mins <= 990) {
    return "hsr_office"; // Mon-Fri 10:30-16:30 HSR office lunch window
  }
  return "cg_home";
}

export interface ExerciseSwap {
  name: string;
  sets: number;
  reps: string;
  load: string;
  cue?: string;
}

export interface ExerciseSpec {
  id: string;
  name: string;
  sets: number;
  reps: string;
  load: string;
  restSec: number;
  cue?: string;
  pairHint?: string;
  trackBench?: boolean;
  swap: ExerciseSwap;
}

export interface ArenaInfo {
  id: ArenaId;
  label: string;
  shortLabel: string;
  rule: string;
}

export const ARENAS: ArenaInfo[] = [
  {
    id: "cg_gym",
    label: "CG Club Gym",
    shortLabel: "CG GYM",
    rule: "25 kg DB max · 2:1 cables · Lift BEFORE Swim · Straps on Pull/RDL",
  },
  {
    id: "home_zero",
    label: "Home 0-Gear",
    shortLabel: "HOME",
    rule: "Countertop Deficit Push · Knotted Door-Sheet Rows · Wall-Sit Occlusion",
  },
  {
    id: "nomad_hotel",
    label: "Hotel / Travel",
    shortLabel: "HOTEL",
    rule: "30m real rest clock · Shoes ON (no Crocs) · Bed-Edge Single-Leg Bridges",
  },
];

export const SPLITS: { id: SplitId; label: string; focus: string }[] = [
  { id: "push", label: "PUSH", focus: "100 kg Bench Ladder" },
  { id: "pull", label: "PULL", focus: "Straps · Spine-Safe" },
  { id: "legs", label: "LEGS", focus: "Knee-Safe Order" },
  { id: "pool_steps", label: "POOL / MOVE", focus: "Swim · Kili · Badminton" },
];

export const GATE_RANKS: {
  id: GateRankId;
  tag: string;
  label: string;
  duration: string;
  baseXp: number;
}[] = [
  { id: "floor_5m", tag: "E-RANK", label: "2-Set Floor", duration: "2 sets · ~8-10m", baseXp: 35 },
  { id: "express_25m", tag: "C-RANK", label: "6-Set Heavy", duration: "3x2 sets · ~25-30m", baseXp: 65 },
  { id: "full_45m", tag: "S-RANK", label: "Full 10-Set", duration: "4-5 lifts · chill rest", baseXp: 95 },
];

const WORKOUT_MATRIX: Record<ArenaId, Record<SplitId, ExerciseSpec[]>> = {
  cg_gym: {
    push: [
      {
        id: "cg_bench",
        name: "Flat Barbell Bench Press",
        sets: 3,
        reps: "6-10",
        load: "55-62.5 kg",
        restSec: 120,
        trackBench: true,
        cue: "Baseline 50x15 -> lock scapula + leg drive; warm up w/ empty bar (NO push-ups)",
        swap: {
          name: "Pec Deck Machine Fly",
          sets: 3,
          reps: "12-15",
          load: "Mod Stack",
          cue: "Use when Flat Bench is busy; return for bench after",
        },
      },
      {
        id: "cg_inc_db",
        name: "Incline DB Press (30 deg)",
        sets: 3,
        reps: "10-12",
        load: "17.5-22.5 kg",
        restSec: 90,
        cue: "Full pec stretch; climbing toward CG 25 kg DB ceiling",
        swap: {
          name: "Flat DB Press",
          sets: 3,
          reps: "10-12",
          load: "20-25 kg",
          cue: "Slow 3s eccentric past 25 kg DB ceiling",
        },
      },
      {
        id: "cg_ohp",
        name: "Seated DB OHP (75-80 deg)",
        sets: 3,
        reps: "8-10",
        load: "15-17.5 kg",
        restSec: 90,
        cue: "Seated stops lower-back wobble; always run BEFORE rows",
        swap: {
          name: "Half-Kneeling Cable Press",
          sets: 3,
          reps: "10/arm",
          load: "18 kg stack (9 kg eff)",
          cue: "Smooth ribcage stack",
        },
      },
      {
        id: "cg_lat_cable",
        name: "Cable Lateral Raise (2:1)",
        sets: 3,
        reps: "12-15/arm",
        load: "12 kg stack (~6 kg eff)",
        restSec: 60,
        cue: "Constant bottom tension; smooth wrist",
        swap: {
          name: "DB Lateral Raise",
          sets: 3,
          reps: "12-15",
          load: "7.5-10 kg",
          cue: "Control 2s descent",
        },
      },
      {
        id: "cg_rope_tri",
        name: "Cable Rope Pushdown (2:1)",
        sets: 3,
        reps: "12-15",
        load: "24-36 kg stack (12-18 eff)",
        restSec: 60,
        cue: "Full elbow flex above 90 deg (Bench Dips & Kickbacks BANNED)",
        swap: {
          name: "Lying Small EZ Skullcrusher",
          sets: 3,
          reps: "10-12",
          load: "Small EZ + plates",
          cue: "Elbows locked toward ceiling",
        },
      },
    ],
    pull: [
      {
        id: "cg_lat_pd",
        name: "Lat Pulldown (Straps On)",
        sets: 3,
        reps: "10-12",
        load: "42-48 kg stack",
        restSec: 90,
        cue: "Wear lifting straps + thumbless grip; drive elbows to pockets",
        swap: {
          name: "1-Arm Cable Lat Pulldown",
          sets: 3,
          reps: "10-12/arm",
          load: "24 kg stack (12 eff)",
          cue: "Free range if main stack busy",
        },
      },
      {
        id: "cg_cable_row",
        name: "Seated Cable Row (Neutral)",
        sets: 3,
        reps: "10-12",
        load: "Mod-Heavy Stack",
        restSec: 90,
        cue: "Chest tall; skips chest-pad diaphragm crush",
        swap: {
          name: "Bench-Braced 1-Arm DB Row",
          sets: 3,
          reps: "10/arm",
          load: "17.5-25 kg",
          cue: "Straps on; wide rear-foot stance",
        },
      },
      {
        id: "cg_db_row",
        name: "Bench-Braced DB Row (Straps)",
        sets: 3,
        reps: "10/arm",
        load: "17.5-25 kg",
        restSec: 90,
        cue: "Max CG DB = 25 kg; progress w/ 2s squeeze or Barbell Row",
        swap: {
          name: "Barbell Bent-Over Row",
          sets: 3,
          reps: "8-10",
          load: "45-60 kg",
          cue: "Breaks 25 kg DB ceiling cleanly",
        },
      },
      {
        id: "cg_face_pull",
        name: "Rope Face Pull + Rear Fly",
        sets: 3,
        reps: "15",
        load: "18-24 kg stack",
        restSec: 60,
        cue: "Shoulder & upper-back posture shield",
        swap: {
          name: "Pec Deck Reverse Fly",
          sets: 3,
          reps: "15",
          load: "Light-Mod",
          cue: "Soft elbows, smooth pinch",
        },
      },
      {
        id: "cg_inc_curl",
        name: "Incline DB Curl (45-60 deg)",
        sets: 3,
        reps: "10-12",
        load: "7.5-10 kg",
        restSec: 60,
        cue: "Set bench 45-60 deg (NEVER 30 deg) to guard front shoulder tendon",
        swap: {
          name: "Cable Rope Hammer Curl",
          sets: 3,
          reps: "12",
          load: "18-24 kg stack",
          cue: "Forearm-friendly neutral grip",
        },
      },
    ],
    legs: [
      {
        id: "cg_leg_ext",
        name: "Leg Extension (First!)",
        sets: 3,
        reps: "12-15",
        load: "Mod Stack",
        restSec: 75,
        cue: "ALWAYS before Leg Press - warms patellar tendon safely",
        swap: {
          name: "Wall Sit Occlusion",
          sets: 3,
          reps: "45s",
          load: "Bodyweight",
          cue: "Hands near knees OK at 112-115 kg",
        },
      },
      {
        id: "cg_bridge",
        name: "Floor DB Glute Bridge (1.5-rep)",
        sets: 3,
        reps: "12-15",
        load: "25 kg DB (CG Max)",
        restSec: 90,
        cue: "DB in hip crease (NO Bench Hip Thrust); 2s pause at top",
        swap: {
          name: "Barbell RDL (Straps On)",
          sets: 3,
          reps: "10-12",
          load: "50-70 kg",
          cue: "Beats 25 kg DB ceiling; keep bar shaving thighs",
        },
      },
      {
        id: "cg_leg_press",
        name: "Controlled Leg Press",
        sets: 3,
        reps: "10-12",
        load: "Controlled (2 RIR)",
        restSec: 90,
        cue: "Shoulder-width feet (NO ultra-wide Sumo catch; NEVER max first)",
        swap: {
          name: "Goblet Box Squat",
          sets: 3,
          reps: "12",
          load: "17.5-22.5 kg",
          cue: "Touch bench lightly, stay upright",
        },
      },
      {
        id: "cg_stepup",
        name: "Step-Up + Rotation",
        sets: 3,
        reps: "10/leg",
        load: "10 kg DB",
        restSec: 60,
        cue: "Reverse Lunges BANNED - zero lumbar/knee shear",
        swap: {
          name: "Farmer Walk (Straps)",
          sets: 3,
          reps: "45s",
          load: "25 kg / hand",
          cue: "Tall ribs, straps protect finger calluses",
        },
      },
      {
        id: "cg_calves_core",
        name: "Calf Raise + 90-deg Leg Raise",
        sets: 3,
        reps: "15",
        load: "BW / Light",
        restSec: 45,
        cue: "Slow ankle stretch for Kili descents; skip oblique cable twists if cramping",
        swap: {
          name: "Side Plank",
          sets: 2,
          reps: "35s/side",
          load: "Bodyweight",
          cue: "Steady anti-lateral core",
        },
      },
    ],
    pool_steps: [
      {
        id: "cg_incline",
        name: "Incline Treadmill Walk (Zone-2)",
        sets: 1,
        reps: "20-30 min",
        load: "6-9% grade · 4.8-5.5 km/h",
        restSec: 0,
        cue: "Shoes ON, ZERO ankle weights -> builds direct Kilimanjaro vertical",
        swap: {
          name: "Cross Trainer Elliptical",
          sets: 1,
          reps: "15-20 min",
          load: "Level 5",
          cue: "Low-impact Zone-2 cardiac output",
        },
      },
      {
        id: "cg_swim",
        name: "CG Clubhouse Pool Swim",
        sets: 1,
        reps: "25-30 min",
        load: "Easy Continuous Laps",
        restSec: 0,
        cue: "JAGDISH RULE: Always swim AFTER lifting weights, never before heavy bench",
        swap: {
          name: "2.5 kg DB Jumping Jacks",
          sets: 4,
          reps: "45 reps",
          load: "2.5-3 kg DBs (Shoes ON)",
          cue: "Brisk sweat finisher",
        },
      },
    ],
  },
  home_zero: {
    push: [
      {
        id: "hm_pushup",
        name: "Countertop Deficit Push-Up",
        sets: 3,
        reps: "10-15",
        load: "BW / Loaded Backpack",
        restSec: 90,
        cue: "3s controlled descent + 1s pause deep chest stretch",
        swap: {
          name: "Close-Grip Countertop Push-Up",
          sets: 3,
          reps: "10-12",
          load: "Bodyweight",
          cue: "Elbows tucked tight to ribs",
        },
      },
      {
        id: "hm_delt_giant",
        name: "2.5-3 kg DB Mechanical Giant Set",
        sets: 3,
        reps: "15+15+15",
        load: "2.5-3 kg home DBs",
        restSec: 90,
        cue: "Rear Fly -> Slow 3s Lateral -> OHP nonstop (same failure stimulus!)",
        swap: {
          name: "Feet-Elevated Bed Pike Push-Up",
          sets: 3,
          reps: "8-10",
          load: "Bodyweight",
          cue: "Target vertical shoulders safely",
        },
      },
      {
        id: "hm_tri_close",
        name: "Close-Grip Countertop Push-Up",
        sets: 3,
        reps: "10-14",
        load: "BW / Backpack",
        restSec: 60,
        cue: "Replaces CG rope pushdown (NO bed dips)",
        swap: {
          name: "Overhead Backpack Tricep Ext",
          sets: 3,
          reps: "12-15",
          load: "10-15 kg bag",
          cue: "Full triceps stretch",
        },
      },
    ],
    pull: [
      {
        id: "hm_door_row",
        name: "Knotted Door-Sheet Inverted Row",
        sets: 3,
        reps: "10-12",
        load: "BW Angle (35-75 kg eq)",
        restSec: 90,
        cue: "Anchor sheet OVER closed door (pull away from hinges); walk feet forward for load",
        swap: {
          name: "Door-Towel Isometric Row Pull",
          sets: 3,
          reps: "10s max pull x 3",
          load: "High Tension",
          cue: "Safe fallback if door angle limited",
        },
      },
      {
        id: "hm_pack_row",
        name: "Chair-Braced Backpack 1-Arm Row",
        sets: 3,
        reps: "10-12/arm",
        load: "15-20 kg books/bottles",
        restSec: 75,
        cue: "Wide rear-foot stance; zero diaphragm crush",
        swap: {
          name: "Prone Floor Y-T-W Raises",
          sets: 3,
          reps: "12",
          load: "BW / 1 kg",
          cue: "Posture & scapular retraction",
        },
      },
      {
        id: "hm_sofa_curl",
        name: "45-60 deg Sofa Backpack Curl",
        sets: 3,
        reps: "12-15",
        load: "10-15 kg bag / towels",
        restSec: 60,
        cue: "Keep torso 45-60 deg; squeeze pinky up at top",
        swap: {
          name: "Towel-Under-Foot Drag Curl",
          sets: 3,
          reps: "12",
          load: "Self-Resistance",
          cue: "Smooth peak contraction",
        },
      },
    ],
    legs: [
      {
        id: "hm_occlusion",
        name: "Wall Sit -> Heels-Elevated Squat",
        sets: 3,
        reps: "45s + 15",
        load: "Isometric Occlusion",
        restSec: 90,
        cue: "45s Wall Sit -> 15s breather -> 15 slow squats = heavy quad fiber recruitment",
        swap: {
          name: "Heels-Elevated 1.5-Rep Squat",
          sets: 3,
          reps: "12-15",
          load: "Loaded Backpack",
          cue: "Heels on thin book for clean knee track",
        },
      },
      {
        id: "hm_sl_bridge",
        name: "Single-Leg Bed-Edge Glute Bridge",
        sets: 3,
        reps: "12/side",
        load: "BW Unilateral (~50 kg eq)",
        restSec: 75,
        cue: "Beats CG's 25 kg DB ceiling per side with zero belly pinch",
        swap: {
          name: "Towel Floor Hamstring Slide",
          sets: 3,
          reps: "10-12",
          load: "Socks on smooth tile",
          cue: "Eccentric hamstring scorcher",
        },
      },
      {
        id: "hm_step_up",
        name: "Staircase / Box Step-Ups",
        sets: 3,
        reps: "10/leg",
        load: "BW / 2.5 kg DBs",
        restSec: 60,
        cue: "3s slow step-down for Kilimanjaro descent knees (NO reverse lunges)",
        swap: {
          name: "Kickstand Backpack RDL",
          sets: 3,
          reps: "12/leg",
          load: "15-20 kg bag",
          cue: "80% weight on front heel",
        },
      },
    ],
    pool_steps: [
      {
        id: "hm_steps",
        name: "Campus Zone-2 Step Loop",
        sets: 1,
        reps: "30-45 min",
        load: "3,500-6,000 steps",
        restSec: 0,
        cue: "Steady breathing pace (PFT friendly) toward 12k-15k daily goal",
        swap: {
          name: "Shoes-On 2.5 kg DB Jumping Jacks",
          sets: 4,
          reps: "45 reps",
          load: "2.5-3 kg DBs (Shoes ON)",
          cue: "Never barefoot or in Crocs",
        },
      },
    ],
  },
  nomad_hotel: {
    push: [
      {
        id: "nm_desk_push",
        name: "Hotel Desk Incline Deficit Push-Up",
        sets: 4,
        reps: "12-15",
        load: "3s Eccentric",
        restSec: 75,
        cue: "15-16 sets total fits cleanly inside a 30m hotel window",
        swap: {
          name: "Close-Grip Desk Tricep Push-Up",
          sets: 3,
          reps: "12",
          load: "Bodyweight",
          cue: "Elbows narrow (Zero Chair Dips)",
        },
      },
      {
        id: "nm_pack_ohp",
        name: "Suitcase / Backpack Overhead Press",
        sets: 3,
        reps: "10-12",
        load: "12-16 kg packed bag",
        restSec: 75,
        cue: "Glutes squeezed, ribs stacked",
        swap: {
          name: "Wall Pike Press",
          sets: 3,
          reps: "8-10",
          load: "Bodyweight",
          cue: "Controlled head-to-pillow depth",
        },
      },
    ],
    pull: [
      {
        id: "nm_suitcase_row",
        name: "Suitcase Chair-Braced 1-Arm Row",
        sets: 3,
        reps: "12/arm",
        load: "15-20 kg bag",
        restSec: 75,
        cue: "Pack laptop/clothes to hit target load",
        swap: {
          name: "Door-Towel Inverted Row",
          sets: 3,
          reps: "10-12",
          load: "Bodyweight Angle",
          cue: "Check door opens away from pull",
        },
      },
      {
        id: "nm_strap_curl",
        name: "Carry-On Strap Curl + Floor Angels",
        sets: 3,
        reps: "12-15",
        load: "12-16 kg bag",
        restSec: 60,
        cue: "Opens slumped travel upper back",
        swap: {
          name: "Prone Y-T-W Floor Raise",
          sets: 3,
          reps: "12",
          load: "Bodyweight",
          cue: "Slow scapular squeeze",
        },
      },
    ],
    legs: [
      {
        id: "nm_wall_squat",
        name: "45s Wall Sit -> 15 BW Squats",
        sets: 3,
        reps: "45s + 15",
        load: "Occlusion Pair",
        restSec: 75,
        cue: "Glycogen sponge before travel/wedding dinners",
        swap: {
          name: "Stair / Low-Chair Step-Ups",
          sets: 3,
          reps: "10/leg",
          load: "Bodyweight",
          cue: "NO Reverse Lunges",
        },
      },
      {
        id: "nm_bed_bridge",
        name: "Single-Leg Bed-Edge Glute Bridge",
        sets: 3,
        reps: "12/side",
        load: "Bodyweight",
        restSec: 60,
        cue: "Zero equipment required",
        swap: {
          name: "Single-Leg Calf Raise (Stairs)",
          sets: 3,
          reps: "15/leg",
          load: "Bodyweight",
          cue: "Tall calf stretch",
        },
      },
    ],
    pool_steps: [
      {
        id: "nm_walk",
        name: "15k Step Travel Zone-2 Walk",
        sets: 1,
        reps: "45-60 min",
        load: "Zone-2 Pace",
        restSec: 0,
        cue: "De-bloats facial sodium without systemic cortisol",
        swap: {
          name: "Shoes-On Jumping Jacks",
          sets: 4,
          reps: "50 reps",
          load: "Shoes ON",
          cue: "Quick glycogen burn before buffet",
        },
      },
    ],
  },
};

const PAIR_HINTS: Record<string, string> = {
  cg_lat_cable: "Long-rest shortcut: optional pair between Flat/Incline breaks",
  cg_rope_tri: "Long-rest shortcut: optional pair between OHP breaks",
  cg_inc_curl: "Long-rest shortcut: alternate curls inside Pull long rests",
  cg_face_pull: "Long-rest shortcut: rear-delt posture sets during Row breaks",
  cg_calves_core: "Long-rest shortcut: calves/core inside Glute Bridge breaks",
};

export function getPrescribedWorkout(
  arena: ArenaId,
  split: SplitId,
  gateRank: GateRankId
): ExerciseSpec[] {
  const list = WORKOUT_MATRIX[arena][split];
  const applyRank = (ex: ExerciseSpec, idx: number, maxAccSets: number): ExerciseSpec => {
    const isCardio = split === "pool_steps";
    const scaledSets = isCardio
      ? ex.sets
      : idx === 0
        ? gateRank === "floor_5m"
          ? Math.min(ex.sets, 2)
          : gateRank === "express_25m"
            ? Math.min(ex.sets, 2)
            : ex.sets
        : Math.min(ex.sets, maxAccSets);
    const scaledSwapSets = isCardio ? ex.swap.sets : Math.min(ex.swap.sets, scaledSets);
    return {
      ...ex,
      sets: scaledSets,
      pairHint: PAIR_HINTS[ex.id],
      swap: { ...ex.swap, sets: scaledSwapSets },
    };
  };

  if (gateRank === "floor_5m") {
    return list.slice(0, 1).map((ex, idx) => applyRank(ex, idx, 2));
  }
  if (gateRank === "express_25m") {
    return list.slice(0, Math.min(3, list.length)).map((ex, idx) => applyRank(ex, idx, 2));
  }
  return list.map((ex, idx) => applyRank(ex, idx, 2));
}

export type FoodTag =
  | "high_protein"
  | "salsa_solo"
  | "seal"
  | "abs_raid"
  | "social"
  | "debloat";

export interface FoodPreset {
  id: string;
  shortLabel: string;
  spot: string;
  kcal: number;
  proteinG: number;
  contexts: ContextId[];
  note: string;
  tags: FoodTag[];
}

export const FOOD_PRESETS: FoodPreset[] = [
  {
    id: "hebe_salsa_chicken",
    shortLabel: "Hebe's Salsa Egg + Chicken",
    spot: "Hebe's Cafe, HSR Sec 3",
    kcal: 680,
    proteinG: 65,
    contexts: ["hsr_office", "cg_home"],
    note: "3 Salsa Eggs (light/no toast) + side Grilled Chicken Breast/Shrimps",
    tags: ["high_protein"],
  },
  {
    id: "hebe_salsa_solo",
    shortLabel: "Hebe's Salsa Egg (Solo)",
    spot: "Hebe's Cafe, HSR Sec 3",
    kcal: 380,
    proteinG: 19,
    contexts: ["hsr_office"],
    note: "Great base under 400 kcal - pair with 5 PM Whey+Skyr Seal!",
    tags: ["salsa_solo"],
  },
  {
    id: "whey_skyr_seal",
    shortLabel: "5 PM Seal: 2x Whey + Skyr",
    spot: "Home / Office Bridge",
    kcal: 380,
    proteinG: 70,
    contexts: ["cg_home", "hsr_office", "raid_social", "travel"],
    note: "Locks 155-175g daytime protein by 7 PM so skipping dinner is effortless",
    tags: ["seal", "high_protein"],
  },
  {
    id: "abs_omad_raid",
    shortLabel: "AB's Proteinmaxx Lunch Raid",
    spot: "Absolute Barbecues (E-City / BTM / Kora)",
    kcal: 1550,
    proteinG: 160,
    contexts: ["raid_social", "cg_home", "hsr_office"],
    note: "Fish Tikka + Prawns + Chicken skewers + Light-Oil Wish Grill -> Auto-skips dinner!",
    tags: ["abs_raid", "high_protein"],
  },
  {
    id: "am_eggs_whey",
    shortLabel: "4 Eggs / 1.5x Whey Primer",
    spot: "Home Morning Primer",
    kcal: 320,
    proteinG: 42,
    contexts: ["cg_home", "hsr_office", "travel"],
    note: "Keep Monster White >= 8h before sleep",
    tags: ["high_protein"],
  },
  {
    id: "hebe_chicken_bowl",
    shortLabel: "Hebe's Dbl-Chicken Bowl",
    spot: "Hebe's Cafe, HSR Sec 3",
    kcal: 520,
    proteinG: 50,
    contexts: ["hsr_office"],
    note: "Light rice, extra veg, dip on side",
    tags: ["high_protein"],
  },
  {
    id: "grill_daddy_skewers",
    shortLabel: "Grill Daddy Skewers / 1/2 Roast",
    spot: "Grill Daddy, HSR Sec 3",
    kcal: 490,
    proteinG: 48,
    contexts: ["hsr_office"],
    note: "Butter gravy on side, skip garlic bread & Pinwheel cheese chicken",
    tags: ["high_protein"],
  },
  {
    id: "cal_burrito_bowl",
    shortLabel: "Cal Burrito BBQ Bowl",
    spot: "California Burrito",
    kcal: 550,
    proteinG: 48,
    contexts: ["hsr_office", "cg_home"],
    note: "Double chicken, salsa, zero Chocodilla / Quesadilla / Popcorn",
    tags: ["high_protein"],
  },
  {
    id: "subway_salad",
    shortLabel: "Subway Dbl-Chicken Salad",
    spot: "Subway",
    kcal: 420,
    proteinG: 42,
    contexts: ["hsr_office", "cg_home"],
    note: "Mustard / sweet onion / light mint only",
    tags: ["high_protein"],
  },
  {
    id: "khan_saheb_tikka",
    shortLabel: "Khan Saheb Tikka + Charcoal",
    spot: "Khan Saheb",
    kcal: 520,
    proteinG: 65,
    contexts: ["cg_home"],
    note: "Boneless Chicken Tikka + Charcoal Peri-Peri + mint onion, skip rolls",
    tags: ["high_protein"],
  },
  {
    id: "kfc_smoky_red",
    shortLabel: "KFC Smoky Red (3 pc)",
    spot: "KFC",
    kcal: 480,
    proteinG: 52,
    contexts: ["cg_home"],
    note: "Pure grilled protein; skip Dunked Zingers & fries",
    tags: ["high_protein"],
  },
  {
    id: "meghana_half",
    shortLabel: "Meghana Leg + Eggs + 1/2 Rice",
    spot: "Meghana / Mani's",
    kcal: 720,
    proteinG: 54,
    contexts: ["cg_home", "raid_social"],
    note: "Box half biryani immediately; eat protein first",
    tags: ["social", "high_protein"],
  },
  {
    id: "pre_social_shield",
    shortLabel: "Pre-Taproom Curd + Whey",
    spot: "Home Pre-Outing Shield",
    kcal: 220,
    proteinG: 35,
    contexts: ["raid_social"],
    note: "Eat before leaving CG so hunger never triggers bar fries",
    tags: ["seal"],
  },
  {
    id: "mangroove_tandoori",
    shortLabel: "Mangroove / Smash / Leon's",
    spot: "Social Clean Plate",
    kcal: 690,
    proteinG: 52,
    contexts: ["raid_social"],
    note: "Prawns/Grilled Fish OR Single Smash/Wings w/ Diet Coke (zero fries)",
    tags: ["social"],
  },
  {
    id: "taaza_whey",
    shortLabel: "Taaza 2 Idli + Whey/Eggs",
    spot: "Sunday Badminton Breakfast",
    kcal: 540,
    proteinG: 38,
    contexts: ["raid_social"],
    note: "Drop Kesari Bath; top up protein at home",
    tags: ["social"],
  },
  {
    id: "hotel_debloat",
    shortLabel: "Tusk De-Bloat Salad / Dry Chilli",
    spot: "Travel / Hotel Clean Option",
    kcal: 460,
    proteinG: 46,
    contexts: ["travel"],
    note: "Cucumber-tomato-chicken OR Dry Chilli Chicken + clear soup",
    tags: ["debloat", "high_protein"],
  },
];

export function getPresetsForContext(contextId: ContextId): FoodPreset[] {
  const matched = FOOD_PRESETS.filter((f) => f.contexts.includes(contextId));
  const seal = FOOD_PRESETS.find((f) => f.id === "whey_skyr_seal");
  if (seal && !matched.some((m) => m.id === seal.id)) {
    return [seal, ...matched];
  }
  return matched;
}

export interface RaidBossDef {
  id: string;
  name: string;
  targetKg: number;
  floorKg: number;
  statusNote: string;
}

export const WEIGHT_RAID_BOSSES: RaidBossDef[] = [
  { id: "gatekeeper", name: "The Gatekeeper", targetKg: 120, floorKg: 128, statusNote: "SLAIN (128 kg start)" },
  { id: "iron_golem", name: "Iron Golem of the Plateau", targetKg: 110, floorKg: 120, statusNote: "Active Cut Target" },
  { id: "igris_boss", name: "Blood-Red Commander Igris", targetKg: 100, floorKg: 110, statusNote: "Two-Digit Breakthrough" },
  { id: "architect", name: "The Architect", targetKg: 95, floorKg: 100, statusNote: "Final Monarch Vessel" },
];

export interface ShadowPassiveDef {
  id: string;
  name: string;
  role: string;
  trigger: string;
}

export const SHADOW_PASSIVES: ShadowPassiveDef[] = [
  { id: "igris", name: "Igris", role: "1/wk Streak Shield", trigger: "Absorbs 1 missed travel/work day cleanly" },
  { id: "iron", name: "Iron", role: "Instant Safe Swap", trigger: "Busy machine or joint tweak inside Combat Sheet" },
  { id: "tank", name: "Tank", role: "Context Food Radar", trigger: "Filters spots by CG / HSR / Raid / Travel" },
  { id: "beru", name: "Beru", role: "5m Survival Floor", trigger: "Low-Mana Mode (<5.5h sleep) locks No-Skip floor" },
  { id: "greed", name: "Greed", role: "Skip-Dinner Guardian", trigger: "Alerts on <50g P lunches & counts Swiggy Rs saved" },
  { id: "tusk", name: "Tusk", role: "36h De-Bloat Mode", trigger: "4L water + cucumber/chicken after salt feasts" },
  { id: "kaisel", name: "Kaisel", role: "Kili 5,895m Engine", trigger: "Converts steps, swim & incline into vertical meters" },
  { id: "bellion", name: "Bellion", role: "2x Boss Crit Aura", trigger: "Unlocks at S-Rank or <100 kg on PR streaks" },
];
