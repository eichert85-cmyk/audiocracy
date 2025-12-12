import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Check Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Body
    const body = await request.json();
    const { name, eventDate } = body; 

    if (!name) {
      return NextResponse.json({ error: "Event name is required" }, { status: 400 });
    }

    // 3. Generate Unique Room Code (6 chars)
    let code = "";
    let isUnique = false;
    while (!isUnique) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      // Check collision
      const { data } = await supabase.from("rooms").select("id").eq("code", code).single();
      if (!data) isUnique = true;
    }

    // 4. Insert Room with Date
    // Note: eventDate defaults to today if not provided
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        code,
        name,
        owner_id: user.id,
        is_active: true,
        event_date: eventDate || new Date().toISOString() 
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, code: room.code });

  } catch (err) {
    console.error("Create Room Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}