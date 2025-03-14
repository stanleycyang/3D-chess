"use client";

import React, { useState } from "react";
import ChessBoard from "@/components/chess/ChessBoard";
import { useGameStore } from "@/store/game-store";
import { DifficultyLevel } from "@/lib/llm/chess-llm";

// Analysis Modal Component
const AnalysisModal = ({
  analysis,
  isOpen,
  onClose,
}: {
  analysis: {
    analysis: string;
    suggestedMove?: string;
    evaluation?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen || !analysis) return null;

  // Function to format chess notation with explanation
  const formatChessNotation = (text: string) => {
    // Replace common chess notations with explanations
    return text.replace(
      /([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)/g,
      (match) => {
        let explanation = match;

        // Add explanations for piece symbols
        if (match.startsWith("K"))
          explanation = explanation.replace("K", "King ");
        if (match.startsWith("Q"))
          explanation = explanation.replace("Q", "Queen ");
        if (match.startsWith("R"))
          explanation = explanation.replace("R", "Rook ");
        if (match.startsWith("B"))
          explanation = explanation.replace("B", "Bishop ");
        if (match.startsWith("N"))
          explanation = explanation.replace("N", "Knight ");

        // Highlight the notation
        return `<span class="font-bold text-blue-600 dark:text-blue-400" title="${explanation}">${match}</span>`;
      }
    );
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col'>
        <div className='p-4 border-b flex justify-between items-center'>
          <h2 className='text-xl font-semibold'>Position Analysis</h2>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-6 w-6'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        <div className='p-4 overflow-y-auto flex-grow'>
          <div className='prose dark:prose-invert max-w-none'>
            <h3>Analysis</h3>
            <div
              className='whitespace-pre-wrap'
              dangerouslySetInnerHTML={{
                __html: formatChessNotation(analysis.analysis),
              }}
            />

            {analysis.suggestedMove && (
              <div className='mt-4'>
                <h4>Suggested Move</h4>
                <p
                  dangerouslySetInnerHTML={{
                    __html: formatChessNotation(analysis.suggestedMove),
                  }}
                />
              </div>
            )}

            {analysis.evaluation && (
              <div className='mt-4'>
                <h4>Evaluation</h4>
                <p>{analysis.evaluation}</p>
              </div>
            )}
          </div>
        </div>

        <div className='p-4 border-t'>
          <button
            onClick={onClose}
            className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 w-full'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function PlayPage() {
  const {
    gameState,
    playerColor,
    difficultyLevel,
    isLoading,
    error,
    analysis,
    isAnalysisLoading,
    resetGame,
    undoMove,
    requestAnalysis,
    setDifficultyLevel,
    setPlayerColor,
  } = useGameStore();

  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const [analysisQuery, setAnalysisQuery] = useState("");

  // Check if game is in progress
  const isGameInProgress = gameState && !gameState.isGameOver;

  // Handle difficulty change
  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDifficultyLevel(e.target.value as DifficultyLevel);
  };

  // Handle player color change
  const handleColorChange = (color: "w" | "b") => {
    setPlayerColor(color);
    resetGame();
  };

  // Handle analysis request
  const handleAnalysisRequest = async () => {
    try {
      await requestAnalysis(analysisQuery || undefined);
      setShowAnalysis(true);
    } catch (error) {
      console.error("Analysis error:", error);
    }
  };

  // Close analysis modal
  const handleCloseAnalysis = () => {
    setShowAnalysis(false);
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold mb-6'>3D Chess with LLM</h1>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Left sidebar with game controls */}
        <div className='lg:col-span-1 space-y-6'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
            <h2 className='text-xl font-semibold mb-4'>Game Controls</h2>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1'>
                  Difficulty
                </label>
                <select
                  className='w-full p-2 border rounded-md bg-white dark:bg-gray-700 disabled:opacity-70'
                  value={difficultyLevel}
                  onChange={handleDifficultyChange}
                  disabled={isGameInProgress}
                >
                  <option value='beginner'>Beginner</option>
                  <option value='intermediate'>Intermediate</option>
                  <option value='advanced'>Advanced</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium mb-1'>
                  Play as
                </label>
                <div className='flex items-center space-x-4'>
                  <button
                    className={`px-4 py-2 rounded-md ${
                      playerColor === "w"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-600"
                    } disabled:opacity-70`}
                    onClick={() => handleColorChange("w")}
                    disabled={isGameInProgress}
                  >
                    White
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md ${
                      playerColor === "b"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-600"
                    } disabled:opacity-70`}
                    onClick={() => handleColorChange("b")}
                    disabled={isGameInProgress}
                  >
                    Black
                  </button>
                </div>
              </div>

              <div className='flex space-x-2'>
                <button
                  className='px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500'
                  onClick={() => undoMove()}
                >
                  Undo Move
                </button>
                <button
                  className='px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500'
                  onClick={() => resetGame()}
                >
                  New Game
                </button>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
            <h2 className='text-xl font-semibold mb-4'>Game Status</h2>

            {gameState && (
              <div className='space-y-2'>
                <p>
                  <span className='font-medium'>Turn: </span>
                  {gameState.turn === "w" ? "White" : "Black"}
                </p>

                {gameState.isCheck && (
                  <p className='text-red-500 font-medium'>Check!</p>
                )}

                {gameState.isCheckmate && (
                  <p className='text-red-500 font-bold'>Checkmate!</p>
                )}

                {gameState.isDraw && (
                  <p className='text-yellow-500 font-bold'>Draw!</p>
                )}

                {isLoading && (
                  <p className='text-blue-500'>AI is thinking...</p>
                )}

                {error && <p className='text-red-500'>{error}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Main chess board */}
        <div className='lg:col-span-2'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
            <ChessBoard />
          </div>
        </div>
      </div>

      {/* Analysis section */}
      <div className='mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
        <h2 className='text-xl font-semibold mb-4'>Position Analysis</h2>

        <div className='flex space-x-2 mb-4'>
          <input
            type='text'
            className='flex-1 p-2 border rounded-md bg-white dark:bg-gray-700'
            placeholder='Ask about the position or leave empty for general analysis'
            value={analysisQuery}
            onChange={(e) => setAnalysisQuery(e.target.value)}
          />
          <button
            className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50'
            onClick={handleAnalysisRequest}
            disabled={isAnalysisLoading || !gameState}
          >
            {isAnalysisLoading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {/* Analysis Modal */}
        <AnalysisModal
          analysis={analysis}
          isOpen={showAnalysis}
          onClose={handleCloseAnalysis}
        />
      </div>
    </div>
  );
}
