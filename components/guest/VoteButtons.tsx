"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Chevron Icons (Inline SVG)
const ChevronUp = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m18 15-6-6-6 6"/></svg>
);
const ChevronDown = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);

export default function VoteButtons({
  requestId,
  initialScore,
  initialUserVote,
  isOwner,
}: {
  requestId: number;
  initialScore: number;
  initialUserVote: number; // 1, 0, or -1
  isOwner: boolean;
}) {
  // Local state for optimistic updates
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  async function handleVote(targetVote: number) {
    if (loading || isOwner) return; // Prevent voting if owner
    
    // Toggle logic: If clicking the active vote, remove it (set to 0)
    const newVote = userVote === targetVote ? 0 : targetVote;
    
    // Calculate the score change locally
    const diff = newVote - userVote;
    const newScore = score + diff;

    // Optimistic Update
    const prevVote = userVote;
    const prevScore = score;
    
    setUserVote(newVote);
    setScore(newScore);
    setLoading(true);

    try {
      const res = await fetch("/api/guest/requests/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, voteVal: newVote }),
      });

      if (!res.ok) {
        throw new Error("Vote failed");
      }
      
      // Refresh the page data in background to sync with server
      router.refresh();
      
    } catch (err) {
      // Revert on error
      setUserVote(prevVote);
      setScore(prevScore);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex flex-col items-center gap-1 ${isOwner ? "opacity-50" : ""}`}>
      {/* UPVOTE */}
      <button
        onClick={(e) => {
          e.stopPropagation(); 
          handleVote(1);
        }}
        disabled={loading || isOwner}
        className={`p-1.5 rounded-full transition-all active:scale-90 ${
          userVote === 1 
            ? "text-green-400 bg-green-400/10" 
            : isOwner ? "text-slate-700 cursor-not-allowed" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
        }`}
        aria-label="Upvote"
        title={isOwner ? "You cannot vote on your own request" : "Upvote"}
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      {/* SCORE */}
      <span className={`text-sm font-bold font-mono ${
        userVote === 1 ? "text-green-400" : 
        userVote === -1 ? "text-red-400" : 
        "text-slate-400"
      }`}>
        {score > 0 ? `+${score}` : score}
      </span>

      {/* DOWNVOTE */}
      <button
        onClick={(e) => {
          e.stopPropagation(); 
          handleVote(-1);
        }}
        disabled={loading || isOwner}
        className={`p-1.5 rounded-full transition-all active:scale-90 ${
          userVote === -1 
            ? "text-red-400 bg-red-400/10" 
            : isOwner ? "text-slate-700 cursor-not-allowed" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
        }`}
        aria-label="Downvote"
        title={isOwner ? "You cannot vote on your own request" : "Downvote"}
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}