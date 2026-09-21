import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config.js";

const SESSION_KEY = "deepsearch_supabase_session";

export async function getStoredSession() {
  const result = await chrome.storage.local.get(SESSION_KEY);
  return result[SESSION_KEY] ?? null;
}

export async function setStoredSession(session) {
  if (!session) {
    await chrome.storage.local.remove(SESSION_KEY);
    return;
  }
  await chrome.storage.local.set({ [SESSION_KEY]: session });
}

async function authFetch(path, { method = "GET", body, accessToken } = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message =
      data?.error_description ||
      data?.msg ||
      data?.message ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function signIn(email, password) {
  const data = await authFetch("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });

  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    user: data.user,
  };
  await setStoredSession(session);
  return session;
}

export async function signOut() {
  const session = await getStoredSession();
  if (session?.access_token) {
    try {
      await authFetch("/auth/v1/logout", {
        method: "POST",
        accessToken: session.access_token,
      });
    } catch {
      // Ignore logout network errors; clear local session anyway.
    }
  }
  await setStoredSession(null);
}

export async function ensureSession() {
  const session = await getStoredSession();
  if (!session?.access_token) return null;

  // Soft expiry check — refresh if needed
  if (session.expires_at && session.expires_at * 1000 < Date.now() + 60_000) {
    if (!session.refresh_token) {
      await setStoredSession(null);
      return null;
    }
    try {
      const data = await authFetch("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: session.refresh_token },
      });
      const next = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        user: data.user ?? session.user,
      };
      await setStoredSession(next);
      return next;
    } catch {
      await setStoredSession(null);
      return null;
    }
  }

  return session;
}

export async function upsertListingMerge(listing, researchSessionId) {
  const session = await ensureSession();
  if (!session?.access_token || !session.user?.id) {
    throw new Error("Sign in to save research.");
  }

  const row = {
    user_id: session.user.id,
    research_session_id: researchSessionId,
    marketplace: listing.marketplace ?? "Fiverr",
    page_type: listing.pageType ?? "other",
    source_url: listing.sourceUrl,
    title: listing.title,
    category: listing.category,
    tags: listing.tags ?? [],
    description: listing.description,
    price_text: listing.priceText,
    price_amount: listing.priceAmount,
    currency: listing.currency,
    reviews_count: listing.reviewsCount,
    rating: listing.rating,
    seller_name: listing.sellerName,
    seller_level: listing.sellerLevel,
    delivery_time: listing.deliveryTime,
    packages: listing.packages ?? [],
    faq: listing.faq ?? [],
    raw_observable: listing.rawObservable ?? {},
    extracted_at: new Date().toISOString(),
  };

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  };

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/marketplace_listings?on_conflict=user_id,source_url`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(row),
    }
  );

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.hint || `Save failed (${response.status})`
    );
  }

  return Array.isArray(data) ? data[0] : data;
}

export async function getOrCreateResearchSession(title, query) {
  const session = await ensureSession();
  if (!session?.access_token || !session.user?.id) {
    throw new Error("Sign in to save research.");
  }

  const stored = await chrome.storage.local.get("active_research_session_id");
  if (stored.active_research_session_id) {
    return stored.active_research_session_id;
  }

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/research_sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_id: session.user.id,
      title,
      query,
      status: "in_progress",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Could not create research session.");
  }

  const created = Array.isArray(data) ? data[0] : data;
  await chrome.storage.local.set({
    active_research_session_id: created.id,
  });
  return created.id;
}
