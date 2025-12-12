import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  GUEST_ID_COOKIE_NAME,
  GUEST_ROOM_ID_COOKIE_NAME,
} from "@/lib/guestSession";
import DeleteRequestButton from "./DeleteRequestButton";
import VoteButtons from "./VoteButtons";

// Icons
const UserIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const MusicIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
);

export default async function RequestList() {
  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_ID_COOKIE_NAME)?.value || null;
  const roomId = cookieStore.get(GUEST_ROOM_ID_COOKIE_NAME)?.value || null;

  if (!roomId) return null;

  const supabase = await createSupabaseServerClient();

  // 1. Fetch Requests
  const { data: requests, error: reqError } = await supabase
    .from("room_requests")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (reqError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm">
        Failed to load requests.
      </div>
    );
  }

  const requestRows = requests ?? [];
  const requestIds = requestRows.map((r) => r.id);

  // 2. Fetch Votes
  let votes: any[] = [];
  if (requestIds.length > 0) {
    const { data: voteData } = await supabase
      .from("room_request_votes")
      .select("room_request_id, vote_val, guest_id")
      .in("room_request_id", requestIds);
    votes = voteData || [];
  }

  // Sort by Score (High to Low) instead of time
  const sortedRequests = requestRows.map((req) => {
    const reqVotes = votes.filter((v) => v.room_request_id === req.id);
    const score = reqVotes.reduce((acc, v) => acc + v.vote_val, 0);
    return { ...req, score, reqVotes };
  }).sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <MusicIcon className="w-4 h-4 text-green-500" /> Up Next
        </h3>
        <span className="bg-slate-800/50 px-2 py-1 rounded text-slate-400 text-[10px] font-mono uppercase tracking-widest border border-slate-700">
          {sortedRequests.length} SONGS
        </span>
      </div>

      {sortedRequests.length === 0 && (
        <div className="text-center py-12 px-4 bg-slate-900/40 backdrop-blur-sm rounded-3xl border border-dashed border-slate-800">
          <p className="text-slate-500 text-sm">The playlist is empty.</p>
          <p className="text-slate-600 text-xs mt-1">Be the first to request a banger!</p>
        </div>
      )}

      <ul className="space-y-3">
        {sortedRequests.map((req) => {
          const { score, reqVotes } = req;
          
          // Did I vote?
          const myVote = reqVotes.find((v: any) => v.guest_id === guestId)?.vote_val || 0;
          const isOwner = req.guest_id === guestId;
          
          // Popularity Logic
          const popularity = req.popularity || 0;
          let popColor = "bg-blue-500"; 
          let popLabel = "Standard";
          if (popularity > 70) {
             popColor = "bg-green-500"; 
             popLabel = "Mainstream";
          } else if (popularity < 30) {
             popColor = "bg-purple-500";
             popLabel = "Deep Cut";
          }

          return (
            <li
              key={req.id}
              className="group relative bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl flex gap-4 transition-all hover:bg-slate-900/80 hover:border-slate-700"
            >
              {/* VOTE BUTTONS (Left Side - The Arrows) */}
              <div className="flex flex-col items-center justify-center gap-1 min-w-[2.5rem] border-r border-slate-800/50 pr-4">
                 <VoteButtons 
                    requestId={req.id}
                    initialScore={score}
                    initialUserVote={myVote}
                    isOwner={isOwner}
                  />
              </div>

              {/* SONG INFO (Right Side) */}
              <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                
                {/* Text Content */}
                <div>
                    <h4 className="font-bold text-white text-base leading-tight line-clamp-2">
                    {req.song_title || "Unknown Title"}
                    </h4>
                    <p className="text-slate-400 text-sm truncate mt-1 font-medium">
                    {req.artist_name || "Unknown Artist"}
                    </p>
                </div>

                {/* META ROW: User Label + Popularity Meter */}
                <div className="flex items-end justify-between pt-2 mt-1">
                    
                    {/* User Indicator / Delete Action */}
                    <div className="flex items-center gap-2">
                        {isOwner ? (
                            <div className="flex flex-col items-start gap-2">
                                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider flex items-center gap-1 bg-green-900/20 px-2 py-0.5 rounded-full border border-green-900/30">
                                    <UserIcon className="w-3 h-3" /> You
                                </span>
                                <DeleteRequestButton requestId={req.id} />
                            </div>
                        ) : (
                             <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider pl-1">
                                Guest
                            </span>
                        )}
                    </div>

                    {/* POPULARITY METER */}
                    <div className="flex flex-col items-end gap-1 select-none">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                            {popLabel}
                        </span>
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                            <div 
                                className={`h-full rounded-full ${popColor} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} 
                                style={{ width: `${popularity}%` }} 
                            />
                        </div>
                    </div>
                </div>

              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}