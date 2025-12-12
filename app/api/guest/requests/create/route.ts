import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  GUEST_ID_COOKIE_NAME,
  GUEST_ROOM_ID_COOKIE_NAME,
} from "@/lib/guestSession";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const guestId = cookieStore.get(GUEST_ID_COOKIE_NAME)?.value;
    const roomId = cookieStore.get(GUEST_ROOM_ID_COOKIE_NAME)?.value;

    if (!guestId || !roomId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    // Capture releaseYear from the request body
    const { trackId, trackName, artistName, popularity, releaseYear } = body || {}; 

    if (!trackId || !trackName) {
      return NextResponse.json({ success: false, error: "Missing track data" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // 1. DUPLICATE CHECK
    const { data: existing } = await supabase
      .from("room_requests")
      .select("id, guest_id")
      .eq("room_id", roomId)
      .eq("track_id", trackId) 
      .single();

    if (existing) {
      const isOwner = existing.guest_id === guestId;
      return NextResponse.json(
        {
          success: false,
          error: "duplicate_request",
          existingRequestId: existing.id,
          isOwner,
        },
        { status: 409 }
      );
    }

    // 2. INSERT NEW REQUEST
    const { data: inserted, error: insertError } = await supabase
      .from("room_requests")
      .insert({
        room_id: roomId,
        guest_id: guestId,
        track_id: trackId,
        song_title: trackName,
        artist_name: artistName,
        popularity: popularity || 0,
        release_year: releaseYear || null, // <--- Saving the year!
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { 
         return NextResponse.json(
          { success: false, error: "duplicate_request", isOwner: false }, 
          { status: 409 }
        );
      }
      
      console.error("Insert error:", insertError);
      return NextResponse.json({ success: false, error: "Failed to add song" }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: inserted }, { status: 201 });

  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}