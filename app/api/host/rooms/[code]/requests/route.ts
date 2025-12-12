import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const roomCode = code;
  
  const supabase = await createSupabaseServerClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get Room ID
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", roomCode)
      .eq("owner_id", user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, error: "Room not found or unauthorized" }, { status: 404 });
    }

    // 2. Fetch Requests and Vote Counts
    // FIX: Using correct table name 'room_request_votes'
    const { data: requests, error: requestsError } = await supabase
      .from("room_requests")
      .select(`
        id, 
        song_title, 
        artist_name, 
        track_id,
        album_art, 
        popularity, 
        created_at,
        release_year,
        room_request_votes(id, guest_id, vote_val) 
      `)
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });

    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      return NextResponse.json({ success: false, error: "Failed to fetch requests" }, { status: 500 });
    }

    // 3. Process and Rank Requests
    const processedRequests = requests.map(req => {
      // FIX: Accessing correct property 'room_request_votes'
      const votes = req.room_request_votes || [];
      const score = votes.reduce((acc: number, v: any) => acc + (v.vote_val || 0), 0);
      
      return {
        id: req.id,
        title: req.song_title,
        artist: req.artist_name,
        trackId: req.track_id,
        albumArt: req.album_art,
        popularity: req.popularity,
        releaseYear: req.release_year,
        voteCount: score, 
        createdAt: req.created_at,
      };
    }).sort((a, b) => {
        // Sort by Vote Count (desc), then Popularity (desc)
        if (a.voteCount !== b.voteCount) {
          return b.voteCount - a.voteCount;
        }
        return b.popularity - a.popularity;
    });

    return NextResponse.json({ success: true, requests: processedRequests });
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}