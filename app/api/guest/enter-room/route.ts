// app/api/guest/enter-room/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  GUEST_ID_COOKIE_NAME,
  GUEST_ROOM_ID_COOKIE_NAME,
  GUEST_ROOM_CODE_COOKIE_NAME,
  generateGuestId,
} from "@/lib/guestSession";

export async function POST(req: Request) {
  try {
    const { roomCode } = await req.json();

    if (!roomCode) {
      return NextResponse.json({ error: "Missing room code" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Look up the room
    const { data: room, error } = await supabase
      .from("rooms")
      .select("id, code, name")
      .eq("code", roomCode)
      .single();

    if (error || !room) {
      console.error("[enter-room] Room not found for code:", roomCode, error);
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const cookieStore = await cookies();
    const secure = process.env.NODE_ENV === "production";

    // -------------------------------
    // Ensure guest_id exists
    // -------------------------------
    let guestId = cookieStore.get(GUEST_ID_COOKIE_NAME)?.value;

    if (!guestId) {
      guestId = generateGuestId();
      console.log("[enter-room] Generated new guest_id:", guestId);

      cookieStore.set({
        name: GUEST_ID_COOKIE_NAME,
        value: guestId,
        httpOnly: true,
        secure,
        sameSite: "lax", // IMPORTANT: allow OAuth redirects back from Spotify
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    // -------------------------------
    // Assign guest to this room (ID)
    // -------------------------------
    cookieStore.set({
      name: GUEST_ROOM_ID_COOKIE_NAME,
      value: String(room.id), // cookie stores numeric room ID
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    // -------------------------------
    // Also store the room CODE for redirects / UX
    // -------------------------------
    cookieStore.set({
      name: GUEST_ROOM_CODE_COOKIE_NAME,
      value: room.code,
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });

    console.log("[enter-room] Assigned guest to room:", {
      guestId,
      roomId: room.id,
      roomCode: room.code,
    });

    // -------------------------------
    // Redirect using the room CODE (slug)
    // -------------------------------
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/guest/room/${room.code}`,
      { status: 302 }
    );
  } catch (err) {
    console.error("Error in enter-room:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
