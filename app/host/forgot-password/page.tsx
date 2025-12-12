"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/host/update-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for the password reset link!");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-100">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Forgot Password</h1>
        <p className="text-slate-500 text-sm mb-6">
          Enter your email to receive a reset link.
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
              placeholder="dj@example.com"
            />
          </div>

          {message && (
            <div className="text-xs p-3 rounded-lg bg-green-50 text-green-600 border border-green-200">
              {message}
            </div>
          )}

          {error && (
            <div className="text-xs p-3 rounded-lg bg-red-50 text-red-500 border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/host/login" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}