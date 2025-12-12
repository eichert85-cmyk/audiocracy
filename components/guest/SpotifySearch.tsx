"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// Small Spotify Logo for Attribution
const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

export default function SpotifySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null);

  const router = useRouter();

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setDuplicateId(null);

    try {
      const res = await fetch(`/api/guest/spotify/search?q=${encodeURIComponent(searchTerm)}`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.tracks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    performSearch(query);
  }

  async function handleAdd(track: any) {
    if (addingId) return;
    setAddingId(track.id);
    setDuplicateId(null);

    try {
      const res = await fetch("/api/guest/requests/create", {
        method: "POST",
        body: JSON.stringify({
          trackId: track.id,
          trackName: track.name,
          artistName: track.artist,
          albumArt: track.albumArt || "",
          popularity: track.popularity || 0, 
          releaseYear: track.releaseYear || null, // <--- Added Year
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error === "duplicate_request") {
          setDuplicateId(track.id);
          setDuplicateMessage(json.isOwner ? "You added this!" : "Already listed!");
        } else {
          alert(`Error: ${json.error}`);
        }
        return;
      }

      setQuery("");
      setResults([]);
      router.refresh();

    } catch (err) {
      alert("Network error.");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="mb-8 p-4 bg-slate-900/40 rounded-2xl border border-slate-800 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          Search
        </h3>
        {/* COMPLIANCE: Spotify Logo for Attribution */}
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span>Powered by</span>
            <SpotifyIcon className="w-4 h-4 text-[#1DB954]" />
        </div>
      </div>

      <form onSubmit={handleManualSubmit} className="mb-4">
        <input
          type="text"
          placeholder="Song or Artist..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#1DB954] transition-colors"
        />
      </form>

      {loading && <p className="text-slate-500 text-sm text-center">Searching Spotify...</p>}

      {!loading && results.length > 0 && (
        <ul className="divide-y divide-slate-800">
          {results.map((track) => {
            const isAdding = addingId === track.id;
            const isDuplicate = duplicateId === track.id;

            return (
              <li key={track.id} className="py-3 flex items-center gap-3">
                {/* COMPLIANCE: Album art displayed without modification */}
                {track.albumArt && (
                  <img src={track.albumArt} alt="" className="w-10 h-10 rounded-md object-cover opacity-80" />
                )}
                
                <div className="flex-1 min-w-0">
                  {/* COMPLIANCE: Deep Linking to Spotify Content */}
                  <a 
                    href={`https://open.spotify.com/track/${track.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group/link block"
                    aria-label={`Open ${track.name} in Spotify`}
                  >
                    <div className="text-white font-medium text-sm truncate group-hover/link:underline decoration-green-500 underline-offset-2">
                      {track.name}
                    </div>
                  </a>
                  <div className="text-slate-500 text-xs truncate">{track.artist}</div>
                </div>

                {!isDuplicate ? (
                  <button
                    onClick={() => handleAdd(track)}
                    disabled={!!addingId}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isAdding 
                        ? "bg-slate-700 text-slate-400" 
                        : "bg-[#1DB954] text-black hover:bg-[#1ed760] active:scale-95"
                    }`}
                  >
                    {isAdding ? "..." : "Add"}
                  </button>
                ) : (
                  <span className="text-[10px] text-red-400 font-bold bg-red-900/20 px-2 py-1 rounded border border-red-900/50">
                    {duplicateMessage}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}