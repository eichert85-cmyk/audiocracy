"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Simple input-based request form.
 * Later versions can integrate Spotify search, but for TO-07
 * we only need track name + optional artist + hidden trackId field.
 */
export default function RequestForm() {
  const router = useRouter();

  const [trackName, setTrackName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackName.trim()) return;

    setSubmitting(true);

    // For now, trackId = trackName (placeholder)
    // Future milestone will replace this once Spotify search is added.
    const trackId = trackName.toLowerCase().replace(/\s+/g, "-");

    const res = await fetch("/api/guest/requests/create", {
      method: "POST",
      body: JSON.stringify({
        trackId,
        trackName,
        artistName: artistName || null,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      console.error("Failed to submit request");
      return;
    }

    // Refresh server components
    router.refresh();

    // Clear form
    setTrackName("");
    setArtistName("");
  }

  return (
    <form onSubmit={handleSubmit} style={styles.container}>
      <h3 style={{ marginBottom: "0.5rem" }}>Request a Song</h3>

      <input
        type="text"
        placeholder="Track name"
        value={trackName}
        onChange={(e) => setTrackName(e.target.value)}
        style={styles.input}
        required
      />

      <input
        type="text"
        placeholder="Artist (optional)"
        value={artistName}
        onChange={(e) => setArtistName(e.target.value)}
        style={styles.input}
      />

      <button
        type="submit"
        disabled={submitting}
        style={{
          ...styles.button,
          opacity: submitting ? 0.6 : 1,
          cursor: submitting ? "wait" : "pointer",
        }}
      >
        {submitting ? "Submitting..." : "Submit Request"}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    border: "1px solid #ccc",
    padding: "1rem",
    borderRadius: "8px",
    maxWidth: "400px",
    marginBottom: "2rem",
  },
  input: {
    width: "100%",
    padding: "0.5rem",
    marginBottom: "0.75rem",
    borderRadius: "4px",
    border: "1px solid #bbb",
    fontSize: "1rem",
  },
  button: {
    width: "100%",
    padding: "0.6rem",
    borderRadius: "4px",
    background: "#0070f3",
    color: "white",
    fontWeight: 600,
    border: "none",
    fontSize: "1rem",
  },
};
