import { WEB_APP_URL } from "../config.js";

chrome.runtime.onInstalled.addListener(() => {
  console.info("[DeepSearch] Extension installed — Phase 4 research ready.");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PAGE_DETECTED") {
    console.info("[DeepSearch] Page detected:", message.payload);
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "OPEN_WEB_APP") {
    const path = message.path || "/research";
    chrome.tabs.create({ url: `${WEB_APP_URL}${path}` });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
