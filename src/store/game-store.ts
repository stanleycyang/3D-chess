import { create } from "zustand";
import { ChessGame, ChessGameState, MoveResult } from "@/lib/chess/game";
import {
  DifficultyLevel,
  getLLMChessMove,
  parseChessMove,
  getLLMChessAnalysis,
  LLMChessAnalysis,
} from "@/lib/llm/chess-llm";

interface GameStore {
  // Game state
  gameState: ChessGameState | null;
  game: ChessGame | null;
  isPlayerTurn: boolean;
  playerColor: "w" | "b";
  difficultyLevel: DifficultyLevel;
  gameId: number | null;

  // UI state
  selectedSquare: string | null;
  validMoves: string[];
  isLoading: boolean;
  error: string | null;

  // Analysis state
  analysis: LLMChessAnalysis | null;
  isAnalysisLoading: boolean;

  // Actions
  initGame: (
    playerColor?: "w" | "b",
    difficultyLevel?: DifficultyLevel
  ) => void;
  selectSquare: (square: string) => void;
  makeMove: (
    from: string,
    to: string,
    promotion?: string
  ) => Promise<MoveResult>;
  undoMove: () => MoveResult;
  resetGame: () => void;
  requestLLMMove: () => Promise<void>;
  requestAnalysis: (query?: string) => Promise<void>;
  setDifficultyLevel: (level: DifficultyLevel) => void;
  setPlayerColor: (color: "w" | "b") => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Game state
  gameState: null,
  game: null,
  isPlayerTurn: true,
  playerColor: "w",
  difficultyLevel: "intermediate",
  gameId: null,

  // UI state
  selectedSquare: null,
  validMoves: [],
  isLoading: false,
  error: null,

  // Analysis state
  analysis: null,
  isAnalysisLoading: false,

  // Actions
  initGame: (playerColor = "w", difficultyLevel = "intermediate") => {
    const game = new ChessGame();
    const gameState = game.getState();

    set({
      game,
      gameState,
      playerColor,
      difficultyLevel,
      isPlayerTurn: playerColor === "w",
      selectedSquare: null,
      validMoves: [],
      error: null,
    });

    // If AI plays first (player is black), request AI move
    if (playerColor === "b") {
      setTimeout(() => get().requestLLMMove(), 500);
    }
  },

  selectSquare: (square: string) => {
    const { gameState, selectedSquare, playerColor, isPlayerTurn } = get();

    // Early returns for invalid states
    if (!isPlayerTurn || !gameState) return;
    if (gameState.turn !== playerColor || gameState.isGameOver) return;

    // Handle square selection logic
    if (selectedSquare) {
      // Case 1: Same square clicked again - deselect it
      if (selectedSquare === square) {
        set({ selectedSquare: null, validMoves: [] });
        return;
      }

      // Case 2: Valid move destination - make the move
      if (gameState.validMoves[selectedSquare]?.includes(square)) {
        get().makeMove(selectedSquare, square);
        return;
      }

      // Case 3: New piece of player's color - select it
      const pieces = gameState.validMoves;
      if (pieces[square]) {
        set({
          selectedSquare: square,
          validMoves: pieces[square] || [],
        });
        return;
      }

      // Case 4: Invalid square - deselect current selection
      set({ selectedSquare: null, validMoves: [] });
      return;
    }

    // No square selected yet - select if it has a piece of player's color
    const pieces = gameState.validMoves;
    if (pieces[square]) {
      set({
        selectedSquare: square,
        validMoves: pieces[square] || [],
      });
    }
  },

  makeMove: async (from: string, to: string, promotion?: string) => {
    const { game } = get();

    if (!game) {
      return { success: false, error: "Game not initialized" };
    }

    set({ isLoading: true, error: null });

    try {
      // Make the player's move
      const result = game.makeMove(from, to, promotion);

      if (!result.success) {
        set({
          error: result.error || "Invalid move",
          isLoading: false,
          selectedSquare: null,
          validMoves: [],
        });
        return result;
      }

      // Update the game state
      set({
        gameState: result.state!,
        selectedSquare: null,
        validMoves: [],
        isPlayerTurn: false,
      });

      // If the game is over, don't request an AI move
      if (result.state!.isGameOver) {
        set({ isLoading: false });
        return result;
      }

      // Request AI move after a short delay
      setTimeout(() => {
        get().requestLLMMove();
      }, 500);

      return result;
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
        selectedSquare: null,
        validMoves: [],
      });
      return { success: false, error: (error as Error).message };
    }
  },

  undoMove: () => {
    const { game } = get();

    if (!game) {
      return { success: false, error: "Game not initialized" };
    }

    // Undo both the AI's move and the player's move
    const result1 = game.undoMove(); // Undo AI move
    if (!result1.success) return result1;

    const result2 = game.undoMove(); // Undo player move
    if (!result2.success) return result2;

    set({
      gameState: result2.state!,
      selectedSquare: null,
      validMoves: [],
      isPlayerTurn: true,
      error: null,
    });

    return result2;
  },

  resetGame: () => {
    get().initGame(get().playerColor, get().difficultyLevel);
  },

  requestLLMMove: async () => {
    const { game, gameState, difficultyLevel } = get();

    if (!game || !gameState) return;

    set({ isLoading: true, error: null });

    try {
      // Get move from LLM
      const llmMove = await getLLMChessMove(gameState, difficultyLevel, false);
      console.log("LLM suggested move:", llmMove.move);
      const cleanMove = llmMove.move.trim();

      // Try to make the move
      await makeAIMove(cleanMove, gameState, game, set);
    } catch (error) {
      set({
        error: `AI move error: ${(error as Error).message}`,
        isLoading: false,
        isPlayerTurn: true, // Let the player try again
      });
    }
  },

  requestAnalysis: async (query?: string) => {
    const { game, gameState } = get();

    if (!game || !gameState) return;

    set({ isAnalysisLoading: true });

    try {
      // Get analysis from LLM
      const analysis = await getLLMChessAnalysis(gameState, query);
      set({ analysis });
    } catch (error) {
      set({
        error: `Analysis error: ${(error as Error).message}`,
        isAnalysisLoading: false,
      });
    }
  },

  setDifficultyLevel: (level: DifficultyLevel) => {
    set({ difficultyLevel: level });
  },

  setPlayerColor: (color: "w" | "b") => {
    set({ playerColor: color });
  },
}));

/**
 * Helper function to attempt making an AI move
 */
async function makeAIMove(
  moveNotation: string,
  gameState: ChessGameState,
  game: ChessGame,
  set: (state: Partial<GameStore>) => void
) {
  try {
    // Clean up the move notation
    const cleanedMove = moveNotation
      .trim()
      .replace(/\.$/, "") // Remove trailing periods
      .replace(/[!?]+$/, "") // Remove evaluation symbols
      .replace(/\s.*$/, ""); // Remove anything after the first space

    console.log("Cleaned move notation:", cleanedMove);

    // Parse the move using our server-side endpoint
    const parsedMove = await parseChessMove(gameState, cleanedMove);

    // Make the actual move
    const result = game.makeMove(
      parsedMove.from,
      parsedMove.to,
      parsedMove.promotion
    );

    if (!result.success) {
      throw new Error(`Invalid move: ${parsedMove.from}-${parsedMove.to}`);
    }

    // Update the game state
    set({
      gameState: result.state!,
      isLoading: false,
      isPlayerTurn: true,
      error: null,
    });
  } catch (parseError) {
    console.error("Error parsing move:", parseError);

    // Try to handle capture notation
    if (tryHandleCaptureNotation(moveNotation, gameState, game, set)) {
      return;
    }

    // Try to handle common notation formats
    if (tryHandleCommonNotations(moveNotation, gameState, game, set)) {
      return;
    }

    // If we still can't parse the move, try a fallback strategy
    set({
      error: `AI move error: Could not parse move "${moveNotation}". Trying again...`,
      isLoading: true,
    });

    // Wait a moment before retrying
    setTimeout(async () => {
      try {
        // Request a new move with explicit instructions for format
        const fallbackMove = await getLLMChessMove(
          gameState,
          "intermediate",
          true // Include explanation to help with debugging
        );

        // Extract just the move notation from the response
        const simplifiedMove = extractMoveNotation(fallbackMove.move);
        console.log("Fallback move notation:", simplifiedMove);

        // Try to make the move with the new notation
        await makeAIMove(simplifiedMove, gameState, game, set);
      } catch (fallbackError) {
        set({
          error: `AI move error: ${
            (fallbackError as Error).message
          }. Please try again or make a different move.`,
          isLoading: false,
          isPlayerTurn: true,
        });
      }
    }, 1000);
  }
}

/**
 * Helper function to extract just the move notation from a potentially longer text
 */
function extractMoveNotation(text: string): string {
  // Try to find standard algebraic notation patterns
  const movePattern = /([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)/;
  const match = text.match(movePattern);

  if (match && match[1]) {
    return match[1];
  }

  // If no standard pattern found, just return the first word
  return text.trim().split(/\s+/)[0];
}

/**
 * Helper function to try handling common notation formats
 * Returns true if successful, false otherwise
 */
function tryHandleCommonNotations(
  moveNotation: string,
  gameState: ChessGameState,
  game: ChessGame,
  set: (state: Partial<GameStore>) => void
): boolean {
  // Clean the notation
  const cleanMove = moveNotation
    .trim()
    .replace(/\.$/, "")
    .replace(/[!?]+$/, "");

  // Case 1: Handle castling notation
  if (cleanMove.match(/^(O-O|O-O-O|0-0|0-0-0)$/i)) {
    const isKingside = cleanMove.match(/^(O-O|0-0)$/i);
    const turn = gameState.turn;

    // Set up castling moves based on color and type
    let from = turn === "w" ? "e1" : "e8";
    let to = "";

    if (isKingside) {
      to = turn === "w" ? "g1" : "g8";
    } else {
      to = turn === "w" ? "c1" : "c8";
    }

    // Try to make the castling move
    const result = game.makeMove(from, to);
    if (result.success) {
      set({
        gameState: result.state!,
        isLoading: false,
        isPlayerTurn: true,
        error: null,
      });
      return true;
    }

    return false;
  }

  // Case 2: Try all possible moves that match the piece type
  const pieceMap: Record<string, string> = {
    K: "k",
    Q: "q",
    R: "r",
    B: "b",
    N: "n",
    P: "p",
  };

  // Extract the piece type from the notation
  const pieceMatch = cleanMove.match(/^([KQRBNP])/);
  const pieceType = pieceMatch ? pieceMap[pieceMatch[1]] : "p"; // Default to pawn

  // Extract the destination square
  const destMatch = cleanMove.match(/([a-h][1-8])(?:=[QRBN])?[+#]?$/);
  if (destMatch) {
    const destSquare = destMatch[1];

    // Find all pieces of the correct type and color
    const validMoves = Object.entries(gameState.validMoves);
    for (const [from, toSquares] of validMoves) {
      if (!Array.isArray(toSquares)) continue;

      // Check if this piece matches the type we're looking for
      const piece = gameState.board
        .flat()
        .find(
          (p) =>
            p &&
            p.color === gameState.turn &&
            from === from &&
            p.type === pieceType
        );

      if (piece && toSquares.includes(destSquare)) {
        const result = game.makeMove(from, destSquare);
        if (result.success) {
          set({
            gameState: result.state!,
            isLoading: false,
            isPlayerTurn: true,
            error: null,
          });
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Helper function to try handling capture notation (e.g., "Bxf7")
 * Returns true if successful, false otherwise
 */
function tryHandleCaptureNotation(
  moveNotation: string,
  gameState: ChessGameState,
  game: ChessGame,
  set: (state: Partial<GameStore>) => void
): boolean {
  if (!moveNotation.includes("x")) return false;

  const parts = moveNotation.split("x");
  if (parts.length !== 2) return false;

  // Extract destination square
  const dest = parts[1].replace(/[+#]$/, "");

  // Try to find a valid capture move to this destination
  const validMoves = Object.entries(gameState.validMoves);
  for (const [from, toSquares] of validMoves) {
    if (!Array.isArray(toSquares)) continue;

    for (const to of toSquares) {
      if (to === dest) {
        // Check if this is a valid capture move
        const testResult = game.makeMove(from, to);
        if (testResult.success) {
          // Update the game state
          set({
            gameState: testResult.state!,
            isLoading: false,
            isPlayerTurn: true,
            error: null,
          });
          return true;
        }
        game.undoMove(); // Undo the test move
      }
    }
  }

  return false;
}
