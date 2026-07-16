/// <reference types="chrome" />

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SELECTION" })
  } catch {
    // Content script may not be injected yet (page was open before extension loaded).
    // Dynamically inject it and retry.
    try {
      const manifest = chrome.runtime.getManifest()
      const cs = manifest.content_scripts?.find((cs) =>
        cs.matches?.includes("<all_urls>"),
      )
      if (cs?.js?.length) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: cs.js,
        })
      }
      if (cs?.css?.length) {
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: cs.css,
        })
      }
      // Retry after injection
      await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SELECTION" })
    } catch (err) {
      // Still failed — likely a restricted page (chrome://, etc.)
      console.warn(
        "TextSnag: Cannot run on this page. Restricted pages (chrome://, chrome-extension://) are not supported.",
        err,
      )
    }
  }
})
