"use client";

import { useState } from "react";
import QRCode from "react-qr-code";

// Inline Icons
const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
);
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
);
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>
);
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);

export default function RoomQRCode({ roomCode }: { roomCode: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Construct the join URL
  const origin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000");
  const joinUrl = `${origin}/guest/room/${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById("room-qr-code");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `audiocracy-${roomCode}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="flex flex-col items-center gap-1 bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all group w-16"
        title="Share Event"
      >
        <div className="text-slate-400 group-hover:text-blue-500 transition-colors">
            <ShareIcon />
        </div>
        <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-600 uppercase tracking-wider">
            Share
        </span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal Content */}
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} 
          >
            <h3 className="text-lg font-black text-slate-900 mb-1">Share Event</h3>
            <p className="text-xs text-slate-500 mb-6">Scan to join, download for print, or copy link.</p>

            {/* QR Container */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-inner mb-4 inline-block">
                <div style={{ height: "auto", margin: "0 auto", maxWidth: 200, width: "100%" }}>
                    <QRCode
                    id="room-qr-code"
                    size={256}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    value={joinUrl}
                    viewBox={`0 0 256 256`}
                    />
                </div>
            </div>

            <div className="space-y-3">
                {/* Download Button */}
                <button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center gap-2 p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-xs font-bold uppercase tracking-wider shadow-md"
                >
                    <DownloadIcon /> Download QR
                </button>

                {/* Copy Link Section */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 truncate font-mono bg-white px-2 py-1.5 rounded border border-slate-100 flex-1 text-left">
                        {joinUrl}
                    </div>
                    <button 
                        onClick={handleCopy}
                        className="p-2 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm"
                        title="Copy link to clipboard"
                    >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                    </button>
                </div>
            </div>

            <button 
                onClick={() => setIsOpen(false)}
                className="mt-6 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
            >
                Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}