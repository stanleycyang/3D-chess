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
  onClick: () => void;
}) => {
  const squareColor = isSelected
    ? COLORS.selected
    : isValidMove
    ? COLORS.validMove
    : isCheck
    ? COLORS.check
    : COLORS[color];

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} onClick={onClick}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color={squareColor} />
    </mesh>
  );
};

// Board component
const Board = () => {
  const { gameState, selectedSquare, validMoves, selectSquare } =
    useGameStore();

  // Mock board data for development (will be replaced with actual game state)
  const mockBoard: ChessBoard = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Handle square click
  const handleSquareClick = (square: string) => {
    selectSquare(square);
  };

  // Render the board
  return (
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
          const isValidMove = validMoves.includes(square);

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
              onClick={() => handleSquareClick(square)}
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

  useEffect(() => {
    // Initialize the game when the component mounts
    if (!gameState) {
      initGame();
    }
  }, [initGame, gameState]);

  return (
    <div className='w-full h-[600px]'>
      <Canvas shadows>
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
    </div>
  );
};

export default ChessBoard;
