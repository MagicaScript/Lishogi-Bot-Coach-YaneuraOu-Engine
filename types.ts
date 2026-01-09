
export enum Emotion {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  CONCERNED = 'concerned',
  EXCITED = 'excited'
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface CoachState {
  isThinking: boolean;
  currentMessage: string | null;
  history: CoachMessage[];
  emotion: Emotion;
}

export interface CoachMessage {
  id: string;
  sender: 'coach' | 'system';
  text: string;
  audioUrl?: string; // Blob URL
  emotion: Emotion;
  timestamp: number;
}

export interface GameScenario {
  id: string;
  name: string;
  sfen: string;
  lastMove: string;
  description: string;
  evalScore: number;
  bestMove?: string; // Engine suggestion
  positionName?: string;
  turnColor?: 'black' | 'white'; // sente | gote
  
  // New fields for Context
  lastRoundMove?: string;
  sideLastMove?: 'player' | 'bot';
  sideToMove?: 'player' | 'bot';
}

export interface CoachDefinition {
  id: string;
  name: string;
  image: string;
  voice: string; // Gemini voice name OR Custom voice ID/Name
  personalityPrompt: string;
  isCustom: boolean;
}

export interface Settings {
  activeCoachId: string;
  customCoaches: CoachDefinition[];
  volume: number;
  playerName: string;
  enabled: boolean;
  textLanguage: string;
  audioLanguage: string;
  ttsProvider: 'gemini' | 'custom';
  customTtsEndpoint: string; // e.g. http://127.0.0.1:9880
  llmConfig: {
    apiKey: string;
    modelName: string;
    baseUrl: string;
  };
  engineConfig: {
    enabled: boolean;
    apiUrl: string; // e.g. http://localhost:8080/analyze
  };
  syncMode: 'manual' | 'live';
  extensionId: string; // Chrome Extension ID for Relay
}
