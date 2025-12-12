import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
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
      .eq("code", code)
      .eq("owner_id", user.id)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
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

    const totalHistoryTracks = history?.length || 0;

    // --- Insight Calculations ---
    
    // A. Average Energy & Valence (Mood)
    let totalEnergy = 0;
    let totalValence = 0;
    
    history?.forEach(track => {
      totalEnergy += track.energy || 0;
      totalValence += track.valence || 0;
    });

    const averageEnergy = totalHistoryTracks > 0 ? totalEnergy / totalHistoryTracks : 0;
    const averageValence = totalHistoryTracks > 0 ? totalValence / totalHistoryTracks : 0;

    // B. Decade Counts
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

    // D. Fetch Request Counts
    const { count: totalRequests } = await supabase
      .from("room_requests")
      .select("id", { count: 'exact', head: true })
      .eq("room_id", room.id);
    
    // E. Total Guests (FIX: Changed from guest_sessions to guests)
    const { count: totalGuests } = await supabase
      .from("guests")
      .select("id", { count: 'exact', head: true })
      .eq("wedding_id", room.id);

    return NextResponse.json({
      success: true,
      insights: {
        totalGuests: totalGuests || 0,
        totalRequests: totalRequests || 0,
        totalHistoryTracks,
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