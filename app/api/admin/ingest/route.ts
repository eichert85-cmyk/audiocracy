import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    // 1. Security Check (Simple for now, can be expanded)
    // Only allow Hosts to do this
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { songs, category } = body;

    if (!songs || !Array.isArray(songs) || !category) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // 2. Format for Insert
    const rows = songs.map((s: any) => ({
      artist_name: s.artist,
      song_title: s.title,
      category: category.toLowerCase().replace(/ /g, "_")
    }));

    // 3. Bulk Insert
    const { error } = await supabase
      .from("curated_classics")
      .insert(rows);

    if (error) {
      console.error("Ingest error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}