
import React, { useState, useEffect, useRef } from 'react';
import ShogiBoard from './components/ShogiBoard';
import CoachWidget from './components/CoachWidget';
import LogConsole from './components/LogConsole';
import { LogProvider, useLogger } from './context/LogContext';
import { Settings, CoachState, CoachDefinition, Emotion, GameScenario, ConnectionStatus } from './types';
import { SCENARIOS, DEFAULT_COACHES } from './constants';
import { generateCoachResponse } from './services/geminiService';
import { checkLishogiAvailable, parseRawLishogiData } from './services/lishogiService';
import { analyzePosition } from './services/engineService';

// Separate inner component to use the Context Hook
const AppContent: React.FC = () => {
  const { addLog } = useLogger();

  // Settings State
  const [settings, setSettings] = useState<Settings>({
    activeCoachId: DEFAULT_COACHES[1].id,
    customCoaches: [],
    volume: 0.8,
    playerName: 'Player',
    enabled: true,
    textLanguage: 'English',
    audioLanguage: 'English',
    ttsProvider: 'gemini',
    customTtsEndpoint: 'http://127.0.0.1:9880',
    llmConfig: {
      apiKey: '',
      modelName: 'gemini-3-flash-preview',
      baseUrl: 'https://generativelanguage.googleapis.com'
    },
    engineConfig: {
      enabled: true,
      apiUrl: ''
    },
    syncMode: 'manual',
    extensionId: ''
  });

  const [currentScenario, setCurrentScenario] = useState<GameScenario>(SCENARIOS[0]);
  
  // Connection State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  
  // Refs for polling to avoid dependency loops
  const lastSyncTimeRef = useRef<number>(0);
  
  // Coach State
  const [coachState, setCoachState] = useState<CoachState>({
    isThinking: false,
    currentMessage: null,
    history: [],
    emotion: Emotion.NEUTRAL
  });

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Sync Refs
  const syncIntervalRef = useRef<number | null>(null);
  const lastProcessedSfenRef = useRef<string>("");
  const debounceTimerRef = useRef<number | null>(null);
  const extensionPortRef = useRef<any>(null);

  // Initialize AudioContext
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    addLog('System', 'info', 'Application Initialized');
  }, []);

  // --- EFFECT: Handle Mode Switching (Reset State) ---
  useEffect(() => {
    if (settings.syncMode === 'live') {
      // RESET state so we pick up the game immediately even if started
      lastProcessedSfenRef.current = ""; 
      setConnectionStatus('connecting');
      setConnectionError(null);
      addLog('System', 'info', 'Switched to Live Mode');
    } else {
      setConnectionStatus('disconnected');
      if (extensionPortRef.current) {
          extensionPortRef.current.disconnect();
          extensionPortRef.current = null;
      }
      addLog('System', 'info', 'Switched to Manual Mode');
    }
  }, [settings.syncMode]);

  // --- EFFECT: Chrome Extension Connection ---
  useEffect(() => {
      if (settings.syncMode !== 'live') return;

      // 1. Try connecting to Extension if ID is provided
      if (settings.extensionId && (window as any).chrome && (window as any).chrome.runtime) {
          try {
              const port = (window as any).chrome.runtime.connect(settings.extensionId);
              extensionPortRef.current = port;

              port.onMessage.addListener((msg: any) => {
                  if (msg.type === 'LISHOGI_STATE' || msg.type === 'LISHOGI_STATE_SNAPSHOT') {
                      const scenario = parseRawLishogiData(msg.payload);
                      if (scenario) {
                          handleLishogiUpdate(scenario);
                      }
                  }
              });

              port.onDisconnect.addListener(() => {
                  setConnectionStatus('error');
                  setConnectionError('Extension Disconnected');
                  addLog('Lishogi', 'error', 'Extension Disconnected');
                  extensionPortRef.current = null;
              });

              addLog('Lishogi', 'info', 'Connected to Extension');
          } catch (e) {
              console.error(e);
              setConnectionError('Invalid Extension ID or Extension not installed');
          }
      }

      // 2. Fallback: Window Message Listener (for legacy Bridge script)
      const handleWindowMessage = (event: MessageEvent) => {
         if (event.data && event.data.type === 'LISHOGI_STATE') {
             const rawData = event.data.payload;
             const scenario = parseRawLishogiData(rawData);
             if (scenario) {
                 handleLishogiUpdate(scenario);
             }
         }
      };
      window.addEventListener('message', handleWindowMessage);

      return () => {
          window.removeEventListener('message', handleWindowMessage);
          if (extensionPortRef.current) {
              extensionPortRef.current.disconnect();
          }
      };
  }, [settings.syncMode, settings.extensionId]);

  // --- CORE LOGIC: Handle Updates with Debounce ---
  const handleLishogiUpdate = (liveData: GameScenario) => {
      // Always update status
      setConnectionStatus('connected');
      setConnectionError(null);
      const now = Date.now();
      setLastSyncTime(now);
      lastSyncTimeRef.current = now;

      // Has the board changed?
      if (liveData.sfen !== lastProcessedSfenRef.current) {
          lastProcessedSfenRef.current = liveData.sfen;
          
          addLog('Lishogi', 'info', `Move Received: ${liveData.lastMove}`, { sfen: liveData.sfen, ply: liveData.id });

          // 1. UPDATE VISUALS IMMEDIATELY
          setCurrentScenario(liveData);

          // 2. DEBOUNCE COACH/ENGINE
          // Clear any pending coach reaction
          if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
          }

          setCoachState(prev => ({
              ...prev,
              isThinking: true, // Show loading spinner immediately
              currentMessage: "Observing..." 
          }));

          // Wait 2.5 seconds. If another move comes (AI Reply), this timer is killed 
          // and restarted for the NEW move. This effectively groups moves.
          debounceTimerRef.current = window.setTimeout(() => {
              triggerCoachAnalysis(liveData);
          }, 2500); 
      }
  };

  const triggerCoachAnalysis = async (scenario: GameScenario) => {
      // 1. Engine Analysis (if enabled)
      let engineEval = 0;
      if (settings.engineConfig.enabled) {
          setCoachState(prev => ({
              ...prev,
              currentMessage: "Consulting YaneuraOu..."
          }));
          
          // PASS addLog to analyzePosition. Log source is now 'YaneuraOu' internally
          const analysis = await analyzePosition(scenario.sfen, settings, addLog as any);
          
          engineEval = analysis.score;
          scenario.evalScore = engineEval;
          scenario.bestMove = analysis.bestMove;
          // Update scenario with Engine data
          setCurrentScenario(prev => ({...prev, evalScore: engineEval, bestMove: analysis.bestMove}));
      }

      // 2. Trigger Coach Persona
      await handleCoachReaction(scenario);
  };

  const playAudio = async (buffer: AudioBuffer) => {
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioContextRef.current.createGain();
    gainNode.gain.value = settings.volume;
    source.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    source.start();
  };

  const handleCoachReaction = async (scenario: GameScenario) => {
    setCoachState(prev => ({
      ...prev,
      isThinking: true,
      currentMessage: "Analyzing position...",
      history: [
        ...prev.history,
        {
           id: Date.now().toString() + '_sys',
           sender: 'system',
           text: `Move: ${scenario.lastMove} | Eval: ${scenario.evalScore}`,
           emotion: Emotion.NEUTRAL,
           timestamp: Date.now()
        }
      ]
    }));

    // Pass the logger function to the service
    const response = await generateCoachResponse(scenario, settings, addLog);

    if (response.audioBuffer && settings.volume > 0) {
      playAudio(response.audioBuffer);
    }

    setCoachState(prev => ({
      ...prev,
      isThinking: false,
      currentMessage: null,
      emotion: response.emotion,
      history: [
        ...prev.history,
        {
          id: Date.now().toString(),
          sender: 'coach',
          text: response.text,
          emotion: response.emotion,
          timestamp: Date.now()
        }
      ]
    }));
  };

  const handleManualSimulate = (index: number) => {
      const s = SCENARIOS[index];
      // Reset ref for manual mode so live mode can re-trigger if switched back
      lastProcessedSfenRef.current = s.sfen; 
      setCurrentScenario(s);
      
      addLog('System', 'info', `Manual Simulation: ${s.name}`);

      // Manual mode -> Instant reaction (no debounce)
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      triggerCoachAnalysis(s);
  };

  return (
    <div className="min-h-screen bg-shogi-bg text-shogi-text flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-shogi-dark p-4 shadow-md flex justify-between items-center z-10">
         <div className="flex items-center space-x-3">
            <i className="fa-solid fa-shogi-piece text-shogi-accent text-2xl"></i>
            <h1 className="text-xl font-bold tracking-tight">Lishogi <span className="text-shogi-accent">Bot Coach</span></h1>
         </div>
         <div className="flex items-center space-x-4">
             {/* Sync Controls */}
             <div className="flex flex-col items-end">
                <div className="flex items-center space-x-2 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                    <div className={`w-2 h-2 rounded-full transition-colors duration-300
                        ${connectionStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                          connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                          connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'}
                    `}></div>
                    <select 
                        value={settings.syncMode}
                        onChange={(e) => {
                            setSettings({...settings, syncMode: e.target.value as 'manual' | 'live'});
                            if(e.target.value === 'manual') setConnectionError(null);
                        }}
                        className="bg-transparent text-xs font-bold text-gray-300 focus:outline-none cursor-pointer"
                    >
                        <option value="manual">Manual Simulation</option>
                        <option value="live">Live Sync (Lishogi)</option>
                    </select>
                </div>
             </div>
         </div>
      </header>
      
      {/* Error / Status Bar */}
      {settings.syncMode === 'live' && (
        <div className={`text-center py-1 text-xs font-mono border-b transition-colors duration-300 ${
            connectionStatus === 'connected' ? 'bg-green-900/20 text-green-400 border-green-900/50' : 
            connectionStatus === 'error' || connectionStatus === 'disconnected' ? 'bg-red-900/20 text-red-400 border-red-900/50' :
            'bg-yellow-900/20 text-yellow-400 border-yellow-900/50'
        }`}>
            {connectionStatus === 'connected' ? (
                <span><i className="fa-solid fa-link mr-1"></i> Connected to Lishogi | Last Update: {new Date(lastSyncTime).toLocaleTimeString()}</span>
            ) : connectionStatus === 'connecting' ? (
                <span><i className="fa-solid fa-satellite-dish mr-1 animate-pulse"></i> Waiting for data...</span>
            ) : (
                <span><i className="fa-solid fa-circle-exclamation mr-1"></i> {connectionError || "Disconnected"}</span>
            )}
        </div>
      )}

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
         <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-[#312e2b] to-[#262421]">
            <ShogiBoard sfen={currentScenario.sfen} />
            
            <div className="mt-4 text-center">
                <div className="text-xs font-mono text-gray-600 max-w-md mx-auto truncate select-all">{currentScenario.sfen}</div>
                {settings.syncMode === 'live' && connectionStatus !== 'connected' && !settings.extensionId && (
                    <div className="mt-2 text-xs text-gray-400 max-w-[400px] mx-auto animate-pulse">
                        Enter Chrome Extension ID in Settings to start.
                    </div>
                )}
            </div>

            {settings.syncMode === 'manual' && (
                <div className="mt-8 w-full max-w-[600px] bg-[#262421] p-4 rounded-lg border border-white/5 shadow-lg">
                <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 text-center">Simulate Game State</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SCENARIOS.map((scenario, index) => (
                    <button
                        key={scenario.id}
                        disabled={coachState.isThinking}
                        onClick={() => handleManualSimulate(index)}
                        className={`p-3 rounded text-sm font-semibold transition-all duration-200 
                        ${currentScenario.id === scenario.id 
                            ? 'bg-shogi-accent text-black shadow-[0_0_15px_rgba(129,182,76,0.4)]' 
                            : 'bg-white/5 hover:bg-white/10 text-gray-300'
                        }
                        ${coachState.isThinking ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {scenario.name}
                    </button>
                    ))}
                </div>
                </div>
            )}
         </div>

         <CoachWidget 
            settings={settings}
            coachState={coachState}
            onUpdateSettings={setSettings}
            currentScenario={currentScenario}
         />

         {/* Log Console Component */}
         <LogConsole />
      </main>
    </div>
  );
};

const App: React.FC = () => {
    return (
        <LogProvider>
            <AppContent />
        </LogProvider>
    );
};

export default App;
