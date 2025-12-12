import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import HostQueue from "@/components/host/HostQueue";
import RoomInsights from "@/components/host/RoomInsights";
import SignOutButton from "@/components/host/SignOutButton";
import RoomQRCode from "@/components/host/RoomQRCode"; 

interface PageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function HostRoomPage({ params }: PageProps) {
  const { roomCode } = await params;
  const supabase = await createSupabaseServerClient();

  // 1. Check Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/host/login");

  // 2. Fetch Room Details (Case-insensitive check for robustness)
  const { data: room, error } = await supabase
    .from("rooms")
    .select("*")
    .ilike("code", roomCode) 
    .eq("owner_id", user.id)
    .single();

  if (error || !room) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Event Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left: Title & Back Link */}
            <div>
              <Link 
                href="/dashboard" 
                className="text-xs font-bold text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1 transition-colors"
              >
                <span>←</span> Back to Dashboard
              </Link>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {room.name}
              </h1>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3 md:gap-6">
              <RoomQRCode roomCode={room.code} />
              
              <div className="bg-slate-900 text-white px-5 py-2 rounded-xl shadow-lg flex flex-col items-center min-w-[100px]">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">
                  Code
                </span>
                <span className="text-2xl font-mono font-bold tracking-wider text-[#1DB954]">
                  {room.code}
                </span>
              </div>

              <div className="hidden md:block pl-2 border-l border-slate-100">
                 <SignOutButton />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: The Queue (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <HostQueue roomCode={room.code} />
            </div>
          </div>

          {/* RIGHT COLUMN: Insights (1/3 width) */}
          <div className="space-y-6">
            <RoomInsights roomCode={room.code} />
            
            {/* Quick Actions / Instructions */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <h4 className="font-bold text-blue-900 text-sm mb-2">DJ Vibe Report</h4>
              <p className="text-xs text-blue-700 leading-relaxed mb-4">
                Get a cheat sheet of the room's winning decades, hidden gems, and energy overlap.
              </p>
              <Link 
                href={`/dashboard/${room.code}/report`}
                className="block w-full text-center py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                View Full Report
              </Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}