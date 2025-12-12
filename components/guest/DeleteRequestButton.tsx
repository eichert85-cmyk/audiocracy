"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteRequestButton({ requestId }: { requestId: number }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this request?")) return;

    setDeleting(true);

    try {
      // Calling from the CLIENT (Browser) ensures cookies are sent automatically
      const res = await fetch("/api/guest/requests/delete", {
        method: "DELETE",
        body: JSON.stringify({ requestId }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(`Failed to delete: ${json.error || "Unknown error"}`);
        setDeleting(false);
        return;
      }

      // Refresh the page data to update the list
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Network error. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      style={{
        marginTop: "0.5rem",
        background: deleting ? "#ccc" : "#d9534f",
        color: "white",
        padding: "0.4rem 0.75rem",
        border: "none",
        borderRadius: "4px",
        cursor: deleting ? "not-allowed" : "pointer",
        opacity: deleting ? 0.7 : 1,
      }}
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}