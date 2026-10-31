
"use client";
import Brand from "@/components/Brand";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (!data.session) {
          setMessage("Check your email to confirm your account.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf5ed] px-5 text-[#502d37]">
      <div className="w-full max-w-md rounded-3xl border border-[#ead9d1] bg-white p-8">
        <Link href="/" className="font-serif text-2xl italic sm:text-3xl">
          brain rot <span className="text-[#b66c7c]">&</span> bookmarks.
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.25em] text-[#a26f79]">
          your personal story archive
        </p>

        <h1 className="mt-3 font-serif text-3xl">
          {signup ? "Make yourself at home." : "Welcome back, lovely."}
        </h1>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[#e7d4cf] bg-[#fffaf6] px-4 py-3 outline-none"
          />

          <input
            type="password"
            required
            minLength={6}
            autoComplete={signup ? "new-password" : "current-password"}
            placeholder="Password (at least 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[#e7d4cf] bg-[#fffaf6] px-4 py-3 outline-none"
          />

          {message && (
            <p role="status" className="text-sm text-[#945463]">
              {message}
            </p>
          )}

          <button
            disabled={busy}
            className="w-full rounded-full bg-[#713746] px-5 py-3 text-white disabled:opacity-50"
          >
            {busy
              ? "Please wait..."
              : signup
                ? "Create my account ♡"
                : "Enter my diary ♡"}
          </button>
        </form>

        <button
          onClick={() => {
            setSignup(!signup);
            setMessage("");
          }}
          className="mt-5 w-full text-sm text-[#98616b]"
        >
          {signup
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>

        <Link href="/" className="mt-5 block text-center text-sm text-[#a08483]">
          ← Back to my diary
        </Link>
      </div>
    </main>
  );
}
