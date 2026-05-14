import { describe, expect, it } from "vitest";
import { isIntegralOfficeMcpAuthorized } from "../routes/integral-office-mcp.js";

describe("Integral Office MCP auth", () => {
  it("rejects missing and invalid bearer tokens", () => {
    expect(isIntegralOfficeMcpAuthorized(undefined, "secret")).toBe(false);
    expect(isIntegralOfficeMcpAuthorized("Bearer nope", "secret")).toBe(false);
  });

  it("accepts the configured bearer token", () => {
    expect(isIntegralOfficeMcpAuthorized("Bearer secret", "secret")).toBe(true);
  });
});
