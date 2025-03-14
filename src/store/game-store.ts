import { create } from "zustand";
import { ChessGame, ChessGameState, MoveResult } from "@/lib/chess/game";
import {
  DifficultyLevel,
  getLLMChessMove,
  parseChessMove,
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
    // Parse the move using our server-side endpoint
    const parsedMove = await parseChessMove(gameState, moveNotation);

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
          false
        );
        const simplifiedMove = fallbackMove.move.trim();

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
