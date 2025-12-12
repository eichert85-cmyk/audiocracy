"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Define the Request structure, removing the isTrending field
interface Request {
  id: string;
  title: string;
  artist: string;
  trackId: string;
  albumArt: string;
  popularity: number;
  releaseYear: number | null;
  voteCount: number;
  createdAt: string;
}

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function HostQueue({ roomCode }: { roomCode: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      // NOTE: API call now returns requests without the 'isTrending' flag
      const res = await fetch(`/api/host/rooms/${roomCode}/requests`);
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests);
      } else {
        setError(data.error || "Failed to fetch queue.");
      }
    } catch (err) {
      setError("Network error while fetching queue.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Set up polling to refresh the queue every 15 seconds
    const intervalId = setInterval(fetchRequests, 15000);
    return () => clearInterval(intervalId);
  }, [roomCode]);

  const handleDelete = async (requestId: string) => {
    // Replaced alert/confirm with window.confirm (since alerts are disallowed)
    if (!window.confirm("Are you sure you want to remove this request from the queue?")) {
        return;
    }

    try {
      // Optimistic update: remove the song from the list instantly
      setRequests(currentRequests => currentRequests.filter(req => req.id !== requestId));

      const res = await fetch(`/api/host/requests/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      if (!res.ok) {
        // If the deletion fails, re-fetch to restore the request
        console.error("Failed to delete request on server. Restoring.");
        fetchRequests(); 
      }
    } catch (err) {
      console.error("Network error during delete:", err);
      fetchRequests(); // Fallback to fetching
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mx-auto mb-2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
        <p>Loading queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500 bg-red-50 rounded-lg">
        <p>Error: {error}</p>
        <button onClick={fetchRequests} className="mt-2 text-sm font-bold underline">
            Try Refreshing
        </button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 mx-auto mb-4"><path d="M2 16h.4l.7 1.8L5 22h14l2.2-4.2.7-1.8h.4"/><path d="M12 8v13"/><path d="M20 5H4a2 2 0 0 0-2 2v1h20V7a2 2 0 0 0-2-2Z"/><path d="M5 21l.7-1.8"/><path d="M19 21l-.7-1.8"/></svg>
        <h3 className="text-lg font-semibold text-slate-800">Queue is Empty</h3>
        <p className="text-sm">Requests will appear here after guests join the room.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center justify-between">
        Live Request Queue 
        <span className="text-sm font-medium text-slate-500">{requests.length} Songs</span>
      </h3>

      <div className="overflow-x-auto">
        <ul className="min-w-full divide-y divide-slate-100">
          {requests.map((req, index) => (
            <li 
              key={req.id} 
              className={`flex items-center gap-4 py-3 px-1 transition-colors ${
                index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
              }`}
            >
              {/* Rank */}
              <div className="flex items-center w-8 text-lg font-black text-slate-800">
                {index + 1}.
              </div>
              
              {/* Album Art */}
              <img 
                src={req.albumArt || `https://placehold.co/50x50/34D399/ffffff?text=${req.title.charAt(0)}`}
                alt={`${req.title} album art`}
                className="w-12 h-12 rounded-lg object-cover shadow-md"
              />

              {/* Song Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{req.title}</div>
                <div className="text-xs text-slate-500 truncate">{req.artist}</div>
                <div className="flex items-center gap-2 mt-1">
                  {/* Vote Count */}
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    {req.voteCount} Votes
                  </span>
                  {/* Release Year */}
                  {req.releaseYear && (
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {req.releaseYear}
                    </span>
                  )}
                  {/* TRENDING INDICATOR REMOVED */}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-slate-400">{formatTime(req.createdAt)}</span>
                <button
                  onClick={() => handleDelete(req.id)}
                  className="text-xs text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                  aria-label={`Delete ${req.title}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}