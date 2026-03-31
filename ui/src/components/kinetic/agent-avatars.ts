/**
 * Agent Avatar Registry — single source of truth for all agent images.
 *
 * EVERY page that shows agent avatars MUST import from here.
 * No more scattered avatar URLs across pages.
 *
 * Jetsons Rosie-inspired robot avatars — retro-futuristic, role-specific.
 * Self-hosted SVGs in /avatars/.
 */

export type AgentSlug = "dante" | "brent" | "rex" | "scout" | "nova" | "victor";

export const AGENT_AVATARS: Record<AgentSlug, string> = {
  // Purple robot with headphones — Music Marketing
  dante: "/avatars/dante.svg",

  // Blue robot with clipboard — Brand Campaigns
  brent: "/avatars/brent.svg",

  // Green robot with gear/wrench — Campaign Ops
  rex: "/avatars/rex.svg",

  // Orange robot with radar dish — Sales/Outreach
  scout: "/avatars/scout.svg",

  // Pink robot with beret + paintbrush — Creative/Ads
  nova: "/avatars/nova.svg",

  // Gold robot with crown + suit — CEO/Strategy
  victor: "/avatars/victor.svg",
};

/** Get avatar URL for an agent by name — falls back to null for non-registry agents */
export function getAgentAvatar(name: string): string | null {
  const slug = name.toLowerCase().trim();
  return (slug in AGENT_AVATARS) ? AGENT_AVATARS[slug as AgentSlug] : null;
}
