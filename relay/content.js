
// content.js - Runs in "ISOLATED" world.
// Listens for events from hook.js and relays to background.

window.addEventListener("LISHOGI_STATE_CAPTURED", (event) => {
  const data = event.detail;
  if (!data) return;

  try {
    chrome.runtime.sendMessage({
      type: "LISHOGI_STATE",
      payload: {
        data: data,
        ts: Date.now()
      }
    });
  } catch (e) {
    // Context invalidated (extension reloaded), ignore
  }
});
