import { ChessGameState } from "../chess/game";

export type DifficultyLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";

export type LLMChessMove = {
  move: string;
  explanation?: string;
};

export type LLMChessAnalysis = {
  analysis: string;
  suggestedMove?: string;
  evaluation?: string;
};

export type ParsedMove = {
  from: string;
  to: string;
  promotion?: string;
};

/**
 * Parse a chess move in algebraic notation to get the from/to squares
 */
export async function parseChessMove(
  gameState: ChessGameState,
  moveNotation: string
): Promise<ParsedMove> {
  try {
    const response = await fetch("/api/chess/parse-move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameState,
        moveNotation,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to parse chess move");
    }

    const data = await response.json();
    return {
      from: data.from,
      to: data.to,
      promotion: data.promotion,
    };
  } catch (error) {
    console.error("Error parsing chess move:", error);
    throw error;
  }
}

/**
 * Get a chess move from the LLM based on the current game state
 */
export async function getLLMChessMove(
  gameState: ChessGameState,
  difficultyLevel: DifficultyLevel = "intermediate",
  includeExplanation: boolean = false
): Promise<LLMChessMove> {
  try {
    const response = await fetch("/api/chess/move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameState,
        difficultyLevel,
        includeExplanation,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get chess move");
    }

    const data = await response.json();
    return {
      move: data.move,
      explanation: data.explanation,
    };
  } catch (error) {
    console.error("Error getting LLM chess move:", error);
    throw error;
  }
}

/**
 * Get chess analysis from the LLM based on the current game state
 */
export async function getLLMChessAnalysis(
  gameState: ChessGameState,
  query: string = "Analyze this position and suggest a good move"
): Promise<LLMChessAnalysis> {
  try {
    const response = await fetch("/api/chess/analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameState,
        query,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get chess analysis");
    }

    const data = await response.json();
    return {
      analysis: data.analysis,
      suggestedMove: data.suggestedMove,
      evaluation: data.evaluation,
    };
  } catch (error) {
    console.error("Error getting LLM chess analysis:", error);
    throw error;
  }
}
