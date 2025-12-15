import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

const getSignature = (artist: string, title: string) => {
  if (!artist || !title) return "";
  const cleanTitle = title.split(' -')[0].split(' (')[0].split(' [')[0].trim().toLowerCase();
  const cleanArtist = artist.trim().toLowerCase();
  return `${cleanArtist}:::${cleanTitle}`;
}

export default async function VibeReportPage({ params }: PageProps) {
  const { roomCode } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/host/login");

  // 1. Get Room
  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, code")
    .eq("code", roomCode)
    .eq("owner_id", user.id)
    .single();

  if (!room) return notFound();

  // 2. Fetch Requests with Votes
  const { data: requests } = await supabase
    .from("room_requests")
    .select(`
      song_title, 
      artist_name, 
      release_year, 
      room_request_votes(vote_val)
    `)
    .eq("room_id", room.id);

  // 3. Fetch Harvested History
  const { data: history } = await supabase
    .from("guest_top_tracks")
    .select("track_name, artist_name, release_year")
    .eq("room_id", room.id);

  // 4. Fetch Curated Classics
  const { data: classics } = await supabase
    .from("curated_classics")
    .select("clean_signature, category, song_title");

  // --- 5. DATA CRUNCHING ---

  // A. Determine Winning Decade
  const decadeCounts: Record<string, number> = {};
  const getDecade = (year: number) => Math.floor(year / 10) * 10;

  // Weight: Requests (3 pts) + History (1 pt)
  requests?.forEach(r => {
    if (r.release_year) {
      const d = getDecade(r.release_year);
      decadeCounts[d] = (decadeCounts[d] || 0) + 3;
    }
  });
  history?.forEach(h => {
    if (h.release_year) {
      const d = getDecade(h.release_year);
      decadeCounts[d] = (decadeCounts[d] || 0) + 1;
    }
  });

  let winningDecade = 2020; // Default
  let maxScore = -1;
  Object.entries(decadeCounts).forEach(([decade, score]) => {
    if (score > maxScore) {
      maxScore = score;
      winningDecade = parseInt(decade);
    }
  });

  // B. Build "The Hit List" for the Winning Decade
  
  // Filter Requests from this decade
  const decadeRequests = requests
    ?.filter(r => r.release_year && getDecade(r.release_year) === winningDecade)
    .map(r => ({
      title: r.song_title,
      artist: r.artist_name,
      votes: r.room_request_votes.reduce((acc, v) => acc + v.vote_val, 0),
      source: "Request"
    }))
    .sort((a, b) => b.votes - a.votes) || [];

  // Filter History from this decade
  const historyFreq: Record<string, number> = {};
  history
    ?.filter(h => h.release_year && getDecade(h.release_year) === winningDecade)
    .forEach(h => {
      const key = `${h.artist_name}:::${h.track_name}`;
      historyFreq[key] = (historyFreq[key] || 0) + 1;
    });

  const decadeHistory = Object.entries(historyFreq)
    .map(([key, count]) => {
      const [artist, title] = key.split(":::");
      return { title, artist, count, source: "History" };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10

  // Check against Verified Classics (PDF Data)
  // We look for classics that match the winning decade category (e.g. "80s")
  const classicsSet = new Set(
    classics
      ?.filter(c => c.category.includes(winningDecade.toString().substring(2))) // "80s" matches "1980"
      .map(c => c.clean_signature)
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">Vibe Report</h1>
            <p className="text-slate-400 mt-1 font-mono text-sm">Targeting Analysis for {room.name}</p>
          </div>
          <Link 
            href={`/dashboard/${room.code}`}
            className="text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors uppercase tracking-widest"
          >
            Close Report
          </Link>
        </div>

        <div className="p-8">
          
          {/* 1. The Strategy Headline */}
          <div className="flex items-start gap-6 mb-12 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="bg-[#1DB954] text-white p-4 rounded-2xl text-center min-w-[120px] shadow-lg shadow-green-900/10">
              <span className="block text-4xl font-black">{winningDecade}s</span>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Winning Era</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">The {winningDecade}s Strategy</h3>
              <p className="text-slate-600 leading-relaxed">
                This is your strongest era. 
                Guests have requested <strong>{decadeRequests.length} songs</strong> from this decade, 
                and we found <strong>{decadeHistory.length} potential hits</strong> in their listening history.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            
            {/* 2. Top Requests (High Demand) */}
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                 <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                  🔥 {winningDecade}s Requests
                </h2>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                   High Priority
                </span>
              </div>
             
              {decadeRequests.length > 0 ? (
                <div className="space-y-2">
                  {decadeRequests.slice(0, 10).map((song, i) => {
                    // Check if this request is also a verified classic
                    const sig = getSignature(song.artist, song.title);
                    const isCertified = classicsSet.has(sig);

                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-green-500 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 truncate">{song.title}</span>
                            {isCertified && (
                              <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide" title="On Verified Top Lists">
                                Certified
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{song.artist}</div>
                        </div>
                        <div className="flex flex-col items-center px-2">
                          <span className="text-lg font-black text-green-600 leading-none">{song.votes > 0 ? `+${song.votes}` : song.votes}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Votes</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No specific requests from this decade yet.</p>
              )}
            </div>

            {/* 3. Hidden Gems (Crowd Potential) */}
            <div>
               <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                 <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                  💎 {winningDecade}s Hidden Gems
                </h2>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                   Context: {decadeHistory.length} Tracks found
                </span>
              </div>

              {decadeHistory.length > 0 ? (
                <div className="space-y-2">
                  {decadeHistory.map((song, i) => {
                     // Check if this history item is a verified classic
                     const sig = getSignature(song.artist, song.title);
                     const isCertified = classicsSet.has(sig);
                     
                     return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 opacity-90 hover:opacity-100 transition-opacity">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800 truncate">{song.title}</span>
                            {isCertified && (
                              <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                Certified
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{song.artist}</div>
                        </div>
                        <div className="flex flex-col items-center px-2">
                          <span className="text-sm font-bold text-slate-600 leading-none">{song.count}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Listeners</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No listening history matches for this decade yet.</p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}