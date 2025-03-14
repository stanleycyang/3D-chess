import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { chessAnalysisSchema } from "@/lib/chess/analysis-schema";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { gameState, query } = body;

    // Validate the request
    if (!gameState || !gameState.fen) {
      throw new Error("Missing required game state");
    }

    const fen = gameState.fen;
    const turn = gameState.turn === "w" ? "White" : "Black";

    // Create a visual representation of the board
    const boardVisual = createBoardVisual(gameState.board);

    // Get a list of all pieces on the board with their positions
    const piecePositions = getPiecePositions(gameState.board);

    // Get a list of all valid moves
    const validMovesText = getValidMovesText(gameState.validMoves);

    // Create a more detailed prompt with the query if provided
    const userQuery = query
      ? `The user asks: "${query}"`
      : "Analyze this position and suggest a good move";

    const prompt = `
    Chess position in FEN: "${fen}". It's ${turn}'s turn to move.
    
    ${userQuery}
    
    Here is a visual representation of the current board state:
    ${boardVisual}
    
    Piece positions:
    ${piecePositions}
    
    Valid moves for ${turn}:
    ${validMovesText}
    
    Your analysis should:
    1. Explain the current state of the game in clear terms
    2. Point out any immediate threats or opportunities
    3. Suggest a good move and explain why it's good in plain language
    4. When suggesting a move, be very specific about which piece is moving and to where
    5. Make sure your suggested move is one of the valid moves listed above
    
    For any move you suggest, explain what the notation means (e.g., 'Nf3 means move the Knight to square f3').
    `;

    // Stream the object generation
    const result = streamObject({
      model: openai("gpt-4o"),
      schema: chessAnalysisSchema,
      prompt,
      temperature: 0.3,
      maxTokens: 800,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error getting chess analysis:", error);
    throw error;
  }
}

/**
 * Create a visual representation of the chess board
 */
function createBoardVisual(
  board: Array<Array<{ type: string; color: string } | null>>
): string {
  const symbols: Record<string, Record<string, string>> = {
    w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
    b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
  };

  let visual = "  a b c d e f g h\n";

  for (let i = 0; i < 8; i++) {
    visual += `${8 - i} `;

    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        visual += symbols[piece.color][piece.type] + " ";
      } else {
        visual += ". ";
      }
    }

    visual += `${8 - i}\n`;
  }

  visual += "  a b c d e f g h";

  return visual;
}

/**
 * Get a list of all pieces on the board with their positions
 */
function getPiecePositions(
  board: Array<Array<{ type: string; color: string } | null>>
): string {
  const positions: string[] = [];

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const square = `${String.fromCharCode(97 + j)}${8 - i}`;
        const pieceName = getPieceName(piece.type, piece.color);
        positions.push(`${pieceName} at ${square}`);
      }
    }
  }

  return positions.join("\n");
}

/**
 * Get the full name of a piece
 */
function getPieceName(type: string, color: string): string {
  const pieceNames: Record<string, string> = {
    p: "Pawn",
    n: "Knight",
    b: "Bishop",
    r: "Rook",
    q: "Queen",
    k: "King",
  };

  return `${color === "w" ? "White" : "Black"} ${pieceNames[type]}`;
}

/**
 * Get a text representation of all valid moves
 */
function getValidMovesText(validMoves: Record<string, string[]>): string {
  const moves: string[] = [];

  for (const [from, toSquares] of Object.entries(validMoves)) {
    if (Array.isArray(toSquares) && toSquares.length > 0) {
      moves.push(`From ${from}: can move to ${toSquares.join(", ")}`);
    }
  }

  return moves.join("\n");
}
