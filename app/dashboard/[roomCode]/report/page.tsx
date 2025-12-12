import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

// Helper to generate a fuzzy match signature consistent with the SQL logic
// Logic: lowercase, trim, remove text after " -" or " ("
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

  // 2. Fetch Requests
  const { data: requests } = await supabase
    .from("room_requests")
    .select("song_title, artist_name, release_year, created_at")
    .eq("room_id", room.id);

  // 3. Fetch Harvested History
  const { data: history } = await supabase
    .from("guest_top_tracks")
    .select("track_name, artist_name, release_year, energy, valence")
    .eq("room_id", room.id);

  // 4. Fetch Curated Classics (Reference DB)
  // We fetch the signature and category to match against guest history
  const { data: classics } = await supabase
    .from("curated_classics")
    .select("clean_signature, category, song_title, artist_name");

  // Build a Map for fast lookup of classics
  const classicsMap = new Map();
  classics?.forEach(c => {
    if (!classicsMap.has(c.clean_signature)) {
      classicsMap.set(c.clean_signature, { 
        title: c.song_title, 
        artist: c.artist_name, 
        categories: new Set() 
      });
    }
    classicsMap.get(c.clean_signature).categories.add(c.category);
  });

  // --- ANALYSIS LOGIC ---

  // A. Decades Calculation
  const decadeCounts: Record<string, { requestCount: number; historyCount: number }> = {};
  const getDecade = (year: number) => Math.floor(year / 10) * 10;

  // Count Requests
  requests?.forEach((r) => {
    if (r.release_year) {
      const d = getDecade(r.release_year);
      if (!decadeCounts[d]) decadeCounts[d] = { requestCount: 0, historyCount: 0 };
      decadeCounts[d].requestCount++;
    }
  });

  // Count History
  let totalHistoryTracks = 0;
  history?.forEach((h) => {
    if (h.release_year) {
      const d = getDecade(h.release_year);
      if (!decadeCounts[d]) decadeCounts[d] = { requestCount: 0, historyCount: 0 };
      decadeCounts[d].historyCount++;
      totalHistoryTracks++;
    }
  });

  // Determine "Winning Decade"
  let winningDecade = 0;
  let maxScore = -1;
  Object.entries(decadeCounts).forEach(([decade, counts]) => {
    const score = (counts.requestCount * 2) + counts.historyCount;
    if (score > maxScore) {
      maxScore = score;
      winningDecade = parseInt(decade);
    }
  });

  // B. Find "Sure Things" (Overlap between Requests and History)
  const historySet = new Set(history?.map(h => `${h.track_name}:::${h.artist_name}`.toLowerCase()));
  const sureThings = requests?.filter(r => 
    historySet.has(`${r.song_title}:::${r.artist_name}`.toLowerCase())
  ).slice(0, 5) || [];

  // C. Find "Hidden Gems" (High history count, but NOT requested yet)
  const historyFrequency: Record<string, number> = {};
  history?.forEach(h => {
    const key = `${h.track_name}:::${h.artist_name}`; 
    historyFrequency[key] = (historyFrequency[key] || 0) + 1;
  });
  
  const requestedSet = new Set(requests?.map(r => `${r.song_title}:::${r.artist_name}`.toLowerCase()));
  
  const hiddenGems = Object.entries(historyFrequency)
    .filter(([key, count]) => count > 1 && !requestedSet.has(key.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => {
      const [title, artist] = key.split(":::");
      return { title, artist, count };
    });

  // D. Find "Verified Bangers"
  const verifiedBangers = Object.entries(historyFrequency)
    .map(([key, count]) => {
      const [rawTitle, rawArtist] = key.split(":::");
      const signature = getSignature(rawArtist, rawTitle); 
      const match = classicsMap.get(signature);

      return {
        title: rawTitle,
        artist: rawArtist,
        count,
        categories: match ? Array.from(match.categories as Set<string>) : []
      };
    })
    .filter(item => item.categories.length > 0 && item.count > 1) 
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
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

        <div className="p-8 space-y-12">
          
          {/* 1. The Strategy */}
          <section>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
              Winning Strategy
            </h2>
            <div className="flex items-start gap-6">
              {/* FIX: Reduced font size and padding to fit "2020s" */}
              <div className="bg-[#1DB954] text-white p-3 rounded-2xl text-center min-w-[110px] shadow-lg shadow-green-900/10 flex flex-col justify-center">
                <span className="block text-3xl font-black tracking-tight">{winningDecade}s</span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Decade</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Focus on the {winningDecade}s</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  This era has the highest engagement. 
                  {decadeCounts[winningDecade]?.requestCount > 0 ? (
                    <> You have <strong>{decadeCounts[winningDecade]?.requestCount} requests</strong> from this decade.</>
                  ) : (
                    <> While no requests yet, your guests listen to this era heavily.</>
                  )}
                  { " " }
                  Use this as your "Safe Zone" to reset the dance floor.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Verified Bangers */}
          <section>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
              🏆 Verified Bangers
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              These songs appear in your guests history <strong className="text-slate-800">AND</strong> your verified charts. These are statistically safe bets.
            </p>

            {verifiedBangers.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-3">
                {verifiedBangers.map((song, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100 hover:border-blue-300 transition-colors group">
                    <div className="min-w-0 flex-1 mr-4">
                      <div className="text-sm font-bold text-slate-900 truncate">{song.title}</div>
                      <div className="text-xs text-slate-500 truncate">{song.artist}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {song.categories.map(cat => (
                          <span key={cat} className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-white border border-slate-200 text-slate-500">
                            {cat.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-white border border-blue-100 w-12 h-12 rounded-lg shadow-sm">
                      <span className="text-lg font-black text-blue-600 leading-none">{song.count}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Fans</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                <p className="text-slate-400 text-sm">No direct overlap between guest history and your charts yet.</p>
                <p className="text-xs text-slate-400 mt-1">Wait for more guests to join!</p>
              </div>
            )}
          </section>

          {/* 3. Requests & Gems Grid */}
          <section className="grid md:grid-cols-2 gap-10">
            {/* Sure Things */}
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                💎 Requests x History
              </h2>
              <p className="text-[10px] text-slate-500 mb-3">Guests requested these AND listen to them.</p>
              
              {sureThings.length > 0 ? (
                <ul className="space-y-2">
                  {sureThings.map((song, i) => (
                    <li key={i} className="flex items-center gap-3 p-2 rounded-lg bg-green-50 border border-green-100">
                      <div className="w-6 h-6 flex items-center justify-center bg-green-200 text-green-700 rounded-full text-xs font-bold">✓</div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{song.song_title}</div>
                        <div className="text-xs text-slate-500 truncate">{song.artist_name}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg text-slate-400 text-xs italic text-center">
                  No direct overlaps yet.
                </div>
              )}
            </div>

            {/* Hidden Gems */}
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                🔍 Hidden Gems
              </h2>
              <p className="text-[10px] text-slate-500 mb-3">Popular in history, but NOT requested.</p>

              {hiddenGems.length > 0 ? (
                <ul className="space-y-2">
                  {hiddenGems.map((song, i) => (
                    <li key={i} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{song.title}</div>
                        <div className="text-xs text-slate-500 truncate">{song.artist}</div>
                      </div>
                      <div className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600">
                        {song.count} Fans
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg text-slate-400 text-xs italic text-center">
                  Not enough data for predictions.
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}