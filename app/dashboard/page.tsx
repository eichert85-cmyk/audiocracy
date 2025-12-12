import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import CreateRoomButton from "@/components/host/CreateRoomButton";
import EventList from "@/components/host/EventList";
import SignOutButton from "@/components/host/SignOutButton";

export default async function HostDashboard() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/host/login");
  }

  // Fetch rooms with counts and dates
  const { data: rooms } = await supabase
    .from("rooms")
    .select(`
      id, 
      code, 
      name, 
      is_active, 
      event_date, 
      created_at,
      guests (count)
    `)
    .eq("owner_id", user.id)
    .order("event_date", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Host Dashboard</h1>
            <p className="text-slate-500 text-sm">Manage your Audiocracy events</p>
          </div>
          
          {/* Actions Row */}
          <div className="flex items-center gap-4">
             <SignOutButton />
             <CreateRoomButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <EventList rooms={rooms || []} />
      </main>
    </div>
  );
}