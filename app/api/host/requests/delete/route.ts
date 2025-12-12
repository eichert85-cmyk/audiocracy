import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function DELETE(req: Request) {
  try {
    const { requestId, roomCode } = await req.json();
    const supabase = await createSupabaseServerClient();

    // 1. Verify Host
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Verify Room Ownership
    // We check if the room associated with this code belongs to the user
    const { data: room } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", roomCode)
      .eq("owner_id", user.id)
      .single();

    if (!room) return NextResponse.json({ error: "Unauthorized Room" }, { status: 403 });

    // 3. Delete the Request
    // We strictly check room_id to ensure the host isn't deleting someone else's request by ID hacking
    const { error: deleteError } = await supabase
      .from("room_requests")
      .delete()
      .eq("id", requestId)
      .eq("room_id", room.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}