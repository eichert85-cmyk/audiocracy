"use client";

import { useEffect, useState } from "react";

type ArtistInsight = {
  name: string;
  count: number;
  image: string | null;
  genre: string | null;
};

type TrackInsight = {
  name: string;
  artist: string;
  count: number;
  image: string | null;
};

type VibeData = {
  averages: {
    energy: number;
    valence: number;
    danceability: number;
    tempo: number;
  } | null;
  points: Array<{ x: number, y: number }>;
};

type TrendData = {
  score: number;
  matches: number;
  total_unique: number;
};

type YearsData = Record<string, number>;

export default function RoomInsights({ roomCode }: { roomCode: string }) {
  const [artists, setArtists] = useState<ArtistInsight[]>([]);
  const [tracks, setTracks] = useState<TrackInsight[]>([]);
  const [years, setYears] = useState<YearsData>({});
  const [vibe, setVibe] = useState<VibeData | null>(null);
  const [trend, setTrend] = useState<TrendData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"artists" | "tracks" | "eras" | "vibe" | "trend">("artists");

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch(`/api/host/rooms/${roomCode}/insights`);
        if (res.ok) {
          const json = await res.json();
          setArtists(json.topArtists || []);
          setTracks(json.topTracks || []);
          setYears(json.years || {}); 
          setVibe(json.vibe || null);
          setTrend(json.trend || null); // Direct assignment, no dirty fallbacks
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [roomCode]);

  if (loading) return <div className="text-xs text-slate-400 p-4">Loading insights...</div>;
  
  const maxYearCount = Math.max(...Object.values(years), 1);
  const sortedYears = Object.entries(years).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">Crowd Intelligence</h3>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-100/80 rounded-lg p-1 mb-5 overflow-x-auto scrollbar-hide">
        {(["artists", "tracks", "eras", "vibe", "trend"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all capitalize whitespace-nowrap ${
              activeTab === tab ? "bg-white shadow-sm text-black" : "text-slate-500 hover:text-black"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div className="min-h-[220px]">
        {/* ARTISTS TAB */}
        {activeTab === "artists" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {artists.length === 0 ? (
               <p className="text-xs text-slate-400 text-center py-8">No artist data yet. Wait for guests to login!</p>
            ) : artists.map((artist, idx) => (
              <div key={artist.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-300 w-4">{idx + 1}</span>
                  {artist.image ? (
                    <img src={artist.image} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                  ) : (
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-[8px] text-slate-400">?</div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">{artist.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-medium">{artist.genre || "Artist"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">{artist.count}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TRACKS TAB */}
        {activeTab === "tracks" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
             {tracks.length === 0 ? (
               <p className="text-xs text-slate-400 text-center py-8">No overlapping tracks found yet.</p>
            ) : tracks.map((track, idx) => (
              <div key={`${track.name}-${track.artist}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-300 w-4">{idx + 1}</span>
                  {track.image ? (
                    <img src={track.image} alt="" className="w-8 h-8 rounded-md object-cover border border-slate-100" />
                  ) : (
                    <div className="w-8 h-8 bg-slate-100 rounded-md"></div>
                  )}
                  <div className="flex flex-col max-w-[140px]">
                    <span className="text-sm font-bold text-slate-800 truncate">{track.name}</span>
                    <span className="text-[10px] text-slate-500 truncate">{track.artist}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  <span className="text-xs font-bold text-slate-700">{track.count}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERAS TAB */}
        {activeTab === "eras" && (
            <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 pb-2 border-b border-slate-100 mb-2">
                <span>RELEASE YEAR</span>
                <span>POPULARITY</span>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {sortedYears.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">No release year data available.</p>
                  ) : (
                      sortedYears.map(([year, count]) => {
                        const isHighImpact = count >= maxYearCount * 0.8; 
                        return (
                          <div key={year} className="flex items-center gap-3 group">
                              <span className={`text-xs w-10 font-mono ${isHighImpact ? 'font-bold text-blue-600' : 'text-slate-500'}`}>
                                {year}
                              </span>
                              <div className="flex-1 h-2.5 bg-slate-50 rounded-full overflow-hidden">
                                  <div 
                                      className={`h-full rounded-full transition-all ${isHighImpact ? 'bg-blue-500' : 'bg-slate-300'}`}
                                      style={{ width: `${(count / maxYearCount) * 100}%` }}
                                  />
                              </div>
                              <span className={`text-xs w-4 text-right ${isHighImpact ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                                {count}
                              </span>
                          </div>
                        );
                      })
                  )}
              </div>
            </div>
        )}

        {/* VIBE TAB */}
        {activeTab === "vibe" && (
            <div className="flex flex-col items-center justify-center pt-2 animate-in fade-in zoom-in-95 duration-300">
                {!vibe?.averages ? (
                   <p className="text-xs text-slate-400 text-center py-8">Not enough data to calculate vibe.</p>
                ) : (
                  <>
                    <div className="relative w-48 h-48 bg-slate-50 border border-slate-200 rounded-xl shadow-inner mb-6">
                        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 tracking-wider">HIGH ENERGY</span>
                        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 tracking-wider">CHILL</span>
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 -rotate-90 tracking-wider">SAD</span>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 rotate-90 tracking-wider">HAPPY</span>
                        
                        <div className="absolute top-4 bottom-4 left-1/2 w-px bg-slate-200/50 border-r border-dashed border-slate-300"></div>
                        <div className="absolute left-4 right-4 top-1/2 h-px bg-slate-200/50 border-b border-dashed border-slate-300"></div>

                        <div 
                            className="absolute w-5 h-5 bg-[#1DB954] rounded-full border-2 border-white shadow-lg transition-all duration-1000 ease-out"
                            style={{
                                left: `${vibe.averages.valence * 100}%`,
                                bottom: `${vibe.averages.energy * 100}%`,
                                transform: 'translate(-50%, 50%)'
                            }}
                        >
                          <div className="absolute inset-0 rounded-full bg-[#1DB954] animate-ping opacity-20"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tempo</div>
                            <div className="text-lg font-black text-slate-700">{Math.round(vibe.averages.tempo)} <span className="text-[10px] font-normal text-slate-400">BPM</span></div>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Danceability</div>
                            <div className="text-lg font-black text-slate-700">{Math.round(vibe.averages.danceability * 100)}<span className="text-sm">%</span></div>
                        </div>
                    </div>
                  </>
                )}
            </div>
        )}

        {/* TREND TAB */}
        {activeTab === "trend" && (
          <div className="flex flex-col items-center justify-center py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             {!trend ? (
                <p className="text-xs text-slate-400 text-center">Trend data unavailable.</p>
             ) : (
                <>
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        className="text-slate-100"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * trend.score) / 100}
                        className={`text-blue-500 transition-all duration-1000 ease-out`}
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    <div className="absolute flex flex-col items-center">
                      <span className="text-4xl font-black text-slate-800">{trend.score}%</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">On Trend</span>
                    </div>
                  </div>

                  <div className="mt-6 text-center max-w-[200px]">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      <strong className="text-slate-800">{trend.matches}</strong> of <strong className="text-slate-800">{trend.total_unique}</strong> unique tracks analyzed are currently in the <span className="font-bold text-[#1DB954]">US Top 50</span>.
                    </p>
                  </div>
                </>
             )}
          </div>
        )}
      </div>
    </div>
  );
}