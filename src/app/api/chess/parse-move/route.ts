import { NextRequest, NextResponse } from "next/server";
import { ChessGame } from "@/lib/chess/game";

interface MoveInfo {
  from: string;
  to: string;
  san: string;
  promotion?: string;
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

    // Try to parse the move directly (for moves in the format 'e2e4')
    const moveRegex = /([a-h][1-8])([a-h][1-8])/;
    const moveMatch = cleanMove.match(moveRegex);

    if (moveMatch) {
      const [, from, to] = moveMatch;
      return NextResponse.json({ from, to });
    }

    // Try to parse moves in the format 'Ng8-f6' or 'e2-e4'
    const extendedMoveRegex = /([NBRQK]?)([a-h][1-8])-([a-h][1-8])/;
    const extendedMoveMatch = cleanMove.match(extendedMoveRegex);

    if (extendedMoveMatch) {
      const [, , from, to] = extendedMoveMatch;
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
            allValidMoves.push({
              from: fromSquare,
              to: toSquare,
              san: lastMove.san,
            });
          }
        }
        // Undo the test move
        if (testMove.success) {
          game.undoMove();
        }
      });
    });

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

        if (possibleMoves.length === 1) {
          // If there's only one possible move with this piece to this destination, use it
          return NextResponse.json({
            from: possibleMoves[0].from,
            to: possibleMoves[0].to,
            promotion: possibleMoves[0].promotion,
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
