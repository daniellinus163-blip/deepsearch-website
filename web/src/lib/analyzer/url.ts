/**
 * Validate and normalize public Fiverr gig URLs.
 */
export function isFiverrHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "fiverr.com" || h.endsWith(".fiverr.com") || h === "www.fiverr.com";
}

export function normalizeFiverrGigUrl(raw: string): {
  ok: true;
  url: string;
} | {
  ok: false;
  message: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: "Paste a Fiverr gig URL." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, message: "That does not look like a valid URL." };
  }

  if (!isFiverrHost(parsed.hostname)) {
    return {
      ok: false,
      message: "URL must be a Fiverr link (fiverr.com).",
    };
  }

  // Typical gig: /username/gig-slug
  const parts = parsed.pathname.split("/").filter(Boolean);
  const blocked = new Set([
    "categories",
    "search",
    "users",
    "sellers",
    "inbox",
    "login",
    "join",
  ]);
  if (parts.length < 2 || blocked.has(parts[0].toLowerCase())) {
    return {
      ok: false,
      message:
        "This looks like a Fiverr page, but not a gig URL. Use a link like https://www.fiverr.com/username/gig-slug",
    };
  }

  parsed.hash = "";
  // Keep useful query minimal
  return { ok: true, url: parsed.toString() };
}
