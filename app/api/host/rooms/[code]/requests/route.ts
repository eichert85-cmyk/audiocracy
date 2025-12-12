import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { code } = await params;
    const supabase = await createSupabaseServerClient();

    // 1. Verify Host Identity
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify Room Ownership & Get ID
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", code)
      .eq("owner_id", user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found or unauthorized" }, { status: 404 });
    }

    // 3. Fetch Requests for this Room
    const { data: requests, error: reqError } = await supabase
      .from("room_requests")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: false });

    if (reqError) throw reqError;

    // 4. Fetch All Votes for these requests
    const requestIds = requests.map((r) => r.id);
    let votes: any[] = [];
    
    if (requestIds.length > 0) {
      const { data: voteData } = await supabase
        .from("room_request_votes")
        .select("room_request_id, vote_val")
        .in("room_request_id", requestIds);
      votes = voteData || [];
    }

    // 5. Aggregate Scores & Sort
    const queue = requests.map((req) => {
      const reqVotes = votes.filter((v: any) => v.room_request_id === req.id);
      const upvotes = reqVotes.filter((v: any) => v.vote_val === 1).length;
      const downvotes = reqVotes.filter((v: any) => v.vote_val === -1).length;
      const score = upvotes - downvotes;

      return {
        ...req,
        score,
        upvotes,
        downvotes,
        popularity: req.popularity ?? 0, // Ensure popularity is passed
      };
    });

    // Sort by Score (Highest First), then by Time (Oldest First)
    queue.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score; // Higher score first
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // FIFO for ties
    });

    return NextResponse.json({ success: true, queue }, { status: 200 });

  } catch (err) {
    console.error("Host Queue API Error:", err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}