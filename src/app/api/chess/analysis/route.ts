import { NextRequest } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { chessAnalysisSchema } from "@/lib/chess/analysis-schema";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { gameState } = body;

    // Validate the request
    if (!gameState || !gameState.fen) {
      throw new Error("Missing required game state");
    }

    const fen = gameState.fen;
    const turn = gameState.turn === "w" ? "White" : "Black";

    const prompt = `
    Chess position in FEN: "${fen}". It's ${turn}'s turn to move.
    
    Analyze this position for a complete beginner who is just learning chess. 
    
    Your analysis should:
    1. Explain the current state of the game in very simple terms
    2. Point out any immediate threats or opportunities
    3. Suggest a good move and explain why it's good in plain language
    4. Avoid using complex chess terminology without explanation
    5. Be encouraging and educational
    
    Remember that the player is a complete beginner who may not know standard chess concepts.
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
