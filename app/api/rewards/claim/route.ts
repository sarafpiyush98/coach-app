import { supabase } from "@/lib/supabase";
import { parseRewardsState, REWARD_DEFINITIONS } from "@/lib/rewards";
import { format } from "date-fns";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reward_id, details } = body as { reward_id: string; details?: string };

    if (!reward_id) {
      return Response.json({ error: "reward_id required" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("player_profile")
      .select("id, rewards")
      .limit(1)
      .single();

    if (profileError || !profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    const state = parseRewardsState((profile as Record<string, unknown>).rewards);
    const reward = state.earned.find((r) => r.id === reward_id);

    if (!reward) {
      return Response.json({ error: "Reward not found" }, { status: 404 });
    }
    if (reward.claimed) {
      return Response.json({ error: "Already claimed" }, { status: 400 });
    }

    // Mark as claimed
    reward.claimed = true;
    reward.claimed_at = new Date().toISOString();
    reward.claimed_details = details || null;

    // Apply effects
    if (reward.type === "rest_permit") {
      const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");
      await supabase.from("planned_breaks").insert({
        start_date: tomorrow,
        end_date: tomorrow,
        reason: "REST PERMIT — earned through 14-day exercise streak",
      } as never);
    }

    // Save updated rewards
    const { error: updateError } = await supabase
      .from("player_profile")
      .update({ rewards: state } as never)
      .eq("id", (profile as Record<string, unknown>).id as never);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    const def = REWARD_DEFINITIONS[reward.type];
    return Response.json({
      data: { message: def.claimMessage, reward },
    });
  } catch {
    return Response.json({ error: "Unknown error" }, { status: 500 });
  }
}
