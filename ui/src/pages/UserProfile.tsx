/**
 * UserProfile — USER.md editor page
 *
 * Lets the user edit their personal context document that agents read.
 * Also manages display preferences (name, avatar, timezone, voice/tone).
 */
import { useEffect, useState, useCallback } from "react";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useUserProfile } from "../hooks/useUserProfile";

export function UserProfilePage() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const { profile, isLoading, updateProfile, isUpdating } = useUserProfile();

  const [displayName, setDisplayName] = useState("");
  const [contextMd, setContextMd] = useState("");
  const [timezone, setTimezone] = useState("");
  const [voiceTone, setVoiceTone] = useState("professional");
  const [verbosity, setVerbosity] = useState("concise");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: "Profile" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setContextMd(profile.contextMd ?? "");
      setTimezone(profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
      setVoiceTone(profile.preferences?.voiceTone ?? "professional");
      setVerbosity(profile.preferences?.verbosity ?? "concise");
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    await updateProfile({
      displayName: displayName || null,
      contextMd,
      timezone: timezone || null,
      preferences: {
        ...(profile?.preferences ?? { autoApproveThreshold: 0, defaultAgent: null, notifications: true }),
        voiceTone,
        verbosity,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [displayName, contextMd, timezone, voiceTone, verbosity, profile, updateProfile]);

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="animate-pulse glass-card rounded-xl h-20" />
        <div className="animate-pulse glass-card rounded-xl h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[--rc-on-surface-variant] mb-2">
          <span>Razorclip</span>
          <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>chevron_right</span>
          <span className="text-[--rc-primary]">User Profile</span>
        </nav>
        <h2 className="text-4xl font-light tracking-tight text-[--rc-on-surface]">
          Your <span className="font-bold">Profile</span>
        </h2>
        <p className="text-[--rc-on-surface-variant] mt-2 text-sm font-medium">
          This context is read by every agent when they interact with you. Make it personal.
        </p>
      </div>

      {/* Identity Section */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[--rc-on-surface-variant]">Identity</h3>
        <div className="glass-card rounded-2xl p-6 border border-[--rc-glass-border] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] block mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="How agents should greet you"
                className="w-full bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/20 rounded-xl px-4 py-3 text-sm text-[--rc-on-surface] placeholder:text-[--rc-on-surface-variant]/40 focus:outline-none focus:border-[--rc-primary]/40 focus:ring-1 focus:ring-[--rc-primary]/20 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] block mb-2">Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                placeholder="e.g. America/New_York"
                className="w-full bg-[--rc-surface-container-low] border border-[--rc-outline-variant]/20 rounded-xl px-4 py-3 text-sm text-[--rc-on-surface] placeholder:text-[--rc-on-surface-variant]/40 focus:outline-none focus:border-[--rc-primary]/40 focus:ring-1 focus:ring-[--rc-primary]/20 transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Agent Interaction Preferences */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[--rc-on-surface-variant]">Agent Interaction Style</h3>
        <div className="glass-card rounded-2xl p-6 border border-[--rc-glass-border] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] block mb-2">Voice & Tone</label>
              <div className="flex gap-2">
                {["professional", "casual", "minimal"].map(tone => (
                  <button
                    key={tone}
                    onClick={() => setVoiceTone(tone)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      voiceTone === tone
                        ? "bg-[--rc-primary] text-[--rc-on-primary] shadow-lg"
                        : "bg-[--rc-surface-container-high] text-[--rc-on-surface-variant] hover:bg-[--rc-surface-container-highest]"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[--rc-on-surface-variant] block mb-2">Verbosity</label>
              <div className="flex gap-2">
                {["verbose", "concise", "minimal"].map(v => (
                  <button
                    key={v}
                    onClick={() => setVerbosity(v)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                      verbosity === v
                        ? "bg-[--rc-primary] text-[--rc-on-primary] shadow-lg"
                        : "bg-[--rc-surface-container-high] text-[--rc-on-surface-variant] hover:bg-[--rc-surface-container-highest]"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USER.md Context Editor */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[--rc-on-surface-variant]">
            USER.MD — Personal Context
          </h3>
          <span className="text-[10px] text-[--rc-on-surface-variant]/50 uppercase tracking-wider">
            Agents read this when they work with you
          </span>
        </div>
        <div className="glass-card rounded-2xl border border-[--rc-glass-border] overflow-hidden">
          <div className="px-4 py-2 border-b border-[--rc-glass-border] flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-[--rc-primary]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>edit_note</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[--rc-on-surface-variant]">Markdown Editor</span>
          </div>
          <textarea
            value={contextMd}
            onChange={e => setContextMd(e.target.value)}
            placeholder={`# About Me

## Role
I'm the founder/CEO of Integral Studio, a digital agency.

## Working Style
- I prefer concise updates, not walls of text
- I like seeing data before recommendations
- I work late nights (EST timezone)

## Communication
- Call me Chuka
- I like direct, no-fluff communication
- For urgent items, prioritize speed over polish

## Context Agents Should Know
- We're targeting $1M-$3M revenue
- Primary clients: music artists, D2C brands
- Symphony.to is our sibling music SaaS company
- Dante handles music, Brent handles brands, Rex does ops`}
            rows={16}
            className="w-full bg-transparent px-6 py-4 text-sm text-[--rc-on-surface] placeholder:text-[--rc-on-surface-variant]/30 focus:outline-none resize-none font-mono leading-relaxed"
          />
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isUpdating}
          className="px-8 py-3 bg-[--rc-primary] text-[--rc-on-primary] font-bold rounded-xl text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg disabled:opacity-50"
        >
          {isUpdating ? "Saving..." : saved ? "Saved ✓" : "Save Profile"}
        </button>
        {saved && (
          <span className="text-xs text-emerald-400 font-medium">Profile updated — agents will use your new context</span>
        )}
      </div>
    </div>
  );
}
