import { NextRequest, NextResponse } from "next/server";
import { ChessGame } from "@/lib/chess/game";

interface MoveInfo {
  from: string;
  to: string;
  san: string;
  promotion?: string;
  piece?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { gameState, moveNotation } = body;

    // Validate the request
    if (!gameState || !moveNotation) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Create a temporary game instance with the current state
    const game = new ChessGame(gameState.fen);

    // Clean up the move notation
    const cleanMove = moveNotation.trim();

    console.log(`Parsing move: "${cleanMove}" for position: ${gameState.fen}`);

    // Try to parse the move directly (for moves in the format 'e2e4')
    const moveRegex = /([a-h][1-8])([a-h][1-8])/;
    const moveMatch = cleanMove.match(moveRegex);

    if (moveMatch) {
      const [, from, to] = moveMatch;
      console.log(`Matched direct format: ${from}-${to}`);
      return NextResponse.json({ from, to });
    }

    // Try to parse moves in the format 'Ng8-f6' or 'e2-e4'
    const extendedMoveRegex = /([NBRQK]?)([a-h][1-8])-([a-h][1-8])/;
    const extendedMoveMatch = cleanMove.match(extendedMoveRegex);

    if (extendedMoveMatch) {
      const [, , from, to] = extendedMoveMatch;
      console.log(`Matched extended format: ${from}-${to}`);
      return NextResponse.json({ from, to });
    }

    // If the move is in algebraic notation, we need to find the corresponding from/to squares
    const allValidMoves: MoveInfo[] = [];

    // Get all valid moves in the current position
    Object.entries(gameState.validMoves).forEach(([fromSquare, toSquares]) => {
      (toSquares as string[]).forEach((toSquare: string) => {
        // Try the move and get its SAN notation
        const testMove = game.makeMove(fromSquare, toSquare);
        if (testMove.success && testMove.state) {
          const lastMove = testMove.state.history.slice(-1)[0];
          if (lastMove) {
            // Find the piece type at the from square
            const fromCoords = algebraicToCoords(fromSquare);
            let pieceType = "";
            if (fromCoords) {
              const piece = gameState.board[fromCoords.row][fromCoords.col];
              if (piece) {
                pieceType = piece.type;
              }
            }

            allValidMoves.push({
              from: fromSquare,
              to: toSquare,
              san: lastMove.san,
              piece: pieceType,
            });
          }
        }
        // Undo the test move
        if (testMove.success) {
          game.undoMove();
        }
      });
    });

    console.log(`Generated ${allValidMoves.length} valid moves for matching`);

    // Find the move that matches the notation
    const matchingMove = allValidMoves.find((m) => {
      // Exact match
      if (m.san === cleanMove) return true;

      // Case insensitive match
      if (m.san.toLowerCase() === cleanMove.toLowerCase()) return true;

      // Remove check/checkmate symbols and try again
      const sanWithoutSymbols = m.san.replace(/[+#]$/, "");
      if (sanWithoutSymbols === cleanMove) return true;

      // Try to match by piece and destination square (e.g., "Nf6")
      if (cleanMove.match(/^[NBRQK][a-h][1-8]$/)) {
        const piece = cleanMove.charAt(0);
        const dest = cleanMove.substring(1);
        return m.san.startsWith(piece) && m.san.includes(dest);
      }

      return false;
    });

    if (!matchingMove) {
      // If no match found, try to find a move with the same destination square
      // This helps when the AI returns a move like "Nf6" but we need to know which knight
      const pieceAndDestMatch = cleanMove.match(/^([NBRQK])([a-h][1-8])$/);
      if (pieceAndDestMatch) {
        const [, piece, dest] = pieceAndDestMatch;
        const possibleMoves = allValidMoves.filter(
          (m) => m.san.startsWith(piece) && m.to === dest
        );

        console.log(
          `Found ${possibleMoves.length} possible moves for ${piece} to ${dest}`
        );

        if (possibleMoves.length === 1) {
          // If there's only one possible move with this piece to this destination, use it
          console.log(
            `Selected unique move: ${possibleMoves[0].from}-${possibleMoves[0].to}`
          );
          return NextResponse.json({
            from: possibleMoves[0].from,
            to: possibleMoves[0].to,
            promotion: possibleMoves[0].promotion,
          });
        } else if (possibleMoves.length > 1) {
          // If there are multiple possibilities, try to disambiguate
          // First, check if the move notation includes a file or rank disambiguator
          const disambiguatedMatch = cleanMove.match(
            /^([NBRQK])([a-h1-8])([a-h][1-8])$/
          );
          if (disambiguatedMatch) {
            const [, , disambiguator] = disambiguatedMatch;

            // Check if disambiguator is a file (a-h) or rank (1-8)
            const isFile = disambiguator.match(/[a-h]/);

            const filteredMoves = possibleMoves.filter((m) => {
              if (isFile) {
                // Filter by file
                return m.from.startsWith(disambiguator);
              } else {
                // Filter by rank
                return m.from.endsWith(disambiguator);
              }
            });

            if (filteredMoves.length === 1) {
              console.log(
                `Disambiguated to: ${filteredMoves[0].from}-${filteredMoves[0].to}`
              );
              return NextResponse.json({
                from: filteredMoves[0].from,
                to: filteredMoves[0].to,
                promotion: filteredMoves[0].promotion,
              });
            }
          }

          // If still ambiguous, just pick the first one and log a warning
          console.log(
            `Warning: Ambiguous move ${cleanMove}, selecting first option: ${possibleMoves[0].from}-${possibleMoves[0].to}`
          );
          return NextResponse.json({
            from: possibleMoves[0].from,
            to: possibleMoves[0].to,
            promotion: possibleMoves[0].promotion,
          });
        }
      }

      // Try to handle castling notation
      if (cleanMove.match(/^(O-O|O-O-O|0-0|0-0-0)$/i)) {
        const isKingside = cleanMove.match(/^(O-O|0-0)$/i);
        const turn = gameState.turn;

        // Set up castling moves based on color and type
        const from = turn === "w" ? "e1" : "e8";
        const to = isKingside
          ? turn === "w"
            ? "g1"
            : "g8"
          : turn === "w"
            ? "c1"
            : "c8";

        console.log(`Detected castling: ${from}-${to}`);
        return NextResponse.json({ from, to });
      }

      // Try to handle pawn moves (e.g., "e4")
      const pawnMoveMatch = cleanMove.match(/^([a-h][1-8])$/);
      if (pawnMoveMatch) {
        const [, dest] = pawnMoveMatch;
        const possiblePawnMoves = allValidMoves.filter(
          (m) => m.to === dest && m.piece === "p"
        );

        if (possiblePawnMoves.length === 1) {
          console.log(
            `Matched pawn move: ${possiblePawnMoves[0].from}-${possiblePawnMoves[0].to}`
          );
          return NextResponse.json({
            from: possiblePawnMoves[0].from,
            to: possiblePawnMoves[0].to,
          });
        }
      }

      return NextResponse.json(
        {
          error: `Could not parse move: ${cleanMove}`,
          availableMoves: allValidMoves.map(
            (m) => `${m.san} (${m.from}-${m.to})`
          ),
        },
        { status: 400 }
      );
    }

    console.log(`Matched move: ${matchingMove.from}-${matchingMove.to}`);

    // Check if this is a promotion move
    let promotion;
    if (cleanMove.includes("=")) {
      promotion = cleanMove.split("=")[1].charAt(0).toLowerCase();
    }

    return NextResponse.json({
      from: matchingMove.from,
      to: matchingMove.to,
      promotion,
    });
  } catch (error) {
    console.error("Error parsing chess move:", error);
    return NextResponse.json(
      { error: `Failed to parse move: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Convert algebraic notation to board coordinates
 */
function algebraicToCoords(
  square: string
): { row: number; col: number } | null {
  if (square.length !== 2) return null;

  const file = square.charCodeAt(0) - 97; // 'a' -> 0, 'b' -> 1, etc.
  const rank = 8 - parseInt(square[1]); // '8' -> 0, '7' -> 1, etc.

  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;

  return { row: rank, col: file };
}
