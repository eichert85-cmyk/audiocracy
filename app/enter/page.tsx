"use client";

import { useState } from "react";

// Inline SVGs to avoid dependencies
const MusicIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const ArrowRightIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export default function GuestLandingPage() {
  const [partyCode, setPartyCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partyCode) return;
    
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/guest/enter-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: partyCode.trim().toUpperCase() }),
      });

      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Invalid room code");
      }
      
      window.location.reload(); 
      
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-sm z-10 flex flex-col gap-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl mb-4">
            <MusicIcon className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Audiocracy</h1>
          <p className="text-slate-400 font-medium">Join the celebration</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1">
              <label htmlFor="code" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Room Code
              </label>
              <input
                id="code"
                type="text"
                value={partyCode}
                onChange={(e) => {
                    setPartyCode(e.target.value.toUpperCase());
                    setError("");
                }}
                placeholder="KH45DQ"
                maxLength={6}
                className="w-full bg-slate-950 border-2 border-slate-800 focus:border-green-500 text-white text-center text-3xl font-mono tracking-[0.2em] font-bold rounded-2xl py-4 px-4 outline-none transition-all placeholder:text-slate-800 shadow-inner"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 p-3 rounded-xl border border-red-900/50 animate-in fade-in slide-in-from-top-1">
                <AlertIcon className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || partyCode.length < 3}
              className="w-full bg-green-500 hover:bg-green-400 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-slate-950 font-bold text-lg py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 mt-2"
            >
              {isLoading ? (
                <LoaderIcon className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Enter Room <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* FOOTER: Updated for Compliance */}
        <p className="text-center text-slate-600 text-xs px-4">
          We read your public profile, top tracks, and top artists to analyze musical trends for the DJ. Your data is deleted 30 days after the event.
        </p>
      </div>
    </div>
  );
}