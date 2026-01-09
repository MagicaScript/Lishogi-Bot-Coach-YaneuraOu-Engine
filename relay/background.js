// background.js

let latest = null;
const ports = new Set();

// Receive messages from content scripts (lishogi pages)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "LISHOGI_STATE") return;

  // Cache the most recent state
  latest = msg;

  // Push update to all connected coach pages
  for (const port of ports) {
    try {
      port.postMessage({
        type: "LISHOGI_STATE",
        payload: msg.payload
      });
    } catch {
      // Ignore individual port errors
    }
  }
});

// Allow external pages (localhost coach) to connect
chrome.runtime.onConnectExternal.addListener((port) => {
  ports.add(port);

  // Send snapshot immediately upon connection (if available)
  if (latest) {
    try {
      port.postMessage({
        type: "LISHOGI_STATE_SNAPSHOT",
        payload: latest.payload
      });
    } catch {}
  }

  port.onDisconnect.addListener(() => {
    ports.delete(port);
  });
});
