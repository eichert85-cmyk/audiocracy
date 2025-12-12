import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { GUEST_ID_COOKIE_NAME } from "@/lib/guestSession";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const guestId = cookieStore.get(GUEST_ID_COOKIE_NAME)?.value;

    if (!guestId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, voteVal } = body;

    // Validation
    if (![1, 0, -1].includes(voteVal)) {
      return NextResponse.json({ success: false, error: "Invalid vote" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // 1. Check Ownership (Prevent Self-Voting)
    const { data: request } = await supabase
      .from("room_requests")
      .select("guest_id")
      .eq("id", requestId)
      .single();

    if (request && request.guest_id === guestId) {
      return NextResponse.json(
        { success: false, error: "You cannot vote on your own request." },
        { status: 403 }
      );
    }

    if (voteVal === 0) {
      // DELETE VOTE
      const { error } = await supabase
        .from("room_request_votes")
        .delete()
        .match({ room_request_id: requestId, guest_id: guestId });

      if (error) throw error;
    } else {
      // UPSERT VOTE
      const { error } = await supabase
        .from("room_request_votes")
        .upsert(
          { 
            room_request_id: requestId, 
            guest_id: guestId, // Spotify ID
            vote_val: voteVal 
          },
          { onConflict: "room_request_id, guest_id" }
        );

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Vote Error:", err);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}