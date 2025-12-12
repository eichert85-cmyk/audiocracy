import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

interface RequestsPageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function GuestRequestListPage(props: RequestsPageProps) {
  // NEXT.JS 16 REQUIREMENT — params must be awaited
  const { roomCode } = await props.params;

  // Create Supabase server client
  const supabase = await createSupabaseServerClient();

  // Load room data
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", roomCode)
    .single();

  if (roomError || !room) {
    return notFound();
  }

  // Load real requests from the new table
  const { data: requests, error: reqError } = await supabase
    .from("room_requests")
    .select("*")
    .eq("room_id", room.id)
    .order("created_at", { ascending: true });

  const list = requests || [];

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Guest Music Requests</h1>

      <p>
        <strong>Room Name:</strong> {room.name}
      </p>

      <p>
        <strong>Room Code:</strong> {room.code}
      </p>

      <hr style={{ margin: "2rem 0" }} />

      <h2>Requests</h2>

      {list.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        <ul>
          {list.map((req: any) => (
            <li key={req.id}>
              <strong>{req.song_title}</strong>
              {req.artist_name ? ` — ${req.artist_name}` : ""}
            </li>
          ))}
        </ul>
      )}

      {/*
        TODO (TO-06 → TO-10)
        - Add client-side submission form
        - Create POST API route for new requests
        - Add voting model + UI
        - Add dedupe / merging logic
        - Add WebSocket or realtime updates
        - Connect to Spotify search/autofill
      */}
    </div>
  );
}
