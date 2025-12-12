"use client";

import { useEffect, useState, useCallback } from "react";

type QueueItem = {
  id: number;
  song_title: string;
  artist_name: string;
  score: number;
  guest_id: string; 
  popularity: number; // Added popularity type
};

export default function HostQueue({ roomCode }: { roomCode: string }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/host/rooms/${roomCode}/requests`);
      if (res.ok) {
        const json = await res.json();
        setQueue(json.queue || []);
      }
    } catch (err) {
      console.error("Failed to fetch queue", err);
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  // Initial Load + Polling every 10 seconds
  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 10000); 
    return () => clearInterval(interval);
  }, [fetchQueue]);

  async function handleMarkPlayed(requestId: number) {
    if (!confirm("Mark this song as played?")) return;
    setProcessingId(requestId);

    try {
      // NOTE: Ensure you have an endpoint at /api/host/requests/delete 
      // or implement the server logic to delete.
      const res = await fetch("/api/host/requests/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, roomCode }), 
      });

      if (res.ok) {
        setQueue((prev) => prev.filter((item) => item.id !== requestId));
      } else {
        alert("Failed to remove song.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) return <div className="text-slate-400 text-sm text-center py-10">Loading Queue...</div>;

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
        <p>The queue is empty.</p>
        <span className="text-xs mt-2">Requests will appear here instantly.</span>
        <button onClick={fetchQueue} className="mt-4 text-xs text-blue-500 hover:underline">Refresh Now</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Up Next</span>
        <button onClick={fetchQueue} className="text-xs text-blue-600 hover:underline">
          Refresh
        </button>
      </div>

      <ul className="space-y-3">
        {queue.map((req, index) => {
          // Popularity Logic
          const pop = req.popularity || 0;
          let popColor = "bg-blue-500";
          let popLabel = "Standard";
          if (pop > 70) {
             popColor = "bg-green-500";
             popLabel = "Mainstream";
          } else if (pop < 30) {
             popColor = "bg-purple-500";
             popLabel = "Deep Cut";
          }

          return (
            <li 
              key={req.id} 
              className={`
                flex items-center justify-between p-4 rounded-lg border shadow-sm transition-all
                ${index === 0 ? "bg-green-50/50 border-green-200" : "bg-white border-slate-200"}
              `}
            >
              <div className="flex items-center gap-4 overflow-hidden flex-1">
                {/* Score Badge */}
                <div className={`
                  flex flex-col items-center justify-center w-10 h-10 rounded-full font-bold text-sm shrink-0
                  ${index === 0 ? "bg-green-200 text-green-800" : "bg-slate-100 text-slate-600"}
                `}>
                  {req.score > 0 ? `+${req.score}` : req.score}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 truncate">{req.song_title}</div>
                  <div className="text-sm text-slate-500 truncate">{req.artist_name}</div>
                  
                  {/* Popularity Bar for Host */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${popColor}`} style={{ width: `${pop}%` }} />
                    </div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wide">
                      {popLabel} ({pop}%)
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleMarkPlayed(req.id)}
                disabled={processingId === req.id}
                className="ml-4 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 whitespace-nowrap transition-colors"
              >
                {processingId === req.id ? "..." : "Mark Played"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}