
import { GoogleGenAI, Modality } from "@google/genai";
import { DEFAULT_COACHES } from '../constants';
import { CoachDefinition, Emotion, GameScenario, Settings } from '../types';

// Definition for the Logger function passed from Context
type LoggerFn = (source: 'Gemini', type: 'info'|'success'|'error'|'request'|'response', summary: string, details?: any) => void;

// Helper to decode audio
async function decodeAudioData(
  data: ArrayBuffer | string,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
  isBase64: boolean = true
): Promise<AudioBuffer> {
  let arrayBuffer: ArrayBuffer;
  
  if (isBase64 && typeof data === 'string') {
    const binaryString = atob(data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // For Gemini PCM (Raw Int16)
    arrayBuffer = bytes.buffer;
    
    // Manual decoding for Raw PCM (Gemini)
    const dataInt16 = new Int16Array(arrayBuffer);
    const frameCount = dataInt16.length / numChannels; 
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;

  } else {
    // For Custom TTS (WAV/MP3 blobs from fetch)
    // Use native decodeAudioData for standard formats
    return await ctx.decodeAudioData(data as ArrayBuffer);
  }
}

export const generateCoachResponse = async (
  scenario: GameScenario,
  settings: Settings,
  log?: LoggerFn
): Promise<{ text: string; audioBuffer: AudioBuffer | null; emotion: Emotion }> => {
  
  // PRIORITY 1: Check Settings (User Input)
  let apiKey = settings.llmConfig.apiKey;

  // PRIORITY 2: Check Environment Variables (Fallback)
  if (!apiKey) {
    try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            apiKey = process.env.API_KEY;
        }
    } catch (e) { /* ignore */ }
    
    if (!apiKey && (import.meta as any).env) {
        apiKey = (import.meta as any).env.VITE_API_KEY;
    }
  }

  if (!apiKey) {
    console.error("API Key missing. Please set it in Settings -> Text LLM API.");
    log?.('Gemini', 'error', 'API Key missing');
    return { text: "Please enter your API Key in Settings.", audioBuffer: null, emotion: Emotion.NEUTRAL };
  }

  // Use configured model or default
  const modelName = settings.llmConfig.modelName || "gemini-3-flash-preview";

  const ai = new GoogleGenAI({ apiKey: apiKey });
  
  // Find Active Coach
  const activeCoach = settings.customCoaches.find(c => c.id === settings.activeCoachId) 
                   || DEFAULT_COACHES.find(c => c.id === settings.activeCoachId)
                   || DEFAULT_COACHES[0];

  const personalityPrompt = activeCoach.personalityPrompt;

  // Determine Eval Context
  let evalContext = "";
  if (scenario.evalScore > 500) evalContext = "Sente (Black) is winning significantly.";
  else if (scenario.evalScore > 200) evalContext = "Sente (Black) has an advantage.";
  else if (scenario.evalScore < -500) evalContext = "Gote (White) is winning significantly.";
  else if (scenario.evalScore < -200) evalContext = "Gote (White) has an advantage.";
  else evalContext = "The game is balanced.";

  const isUndo = scenario.lastMove === 'UNDO';
  const positionText = scenario.positionName ? `The board features a known pattern: "${scenario.positionName}".` : "";
  
  // Extended Context Fields
  const sfen = scenario.sfen;
  const lastRoundMove = scenario.lastRoundMove || scenario.lastMove;
  const sideLastMove = scenario.sideLastMove || 'unknown';
  const sideToMove = scenario.sideToMove || 'unknown';
  const engineBestMove = scenario.bestMove || 'unknown';

  // SYSTEM PROMPT
  const systemPrompt = `
    ROLE:
    ${personalityPrompt}
    
    TASK:
    You are teaching Shogi to the user. You are observing the board.
    Do NOT act like a spectator cheering for a side against an "AI". 
    Act like a Mentor or Coach analyzing the moves objectively but with your specific personality.
    Treat the opponent's moves as "problems" the user needs to solve.

    CONTEXT:
    - sfen: "${sfen}"
    - Last round Move: "${lastRoundMove}"
    - Side Last Move: "${sideLastMove}"
    - Side To Move: "${sideToMove}"
    - Engine Eval: ${scenario.evalScore} (cp) -> ${evalContext}
    - Engine Recommended Best Move: ${engineBestMove}
    - ${positionText}
    ${isUndo ? "- The player just took back a move (UNDO). Comment on their hesitation or the correction." : ""}
    
    GUIDELINES:
    1. Do NOT state the numeric evaluation score.
    2. Focus on the *meaning* of the last move (defense, attack, shape/katachi).
    3. Keep it concise (under 30 words).
    4. Speak directly to the User (who might be playing Black OR White).
    
    RESPONSE CONFIGURATION:
    - Display Language: ${settings.textLanguage}
    - Audio Language: ${settings.audioLanguage}
    
    Output Format: JSON with "text", "audioText", and "emotion".
    - "text": The message to show on screen (in ${settings.textLanguage}).
    - "audioText": The message to be spoken (in ${settings.audioLanguage}).
    - "emotion": One of "happy", "neutral", "concerned", "excited".
  `;

  try {
    log?.('Gemini', 'request', `Sending Text Generation Request`, { 
        model: modelName, 
        evalScore: scenario.evalScore,
        bestMove: engineBestMove,
        lastMove: lastRoundMove
    });

    // 1. Text Generation
    const textResponse = await ai.models.generateContent({
      model: modelName,
      contents: systemPrompt + " (Respond strictly in JSON)",
      config: { responseMimeType: "application/json" }
    });
    
    const jsonText = textResponse.text || "{}";
    log?.('Gemini', 'response', `Received Text Response`, { raw: jsonText });

    let parsedData = { text: "Nice move!", audioText: "Nice move!", emotion: "neutral" };
    try {
      parsedData = JSON.parse(jsonText);
    } catch (e) {
        if (textResponse.text) {
            const cleanText = textResponse.text.replace(/```json|```/g, '').trim();
            try { parsedData = JSON.parse(cleanText); } catch(e2) { parsedData.text = cleanText; }
        }
    }

    const finalText = parsedData.text || "Hmm, interesting.";
    const finalAudioText = parsedData.audioText || finalText;
    const finalEmotion = (parsedData.emotion as Emotion) || Emotion.NEUTRAL;

    // 2. Audio Generation
    let audioBuffer = null;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    if (settings.ttsProvider === 'gemini') {
        log?.('Gemini', 'request', `Generating Audio (TTS)`, { voice: activeCoach.voice, text: finalAudioText });
        try {
            const audioResponse = await ai.models.generateContent({
              model: "gemini-2.5-flash-preview-tts",
              contents: [{ parts: [{ text: finalAudioText }] }],
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: activeCoach.voice },
                  },
                },
              },
            });

            const audioBase64 = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioBase64) {
              audioBuffer = await decodeAudioData(audioBase64, audioContext, 24000, 1, true);
              log?.('Gemini', 'success', `Audio Generated successfully`);
            }
        } catch (audioError: any) {
            console.error("Gemini TTS Generation failed. Details:", audioError);
            log?.('Gemini', 'error', `TTS Failed`, { error: audioError.message });
        }
    } else if (settings.ttsProvider === 'custom') {
        // Custom GPT-SoVITS Integration
        try {
            const url = new URL(settings.customTtsEndpoint);
            url.searchParams.append('text', finalAudioText);
            
            // Map Language to codes (simplified for common GPT-SoVITS endpoints)
            const langLower = settings.audioLanguage.toLowerCase();
            let langCode = 'en';
            if (langLower.startsWith('ja') || langLower.startsWith('jp')) langCode = 'ja';
            else if (langLower.startsWith('zh') || langLower.startsWith('ch')) langCode = 'zh';
            else if (langLower.startsWith('es') || langLower.startsWith('sp')) langCode = 'es';
            else if (langLower.startsWith('en')) langCode = 'en';
            else langCode = langLower.substring(0, 2);

            url.searchParams.append('text_language', langCode); 

            log?.('Gemini', 'request', `Calling Custom TTS`, { url: url.toString() });

            const res = await fetch(url.toString());
            if (res.ok) {
                const blob = await res.arrayBuffer();
                audioBuffer = await decodeAudioData(blob, audioContext, 24000, 1, false);
                log?.('Gemini', 'success', `Custom TTS Audio received`);
            } else {
                console.error("Custom TTS Request failed", res.statusText);
                log?.('Gemini', 'error', `Custom TTS Failed`, { status: res.statusText });
            }
        } catch (customError: any) {
            console.error("Custom TTS Error", customError);
            log?.('Gemini', 'error', `Custom TTS Error`, { error: customError.message });
        }
    }

    return {
      text: finalText,
      audioBuffer: audioBuffer,
      emotion: finalEmotion
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    log?.('Gemini', 'error', `Critical API Error`, { error: error.message });
    
    if (error.message?.includes('403')) {
        console.error("Check your API Key permissions.");
    } else if (error.message?.includes('404')) {
        console.error(`Model '${modelName}' not found. Check Settings.`);
    }
    
    return {
      text: `Error analyzing board. (${error.message || 'Unknown'})`,
      audioBuffer: null,
      emotion: Emotion.CONCERNED
    };
  }
};
