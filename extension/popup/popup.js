import {
  ensureSession,
  getOrCreateResearchSession,
  signIn,
  signOut,
  upsertListingMerge,
} from "../lib/supabase.js";
import { WEB_APP_URL } from "../config.js";

const statusEl = document.getElementById("status");
const previewEl = document.getElementById("preview");
const authSection = document.getElementById("auth-section");
const sessionSection = document.getElementById("session-section");
const userEmailEl = document.getElementById("user-email");
const extractBtn = document.getElementById("extract");
const saveBtn = document.getElementById("save");
const openAppBtn = document.getElementById("open-app");
const signInBtn = document.getElementById("sign-in");
const signOutBtn = document.getElementById("sign-out");

let latestListing = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function showPreview(listing) {
  latestListing = listing;
  previewEl.classList.remove("hidden");
  previewEl.textContent = JSON.stringify(
    {
      pageType: listing.pageType,
      title: listing.title,
      category: listing.category,
      price: listing.priceText,
      seller: listing.sellerName,
      tags: listing.tags?.slice(0, 8),
      delivery: listing.deliveryTime,
      packages: listing.packages?.length ?? 0,
      faq: listing.faq?.length ?? 0,
    },
    null,
    2
  );
  saveBtn.disabled = false;
}

async function refreshAuthUi() {
  const session = await ensureSession();
  if (session?.user) {
    authSection.classList.add("hidden");
    sessionSection.classList.remove("hidden");
    userEmailEl.textContent = session.user.email || "Signed in";
  } else {
    authSection.classList.remove("hidden");
    sessionSection.classList.add("hidden");
    userEmailEl.textContent = "";
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] ?? null;
}

signInBtn?.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  setStatus("Signing in…");
  try {
    await signIn(email, password);
    await refreshAuthUi();
    setStatus("Signed in. Extract a Fiverr listing to save research.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Sign in failed.");
  }
});

signOutBtn?.addEventListener("click", async () => {
  await signOut();
  await chrome.storage.local.remove("active_research_session_id");
  await refreshAuthUi();
  setStatus("Signed out.");
});

extractBtn?.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.id || !tab.url?.includes("fiverr.com")) {
    setStatus("Open a Fiverr page first, then extract.");
    return;
  }

  setStatus("Extracting observable listing data…");
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "EXTRACT_LISTING",
    });
    if (!response?.ok) {
      setStatus(response?.message || "Extraction failed. Reload the Fiverr tab.");
      return;
    }
    showPreview(response.listing);
    setStatus("Listing extracted. Sign in and save to your workspace.");
  } catch {
    setStatus("Could not reach the page script. Reload the Fiverr tab and try again.");
  }
});

saveBtn?.addEventListener("click", async () => {
  if (!latestListing) {
    setStatus("Extract a listing first.");
    return;
  }

  setStatus("Saving to workspace…");
  try {
    const sessionId = await getOrCreateResearchSession(
      `Fiverr research — ${new Date().toLocaleDateString()}`,
      latestListing.title || latestListing.sourceUrl
    );
    await upsertListingMerge(latestListing, sessionId);
    setStatus("Saved. Open Research in the web app to review.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Save failed.");
  }
});

openAppBtn?.addEventListener("click", () => {
  chrome.tabs.create({ url: `${WEB_APP_URL}/research` });
});

(async function init() {
  await refreshAuthUi();
  const tab = await getActiveTab();
  if (tab?.url?.includes("fiverr.com")) {
    setStatus("Fiverr page detected. Extract observable listing fields.");
  } else {
    setStatus("Open a Fiverr gig or search page to begin research.");
  }
})();
