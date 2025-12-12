"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateRoomButton() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [eventName, setEventName] = useState("");
  
  // FIX: Initialize date using local timezone offset to prevent "Tomorrow Bug"
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });
  
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!eventName.trim()) return;
    
    setLoading(true);

    try {
      const res = await fetch("/api/host/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            name: eventName,
            eventDate: eventDate 
        }),
      });

      const json = await res.json();

      if (res.ok && json.code) {
        router.push(`/dashboard/${json.code}`);
      } else {
        alert(json.error || "Failed to create room");
      }
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  }

  if (!showModal) {
    return (
      <button
        onClick={() => setShowModal(true)}
        className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 px-6 rounded-full transition-transform active:scale-95 shadow-lg flex items-center gap-2"
      >
        <span>+</span> Create New Event
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold text-white mb-4">New Event Details</h2>
        
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Event Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Name</label>
            <input
              type="text"
              placeholder="e.g. Smith Wedding"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#1DB954]"
              autoFocus
            />
          </div>

          {/* Event Date */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#1DB954] appearance-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 py-3 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#1DB954] hover:bg-[#1ed760] text-black py-3 rounded-lg font-bold transition-transform active:scale-95 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Launch Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}