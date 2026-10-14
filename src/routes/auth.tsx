import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrainCircuit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Search = { next?: string };

function isSafeRelative(p?: string) {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//");
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({ next: typeof s.next === "string" ? s.next : undefined }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ href: isSafeRelative(search.next) ? search.next! : "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const target = isSafeRelative(next) ? next! : "/dashboard";

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) window.location.href = target;
    });
    return () => sub.subscription.unsubscribe();
  }, [target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${target}` } });
    setBusy(false);
    if (response.error) return setMessage(response.error.message);
    if (mode === "signup") return setMessage("Check your email to confirm your Gen Earn Hub account.");
    navigate({ to: target });
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
    <div className="w-full max-w-md">
      <Link to="/" className="mb-6 flex items-center justify-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950"><BrainCircuit className="h-5 w-5" /></div><div><div className="font-bold">Gen Earn Hub</div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Member access</div></div></Link>
      <form onSubmit={submit} className="space-y-5 rounded-[2rem] border border-white/10 bg-white/5 p-7 shadow-2xl">
        <div><h1 className="text-2xl font-black">{mode === "signin" ? "Welcome back" : "Create your account"}</h1><p className="mt-1 text-sm text-slate-400">{mode === "signin" ? "Sign in to access your purchased Gen Earn Hub content." : "Use the same email address you use at checkout so your paid access can be matched automatically."}</p></div>
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="bg-slate-900" /></div>
        <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} className="bg-slate-900" /></div>
        {message && <p className="rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-300">{message}</p>}
        <Button type="submit" disabled={busy} className="w-full bg-cyan-400 font-black text-slate-950 hover:bg-cyan-300">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</Button>
        <button type="button" className="w-full text-center text-sm text-slate-400 hover:text-white" onClick={() => { setMessage(null); setMode(mode === "signin" ? "signup" : "signin"); }}>{mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}</button>
      </form>
    </div>
  </main>;
}
