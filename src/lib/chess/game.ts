import { Chess, Move, PieceSymbol, Square } from "chess.js";

// Define types for chess pieces and board
export type ChessPiece = {
  type: PieceSymbol;
  color: "w" | "b";
};

export type ChessBoard = Array<Array<ChessPiece | null>>;

export type ChessGameState = {
  fen: string;
  pgn: string;
  turn: "w" | "b";
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  history: Move[];
  validMoves: Record<string, string[]>;
  board: ChessBoard;
};

export type MoveResult = {
  success: boolean;
  state?: ChessGameState;
  error?: string;
};

export class ChessGame {
  private game: Chess;

  constructor(fen?: string) {
    this.game = new Chess(fen);
  }

  public getState(): ChessGameState {
    const validMoves: Record<string, string[]> = {};

    // Get all squares with pieces that can move
    const squares = this.game.board().flatMap(
      (row, i) =>
        row
          .map((piece, j) => {
            if (piece && piece.color === this.game.turn()) {
              const square = (String.fromCharCode(97 + j) + (8 - i)) as Square;
              return square;
            }
            return null;
          })
          .filter(Boolean) as Square[]
    );

    // Get valid moves for each piece
    squares.forEach((square) => {
      const moves = this.game.moves({ square, verbose: true });
      if (moves.length > 0) {
        validMoves[square] = moves.map((move) => move.to);
      }
    });

    // Convert chess.js board to our board format
    const board = this.game
      .board()
      .map((row) =>
        row.map((piece) =>
          piece ? { type: piece.type, color: piece.color } : null
        )
      );

    return {
      fen: this.game.fen(),
      pgn: this.game.pgn(),
      turn: this.game.turn(),
      isCheck: this.game.isCheck(),
      isCheckmate: this.game.isCheckmate(),
      isDraw: this.game.isDraw(),
      isGameOver: this.game.isGameOver(),
      history: this.game.history({ verbose: true }),
      validMoves,
      board,
    };
  }

  public makeMove(from: string, to: string, promotion?: string): MoveResult {
    try {
      const moveOptions: { from: string; to: string; promotion?: PieceSymbol } =
        { from, to };
      if (promotion) {
        moveOptions.promotion = promotion as PieceSymbol;
      }

      const move = this.game.move(moveOptions);

      if (move) {
        return {
          success: true,
          state: this.getState(),
        };
      } else {
        return {
          success: false,
          error: "Invalid move",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  public undoMove(): MoveResult {
    try {
      this.game.undo();
      return {
        success: true,
        state: this.getState(),
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  public reset(): ChessGameState {
    this.game.reset();
    return this.getState();
  }

  public loadFen(fen: string): MoveResult {
    try {
      const success = Boolean(this.game.load(fen));
      return {
        success,
        state: success ? this.getState() : undefined,
        error: success ? undefined : "Invalid FEN string",
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  public loadPgn(pgn: string): MoveResult {
    try {
      const success = Boolean(this.game.loadPgn(pgn));
      return {
        success,
        state: success ? this.getState() : undefined,
        error: success ? undefined : "Invalid PGN string",
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
