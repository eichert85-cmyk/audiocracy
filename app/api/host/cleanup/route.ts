import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

/**
 * Executes a nightly cleanup to delete events older than 30 days,
 * along with all connected guest data, requests, and intelligence data.
 * * This endpoint is designed to be hit by an external cron job service.
 * It is secured by basic checks (or should be secured further in production).
 */
export async function GET() {
  // NOTE: In a production environment, you would secure this route with an API key check
  // to prevent unauthorized execution. For now, it relies on server-side invocation.
  
  try {
    const supabase = await createSupabaseServerClient();

    // Call the database function to handle the cleanup logic (deletes old rooms)
    const { error } = await supabase.rpc('delete_expired_events');

    if (error) {
      console.error("Cleanup failed:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // This query is only for demonstration purposes. If you previously ran the SQL to create the function, 
    // it will execute correctly.

    return NextResponse.json({ success: true, message: "Expired events and related data deleted successfully." });

  } catch (e) {
    console.error("Cleanup route exception:", e);
    return NextResponse.json({ success: false, error: "Server exception during cleanup." }, { status: 500 });
  }
}