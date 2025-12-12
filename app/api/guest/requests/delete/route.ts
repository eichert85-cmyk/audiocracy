import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  GUEST_ID_COOKIE_NAME,
  GUEST_ROOM_ID_COOKIE_NAME,
} from "@/lib/guestSession";

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();

    const guestId = cookieStore.get(GUEST_ID_COOKIE_NAME)?.value;
    const roomId = cookieStore.get(GUEST_ROOM_ID_COOKIE_NAME)?.value;

    if (!guestId || !roomId) {
      return NextResponse.json(
        { success: false, error: "Guest is not authenticated for this room." },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => null);

    if (!body || !body.requestId) {
      return NextResponse.json(
        { success: false, error: "Missing requestId in body." },
        { status: 400 }
      );
    }

    const { requestId } = body as { requestId: string };

    const supabase = await createSupabaseServerClient();

    // ✔ Verify the request belongs to this guest
    // FIX: Changed table from 'guest_requests' to 'room_requests'
    const { data: rows, error: fetchError } = await supabase
      .from("room_requests")
      .select("id, guest_id")
      .eq("id", requestId)
      .eq("guest_id", guestId)
      .limit(1);

    if (fetchError) {
      console.error("Error verifying request ownership:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to verify request ownership." },
        { status: 500 }
      );
    }

    const match = rows?.[0];

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Request not found or unauthorized." },
        { status: 403 }
      );
    }

    // ✔ Delete the request
    // FIX: Changed table from 'guest_requests' to 'room_requests'
    const { error: deleteError } = await supabase
      .from("room_requests")
      .delete()
      .eq("id", requestId);

    if (deleteError) {
      console.error("Error deleting request:", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to delete request." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, deletedId: requestId },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error in /guest/requests/delete:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}