
import { CoachDefinition, GameScenario } from './types';

export const DEFAULT_COACHES: CoachDefinition[] = [
  {
    id: 'sensei',
    name: 'Kenji Sensei',
    image: '/picture/sensei.jpg',
    voice: 'Kore',
    personalityPrompt: "You are Kenji, a wise and strict Shogi master. You focus on discipline, proper shape (Katachi), and long-term strategy. You are polite but firm. Address the player as 'Deshi' (Student).",
    isCustom: false
  },
  {
    id: 'buddy',
    name: 'Mike',
    image: '/picture/buddy.jpg',
    voice: 'Puck',
    personalityPrompt: "You are Mike, an enthusiastic friend who loves Shogi. You use slang, get hype about good moves, and are supportive when things go wrong. Address the player by name.",
    isCustom: false
  },
  {
    id: 'roaster',
    name: 'Evil Bot',
    image: '/picture/evil.jpg',
    voice: 'Fenrir',
    personalityPrompt: "You are Evil Bot. You are arrogant and sarcastic. You make fun of bad moves mercilessly but secretly want the player to improve so you have a better opponent. You are very competitive.",
    isCustom: false
  },
  {
    id: 'sora',
    name: 'Sora-chan',
    image: '/picture/sora.jpg',
    voice: 'Zephyr',
    personalityPrompt: "You are Sora-chan! A magical girl Shogi prodigy from an anime. You use magical metaphors like 'Spirit Check!', 'Mana Barrier!', 'Dragon Promotion!'. You are super energetic, cute, and talented. End sentences with 'desu' or magical sounds. You call the player 'Onii-chan' or 'Senpai'.",
    isCustom: false
  }
];

export const SCENARIOS: GameScenario[] = [
  // --- Standard Scenarios ---
  {
    id: 'opening',
    name: 'Solid Opening',
    sfen: 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1',
    lastMove: 'P-76',
    description: 'You just opened the bishop diagonal.',
    evalScore: 0.1
  },
  {
    id: 'mino_castle',
    name: 'Mino Castle Built',
    sfen: 'mino_sfen',
    lastMove: 'K-28',
    description: 'Player has successfully built a Mino Castle.',
    evalScore: 0.5,
    positionName: 'Mino Castle'
  },
  {
    id: 'undo_roast',
    name: 'Player Undo',
    sfen: 'undo_sfen',
    lastMove: 'UNDO',
    description: 'Player just requested an undo because they made a mistake.',
    evalScore: 0.0
  },
  {
    id: 'explain_bot',
    name: 'Explain Bot Move',
    sfen: 'bot_move_sfen',
    lastMove: 'R-84',
    description: 'Bot played R-84 (Floating Rook). Explain to the player why this is a good flexible shape.',
    evalScore: -0.2
  },

  // --- Game Simulation (from PSN) ---
  {
    id: 'game_move_2',
    name: 'Game: Move 2',
    sfen: 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1',
    lastMove: 'G4a-3b',
    description: 'Coach (Gote) plays Gold to 3b. A standard defensive shape.',
    evalScore: -44
  },
  {
    id: 'game_move_8',
    name: 'Game: Move 8',
    sfen: 'game_m8',
    lastMove: 'B2bx8h+',
    description: 'Coach (Gote) takes Player\'s Bishop! A sudden exchange.',
    evalScore: 2771
  },
  {
    id: 'game_move_11',
    name: 'Game: Move 11',
    sfen: 'game_m11',
    lastMove: 'S6h-7g',
    description: 'Player develops Silver. Bot is under heavy pressure.',
    evalScore: 4013
  },
  {
    id: 'game_end',
    name: 'Game: End',
    sfen: 'game_end',
    lastMove: 'Resigns',
    description: 'Coach resigns. The player played a perfect game.',
    evalScore: 4741
  }
];
