
import React from 'react';

interface ShogiBoardProps {
  sfen?: string;
}

const ShogiBoard: React.FC<ShogiBoardProps> = ({ sfen }) => {
  const rows = 9;
  const cols = 9;

  // Map SFEN characters to Kanji or text
  const pieceMap: Record<string, string> = {
    'K': '王', 'R': '飛', 'B': '角', 'G': '金', 'S': '銀', 'N': '桂', 'L': '香', 'P': '歩',
    'k': '玉', 'r': '飛', 'b': '角', 'g': '金', 's': '銀', 'n': '桂', 'l': '香', 'p': '歩',
    '+R': '龍', '+B': '馬', '+S': '成銀', '+N': '成桂', '+L': '成香', '+P': 'と',
    '+r': '龍', '+b': '馬', '+s': '成銀', '+n': '成桂', '+l': '成香', '+p': 'と'
  };

  const parseSfen = (sfenString: string) => {
    // Default start position if sfen is invalid/empty
    const fallbackSfen = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
    const targetSfen = sfenString || fallbackSfen;

    const board: Array<Array<{ char: string; isPromoted: boolean; isOwner: boolean } | null>> = Array(9).fill(null).map(() => Array(9).fill(null));
    
    try {
        const [boardStr] = targetSfen.split(' ');
        if (!boardStr) return board;

        let r = 0;
        let c = 0;
        let isPromotedNext = false;

        for (let i = 0; i < boardStr.length; i++) {
            const char = boardStr[i];

            if (char === '/') {
                r++;
                c = 0;
            } else if (!isNaN(parseInt(char))) {
                c += parseInt(char);
            } else if (char === '+') {
                isPromotedNext = true;
            } else {
                // It's a piece
                // Simple logic: Uppercase is Sente (Bottom), Lowercase is Gote (Top)
                const isOwner = char === char.toUpperCase(); 
                
                // Construct map key (e.g., "P" or "+P")
                const mapKey = (isPromotedNext ? '+' : '') + char;
                const displayChar = pieceMap[mapKey] || char; // Fallback to char if not found
                
                if (r < 9 && c < 9) {
                    board[r][c] = {
                        char: displayChar,
                        isPromoted: isPromotedNext,
                        isOwner: isOwner
                    };
                }
                c++;
                isPromotedNext = false;
            }
        }
    } catch (e) {
        console.error("SFEN Parsing Error:", e);
    }
    return board;
  };

  const currentSfen = sfen || 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
  const boardData = parseSfen(currentSfen);

  const renderSquare = (r: number, c: number) => {
    const piece = boardData[r][c];
    
    return (
      <div 
        key={`${r}-${c}`}
        className="w-full h-full border-r border-b border-black/20 flex items-center justify-center relative select-none"
        style={{ backgroundColor: '#eeb55e' }}
      >
        {piece && (
           <div className={`
              font-serif font-bold text-2xl md:text-3xl leading-none
              flex items-center justify-center w-[90%] h-[90%]
              ${piece.isOwner ? 'text-black drop-shadow-sm' : 'text-black/80 rotate-180 drop-shadow-sm'}
              ${piece.isPromoted ? 'text-red-600' : ''}
           `}>
             {/* Simple Piece Shape Background */}
             <div className={`absolute inset-0 m-auto w-[80%] h-[90%] ${piece.isOwner ? '-mb-1' : '-mt-1'} bg-[#f4dcb7] shadow-[1px_2px_2px_rgba(0,0,0,0.3)] z-0 clip-path-shogi`}></div>
             <span className="z-10 relative">{piece.char}</span>
           </div>
        )}
      </div>
    );
  };

  const grid = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid.push(renderSquare(r, c));
    }
  }

  return (
    <div className="aspect-square w-full max-w-[600px] bg-[#eeb55e] border-4 border-[#8b5a2b] shadow-2xl relative">
       {/* Wood Texture Overlay */}
       <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('/picture/wood-pattern.png')]"></div>
       
       <div className="grid grid-cols-9 grid-rows-9 w-full h-full border-l border-t border-black/20">
         {grid}
       </div>
       
       {/* CSS for Shogi Piece Shape */}
       <style>{`
         .clip-path-shogi {
           clip-path: polygon(50% 0%, 100% 25%, 85% 100%, 15% 100%, 0% 25%);
         }
       `}</style>
    </div>
  );
};

export default ShogiBoard;
