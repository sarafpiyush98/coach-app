import { supabase } from "@/lib/supabase";
import { recalculateAndWriteXP } from "@/lib/xp-engine";
import { format, subDays } from "date-fns";
import type { Meal } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Handle recent meals request
  const recent = url.searchParams.get("recent");
  if (recent === "true") {
    const fourteenDaysAgo = format(subDays(new Date(), 14), "yyyy-MM-dd");
    const { data: recentMeals, error } = await supabase
      .from("meals")
      .select("description, calories, protein_g, is_eating_out, restaurant")
      .gte("date", fourteenDaysAgo)
      .order("date", { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate by normalized description + calorie bucket
    type RecentMeal = { description: string | null; calories: number | null; protein_g: number | null; is_eating_out: boolean | null; restaurant: string | null };
    const meals = (recentMeals ?? []) as RecentMeal[];
    const groups = new Map<string, { meal: RecentMeal; count: number }>();
    for (const meal of meals) {
      const key = `${(meal.description || "").toLowerCase().trim()}|${Math.round((meal.calories || 0) / 100) * 100}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
      } else {
        groups.set(key, { meal, count: 1 });
      }
    }

    const deduplicated = Array.from(groups.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(({ meal, count }) => ({ ...meal, frequency: count }));

    return Response.json({ data: deduplicated });
  }

  const date = url.searchParams.get("date");

  if (!date) {
    return Response.json(
      { error: "date query param is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("date", date)
    .order("meal_number", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.date || !body.description || body.meal_number == null) {
    return Response.json(
      { error: "date, description, and meal_number are required" },
      { status: 400 }
    );
  }

  // Ensure daily_log row exists for this date
  const { error: logError } = await supabase
    .from("daily_log")
    .upsert({ date: body.date } as never, { onConflict: "date" })
    .select()
    .single();

  if (logError) {
    return Response.json({ error: logError.message }, { status: 500 });
  }

  // Insert the meal
  const mealRow: Omit<Meal, "id" | "created_at"> = {
    date: body.date,
    meal_number: body.meal_number,
    time: body.time ?? null,
    description: body.description,
    calories: body.calories ?? null,
    protein_g: body.protein_g ?? null,
    photo_url: body.photo_url ?? null,
    is_eating_out: body.is_eating_out ?? false,
    restaurant: body.restaurant ?? null,
  };

  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .insert(mealRow as never)
    .select()
    .single();

  if (mealError) {
    return Response.json({ error: mealError.message }, { status: 500 });
  }

  // Recalculate daily totals from all meals that day
  const { data: allMeals, error: sumError } = await supabase
    .from("meals")
    .select("calories, protein_g")
    .eq("date", body.date);

  if (sumError) {
    return Response.json({ error: sumError.message }, { status: 500 });
  }

  const typedMeals = allMeals as Array<Pick<Meal, "calories" | "protein_g">>;
  const caloriesTotal = typedMeals.reduce(
    (sum, m) => sum + (m.calories ?? 0),
    0
  );
  const proteinTotal = typedMeals.reduce(
    (sum, m) => sum + (m.protein_g ?? 0),
    0
  );

  const { error: updateError } = await supabase
    .from("daily_log")
    .update({
      calories_total: caloriesTotal,
      protein_g: proteinTotal,
      meals_logged: true,
    } as never)
    .eq("date", body.date);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  await recalculateAndWriteXP(body.date);

  return Response.json({ data: meal }, { status: 201 });
}
