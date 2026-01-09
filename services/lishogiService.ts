
import { GameScenario } from '../types';

// Type definition for Lishogi's internal data structure
// We only care about the parts we need for analysis
interface LishogiGameData {
  game: {
    id: string;
    sfen: string;
    initialSfen: string;
    player: string; // "sente" or "gote"
  };
  steps: Array<{
    ply: number;
    usi: string | null;
    sfen: string;
  }>;
  player: {
    color: string;
  };
  opponent: {
    user?: { username: string };
    ai?: number;
  };
}

const PIECE_NAMES: Record<string, string> = {
  'P': 'Pawn', 'L': 'Lance', 'N': 'Knight', 'S': 'Silver', 'G': 'Gold', 'B': 'Bishop', 'R': 'Rook', 'K': 'King',
  'p': 'Pawn', 'l': 'Lance', 'n': 'Knight', 's': 'Silver', 'g': 'Gold', 'b': 'Bishop', 'r': 'Rook', 'k': 'King',
  '+P': 'Tokin', '+L': 'Promoted Lance', '+N': 'Promoted Knight', '+S': 'Promoted Silver', '+B': 'Horse', '+R': 'Dragon',
  '+p': 'Tokin', '+l': 'Promoted Lance', '+n': 'Promoted Knight', '+s': 'Promoted Silver', '+b': 'Horse', '+r': 'Dragon'
};

function getPieceFromSfen(sfen: string, file: number, rank: number): string {
    const boardPart = sfen.split(' ')[0];
    const rows = boardPart.split('/');
    if (rows.length < rank) return "?";
    
    const rowStr = rows[rank - 1];
    let currentFile = 9;
    
    for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (/\d/.test(char)) {
            const spaces = parseInt(char);
            if (currentFile - spaces < file && currentFile >= file) {
               return "Empty";
            }
            currentFile -= spaces;
        } else if (char === '+') {
            i++;
            const piece = '+' + rowStr[i];
            if (currentFile === file) return PIECE_NAMES[piece] || piece;
            currentFile--;
        } else {
            const piece = char;
            if (currentFile === file) return PIECE_NAMES[piece] || piece;
            currentFile--;
        }
        
        if (currentFile < file) break;
    }
    return "?";
}

function getReadableMove(prevSfen: string, usi: string): string {
    if (!usi) return "Start";
    
    if (usi.includes('*')) {
        const pieceChar = usi[0];
        const dest = usi.substring(2);
        const name = PIECE_NAMES[pieceChar] || pieceChar;
        return `Drop ${name} to ${dest}`;
    }

    const fromFile = parseInt(usi[0]);
    const fromRank = usi.charCodeAt(1) - 96;
    const toFile = parseInt(usi[2]);
    const toRank = usi.charCodeAt(3) - 96;
    const isPromotion = usi.includes('+');

    const pieceName = getPieceFromSfen(prevSfen, fromFile, fromRank);
    
    return `${pieceName} ${usi}${isPromotion ? ' (Promote)' : ''}`;
}

// Check for Direct Console Bridge (Fallback)
export const checkLishogiAvailable = (): boolean => {
  return typeof window !== 'undefined' && 
         (window as any).lishogi && 
         (window as any).lishogi.modulesData && 
         (window as any).lishogi.modulesData['round'];
};

// Helper to extract data from window (Fallback)
export const getLishogiData = (): GameScenario | null => {
  if (!checkLishogiAvailable()) return null;
  const roundData = (window as any).lishogi.modulesData['round'];
  return processLishogiPayload(roundData?.data);
};

// Main Processing Function
export const processLishogiPayload = (data: LishogiGameData): GameScenario | null => {
  try {
    if (!data || !data.game || !data.steps) return null;

    const steps = data.steps;
    const playerColor = data.game.player; // "sente" or "gote"
    const isPlayerSente = playerColor === 'sente';

    // Fallback for initial state
    if (!steps || steps.length === 0) {
       const initialSfen = data.game.initialSfen || data.game.sfen;
       return {
          id: `live_${data.game.id}_0`,
          name: `Live Game (Start)`,
          sfen: initialSfen,
          lastMove: 'Start',
          description: `Live match against ${data.opponent.user?.username || 'AI'}.`,
          evalScore: 0,
          turnColor: 'black',
          lastRoundMove: 'Game Start',
          sideLastMove: undefined,
          sideToMove: 'player'
       };
    }

    const currentStepIndex = steps.length - 1;
    const currentStep = steps[currentStepIndex];
    const lastMoveUSI = currentStep.usi || 'Start';
    const currentSfen = currentStep.sfen;
    
    const sfenParts = currentSfen.split(' ');
    const turnColor = sfenParts[1] === 'b' ? 'black' : 'white';
    
    const lastMoverIsSente = (currentStep.ply % 2) !== 0;
    const lastMoverIsPlayer = (lastMoverIsSente && isPlayerSente) || (!lastMoverIsSente && !isPlayerSente);
    
    const sideLastMove = lastMoverIsPlayer ? 'player' : 'bot';
    const sideToMove = sideLastMove === 'player' ? 'bot' : 'player';

    let historyStr = "";

    const getStepData = (idx: number) => {
        if (idx < 0) return null;
        const step = steps[idx];
        const prevSfen = idx > 0 ? steps[idx - 1].sfen : data.game.initialSfen;
        const readable = getReadableMove(prevSfen, step.usi || '');
        
        const isSente = (step.ply % 2) !== 0;
        const isPlayer = (isSente && isPlayerSente) || (!isSente && !isPlayerSente);
        
        return { readable, actor: isPlayer ? 'player' : 'bot' };
    };

    const currentMoveData = getStepData(currentStepIndex);
    
    if (currentMoveData) {
        if (currentMoveData.actor === 'bot' && currentStepIndex > 0) {
            const prevMoveData = getStepData(currentStepIndex - 1);
            if (prevMoveData) {
                historyStr = `${prevMoveData.actor} ${prevMoveData.readable}, then ${currentMoveData.actor} ${currentMoveData.readable}`;
            } else {
                historyStr = `${currentMoveData.actor} ${currentMoveData.readable}`;
            }
        } else {
            if (currentStepIndex > 0) {
                 const prevMoveData = getStepData(currentStepIndex - 1);
                 if (prevMoveData) {
                    historyStr = `${prevMoveData.actor} ${prevMoveData.readable}, then ${currentMoveData.actor} ${currentMoveData.readable}`;
                 } else {
                    historyStr = `${currentMoveData.actor} ${currentMoveData.readable}`;
                 }
            } else {
                 historyStr = `${currentMoveData.actor} ${currentMoveData.readable}`;
            }
        }
    }

    return {
      id: `live_${data.game.id}_${steps.length}`,
      name: `Live Game (Ply ${steps.length})`,
      sfen: currentSfen,
      lastMove: lastMoveUSI,
      description: `Live match against ${data.opponent.user?.username || 'AI'}.`,
      evalScore: 0,
      turnColor: turnColor,
      lastRoundMove: historyStr,
      sideLastMove: sideLastMove,
      sideToMove: sideToMove
    };

  } catch (e) {
    console.error("Error parsing Lishogi payload:", e);
    return null;
  }
};

// Parse raw data from Bridge/Extension
export const parseRawLishogiData = (rawData: any): GameScenario | null => {
    // If rawData has the structure from Extension: { data: { game: ... }, ts: ... }
    if (rawData && rawData.data && rawData.data.game) {
        return processLishogiPayload(rawData.data);
    }
    // Fallback for Bridge script which might send the internal object structure
    if (rawData && rawData.game) {
        return processLishogiPayload(rawData);
    }
    return null;
}
