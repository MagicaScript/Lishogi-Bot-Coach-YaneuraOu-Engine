
// hook.js - Runs in "MAIN" world.
// Accesses window.lishogi directly. No CSP issues.

(function() {
    const EVENT_NAME = "LISHOGI_STATE_CAPTURED";
    let hooked = false;

    // Helper to broadcast data to the Isolated World (content.js)
    const broadcast = (data) => {
        try {
            // Clone data to ensure it's safe for CustomEvent transport
            const safeData = JSON.parse(JSON.stringify(data));
            window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: safeData }));
        } catch (e) {
            console.error("[Lishogi Bot Coach] Broadcast Error:", e);
        }
    };

    // 1. Hook XHR to capture moves/updates
    const installHook = () => {
        if (hooked) return;
        if (!window.lishogi || !window.lishogi.xhr || !window.lishogi.xhr.json) return;

        console.log("[Lishogi Bot Coach] Installing XHR Hook...");
        
        const originalXhrJson = window.lishogi.xhr.json;

        window.lishogi.xhr.json = function(...args) {
            const result = originalXhrJson.apply(this, args);
            
            // Passthrough promise to capture data
            if (result && typeof result.then === 'function') {
                return result.then((data) => {
                    if (data && (data.steps || data.game)) {
                        console.log("[Lishogi Bot Coach] Move intercepted.");
                        broadcast(data);
                    }
                    return data;
                });
            }
            return result;
        };

        hooked = true;
    };

    // 2. Capture Initial State (if extension loads after game start)
    const captureInitialState = () => {
        if (window.lishogi && window.lishogi.modulesData && window.lishogi.modulesData.round) {
            console.log("[Lishogi Bot Coach] Initial state found.");
            broadcast(window.lishogi.modulesData.round.data);
        }
    };

    // Attempt immediately
    installHook();
    captureInitialState();

    // Poll briefly to catch late initialization of lishogi object
    const retryInterval = setInterval(() => {
        if (!hooked && window.lishogi && window.lishogi.xhr) {
            installHook();
            captureInitialState();
        }
        // Also keep checking for new game state (SPA navigation)
        if (window.lishogi && window.lishogi.modulesData && window.lishogi.modulesData.round) {
             // We could potentially check if ID changed, but for now relies on XHR
        }
        
        if (hooked) clearInterval(retryInterval);
    }, 1000);

    console.log("[Lishogi Bot Coach] Main World Script Loaded.");
})();
