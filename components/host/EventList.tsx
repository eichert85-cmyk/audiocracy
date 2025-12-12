"use client";

import { useState } from "react";
import Link from "next/link";

type Room = {
  id: string;
  code: string;
  name: string;
  event_date: string | null;
  created_at: string;
  is_active: boolean;
  guests: { count: number }[]; // Array from Supabase join
};

// Inline Icons
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const SortIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
);

export default function EventList({ rooms }: { rooms: Room[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [sortBy, setSortBy] = useState<'date' | 'created'>('date');

  // --- LOGIC ---

  // 1. Search Filter
  const searchFiltered = rooms.filter((room) =>
    (room.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (room.code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. Date Threshold (Today)
  const todayStr = new Date().toISOString().split('T')[0];

  // 3. Bucket Data
  const upcomingEvents = searchFiltered.filter((room) => {
    if (!room.event_date) return true; // Undated = Upcoming
    return room.event_date >= todayStr;
  });

  const pastEvents = searchFiltered.filter((room) => {
    if (!room.event_date) return false;
    return room.event_date < todayStr;
  });

  const displayedEvents = view === 'upcoming' ? upcomingEvents : pastEvents;

  // 4. Sort Data
  displayedEvents.sort((a, b) => {
    if (sortBy === 'created') {
      // Newest created first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      // Event Date logic
      const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
      const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
      
      if (view === 'upcoming') {
        // Soonest first
        if (dateA === 0) return 1;
        if (dateB === 0) return -1;
        return dateA - dateB;
      } else {
        // Most recent past first
        return dateB - dateA;
      }
    }
  });

  return (
    <div className="space-y-4">
      
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        
        {/* Left: View Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-md self-start md:self-auto">
          <button
            onClick={() => setView('upcoming')}
            className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${
              view === 'upcoming' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            onClick={() => setView('past')}
            className={`px-3 py-1 text-xs font-bold rounded-sm transition-all ${
              view === 'past' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Past ({pastEvents.length})
          </button>
        </div>

        {/* Right: Search & Sort */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          
          {/* Sort Toggle */}
          <button 
            onClick={() => setSortBy(sortBy === 'date' ? 'created' : 'date')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 whitespace-nowrap"
          >
            <SortIcon />
            {sortBy === 'date' ? 'By Event Date' : 'By Created Date'}
          </button>

          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors"
            />
            <span className="absolute left-2.5 top-2">
              <SearchIcon />
            </span>
          </div>
        </div>
      </div>

      {/* LIST HEADER (Columns) */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-2">Date</div>
          <div className="col-span-4">Event</div>
          <div className="col-span-2">Code</div>
          <div className="col-span-2">Activity</div>
          <div className="col-span-2 text-right">Status</div>
      </div>

      {/* ROWS */}
      <div className="space-y-2 min-h-[300px]">
        {displayedEvents.length > 0 ? (
          displayedEvents.map((room) => (
            <EventRow key={room.id} room={room} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-100 rounded-lg bg-slate-50/50">
            <p className="text-slate-400 text-xs font-medium">No events found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({ room }: { room: Room }) {
  // Parsing
  let dateDisplay = 'No Date';
  if (room.event_date) {
    const [y, m, d] = room.event_date.split('-'); 
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    dateDisplay = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Safe guest count access (Supabase returns array of objects for count)
  const guestCount = room.guests?.[0]?.count ?? 0;

  return (
    <Link href={`/dashboard/${room.code}`} className="block group">
      <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-green-500 hover:shadow-md transition-all grid grid-cols-1 md:grid-cols-12 md:items-center gap-3 md:gap-4 relative overflow-hidden">
        
        {/* Date */}
        <div className="col-span-2 text-sm font-medium text-slate-500 group-hover:text-slate-900">
            {dateDisplay}
        </div>

        {/* Name */}
        <div className="col-span-4 font-bold text-slate-900 truncate">
            {room.name}
        </div>

        {/* Code */}
        <div className="col-span-2">
            <span className="bg-slate-100 text-slate-600 font-mono text-[10px] font-bold px-2 py-1 rounded border border-slate-200 group-hover:border-green-200 group-hover:bg-green-50 group-hover:text-green-700">
                {room.code}
            </span>
        </div>

        {/* Guests Count */}
        <div className="col-span-2 flex items-center gap-1.5 text-slate-500">
            <UsersIcon />
            <span className="text-xs font-bold">{guestCount}</span>
            <span className="text-[10px] uppercase font-medium text-slate-400">Guests</span>
        </div>

        {/* Status */}
        <div className="col-span-2 flex md:justify-end items-center gap-2">
             <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                room.is_active 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}>
                {room.is_active ? 'LIVE' : 'OFF'}
            </span>
            <span className="text-slate-300 group-hover:text-green-500 transition-colors hidden md:inline-block">→</span>
        </div>

      </div>
    </Link>
  );
}