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

      return false;
    });

    if (!matchingMove) {
      return NextResponse.json(
        {
          error: `Could not parse move: ${cleanMove}`,
          availableMoves: allValidMoves.map((m) => m.san),
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
