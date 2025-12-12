import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
      }}
    >
      {/* ─── Navigation ────────────────────────────── */}
      <header
        style={{
          padding: "1.5rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #eaeaea",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: "1.5rem", color: "#111", letterSpacing: "-0.03em" }}>
          Audiocracy
        </div>
        <nav style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link
            href="/enter"
            style={{
              textDecoration: "none",
              color: "#666",
              fontWeight: 500,
              fontSize: "0.95rem",
            }}
          >
            Guest Entry
          </Link>
          <Link
            href="/host/login"
            style={{
              textDecoration: "none",
              color: "#111",
              fontWeight: 600,
              fontSize: "0.95rem",
            }}
          >
            Host Login
          </Link>
        </nav>
      </header>

      {/* ─── Hero Section ──────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 1rem",
          textAlign: "center",
          background: "linear-gradient(to bottom, #ffffff 0%, #f9f9f9 100%)",
        }}
      >
        <h1
          style={{
            fontSize: "4rem",
            fontWeight: 900,
            marginBottom: "1rem",
            color: "#111",
            maxWidth: "800px",
            lineHeight: "1",
            letterSpacing: "-0.04em",
          }}
        >
          Welcome to the <br />
          <span style={{ color: "#1DB954" }}>Audiocracy</span>
        </h1>
        
        <p
          style={{
            fontSize: "1.25rem",
            color: "#666",
            maxWidth: "600px",
            marginBottom: "3rem",
            lineHeight: "1.6",
          }}
        >
          The democratic way to manage event music. <br />
          Guests vote. The room decides. You control the vibe.
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {/* Host Action */}
          <Link
            href="/host/login"
            style={{
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "white",
              background: "#111",
              borderRadius: "8px",
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              transition: "transform 0.1s",
            }}
          >
            Launch Event
          </Link>

          {/* Guest Action */}
          <Link
            href="/enter"
            style={{
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "#333",
              background: "white",
              border: "1px solid #ddd",
              borderRadius: "8px",
              textDecoration: "none",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            Join Room
          </Link>
        </div>
      </main>

      {/* ─── Footer ────────────────────────────────── */}
      <footer
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "#888",
          fontSize: "0.9rem",
          borderTop: "1px solid #eaeaea",
          background: "#fff",
        }}
      >
        <p>© {new Date().getFullYear()} ActiveDJ. Built for professional entertainment.</p>
      </footer>
    </div>
  );
}