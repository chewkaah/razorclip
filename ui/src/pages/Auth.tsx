/**
 * Auth Page — Razorclip branded login/signup
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "@/lib/router";
import { authApi } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";

type AuthMode = "sign_in" | "sign_up";

export function AuthPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });

  useEffect(() => {
    if (session) navigate(nextPath, { replace: true });
  }, [session, navigate, nextPath]);

  const ALLOWED_DOMAIN = "@integral.studio";

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "sign_in") {
        await authApi.signInEmail({ email: email.trim(), password });
        return;
      }
      if (!email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN)) {
        throw new Error("Only @integral.studio email addresses are allowed");
      }
      await authApi.signUpEmail({ name: name.trim(), email: email.trim(), password });
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      navigate(nextPath, { replace: true });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Authentication failed");
    },
  });

  const canSubmit =
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    (mode === "sign_in" || (name.trim().length > 0 && password.trim().length >= 8));

  if (isSessionLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[--rc-surface]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[--rc-primary] animate-pulse" />
          <span className="text-sm text-[--rc-on-surface-variant]">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex bg-[--rc-surface] text-[--rc-on-surface] font-['Inter']">
      {/* Left half — Razorclip branded form */}
      <div className="w-full md:w-1/2 flex flex-col overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto px-8 py-12">
          {/* Brand */}
          <div className="mb-10">
            <h1 className="text-3xl font-thin tracking-tighter text-[--rc-primary] uppercase mb-1">Razorclip</h1>
            <p className="text-[10px] text-[--rc-on-surface-variant] tracking-[0.2em] uppercase opacity-60">Agent Command Center</p>
          </div>

          <h2 className="text-xl font-semibold text-[--rc-on-surface]">
            {mode === "sign_in" ? "Sign in to Razorclip" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-[--rc-on-surface-variant]">
            {mode === "sign_in"
              ? "Access your agent command center."
              : "Set up your profile to start orchestrating agents."}
          </p>

          <form
            className="mt-8 space-y-5"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              if (mutation.isPending) return;
              if (!canSubmit) { setError("Please fill in all required fields."); return; }
              mutation.mutate();
            }}
          >
            {mode === "sign_up" && (
              <div>
                <label htmlFor="name" className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] mb-2 block">Name</label>
                <input
                  id="name" name="name"
                  className="w-full bg-[--rc-surface-container-low] border border-[#464554]/30 rounded-xl px-4 py-3 text-sm text-[--rc-on-surface] outline-none focus:border-[--rc-primary]/50 focus:ring-1 focus:ring-[--rc-primary]/20 placeholder:text-[--rc-on-surface-variant]/30 transition-all"
                  placeholder="Your name"
                  value={name} onChange={(e) => setName(e.target.value)}
                  autoComplete="name" autoFocus
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] mb-2 block">Email</label>
              <input
                id="email" name="email" type="email"
                className="w-full bg-[--rc-surface-container-low] border border-[#464554]/30 rounded-xl px-4 py-3 text-sm text-[--rc-on-surface] outline-none focus:border-[--rc-primary]/50 focus:ring-1 focus:ring-[--rc-primary]/20 placeholder:text-[--rc-on-surface-variant]/30 transition-all"
                placeholder="you@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" autoFocus={mode === "sign_in"}
              />
            </div>
            <div>
              <label htmlFor="password" className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] mb-2 block">Password</label>
              <input
                id="password" name="password" type="password"
                className="w-full bg-[--rc-surface-container-low] border border-[#464554]/30 rounded-xl px-4 py-3 text-sm text-[--rc-on-surface] outline-none focus:border-[--rc-primary]/50 focus:ring-1 focus:ring-[--rc-primary]/20 placeholder:text-[--rc-on-surface-variant]/30 transition-all"
                placeholder={mode === "sign_up" ? "Min 8 characters" : "••••••••"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
              />
            </div>
            {error && <p className="text-xs text-[#ffb4ab]">{error}</p>}
            <button
              type="submit"
              disabled={mutation.isPending || !canSubmit}
              className="w-full py-3 bg-[--rc-primary] text-[--rc-on-primary] font-bold rounded-xl text-sm uppercase tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all shadow-[0_10px_25px_-5px_rgba(0,255,170,0.3)] disabled:opacity-50"
            >
              {mutation.isPending ? "Working…" : mode === "sign_in" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-sm text-[--rc-on-surface-variant]">
            {mode === "sign_in" ? "Need an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-[--rc-primary] hover:underline underline-offset-2"
              onClick={() => { setError(null); setMode(mode === "sign_in" ? "sign_up" : "sign_in"); }}
            >
              {mode === "sign_in" ? "Create one" : "Sign in"}
            </button>
          </div>
        </div>
      </div>

      {/* Right half — Razorclip visual */}
      <div className="hidden md:flex w-1/2 items-center justify-center relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/10 via-[--rc-surface] to-[#3B82F6]/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8B5CF6]/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[--rc-primary]/5 rounded-full blur-[100px]" />

        {/* Razor icon + tagline */}
        <div className="relative z-10 text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-[--rc-primary]/10 border border-[--rc-primary]/20 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-5xl text-[--rc-primary]"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 48" }}
            >
              content_cut
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-thin tracking-tighter text-[--rc-primary] uppercase">Razorclip</h2>
            <p className="text-xs text-[--rc-on-surface-variant]/60 uppercase tracking-[0.3em] mt-1">Agent Command Center</p>
          </div>
          <div className="flex gap-3 justify-center mt-8">
            {["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#EAB308"].map((color, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: color, animationDelay: `${i * 200}ms`, opacity: 0.6 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
