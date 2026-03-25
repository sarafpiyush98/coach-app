import { supabase } from "@/lib/supabase";
import type { Meal } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

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

  return Response.json({ data: meal }, { status: 201 });
}
