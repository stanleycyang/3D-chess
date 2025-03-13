import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

// Define the schema for the chess analysis response
const chessAnalysisSchema = z.object({
  analysis: z.string().describe("Detailed analysis of the chess position"),
  suggestedMove: z
    .string()
    .optional()
    .describe(
      "A suggested move in standard algebraic notation (e.g., e4, Nf3, O-O)"
    ),
  evaluation: z
    .string()
    .optional()
    .describe("Numerical evaluation of the position (e.g., +0.5, -1.2)"),
});

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const {
      gameState,
      query = "Analyze this position and suggest a good move",
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

    const prompt = `Chess position in FEN: "${fen}". It's ${turn}'s turn to move. ${query}.`;

    // Use AI SDK to generate a structured response
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: chessAnalysisSchema,
      prompt,
      temperature: 0.3,
      maxTokens: 500,
    });

    return NextResponse.json({
      analysis: result.object.analysis,
      suggestedMove: result.object.suggestedMove,
      evaluation: result.object.evaluation,
    });
  } catch (error) {
    console.error("Error getting LLM chess analysis:", error);
    return NextResponse.json(
      { error: `Failed to get chess analysis: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
