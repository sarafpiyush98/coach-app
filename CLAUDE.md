@AGENTS.md

# THE SYSTEM — Coach App Rebuild

## MANDATORY: Read First
- **`SYSTEM-SPEC.md`** — Complete design specification. Read before writing ANY code.
- **`lib/gamification.ts`** — 1200-line gamification engine. Do NOT rewrite. Wrap and extend.

## Rules
1. This is a Solo Leveling-themed lifestyle app. The System assigns quests, tracks stats, enforces penalties.
2. The System voice is cold, factual, slightly ominous. Never cheerful. Never begging. See SYSTEM-SPEC.md for examples.
3. **Keep existing gamification logic.** XP values, combo multiplier, streaks, achievements, boss fights, comeback system — all battle-tested. Theme them, don't replace them.
4. **No configuration screens.** The System doesn't ask preferences. It assigns and records.
5. **Colors:** #0C0C0F (bg), #0D1117 (surface), #1B45D7 (System blue), #0A1543 (navy), #463671 (purple), #FFC107 (gold), #D50000 (red), #FBEFFA (text)
6. **Fonts:** Rajdhani (headers/quest names), Geist Mono (stats/numbers), Inter (body)
7. **Every card** gets the System panel treatment: glass background + scanline overlay + blue border glow
8. Mobile-first. Max-width container. Bottom nav with 5 tabs.
9. All animations via Framer Motion. All sounds via Web Audio API (no audio files).
10. Quest names are epic, not functional: "FUEL THE VESSEL" not "Log meals"
