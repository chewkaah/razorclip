/**
 * Agent Avatar Registry — single source of truth for all agent images.
 *
 * EVERY page that shows agent avatars MUST import from here.
 * No more scattered avatar URLs across pages.
 *
 * These are the "viby background" style from Stitch batch 1 (home_command_center).
 * More abstract/artistic, not the face renders.
 */

export type AgentSlug = "dante" | "brent" | "rex" | "scout" | "nova" | "victor";

export const AGENT_AVATARS: Record<AgentSlug, string> = {
  // Purple crystalline/floral — Stitch home_command_center
  dante: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLuriebWn3lMiulmrlkNqFjx0n8dj9_QaKveGF1dBdHOvh8fx0WmmBt8zkXk4cOsyan8p-bY3Dqanyk3nJvOJca1B9VZ0bVFRGKoKTtTGq6sYxQoseH0nxiWJxfG3qPBvi1E7Umg3A2mna9pYOvdY1D7CoytZXNqiNCLGc3X5f-j5sezt96Rgb4QKxvP7Mdn_F7PPvzp61ISnPBPfGymWlCUOLGoOC4kiTg3Y0ngTMoKv4yd7dgebhbvTiFwOQuL4eEwcDTlbL88c",

  // Blue flowing liquid silk — Stitch home_command_center
  brent: "https://lh3.googleusercontent.com/aida-public/AB6AXuCSn-wk4OwSaDvgNuWaxjHcenXClEf5M4UG7PDZLXY6hy7x5RmSgdZYPcQbT2iqnx1PRYsPTSU1hCmwy-ORAb2h-SCq_rY40-iwuwoTRPQFGCEUlWtX1dgFObzJzbbwrkzXwtdLTdg6yVSVUB6xlIdF-eagI4X9ZWB2t_KJv3ON45sdjUmAs9vHfZmAZhVVCAOxXmZJ-bkmKAqGcfGzSgtq2JZME_f_GU0FdNAyKGLUdvrmgQV5mrlRHNPqXeragLijvTXAbCv24Ns",

  // Green futuristic architectural lines — Stitch home_command_center
  rex: "https://lh3.googleusercontent.com/aida-public/AB6AXuAqWoFxgqgZ-jqHqwbJkFS4NgFIUFxz-VASyG4oss9fmTXutlR6_oWQ--qxAPgh5XmyLFOMWfgmnMwiKHWzeJaMWEqlT9DaMkVGU2pj7AR0IkTXyh4qYGaFXh5NnyzTex_w80alC1SdTM9mxqpoa2VpKu67_BiWvxEMkfajuawkFKQlJupExI7_dw56BUFEcqi6SO1KUzfKZut9-fRY1bKzUMXGnnejQ8lMh1t-SwnUcClhPCTlvsHzvYr_GBgEZcbJV1dBR9T3LyA",

  // Orange energy nebula — Stitch home_command_center
  scout: "https://lh3.googleusercontent.com/aida-public/AB6AXuA0Oi3HQrfP4mpbcl0gMtTis--FgNpRhPXb_hZnlWypWyHy5N6zTjIWqd1bRIefrswLMU0ZQfqHluP4M_cmvaqzT_uQEeKcj4KCb4xG4KkvGgVmFVDRuI8xOYxlHCUeUoyJ3e_1rWzI_sRFHZj0fyIgz9jY8EstoYelnidJpOFY3Il8ViAVMraeYgUSZesYmqCkmaA2qwmxj3-B-WrdmlwsP95bHaoKcy-Z2WsVllbHXMaCTAFcUVnne5G_ATa5uS1_cOI5voqBXu8",

  // Pink ethereal clouds — Stitch home_command_center
  nova: "https://lh3.googleusercontent.com/aida-public/AB6AXuAUhpMshB7axOeeuDWZC2ou7GUMGNpOiX6xwLXGz_TH-_OdQuk7FVVbk2RNN0sHpN0NUF-_0otbib8mx11D4GPgWEtYN_ZZw2q0O7TFCfITO7OcgyFvThVTKgiFU1P1zmW2Z-O2DSNjORtTv1Xg61kxN4IY-IEqIDGTtn80sCejetfrRmteYKqCw48x1D7EFE3Cu-IzcZbvXRzsjxD4dCUFs4yxdMDafQLOa8DNbw8S0PpQyC0E9jz5Nn0bdbAIOHW5jWXeRVwHDyQ",

  // Golden liquid mercury — Stitch home_command_center
  victor: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLeuwv6RmW-13TCLqBuzw5VecVR0ARie2zo7YqTR3QpR1I7qXATINWXMwp0FnszEqD0Y0rc16aFwBz7YbNzxtBBWyOpJPCq3q4qX0EnYRqcyxcDxLSVgh3jCP2Y1VllUkfv1a_rpSoLXm32Xv_-a8L2IQHzLvYkgbBrs6RbR90qd3bR6MNN_FG6QbMrW1RvJSqxn3GTdruof8JvDw9_kXOxiwWQ4v62f9lZbBSfGMbGoP2L_sghW6QSbk6xGGGlvdMK3jwmfirZhA",
};

/** Get avatar URL for an agent by name — falls back to null for non-registry agents */
export function getAgentAvatar(name: string): string | null {
  const slug = name.toLowerCase().trim();
  return (slug in AGENT_AVATARS) ? AGENT_AVATARS[slug as AgentSlug] : null;
}
