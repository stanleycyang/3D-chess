import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

// Define the schema for the chess move response
const chessMoveSchema = z.object({
  move: z
    .string()
    .describe(
      "The chess move in standard algebraic notation (e.g., e4, Nf3, O-O)"
    ),
  explanation: z
    .string()
    .optional()
    .describe("Explanation of why this move is good"),
});

// Define a type for the history move
interface HistoryMove {
  from: string;
  to: string;
  san?: string;
  flags?: string;
  piece?: string;
  color?: string;
  captured?: string;
  promotion?: string;
}

// Define a type for the chess piece
interface ChessPiece {
  type: string;
  color: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const {
      gameState,
      difficultyLevel = "intermediate",
      includeExplanation = false,
    } = body;

    // Validate the request
    if (!gameState || !gameState.fen) {
      return NextResponse.json(
        { error: "Missing required game state" },
        { status: 400 }
      );
    }

    const fen = gameState.fen;
    const turn = gameState.turn === "w" ? "White" : "Black";
    const history = gameState.history
      ? gameState.history
          .map((move: HistoryMove) => `${move.from}-${move.to}`)
          .join(", ")
      : "";

    // Create a visual representation of the board
    const boardVisual = createBoardVisual(gameState.board);

    // Get a list of all pieces on the board with their positions
    const piecePositions = getPiecePositions(gameState.board);

    // Get a list of all valid moves
    const validMovesText = getValidMovesText(gameState.validMoves);

    let prompt = `You are a chess engine. Given this FEN: "${fen}", suggest the next move for ${turn} `;

    // Adjust difficulty
    switch (difficultyLevel) {
      case "beginner":
        prompt += "playing at a beginner level (around 800-1000 ELO). ";
        break;
      case "intermediate":
        prompt += "playing at an intermediate level (around 1200-1400 ELO). ";
        break;
      case "advanced":
        prompt += "playing at an advanced level (around 1600-1800 ELO). ";
        break;
      case "expert":
        prompt += "playing at an expert level (around 2000+ ELO). ";
        break;
    }

    // Add the visual board representation
    prompt += `\n\nHere is the current board state:\n${boardVisual}\n\n`;

    // Add piece positions
    prompt += `Piece positions:\n${piecePositions}\n\n`;

    // Add valid moves
    prompt += `Valid moves for ${turn}:\n${validMovesText}\n\n`;

    prompt +=
      "Provide the move in standard algebraic notation (e.g., e4, Nf3). ";
    prompt +=
      "For pawn moves, specify only the destination square (e.g., 'e4'). ";
    prompt +=
      "For piece moves, include the piece letter followed by the destination (e.g., 'Nf3'). ";
    prompt += "For captures, use 'x' (e.g., 'Bxf7'). ";
    prompt +=
      "For castling, use 'O-O' for kingside and 'O-O-O' for queenside. ";
    prompt += "For promotion, add '=' followed by the piece (e.g., 'e8=Q'). ";
    prompt += "For check, add '+' (e.g., 'Qh5+'). ";
    prompt += "For checkmate, add '#' (e.g., 'Qh7#'). ";

    // Add instructions for more explicit move formats to help with parsing
    prompt +=
      "IMPORTANT: If you're suggesting a knight or bishop move, please be very specific about which piece is moving. ";
    prompt +=
      "If there could be ambiguity (like two knights that could move to the same square), include the file or rank of origin (e.g., 'Nge2' or 'N1c3'). ";
    prompt +=
      "If possible, provide the move in a format that includes both the source and destination squares (e.g., 'e2-e4' or 'Ng1-f3'). ";
    prompt +=
      "IMPORTANT: Return ONLY the move notation without any additional text or explanation in the 'move' field.";
    prompt +=
      "IMPORTANT: Make sure your suggested move is one of the valid moves listed above.";

    if (includeExplanation) {
      prompt +=
        " Also provide a brief explanation of why this move is good in the 'explanation' field.";
    }

    if (history.length > 0) {
      prompt += ` The game history so far is: ${history}.`;
    }

    // Use AI SDK to generate a structured response
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: chessMoveSchema,
      prompt,
      temperature: 0.2,
      maxTokens: 150,
    });

    return NextResponse.json({
      move: result.object.move,
      explanation: includeExplanation ? result.object.explanation : undefined,
    });
  } catch (error) {
    console.error("Error getting LLM chess move:", error);
    return NextResponse.json(
      { error: `Failed to get chess move: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * Create a visual representation of the chess board
 */
function createBoardVisual(board: Array<Array<ChessPiece | null>>): string {
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
function getPiecePositions(board: Array<Array<ChessPiece | null>>): string {
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
