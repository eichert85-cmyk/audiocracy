import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
// Removed: import { getUSTop50Ids } from "@/lib/spotifyHost"; 

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

    // 2. Fetch Harvested Guest Top Tracks
    const { data: history, error: historyError } = await supabase
      .from("guest_top_tracks")
      .select("valence, energy, release_year, track_id")
      .eq("room_id", room.id);

    if (historyError) {
      console.error("Error fetching history:", historyError);
      return NextResponse.json({ success: false, error: "Failed to fetch history" }, { status: 500 });
    }

    // FIX: Renamed the count variable to match the desired output property name
    const totalHistoryTracks = history?.length || 0;

    // --- Insight Calculations ---
    
    // A. Average Energy & Valence (Mood)
    let totalEnergy = 0;
    let totalValence = 0;
    
    history?.forEach(track => {
      totalEnergy += track.energy || 0;
      totalValence += track.valence || 0;
    });

    // Use totalHistoryTracks in calculation
    const averageEnergy = totalHistoryTracks > 0 ? totalEnergy / totalHistoryTracks : 0;
    const averageValence = totalHistoryTracks > 0 ? totalValence / totalHistoryTracks : 0;

    // B. Decade Counts (for Vibe Report)
    const decadeCounts: Record<string, number> = {};
    history?.forEach(track => {
      if (track.release_year) {
        const decade = Math.floor(track.release_year / 10) * 10;
        const key = `${decade}s`;
        decadeCounts[key] = (decadeCounts[key] || 0) + 1;
      }
    });

    // C. Popular Track Frequency
    const trackFrequency: Record<string, number> = {};
    history?.forEach(track => {
      const key = track.track_id;
      trackFrequency[key] = (trackFrequency[key] || 0) + 1;
    });

    const popularTracks = Object.entries(trackFrequency)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5) // Top 5
      .map(([track_id, count]) => ({ track_id, count }));
      
    // D. Fetch Request Counts
    const { count: totalRequests, error: requestCountError } = await supabase
      .from("room_requests")
      .select("id", { count: 'exact', head: true })
      .eq("room_id", room.id);

    if (requestCountError) {
        console.error("Error fetching request count:", requestCountError);
    }
    
    // E. Total Guests
    const { count: totalGuests, error: guestCountError } = await supabase
      .from("guest_sessions")
      .select("id", { count: 'exact', head: true })
      .eq("room_id", room.id);

    if (guestCountError) {
        console.error("Error fetching guest count:", guestCountError);
    }


    return NextResponse.json({
      success: true,
      insights: {
        totalGuests: totalGuests || 0,
        totalRequests: totalRequests || 0,
        totalHistoryTracks, // Shorthand property now valid
        averageEnergy: parseFloat(averageEnergy.toFixed(2)),
        averageValence: parseFloat(averageValence.toFixed(2)),
        decadeDistribution: decadeCounts,
      }
    });

  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json({ success: false, error: "Server Error" }, { status: 500 });
  }
}