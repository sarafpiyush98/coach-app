export type ContextId = "cg_home" | "hsr_office" | "raid_social" | "travel";
export type ArenaId = "cg_gym" | "home_zero" | "nomad_hotel";
export type SplitId =
  | "upper_a"
  | "lower_a"
  | "upper_b"
  | "lower_b"
  | "ul_combo_a"
  | "ul_combo_b"
  | "full_body_plus"
  | "cardio_pool";
export type GateRankId = "regular" | "express_2x" | "low_mana_rir2";

export const CORE_SPLIT_ORDER: SplitId[] = [
  "upper_a",
  "lower_a",
  "upper_b",
  "lower_b",
];

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
    avoidNote: "Avoid late-night 22:00-04:00 Swiggy stacks; hit 5 PM Whey+Skyr before closing OMAD.",
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
  trackLoad?: boolean;
  defaultWeightKg?: number;
  stepKg?: number;
  bodyweightOnly?: boolean;
  isBarbellCompound?: boolean;
}

export interface ExerciseSpec {
  id: string;
  progressKey?: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  load: string;
  restSec: number;
  cue?: string;
  pairHint?: string;
  trackBench?: boolean;
  trackLoad?: boolean;
  bodyweightOnly?: boolean;
  isBarbellCompound?: boolean;
  defaultWeightKg?: number;
  stepKg?: number;
  maxRepsRegular?: number;
  maxRepsLowTime?: number;
  timeBased?: boolean;
  blockSection?: "upper" | "lower";
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

export const SPLITS: {
  id: SplitId;
  label: string;
  shortLabel: string;
  tier: "core" | "combo" | "bonus";
  focus: string;
}[] = [
  { id: "upper_a", label: "UPPER A", shortLabel: "U-A", tier: "core", focus: "Heavy Bench · Back · Side Delts · Arms" },
  { id: "lower_a", label: "LOWER A", shortLabel: "L-A", tier: "core", focus: "Quads · Barbell RDL · Calves · Core" },
  { id: "upper_b", label: "UPPER B", shortLabel: "U-B", tier: "core", focus: "OHP · Lats · Chest · Side/Rear Delts · Arms" },
  { id: "lower_b", label: "LOWER B", shortLabel: "L-B", tier: "core", focus: "Ham Curl · SL Press · Glutes · Kili Knees" },
  { id: "ul_combo_a", label: "WEEKEND U+L A", shortLabel: "U+L A", tier: "combo", focus: "Curated 7-Lift Heavy (Upper A + Quads · 75-90m)" },
  { id: "ul_combo_b", label: "WEEKEND U+L B", shortLabel: "U+L B", tier: "combo", focus: "Curated 7-Lift Heavy (Upper B + Hinge · 75-90m)" },
  { id: "full_body_plus", label: "DAY 5 · FB+", shortLabel: "FB+", tier: "bonus", focus: "Bench Vol · Arms · Delts · Carries" },
  { id: "cardio_pool", label: "DAY 6 · JOG/POOL", shortLabel: "CARDIO", tier: "bonus", focus: "Zone-2 Jog · Incline · CG Pool" },
];

export const GATE_RANKS: {
  id: GateRankId;
  tag: string;
  label: string;
  duration: string;
  baseXp: number;
}[] = [
  {
    id: "regular",
    tag: "REGULAR",
    label: "3 Sets · 8-12 / 12-15",
    duration: "Compounds 8-12 · Iso 12-15",
    baseXp: 100,
  },
  {
    id: "express_2x",
    tag: "LOW TIME",
    label: "2 Sets · High Effort",
    duration: "BB RIR 1-2 · Iso 0-1 RIR",
    baseXp: 75,
  },
  {
    id: "low_mana_rir2",
    tag: "LOW MANA",
    label: "2 Sets · RIR 2-3",
    duration: "Recovery guard · ~85-90% load · 0 failure",
    baseXp: 65,
  },
];

const WORKOUT_MATRIX: Record<
  ArenaId,
  Record<SplitId, ExerciseSpec[]>
> = {
  cg_gym: {
    upper_a: [
      {
        id: "cg_bench",
        progressKey: "cg_bench_heavy",
        name: "Flat Barbell Bench Press (Strength)",
        muscleGroup: "Chest",
        sets: 3,
        reps: "5-8",
        load: "57.5-77.5 kg",
        restSec: 180,
        trackBench: true,
        trackLoad: true,
        isBarbellCompound: true,
        defaultWeightKg: 57.5,
        stepKg: 2.5,
        maxRepsRegular: 8,
        maxRepsLowTime: 10,
        cue: "100 kg wave: 57.5-65kg x 8 -> 70-77.5kg x 5 -> 80-90kg x 3 -> 100kg x 1 (mandatory spotter). Empty bar warm-up only.",
        swap: {
          name: "Flat DB Press",
          sets: 3,
          reps: "8-12",
          load: "20-25 kg",
          trackLoad: true,
          defaultWeightKg: 22.5,
          stepKg: 2.5,
          cue: "Use when Flat Bench is busy; slow 3s eccentric",
        },
      },
      {
        id: "cg_cable_row",
        name: "Seated Cable Row (Neutral, Straps)",
        muscleGroup: "Mid-Back",
        sets: 3,
        reps: "8-12",
        load: "42-54 kg stack",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 42,
        stepKg: 6,
        maxRepsRegular: 12,
        cue: "Chest tall, straps on; skips chest-pad diaphragm crush",
        pairHint: "Long-rest pair: optional between Bench breaks",
        swap: {
          name: "Bench-Braced 1-Arm DB Row",
          sets: 3,
          reps: "8-12/arm",
          load: "17.5-25 kg",
          trackLoad: true,
          defaultWeightKg: 20,
          stepKg: 2.5,
          cue: "Straps on; wide rear-foot stance",
        },
      },
      {
        id: "cg_inc_db",
        name: "Incline DB Press (30 deg)",
        muscleGroup: "Upper Chest",
        sets: 3,
        reps: "8-12",
        load: "17.5-25 kg",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 20,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Full pec stretch; climbing toward CG 25 kg DB cap",
        swap: {
          name: "Flat DB Press",
          sets: 3,
          reps: "8-12",
          load: "20-25 kg",
          trackLoad: true,
          defaultWeightKg: 22.5,
          stepKg: 2.5,
          cue: "Slow 3s eccentric past 25 kg DB cap",
        },
      },
      {
        id: "cg_lat_pd_wide",
        name: "Lat Pulldown (Wide/Med, Straps)",
        muscleGroup: "Lats",
        sets: 3,
        reps: "8-12",
        load: "42-54 kg stack",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 48,
        stepKg: 6,
        maxRepsRegular: 12,
        cue: "Thumbless grip + straps; drive elbows down toward pockets",
        pairHint: "Long-rest pair: optional between Incline DB breaks",
        swap: {
          name: "1-Arm Cable Lat Pulldown",
          sets: 3,
          reps: "10-12/arm",
          load: "24 kg stack (12 eff)",
          trackLoad: true,
          defaultWeightKg: 24,
          stepKg: 6,
          cue: "Free range if main stack busy",
        },
      },
      {
        id: "cg_lat_cable",
        name: "Cable Lateral Raise (2:1)",
        muscleGroup: "Side Delts",
        sets: 3,
        reps: "12-15/arm",
        load: "12 kg stack (~6 kg eff)",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12,
        stepKg: 3,
        maxRepsRegular: 15,
        cue: "Constant bottom tension; smooth wrist",
        swap: {
          name: "DB Lateral Raise",
          sets: 3,
          reps: "12-15",
          load: "7.5-10 kg",
          trackLoad: true,
          defaultWeightKg: 7.5,
          stepKg: 2.5,
          cue: "Control 2s descent",
        },
      },
      {
        id: "cg_inc_curl",
        name: "Incline DB Curl (45-60 deg)",
        muscleGroup: "Biceps",
        sets: 3,
        reps: "12-15",
        load: "7.5-12.5 kg",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 7.5,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "Bench at 45-60 deg (NEVER 30 deg) to guard front shoulder tendon",
        pairHint: "Antagonist pair: alternate with Cable Rope Pushdown",
        swap: {
          name: "Preacher EZ-Bar Curl",
          sets: 3,
          reps: "12-15",
          load: "Small EZ + plates",
          trackLoad: true,
          defaultWeightKg: 20,
          stepKg: 2.5,
          cue: "Strict bottom stretch, zero shoulder swing",
        },
      },
      {
        id: "cg_rope_tri_a",
        progressKey: "cg_rope_tri",
        name: "Cable Rope Pushdown (2:1)",
        muscleGroup: "Triceps",
        sets: 3,
        reps: "12-15",
        load: "24-36 kg stack",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 24,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Full stretch past 90 deg; zero dips or kickbacks",
        pairHint: "Antagonist pair: alternate with Incline DB Curl",
        swap: {
          name: "EZ-Bar Lying Skullcrusher",
          sets: 3,
          reps: "12-15",
          load: "17.5-25 kg",
          trackLoad: true,
          defaultWeightKg: 20,
          stepKg: 2.5,
          cue: "Elbows slightly back",
        },
      },
    ],
    lower_a: [
      {
        id: "cg_leg_ext",
        name: "Leg Extension (First! Knee Prime)",
        muscleGroup: "Quads",
        sets: 3,
        reps: "12-15",
        load: "35-55 kg stack",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 40,
        stepKg: 5,
        maxRepsRegular: 15,
        cue: "ALWAYS before Leg Press - warms patellar tendon safely",
        swap: {
          name: "Wall Sit Occlusion",
          sets: 3,
          reps: "45s",
          load: "Bodyweight",
          bodyweightOnly: true,
          cue: "Hands near knees OK at 112-115 kg",
        },
      },
      {
        id: "cg_leg_press",
        name: "Controlled Leg Press",
        muscleGroup: "Quads + Glutes",
        sets: 3,
        reps: "8-12",
        load: "90-140 kg",
        restSec: 120,
        trackLoad: true,
        defaultWeightKg: 100,
        stepKg: 10,
        maxRepsRegular: 12,
        cue: "Shoulder-width feet (NO ultra-wide Sumo catch; NEVER max first)",
        swap: {
          name: "Goblet Box Squat",
          sets: 3,
          reps: "10-12",
          load: "17.5-25 kg",
          trackLoad: true,
          defaultWeightKg: 20,
          stepKg: 2.5,
          cue: "Touch bench lightly, stay upright",
        },
      },
      {
        id: "cg_bb_rdl",
        name: "Barbell RDL (Straps On)",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "8-12",
        load: "50-75 kg",
        restSec: 120,
        trackLoad: true,
        isBarbellCompound: true,
        defaultWeightKg: 55,
        stepKg: 5,
        maxRepsRegular: 12,
        maxRepsLowTime: 14,
        cue: "Primary hamstring builder past 25 kg DB cap; bar shaves thighs",
        swap: {
          name: "Lying DB Hamstring Curl",
          sets: 3,
          reps: "12-15",
          load: "12.5-17.5 kg DB",
          trackLoad: true,
          defaultWeightKg: 12.5,
          stepKg: 2.5,
          cue: "Clamp DB cleanly between feet on bench; slow 3s lower",
        },
      },
      {
        id: "cg_calf_raise",
        name: "Standing / Leg-Press Calf Raise",
        muscleGroup: "Calves",
        sets: 3,
        reps: "12-15",
        load: "35-60 kg",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 40,
        stepKg: 5,
        maxRepsRegular: 15,
        cue: "2s pause in deep bottom stretch for Kilimanjaro ankles",
        swap: {
          name: "Single-Leg BW Calf Raise",
          sets: 3,
          reps: "15/leg",
          load: "Bodyweight",
          bodyweightOnly: true,
          cue: "Full heel drop off step edge",
        },
      },
      {
        id: "cg_cable_crunch",
        name: "Kneeling Cable Crunch",
        muscleGroup: "Core",
        sets: 3,
        reps: "12-15",
        load: "24-42 kg stack",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 30,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Flex ribs to pelvis (zero hip swinging); skip twists if cramping",
        pairHint: "Long-rest pair: optional between Calf breaks",
        swap: {
          name: "90-deg Slow Leg Raise",
          sets: 3,
          reps: "12-15",
          load: "Bodyweight",
          bodyweightOnly: true,
          cue: "Press lower back flat into pad",
        },
      },
    ],
    upper_b: [
      {
        id: "cg_ohp",
        name: "Seated DB OHP (75-80 deg)",
        muscleGroup: "Shoulders",
        sets: 3,
        reps: "8-12",
        load: "15-22.5 kg",
        restSec: 120,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Seated stops lower-back wobble; always BEFORE free-weight rows",
        swap: {
          name: "Half-Kneeling Cable Press",
          sets: 3,
          reps: "10-12/arm",
          load: "18 kg stack (9 kg eff)",
          trackLoad: true,
          defaultWeightKg: 18,
          stepKg: 3,
          cue: "Smooth ribcage stack",
        },
      },
      {
        id: "cg_lat_pd_close",
        name: "Close-Grip Neutral Lat Pulldown (Straps)",
        muscleGroup: "Lats + Biceps",
        sets: 3,
        reps: "8-12",
        load: "42-54 kg stack",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 42,
        stepKg: 6,
        maxRepsRegular: 12,
        cue: "V-bar + straps; stretch lats full at top without swinging torso",
        pairHint: "Long-rest pair: optional between OHP breaks",
        swap: {
          name: "1-Arm Cable Lat Pulldown",
          sets: 3,
          reps: "10-12/arm",
          load: "24 kg stack",
          trackLoad: true,
          defaultWeightKg: 24,
          stepKg: 6,
          cue: "Controlled squeeze",
        },
      },
      {
        id: "cg_cable_fly",
        name: "Cable Chest Fly (2:1 Pulley)",
        muscleGroup: "Chest Iso",
        sets: 3,
        reps: "12-15",
        load: "24-36 kg stack",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 24,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Standing cable fly on 2:1 pulley - full pec stretch, controlled constant tension",
        swap: {
          name: "Incline DB Press (30 deg)",
          sets: 3,
          reps: "8-12",
          load: "17.5-22.5 kg",
          trackLoad: true,
          defaultWeightKg: 20,
          stepKg: 2.5,
          cue: "Use if cable column is occupied",
        },
      },
      {
        id: "cg_db_row",
        name: "Bench-Braced 1-Arm DB Row (Straps)",
        muscleGroup: "Mid/Upper Back",
        sets: 3,
        reps: "8-12/arm",
        load: "17.5-25 kg",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 20,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "CG max DB = 25 kg; progress w/ 2s squeeze or Barbell Row swap",
        pairHint: "Long-rest pair: optional between Cable Fly breaks",
        swap: {
          name: "Barbell Bent-Over Row",
          sets: 3,
          reps: "8-12",
          load: "45-65 kg",
          trackLoad: true,
          isBarbellCompound: true,
          defaultWeightKg: 50,
          stepKg: 5,
          cue: "Breaks 25 kg DB ceiling cleanly",
        },
      },
      {
        id: "cg_lat_cable_b",
        progressKey: "cg_lat_cable",
        name: "Cable Lateral Raise (2:1)",
        muscleGroup: "Side Delts",
        sets: 3,
        reps: "12-15/arm",
        load: "12 kg stack (~6 kg eff)",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12,
        stepKg: 3,
        maxRepsRegular: 15,
        cue: "2nd weekly side-delt touch in the 4-core split; zero shoulder shrug",
        pairHint: "Superset w/ Rope Face Pull on same cable column",
        swap: {
          name: "DB Lateral Raise",
          sets: 3,
          reps: "12-15",
          load: "7.5-10 kg",
          trackLoad: true,
          defaultWeightKg: 7.5,
          stepKg: 2.5,
          cue: "Control 2s descent",
        },
      },
      {
        id: "cg_face_pull",
        name: "Rope Face Pull (Posture)",
        muscleGroup: "Rear Delts",
        sets: 3,
        reps: "12-15",
        load: "18-30 kg stack",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 18,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Pull rope to forehead, elbows high; shoulder-health anchor",
        swap: {
          name: "Bent-Over DB Rear Delt Fly",
          sets: 3,
          reps: "12-15",
          load: "5-7.5 kg DBs",
          trackLoad: true,
          defaultWeightKg: 7.5,
          stepKg: 2.5,
          cue: "Hinge torso, soft elbows, crisp rear-delt squeeze",
        },
      },
      {
        id: "cg_oh_cable_tri",
        name: "Overhead Cable Rope Extension (2:1)",
        muscleGroup: "Triceps Long Head",
        sets: 3,
        reps: "12-15",
        load: "24-36 kg stack (12-18 eff)",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 24,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Overhead stretch hits long head ~40% better than pushdowns alone; zero bench dips",
        pairHint: "Antagonist pair: alternate with Cable Rope Hammer Curl",
        swap: {
          name: "Cable Rope Pushdown (2:1)",
          sets: 3,
          reps: "12-15",
          load: "24-36 kg stack",
          trackLoad: true,
          defaultWeightKg: 24,
          stepKg: 6,
          cue: "Full elbow flex past 90 deg",
        },
      },
      {
        id: "cg_hammer_curl_b",
        progressKey: "cg_hammer_curl",
        name: "Cable Rope Hammer Curl (2:1)",
        muscleGroup: "Biceps + Brachialis",
        sets: 3,
        reps: "12-15",
        load: "24-30 kg stack",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 24,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Neutral grip hits brachialis & forearms; 2nd weekly bicep angle",
        pairHint: "Antagonist pair: alternate with Overhead Cable Extension",
        swap: {
          name: "Preacher EZ-Bar Curl",
          sets: 3,
          reps: "12-15",
          load: "17.5-22.5 kg",
          trackLoad: true,
          defaultWeightKg: 20,
          stepKg: 2.5,
          cue: "Strict bottom stretch, zero torso swing",
        },
      },
    ],
    lower_b: [
      {
        id: "cg_lying_db_curl",
        name: "Lying DB Hamstring Curl",
        muscleGroup: "Hamstrings (Flexion)",
        sets: 3,
        reps: "12-15",
        load: "10-17.5 kg DB",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "Warm knees w/ 2 light Leg Ext sets first. Clamp DB cleanly (or use ankle cuff on low 2:1 cable); trains short head RDL misses",
        swap: {
          name: "Barbell RDL (Straps On)",
          sets: 3,
          reps: "8-12",
          load: "50-75 kg",
          trackLoad: true,
          isBarbellCompound: true,
          defaultWeightKg: 55,
          stepKg: 5,
          cue: "Hip-hinge fallback if bench curl feels awkward",
        },
      },
      {
        id: "cg_sl_leg_press",
        name: "Single-Leg Controlled Leg Press",
        muscleGroup: "Quads (Unilateral)",
        sets: 3,
        reps: "8-12/leg",
        load: "45-70 kg",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 50,
        stepKg: 5,
        maxRepsRegular: 12,
        cue: "Beats CG 25 kg DB ceiling cleanly with zero lumbar fatigue; foot aligned w/ hip",
        swap: {
          name: "Goblet Box Squat (Heels Elevated)",
          sets: 3,
          reps: "10-12",
          load: "20-25 kg",
          trackLoad: true,
          defaultWeightKg: 20,
          stepKg: 2.5,
          cue: "Tap bench lightly, upright torso",
        },
      },
      {
        id: "cg_bridge",
        name: "Floor DB Glute Bridge (1.5-Rep)",
        muscleGroup: "Glutes",
        sets: 3,
        reps: "12-15",
        load: "25 kg DB (CG Max)",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 25,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "DB in hip crease (NO Bench Hip Thrust); 2s pause at top",
        swap: {
          name: "Single-Leg Floor Glute Bridge",
          sets: 3,
          reps: "12-15/leg",
          load: "BW / 10 kg DB",
          bodyweightOnly: true,
          cue: "Matches heavier bilateral load with 0 belly pinch",
        },
      },
      {
        id: "cg_stepup",
        name: "Controlled Step-Up (3s Step-Down)",
        muscleGroup: "Kili Knees",
        sets: 3,
        reps: "10-15/leg",
        load: "10-15 kg DBs",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 10,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "NO Reverse Lunges - slow 3s step-down bulletproofs knees for Kilimanjaro descents",
        swap: {
          name: "Single-Leg Extension",
          sets: 3,
          reps: "12-15/leg",
          load: "20-30 kg",
          trackLoad: true,
          defaultWeightKg: 25,
          stepKg: 5,
          cue: "Smooth patellar tracking",
        },
      },
      {
        id: "cg_calf_raise_b",
        progressKey: "cg_calf_raise",
        name: "Standing Calf Raise",
        muscleGroup: "Calves",
        sets: 3,
        reps: "12-15",
        load: "35-60 kg",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 40,
        stepKg: 5,
        maxRepsRegular: 15,
        cue: "Tracks unified Calf progression; pause 2s at bottom stretch",
        swap: {
          name: "Farmer Walk (Straps, 45s)",
          sets: 3,
          reps: "45s",
          load: "25 kg/hand",
          trackLoad: true,
          defaultWeightKg: 25,
          stepKg: 2.5,
          cue: "Tall posture, protects palm calluses",
        },
      },
      {
        id: "cg_pallof",
        name: "Cable Pallof Press (Anti-Rotation)",
        muscleGroup: "Core (Bracing)",
        sets: 3,
        reps: "12-15/side",
        load: "12-24 kg stack",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 18,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Press straight out & hold 2s/rep; builds trunk stability for Badminton & Kili pack",
        pairHint: "Long-rest pair: optional between Calf breaks",
        swap: {
          name: "Heavy Farmer Walk (Straps)",
          sets: 3,
          reps: "45s",
          load: "25 kg / hand",
          trackLoad: true,
          defaultWeightKg: 25,
          stepKg: 2.5,
          cue: "Tall ribs, straps on",
        },
      },
    ],
    ul_combo_a: [
      {
        id: "cg_bench",
        progressKey: "cg_bench_heavy",
        blockSection: "upper",
        name: "Flat Barbell Bench Press (Strength)",
        muscleGroup: "Chest",
        sets: 3,
        reps: "5-8",
        load: "57.5-77.5 kg",
        restSec: 180,
        trackBench: true,
        trackLoad: true,
        isBarbellCompound: true,
        defaultWeightKg: 57.5,
        stepKg: 2.5,
        maxRepsRegular: 8,
        maxRepsLowTime: 10,
        cue: "Weekend heavy anchor; mandatory spotter on heavy waves",
        swap: { name: "Flat DB Press", sets: 3, reps: "8-12", load: "20-25 kg", trackLoad: true, defaultWeightKg: 22.5, stepKg: 2.5 },
      },
      {
        id: "cg_cable_row",
        blockSection: "upper",
        name: "Seated Cable Row (Neutral, Straps)",
        muscleGroup: "Mid-Back",
        sets: 3,
        reps: "8-12",
        load: "42-54 kg stack",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 42,
        stepKg: 6,
        maxRepsRegular: 12,
        cue: "Chest tall, straps on; zero diaphragm pad crush",
        swap: { name: "Bench-Braced 1-Arm DB Row", sets: 3, reps: "8-12/arm", load: "20-25 kg", trackLoad: true, defaultWeightKg: 20, stepKg: 2.5 },
      },
      {
        id: "cg_lat_pd_wide",
        blockSection: "upper",
        name: "Lat Pulldown (Wide/Med, Straps)",
        muscleGroup: "Lats",
        sets: 3,
        reps: "8-12",
        load: "42-54 kg stack",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 48,
        stepKg: 6,
        maxRepsRegular: 12,
        cue: "Thumbless grip + straps; elbows to pockets",
        swap: { name: "1-Arm Cable Lat Pulldown", sets: 3, reps: "10-12/arm", load: "24 kg stack", trackLoad: true, defaultWeightKg: 24, stepKg: 6 },
      },
      {
        id: "cg_lat_cable",
        blockSection: "upper",
        name: "Cable Lateral Raise (2:1)",
        muscleGroup: "Side Delts",
        sets: 3,
        reps: "12-15/arm",
        load: "12 kg stack (~6 kg eff)",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12,
        stepKg: 3,
        maxRepsRegular: 15,
        cue: "Smooth bottom tension; pair w/ arms to save clock time",
        swap: { name: "DB Lateral Raise", sets: 3, reps: "12-15", load: "7.5-10 kg", trackLoad: true, defaultWeightKg: 7.5, stepKg: 2.5 },
      },
      {
        id: "cg_rope_tri_a",
        progressKey: "cg_rope_tri",
        blockSection: "upper",
        name: "Cable Rope Pushdown (2:1)",
        muscleGroup: "Triceps",
        sets: 3,
        reps: "12-15",
        load: "24-36 kg stack",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 24,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Full elbow flex past 90 deg; superset w/ curls if short on time",
        swap: { name: "EZ-Bar Lying Skullcrusher", sets: 3, reps: "12-15", load: "17.5-25 kg", trackLoad: true, defaultWeightKg: 20, stepKg: 2.5 },
      },
      {
        id: "cg_leg_ext",
        blockSection: "lower",
        name: "Leg Extension (Knee Prime)",
        muscleGroup: "Quads",
        sets: 3,
        reps: "12-15",
        load: "35-55 kg stack",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 40,
        stepKg: 5,
        maxRepsRegular: 15,
        cue: "Primes knees cleanly before Leg Press",
        swap: { name: "Wall Sit Occlusion", sets: 3, reps: "45s", load: "Bodyweight", bodyweightOnly: true },
      },
      {
        id: "cg_leg_press",
        blockSection: "lower",
        name: "Controlled Leg Press",
        muscleGroup: "Quads + Glutes",
        sets: 3,
        reps: "8-12",
        load: "90-140 kg",
        restSec: 120,
        trackLoad: true,
        defaultWeightKg: 100,
        stepKg: 10,
        maxRepsRegular: 12,
        cue: "Curated 21-set weekend heavy finisher (replaces 39-set junk volume)",
        swap: { name: "Goblet Box Squat", sets: 3, reps: "10-12", load: "20-25 kg", trackLoad: true, defaultWeightKg: 20, stepKg: 2.5 },
      },
    ],
    ul_combo_b: [
      {
        id: "cg_ohp",
        blockSection: "upper",
        name: "Seated DB OHP (75-80 deg)",
        muscleGroup: "Shoulders",
        sets: 3,
        reps: "8-12",
        load: "15-22.5 kg",
        restSec: 120,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Always BEFORE heavy pulls",
        swap: { name: "Half-Kneeling Cable Press", sets: 3, reps: "10-12/arm", load: "18 kg stack", trackLoad: true, defaultWeightKg: 18, stepKg: 3 },
      },
      {
        id: "cg_lat_pd_close",
        blockSection: "upper",
        name: "Close-Grip Neutral Lat Pulldown (Straps)",
        muscleGroup: "Lats + Biceps",
        sets: 3,
        reps: "8-12",
        load: "42-54 kg stack",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 42,
        stepKg: 6,
        maxRepsRegular: 12,
        cue: "V-bar + straps; full top stretch",
        swap: { name: "Bench-Braced 1-Arm DB Row", sets: 3, reps: "8-12/arm", load: "20-25 kg", trackLoad: true, defaultWeightKg: 20, stepKg: 2.5 },
      },
      {
        id: "cg_cable_fly",
        blockSection: "upper",
        name: "Cable Chest Fly (2:1 Pulley)",
        muscleGroup: "Chest Iso",
        sets: 3,
        reps: "12-15",
        load: "24-36 kg stack",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 24,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Constant tension pec stretch on 2:1 pulley",
        swap: { name: "Incline DB Press (30 deg)", sets: 3, reps: "8-12", load: "17.5-22.5 kg", trackLoad: true, defaultWeightKg: 20, stepKg: 2.5 },
      },
      {
        id: "cg_face_pull",
        blockSection: "upper",
        name: "Rope Face Pull (Posture)",
        muscleGroup: "Rear Delts",
        sets: 3,
        reps: "12-15",
        load: "18-30 kg stack",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 18,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Shoulder-health anchor",
        swap: { name: "Bent-Over DB Rear Delt Fly", sets: 3, reps: "12-15", load: "5-7.5 kg DBs", trackLoad: true, defaultWeightKg: 7.5, stepKg: 2.5 },
      },
      {
        id: "cg_oh_cable_tri",
        blockSection: "upper",
        name: "Overhead Cable Rope Extension (2:1)",
        muscleGroup: "Triceps Long Head",
        sets: 3,
        reps: "12-15",
        load: "24-36 kg stack",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 24,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Long-head stretch; pair w/ Hammer Curl if desired",
        swap: { name: "Cable Rope Hammer Curl (2:1)", sets: 3, reps: "12-15", load: "24-30 kg stack", trackLoad: true, defaultWeightKg: 24, stepKg: 6 },
      },
      {
        id: "cg_bb_rdl",
        blockSection: "lower",
        name: "Barbell RDL (Straps On)",
        muscleGroup: "Hamstrings + Glutes",
        sets: 3,
        reps: "8-12",
        load: "50-75 kg",
        restSec: 120,
        trackLoad: true,
        isBarbellCompound: true,
        defaultWeightKg: 55,
        stepKg: 5,
        maxRepsRegular: 12,
        maxRepsLowTime: 14,
        cue: "Fresh hinge after 5-min electrolyte reset; beats 25 kg DB cap",
        swap: { name: "Floor DB Glute Bridge (1.5-Rep)", sets: 3, reps: "12-15", load: "25 kg DB", trackLoad: true, defaultWeightKg: 25, stepKg: 2.5 },
      },
      {
        id: "cg_stepup",
        blockSection: "lower",
        name: "Controlled Step-Up (3s Step-Down)",
        muscleGroup: "Kili Knees + Quads",
        sets: 3,
        reps: "10-15/leg",
        load: "10-15 kg DBs",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 10,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "Slow 3s step-down for Kilimanjaro descent knees (NO reverse lunges)",
        swap: { name: "Single-Leg Controlled Leg Press", sets: 3, reps: "8-12/leg", load: "45-70 kg", trackLoad: true, defaultWeightKg: 50, stepKg: 5 },
      },
    ],
    full_body_plus: [
      {
        id: "cg_bench_vol",
        progressKey: "cg_bench_vol",
        name: "Flat Barbell Bench (Clean Volume)",
        muscleGroup: "Chest",
        sets: 3,
        reps: "10-12",
        load: "50-62.5 kg",
        restSec: 120,
        trackBench: true,
        trackLoad: true,
        isBarbellCompound: true,
        defaultWeightKg: 52.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        maxRepsLowTime: 14,
        cue: "Separate Day 5 volume touch (never corrupts Heavy Bench progression)",
        swap: {
          name: "Cable Chest Fly (2:1 Pulley)",
          sets: 3,
          reps: "12-15",
          load: "24-36 kg stack",
          trackLoad: true,
          defaultWeightKg: 24,
          stepKg: 6,
          cue: "Use if Bench busy or shoulders feel tight",
        },
      },
      {
        id: "cg_lat_cable_fb",
        progressKey: "cg_lat_cable",
        name: "Cable Lateral Raise (2:1)",
        muscleGroup: "Side Delts",
        sets: 3,
        reps: "12-15/arm",
        load: "12 kg stack",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12,
        stepKg: 3,
        maxRepsRegular: 15,
        cue: "Extra side-delt width volume (3rd weekly touch)",
        swap: {
          name: "DB Lateral Raise",
          sets: 3,
          reps: "12-15",
          load: "7.5-10 kg",
          trackLoad: true,
          defaultWeightKg: 7.5,
          stepKg: 2.5,
          cue: "Soft elbows",
        },
      },
      {
        id: "cg_rope_tri",
        name: "Cable Rope Pushdown (2:1)",
        muscleGroup: "Triceps Lateral/Medial",
        sets: 3,
        reps: "12-15",
        load: "24-36 kg stack (12-18 eff)",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 24,
        stepKg: 6,
        maxRepsRegular: 15,
        cue: "Balances Upper B overhead long-head stretch; full elbow flex past 90 deg",
        swap: {
          name: "EZ-Bar Lying Skullcrusher",
          sets: 3,
          reps: "12-15",
          load: "17.5-25 kg",
          trackLoad: true,
          defaultWeightKg: 20,
          stepKg: 2.5,
          cue: "Elbows slightly back",
        },
      },
      {
        id: "cg_preacher_curl",
        name: "Preacher EZ-Bar Curl",
        muscleGroup: "Biceps (Peak)",
        sets: 3,
        reps: "12-15",
        load: "17.5-25 kg",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 20,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "3rd weekly bicep variation; strict elbow-on-pad stretch",
        pairHint: "Long-rest pair: optional between Pushdown breaks",
        swap: {
          name: "Cable Rope Hammer Curl (2:1)",
          sets: 3,
          reps: "12-15",
          load: "24-30 kg stack",
          trackLoad: true,
          defaultWeightKg: 24,
          stepKg: 6,
          cue: "Neutral brachialis swap",
        },
      },
      {
        id: "cg_farmer_walk",
        name: "Heavy Farmer Walk (Straps)",
        muscleGroup: "Core + Traps",
        sets: 3,
        reps: "45s",
        load: "25 kg / hand",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 25,
        stepKg: 2.5,
        timeBased: true,
        cue: "Braced Kili pack posture + carries; zero lumbar shear",
        swap: {
          name: "Kneeling Cable Crunch",
          sets: 3,
          reps: "12-15",
          load: "30 kg stack",
          trackLoad: true,
          defaultWeightKg: 30,
          stepKg: 6,
          cue: "Controlled rib-to-pelvis curl",
        },
      },
    ],
    cardio_pool: [
      {
        id: "cg_jog_incline",
        name: "Easy Zone-2 Jog or Incline Walk",
        muscleGroup: "Zone-2 Cardio",
        sets: 1,
        reps: "20-35 min",
        load: "Conversational Pace",
        restSec: 0,
        timeBased: true,
        cue: "Shoes ON, ZERO ankle weights; Foracort/PFT friendly steady nasal breathing",
        swap: {
          name: "Cross Trainer Elliptical",
          sets: 1,
          reps: "20-25 min",
          load: "Level 5",
          cue: "Zero-impact Zone-2 cardiac base",
        },
      },
      {
        id: "cg_swim",
        name: "CG Clubhouse Pool Swim",
        muscleGroup: "Pool Conditioning",
        sets: 1,
        reps: "25-30 min",
        load: "Continuous Laps",
        restSec: 0,
        timeBased: true,
        cue: "JAGDISH RULE: Always swim AFTER lifting weights, never before heavy bench",
        swap: {
          name: "15k Step Campus Walk",
          sets: 1,
          reps: "45 min",
          load: "Zone-2 Walk",
          cue: "Steady outdoor recovery walk",
        },
      },
      {
        id: "cg_badminton_mob",
        name: "Badminton + Hip/Ankle Mobility",
        muscleGroup: "Sport + Mobility",
        sets: 1,
        reps: "45-90 min",
        load: "Sunday Crew / Recovery",
        restSec: 0,
        timeBased: true,
        cue: "Protect knees with warm-up leg swings; log quick minutes cleanly",
        swap: {
          name: "Shoes-On 2.5 kg DB Jumping Jacks",
          sets: 4,
          reps: "45 reps",
          load: "2.5-3 kg DBs (Shoes ON)",
          cue: "Brisk finisher if court unavailable",
        },
      },
    ],
  },
  home_zero: {
    upper_a: [
      {
        id: "hm_pushup",
        name: "Countertop Deficit Push-Up",
        muscleGroup: "Chest",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight / 3s Eccentric",
        restSec: 90,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "3s controlled descent + 1s deep chest stretch pause",
        swap: {
          name: "Close-Grip Countertop Push-Up",
          sets: 3,
          reps: "12-15",
          load: "Bodyweight",
          trackLoad: true,
          bodyweightOnly: true,
          cue: "Elbows tucked cleanly",
        },
      },
      {
        id: "hm_door_row",
        name: "Knotted Door-Sheet Inverted Row",
        muscleGroup: "Lats + Mid-Back",
        sets: 3,
        reps: "12-15",
        load: "BW Angle",
        restSec: 90,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Anchor sheet OVER closed door (pull away from hinges); walk feet forward for load",
        swap: {
          name: "Door-Towel Isometric Row Pull",
          sets: 3,
          reps: "30s pull",
          load: "High Tension",
          cue: "Safe fallback if door angle limited",
        },
      },
      {
        id: "hm_chest_fly_iso",
        name: "Wide Countertop Stretch Push-Up",
        muscleGroup: "Upper Chest",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 75,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Hands wider on edge; slow bottom stretch",
        swap: {
          name: "Feet-Elevated Bed Pike Push-Up",
          sets: 3,
          reps: "10-12",
          load: "Bodyweight",
          trackLoad: true,
          bodyweightOnly: true,
          cue: "Shifts load to clavicular pecs & delts",
        },
      },
      {
        id: "hm_pack_row",
        name: "Chair-Braced Backpack 1-Arm Row",
        muscleGroup: "Mid-Back",
        sets: 3,
        reps: "8-12/arm",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Wide rear-foot stance; zero diaphragm crush",
        swap: {
          name: "Prone Floor Y-T-W Raises",
          sets: 3,
          reps: "15",
          load: "1-2.5 kg",
          trackLoad: true,
          bodyweightOnly: true,
          cue: "Scapular posture control",
        },
      },
      {
        id: "hm_lat_home",
        name: "2.5-3 kg Slow 3s Lateral Raise",
        muscleGroup: "Side Delts",
        sets: 3,
        reps: "12-15",
        load: "2.5-3 kg DBs",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 3,
        stepKg: 0.5,
        maxRepsRegular: 15,
        cue: "Zero swing; 3s lowering matches CG 12 kg cable stimulus",
        swap: {
          name: "Mechanical Delt Giant Set",
          sets: 3,
          reps: "15+15+15",
          load: "2.5-3 kg DBs",
          cue: "Rear fly -> slow lateral -> OHP nonstop",
        },
      },
      {
        id: "hm_sofa_curl",
        name: "45-60 deg Sofa Backpack Curl",
        muscleGroup: "Biceps",
        sets: 3,
        reps: "12-15",
        load: "10-15 kg bag",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "Keep torso 45-60 deg; squeeze pinky up at top",
        swap: {
          name: "Towel-Under-Foot Drag Curl",
          sets: 3,
          reps: "12-15",
          load: "Self-Resistance",
          trackLoad: true,
          bodyweightOnly: true,
          cue: "Smooth peak tension",
        },
      },
      {
        id: "hm_tri_push_a",
        progressKey: "hm_push_close",
        name: "Close-Grip Countertop Tricep Push-Up",
        muscleGroup: "Triceps",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Elbows tucked tightly to ribs; zero bench/chair dips",
        swap: {
          name: "Overhead Backpack Tricep Ext",
          sets: 3,
          reps: "12-15",
          load: "10-15 kg bag",
          trackLoad: true,
          defaultWeightKg: 12.5,
          stepKg: 2.5,
          cue: "Deep long-head stretch behind head",
        },
      },
    ],
    lower_a: [
      {
        id: "hm_occlusion",
        name: "Wall Sit -> Heels-Elevated Squat",
        muscleGroup: "Quads",
        sets: 3,
        reps: "45s + 15",
        load: "Isometric Occlusion",
        restSec: 90,
        timeBased: true,
        cue: "45s Wall Sit -> 15s breather -> 15 slow squats = heavy quad stimulus",
        swap: {
          name: "Heels-Elevated 1.5-Rep Squat",
          sets: 3,
          reps: "12-15",
          load: "Loaded Backpack",
          trackLoad: true,
          defaultWeightKg: 15,
          stepKg: 2.5,
          cue: "Heels on thin book for clean knee track",
        },
      },
      {
        id: "hm_kickstand_rdl",
        progressKey: "hm_rdl",
        name: "Kickstand Backpack RDL",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "8-12/leg",
        load: "15-20 kg bag",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "80% weight on front heel; hinges hips cleanly for hamstring stretch",
        swap: {
          name: "Towel Floor Hamstring Slide",
          sets: 3,
          reps: "12-15",
          load: "Socks on smooth tile",
          trackLoad: true,
          bodyweightOnly: true,
          cue: "Eccentric hamstring scorcher",
        },
      },
      {
        id: "hm_sl_bridge",
        name: "Single-Leg Bed-Edge Glute Bridge",
        muscleGroup: "Glutes",
        sets: 3,
        reps: "12-15/leg",
        load: "BW (~50 kg eq/leg)",
        restSec: 75,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Zero belly pinch; beats 25 kg bilateral cap",
        swap: {
          name: "Floor Backpack Glute Bridge",
          sets: 3,
          reps: "15",
          load: "20 kg bag",
          trackLoad: true,
          defaultWeightKg: 20,
          stepKg: 2.5,
          cue: "2s pause at top",
        },
      },
      {
        id: "hm_step_up",
        name: "Staircase / Box Step-Ups (3s Down)",
        muscleGroup: "Kili Knees",
        sets: 3,
        reps: "10-15/leg",
        load: "BW / 3 kg DBs",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Slow 3s step-down builds Kili descent knees (NO reverse lunges)",
        swap: {
          name: "Spanish Squat (Towel/Band)",
          sets: 3,
          reps: "15",
          load: "Bodyweight",
          trackLoad: true,
          bodyweightOnly: true,
          cue: "Knee-friendly quad tension",
        },
      },
      {
        id: "hm_calves_core",
        name: "Single-Leg Stair Calf Raise + Deadbug",
        muscleGroup: "Calves + Core",
        sets: 3,
        reps: "15 + 12",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        cue: "Full heel stretch off stair edge -> slow controlled deadbugs",
        swap: {
          name: "Side Plank",
          sets: 3,
          reps: "35s/side",
          load: "Bodyweight",
          cue: "Steady anti-lateral bracing",
        },
      },
    ],
    upper_b: [
      {
        id: "hm_ohp_home",
        name: "Bed-Feet Pike Overhead Push-Up",
        muscleGroup: "Shoulders",
        sets: 3,
        reps: "8-12",
        load: "Bodyweight",
        restSec: 90,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 12,
        cue: "Smooth vertical press; always run BEFORE backpack rows",
        swap: {
          name: "Backpack Overhead Press",
          sets: 3,
          reps: "8-12",
          load: "12-16 kg bag",
          trackLoad: true,
          defaultWeightKg: 12.5,
          stepKg: 2.5,
          cue: "Glutes tight, ribs down",
        },
      },
      {
        id: "hm_door_row_b",
        progressKey: "hm_door_row",
        name: "Knotted Door-Sheet Row (Narrow)",
        muscleGroup: "Lats + Biceps",
        sets: 3,
        reps: "12-15",
        load: "BW Angle",
        restSec: 90,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Narrow neutral hand grip -> strong lat + bicep stretch",
        swap: {
          name: "Door-Towel Isometric Hold",
          sets: 3,
          reps: "30s",
          load: "High Tension",
          cue: "Squeeze lats down",
        },
      },
      {
        id: "hm_push_close",
        progressKey: "hm_pushup",
        name: "Close-Grip Countertop Push-Up",
        muscleGroup: "Chest + Triceps",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 75,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Replaces CG bench + rope work safely (NO chair/bed dips)",
        swap: {
          name: "Backpack Floor Press",
          sets: 3,
          reps: "12-15",
          load: "15-20 kg bag",
          trackLoad: true,
          defaultWeightKg: 15,
          stepKg: 2.5,
          cue: "Elbows 45 deg",
        },
      },
      {
        id: "hm_pack_row_b",
        progressKey: "hm_pack_row",
        name: "Chair-Braced Backpack Row",
        muscleGroup: "Mid/Upper Back",
        sets: 3,
        reps: "8-12/arm",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Pull elbow toward hip with 1s pause",
        swap: {
          name: "Prone Y-T-W Raise",
          sets: 3,
          reps: "15",
          load: "BW / 1 kg",
          trackLoad: true,
          bodyweightOnly: true,
          cue: "Scapular posture",
        },
      },
      {
        id: "hm_rear_ytw",
        name: "Bent-Over 2.5 kg Rear Delt Fly",
        muscleGroup: "Rear Delts",
        sets: 3,
        reps: "12-15",
        load: "2.5-3 kg DBs",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 3,
        stepKg: 0.5,
        maxRepsRegular: 15,
        cue: "Chest supported on knees or hip hinge; thumbs out slightly",
        swap: {
          name: "Wall Scapular Slides",
          sets: 3,
          reps: "15",
          load: "Bodyweight",
          trackLoad: true,
          bodyweightOnly: true,
          cue: "Opens desk posture",
        },
      },
      {
        id: "hm_oh_tri",
        name: "Overhead Backpack Tricep Ext",
        muscleGroup: "Triceps Long Head",
        sets: 3,
        reps: "12-15",
        load: "10-15 kg bag",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "Deep stretch behind head; NO bench dips",
        swap: {
          name: "Diamond Wall / Counter Push-Up",
          sets: 3,
          reps: "12-15",
          load: "Bodyweight",
          trackLoad: true,
          bodyweightOnly: true,
          cue: "Keep elbows tucked",
        },
      },
      {
        id: "hm_drag_curl_b",
        progressKey: "hm_drag_curl",
        name: "Towel-Under-Foot Drag Curl",
        muscleGroup: "Biceps",
        sets: 3,
        reps: "12-15",
        load: "Self-Resistance",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Pair with Tricep Extension so Home Upper B hits both arm flexors & extensors",
        swap: {
          name: "Sofa Backpack Hammer Curl",
          sets: 3,
          reps: "12-15",
          load: "10-15 kg bag",
          trackLoad: true,
          defaultWeightKg: 12.5,
          stepKg: 2.5,
          cue: "Neutral grip brachialis bias",
        },
      },
    ],
    lower_b: [
      {
        id: "hm_towel_ham",
        progressKey: "hm_towel_ham",
        name: "Towel Floor Hamstring Slide",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "12-15",
        load: "Socks / Towel on Tile",
        restSec: 90,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Bridge hips high, slide heels slow for 3s to target pure hamstrings",
        swap: {
          name: "Kickstand Backpack RDL",
          sets: 3,
          reps: "8-12/leg",
          load: "15-20 kg bag",
          trackLoad: true,
          defaultWeightKg: 17.5,
          stepKg: 2.5,
          cue: "80% load on front leg",
        },
      },
      {
        id: "hm_heels_sq",
        name: "Heels-Elevated 1.5-Rep Squat",
        muscleGroup: "Quads",
        sets: 3,
        reps: "8-12",
        load: "15-20 kg bag",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Heels on thin book; smooth depth without forward fold",
        swap: {
          name: "Wall Sit Occlusion",
          sets: 3,
          reps: "45s",
          load: "Bodyweight",
          cue: "Deep quad burn",
        },
      },
      {
        id: "hm_sl_bridge_b",
        progressKey: "hm_sl_bridge",
        name: "Single-Leg Bed-Edge Bridge",
        muscleGroup: "Glutes",
        sets: 3,
        reps: "12-15/leg",
        load: "Bodyweight",
        restSec: 75,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "2s lockout squeeze",
        swap: {
          name: "Frog Pump Bridge",
          sets: 3,
          reps: "20",
          load: "Bodyweight",
          trackLoad: true,
          bodyweightOnly: true,
          cue: "Soles together, knees wide",
        },
      },
      {
        id: "hm_calf_stair",
        name: "Single-Leg Stair Calf Raise",
        muscleGroup: "Calves",
        sets: 3,
        reps: "15/leg",
        load: "Bodyweight",
        restSec: 45,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        cue: "Slow 3s lowering past step level",
        swap: {
          name: "Two-Leg Tempo Calf Raise",
          sets: 3,
          reps: "20",
          load: "Backpack",
          trackLoad: true,
          defaultWeightKg: 15,
          stepKg: 2.5,
          cue: "2s hold at top",
        },
      },
      {
        id: "hm_core_deadbug",
        name: "Slow Deadbug + Hollow Hold",
        muscleGroup: "Core",
        sets: 3,
        reps: "12/side",
        load: "Bodyweight",
        restSec: 45,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        cue: "Low back glued to mat",
        swap: {
          name: "Side Plank",
          sets: 3,
          reps: "35s/side",
          load: "Bodyweight",
          cue: "Brace obliques",
        },
      },
    ],
    ul_combo_a: [
      {
        id: "hm_pushup",
        blockSection: "upper",
        name: "Countertop Deficit Push-Up",
        muscleGroup: "Chest",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight / 3s Eccentric",
        restSec: 90,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Deep chest stretch pause",
        swap: { name: "Wide Stretch Push-Up", sets: 3, reps: "12-15", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "hm_door_row",
        blockSection: "upper",
        name: "Knotted Door-Sheet Inverted Row",
        muscleGroup: "Lats + Mid-Back",
        sets: 3,
        reps: "12-15",
        load: "BW Angle",
        restSec: 90,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Pull away from door hinges",
        swap: { name: "Chair-Braced Backpack Row", sets: 3, reps: "8-12/arm", load: "15 kg bag", trackLoad: true, defaultWeightKg: 15, stepKg: 2.5 },
      },
      {
        id: "hm_lat_home",
        blockSection: "upper",
        name: "2.5-3 kg Slow 3s Lateral Raise",
        muscleGroup: "Side Delts",
        sets: 3,
        reps: "12-15",
        load: "2.5-3 kg DBs",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 3,
        stepKg: 0.5,
        maxRepsRegular: 15,
        cue: "3s lowering",
        swap: { name: "Mechanical Delt Giant Set", sets: 3, reps: "15+15+15", load: "3 kg DBs" },
      },
      {
        id: "hm_sofa_curl",
        blockSection: "upper",
        name: "45-60 deg Sofa Backpack Curl",
        muscleGroup: "Biceps",
        sets: 3,
        reps: "12-15",
        load: "10-15 kg bag",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "Superset w/ Tricep Push-Up",
        swap: { name: "Towel Drag Curl", sets: 3, reps: "12-15", load: "Self-Resist", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "hm_tri_push_a",
        progressKey: "hm_push_close",
        blockSection: "upper",
        name: "Close-Grip Countertop Tricep Push-Up",
        muscleGroup: "Triceps",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Elbows tucked",
        swap: { name: "Overhead Backpack Tricep Ext", sets: 3, reps: "12-15", load: "12.5 kg bag", trackLoad: true, defaultWeightKg: 12.5, stepKg: 2.5 },
      },
      {
        id: "hm_occlusion",
        blockSection: "lower",
        name: "Wall Sit -> Heels-Elevated Squat",
        muscleGroup: "Quads",
        sets: 3,
        reps: "45s + 15",
        load: "Isometric Occlusion",
        restSec: 90,
        timeBased: true,
        cue: "45s Wall Sit -> 15 squats",
        swap: { name: "Heels-Elevated 1.5-Rep Squat", sets: 3, reps: "10-12", load: "15 kg bag", trackLoad: true, defaultWeightKg: 15, stepKg: 2.5 },
      },
      {
        id: "hm_sl_bridge",
        blockSection: "lower",
        name: "Single-Leg Bed-Edge Glute Bridge",
        muscleGroup: "Glutes",
        sets: 3,
        reps: "12-15/leg",
        load: "Bodyweight",
        restSec: 75,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "2s pause at top",
        swap: { name: "Kickstand Backpack RDL", sets: 3, reps: "8-12/leg", load: "17.5 kg bag", trackLoad: true, defaultWeightKg: 17.5, stepKg: 2.5 },
      },
    ],
    ul_combo_b: [
      {
        id: "hm_ohp_home",
        blockSection: "upper",
        name: "Bed-Feet Pike Overhead Push-Up",
        muscleGroup: "Shoulders",
        sets: 3,
        reps: "8-12",
        load: "Bodyweight",
        restSec: 90,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 12,
        cue: "Run BEFORE backpack rows",
        swap: { name: "Backpack Overhead Press", sets: 3, reps: "8-12", load: "12.5 kg bag", trackLoad: true, defaultWeightKg: 12.5, stepKg: 2.5 },
      },
      {
        id: "hm_pack_row_b",
        progressKey: "hm_pack_row",
        blockSection: "upper",
        name: "Chair-Braced Backpack Row",
        muscleGroup: "Mid/Upper Back",
        sets: 3,
        reps: "8-12/arm",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "1s squeeze at top",
        swap: { name: "Knotted Door-Sheet Row", sets: 3, reps: "12-15", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "hm_rear_ytw",
        blockSection: "upper",
        name: "Bent-Over 2.5 kg Rear Delt Fly",
        muscleGroup: "Rear Delts",
        sets: 3,
        reps: "12-15",
        load: "2.5-3 kg DBs",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 3,
        stepKg: 0.5,
        maxRepsRegular: 15,
        cue: "Thumbs slightly out",
        swap: { name: "Wall Scapular Slides", sets: 3, reps: "15", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "hm_oh_tri",
        blockSection: "upper",
        name: "Overhead Backpack Tricep Ext",
        muscleGroup: "Triceps Long Head",
        sets: 3,
        reps: "12-15",
        load: "10-15 kg bag",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "Deep stretch behind head",
        swap: { name: "Close-Grip Countertop Push-Up", sets: 3, reps: "12-15", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "hm_drag_curl_b",
        progressKey: "hm_drag_curl",
        blockSection: "upper",
        name: "Towel-Under-Foot Drag Curl",
        muscleGroup: "Biceps",
        sets: 3,
        reps: "12-15",
        load: "Self-Resistance",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Pair w/ OH Tricep Ext",
        swap: { name: "Sofa Backpack Curl", sets: 3, reps: "12-15", load: "12.5 kg bag", trackLoad: true, defaultWeightKg: 12.5, stepKg: 2.5 },
      },
      {
        id: "hm_kickstand_rdl",
        progressKey: "hm_rdl",
        blockSection: "lower",
        name: "Kickstand Backpack RDL",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "8-12/leg",
        load: "15-20 kg bag",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "80% front-heel bias",
        swap: { name: "Towel Floor Hamstring Slide", sets: 3, reps: "12-15", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "hm_step_up",
        blockSection: "lower",
        name: "Staircase / Box Step-Ups (3s Down)",
        muscleGroup: "Kili Knees + Quads",
        sets: 3,
        reps: "10-15/leg",
        load: "BW / 3 kg DBs",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Slow 3s step-down",
        swap: { name: "Wall Sit Occlusion", sets: 3, reps: "45s", load: "BW" },
      },
    ],
    full_body_plus: [
      {
        id: "hm_fb_push",
        progressKey: "hm_pushup",
        name: "Countertop Deficit Push-Up",
        muscleGroup: "Chest",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 75,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Extra chest volume cleanly away from CG gym",
        swap: { name: "Standard Deficit Push-Up", sets: 3, reps: "15", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "Slow lower" },
      },
      {
        id: "hm_fb_row",
        progressKey: "hm_door_row",
        name: "Knotted Door-Sheet Inverted Row",
        muscleGroup: "Back",
        sets: 3,
        reps: "12-15",
        load: "BW Angle",
        restSec: 75,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Balances pushing volume cleanly",
        swap: { name: "Backpack 1-Arm Row", sets: 3, reps: "12-15/arm", load: "15 kg", trackLoad: true, defaultWeightKg: 15, stepKg: 2.5, cue: "Chair braced" },
      },
      {
        id: "hm_fb_delt",
        progressKey: "hm_lat_home",
        name: "2.5-3 kg DB Mechanical Giant Set",
        muscleGroup: "Shoulders",
        sets: 3,
        reps: "15+15+15",
        load: "2.5-3 kg DBs",
        restSec: 75,
        cue: "Rear fly -> Lateral -> OHP nonstop",
        swap: { name: "Slow Lateral Raise", sets: 3, reps: "15", load: "3 kg", trackLoad: true, defaultWeightKg: 3, stepKg: 0.5, cue: "3s eccentric" },
      },
      {
        id: "hm_fb_arms",
        progressKey: "hm_sofa_curl",
        name: "Sofa Curl + Overhead Bag Tricep Pair",
        muscleGroup: "Arms",
        sets: 3,
        reps: "12-15",
        load: "10-15 kg bag",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "Zero rest switching curl <-> overhead tricep",
        swap: { name: "Towel Drag Curl", sets: 3, reps: "15", load: "Self-Resist", trackLoad: true, bodyweightOnly: true, cue: "Strict tension" },
      },
      {
        id: "hm_fb_leg_core",
        name: "Wall Sit 45s + Suitcase Carry",
        muscleGroup: "Legs + Core",
        sets: 3,
        reps: "45s",
        load: "15-20 kg bag",
        restSec: 60,
        timeBased: true,
        cue: "Builds posture & Kili quad stamina",
        swap: { name: "Side Plank", sets: 3, reps: "35s/side", load: "BW", cue: "Clean core hold" },
      },
    ],
    cardio_pool: [
      {
        id: "hm_jog_steps",
        name: "Campus Zone-2 Jog or Brisk Walk",
        muscleGroup: "Zone-2 Cardio",
        sets: 1,
        reps: "30-45 min",
        load: "Zone-2 Pace",
        restSec: 0,
        timeBased: true,
        cue: "Shoes ON; steady breathing pace (PFT friendly) toward 12k-15k steps",
        swap: {
          name: "Shoes-On 2.5 kg DB Jumping Jacks",
          sets: 4,
          reps: "45 reps",
          load: "2.5-3 kg DBs",
          cue: "Never barefoot or in Crocs",
        },
      },
      {
        id: "hm_mob_drill",
        name: "Kili Ankle + Hip Flexor Mobility",
        muscleGroup: "Mobility",
        sets: 1,
        reps: "10-15 min",
        load: "Bodyweight",
        restSec: 0,
        timeBased: true,
        cue: "Wall ankle dorsiflexion + couch stretch for long desk days",
        swap: { name: "Easy Stretch Walk", sets: 1, reps: "15 min", load: "Easy", cue: "Loosen hips" },
      },
    ],
  },
  nomad_hotel: {
    upper_a: [
      {
        id: "nm_desk_push",
        name: "Hotel Desk Incline Deficit Push-Up",
        muscleGroup: "Chest",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight / 3s Eccentric",
        restSec: 75,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Clean deep stretch; zero wrist or shoulder pinch",
        swap: { name: "Backpack Floor Press", sets: 3, reps: "12-15", load: "15 kg bag", trackLoad: true, defaultWeightKg: 15, stepKg: 2.5, cue: "Pause at bottom" },
      },
      {
        id: "nm_suitcase_row",
        name: "Suitcase Chair-Braced 1-Arm Row",
        muscleGroup: "Mid-Back",
        sets: 3,
        reps: "8-12/arm",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Pack laptop/clothes to hit target load",
        swap: { name: "Door-Towel Inverted Row", sets: 3, reps: "12-15", load: "BW Angle", trackLoad: true, bodyweightOnly: true, cue: "Check door hinge direction" },
      },
      {
        id: "nm_pack_ohp",
        name: "Suitcase / Backpack Overhead Press",
        muscleGroup: "Shoulders",
        sets: 3,
        reps: "8-12",
        load: "12-16 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Glutes squeezed, ribs stacked",
        swap: { name: "Wall Pike Press", sets: 3, reps: "10-12", load: "Bodyweight", trackLoad: true, bodyweightOnly: true, cue: "Smooth depth" },
      },
      {
        id: "nm_strap_curl",
        name: "Carry-On Strap Curl + Floor Angels",
        muscleGroup: "Biceps + Posture",
        sets: 3,
        reps: "12-15",
        load: "12-16 kg bag",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "Opens slumped travel upper back",
        swap: { name: "Prone Y-T-W Floor Raise", sets: 3, reps: "15", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "Slow squeeze" },
      },
      {
        id: "nm_desk_tri",
        name: "Close-Grip Desk Tricep Push-Up",
        muscleGroup: "Triceps",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Elbows narrow (Zero Chair Dips)",
        swap: { name: "Overhead Bag Tricep Ext", sets: 3, reps: "12-15", load: "12 kg bag", trackLoad: true, defaultWeightKg: 12, stepKg: 2.5, cue: "Full stretch" },
      },
    ],
    lower_a: [
      {
        id: "nm_wall_squat",
        name: "45s Wall Sit -> 15 BW Squats",
        muscleGroup: "Quads",
        sets: 3,
        reps: "45s + 15",
        load: "Occlusion Pair",
        restSec: 75,
        timeBased: true,
        cue: "Glycogen sponge before travel/wedding dinners",
        swap: { name: "Stair / Low-Chair Step-Ups", sets: 3, reps: "12/leg", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "NO Reverse Lunges" },
      },
      {
        id: "nm_bag_rdl",
        progressKey: "nm_rdl",
        name: "Kickstand Carry-On Bag RDL",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "8-12/leg",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Pure hamstring stretch without equipment",
        swap: { name: "Towel Hamstring Slide", sets: 3, reps: "12-15", load: "Hotel Tile", trackLoad: true, bodyweightOnly: true, cue: "Slow 3s slide" },
      },
      {
        id: "nm_bed_bridge",
        name: "Single-Leg Bed-Edge Glute Bridge",
        muscleGroup: "Glutes",
        sets: 3,
        reps: "12-15/side",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        cue: "Zero equipment required",
        swap: { name: "Single-Leg Calf Raise", sets: 3, reps: "15/leg", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "Tall calf stretch" },
      },
      {
        id: "nm_hotel_calves",
        name: "Single-Leg Step Calf Raise + Plank",
        muscleGroup: "Calves + Core",
        sets: 3,
        reps: "15 + 45s",
        load: "Bodyweight",
        restSec: 45,
        cue: "Full ankle range + clean core brace",
        swap: { name: "Side Plank", sets: 3, reps: "35s/side", load: "BW", cue: "Zero low-back strain" },
      },
    ],
    upper_b: [
      {
        id: "nm_ohp_b",
        progressKey: "nm_pack_ohp",
        name: "Backpack Overhead Press",
        muscleGroup: "Shoulders",
        sets: 3,
        reps: "8-12",
        load: "12-16 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Strict torso stack",
        swap: { name: "Wall Pike Press", sets: 3, reps: "10-12", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "Controlled tempo" },
      },
      {
        id: "nm_towel_row_b",
        progressKey: "nm_suitcase_row",
        name: "Suitcase Row + Door Towel Pull",
        muscleGroup: "Back",
        sets: 3,
        reps: "8-12/arm",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "High tension horizontal pull",
        swap: { name: "Prone Floor Y-T-W", sets: 3, reps: "15", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "Rear delt + upper back" },
      },
      {
        id: "nm_push_b",
        progressKey: "nm_desk_push",
        name: "Desk Deficit Push-Up",
        muscleGroup: "Chest",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Smooth pec stretch",
        swap: { name: "Close-Grip Desk Push-Up", sets: 3, reps: "15", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "Lock triceps" },
      },
      {
        id: "nm_arms_b",
        progressKey: "nm_strap_curl",
        name: "Carry-On Curl + Overhead Bag Tricep",
        muscleGroup: "Arms",
        sets: 3,
        reps: "12-15",
        load: "12-16 kg bag",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "Balanced biceps & long-head triceps",
        swap: { name: "Close-Grip Desk Push-Up", sets: 3, reps: "15", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "Elbows tucked" },
      },
    ],
    lower_b: [
      {
        id: "nm_rdl_b",
        progressKey: "nm_rdl",
        name: "Kickstand Carry-On RDL",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "8-12/leg",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Primary hotel hinge",
        swap: { name: "Single-Leg Bridge", sets: 3, reps: "15/leg", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "2s hold" },
      },
      {
        id: "nm_step_b",
        name: "Hotel Stair / Low-Chair Step-Ups",
        muscleGroup: "Quads + Kili Knees",
        sets: 3,
        reps: "12/leg",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        cue: "3s controlled descent (NO Reverse Lunges)",
        swap: { name: "45s Wall Sit", sets: 3, reps: "45s", load: "BW", cue: "Deep quad burn" },
      },
      {
        id: "nm_bridge_b",
        progressKey: "nm_bed_bridge",
        name: "Single-Leg Bed-Edge Glute Bridge",
        muscleGroup: "Glutes",
        sets: 3,
        reps: "15/leg",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        cue: "Squeeze glute cleanly at top",
        swap: { name: "Frog Bridge", sets: 3, reps: "20", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "Smooth rep cadence" },
      },
      {
        id: "nm_calf_b",
        name: "Single-Leg Step Calf + Core",
        muscleGroup: "Calves + Core",
        sets: 3,
        reps: "15 + 15",
        load: "Bodyweight",
        restSec: 45,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        cue: "Slow ankle mobility",
        swap: { name: "Deadbug", sets: 3, reps: "12/side", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "Brace core" },
      },
    ],
    ul_combo_a: [
      {
        id: "nm_desk_push",
        blockSection: "upper",
        name: "Hotel Desk Incline Deficit Push-Up",
        muscleGroup: "Chest",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 75,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        swap: { name: "Backpack Floor Press", sets: 3, reps: "12-15", load: "15 kg bag", trackLoad: true, defaultWeightKg: 15, stepKg: 2.5 },
      },
      {
        id: "nm_suitcase_row",
        blockSection: "upper",
        name: "Suitcase Chair-Braced 1-Arm Row",
        muscleGroup: "Mid-Back",
        sets: 3,
        reps: "8-12/arm",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        swap: { name: "Door-Towel Row", sets: 3, reps: "12-15", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "nm_pack_ohp",
        blockSection: "upper",
        name: "Suitcase / Backpack Overhead Press",
        muscleGroup: "Shoulders",
        sets: 3,
        reps: "8-12",
        load: "12-16 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        swap: { name: "Wall Pike Press", sets: 3, reps: "10-12", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "nm_desk_tri",
        blockSection: "upper",
        name: "Close-Grip Desk Tricep Push-Up",
        muscleGroup: "Triceps",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        swap: { name: "Overhead Bag Tricep Ext", sets: 3, reps: "12-15", load: "12 kg bag", trackLoad: true, defaultWeightKg: 12, stepKg: 2.5 },
      },
      {
        id: "nm_wall_squat",
        blockSection: "lower",
        name: "45s Wall Sit -> 15 BW Squats",
        muscleGroup: "Quads",
        sets: 3,
        reps: "45s + 15",
        load: "Occlusion Pair",
        restSec: 75,
        timeBased: true,
        swap: { name: "Hotel Step-Ups", sets: 3, reps: "12/leg", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "nm_bag_rdl",
        progressKey: "nm_rdl",
        blockSection: "lower",
        name: "Kickstand Carry-On Bag RDL",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "8-12/leg",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        maxRepsRegular: 12,
        swap: { name: "Towel Hamstring Slide", sets: 3, reps: "12-15", load: "Tile", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "nm_bed_bridge",
        blockSection: "lower",
        name: "Single-Leg Bed-Edge Glute Bridge",
        muscleGroup: "Glutes",
        sets: 3,
        reps: "12-15/side",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        swap: { name: "Side Plank", sets: 3, reps: "35s/side", load: "BW" },
      },
    ],
    ul_combo_b: [
      {
        id: "nm_ohp_b",
        progressKey: "nm_pack_ohp",
        blockSection: "upper",
        name: "Backpack Overhead Press",
        muscleGroup: "Shoulders",
        sets: 3,
        reps: "8-12",
        load: "12-16 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        swap: { name: "Wall Pike Press", sets: 3, reps: "10-12", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "nm_towel_row_b",
        progressKey: "nm_suitcase_row",
        blockSection: "upper",
        name: "Suitcase Row + Door Towel Pull",
        muscleGroup: "Back",
        sets: 3,
        reps: "8-12/arm",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        swap: { name: "Prone Floor Y-T-W", sets: 3, reps: "15", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "nm_push_b",
        progressKey: "nm_desk_push",
        blockSection: "upper",
        name: "Desk Deficit Push-Up",
        muscleGroup: "Chest",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        swap: { name: "Close-Grip Desk Push-Up", sets: 3, reps: "15", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "nm_arms_b",
        progressKey: "nm_strap_curl",
        blockSection: "upper",
        name: "Carry-On Curl + Overhead Bag Tricep",
        muscleGroup: "Arms",
        sets: 3,
        reps: "12-15",
        load: "12-16 kg bag",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 15,
        swap: { name: "Close-Grip Desk Push-Up", sets: 3, reps: "15", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "nm_rdl_b",
        progressKey: "nm_rdl",
        blockSection: "lower",
        name: "Kickstand Carry-On RDL",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "8-12/leg",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        maxRepsRegular: 12,
        swap: { name: "Single-Leg Bridge", sets: 3, reps: "15/leg", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
      {
        id: "nm_step_b",
        blockSection: "lower",
        name: "Hotel Stair / Low-Chair Step-Ups",
        muscleGroup: "Quads + Kili Knees",
        sets: 3,
        reps: "12/leg",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        swap: { name: "45s Wall Sit", sets: 3, reps: "45s", load: "BW" },
      },
      {
        id: "nm_calf_b",
        blockSection: "lower",
        name: "Single-Leg Step Calf + Core",
        muscleGroup: "Calves + Core",
        sets: 3,
        reps: "15 + 15",
        load: "Bodyweight",
        restSec: 45,
        trackLoad: true,
        bodyweightOnly: true,
        maxRepsRegular: 15,
        swap: { name: "Deadbug", sets: 3, reps: "12/side", load: "BW", trackLoad: true, bodyweightOnly: true },
      },
    ],
    full_body_plus: [
      {
        id: "nm_fb_push",
        progressKey: "nm_desk_push",
        name: "Desk Deficit Push-Up",
        muscleGroup: "Chest",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 60,
        trackLoad: true,
        bodyweightOnly: true,
        defaultWeightKg: 0,
        maxRepsRegular: 15,
        cue: "Optional Day 5 travel upper pump",
        swap: { name: "Close-Grip Push-Up", sets: 3, reps: "15", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "Triceps focus" },
      },
      {
        id: "nm_fb_row",
        progressKey: "nm_suitcase_row",
        name: "Suitcase 1-Arm Row",
        muscleGroup: "Back",
        sets: 3,
        reps: "8-12/arm",
        load: "15-20 kg bag",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        maxRepsRegular: 12,
        cue: "Chair-braced zero back strain",
        swap: { name: "Prone Y-T-W", sets: 3, reps: "15", load: "BW", trackLoad: true, bodyweightOnly: true, cue: "Upper back" },
      },
      {
        id: "nm_fb_arm",
        progressKey: "nm_strap_curl",
        name: "Carry-On Curl + Floor Delt Angels",
        muscleGroup: "Arms + Delts",
        sets: 3,
        reps: "12-15",
        load: "12-16 kg bag",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        maxRepsRegular: 15,
        cue: "Clean upper pump before dinner out",
        swap: { name: "Wall Sit 45s", sets: 3, reps: "45s", load: "BW", cue: "Glycogen sponge" },
      },
    ],
    cardio_pool: [
      {
        id: "nm_walk",
        name: "15k Step Travel Zone-2 Jog / Walk",
        muscleGroup: "Zone-2 Cardio",
        sets: 1,
        reps: "45-60 min",
        load: "Zone-2 Pace",
        restSec: 0,
        timeBased: true,
        cue: "Shoes ON; de-bloats facial sodium without systemic cortisol",
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

export function normalizeGateRankInput(raw: string | undefined): GateRankId {
  if (raw === "regular" || raw === "express_2x" || raw === "low_mana_rir2") {
    return raw;
  }
  if (raw === "low_time_2x" || raw === "floor_5m" || raw === "express_25m") {
    return "express_2x";
  }
  return "regular";
}

function formatModeReps(
  baseReps: string,
  gateRank: GateRankId,
  regCap: number,
  lowCap: number,
  isBarbellCompound?: boolean,
  isTimeBased?: boolean
): string {
  if (isTimeBased) return baseReps;
  const baseBand =
    baseReps === "10-12"
      ? "10-12"
      : regCap === 8
        ? "5-8"
        : regCap === 10
          ? "6-10"
          : regCap === 12
            ? "8-12"
            : "12-15";

  if (gateRank === "regular") {
    return baseBand;
  }
  if (gateRank === "low_mana_rir2") {
    const recoveryBand = regCap === 8 ? "5-8" : regCap === 12 ? "8-12" : "10-12";
    return `${recoveryBand} · RIR 2-3`;
  }
  // express_2x: barbell compounds stay RIR 1-2 for safety without spotter
  if (isBarbellCompound) {
    return `${baseBand} · RIR 1-2`;
  }
  return `0-1 RIR (<=${lowCap})`;
}

export function getPrescribedWorkout(
  arena: ArenaId,
  split: SplitId,
  gateRank: GateRankId | string
): ExerciseSpec[] {
  const arenaMap = WORKOUT_MATRIX[arena] ?? WORKOUT_MATRIX.cg_gym;
  const raw = split as string;
  const safeSplit: SplitId =
    raw === "push"
      ? "upper_a"
      : raw === "pull"
        ? "upper_b"
        : raw === "legs"
          ? "lower_a"
          : raw === "pool_steps"
            ? "cardio_pool"
            : split;

  const normRank = normalizeGateRankInput(gateRank as string);
  const list: ExerciseSpec[] = arenaMap[safeSplit] ?? arenaMap.upper_a;
  const isCardio = safeSplit === "cardio_pool";

  return list.map((ex) => {
    if (isCardio) return ex;
    const scaledSets = normRank === "regular" ? 3 : 2;
    const regCap = ex.maxRepsRegular ?? 15;
    const lowCap = ex.maxRepsLowTime ?? (regCap <= 12 ? regCap + 2 : 17);
    const scaledReps = formatModeReps(
      ex.reps,
      normRank,
      regCap,
      lowCap,
      ex.isBarbellCompound,
      ex.timeBased
    );

    const isSwapTimeBased = /\d+s\b|\bmin\b/i.test(ex.swap.reps);
    const scaledSwapReps = formatModeReps(
      ex.swap.reps,
      normRank,
      regCap,
      lowCap,
      ex.swap.isBarbellCompound,
      isSwapTimeBased
    );

    return {
      ...ex,
      sets: scaledSets,
      reps: scaledReps,
      swap: {
        ...ex.swap,
        sets: scaledSets,
        reps: scaledSwapReps,
      },
    };
  });
}

export type FoodTag =
  | "high_protein"
  | "salsa_solo"
  | "seal"
  | "abs_raid"
  | "social"
  | "debloat"
  | "fiber_micro"
  | "healthy_fat"
  | "training_carb"
  | "alcohol";

export type MealSlot = "primer" | "lunch" | "seal" | "dinner";

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEKDAY_ORDER: { key: WeekdayKey; short: string; label: string }[] = [
  { key: "mon", short: "Mon", label: "Monday" },
  { key: "tue", short: "Tue", label: "Tuesday" },
  { key: "wed", short: "Wed", label: "Wednesday" },
  { key: "thu", short: "Thu", label: "Thursday" },
  { key: "fri", short: "Fri", label: "Friday" },
  { key: "sat", short: "Sat", label: "Saturday" },
  { key: "sun", short: "Sun", label: "Sunday" },
];

export interface FoodPreset {
  id: string;
  shortLabel: string;
  spot: string;
  kcal: number;
  proteinG: number;
  contexts: ContextId[];
  note: string;
  tags: FoodTag[];
  category?: "spot" | "staple" | "dinner_dish";
}

export type FoodTier = "S" | "A" | "B" | "C" | "M" | "F" | "X" | "0";

export interface FoodViability {
  tier: FoodTier;
  proteinPer100Kcal: number;
  proteinCalPct: number;
  label: string;
  verdict: string;
}

export function evaluateFoodViability(
  kcal: number,
  proteinG: number,
  tags?: FoodTag[]
): FoodViability {
  const safeKcal = Math.max(0, kcal);
  const safeProtein = Math.max(0, proteinG);

  if (safeKcal === 0) {
    if (safeProtein > 0) {
      return {
        tier: "S",
        proteinPer100Kcal: 25,
        proteinCalPct: 100,
        label: "S-Tier Pure P",
        verdict: "Zero-overhead protein anchor",
      };
    }
    return {
      tier: "0",
      proteinPer100Kcal: 0,
      proteinCalPct: 0,
      label: "0 kcal Buffer",
      verdict: "Zero-calorie mixer, black coffee, or hydration buffer",
    };
  }

  const proteinPer100Kcal = Math.round(((safeProtein * 100) / safeKcal) * 10) / 10;
  const proteinCalPct = Math.min(100, Math.round(((safeProtein * 4) / safeKcal) * 100));

  if (tags?.includes("alcohol")) {
    return {
      tier: "X",
      proteinPer100Kcal,
      proteinCalPct,
      label: "Alcohol",
      verdict: "Empty ethanol calories - log honestly & pre-buffer protein",
    };
  }
  if (tags?.includes("fiber_micro") && proteinPer100Kcal < 7) {
    return {
      tier: "M",
      proteinPer100Kcal,
      proteinCalPct,
      label: "Micro / Fiber",
      verdict: "Essential potassium, vitamins & fiber - protects digestion and deficit adherence",
    };
  }
  if (tags?.includes("healthy_fat") && proteinPer100Kcal < 7) {
    return {
      tier: "F",
      proteinPer100Kcal,
      proteinCalPct,
      label: "Healthy Fat",
      verdict: "Supports hormones, fat-soluble vitamins & gallbladder emptying on OMAD",
    };
  }

  if (proteinPer100Kcal >= 10) {
    return {
      tier: "S",
      proteinPer100Kcal,
      proteinCalPct,
      label: "S-Tier Cut Fuel",
      verdict: "Elite fat-loss density (>=10g P / 100 kcal) - spares muscle on a hard cut",
    };
  }
  if (proteinPer100Kcal >= 7) {
    return {
      tier: "A",
      proteinPer100Kcal,
      proteinCalPct,
      label: "A-Tier Balanced",
      verdict: "Solid macro ratio (7-9.9g P / 100 kcal) - fits cleanly inside daily ceiling",
    };
  }
  if (proteinPer100Kcal >= 4) {
    return {
      tier: "B",
      proteinPer100Kcal,
      proteinCalPct,
      label: "B-Tier Moderate",
      verdict: "Pair with 1-2x Whey or Skyr so daily protein stays above 165g",
    };
  }
  return {
    tier: "C",
    proteinPer100Kcal,
    proteinCalPct,
    label: "C-Tier Carb / Treat",
    verdict: "Carb or calorie-dense side - pair with S-tier protein or keep around training",
  };
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
    category: "spot",
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
    category: "spot",
  },
  {
    id: "whey_skyr_seal",
    shortLabel: "5 PM Seal: 2x Whey + Skyr",
    spot: "Home / Office Bridge",
    kcal: 380,
    proteinG: 70,
    contexts: ["cg_home", "hsr_office", "raid_social", "travel"],
    note: "Skyr casein slows digestion alongside whey - hits 165g+ protein cleanly",
    tags: ["seal", "high_protein"],
    category: "spot",
  },
  {
    id: "abs_omad_raid",
    shortLabel: "AB's Proteinmaxx Lunch Raid",
    spot: "Absolute Barbecues (E-City / BTM / Kora)",
    kcal: 1550,
    proteinG: 160,
    contexts: ["raid_social", "cg_home", "hsr_office"],
    note: "Fish Tikka + Prawns + Chicken skewers + Light-Oil Wish Grill -> Auto-closes OMAD!",
    tags: ["abs_raid", "high_protein"],
    category: "spot",
  },
  {
    id: "eggs_4_whole",
    shortLabel: "4 Whole Eggs (Boiled / Omelette)",
    spot: "Home / Office Staple",
    kcal: 300,
    proteinG: 25,
    contexts: ["cg_home", "hsr_office", "travel"],
    note: "25g P + ~20g healthy fats & choline - protects hormones & gallbladder on OMAD",
    tags: ["high_protein", "healthy_fat"],
    category: "staple",
  },
  {
    id: "whey_1_5x",
    shortLabel: "1.5 Scoops Whey (Water)",
    spot: "Post-Workout / Bridge",
    kcal: 180,
    proteinG: 38,
    contexts: ["cg_home", "hsr_office", "raid_social", "travel"],
    note: "Fast 38g P AM post-lift buffer if main OMAD meal is hours away",
    tags: ["seal", "high_protein"],
    category: "staple",
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
    category: "spot",
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
    category: "spot",
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
    category: "spot",
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
    category: "spot",
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
    category: "spot",
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
    category: "spot",
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
    category: "spot",
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
    category: "spot",
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
    category: "spot",
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
    category: "spot",
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
    category: "spot",
  },
  {
    id: "cucumber_salad_olive",
    shortLabel: "Cucumber-Tomato Salad + Olive Oil",
    spot: "Daily Fiber & Healthy Fat",
    kcal: 160,
    proteinG: 3,
    contexts: ["cg_home", "hsr_office", "travel"],
    note: "Watery gut-safe greens + 1 tsp olive oil/lemon for fiber, potassium & fat-soluble absorption",
    tags: ["fiber_micro", "healthy_fat", "debloat"],
    category: "staple",
  },
  {
    id: "mixed_nuts_30g",
    shortLabel: "Almonds / Walnuts (30g)",
    spot: "Healthy Fat Anchor",
    kcal: 180,
    proteinG: 6,
    contexts: ["cg_home", "hsr_office", "travel"],
    note: "Magnesium, Vitamin E & dietary fat floor support on low-fat grill days",
    tags: ["healthy_fat"],
    category: "staple",
  },
  {
    id: "seasonal_fruit_bowl",
    shortLabel: "Papaya / Guava / Apple (250g)",
    spot: "Micronutrient + Fiber Bowl",
    kcal: 130,
    proteinG: 2,
    contexts: ["cg_home", "hsr_office", "travel"],
    note: "Potassium + digestive fiber without caloric spill",
    tags: ["fiber_micro"],
    category: "staple",
  },
  {
    id: "steamed_rice_half",
    shortLabel: "Steamed Rice / 2 Phulkas",
    spot: "Training Glycogen Fuel",
    kcal: 240,
    proteinG: 5,
    contexts: ["cg_home", "hsr_office", "raid_social", "travel"],
    note: "Clean carbs around heavy bench or badminton to preserve strength",
    tags: ["training_carb"],
    category: "staple",
  },
  {
    id: "electrolyte_ors",
    shortLabel: "Electrolytes + Lemon Salt (1L)",
    spot: "OMAD Hydration Buffer",
    kcal: 15,
    proteinG: 0,
    contexts: ["cg_home", "hsr_office", "raid_social", "travel"],
    note: "Prevents fasting headaches & gym cramps when insulin is low",
    tags: ["debloat", "fiber_micro"],
    category: "staple",
  },
  {
    id: "boiled_eggs_2",
    shortLabel: "2 Boiled Eggs",
    spot: "Everyday Staple",
    kcal: 155,
    proteinG: 13,
    contexts: ["cg_home", "hsr_office", "raid_social", "travel"],
    note: "Easy add-on anywhere to patch a 15-25g protein gap",
    tags: ["high_protein"],
    category: "staple",
  },
  {
    id: "whey_1x",
    shortLabel: "1 Scoop Whey (Water)",
    spot: "Quick Protein Top-Up",
    kcal: 120,
    proteinG: 25,
    contexts: ["cg_home", "hsr_office", "raid_social", "travel"],
    note: "20.8g P / 100 kcal - fastest fix when trailing on protein",
    tags: ["seal", "high_protein"],
    category: "staple",
  },
  {
    id: "skyr_200g",
    shortLabel: "Skyr / Greek Yogurt (200g)",
    spot: "Fridge / Quick Commerce",
    kcal: 130,
    proteinG: 20,
    contexts: ["cg_home", "hsr_office", "travel"],
    note: "Slow-digesting casein dairy bridge for sustained MPS",
    tags: ["seal", "high_protein"],
    category: "staple",
  },
  {
    id: "chicken_breast_200g",
    shortLabel: "Grilled Chicken Breast (200g)",
    spot: "Home / Lean Prep",
    kcal: 310,
    proteinG: 52,
    contexts: ["cg_home", "hsr_office", "travel"],
    note: "Low-oil seasoning - unmatched S-tier protein density",
    tags: ["high_protein"],
    category: "staple",
  },
  {
    id: "curd_bowl",
    shortLabel: "Plain Curd / Dahi (200g)",
    spot: "Home / Hostel Gut Care",
    kcal: 140,
    proteinG: 8,
    contexts: ["cg_home", "hsr_office", "travel"],
    note: "Light probiotic bowl - mix 1x whey if sealing evening macros",
    tags: ["debloat"],
    category: "staple",
  },
  {
    id: "tandoori_half",
    shortLabel: "Tandoori Chicken (Half)",
    spot: "Restaurant / Dinner Out",
    kcal: 420,
    proteinG: 56,
    contexts: ["raid_social", "cg_home", "hsr_office"],
    note: "Top dinner-out order: skip butter naan, pair mint chutney + onion",
    tags: ["social", "high_protein"],
    category: "dinner_dish",
  },
  {
    id: "chicken_tikka_6",
    shortLabel: "Chicken Tikka (6 pcs)",
    spot: "Restaurant / Dinner Out",
    kcal: 320,
    proteinG: 44,
    contexts: ["raid_social", "cg_home", "hsr_office"],
    note: "Dry tandoor boneless cuts keep sauces & cooking oil low",
    tags: ["social", "high_protein"],
    category: "dinner_dish",
  },
  {
    id: "fish_tikka",
    shortLabel: "Tandoori Fish Tikka (1 plate)",
    spot: "Restaurant / Dinner Out",
    kcal: 290,
    proteinG: 42,
    contexts: ["raid_social", "cg_home"],
    note: "Ultra-lean dinner starter - easy to stack multiple plates",
    tags: ["social", "high_protein"],
    category: "dinner_dish",
  },
  {
    id: "prawns_grill",
    shortLabel: "Grilled / Tandoori Prawns",
    spot: "Restaurant / Dinner Out",
    kcal: 240,
    proteinG: 38,
    contexts: ["raid_social", "cg_home"],
    note: "15.8g P / 100 kcal - elite pub or coastal dinner pick",
    tags: ["social", "high_protein"],
    category: "dinner_dish",
  },
  {
    id: "paneer_tikka_6",
    shortLabel: "Paneer Tikka (6 pcs)",
    spot: "Restaurant / Veg Option",
    kcal: 380,
    proteinG: 24,
    contexts: ["raid_social", "cg_home"],
    note: "Filling vegetarian starter; ask for dry roast without malai cream",
    tags: ["social"],
    category: "dinner_dish",
  },
  {
    id: "biryani_half",
    shortLabel: "Chicken Biryani (Half Plate)",
    spot: "Restaurant / Dinner Out",
    kcal: 520,
    proteinG: 32,
    contexts: ["raid_social", "cg_home", "hsr_office"],
    note: "Share or box half immediately; eat chicken pieces + raita first",
    tags: ["social"],
    category: "dinner_dish",
  },
  {
    id: "dal_2_roti",
    shortLabel: "Dal Tadka + 2 Phulka/Roti",
    spot: "Home / Casual Indian",
    kcal: 420,
    proteinG: 18,
    contexts: ["cg_home", "raid_social", "travel"],
    note: "Ask for no butter/ghee topping on rotis or dal",
    tags: ["social"],
    category: "dinner_dish",
  },
  {
    id: "plain_dosa",
    shortLabel: "Plain Dosa + Sambar",
    spot: "Darshini / Breakfast",
    kcal: 280,
    proteinG: 7,
    contexts: ["cg_home", "hsr_office", "raid_social"],
    note: "Light carb base - pair with whey or boiled eggs for density",
    tags: ["social"],
    category: "dinner_dish",
  },
  {
    id: "idli_2",
    shortLabel: "2 Idlis + Sambar",
    spot: "Darshini / Breakfast",
    kcal: 190,
    proteinG: 7,
    contexts: ["cg_home", "hsr_office", "raid_social"],
    note: "Steamed & gentle on gut; add protein alongside",
    tags: ["social"],
    category: "dinner_dish",
  },
  {
    id: "whisky_peg",
    shortLabel: "Whisky / Vodka Peg (60 ml)",
    spot: "Social Drinks",
    kcal: 140,
    proteinG: 0,
    contexts: ["raid_social"],
    note: "Mix with soda or Diet Coke only; skip bar fries",
    tags: ["social", "alcohol"],
    category: "dinner_dish",
  },
  {
    id: "beer_pint",
    shortLabel: "Beer Pint (330 ml)",
    spot: "Social Drinks",
    kcal: 155,
    proteinG: 1,
    contexts: ["raid_social"],
    note: "Log each pint honestly so the week stays on track",
    tags: ["social", "alcohol"],
    category: "dinner_dish",
  },
  {
    id: "diet_coke",
    shortLabel: "Diet Coke / Coke Zero (330 ml)",
    spot: "Zero-Cal Craving Buffer",
    kcal: 0,
    proteinG: 0,
    contexts: ["cg_home", "hsr_office", "raid_social", "travel"],
    note: "0 kcal fizz buffer for late evenings or social mixers",
    tags: ["seal", "debloat"],
    category: "dinner_dish",
  },
];

export function getPresetsForContext(contextId: ContextId): FoodPreset[] {
  const matched = FOOD_PRESETS.filter(
    (f) => (!f.category || f.category === "spot") && f.contexts.includes(contextId)
  ).sort((a, b) => {
    const aPrimary = a.contexts[0] === contextId ? 0 : 1;
    const bPrimary = b.contexts[0] === contextId ? 0 : 1;
    return aPrimary - bPrimary;
  });
  const seal = FOOD_PRESETS.find((f) => f.id === "whey_skyr_seal");
  if (seal && !matched.some((m) => m.id === seal.id)) {
    return [seal, ...matched];
  }
  return matched;
}

export interface PlannedMealItem {
  id: string;
  slot: MealSlot;
  presetId?: string;
  label: string;
  kcal: number;
  proteinG: number;
}

export interface DayMealPlan {
  focus: string;
  dinnerSkipped: boolean;
  dinnerOut: boolean;
  meals: PlannedMealItem[];
}

export const DEFAULT_WEEKLY_MEAL_PLAN: Record<WeekdayKey, DayMealPlan> = {
  mon: {
    focus: "OMAD · Hebe's + Whole Eggs + Greens + Seal",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "mon_1", slot: "lunch", presetId: "hebe_salsa_chicken", label: "Hebe's Salsa Egg + Chicken", kcal: 680, proteinG: 65 },
      { id: "mon_2", slot: "lunch", presetId: "eggs_4_whole", label: "4 Whole Eggs (Boiled / Omelette)", kcal: 300, proteinG: 25 },
      { id: "mon_3", slot: "lunch", presetId: "cucumber_salad_olive", label: "Cucumber-Tomato Salad + Olive Oil", kcal: 160, proteinG: 3 },
      { id: "mon_4", slot: "seal", presetId: "whey_skyr_seal", label: "5 PM Seal: 2x Whey + Skyr", kcal: 380, proteinG: 70 },
      { id: "mon_5", slot: "seal", presetId: "mixed_nuts_30g", label: "Almonds / Walnuts (30g)", kcal: 180, proteinG: 6 },
    ],
  },
  tue: {
    focus: "OMAD · Grill Daddy + Tikka + Fiber/Fats + Seal",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "tue_1", slot: "lunch", presetId: "grill_daddy_skewers", label: "Grill Daddy Skewers / 1/2 Roast", kcal: 490, proteinG: 48 },
      { id: "tue_2", slot: "lunch", presetId: "chicken_tikka_6", label: "Chicken Tikka (6 pcs)", kcal: 320, proteinG: 44 },
      { id: "tue_3", slot: "lunch", presetId: "cucumber_salad_olive", label: "Cucumber-Tomato Salad + Olive Oil", kcal: 160, proteinG: 3 },
      { id: "tue_4", slot: "seal", presetId: "whey_skyr_seal", label: "5 PM Seal: 2x Whey + Skyr", kcal: 380, proteinG: 70 },
      { id: "tue_5", slot: "seal", presetId: "mixed_nuts_30g", label: "Almonds / Walnuts (30g)", kcal: 180, proteinG: 6 },
      { id: "tue_6", slot: "seal", presetId: "seasonal_fruit_bowl", label: "Papaya / Guava / Apple (250g)", kcal: 130, proteinG: 2 },
    ],
  },
  wed: {
    focus: "OMAD · AB's Proteinmaxx Raid + Fruit",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "wed_1", slot: "lunch", presetId: "abs_omad_raid", label: "AB's Proteinmaxx Lunch Raid", kcal: 1550, proteinG: 160 },
      { id: "wed_2", slot: "seal", presetId: "seasonal_fruit_bowl", label: "Papaya / Guava / Apple (250g)", kcal: 130, proteinG: 2 },
      { id: "wed_3", slot: "seal", presetId: "diet_coke", label: "Diet Coke / Coke Zero (330 ml)", kcal: 0, proteinG: 0 },
    ],
  },
  thu: {
    focus: "OMAD · Cal Burrito + Tandoori + Greens + Seal",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "thu_1", slot: "lunch", presetId: "cal_burrito_bowl", label: "Cal Burrito BBQ Bowl", kcal: 550, proteinG: 48 },
      { id: "thu_2", slot: "lunch", presetId: "tandoori_half", label: "Tandoori Chicken (Half)", kcal: 420, proteinG: 56 },
      { id: "thu_3", slot: "lunch", presetId: "cucumber_salad_olive", label: "Cucumber-Tomato Salad + Olive Oil", kcal: 160, proteinG: 3 },
      { id: "thu_4", slot: "seal", presetId: "whey_skyr_seal", label: "5 PM Seal: 2x Whey + Skyr", kcal: 380, proteinG: 70 },
      { id: "thu_5", slot: "seal", presetId: "mixed_nuts_30g", label: "Almonds / Walnuts (30g)", kcal: 180, proteinG: 6 },
    ],
  },
  fri: {
    focus: "OMAD · Social Dinner Out (Shield + Tandoor + Half Biryani)",
    dinnerSkipped: false,
    dinnerOut: true,
    meals: [
      { id: "fri_1", slot: "seal", presetId: "pre_social_shield", label: "Pre-Taproom Curd + Whey", kcal: 220, proteinG: 35 },
      { id: "fri_2", slot: "dinner", presetId: "tandoori_half", label: "Tandoori Chicken (Half)", kcal: 420, proteinG: 56 },
      { id: "fri_3", slot: "dinner", presetId: "fish_tikka", label: "Tandoori Fish Tikka (1 plate)", kcal: 290, proteinG: 42 },
      { id: "fri_4", slot: "dinner", presetId: "biryani_half", label: "Chicken Biryani (Half Plate)", kcal: 520, proteinG: 32 },
      { id: "fri_5", slot: "dinner", presetId: "cucumber_salad_olive", label: "Cucumber-Tomato Salad + Olive Oil", kcal: 160, proteinG: 3 },
      { id: "fri_6", slot: "dinner", presetId: "diet_coke", label: "Diet Coke / Coke Zero (330 ml)", kcal: 0, proteinG: 0 },
    ],
  },
  sat: {
    focus: "OMAD · CG Home Grill Stack + Greens + Fruit",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "sat_1", slot: "lunch", presetId: "khan_saheb_tikka", label: "Khan Saheb Tikka + Charcoal", kcal: 520, proteinG: 65 },
      { id: "sat_2", slot: "lunch", presetId: "kfc_smoky_red", label: "KFC Smoky Red (3 pc)", kcal: 480, proteinG: 52 },
      { id: "sat_3", slot: "lunch", presetId: "cucumber_salad_olive", label: "Cucumber-Tomato Salad + Olive Oil", kcal: 160, proteinG: 3 },
      { id: "sat_4", slot: "seal", presetId: "whey_skyr_seal", label: "5 PM Seal: 2x Whey + Skyr", kcal: 380, proteinG: 70 },
      { id: "sat_5", slot: "seal", presetId: "seasonal_fruit_bowl", label: "Papaya / Guava / Apple (250g)", kcal: 130, proteinG: 2 },
    ],
  },
  sun: {
    focus: "OMAD · Badminton Fuel (+200 Flex) + Meghana + Seal",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "sun_1", slot: "primer", presetId: "taaza_whey", label: "Taaza 2 Idli + Whey/Eggs", kcal: 540, proteinG: 38 },
      { id: "sun_2", slot: "lunch", presetId: "meghana_half", label: "Meghana Leg + Eggs + 1/2 Rice", kcal: 720, proteinG: 54 },
      { id: "sun_3", slot: "lunch", presetId: "cucumber_salad_olive", label: "Cucumber-Tomato Salad + Olive Oil", kcal: 160, proteinG: 3 },
      { id: "sun_4", slot: "seal", presetId: "whey_skyr_seal", label: "5 PM Seal: 2x Whey + Skyr", kcal: 380, proteinG: 70 },
      { id: "sun_5", slot: "seal", presetId: "seasonal_fruit_bowl", label: "Papaya / Guava / Apple (250g)", kcal: 130, proteinG: 2 },
    ],
  },
};

export function getTodayWeekdayKey(date: Date = new Date()): WeekdayKey {
  const map: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[date.getDay()] ?? "mon";
}

export function isPlannedMealLogged(
  meal: PlannedMealItem,
  loggedFoods: Array<{ presetId?: string; label: string }>
): boolean {
  const targetLabel = meal.label.trim().toLowerCase();
  return loggedFoods.some((f) => {
    if (meal.presetId && f.presetId && f.presetId === meal.presetId) {
      return true;
    }
    const norm = f.label.trim().toLowerCase().replace(/\s*\(\d+(\.\d+)?x\)$/, "");
    return norm === targetLabel;
  });
}

export interface NutritionCoachAdvice {
  headline: string;
  actionTip: string;
  tone: "emerald" | "amber" | "cobalt" | "violet";
  remainingKcal: number;
  remainingProteinG: number;
  currentDensity: number;
  projectedDinnerBudgetKcal: number;
  nextPlannedMeal: PlannedMealItem | null;
}

export function computeNutritionCoachAdvice(params: {
  consumedKcal: number;
  consumedProteinG: number;
  kcalCeiling: number;
  proteinTargetG: number;
  dinnerSkipped: boolean;
  dinnerOutMode: boolean;
  loggedFoods: Array<{ presetId?: string; label: string }>;
  todayPlan?: DayMealPlan;
  currentHour?: number;
  weeklyAvgKcal?: number | null;
  trainedFastedBeforeNoon?: boolean;
}): NutritionCoachAdvice {
  const {
    consumedKcal,
    consumedProteinG,
    kcalCeiling,
    proteinTargetG,
    dinnerSkipped,
    dinnerOutMode,
    loggedFoods,
    todayPlan,
    currentHour = new Date().getHours(),
    weeklyAvgKcal = null,
    trainedFastedBeforeNoon = false,
  } = params;

  const remainingKcal = Math.max(0, kcalCeiling - consumedKcal);
  const remainingProteinG = Math.max(0, proteinTargetG - consumedProteinG);
  const currentDensity =
    consumedKcal > 0 ? Math.round(((consumedProteinG * 100) / consumedKcal) * 10) / 10 : 0;

  const nextPlannedMeal =
    todayPlan?.meals.find((m) => !isPlannedMealLogged(m, loggedFoods)) ?? null;

  const projectedDinnerBudgetKcal = dinnerOutMode
    ? remainingKcal
    : dinnerSkipped
      ? 0
      : Math.min(600, remainingKcal);

  if (consumedKcal === 0) {
    if (trainedFastedBeforeNoon && currentHour >= 11) {
      return {
        headline: "Morning lift logged fasted - break fast with protein soon",
        actionTip:
          "Take 1-1.5x Whey (+25-38g P) or start your OMAD main meal early so post-workout MPS is not delayed until evening.",
        tone: "amber",
        remainingKcal,
        remainingProteinG,
        currentDensity,
        projectedDinnerBudgetKcal,
        nextPlannedMeal,
      };
    }

    return {
      headline:
        currentHour < 12
          ? "OMAD fast active - zero kcal until your eating window"
          : currentHour >= 18
            ? `OMAD Dinner window: ${kcalCeiling} kcal & ${proteinTargetG}g P budget untouched`
            : nextPlannedMeal
              ? `OMAD window ready: ${nextPlannedMeal.label}`
              : `OMAD window open - aim for ${proteinTargetG}g P + >=1,600 kcal`,
      actionTip:
        currentHour < 12
          ? "Stay on water, electrolytes, black coffee, or Monster White (>=8h pre-sleep). Break fast with whole-food protein + greens."
          : currentHour >= 18
            ? "Build your full OMAD dinner plate in Fuel - lead with S-tier grilled/tandoor protein + greens + Whey/Skyr top-up."
            : "Pair whole-food protein, greens, and healthy fats with your Whey/Skyr Seal so evening fasting stays effortless.",
      tone: "cobalt",
      remainingKcal,
      remainingProteinG,
      currentDensity,
      projectedDinnerBudgetKcal,
      nextPlannedMeal,
    };
  }

  // Guard against accidental crash dieting (<1,450 kcal sealed)
  if (dinnerSkipped && consumedKcal < 1450) {
    return {
      headline: `OMAD sealed light (${consumedKcal} kcal) - protect your calorie floor`,
      actionTip:
        "Under 1,450 kcal at 112 kg risks midnight Swiggy rebound, muscle loss, and gallbladder stress. Add whole eggs, nuts, fruit, or rice toward ~1,650-1,800 kcal.",
      tone: "amber",
      remainingKcal,
      remainingProteinG,
      currentDensity,
      projectedDinnerBudgetKcal: 0,
      nextPlannedMeal,
    };
  }

  if (consumedKcal > kcalCeiling) {
    const overKcal = consumedKcal - kcalCeiling;
    const weeklyNote =
      weeklyAvgKcal !== null
        ? `7d avg is ${weeklyAvgKcal} kcal/day (still a deep cut at 112 kg).`
        : "At 112 kg, ~2,000 kcal is still a strong fat-loss deficit.";
    return {
      headline: `+${overKcal} kcal over ${kcalCeiling} target (${consumedProteinG}g P logged)`,
      actionTip: `No crash compensation or punishment cardio needed - ${weeklyNote} Close solid food cleanly and resume tomorrow.`,
      tone: "amber",
      remainingKcal: 0,
      remainingProteinG,
      currentDensity,
      projectedDinnerBudgetKcal: 0,
      nextPlannedMeal: null,
    };
  }

  if (remainingProteinG <= 0) {
    return {
      headline: `OMAD protein locked (${consumedProteinG}g P) with ${remainingKcal} kcal left`,
      actionTip: dinnerOutMode
        ? `Dinner Out budget: up to ${remainingKcal} kcal. Stick to grilled starters + veg; skip mindless desserts.`
        : consumedKcal < 1500
          ? `Protein is hit, but add ~250 kcal of healthy fats/greens/fruit before closing so you hit >=1,600 kcal.`
          : "Close your OMAD window cleanly - stick to water, electrolytes, or Diet Coke until tomorrow.",
      tone: "emerald",
      remainingKcal,
      remainingProteinG: 0,
      currentDensity,
      projectedDinnerBudgetKcal,
      nextPlannedMeal,
    };
  }

  if (dinnerOutMode) {
    const neededDensity =
      remainingKcal > 0
        ? Math.round(((remainingProteinG * 100) / remainingKcal) * 10) / 10
        : 15;
    return {
      headline: `Dinner Out budget: ${remainingKcal} kcal left (${remainingProteinG}g P needed)`,
      actionTip:
        neededDensity >= 9
          ? `Need S-tier density (${neededDensity}g P / 100 kcal): order Tandoori Chicken, Fish Tikka, or Prawns; skip naan & creamy gravies.`
          : `Pick a dry tandoor protein starter first, build multi-dish plate in Fuel, and keep drinks with Diet Coke/soda.`,
      tone: "violet",
      remainingKcal,
      remainingProteinG,
      currentDensity,
      projectedDinnerBudgetKcal,
      nextPlannedMeal,
    };
  }

  if (dinnerSkipped && remainingProteinG > 25) {
    return {
      headline: `Add ${remainingProteinG}g P before closing your OMAD window`,
      actionTip:
        remainingProteinG >= 55
          ? "Finish with 2x Whey + Skyr Seal (+70g P / 380 kcal) before closing your OMAD window."
          : `Top up with ${remainingProteinG <= 25 ? "1x Whey" : "Chicken Tikka / Whey + Skyr"} and seal today's OMAD fast.`,
      tone: currentHour >= 17 ? "amber" : "cobalt",
      remainingKcal,
      remainingProteinG,
      currentDensity,
      projectedDinnerBudgetKcal,
      nextPlannedMeal,
    };
  }

  const reqDensity =
    remainingKcal > 0
      ? Math.round(((remainingProteinG * 100) / remainingKcal) * 10) / 10
      : 12;

  return {
    headline: `${remainingProteinG}g P & ${remainingKcal} kcal remaining (Avg density: ${currentDensity}g/100)`,
    actionTip:
      reqDensity >= 9.5
        ? `Remaining food needs >= ${reqDensity}g P / 100 kcal (S-tier): lean on Whey, Skyr, Eggs, or Tandoori cuts.`
        : `On pace for your cut - any A/S-tier plate + greens keeps today's deficit sustainable.`,
    tone: reqDensity >= 11 ? "amber" : "emerald",
    remainingKcal,
    remainingProteinG,
    currentDensity,
    projectedDinnerBudgetKcal,
    nextPlannedMeal,
  };
}

export interface KiliChecklistItem {
  id: string;
  title: string;
  detail: string;
}

export const KILI_CHECKLIST_ITEMS: KiliChecklistItem[] = [
  {
    id: "foracort_pulmo",
    title: "Pulmonologist consult (Foracort G + Diamox)",
    detail: "Pre-altitude PFT clearance, asthma action plan & acetazolamide protocol for 5,895m.",
  },
  {
    id: "zone2_base",
    title: "4+ weeks @ >=150 min/wk Zone-2",
    detail: "Consistent nasal-pace incline treadmill, CG swim, jog, or badminton endurance.",
  },
  {
    id: "pack_incline_3x",
    title: "3x 45-60m loaded incline walks (6-8 kg pack)",
    detail: "10-15% grade treadmill or hill climbs mimicking summit-day gear load.",
  },
  {
    id: "back_to_back_hikes",
    title: "2x back-to-back weekend sunrise hikes",
    detail: "Tests multi-day leg recovery and 3s eccentric step-down knee resilience.",
  },
  {
    id: "boots_broken_in",
    title: "Trekking boots + merino socks broken in",
    detail: "Zero blisters across 15k step walks and steep descent drills.",
  },
  {
    id: "hydration_electrolytes",
    title: "4L/day hydration + altitude electrolyte kit",
    detail: "Oral rehydration salts + insulated bladder tested in cold early mornings.",
  },
];

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
  { id: "igris", name: "Igris", role: "1/wk Streak Shield", trigger: "Absorbs 1 missed travel/work day cleanly (even checked in the morning)" },
  { id: "iron", name: "Iron", role: "Instant Safe Swap", trigger: "Busy machine or joint tweak inside Combat Sheet with full load tracking" },
  { id: "tank", name: "Tank", role: "Context Food Radar", trigger: "Auto-filters CG / HSR / Raid / Travel spots by time & clock" },
  { id: "beru", name: "Beru", role: "Low Mana Guard", trigger: "<5.5h sleep switches to 2 sets @ RIR 2-3 + 5m Survival Floor" },
  { id: "greed", name: "Greed", role: "OMAD Fast Guardian", trigger: "Alerts on <50g P & crash-diet floors while banking Swiggy Rs saved" },
  { id: "tusk", name: "Tusk", role: "36h De-Bloat Mode", trigger: "4L water + electrolytes + potassium after salt/travel swings" },
  { id: "kaisel", name: "Kaisel", role: "Kili 5,895m Engine", trigger: "Tracks Zone-2 weekly minutes, pack inclines & vertical ascent" },
  { id: "bellion", name: "Bellion", role: "1.5x-2x PR Crit Aura", trigger: "Unlocks at S-Rank or <100 kg; boosts PR & combo XP live" },
];
