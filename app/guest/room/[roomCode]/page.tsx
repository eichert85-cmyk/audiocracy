import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import SpotifySearch from "@/components/guest/SpotifySearch";
import RequestList from "@/components/guest/RequestList";
import SpotifyConnectButton from "@/components/guest/SpotifyConnectButton";
import { getGuestSpotifyConnection } from "@/lib/spotifyGuest";
import LeaveRoomButton from "@/components/guest/LeaveRoomButton"; 

interface RoomPageProps {
  params: Promise<{ roomCode: string }>;
}

// Inline SVGs for the UI
const MusicIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
);

export default async function GuestRoomPage(props: RoomPageProps) {
  const { roomCode } = await props.params;

  const supabase = await createSupabaseServerClient();

  const { data: room, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", roomCode)
    .single();

  if (error || !room) {
    return notFound();
  }

  const spotifyConnection = await getGuestSpotifyConnection();

  // Shared Background Layout
  const Background = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-900/20 rounded-full blur-[100px]" />
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // STATE 1: NOT CONNECTED (The "Login Page" View)
  // ─────────────────────────────────────────────────────────────
  if (!spotifyConnection.connected) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative">
        <Background />
        
        <div className="w-full max-w-sm z-10 flex flex-col gap-6 text-center">
          <div className="space-y-2">
             <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl mb-4 mx-auto">
                <MusicIcon className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">{room.name}</h1>
            <div className="inline-block bg-slate-900/80 backdrop-blur border border-slate-800 rounded-full px-4 py-1 text-sm font-mono text-slate-400">
              Code: <span className="text-white font-bold tracking-widest">{room.code}</span>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-3">Join the Party</h2>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              Connect your Spotify account to request songs, vote on the playlist, and help the DJ read the room.
            </p>

            {/* PRIVACY DISCLAIMER (Critical for QR Code users who skip /enter) */}
            <p className="text-xs text-slate-500 mb-8 px-2 border-l-2 border-slate-800 pl-3 text-left">
              By connecting, you agree that we read your public profile, top tracks, and top artists to analyze musical trends. <strong>Your data is deleted 30 days after the event.</strong>
            </p>

            <SpotifyConnectButton
              connected={false}
              displayName=""
            />
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STATE 2: CONNECTED (The "Dashboard" View)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 relative text-slate-200">
      <Background />

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-900/20">
                <MusicIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-100 leading-tight">{room.name}</h1>
                <p className="text-[10px] font-mono text-slate-400 tracking-wider">CODE: {room.code}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full pl-2 pr-3 py-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-slate-300 leading-none">
                  {spotifyConnection.displayName?.split(' ')[0] || 'Guest'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 p-4 space-y-6">
          {/* Search Section */}
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SpotifySearch />
          </section>
          
          {/* List Section */}
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <RequestList />
          </section>
        </main>
        
        {/* Footer info */}
        <footer className="p-8 text-center space-y-4">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                Audiocracy Live
            </p>
            {/* Disconnect Button */}
            <LeaveRoomButton />
        </footer>
      </div>
    </div>
  );
}