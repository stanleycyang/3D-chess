import { create } from "zustand";
import { ChessGame, ChessGameState, MoveResult } from "@/lib/chess/game";
import {
  DifficultyLevel,
  getLLMChessMove,
  getLLMChessAnalysis,
  LLMChessAnalysis,
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
  requestAnalysis: (query?: string) => Promise<LLMChessAnalysis>;
  requestLLMMove: () => Promise<void>;
  setDifficultyLevel: (level: DifficultyLevel) => void;
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
      analysis: null,
    });

    // If AI plays first (player is black), request AI move
    if (playerColor === "b") {
      get().requestLLMMove();
    }
  },

  selectSquare: (square: string) => {
    const { gameState, selectedSquare, playerColor, isPlayerTurn } = get();

    // Can only select squares during player's turn
    if (!isPlayerTurn || !gameState) {
      return;
    }

    // If it's not the player's turn or the game is over, do nothing
    if (gameState.turn !== playerColor || gameState.isGameOver) {
      return;
    }

    // If a square is already selected
    if (selectedSquare) {
      // If the same square is clicked again, deselect it
      if (selectedSquare === square) {
        set({ selectedSquare: null, validMoves: [] });
        return;
      }

      // If the clicked square is a valid move, make the move
      if (gameState.validMoves[selectedSquare]?.includes(square)) {
        get().makeMove(selectedSquare, square);
        return;
      }

      // If the clicked square has a piece of the player's color, select it
      const pieces = gameState.validMoves;
      if (pieces[square]) {
        set({
          selectedSquare: square,
          validMoves: pieces[square] || [],
        });
        return;
      }

      // Otherwise, deselect the current square
      set({ selectedSquare: null, validMoves: [] });
      return;
    }

    // If no square is selected and the clicked square has a piece of the player's color, select it
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

    if (!result1.success) {
      return result1;
    }

    const result2 = game.undoMove(); // Undo player move

    if (!result2.success) {
      return result2;
    }

    set({
      gameState: result2.state!,
      selectedSquare: null,
      validMoves: [],
      isPlayerTurn: true,
    });

    return result2;
  },

  resetGame: () => {
    get().initGame(get().playerColor, get().difficultyLevel);
  },

  requestAnalysis: async (
    query = "Analyze this position and suggest a good move"
  ) => {
    const { gameState } = get();

    if (!gameState) {
      throw new Error("Game not initialized");
    }

    set({ isAnalysisLoading: true });

    try {
      const analysis = await getLLMChessAnalysis(gameState, query);
      set({ analysis, isAnalysisLoading: false });
      return analysis;
    } catch (error) {
      set({
        error: (error as Error).message,
        isAnalysisLoading: false,
      });
      throw error;
    }
  },

  requestLLMMove: async () => {
    const { game, gameState, difficultyLevel } = get();

    if (!game || !gameState) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Get move from LLM
      const llmMove = await getLLMChessMove(gameState, difficultyLevel, false);
      console.log("LLM suggested move:", llmMove.move);

      // Clean up the move string
      const cleanMove = llmMove.move.trim();

      // Parse the move using our server-side endpoint
      const parsedMove = await parseChessMove(gameState, cleanMove);

      // Make the actual move
      const result = game.makeMove(
        parsedMove.from,
        parsedMove.to,
        parsedMove.promotion
      );

      if (!result.success) {
        throw new Error(
          `Invalid LLM move: ${parsedMove.from}-${parsedMove.to}`
        );
      }

      // Update the game state
      set({
        gameState: result.state!,
        isLoading: false,
        isPlayerTurn: true,
      });
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
}));
