# THE SYSTEM — Design Specification

> The System doesn't ask. It assigns. It doesn't motivate. It records.
> It doesn't care if you comply — it cares that the record is accurate.

This is the complete design spec for rebuilding coach-app as a Solo Leveling-inspired lifestyle system. Every session working on this app MUST read this file first.

---

## CORE PRINCIPLES

1. **The System assigns, it doesn't ask.** No configuration screens. No "what's your schedule?" Quests are issued, not suggested.
2. **Strict about WHAT, flexible about HOW.** You must move today (any movement counts). You must log food (approximations fine). You must check in (60 seconds).
3. **Minimum viable day = 5 XP.** Showed up and logged anything. Some days that's enough.
4. **No micro-timing enforcement.** The reference schedule is guidance. Only the eating window close is time-enforced (as a streak, not a quest failure).
5. **Penalties are retrievable on first offense.** Dark Souls rule: consequence is real, recovery is always possible.
6. **Progressive disclosure.** Features unlock as you level. No feature dump on day 1.

---

## VISUAL IDENTITY

### Color Palette

| Role | Hex | Usage |
|---|---|---|
| Background | `#0C0C0F` | Page base (near AMOLED black) |
| Surface | `#0D1117` | Cards, panels |
| System Blue | `#1B45D7` | Primary accent — quest borders, stat bars, System windows |
| Deep Navy | `#0A1543` | Secondary borders, glow base |
| Shadow Purple | `#463671` | Rank badges, shadow power, penalty zone |
| Gold | `#FFC107` | Achievements, S-rank, completed quests, loot |
| Danger Red | `#D50000` | Failed, penalty, critical warnings |
| Success Green | `#059669` | Quest complete, health |
| Text Primary | `#FBEFFA` | Near-white |
| Text Muted | `#4A5568` | Inactive, locked |

### System Panel Effect (apply to all cards)

Three layers:
1. **Glass base:** `background: rgba(10, 20, 60, 0.85); backdrop-filter: blur(16px)`
2. **Scanline overlay:** `::before` with `repeating-linear-gradient(0deg, transparent 2px, rgba(27,69,215,0.03) 4px)`
3. **Blue border glow:** `box-shadow: 0 0 4px #1B45D7, 0 0 10px #1B45D7, 0 0 20px #021FA0`

### Typography

| Purpose | Font | Weight |
|---|---|---|
| Stats, XP, numbers, timers | **Geist Mono** | 400-600 |
| System headers, rank labels, quest names | **Rajdhani** | 700 |
| Body text, quest descriptions | **Inter** | 400 |

### Animations (Framer Motion)

- **Panel materialize:** scale 0.95→1, opacity 0→1, 250ms, ease [0.16, 1, 0.3, 1]
- **Stat reveal:** stagger children by 50ms
- **XP count-up:** number rolls from 0 to earned XP over 800ms
- **Glitch text:** clip-path animation on rank-up headers
- **Rank-up:** full-screen flash (300ms white-gold), new rank fades in

### Sound (Web Audio API — zero audio files)

- **Quest complete:** triangle wave 1200Hz, 150ms decay
- **Level up:** sine sweep 440→880Hz, 300ms, 500ms decay
- **Rank up:** chord (440+554+659Hz), 200ms attack, 1s decay
- **Quest failed:** low sine 220Hz, 100ms, abrupt cut

---

## THE SYSTEM VOICE

| Attribute | Rule |
|---|---|
| Tone | Cold, factual, slightly ominous. Never cheerful. |
| Sentences | Short. Declarative. Often fragments. |
| Emotion | Indifferent to compliance. Records facts. |
| NEVER say | "Great job", "awesome", "don't forget", "you got this", "keep it up", emoji |
| Urgency | Countdown, not exclamation marks |
| Failure | "Quest expired. Logged." NOT "You failed." |
| Personality | Not an assistant. Not a coach. A System that runs whether you participate or not. |

**Examples:**
- Quest available: `"MOVEMENT PROTOCOL. Awaiting execution."`
- 2 hours left: `"WARNING: Movement Protocol incomplete. 2 hours remain."`
- Complete: `"MOVEMENT PROTOCOL — COMPLETE. +40 XP. STR +2."`
- Failed: `"MOVEMENT PROTOCOL — EXPIRED. Penalty applied. The record reflects this."`
- Level up: `"LEVEL 12 ACHIEVED. +3 distributable points available."`
- Rank up: `"RANK ADVANCEMENT: B-RANK. New protocols unlocking."`
- Comeback: `"Anomaly detected. System recalibrating. Bonus protocols active."`

---

## EXISTING GAMIFICATION ENGINE (KEEP AS-IS)

The following mechanics in `lib/gamification.ts` are battle-tested. Do NOT rewrite them. Wrap them, theme them, extend them.

### XP Values
```
logMeal: 15, hitCalorieTarget: 30, hitProteinTarget: 25,
workout: 40, strengthWorkout: 50, noLateEating: 20,
dailyCheckin: 10, weighIn: 15, personalRecord: 75,
minimumViableDay: 5
```

### Combo Multiplier
`min(1 + comboDay × 0.1, 2.5)` — caps at 2.5x after 15 days

### Loot Drops (Variable Ratio)
Common 50% (1.0x), Uncommon 25% (1.25x), Rare 15% (1.5x), Epic 8% (2.0x), Legendary 2% (3.0x)
**ADD:** Pity system — guaranteed rare+ every 10 active days

### Never-Miss-Twice Streaks
3 independent: exercise, logging, no-late-eating. First miss = grace. Second consecutive = break.

### Weekly Scoring
`tracking(30%) + exercise(25%) + no-late-eating(20%) + calories(15%) + protein(10%)` = 0-100

### Comeback Bonus
2 days missed: 1.5x, 3-6 days: 2.0x, 7+ days: 2.5x. Fresh start labels on Monday/month start.

### Ease-Back
After 2+ missed days: 2 days of reduced targets (2200 cal, "15-min walk counts").

### Boss Fights
4 weight-based bosses: Gatekeeper (120kg), Plateau (110kg), Centurion (100kg), Final Boss (95kg).

### 40+ Achievements
Tiered: Bronze (75%), Silver (25%), Gold (10%), Diamond (1%), Secret (hidden).

---

## NEW MECHANICS TO BUILD

### 5 Stats (derived from existing actions)
| Stat | Driven By |
|---|---|
| STR | Strength workouts, PRs |
| AGI | Cardio, walks, active minutes |
| VIT | Sleep quality, wake consistency, no late eating |
| INT | Meal logging accuracy, macro targets hit |
| DSC | Streak length, combo days, quest completion rate |

+3 distributable points on level-up.

### Hunter Ranks
E-Rank (1-4, grey), D-Rank (5-9, teal), C-Rank (10-17, blue), B-Rank (18-27, indigo), A-Rank (28-39, purple), S-Rank (40-54, gold), National Level (55-74, white shimmer), Shadow Monarch (75+, black+purple)

### Quest Framing
Rename existing actions as epic quests:
- Log meals → FUEL THE VESSEL
- Workout → MOVEMENT PROTOCOL
- Check-in → SYSTEM DIAGNOSTIC
- No late eating → FASTING SEAL
- Hit protein → PROTEIN SYNTHESIS
- Hit calories → ENERGY CALIBRATION

### Shadow Army (6 unlockable perks)
| Shadow | Unlock | Benefit |
|---|---|---|
| Iron | 50 workouts | Workout history insights |
| Igris | 14-day workout streak | 1 free streak miss/week |
| Tank | 21 days protein target | Meal suggestions |
| Beru | 30 complete daily quests | Penalty difficulty -1 |
| Tusk | Reach B-Rank | Side quest variety |
| Bellion | Reach S-Rank | Emergency quests 2x XP |

### Penalty Escalation
1 quest missed → -XP, recovery quest available
All daily missed → no daily reward, penalty quest next day
2 consecutive days → streak break, combo reset
3+ consecutive → PENALTY ZONE (harder quests, terser voice, must complete sequence to exit)

### Emergency Quests
Accelerometer-triggered when stationary 45+ min. Expire in 30 min. Max 2/day.

### Progressive Disclosure
Level 1-3: 3 quests only. Level 4-7: quest log + check-in. Level 8-14: side quests, chain quests, weekly grade. Level 15+: stat allocation, emergency quests, shadows. Level 20+: full access.

---

## SCREENS (5 total, no settings page)

1. **Command Center** — Active quest, stat bars, streak, combo, completion %
2. **Quest Log** — Today's quests with status (pending/active/complete/failed)
3. **Status Window** — Full stat panel, rank, level, XP ring, point allocation, shadow army
4. **Dungeon** — Boss fights, weight chart, heatmap, chain quest progress
5. **Records** — History calendar, achievement gallery

---

## SAMSUNG GALAXY S26 ULTRA — AVAILABLE APIS

**PWA-native (use directly):**
Push notifications (FCM), Vibration (haptics), Badging (quest count on icon), Camera (food photos), Geolocation (walk/run tracking), Accelerometer (stationary detection), Wake Lock (workout mode), Share Target (camera→meal log), Offline (service worker)

**Via Tasker bridge (personal use):**
Steps, sleep, heart rate, weight from Samsung Health → Supabase auto-sync

---

## TECH STACK

**Keep:** Next.js 16, TypeScript, Supabase, Tailwind 4, shadcn/ui, Recharts, date-fns, Lucide icons
**Add:** Framer Motion (animations), Zustand (global state), tsparticles (ambient), Rajdhani font, Web Audio API (sounds)

---

## BUILD PHASES

| Phase | Scope | Sessions |
|---|---|---|
| 1 | Visual foundation — colors, System panel, fonts, sounds, toasts | 2-3 |
| 2 | Quest engine + Command Center | 2-3 |
| 3 | Stats + Hunter Ranks + Status Window | 1-2 |
| 4 | Samsung Health bridge + auto-tracking | 1 |
| 5 | Penalty Zone + Shadow Army | 2 |
| 6 | Emergency Quests + Progressive Disclosure | 1-2 |
| 7 | Remaining screens + Polish | 2-3 |
