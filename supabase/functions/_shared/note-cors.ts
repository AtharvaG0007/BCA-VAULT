// Exact origins only. Preview deployments must be explicitly configured by the operator.
const DEFAULT_ORIGINS = [
  "https://bca-vault.portalbcavault.workers.dev",
  "https://bcavault.in",
  "https://www.bcavault.in",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:4173",
];

export function getNoteCorsHeaders(request: Request, configuredOrigins = ""): Record<string, string> {
  const allowed = new Set(DEFAULT_ORIGINS);
  for (const value of configuredOrigins.split(",")) {
    const candidate = value.trim();
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" && url.origin === candidate) allowed.add(candidate);
    } catch { /* Ignore invalid configuration; never grant wildcard access. */ }
  }
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, x-retry-count, traceparent, tracestate, baggage",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  const origin = request.headers.get("Origin");
  if (origin && allowed.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
