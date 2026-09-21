// Phase 4 content script — extract observable Fiverr listing fields.
console.info("[DeepSearch] Content script loaded — marketplace research.");

chrome.runtime.sendMessage({
  type: "PAGE_DETECTED",
  payload: {
    url: window.location.href,
    title: document.title,
    marketplace: "Fiverr",
  },
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "EXTRACT_LISTING") {
    try {
      const extract = window.DeepSearchExtractors?.fiverr;
      if (!extract) {
        sendResponse({ ok: false, message: "Fiverr extractor not loaded." });
        return true;
      }
      const listing = extract();
      sendResponse({ ok: true, listing });
    } catch (error) {
      sendResponse({
        ok: false,
        message: error instanceof Error ? error.message : "Extraction failed",
      });
    }
    return true;
  }
  return false;
});
