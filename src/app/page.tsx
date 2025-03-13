"use client";

import React, { useState } from "react";
import ChessBoard from "@/components/chess/ChessBoard";
import { useGameStore } from "@/store/game-store";
import { DifficultyLevel } from "@/lib/llm/chess-llm";

export default function Home() {
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
  const [showAuthModal, setShowAuthModal] = useState(false);

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
    <div className='min-h-screen bg-gray-100 dark:bg-gray-900'>
      <header className='bg-white dark:bg-gray-800 shadow-md p-4'>
        <div className='container mx-auto flex justify-between items-center'>
          <h1 className='text-xl font-bold'>3D Chess with LLMs</h1>
          <button
            className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
            onClick={() => setShowAuthModal(true)}
          >
            Sign In
          </button>
        </div>
      </header>

      <main className='container mx-auto px-4 py-8'>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
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

            {/* Analysis section */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
              <h2 className='text-xl font-semibold mb-4'>Position Analysis</h2>

              <div className='space-y-4'>
                <input
                  type='text'
                  className='w-full p-2 border rounded-md bg-white dark:bg-gray-700'
                  placeholder='Ask about the position...'
                  value={analysisQuery}
                  onChange={(e) => setAnalysisQuery(e.target.value)}
                />
                <button
                  className='w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50'
                  onClick={handleAnalysisRequest}
                  disabled={isAnalysisLoading || !gameState}
                >
                  {isAnalysisLoading ? "Analyzing..." : "Analyze Position"}
                </button>
              </div>

              {showAnalysis && analysis && (
                <div className='mt-4 prose dark:prose-invert max-w-none'>
                  <div className='whitespace-pre-wrap'>{analysis.analysis}</div>

                  {analysis.suggestedMove && (
                    <div className='mt-4'>
                      <h4 className='text-lg font-medium'>Suggested Move</h4>
                      <p>{analysis.suggestedMove}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main chess board */}
          <div className='lg:col-span-3'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
              <ChessBoard />
            </div>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-bold'>Sign In</h2>
              <button
                className='text-gray-500 hover:text-gray-700'
                onClick={() => setShowAuthModal(false)}
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

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1'>Email</label>
                <input
                  type='email'
                  className='w-full p-2 border rounded-md'
                  placeholder='your@email.com'
                />
              </div>

              <div>
                <label className='block text-sm font-medium mb-1'>
                  Password
                </label>
                <input
                  type='password'
                  className='w-full p-2 border rounded-md'
                />
              </div>

              <div className='flex justify-between'>
                <button className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'>
                  Sign In
                </button>

                <button className='px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300'>
                  Sign Up
                </button>
              </div>

              <p className='text-sm text-gray-500 mt-4'>
                Sign in to track your progress and purchase credits for advanced
                analysis.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
