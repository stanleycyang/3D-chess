"use client";

import React, { useState } from "react";
import ChessBoard from "@/components/chess/ChessBoard";
import { useGameStore } from "@/store/game-store";
import { DifficultyLevel } from "@/lib/llm/chess-llm";

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
  } = useGameStore();

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisQuery, setAnalysisQuery] = useState("");

  // Handle difficulty change
  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDifficultyLevel(e.target.value as DifficultyLevel);
  };

  // Handle player color change
  const handleColorChange = () => {
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
                  className='w-full p-2 border rounded-md bg-white dark:bg-gray-700'
                  value={difficultyLevel}
                  onChange={handleDifficultyChange}
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
                    }`}
                    onClick={
                      playerColor === "b" ? handleColorChange : undefined
                    }
                  >
                    White
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md ${
                      playerColor === "b"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-600"
                    }`}
                    onClick={
                      playerColor === "w" ? handleColorChange : undefined
                    }
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

        {showAnalysis && analysis && (
          <div className='prose dark:prose-invert max-w-none'>
            <h3>Analysis</h3>
            <div className='whitespace-pre-wrap'>{analysis.analysis}</div>

            {analysis.suggestedMove && (
              <div className='mt-4'>
                <h4>Suggested Move</h4>
                <p>{analysis.suggestedMove}</p>
              </div>
            )}

            {analysis.evaluation && (
              <div className='mt-4'>
                <h4>Evaluation</h4>
                <p>{analysis.evaluation}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
