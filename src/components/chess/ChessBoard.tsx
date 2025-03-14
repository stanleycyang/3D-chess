"use client";

import React, { useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useGameStore } from "@/store/game-store";
import * as THREE from "three";

// Chess piece models were removed since we're using simple geometries instead of 3D models
// due to issues with loading the GLB files

// Define colors
const COLORS = {
  white: new THREE.Color("#f0d9b5"),
  black: new THREE.Color("#b58863"),
  selected: new THREE.Color("#646cff"),
  validMove: new THREE.Color("#84cc16"),
  check: new THREE.Color("#ef4444"),
};

// Define types for chess pieces and board
type ChessPieceType = {
  type: string;
  color: "w" | "b";
};

type ChessBoard = Array<Array<ChessPieceType | null>>;

// Extended game state with board property
interface ExtendedGameState {
  board?: ChessBoard;
  isCheck?: boolean;
  turn?: "w" | "b";
}

// Helper function to get Unicode chess piece symbol
function getPieceSymbol(type: string, color: "w" | "b"): string {
  const symbols: Record<"w" | "b", Record<string, string>> = {
    w: {
      k: "♔",
      q: "♕",
      r: "♖",
      b: "♗",
      n: "♘",
      p: "♙",
    },
    b: {
      k: "♚",
      q: "♛",
      r: "♜",
      b: "♝",
      n: "♞",
      p: "♟",
    },
  };
  return symbols[color][type] || "";
}

// Promotion Dialog Component
const PromotionDialog = ({
  isOpen,
  position,
  color,
  onSelect,
  onCancel,
}: {
  isOpen: boolean;
  position: { x: number; y: number };
  color: "w" | "b";
  onSelect: (piece: string) => void;
  onCancel: () => void;
}) => {
  if (!isOpen) return null;

  const pieces = [
    { type: "q", name: "Queen" },
    { type: "r", name: "Rook" },
    { type: "b", name: "Bishop" },
    { type: "n", name: "Knight" },
  ];

  return (
    <div
      className='fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2'
      style={{
        top: position.y,
        left: position.x,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className='text-center mb-2 font-bold'>Promote to:</div>
      <div className='grid grid-cols-2 gap-2'>
        {pieces.map((piece) => (
          <button
            key={piece.type}
            className='p-2 bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 rounded flex flex-col items-center'
            onClick={() => onSelect(piece.type)}
          >
            <div className='text-2xl'>{getPieceSymbol(piece.type, color)}</div>
            <div className='text-xs mt-1'>{piece.name}</div>
          </button>
        ))}
      </div>
      <button
        className='w-full mt-2 p-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded text-sm'
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
};

// Fallback piece component using basic 3D shapes
const FallbackPiece = ({
  piece,
  position,
  color,
}: {
  piece: string;
  position: [number, number, number];
  color: "w" | "b";
}) => {
  const pieceColor = color === "w" ? 0xffffff : 0x333333;

  // Different shapes for different pieces
  let geometry;
  let yOffset = 0;

  switch (piece.toLowerCase()) {
    case "p": // Pawn
      geometry = <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} />;
      yOffset = 0.25;
      break;
    case "r": // Rook
      geometry = <boxGeometry args={[0.3, 0.5, 0.3]} />;
      yOffset = 0.25;
      break;
    case "n": // Knight
      geometry = <coneGeometry args={[0.2, 0.6, 16]} />;
      yOffset = 0.3;
      break;
    case "b": // Bishop
      geometry = <coneGeometry args={[0.2, 0.7, 16]} />;
      yOffset = 0.35;
      break;
    case "q": // Queen
      geometry = <sphereGeometry args={[0.25, 16, 16]} />;
      yOffset = 0.25;
      break;
    case "k": // King
      geometry = <boxGeometry args={[0.25, 0.7, 0.25]} />;
      yOffset = 0.35;
      break;
    default:
      geometry = <boxGeometry args={[0.3, 0.3, 0.3]} />;
      yOffset = 0.15;
  }

  return (
    <mesh position={[position[0], position[1] + yOffset, position[2]]}>
      {geometry}
      <meshStandardMaterial color={pieceColor} />
    </mesh>
  );
};

// Chess piece component with model loading
const ModelChessPiece = ({
  piece,
  position,
  color,
}: {
  piece: string;
  position: [number, number, number];
  color: "w" | "b";
}) => {
  // Replace with SimpleChessPiece implementation
  return <SimpleChessPiece piece={piece} position={position} color={color} />;
};

// Simple chess piece component using basic geometries
const SimpleChessPiece = ({
  piece,
  position,
  color,
}: {
  piece: string;
  position: [number, number, number];
  color: "w" | "b";
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialColor = color === "w" ? 0xffffff : 0x333333;

  // Define geometry based on piece type
  let geometry;
  let scale = [1, 1, 1] as [number, number, number];
  let yOffset = 0;

  switch (piece.toLowerCase()) {
    case "p": // Pawn
      geometry = <cylinderGeometry args={[0.3, 0.3, 0.8]} />;
      scale = [0.8, 0.8, 0.8];
      break;
    case "r": // Rook
      geometry = <boxGeometry args={[0.6, 1, 0.6]} />;
      break;
    case "n": // Knight
      geometry = <coneGeometry args={[0.4, 1, 8]} />;
      yOffset = 0.5;
      break;
    case "b": // Bishop
      geometry = <coneGeometry args={[0.4, 1.2, 16]} />;
      yOffset = 0.6;
      break;
    case "q": // Queen
      geometry = <sphereGeometry args={[0.5, 16, 16]} />;
      yOffset = 0.5;
      break;
    case "k": // King
      geometry = <boxGeometry args={[0.5, 1.3, 0.5]} />;
      yOffset = 0.65;
      break;
    default:
      geometry = <boxGeometry args={[0.5, 0.5, 0.5]} />;
  }

  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1] + yOffset, position[2]]}
      scale={scale}
      castShadow
      receiveShadow
    >
      {geometry}
      <meshStandardMaterial color={materialColor} />
    </mesh>
  );
};

// Chess piece component with fallback
const ChessPiece = ({
  piece,
  position,
  color,
}: {
  piece: string;
  position: [number, number, number];
  color: "w" | "b";
}) => {
  const [useModelFallback, setUseModelFallback] = useState(false);

  // Handle model loading errors
  const handleError = () => {
    setUseModelFallback(true);
  };

  // Use fallback if model loading fails
  if (useModelFallback) {
    return <FallbackPiece piece={piece} position={position} color={color} />;
  }

  // Try to load the model, but use fallback if it fails
  return (
    <React.Suspense
      fallback={
        <FallbackPiece piece={piece} position={position} color={color} />
      }
    >
      <ErrorBoundary onError={handleError}>
        <ModelChessPiece piece={piece} position={position} color={color} />
      </ErrorBoundary>
    </React.Suspense>
  );
};

// Error boundary for handling model loading errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

// Square component
const Square = ({
  position,
  color,
  isSelected,
  isValidMove,
  isCheck,
  onClick,
}: {
  position: [number, number, number];
  color: "white" | "black";
  isSelected: boolean;
  isValidMove: boolean;
  isCheck: boolean;
  onClick: (event: React.MouseEvent) => void;
}) => {
  const squareColor = isSelected
    ? COLORS.selected
    : isValidMove
      ? COLORS.validMove
      : isCheck
        ? COLORS.check
        : COLORS[color];

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(event) => {
        // Convert Three.js event to React event
        const syntheticEvent = {
          clientX: event.clientX,
          clientY: event.clientY,
          // Add other properties as needed
        } as React.MouseEvent;
        onClick(syntheticEvent);
      }}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color={squareColor} />
    </mesh>
  );
};

// Board component
const Board = () => {
  const { gameState, selectedSquare, selectSquare, makeMove } = useGameStore();
  const [promotionState, setPromotionState] = useState<{
    isOpen: boolean;
    from: string;
    to: string;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    from: "",
    to: "",
    position: { x: 0, y: 0 },
  });

  // Mock board data for development (will be replaced with actual game state)
  const mockBoard: ChessBoard = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Handle square click
  const handleSquareClick = (square: string, event: React.MouseEvent) => {
    if (promotionState.isOpen) return;

    if (
      selectedSquare &&
      isPawnPromotionMove(selectedSquare, square, gameState)
    ) {
      // Open promotion dialog
      setPromotionState({
        isOpen: true,
        from: selectedSquare,
        to: square,
        position: { x: event.clientX, y: event.clientY },
      });
    } else {
      selectSquare(square);
    }
  };

  // Handle promotion selection
  const handlePromotionSelect = (piece: string) => {
    makeMove(promotionState.from, promotionState.to, piece);
    setPromotionState({ ...promotionState, isOpen: false });
  };

  // Handle promotion cancel
  const handlePromotionCancel = () => {
    setPromotionState({ ...promotionState, isOpen: false });
  };

  // Check if a move is a pawn promotion move
  const isPawnPromotionMove = (
    from: string,
    to: string,
    gameState: ExtendedGameState | null
  ): boolean => {
    if (!gameState) return false;

    // Check if the piece is a pawn
    const fromCoords = algebraicToCoords(from);
    if (!fromCoords) return false;

    const piece = gameState.board?.[fromCoords.row]?.[fromCoords.col];
    if (!piece || piece.type !== "p") return false;

    // Check if the destination is on the last rank
    const toCoords = algebraicToCoords(to);
    if (!toCoords) return false;

    // For white pawns, check if destination is on the 8th rank (row 0)
    // For black pawns, check if destination is on the 1st rank (row 7)
    return (
      (piece.color === "w" && toCoords.row === 0) ||
      (piece.color === "b" && toCoords.row === 7)
    );
  };

  // Convert algebraic notation to board coordinates
  const algebraicToCoords = (
    square: string
  ): { row: number; col: number } | null => {
    if (square.length !== 2) return null;

    const file = square.charCodeAt(0) - 97; // 'a' -> 0, 'b' -> 1, etc.
    const rank = 8 - parseInt(square[1]); // '8' -> 0, '7' -> 1, etc.

    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;

    return { row: rank, col: file };
  };

  // Get valid moves for the selected square
  const getValidMovesForSquare = (): string[] => {
    if (!gameState || !selectedSquare) return [];
    return gameState.validMoves[selectedSquare] || [];
  };

  // Current valid moves for the selected piece
  const currentValidMoves = selectedSquare ? getValidMovesForSquare() : [];

  // Render the board
  return (
    <>
      <group>
        {/* Board squares */}
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => {
            const x = col - 3.5;
            const z = row - 3.5;
            const color = (row + col) % 2 === 0 ? "white" : "black";
            const file = String.fromCharCode(97 + col);
            const rank = 8 - row;
            const square = `${file}${rank}`;

            const isSelected = selectedSquare === square;
            const isValidMove = currentValidMoves.includes(square);

            // Check if the king on this square is in check
            const extendedGameState = gameState as ExtendedGameState;
            const board = extendedGameState?.board || mockBoard;
            const isCheck =
              extendedGameState?.isCheck &&
              board[row]?.[col]?.type === "k" &&
              board[row]?.[col]?.color === extendedGameState.turn;

            return (
              <Square
                key={`${row}-${col}`}
                position={[x, 0, z]}
                color={color}
                isSelected={isSelected}
                isValidMove={isValidMove}
                isCheck={isCheck || false}
                onClick={(event) => handleSquareClick(square, event)}
              />
            );
          })
        )}

        {/* Rank and file labels */}
        {Array.from({ length: 8 }, (_, i) => (
          <React.Fragment key={`labels-${i}`}>
            {/* File labels (a-h) */}
            <Text
              position={[i - 3.5, 0, 4.2]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.3}
              color='#000000'
            >
              {String.fromCharCode(97 + i)}
            </Text>

            {/* Rank labels (1-8) */}
            <Text
              position={[-4.2, 0, i - 3.5]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.3}
              color='#000000'
            >
              {8 - i}
            </Text>
          </React.Fragment>
        ))}

        {/* Chess pieces */}
        {((gameState as ExtendedGameState)?.board || mockBoard).map(
          (row, rowIndex) =>
            row.map((piece, colIndex) => {
              if (piece) {
                const x = colIndex - 3.5;
                const z = rowIndex - 3.5;
                const key = `piece-${rowIndex}-${colIndex}`;

                return (
                  <ChessPiece
                    key={key}
                    piece={piece.type}
                    position={[x, 0.1, z]}
                    color={piece.color}
                  />
                );
              }
              return null;
            })
        )}
      </group>

      {/* Promotion Dialog */}
      <PromotionDialog
        isOpen={promotionState.isOpen}
        position={promotionState.position}
        color={gameState?.turn || "w"}
        onSelect={handlePromotionSelect}
        onCancel={handlePromotionCancel}
      />
    </>
  );
};

// Camera setup
const CameraSetup = () => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 8, 8);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
};

// Main ChessBoard component
const ChessBoard = () => {
  const { initGame, gameState } = useGameStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    // Initialize the game when the component mounts
    if (!gameState) {
      initGame();
    }
  }, [initGame, gameState]);

  useEffect(() => {
    // Function to update the container size
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };

    // Update size initially
    updateSize();

    // Add resize event listener
    window.addEventListener("resize", updateSize);

    // Create a ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Clean up
    return () => {
      window.removeEventListener("resize", updateSize);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className='w-full h-full min-h-[400px] flex items-center justify-center'
    >
      {containerSize.width > 0 && containerSize.height > 0 && (
        <Canvas shadows style={{ width: "100%", height: "100%" }}>
          <CameraSetup />
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <Board />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      )}
    </div>
  );
};

export default ChessBoard;
