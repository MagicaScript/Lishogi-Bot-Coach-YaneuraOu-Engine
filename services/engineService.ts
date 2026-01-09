
import { Settings } from '../types';

interface EngineAnalysis {
  score: number; // CP (centipawns)
  bestMove?: string;
  mate?: number; // moves to mate
}

// Type compatible with the Logger from context
type LoggerFn = (source: 'YaneuraOu', type: 'info'|'success'|'error'|'request'|'response', summary: string, details?: any) => void;

// Singleton Engine Instance
let engine: any = null;
let engineInitPromise: Promise<any> | null = null;
let currentAnalysisCallback: ((analysis: EngineAnalysis) => void) | null = null;
let currentAnalysisConfig: { sfen: string } | null = null;
let currentLogger: LoggerFn | null = null;

// Helper to load script dynamically
const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
    });
};

// Helper to load engine only once
async function getEngine(log?: LoggerFn) {
  if (engine) return engine;
  if (engineInitPromise) return engineInitPromise;

  engineInitPromise = (async () => {
    // 0. Pre-check for SharedArrayBuffer (Security Context)
    if (typeof SharedArrayBuffer === 'undefined') {
        const errorMsg = "SharedArrayBuffer is missing. The app must be served with 'Cross-Origin-Opener-Policy: same-origin' and 'Cross-Origin-Embedder-Policy: require-corp' headers.";
        log?.('YaneuraOu', 'error', "Environment Error", { message: errorMsg });
        throw new Error(errorMsg);
    }

    try {
      log?.('YaneuraOu', 'info', "Loading YaneuraOu JS Glue...");
      await loadScript('/wasm/lib/yaneuraou.material9.js');
      
      const factory = (window as any).YaneuraOu_Material9;
      if (!factory) throw new Error("YaneuraOu global factory not found.");

      log?.('YaneuraOu', 'info', "Initializing WASM...");
      
      // Initialize the module with correct locator for the worker and wasm binary
      const instance = await factory({
          locateFile: (path: string, prefix: string) => {
              if (path.endsWith('.worker.js')) return '/wasm/lib/yaneuraou.material9.worker.js';
              if (path.endsWith('.wasm')) return '/wasm/lib/yaneuraou.material9.wasm';
              return prefix + path;
          }
      });

      instance.addMessageListener((line: string) => {
        processEngineLine(line);
      });

      // 1. Initialize USI
      instance.postMessage('usi');
      
      log?.('YaneuraOu', 'success', "Engine Initialized (YaneuraOu Material9)");

      engine = instance;
      return instance;
    } catch (e: any) {
      log?.('YaneuraOu', 'error', "Failed to load YaneuraOu WASM", e.message);
      console.error("Failed to load YaneuraOu WASM:", e);
      engineInitPromise = null;
      throw e;
    }
  })();

  return engineInitPromise;
}

// Variables to track analysis state
let currentScoreCP = 0;
let currentMate: number | undefined = undefined;
let currentBestMove = "";

function processEngineLine(line: string) {
  // Parse "info ... score cp 100 ..." or "info ... score mate 5 ..."
  if (line.startsWith('info') && line.includes('score')) {
    const mateMatch = line.match(/score mate (-?\d+)/);
    const cpMatch = line.match(/score cp (-?\d+)/);

    if (mateMatch) {
      currentMate = parseInt(mateMatch[1]);
      currentScoreCP = currentMate > 0 ? 30000 : -30000;
    } else if (cpMatch) {
      const rawCp = parseInt(cpMatch[1]);
      currentScoreCP = rawCp;
      currentMate = undefined;
    }
  }

  // Parse "bestmove 7g7f"
  if (line.startsWith('bestmove')) {
    const parts = line.split(' ');
    currentBestMove = parts[1];
    
    // Resolve the current analysis
    if (currentAnalysisCallback) {
        // Normalize Score:
        // YaneuraOu (USI) typically returns score from Side-to-Move perspective.
        let finalScore = currentScoreCP;
        if (currentAnalysisConfig && currentAnalysisConfig.sfen.includes(' w ')) {
            finalScore = -finalScore;
        }

        if (currentLogger) {
            currentLogger('YaneuraOu', 'response', `Analysis Complete: ${finalScore} cp, Best: ${currentBestMove}`, {
                rawScore: currentScoreCP,
                mate: currentMate,
                bestMove: currentBestMove,
                sfen: currentAnalysisConfig?.sfen
            });
        }

        currentAnalysisCallback({
            score: finalScore,
            bestMove: currentBestMove,
            mate: currentMate
        });
        currentAnalysisCallback = null; // Clear callback
    }
  }
}

export const analyzePosition = async (
  sfen: string,
  settings: Settings,
  log?: LoggerFn
): Promise<EngineAnalysis> => {
  const fallback: EngineAnalysis = { score: 0 };

  if (!settings.engineConfig.enabled) {
    log?.('YaneuraOu', 'info', "Engine is disabled in settings");
    return fallback;
  }

  try {
    const inst = await getEngine(log);
    
    return new Promise((resolve) => {
        currentAnalysisCallback = null;
        currentLogger = log || null;

        currentAnalysisCallback = (result) => {
            resolve(result);
        };
        
        currentAnalysisConfig = { sfen };
        
        log?.('YaneuraOu', 'request', `Analyzing Position...`);

        // USI Protocol
        inst.postMessage('isready'); // Ensure engine is ready
        inst.postMessage(`position sfen ${sfen}`);
        inst.postMessage('go btime 0 wtime 0 byoyomi 1000'); // Simple go command with 1s thought
    });

  } catch (error: any) {
    if (!log) console.error("Engine Analysis Failed:", error);
    return fallback;
  }
};

export const getScoreDescription = (score: number, isBlackTurn: boolean): string => {
    if (score > 20000 || score < -20000) return "Checkmate found!";
    if (score > 2000) return "Sente (Black) is winning decisively!";
    if (score < -2000) return "Gote (White) is winning decisively!";
    if (score > 800) return "Sente (Black) has a strong advantage.";
    if (score < -800) return "Gote (White) has a strong advantage.";
    if (score > 200) return "Sente (Black) is slightly better.";
    if (score < -200) return "Gote (White) is slightly better.";
    return "The position is roughly equal.";
};
