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
    prompt +=
      "IMPORTANT: Return ONLY the move notation without any additional text or explanation in the 'move' field.";

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
