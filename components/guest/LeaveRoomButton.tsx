"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeaveRoomButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLeave = async () => {
    if (!confirm("Are you sure? This will disconnect you from the room and remove your music data.")) return;
    
    setLoading(true);
    try {
      await fetch("/api/guest/leave", { method: "POST" });
      router.refresh(); // Clear client state
      window.location.href = "/enter"; // Hard redirect to entry
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLeave}
      disabled={loading}
      className="text-xs text-slate-500 hover:text-red-500 transition-colors underline decoration-slate-800 underline-offset-4 disabled:opacity-50"
    >
      {loading ? "Disconnecting..." : "Leave Room & Delete Data"}
    </button>
  );
}