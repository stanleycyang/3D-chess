"use client";

import React, { useState } from "react";
import ChessBoard from "@/components/chess/ChessBoard";
import { useGameStore } from "@/store/game-store";
import { DifficultyLevel } from "@/lib/llm/chess-llm";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { chessAnalysisSchema } from "@/lib/chess/analysis-schema";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Home() {
  const {
    gameState,
    playerColor,
    difficultyLevel,
    isLoading,
    error,
    resetGame,
    undoMove,
    setDifficultyLevel,
    setPlayerColor,
  } = useGameStore();

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);

  // Use the useObject hook for streaming analysis
  const {
    object: analysis,
    submit: requestAnalysis,
    isLoading: isAnalysisStreaming,
  } = useObject({
    api: "/api/chess/analysis",
    schema: chessAnalysisSchema,
  });

  // Handle difficulty change
  const handleDifficultyChange = (value: string) => {
    setDifficultyLevel(value as DifficultyLevel);
  };

  // Handle player color change
  const handleColorChange = (value: string) => {
    if (value !== playerColor) {
      setPlayerColor(value as "w" | "b");
      resetGame();
    }
  };

  // Handle analysis request
  const handleAnalysisRequest = async () => {
    if (!gameState) return;

    try {
      setAnalysisDialogOpen(true);
      requestAnalysis({ gameState });
      setShowAnalysis(true);
    } catch (error) {
      console.error("Analysis error:", error);
    }
  };

  return (
    <div className='min-h-screen bg-gray-100 dark:bg-gray-900'>
      <main className='w-full px-4 py-4'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-4'>
          {/* Left sidebar with game controls */}
          <div className='lg:col-span-3 space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Game Controls</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium mb-1'>
                    Difficulty
                  </label>
                  <Select
                    value={difficultyLevel}
                    onValueChange={handleDifficultyChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select difficulty' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='beginner'>Beginner</SelectItem>
                      <SelectItem value='intermediate'>Intermediate</SelectItem>
                      <SelectItem value='advanced'>Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <label className='block text-sm font-medium mb-1'>
                    Play as
                  </label>
                  <RadioGroup
                    value={playerColor}
                    onValueChange={handleColorChange}
                    className='flex space-x-4'
                  >
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='w' id='white' />
                      <Label htmlFor='white'>White</Label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='b' id='black' />
                      <Label htmlFor='black'>Black</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className='flex space-x-2'>
                  <Button variant='outline' onClick={() => undoMove()}>
                    Undo Move
                  </Button>
                  <Button variant='outline' onClick={() => resetGame()}>
                    New Game
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Game Status</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Position Analysis - moved to left sidebar */}
            <Card>
              <CardHeader>
                <CardTitle>Position Analysis</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  Click the button below to get a beginner-friendly analysis of
                  the current position.
                </p>
                <Button
                  className='w-full'
                  onClick={handleAnalysisRequest}
                  disabled={isAnalysisStreaming || !gameState}
                >
                  {isAnalysisStreaming ? (
                    <span className='flex items-center justify-center'>
                      <svg
                        className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                      >
                        <circle
                          className='opacity-25'
                          cx='12'
                          cy='12'
                          r='10'
                          stroke='currentColor'
                          strokeWidth='4'
                        ></circle>
                        <path
                          className='opacity-75'
                          fill='currentColor'
                          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        ></path>
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    "Analyze Position"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main chess board */}
          <div className='lg:col-span-9'>
            <Card className='h-full'>
              <CardContent className='p-0 h-[calc(100vh-8rem)]'>
                <ChessBoard />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Analysis Dialog */}
      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Position Analysis</DialogTitle>
          </DialogHeader>
          {showAnalysis && analysis && (
            <div className='mt-4 prose dark:prose-invert max-w-none'>
              <div className='whitespace-pre-wrap'>{analysis.analysis}</div>

              {analysis.suggestedMove && (
                <div className='mt-4'>
                  <h4 className='text-lg font-medium'>Suggested Move</h4>
                  <p>{analysis.suggestedMove}</p>
                </div>
              )}

              {analysis.evaluation && (
                <div className='mt-4'>
                  <h4 className='text-lg font-medium'>Position Evaluation</h4>
                  <p>{analysis.evaluation}</p>
                </div>
              )}
            </div>
          )}
          {isAnalysisStreaming && (
            <div className='flex items-center justify-center py-8'>
              <svg
                className='animate-spin h-8 w-8 text-primary'
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                ></circle>
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                ></path>
              </svg>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
