"use client";

import { useState } from "react";

export default function IngestPage() {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("top_200");
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<any[]>([]);

  // Parser for the specific format: "RANK","ARTIST","SONG"
  const handleParse = () => {
    const lines = text.split("\n");
    const parsed = [];
    
    for (const line of lines) {
      // Look for lines that match the csv pattern "Rank","Artist","Song"
      // Regex handles quoted strings
      const match = line.match(/"([^"]+)","([^"]+)","([^"]+)"/);
      if (match) {
        parsed.push({
          rank: match[1],
          artist: match[2].trim(),
          title: match[3].trim()
        });
      }
    }
    setPreview(parsed);
    setStatus(`Found ${parsed.length} songs. Ready to import?`);
  };

  const handleImport = async () => {
    setStatus("Importing...");
    
    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          category, 
          songs: preview 
        }),
      });
      
      const json = await res.json();
      if (res.ok) {
        setStatus(`Success! Imported ${json.count} songs into '${category}'.`);
        setPreview([]);
        setText("");
      } else {
        setStatus(`Error: ${json.error}`);
      }
    } catch (err) {
      setStatus("Network Error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-black text-slate-900 mb-6">Database Ingest Tool</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LEFT: Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category Tag</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="top_200">Top 200 Most Requested</option>
                <option value="pop">Top 100 Pop</option>
                <option value="country">Top 100 Country</option>
                <option value="rock">Top 100 Rock/Alt</option>
                <option value="hiphop">Top 100 Hip Hop/R&B</option>
                <option value="dance">Top 100 Dance</option>
                <option value="latin">Top 100 Latin</option>
                <option value="2020s">Top 100 of the 2020s</option>
                <option value="2010s">Top 100 of the 2010s</option>
                <option value="2000s">Top 100 of the 2000s</option>
                <option value="90s">Top 100 of the 90s</option>
                <option value="80s">Top 100 of the 80s</option>
                <option value="70s">Top 100 of the 70s</option>
                <option value="60s">Top 100 of the 60s</option>
                <option value="50s">Top 100 of the 50s</option>
                <option value="party_songs">Top 50 Party Songs</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Paste PDF Data</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={'Paste rows like:\n"1","Artist","Song"\n"2","Artist","Song"'}
                className="w-full h-64 p-3 font-mono text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              onClick={handleParse}
              className="w-full py-3 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 transition-colors"
            >
              Parse Data
            </button>
          </div>

          {/* RIGHT: Preview */}
          <div className="border-l border-slate-100 pl-8 flex flex-col">
            <h3 className="font-bold text-slate-900 mb-4">Preview</h3>
            
            <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 p-4 overflow-y-auto max-h-[400px]">
              {preview.length === 0 ? (
                <p className="text-slate-400 text-sm text-center mt-10">Paste data and click Parse to verify before importing.</p>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2">#</th>
                      <th className="pb-2">Artist</th>
                      <th className="pb-2">Title</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((row, i) => (
                      <tr key={i}>
                        <td className="py-2 font-mono text-slate-400">{row.rank}</td>
                        <td className="py-2 font-medium text-slate-700">{row.artist}</td>
                        <td className="py-2 text-slate-600">{row.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{status}</span>
              {preview.length > 0 && (
                <button
                  onClick={handleImport}
                  className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                >
                  Import {preview.length} Items
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}