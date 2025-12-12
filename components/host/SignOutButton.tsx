"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut(); 
      router.refresh();
      router.replace("/host/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest disabled:opacity-50"
    >
      {loading ? "..." : "Sign Out"}
    </button>
  );
}