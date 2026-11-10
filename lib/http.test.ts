import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientAddressFromHeaders, isSameOriginRequest } from "./http";

function requestHeaders(values: Record<string, string>): Headers {
  return new Headers(values);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isSameOriginRequest", () => {
  it("accepts a request matching the request host", () => {
    expect(isSameOriginRequest(requestHeaders({
      origin: "http://localhost:3000",
      host: "localhost:3000",
    }))).toBe(true);
  });

  it("accepts a port-forwarded browser origin that matches its referer", () => {
    expect(isSameOriginRequest(requestHeaders({
      origin: "https://forwarded-tunnel.example",
      host: "localhost:3000",
      referer: "https://forwarded-tunnel.example/dashboard",
      "sec-fetch-site": "same-origin",
    }))).toBe(true);
  });

  it("rejects a cross-origin request even when its host is forwarded", () => {
    expect(isSameOriginRequest(requestHeaders({
      origin: "https://attacker.example",
      host: "localhost:3000",
      "x-forwarded-host": "attacker.example",
      referer: "https://attacker.example/",
      "sec-fetch-site": "cross-site",
    }))).toBe(false);
  });

  it("accepts the configured canonical application origin", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://momenique.example");
    expect(isSameOriginRequest(requestHeaders({
      origin: "https://momenique.example",
      host: "localhost:3000",
    }))).toBe(true);
  });

  it("rejects missing or malformed origins", () => {
    expect(isSameOriginRequest(requestHeaders({ host: "localhost:3000" }))).toBe(false);
    expect(isSameOriginRequest(requestHeaders({ origin: "not-an-origin", host: "localhost:3000" }))).toBe(false);
  });
});

describe("getClientAddressFromHeaders", () => {
  it("prefers a valid platform-provided real IP", async () => {
    expect(getClientAddressFromHeaders({
      "x-real-ip": "203.0.113.8",
      "x-forwarded-for": "198.51.100.10, 203.0.113.7",
    })).toBe("203.0.113.8");
  });

  it("uses the last valid forwarded address and ignores client-prepended values", async () => {
    expect(getClientAddressFromHeaders({
      "x-forwarded-for": "192.0.2.111, not-an-ip, 203.0.113.9",
    })).toBe("203.0.113.9");
  });

  it("falls back to a shared unknown bucket if proxy headers are invalid", async () => {
    expect(getClientAddressFromHeaders({ "x-forwarded-for": "spoofed" })).toBe("unknown");
  });
});
