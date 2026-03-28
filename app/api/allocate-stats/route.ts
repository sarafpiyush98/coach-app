// Run in Supabase before using this route:
// ALTER TABLE player_profile ADD COLUMN IF NOT EXISTS stat_allocations JSONB DEFAULT '{}';

import { supabase } from "@/lib/supabase";

const VALID_STATS = ["STR", "AGI", "VIT", "INT", "DSC"] as const;
type StatKey = (typeof VALID_STATS)[number];

export async function POST(request: Request) {
  const body = await request.json();
  const stat: string = body.stat;
  const points: number = body.points;

  if (!VALID_STATS.includes(stat as StatKey) || typeof points !== "number" || points < 1) {
    return Response.json(
      { error: "Invalid stat or points value" },
      { status: 400 }
    );
  }

  // Read current profile
  const { data: profile, error: readError } = await supabase
    .from("player_profile")
    .select("*")
    .limit(1)
    .single();

  if (readError || !profile) {
    return Response.json(
      { error: readError?.message ?? "Profile not found" },
      { status: 500 }
    );
  }

  const currentAllocated = (profile as Record<string, unknown>).allocated_stat_points as number ?? 0;
  const level = (profile as Record<string, unknown>).level as number ?? 1;
  const maxAllowed = level * 3;

  if (currentAllocated + points > maxAllowed) {
    return Response.json(
      { error: `Cannot allocate ${points} points. ${maxAllowed - currentAllocated} remaining.` },
      { status: 400 }
    );
  }

  // Read existing allocations and increment
  const existingAllocations = ((profile as Record<string, unknown>).stat_allocations as Record<string, number>) ?? {};
  const newAllocations = {
    ...existingAllocations,
    [stat]: (existingAllocations[stat] ?? 0) + points,
  };

  const { data: updated, error: updateError } = await supabase
    .from("player_profile")
    .update({
      allocated_stat_points: currentAllocated + points,
      stat_allocations: newAllocations,
    } as never)
    .eq("id", (profile as Record<string, unknown>).id as string)
    .select()
    .single();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ data: updated });
}
