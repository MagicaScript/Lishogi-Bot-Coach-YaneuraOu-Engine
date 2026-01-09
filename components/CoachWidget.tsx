
import React, { useState, useEffect, useRef } from 'react';
import { Settings, CoachState, CoachDefinition, Emotion, GameScenario } from '../types';
import { DEFAULT_COACHES } from '../constants';

interface CoachWidgetProps {
  settings: Settings;
  coachState: CoachState;
  onUpdateSettings: (s: Settings) => void;
  currentScenario: GameScenario;
}

const CoachWidget: React.FC<CoachWidgetProps> = ({ 
  settings, 
  coachState, 
  onUpdateSettings,
  currentScenario 
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  
  // Custom Coach Editor State
  const [isEditingCoach, setIsEditingCoach] = useState(false);
  const [newCoach, setNewCoach] = useState<CoachDefinition>({
      id: '', name: '', image: '', voice: '', personalityPrompt: '', isCustom: true
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && isHistoryExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [coachState.history, coachState.currentMessage, isHistoryExpanded]);

  // Combine defaults and custom coaches
  const allCoaches = [...DEFAULT_COACHES, ...settings.customCoaches];
  const activeCoach = allCoaches.find(c => c.id === settings.activeCoachId) || allCoaches[0];

  const getAvatarStyle = () => {
    switch (coachState.emotion) {
      case Emotion.HAPPY: return 'brightness-110 scale-105 transition-transform duration-300';
      case Emotion.CONCERNED: return 'sepia-[.3] grayscale-[.2] scale-95 transition-transform duration-300';
      case Emotion.EXCITED: return 'brightness-125 scale-110 drop-shadow-lg transition-transform duration-300';
      default: return 'transition-transform duration-300';
    }
  };

  const handleSaveCustomCoach = () => {
      if (!newCoach.name || !newCoach.personalityPrompt) return;
      const coachId = newCoach.id || `custom_${Date.now()}`;
      
      let updatedCustomCoaches = [...settings.customCoaches];
      if (newCoach.id) {
          // Edit existing
          updatedCustomCoaches = updatedCustomCoaches.map(c => c.id === newCoach.id ? {...newCoach, id: coachId} : c);
      } else {
          // Add new
          updatedCustomCoaches.push({...newCoach, id: coachId});
      }
      
      onUpdateSettings({
          ...settings,
          customCoaches: updatedCustomCoaches,
          activeCoachId: coachId
      });
      setIsEditingCoach(false);
      setNewCoach({ id: '', name: '', image: '', voice: '', personalityPrompt: '', isCustom: true });
  };

  const handleDeleteCoach = (id: string) => {
      const updated = settings.customCoaches.filter(c => c.id !== id);
      onUpdateSettings({
          ...settings,
          customCoaches: updated,
          activeCoachId: DEFAULT_COACHES[0].id // fallback
      });
  };

  const startEditCoach = (coach: CoachDefinition) => {
      // Create new based on existing template or edit custom
      if (coach.isCustom) {
          setNewCoach(coach);
      } else {
          setNewCoach({...coach, id: '', isCustom: true, name: `${coach.name} (Copy)`});
      }
      setIsEditingCoach(true);
  };

  return (
    <div className="flex flex-col h-full bg-shogi-panel text-white border-l border-white/10 w-full md:w-[400px] shadow-xl">
      
      {/* HEADER */}
      <div className="p-4 bg-black/20 flex flex-col items-center border-b border-white/5 relative transition-all">
        <div className={`rounded-full overflow-hidden border-4 border-shogi-accent mb-3 relative group transition-all duration-300 ${isHistoryExpanded ? 'w-24 h-24' : 'w-32 h-32'}`}>
             {activeCoach.image ? (
                <img 
                  src={activeCoach.image} 
                  alt="Coach Avatar" 
                  className={`w-full h-full object-cover ${getAvatarStyle()}`} 
                  onError={(e) => {
                      // Fallback if local image fails
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                  }}
                />
             ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <i className="fa-solid fa-user text-4xl text-gray-500"></i>
                </div>
             )}
             
             {/* Hidden Fallback Icon */}
             <div className="fallback-icon hidden absolute inset-0 bg-gray-800 flex items-center justify-center">
                <i className="fa-solid fa-user-xmark text-4xl text-gray-500"></i>
             </div>

             {coachState.isThinking && (
               <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                 <div className="w-8 h-8 border-4 border-shogi-accent border-t-transparent rounded-full animate-spin"></div>
               </div>
             )}
        </div>
        <h2 className="text-xl font-bold text-shogi-accent">{activeCoach.name}</h2>
        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
           {coachState.emotion}
        </span>
        
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          title="Settings"
        >
          <i className="fa-solid fa-gear text-lg"></i>
        </button>
      </div>

      {/* SETTINGS PANEL */}
      <div className={`overflow-y-auto overflow-x-hidden transition-all duration-300 bg-[#1a1816] ${isSettingsOpen ? 'max-h-[600px] border-b border-white/10' : 'max-h-0'}`}>
        <div className="p-4 space-y-5">
            
            {/* COACH SELECTION */}
            {!isEditingCoach && (
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Select Coach</label>
                        <button 
                            onClick={() => {
                                setNewCoach({ id: '', name: 'New Coach', image: '/picture/sensei.jpg', voice: 'Kore', personalityPrompt: 'You are a helpful coach.', isCustom: true });
                                setIsEditingCoach(true);
                            }}
                            className="text-xs bg-shogi-accent text-black px-2 py-1 rounded hover:opacity-80 font-bold"
                        >
                            + Create
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {allCoaches.map((c) => (
                            <div key={c.id} className={`relative group p-2 rounded border cursor-pointer flex items-center space-x-2 ${settings.activeCoachId === c.id ? 'bg-white/10 border-shogi-accent' : 'border-gray-700 hover:bg-white/5'}`}
                                 onClick={() => onUpdateSettings({ ...settings, activeCoachId: c.id })}>
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                                    {c.image ? (
                                        <img src={c.image} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLElement).style.display = 'none'} />
                                    ) : (
                                        <i className="fa-solid fa-user text-xs"></i>
                                    )}
                                </div>
                                <span className="text-xs font-bold truncate flex-1">{c.name}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); startEditCoach(c); }}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white"
                                >
                                    <i className="fa-solid fa-pen text-xs"></i>
                                </button>
                                {c.isCustom && (
                                     <button 
                                     onClick={(e) => { e.stopPropagation(); handleDeleteCoach(c.id); }}
                                     className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-200 ml-1"
                                 >
                                     <i className="fa-solid fa-trash text-xs"></i>
                                 </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* COACH EDITOR */}
            {isEditingCoach && (
                <div className="bg-black/30 p-3 rounded border border-gray-700 space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                        <span className="text-xs font-bold text-shogi-accent">Edit Coach</span>
                        <button onClick={() => setIsEditingCoach(false)} className="text-xs text-red-400">Cancel</button>
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase">Name</label>
                        <input className="w-full bg-black/50 border border-gray-600 rounded p-1 text-sm" 
                            value={newCoach.name} onChange={e => setNewCoach({...newCoach, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase">Image URL</label>
                        <input className="w-full bg-black/50 border border-gray-600 rounded p-1 text-sm" 
                            value={newCoach.image} onChange={e => setNewCoach({...newCoach, image: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase">Voice ID (Gemini) or Name</label>
                        <input className="w-full bg-black/50 border border-gray-600 rounded p-1 text-sm" 
                            value={newCoach.voice} onChange={e => setNewCoach({...newCoach, voice: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 uppercase">Personality Prompt</label>
                        <textarea className="w-full bg-black/50 border border-gray-600 rounded p-1 text-xs h-20" 
                            value={newCoach.personalityPrompt} onChange={e => setNewCoach({...newCoach, personalityPrompt: e.target.value})} />
                    </div>
                    <button onClick={handleSaveCustomCoach} className="w-full bg-shogi-accent text-black font-bold py-1 rounded text-sm">Save Coach</button>
                </div>
            )}

            {/* GENERAL SETTINGS */}
            {!isEditingCoach && (
                <>
                {/* LIVE SYNC CONFIG */}
                <div className="border-b border-gray-700 pb-3 mb-3">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Extension Sync</label>
                   <div>
                       <label className="text-[10px] text-gray-500 block mb-0.5">Chrome Extension ID</label>
                       <input 
                          type="text" 
                          placeholder="e.g. abcdefghijklmnop..."
                          value={settings.extensionId}
                          onChange={(e) => onUpdateSettings({
                              ...settings, 
                              extensionId: e.target.value
                          })}
                          className="w-full bg-black/30 border border-gray-700 rounded p-2 text-xs text-white focus:outline-none focus:border-shogi-accent"
                       />
                       <p className="text-[9px] text-gray-500 mt-1">Load 'relay' folder as Unpacked Extension to get ID.</p>
                   </div>
                </div>

                {/* LLM CONFIGURATION */}
                <div className="border-b border-gray-700 pb-3 mb-3">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Text LLM API</label>
                   <div className="space-y-2">
                       <div>
                           <label className="text-[10px] text-gray-500 block mb-0.5">Base URL</label>
                           <input 
                              type="text" 
                              placeholder="https://generativelanguage.googleapis.com"
                              value={settings.llmConfig.baseUrl}
                              onChange={(e) => onUpdateSettings({
                                  ...settings, 
                                  llmConfig: {...settings.llmConfig, baseUrl: e.target.value}
                              })}
                              className="w-full bg-black/30 border border-gray-700 rounded p-2 text-xs text-white focus:outline-none focus:border-shogi-accent"
                           />
                       </div>
                       <div>
                           <label className="text-[10px] text-gray-500 block mb-0.5">API Key</label>
                           <input 
                              type="password" 
                              placeholder="AIzaSy..."
                              value={settings.llmConfig.apiKey}
                              onChange={(e) => onUpdateSettings({
                                  ...settings, 
                                  llmConfig: {...settings.llmConfig, apiKey: e.target.value}
                              })}
                              className="w-full bg-black/30 border border-gray-700 rounded p-2 text-xs text-white focus:outline-none focus:border-shogi-accent"
                           />
                       </div>
                       <div>
                           <label className="text-[10px] text-gray-500 block mb-0.5">Model Name</label>
                           <input 
                              type="text" 
                              placeholder="gemini-3-flash-preview"
                              value={settings.llmConfig.modelName}
                              onChange={(e) => onUpdateSettings({
                                  ...settings, 
                                  llmConfig: {...settings.llmConfig, modelName: e.target.value}
                              })}
                              className="w-full bg-black/30 border border-gray-700 rounded p-2 text-xs text-white focus:outline-none focus:border-shogi-accent"
                           />
                       </div>
                   </div>
                </div>

                {/* ENGINE CONFIGURATION */}
                <div className="border-b border-gray-700 pb-3 mb-3">
                   <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase">Shogi Engine API</label>
                        <div className="flex items-center">
                            <input 
                                type="checkbox"
                                checked={settings.engineConfig.enabled}
                                onChange={(e) => onUpdateSettings({
                                    ...settings, 
                                    engineConfig: {...settings.engineConfig, enabled: e.target.checked}
                                })} 
                                className="mr-1 accent-shogi-accent"
                            />
                            <span className="text-[10px] text-gray-400">Enable</span>
                        </div>
                   </div>
                   
                   {settings.engineConfig.enabled && (
                       <div>
                           <label className="text-[10px] text-gray-500 block mb-0.5">API Endpoint (POST)</label>
                           <input 
                              type="text" 
                              placeholder="http://localhost:8080/analyze"
                              value={settings.engineConfig.apiUrl}
                              onChange={(e) => onUpdateSettings({
                                  ...settings, 
                                  engineConfig: {...settings.engineConfig, apiUrl: e.target.value}
                              })}
                              className="w-full bg-black/30 border border-gray-700 rounded p-2 text-xs text-white focus:outline-none focus:border-shogi-accent"
                           />
                           <p className="text-[9px] text-gray-500 mt-1">Expects JSON: {`{ score: number, bestMove: string }`}</p>
                       </div>
                   )}
                </div>

                <div className="flex space-x-2">
                    <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Text Language</label>
                    <select 
                        className="w-full bg-black/30 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-shogi-accent"
                        value={settings.textLanguage}
                        onChange={(e) => onUpdateSettings({...settings, textLanguage: e.target.value})}
                    >
                        <option value="English">English</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Spanish">Spanish</option>
                        <option value="Chinese">Chinese</option>
                    </select>
                    </div>
                    <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Audio Language</label>
                    <select 
                        className="w-full bg-black/30 border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-shogi-accent"
                        value={settings.audioLanguage}
                        onChange={(e) => onUpdateSettings({...settings, audioLanguage: e.target.value})}
                    >
                        <option value="English">English</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Spanish">Spanish</option>
                        <option value="Chinese">Chinese</option>
                    </select>
                    </div>
                </div>

                {/* TTS CONFIGURATION */}
                <div className="border-t border-gray-700 pt-3">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">TTS Provider</label>
                    <div className="flex space-x-2 mb-3">
                        <button 
                            className={`flex-1 py-1 text-xs rounded border ${settings.ttsProvider === 'gemini' ? 'bg-shogi-accent border-shogi-accent text-black font-bold' : 'border-gray-600 text-gray-400'}`}
                            onClick={() => onUpdateSettings({...settings, ttsProvider: 'gemini'})}
                        >
                            Gemini
                        </button>
                        <button 
                            className={`flex-1 py-1 text-xs rounded border ${settings.ttsProvider === 'custom' ? 'bg-shogi-accent border-shogi-accent text-black font-bold' : 'border-gray-600 text-gray-400'}`}
                            onClick={() => onUpdateSettings({...settings, ttsProvider: 'custom'})}
                        >
                            Custom (GPT-SoVITS)
                        </button>
                    </div>
                    {settings.ttsProvider === 'custom' && (
                        <div>
                             <label className="block text-[10px] text-gray-500 uppercase mb-1">API Endpoint (GET)</label>
                             <input 
                                type="text" 
                                placeholder="http://127.0.0.1:9880"
                                value={settings.customTtsEndpoint}
                                onChange={(e) => onUpdateSettings({...settings, customTtsEndpoint: e.target.value})}
                                className="w-full bg-black/30 border border-gray-700 rounded p-2 text-xs text-white focus:outline-none focus:border-shogi-accent"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">Expected format: ?text=MSG&text_language=en</p>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-700 pt-3">
                    <label className="text-xs font-bold text-gray-500 uppercase">Volume: {settings.volume}</label>
                    <input 
                    type="range" 
                    min="0" max="1" step="0.1" 
                    value={settings.volume}
                    onChange={(e) => onUpdateSettings({...settings, volume: parseFloat(e.target.value)})}
                    className="w-full accent-shogi-accent mt-1" 
                    />
                </div>
                </>
            )}
        </div>
      </div>

      {/* CHAT/HISTORY CONTROL BAR */}
      <div className="bg-[#262421] px-4 py-2 border-y border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
           onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}>
         <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
           {isHistoryExpanded ? 'History' : 'Latest Response'}
         </span>
         <i className={`fa-solid fa-chevron-down text-gray-500 transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}></i>
      </div>

      {/* MESSAGES AREA */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide relative transition-all duration-300 ${!isHistoryExpanded ? 'flex items-end' : ''}`}>
        
        {coachState.history.length === 0 && !coachState.currentMessage && (
           <div className="w-full text-center text-gray-600 mt-10">
              <i className="fa-solid fa-chess-king text-4xl mb-3 opacity-20"></i>
              <p className="text-sm">Make a move to start coaching!</p>
           </div>
        )}
        
        {isHistoryExpanded && coachState.history.map((msg) => (
           <div key={msg.id} className={`flex ${msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
              {msg.sender === 'system' ? (
                 <span className="text-[10px] text-gray-600 uppercase bg-black/20 px-2 py-1 rounded">{msg.text}</span>
              ) : (
                <div className="bg-white/10 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl text-sm leading-relaxed border border-white/5">
                  <p>{msg.text}</p>
                  <span className="text-[10px] text-gray-500 mt-1 block text-right">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              )}
           </div>
        ))}

        {!isHistoryExpanded && coachState.history.length > 0 && coachState.history[coachState.history.length - 1].sender === 'coach' && (
           <div className="w-full">
              <div className="bg-white/10 p-4 rounded-xl text-md leading-relaxed border border-white/5 shadow-lg relative animate-fade-in-up">
                 <div className="absolute -top-3 left-4 bg-shogi-accent text-black text-[10px] font-bold px-2 py-0.5 rounded">LATEST</div>
                 <p>{coachState.history[coachState.history.length - 1].text}</p>
              </div>
           </div>
        )}

        {!isHistoryExpanded && coachState.isThinking && (
           <div className="w-full flex justify-center py-4">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-shogi-accent rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                <div className="w-2 h-2 bg-shogi-accent rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-shogi-accent rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
           </div>
        )}
      </div>

      {/* FOOTER INFO */}
      <div className="bg-[#151412] p-3 text-xs text-gray-400 border-t border-white/5 flex justify-between items-center">
         <span>Eval: <span className={currentScenario.evalScore > 0 ? "text-green-400" : "text-red-400"}>{currentScenario.evalScore}</span></span>
         <span>{currentScenario.lastMove}</span>
      </div>
    </div>
  );
};

export default CoachWidget;
