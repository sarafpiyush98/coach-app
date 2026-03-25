import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import type { DailyLog } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("daily_log")
    .select("*")
    .eq("date", date)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<DailyLog> & { date: string };

  if (!body.date) {
    return Response.json({ error: "date is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("daily_log")
    .upsert(body as never, { onConflict: "date" })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
