import { z } from "zod";

// Define the schema for the chess analysis response
export const chessAnalysisSchema = z.object({
  analysis: z
    .string()
    .describe(
      "Detailed analysis of the chess position in simple terms that a beginner can understand"
    ),
  suggestedMove: z
    .string()
    .optional()
    .describe(
      "A suggested move in standard algebraic notation (e.g., e4, Nf3, O-O)"
    ),
  evaluation: z
    .string()
    .optional()
    .describe(
      "Simple evaluation of the position (e.g., 'White is better', 'Equal position', 'Black has an advantage')"
    ),
});

export type ChessAnalysis = z.infer<typeof chessAnalysisSchema>;
