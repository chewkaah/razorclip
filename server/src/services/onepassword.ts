/**
 * 1Password CLI integration for resolving op:// secret references.
 *
 * Connections can store an op:// reference in their `secretRef` field
 * (e.g. "op://Razorclip/Stripe/api-key"). This module resolves those
 * references to plaintext values using the `op` CLI.
 *
 * Requirements:
 *   - 1Password CLI (`op`) installed and in PATH
 *   - Service account token in OP_SERVICE_ACCOUNT_TOKEN env var
 *     OR an active `op signin` session
 */
import { execSync } from "child_process";

const OP_REF_RE = /^op:\/\/.+\/.+\/.+$/;

/** Check if a string is a 1Password reference. */
export function isOpRef(ref: string | null | undefined): ref is string {
  return typeof ref === "string" && OP_REF_RE.test(ref);
}

/** Resolve a 1Password reference to its plaintext value. Returns null on failure. */
export function resolveOpRef(ref: string): string | null {
  if (!isOpRef(ref)) return null;

  try {
    const result = execSync(`op read "${ref}"`, {
      timeout: 10_000,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });
    return result.toString().trim();
  } catch (err) {
    console.warn(`[1password] Failed to resolve ${ref}:`, (err as Error).message?.split("\n")[0]);
    return null;
  }
}

/** Check if the 1Password CLI is available and authenticated. */
export function checkOpAvailability(): { available: boolean; error?: string } {
  try {
    const version = execSync("op --version", { timeout: 5_000, stdio: ["pipe", "pipe", "pipe"] });
    return { available: true };
  } catch {
    return { available: false, error: "1Password CLI (op) not found in PATH" };
  }
}

/**
 * Resolve an API key for a connection, checking multiple sources in order:
 * 1. 1Password op:// reference (from secretRef field)
 * 2. Plaintext key in metadata.apiKey or metadata.bearerToken
 * 3. Environment variable fallback
 */
export function resolveConnectionKey(
  conn: { secretRef: string | null; metadata: unknown },
  envFallback?: string,
): string | null {
  // 1. Try 1Password reference
  if (isOpRef(conn.secretRef)) {
    const resolved = resolveOpRef(conn.secretRef);
    if (resolved) return resolved;
  }

  // 2. Try metadata
  const meta = conn.metadata as Record<string, unknown> | null;
  if (meta?.apiKey && typeof meta.apiKey === "string") return meta.apiKey;
  if (meta?.bearerToken && typeof meta.bearerToken === "string") return meta.bearerToken;

  // 3. Env fallback
  if (envFallback) return process.env[envFallback] ?? null;

  return null;
}
