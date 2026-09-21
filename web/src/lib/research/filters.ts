/** Patterns that produce shallow, non-evidence-based “discoveries”. */
export const BANNED_GENERIC_PATTERNS = [
  /\bbasic\s+package\b/i,
  /\bpremium\s+package\b/i,
  /\bwith\s+revisions?\b/i,
  /\bfor\s+a\s+specific\s+niche\b/i,
  /\bcheap\b/i,
  /\bbest\b/i,
  /\btop\s+rated\b/i,
  /\bhire\s+someone\s+for\b/i,
  /\bbuyers?\s+who\s+need\b/i,
  /\bcore\s+deliverable\b/i,
  /\brevision\s+pack\b/i,
  /\brush\s+delivery\b/i,
  /\bgeneral\s+freelance\s+service\b/i,
  /^custom\s+[a-z0-9]+$/i,
];

export function isGenericNoise(label: string): boolean {
  const text = label.trim();
  if (!text) return true;
  if (BANNED_GENERIC_PATTERNS.some((p) => p.test(text))) return true;
  // Single bare platform word alone is too broad to list as a "branch"
  return false;
}

export function dedupeFindingsByLabel<T extends { label: string }>(
  items: T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = item.label.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    if (isGenericNoise(item.label)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
