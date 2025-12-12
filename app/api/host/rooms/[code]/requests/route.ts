import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
// Removed import of getUSTop50Ids

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const roomCode = params.code;
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
        song_votes(id, guest_id)
      `)
      .eq("room_id", room.id)
      .order("created_at", { ascending: true }); // Default sort by submission time

    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      return NextResponse.json({ success: false, error: "Failed to fetch requests" }, { status: 500 });
    }

    // 3. Process and Rank Requests
    
    // REMOVED: No call to getUSTop50Ids or is_trending calculation
    const processedRequests = requests
      .map(req => ({
        id: req.id,
        title: req.song_title,
        artist: req.artist_name,
        trackId: req.track_id,
        albumArt: req.album_art,
        popularity: req.popularity,
        releaseYear: req.release_year,
        voteCount: req.song_votes.length,
        // isTrending field is now permanently removed from the response
        createdAt: req.created_at,
      }))
      // Sort: 1. By Vote Count (desc) 2. By Spotify Popularity (desc)
      .sort((a, b) => {
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