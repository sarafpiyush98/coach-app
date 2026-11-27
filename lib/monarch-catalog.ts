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
export type GateRankId = "low_time_2x" | "regular_3x15";

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
  { id: "upper_a", label: "UPPER A", shortLabel: "U-A", tier: "core", focus: "Bench · Back · Side Delts · Biceps · Triceps" },
  { id: "lower_a", label: "LOWER A", shortLabel: "L-A", tier: "core", focus: "Quads · Barbell RDL · Calves · Core" },
  { id: "upper_b", label: "UPPER B", shortLabel: "U-B", tier: "core", focus: "OHP · Lats · Chest · Rear Delts · Arms" },
  { id: "lower_b", label: "LOWER B", shortLabel: "L-B", tier: "core", focus: "RDL · Box Squat · Glutes · Kili Knees" },
  { id: "ul_combo_a", label: "WEEKEND U+L A", shortLabel: "U+L A", tier: "combo", focus: "Upper A + Lower A (2-in-1 · 3-4h)" },
  { id: "ul_combo_b", label: "WEEKEND U+L B", shortLabel: "U+L B", tier: "combo", focus: "Upper B + Lower B (2-in-1 · 3-4h)" },
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
    id: "low_time_2x",
    tag: "LOW TIME",
    label: "2x Failure",
    duration: "All lifts · <=19 reps max",
    baseXp: 70,
  },
  {
    id: "regular_3x15",
    tag: "REGULAR",
    label: "3 x 15",
    duration: "All lifts · double progression",
    baseXp: 100,
  },
];

const WORKOUT_MATRIX: Record<
  ArenaId,
  Record<Exclude<SplitId, "ul_combo_a" | "ul_combo_b">, ExerciseSpec[]>
> = {
  cg_gym: {
    upper_a: [
      {
        id: "cg_bench",
        name: "Flat Barbell Bench Press",
        muscleGroup: "Chest",
        sets: 3,
        reps: "6-10",
        load: "55-67.5 kg",
        restSec: 150,
        trackBench: true,
        trackLoad: true,
        defaultWeightKg: 55,
        stepKg: 2.5,
        maxRepsRegular: 10,
        maxRepsLowTime: 12,
        cue: "Baseline 50x15 -> lock scapula + leg drive; warm up w/ empty bar (NO push-ups)",
        swap: {
          name: "Flat DB Press",
          sets: 3,
          reps: "10-12",
          load: "20-25 kg",
          cue: "Use when Flat Bench is busy; return for bench after",
        },
      },
      {
        id: "cg_cable_row",
        name: "Seated Cable Row (Neutral, Straps)",
        muscleGroup: "Mid-Back",
        sets: 3,
        reps: "12-15",
        load: "42-54 kg stack",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 42,
        stepKg: 6,
        cue: "Chest tall, straps on; skips chest-pad diaphragm crush",
        pairHint: "Long-rest pair: optional between Bench breaks",
        swap: {
          name: "Bench-Braced 1-Arm DB Row",
          sets: 3,
          reps: "12-15/arm",
          load: "17.5-25 kg",
          cue: "Straps on; wide rear-foot stance",
        },
      },
      {
        id: "cg_inc_db",
        name: "Incline DB Press (30 deg)",
        muscleGroup: "Upper Chest",
        sets: 3,
        reps: "12-15",
        load: "17.5-25 kg",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        cue: "Full pec stretch; climbing toward CG 25 kg DB cap",
        swap: {
          name: "Flat DB Press",
          sets: 3,
          reps: "12-15",
          load: "20-25 kg",
          cue: "Slow 3s eccentric past 25 kg DB cap",
        },
      },
      {
        id: "cg_lat_pd_wide",
        name: "Lat Pulldown (Wide/Med, Straps)",
        muscleGroup: "Lats",
        sets: 3,
        reps: "12-15",
        load: "42-54 kg stack",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 42,
        stepKg: 6,
        cue: "Thumbless grip + straps; drive elbows down toward pockets",
        pairHint: "Long-rest pair: optional between Incline DB breaks",
        swap: {
          name: "1-Arm Cable Lat Pulldown",
          sets: 3,
          reps: "12-15/arm",
          load: "24 kg stack (12 eff)",
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
        cue: "Bench at 45-60 deg (NEVER 30 deg) to guard front shoulder tendon",
        pairHint: "Long-rest pair: alternate curls during Lateral breaks",
        swap: {
          name: "Preacher EZ-Bar Curl",
          sets: 3,
          reps: "12-15",
          load: "Small EZ + plates",
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
        cue: "Full stretch past 90 deg; zero dips or kickbacks",
        pairHint: "Antagonist pair: alternate with Incline DB Curl",
        swap: {
          name: "EZ-Bar Lying Skullcrusher",
          sets: 3,
          reps: "12-15",
          load: "17.5-25 kg",
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
        id: "cg_leg_press",
        name: "Controlled Leg Press",
        muscleGroup: "Quads + Glutes",
        sets: 3,
        reps: "12-15",
        load: "90-140 kg",
        restSec: 120,
        trackLoad: true,
        defaultWeightKg: 100,
        stepKg: 10,
        cue: "Shoulder-width feet (NO ultra-wide Sumo catch; NEVER max first)",
        swap: {
          name: "Goblet Box Squat",
          sets: 3,
          reps: "12-15",
          load: "17.5-25 kg",
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
        defaultWeightKg: 55,
        stepKg: 5,
        maxRepsRegular: 12,
        maxRepsLowTime: 15,
        cue: "Primary hamstring builder past 25 kg DB cap; bar shaves thighs",
        swap: {
          name: "Lying DB Hamstring Curl",
          sets: 3,
          reps: "12-15",
          load: "12.5-17.5 kg DB",
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
        cue: "2s pause in deep bottom stretch for Kilimanjaro ankles",
        swap: {
          name: "Single-Leg BW Calf Raise",
          sets: 3,
          reps: "15/leg",
          load: "Bodyweight",
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
        cue: "Flex ribs to pelvis (zero hip swinging); skip twists if cramping",
        pairHint: "Long-rest pair: optional between Calf breaks",
        swap: {
          name: "90-deg Slow Leg Raise",
          sets: 3,
          reps: "12-15",
          load: "Bodyweight",
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
        reps: "10-15",
        load: "15-22.5 kg",
        restSec: 120,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        cue: "Seated stops lower-back wobble; always BEFORE free-weight rows",
        swap: {
          name: "Half-Kneeling Cable Press",
          sets: 3,
          reps: "12-15/arm",
          load: "18 kg stack (9 kg eff)",
          cue: "Smooth ribcage stack",
        },
      },
      {
        id: "cg_lat_pd_close",
        name: "Close-Grip Neutral Lat Pulldown (Straps)",
        muscleGroup: "Lats + Biceps",
        sets: 3,
        reps: "12-15",
        load: "42-54 kg stack",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 42,
        stepKg: 6,
        cue: "V-bar + straps; stretch lats full at top without swinging torso",
        pairHint: "Long-rest pair: optional between OHP breaks",
        swap: {
          name: "1-Arm Cable Lat Pulldown",
          sets: 3,
          reps: "12-15/arm",
          load: "24 kg stack",
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
        cue: "Standing cable fly on 2:1 pulley - full pec stretch, controlled constant tension",
        swap: {
          name: "Incline DB Press (30 deg)",
          sets: 3,
          reps: "12-15",
          load: "17.5-22.5 kg",
          cue: "Use if cable column is occupied",
        },
      },
      {
        id: "cg_db_row",
        name: "Bench-Braced 1-Arm DB Row (Straps)",
        muscleGroup: "Mid/Upper Back",
        sets: 3,
        reps: "12-15/arm",
        load: "17.5-25 kg",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 20,
        stepKg: 2.5,
        cue: "CG max DB = 25 kg; progress w/ 2s squeeze or Barbell Row swap",
        pairHint: "Long-rest pair: optional between Cable Fly breaks",
        swap: {
          name: "Barbell Bent-Over Row",
          sets: 3,
          reps: "10-15",
          load: "45-65 kg",
          cue: "Breaks 25 kg DB ceiling cleanly",
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
        cue: "Pull rope to forehead, elbows high; shoulder-health anchor",
        swap: {
          name: "Bent-Over DB Rear Delt Fly",
          sets: 3,
          reps: "12-15",
          load: "5-7.5 kg DBs",
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
        cue: "Overhead stretch hits long head ~40% better than pushdowns alone; zero bench dips",
        pairHint: "Long-rest pair: optional between Face Pull breaks",
        swap: {
          name: "Cable Rope Pushdown (2:1)",
          sets: 3,
          reps: "12-15",
          load: "24-36 kg stack",
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
        cue: "Neutral grip hits brachialis & forearms; 2nd weekly bicep angle",
        pairHint: "Antagonist pair: alternate with Overhead Cable Extension",
        swap: {
          name: "Preacher EZ-Bar Curl",
          sets: 3,
          reps: "12-15",
          load: "17.5-22.5 kg",
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
        cue: "Clamp DB cleanly between feet on bench; trains short head that RDL misses",
        swap: {
          name: "Barbell RDL (Straps On)",
          sets: 3,
          reps: "8-12",
          load: "50-75 kg",
          cue: "Hip-hinge fallback if bench curl feels awkward",
        },
      },
      {
        id: "cg_sl_leg_press",
        name: "Single-Leg Controlled Leg Press",
        muscleGroup: "Quads (Unilateral)",
        sets: 3,
        reps: "12-15/leg",
        load: "45-70 kg",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 50,
        stepKg: 5,
        cue: "Beats CG 25 kg DB ceiling cleanly with zero lumbar fatigue; foot aligned w/ hip",
        swap: {
          name: "Goblet Box Squat (Heels Elevated)",
          sets: 3,
          reps: "12-15",
          load: "20-25 kg",
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
        cue: "DB in hip crease (NO Bench Hip Thrust); 2s pause at top",
        swap: {
          name: "Single-Leg Floor Glute Bridge",
          sets: 3,
          reps: "12-15/leg",
          load: "BW / 10 kg DB",
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
        cue: "NO Reverse Lunges - slow 3s step-down bulletproofs knees for Kilimanjaro descents",
        swap: {
          name: "Single-Leg Extension",
          sets: 3,
          reps: "12-15/leg",
          load: "20-30 kg",
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
        cue: "Tracks unified Calf progression; pause 2s at bottom stretch",
        swap: {
          name: "Farmer Walk (Straps, 45s)",
          sets: 3,
          reps: "45s",
          load: "25 kg/hand",
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
        cue: "Press straight out & hold 2s/rep; builds trunk stability for Badminton & Kili pack",
        pairHint: "Long-rest pair: optional between Calf breaks",
        swap: {
          name: "Heavy Farmer Walk (Straps)",
          sets: 3,
          reps: "45s",
          load: "25 kg / hand",
          cue: "Tall ribs, straps on",
        },
      },
    ],
    full_body_plus: [
      {
        id: "cg_bench_vol",
        progressKey: "cg_bench",
        name: "Flat Barbell Bench (Clean Volume)",
        muscleGroup: "Chest",
        sets: 3,
        reps: "10-15",
        load: "50-62.5 kg",
        restSec: 120,
        trackBench: true,
        trackLoad: true,
        defaultWeightKg: 55,
        stepKg: 2.5,
        cue: "3rd weekly bench touch accelerates 100 kg ladder without beating up joints",
        swap: {
          name: "Cable Chest Fly (2:1 Pulley)",
          sets: 3,
          reps: "12-15",
          load: "24-36 kg stack",
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
        cue: "Extra side-delt width volume (3rd weekly touch)",
        swap: {
          name: "DB Lateral Raise",
          sets: 3,
          reps: "12-15",
          load: "7.5-10 kg",
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
        cue: "Balances Upper B overhead long-head stretch; full elbow flex past 90 deg",
        swap: {
          name: "EZ-Bar Lying Skullcrusher",
          sets: 3,
          reps: "12-15",
          load: "17.5-25 kg",
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
        cue: "3rd weekly bicep variation; strict elbow-on-pad stretch",
        pairHint: "Long-rest pair: optional between Pushdown breaks",
        swap: {
          name: "Cable Rope Hammer Curl (2:1)",
          sets: 3,
          reps: "12-15",
          load: "24-30 kg stack",
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
        load: "BW / Loaded Backpack",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 10,
        stepKg: 2.5,
        cue: "3s controlled descent + 1s deep chest stretch pause",
        swap: {
          name: "Close-Grip Countertop Push-Up",
          sets: 3,
          reps: "12-15",
          load: "Bodyweight",
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
        defaultWeightKg: 45,
        stepKg: 5,
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
        defaultWeightKg: 5,
        stepKg: 2.5,
        cue: "Hands wider on edge; slow bottom stretch",
        swap: {
          name: "Feet-Elevated Bed Pike Push-Up",
          sets: 3,
          reps: "10-15",
          load: "Bodyweight",
          cue: "Shifts load to clavicular pecs & delts",
        },
      },
      {
        id: "hm_pack_row",
        name: "Chair-Braced Backpack 1-Arm Row",
        muscleGroup: "Mid-Back",
        sets: 3,
        reps: "12-15/arm",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        cue: "Wide rear-foot stance; zero diaphragm crush",
        swap: {
          name: "Prone Floor Y-T-W Raises",
          sets: 3,
          reps: "15",
          load: "1-2.5 kg",
          cue: "Scapular posture control",
        },
      },
      {
        id: "hm_lat_home",
        name: "2.5-3 kg Slow 3s Lateral Raise",
        muscleGroup: "Side Delts",
        sets: 3,
        reps: "15",
        load: "2.5-3 kg DBs",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 3,
        stepKg: 0.5,
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
        cue: "Keep torso 45-60 deg; squeeze pinky up at top",
        swap: {
          name: "Towel-Under-Foot Drag Curl",
          sets: 3,
          reps: "12-15",
          load: "Self-Resistance",
          cue: "Smooth peak tension",
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
          cue: "Heels on thin book for clean knee track",
        },
      },
      {
        id: "hm_kickstand_rdl",
        progressKey: "hm_rdl",
        name: "Kickstand Backpack RDL",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "12-15/leg",
        load: "15-20 kg bag",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        cue: "80% weight on front heel; hinges hips cleanly for hamstring stretch",
        swap: {
          name: "Towel Floor Hamstring Slide",
          sets: 3,
          reps: "12-15",
          load: "Socks on smooth tile",
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
        defaultWeightKg: 10,
        stepKg: 2.5,
        cue: "Zero belly pinch; beats 25 kg bilateral cap",
        swap: {
          name: "Floor Backpack Glute Bridge",
          sets: 3,
          reps: "15",
          load: "20 kg bag",
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
        defaultWeightKg: 5,
        stepKg: 2.5,
        cue: "Slow 3s step-down builds Kili descent knees (NO reverse lunges)",
        swap: {
          name: "Spanish Squat (Towel/Band)",
          sets: 3,
          reps: "15",
          load: "Bodyweight",
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
        reps: "10-15",
        load: "Bodyweight",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 5,
        stepKg: 2.5,
        cue: "Smooth vertical press; always run BEFORE backpack rows",
        swap: {
          name: "Backpack Overhead Press",
          sets: 3,
          reps: "12-15",
          load: "12-16 kg bag",
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
        defaultWeightKg: 45,
        stepKg: 5,
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
        defaultWeightKg: 10,
        stepKg: 2.5,
        cue: "Replaces CG bench + rope work safely (NO chair/bed dips)",
        swap: {
          name: "Backpack Floor Press",
          sets: 3,
          reps: "15",
          load: "15-20 kg bag",
          cue: "Elbows 45 deg",
        },
      },
      {
        id: "hm_pack_row_b",
        progressKey: "hm_pack_row",
        name: "Chair-Braced Backpack Row",
        muscleGroup: "Mid/Upper Back",
        sets: 3,
        reps: "12-15/arm",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        cue: "Pull elbow toward hip with 1s pause",
        swap: {
          name: "Prone Y-T-W Raise",
          sets: 3,
          reps: "15",
          load: "BW / 1 kg",
          cue: "Scapular posture",
        },
      },
      {
        id: "hm_rear_ytw",
        name: "Bent-Over 2.5 kg Rear Delt Fly",
        muscleGroup: "Rear Delts",
        sets: 3,
        reps: "15",
        load: "2.5-3 kg DBs",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 3,
        stepKg: 0.5,
        cue: "Chest supported on knees or hip hinge; thumbs out slightly",
        swap: {
          name: "Wall Scapular Slides",
          sets: 3,
          reps: "15",
          load: "Bodyweight",
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
        cue: "Deep stretch behind head; NO bench dips",
        swap: {
          name: "Diamond Wall / Counter Push-Up",
          sets: 3,
          reps: "12-15",
          load: "Bodyweight",
          cue: "Keep elbows tucked",
        },
      },
      {
        id: "hm_drag_curl_b",
        progressKey: "hm_sofa_curl",
        name: "Towel-Under-Foot Drag Curl",
        muscleGroup: "Biceps",
        sets: 3,
        reps: "12-15",
        load: "Self-Resistance",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        cue: "Pair with Tricep Extension so Home Upper B hits both arm flexors & extensors",
        swap: {
          name: "Sofa Backpack Hammer Curl",
          sets: 3,
          reps: "12-15",
          load: "10-15 kg bag",
          cue: "Neutral grip brachialis bias",
        },
      },
    ],
    lower_b: [
      {
        id: "hm_towel_ham",
        progressKey: "hm_rdl",
        name: "Towel Floor Hamstring Slide",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "12-15",
        load: "Socks / Towel on Tile",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        cue: "Bridge hips high, slide heels slow for 3s to target pure hamstrings",
        swap: {
          name: "Kickstand Backpack RDL",
          sets: 3,
          reps: "12-15/leg",
          load: "15-20 kg bag",
          cue: "80% load on front leg",
        },
      },
      {
        id: "hm_heels_sq",
        name: "Heels-Elevated 1.5-Rep Squat",
        muscleGroup: "Quads",
        sets: 3,
        reps: "12-15",
        load: "15-20 kg bag",
        restSec: 90,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
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
        defaultWeightKg: 10,
        stepKg: 2.5,
        cue: "2s lockout squeeze",
        swap: {
          name: "Frog Pump Bridge",
          sets: 3,
          reps: "20",
          load: "Bodyweight",
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
        cue: "Slow 3s lowering past step level",
        swap: {
          name: "Two-Leg Tempo Calf Raise",
          sets: 3,
          reps: "20",
          load: "Backpack",
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
    full_body_plus: [
      {
        id: "hm_fb_push",
        progressKey: "hm_pushup",
        name: "Backpack Countertop Deficit Push-Up",
        muscleGroup: "Chest",
        sets: 3,
        reps: "12-15",
        load: "10-15 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 10,
        stepKg: 2.5,
        cue: "Extra chest volume cleanly away from CG gym",
        swap: { name: "Standard Deficit Push-Up", sets: 3, reps: "15", load: "BW", cue: "Slow lower" },
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
        defaultWeightKg: 45,
        stepKg: 5,
        cue: "Balances pushing volume cleanly",
        swap: { name: "Backpack 1-Arm Row", sets: 3, reps: "15/arm", load: "15 kg", cue: "Chair braced" },
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
        swap: { name: "Slow Lateral Raise", sets: 3, reps: "15", load: "3 kg", cue: "3s eccentric" },
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
        cue: "Zero rest switching curl <-> overhead tricep",
        swap: { name: "Towel Drag Curl", sets: 3, reps: "15", load: "Self-Resist", cue: "Strict tension" },
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
        load: "3s Eccentric",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 10,
        stepKg: 2.5,
        cue: "Clean deep stretch; zero wrist or shoulder pinch",
        swap: { name: "Backpack Floor Press", sets: 3, reps: "15", load: "15 kg bag", cue: "Pause at bottom" },
      },
      {
        id: "nm_suitcase_row",
        name: "Suitcase Chair-Braced 1-Arm Row",
        muscleGroup: "Mid-Back",
        sets: 3,
        reps: "12-15/arm",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        cue: "Pack laptop/clothes to hit target load",
        swap: { name: "Door-Towel Inverted Row", sets: 3, reps: "12-15", load: "BW Angle", cue: "Check door hinge direction" },
      },
      {
        id: "nm_pack_ohp",
        name: "Suitcase / Backpack Overhead Press",
        muscleGroup: "Shoulders",
        sets: 3,
        reps: "12-15",
        load: "12-16 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        cue: "Glutes squeezed, ribs stacked",
        swap: { name: "Wall Pike Press", sets: 3, reps: "10-12", load: "Bodyweight", cue: "Smooth depth" },
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
        cue: "Opens slumped travel upper back",
        swap: { name: "Prone Y-T-W Floor Raise", sets: 3, reps: "15", load: "BW", cue: "Slow squeeze" },
      },
      {
        id: "nm_desk_tri",
        name: "Close-Grip Desk Tricep Push-Up",
        muscleGroup: "Triceps",
        sets: 3,
        reps: "12-15",
        load: "Bodyweight",
        restSec: 60,
        cue: "Elbows narrow (Zero Chair Dips)",
        swap: { name: "Overhead Bag Tricep Ext", sets: 3, reps: "15", load: "12 kg bag", cue: "Full stretch" },
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
        swap: { name: "Stair / Low-Chair Step-Ups", sets: 3, reps: "12/leg", load: "BW", cue: "NO Reverse Lunges" },
      },
      {
        id: "nm_bag_rdl",
        progressKey: "nm_rdl",
        name: "Kickstand Carry-On Bag RDL",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "12-15/leg",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        cue: "Pure hamstring stretch without equipment",
        swap: { name: "Towel Hamstring Slide", sets: 3, reps: "12-15", load: "Hotel Tile", cue: "Slow 3s slide" },
      },
      {
        id: "nm_bed_bridge",
        name: "Single-Leg Bed-Edge Glute Bridge",
        muscleGroup: "Glutes",
        sets: 3,
        reps: "12-15/side",
        load: "Bodyweight",
        restSec: 60,
        cue: "Zero equipment required",
        swap: { name: "Single-Leg Calf Raise", sets: 3, reps: "15/leg", load: "BW", cue: "Tall calf stretch" },
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
        reps: "12-15",
        load: "12-16 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 12.5,
        stepKg: 2.5,
        cue: "Strict torso stack",
        swap: { name: "Wall Pike Press", sets: 3, reps: "12", load: "BW", cue: "Controlled tempo" },
      },
      {
        id: "nm_towel_row_b",
        progressKey: "nm_suitcase_row",
        name: "Suitcase Row + Door Towel Pull",
        muscleGroup: "Back",
        sets: 3,
        reps: "12-15/arm",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        cue: "High tension horizontal pull",
        swap: { name: "Prone Floor Y-T-W", sets: 3, reps: "15", load: "BW", cue: "Rear delt + upper back" },
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
        defaultWeightKg: 10,
        stepKg: 2.5,
        cue: "Smooth pec stretch",
        swap: { name: "Close-Grip Desk Push-Up", sets: 3, reps: "15", load: "BW", cue: "Lock triceps" },
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
        cue: "Balanced biceps & long-head triceps",
        swap: { name: "Close-Grip Desk Push-Up", sets: 3, reps: "15", load: "BW", cue: "Elbows tucked" },
      },
    ],
    lower_b: [
      {
        id: "nm_rdl_b",
        progressKey: "nm_rdl",
        name: "Kickstand Carry-On RDL",
        muscleGroup: "Hamstrings",
        sets: 3,
        reps: "12-15/leg",
        load: "15-20 kg bag",
        restSec: 75,
        trackLoad: true,
        defaultWeightKg: 15,
        stepKg: 2.5,
        cue: "Primary hotel hinge",
        swap: { name: "Single-Leg Bridge", sets: 3, reps: "15/leg", load: "BW", cue: "2s hold" },
      },
      {
        id: "nm_step_b",
        name: "Hotel Stair / Low-Chair Step-Ups",
        muscleGroup: "Quads + Kili Knees",
        sets: 3,
        reps: "12/leg",
        load: "Bodyweight",
        restSec: 60,
        cue: "3s controlled descent (NO Reverse Lunges)",
        swap: { name: "45s Wall Sit", sets: 3, reps: "45s", load: "BW", cue: "Deep quad burn" },
      },
      {
        id: "nm_bridge_b",
        name: "Single-Leg Bed-Edge Glute Bridge",
        muscleGroup: "Glutes",
        sets: 3,
        reps: "15/leg",
        load: "Bodyweight",
        restSec: 60,
        cue: "Squeeze glute cleanly at top",
        swap: { name: "Frog Bridge", sets: 3, reps: "20", load: "BW", cue: "Smooth rep cadence" },
      },
      {
        id: "nm_calf_b",
        name: "Single-Leg Step Calf + Core",
        muscleGroup: "Calves + Core",
        sets: 3,
        reps: "15 + 15",
        load: "Bodyweight",
        restSec: 45,
        cue: "Slow ankle mobility",
        swap: { name: "Deadbug", sets: 3, reps: "12/side", load: "BW", cue: "Brace core" },
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
        defaultWeightKg: 10,
        stepKg: 2.5,
        cue: "Optional Day 5 travel upper pump",
        swap: { name: "Close-Grip Push-Up", sets: 3, reps: "15", load: "BW", cue: "Triceps focus" },
      },
      {
        id: "nm_fb_row",
        progressKey: "nm_suitcase_row",
        name: "Suitcase 1-Arm Row",
        muscleGroup: "Back",
        sets: 3,
        reps: "12-15/arm",
        load: "15-20 kg bag",
        restSec: 60,
        trackLoad: true,
        defaultWeightKg: 17.5,
        stepKg: 2.5,
        cue: "Chair-braced zero back strain",
        swap: { name: "Prone Y-T-W", sets: 3, reps: "15", load: "BW", cue: "Upper back" },
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

export function getPrescribedWorkout(
  arena: ArenaId,
  split: SplitId,
  gateRank: GateRankId
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

  const list: ExerciseSpec[] =
    safeSplit === "ul_combo_a"
      ? [
          ...arenaMap.upper_a.map((e) => ({ ...e, blockSection: "upper" as const })),
          ...arenaMap.lower_a.map((e) => ({ ...e, blockSection: "lower" as const })),
        ]
      : safeSplit === "ul_combo_b"
        ? [
            ...arenaMap.upper_b.map((e) => ({ ...e, blockSection: "upper" as const })),
            ...arenaMap.lower_b.map((e) => ({ ...e, blockSection: "lower" as const })),
          ]
        : arenaMap[safeSplit] ?? arenaMap.upper_a;

  const isCardio = safeSplit === "cardio_pool";

  return list.map((ex) => {
    if (isCardio) return ex;
    const isLowTime = gateRank === "low_time_2x";
    const scaledSets = isLowTime ? 2 : 3;
    const scaledSwapSets = scaledSets;
    const lowCap = ex.maxRepsLowTime ?? 19;
    const regCap = ex.maxRepsRegular ?? 15;
    const scaledReps = ex.timeBased
      ? ex.reps
      : isLowTime
        ? `Fail (<=${lowCap})`
        : regCap === 10
          ? "6-10"
          : regCap === 12
            ? "8-12"
            : "12-15";
    const isSwapTimeBased = /\d+s\b|\bmin\b/i.test(ex.swap.reps);
    const scaledSwapReps = isSwapTimeBased
      ? ex.swap.reps
      : isLowTime
        ? `Fail (<=${lowCap})`
        : regCap === 10
          ? "6-10"
          : regCap === 12
            ? "8-12"
            : "12-15";

    return {
      ...ex,
      sets: scaledSets,
      reps: scaledReps,
      swap: {
        ...ex.swap,
        sets: scaledSwapSets,
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
  | "debloat";

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

export interface FoodViability {
  tier: "S" | "A" | "B" | "C";
  proteinPer100Kcal: number;
  proteinCalPct: number;
  label: string;
  verdict: string;
}

export function evaluateFoodViability(kcal: number, proteinG: number): FoodViability {
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
      tier: "A",
      proteinPer100Kcal: 0,
      proteinCalPct: 0,
      label: "0 kcal Buffer",
      verdict: "Zero-calorie mixer or late-evening craving crutch",
    };
  }

  const proteinPer100Kcal = Math.round(((safeProtein * 100) / safeKcal) * 10) / 10;
  const proteinCalPct = Math.min(100, Math.round(((safeProtein * 4) / safeKcal) * 100));

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
    label: "C-Tier Treat / Carb",
    verdict: "High non-protein energy - buffer earlier with S-tier protein to avoid deficit spill",
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
    note: "Locks 155-175g daytime protein by 7 PM so skipping dinner is effortless",
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
    note: "Fish Tikka + Prawns + Chicken skewers + Light-Oil Wish Grill -> Auto-skips dinner!",
    tags: ["abs_raid", "high_protein"],
    category: "spot",
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
    category: "spot",
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
    note: "High-satiety dairy bridge before dinner window",
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
    tags: ["social"],
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
    tags: ["social"],
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
    focus: "Upper A + HSR Lunch + 5 PM Seal",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "mon_1", slot: "primer", presetId: "am_eggs_whey", label: "4 Eggs / 1.5x Whey Primer", kcal: 320, proteinG: 42 },
      { id: "mon_2", slot: "lunch", presetId: "hebe_salsa_chicken", label: "Hebe's Salsa Egg + Chicken", kcal: 680, proteinG: 65 },
      { id: "mon_3", slot: "seal", presetId: "whey_skyr_seal", label: "5 PM Seal: 2x Whey + Skyr", kcal: 380, proteinG: 70 },
    ],
  },
  tue: {
    focus: "Lower A + HSR Skewers + 5 PM Seal",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "tue_1", slot: "primer", presetId: "am_eggs_whey", label: "4 Eggs / 1.5x Whey Primer", kcal: 320, proteinG: 42 },
      { id: "tue_2", slot: "lunch", presetId: "grill_daddy_skewers", label: "Grill Daddy Skewers / 1/2 Roast", kcal: 490, proteinG: 48 },
      { id: "tue_3", slot: "seal", presetId: "whey_skyr_seal", label: "5 PM Seal: 2x Whey + Skyr", kcal: 380, proteinG: 70 },
    ],
  },
  wed: {
    focus: "AB's Weekly Proteinmaxx Lunch Raid (OMAD)",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "wed_1", slot: "primer", presetId: "boiled_eggs_2", label: "2 Boiled Eggs", kcal: 155, proteinG: 13 },
      { id: "wed_2", slot: "lunch", presetId: "abs_omad_raid", label: "AB's Proteinmaxx Lunch Raid", kcal: 1550, proteinG: 160 },
      { id: "wed_3", slot: "seal", presetId: "diet_coke", label: "Diet Coke / Coke Zero (330 ml)", kcal: 0, proteinG: 0 },
    ],
  },
  thu: {
    focus: "Upper B + Cal Burrito + 5 PM Seal",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "thu_1", slot: "primer", presetId: "am_eggs_whey", label: "4 Eggs / 1.5x Whey Primer", kcal: 320, proteinG: 42 },
      { id: "thu_2", slot: "lunch", presetId: "cal_burrito_bowl", label: "Cal Burrito BBQ Bowl", kcal: 550, proteinG: 48 },
      { id: "thu_3", slot: "seal", presetId: "whey_skyr_seal", label: "5 PM Seal: 2x Whey + Skyr", kcal: 380, proteinG: 70 },
    ],
  },
  fri: {
    focus: "Lower B + Social Dinner Out Mode",
    dinnerSkipped: false,
    dinnerOut: true,
    meals: [
      { id: "fri_1", slot: "primer", presetId: "am_eggs_whey", label: "4 Eggs / 1.5x Whey Primer", kcal: 320, proteinG: 42 },
      { id: "fri_2", slot: "lunch", presetId: "hebe_chicken_bowl", label: "Hebe's Dbl-Chicken Bowl", kcal: 520, proteinG: 50 },
      { id: "fri_3", slot: "seal", presetId: "pre_social_shield", label: "Pre-Taproom Curd + Whey", kcal: 220, proteinG: 35 },
      { id: "fri_4", slot: "dinner", presetId: "tandoori_half", label: "Tandoori Chicken (Half)", kcal: 420, proteinG: 56 },
    ],
  },
  sat: {
    focus: "Core + Zone 2 + CG Home Grill",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "sat_1", slot: "primer", presetId: "am_eggs_whey", label: "4 Eggs / 1.5x Whey Primer", kcal: 320, proteinG: 42 },
      { id: "sat_2", slot: "lunch", presetId: "khan_saheb_tikka", label: "Khan Saheb Tikka + Charcoal", kcal: 520, proteinG: 65 },
      { id: "sat_3", slot: "seal", presetId: "whey_skyr_seal", label: "5 PM Seal: 2x Whey + Skyr", kcal: 380, proteinG: 70 },
    ],
  },
  sun: {
    focus: "Badminton + Taaza + Controlled Meghana",
    dinnerSkipped: true,
    dinnerOut: false,
    meals: [
      { id: "sun_1", slot: "primer", presetId: "taaza_whey", label: "Taaza 2 Idli + Whey/Eggs", kcal: 540, proteinG: 38 },
      { id: "sun_2", slot: "lunch", presetId: "meghana_half", label: "Meghana Leg + Eggs + 1/2 Rice", kcal: 720, proteinG: 54 },
      { id: "sun_3", slot: "seal", presetId: "whey_skyr_seal", label: "5 PM Seal: 2x Whey + Skyr", kcal: 380, proteinG: 70 },
    ],
  },
};

export function getTodayWeekdayKey(date: Date = new Date()): WeekdayKey {
  const map: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[date.getDay()] ?? "mon";
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
  loggedLabels: string[];
  todayPlan?: DayMealPlan;
  currentHour?: number;
}): NutritionCoachAdvice {
  const {
    consumedKcal,
    consumedProteinG,
    kcalCeiling,
    proteinTargetG,
    dinnerSkipped,
    dinnerOutMode,
    loggedLabels,
    todayPlan,
    currentHour = new Date().getHours(),
  } = params;

  const remainingKcal = Math.max(0, kcalCeiling - consumedKcal);
  const remainingProteinG = Math.max(0, proteinTargetG - consumedProteinG);
  const currentDensity =
    consumedKcal > 0 ? Math.round(((consumedProteinG * 100) / consumedKcal) * 10) / 10 : 0;

  const normLogged = loggedLabels.map((l) => l.toLowerCase());
  const nextPlannedMeal =
    todayPlan?.meals.find((m) => {
      const needle = m.label.toLowerCase().slice(0, 14);
      return !normLogged.some((logged) => logged.includes(needle));
    }) ?? null;

  const projectedDinnerBudgetKcal = dinnerOutMode
    ? remainingKcal
    : dinnerSkipped
      ? 0
      : Math.min(600, remainingKcal);

  if (consumedKcal === 0) {
    return {
      headline: nextPlannedMeal
        ? `Start today clean with ${nextPlannedMeal.label}`
        : `0 / ${proteinTargetG}g P logged - lock Primer or HSR Lunch first`,
      actionTip:
        currentHour >= 18
          ? "Evening check-in: log today's meals or tap Build Plate for dinner dishes."
          : currentHour >= 12
            ? "Midday already: hit a 48-65g P lunch now so evening protein takes zero stress."
            : "Anchor 40g+ P before noon to make the 5 PM Seal effortless.",
      tone: "cobalt",
      remainingKcal,
      remainingProteinG,
      currentDensity,
      projectedDinnerBudgetKcal,
      nextPlannedMeal,
    };
  }

  if (consumedKcal > kcalCeiling) {
    const overKcal = consumedKcal - kcalCeiling;
    const recoverySteps = Math.max(1000, Math.round(overKcal / 45) * 1000);
    return {
      headline: `+${overKcal} kcal over ${kcalCeiling} ceiling (Protein: ${consumedProteinG}g)`,
      actionTip: `Stop solid food for today, lean on Diet Coke + water, and add ~${recoverySteps.toLocaleString()} extra steps.`,
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
      headline: `Protein floor locked (${consumedProteinG}g P) with ${remainingKcal} kcal room left`,
      actionTip: dinnerOutMode
        ? `Dinner Out budget: up to ${remainingKcal} kcal. Stick to grilled starters or light dinner; skip mindless desserts.`
        : dinnerSkipped
          ? "Skip-Dinner Seal holds cleanly - grab Diet Coke or mint tea if a late craving hits."
          : `You have ${remainingKcal} kcal spare for a light dinner or social flex.`,
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
      headline: `Need ${remainingProteinG}g P inside ${remainingKcal} kcal before Skip-Dinner lock`,
      actionTip:
        remainingProteinG >= 55
          ? "Run the 5 PM Seal (2x Whey + Skyr = 70g P / 380 kcal) before 7 PM to clear target without eating dinner."
          : `Top up with ${remainingProteinG <= 25 ? "1x Whey" : "Chicken Tikka / Whey + Skyr"} and close the kitchen at 7 PM.`,
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
        : `On pace for your cut - any A/S-tier plate keeps today's deficit intact.`,
    tone: reqDensity >= 11 ? "amber" : "emerald",
    remainingKcal,
    remainingProteinG,
    currentDensity,
    projectedDinnerBudgetKcal,
    nextPlannedMeal,
  };
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
