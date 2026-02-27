"use client";
import { useEffect, useRef, useState } from 'react';
import { usePyodide } from '@/hooks/usePyodide';

export default function Home() {
  const { pyodide, isLoading } = usePyodide();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("snakeHighScore");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  useEffect(() => {
    if (isLoading || !pyodide) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    let snake = [[10, 10], [10, 11], [10, 12]];
    let food = [5, 5];
    let direction = "UP";

    const handleKey = (e: KeyboardEvent) => {
      const keys: Record<string, string> = { 
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT" 
      };
      if (keys[e.key]) direction = keys[e.key];
    };

    window.addEventListener('keydown', handleKey);

    const interval = setInterval(() => {
      try {
        const result = pyodide.runPython(`
          move_snake(${JSON.stringify(snake)}, "${direction}", ${JSON.stringify(food)})
        `)?.toJs();

        if (!result) {
          setGameOver(true);
          clearInterval(interval);

        const currentHighScore = parseInt(localStorage.getItem("snakeHighScore") || "0");
        if (score > currentHighScore) {
          localStorage.setItem("snakeHighScore", score.toString());
          setHighScore(score);
        }
        return;
      }

        snake = result.get("snake");
        if (result.get("ate")) {
          setScore(s => s + 1);
          food = [Math.floor(Math.random() * 20), Math.floor(Math.random() * 20)];
        }

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = "#00FF00";
        snake.forEach(([x, y]: any) => ctx.fillRect(x * 20, y * 20, 19, 19));
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(food[0] * 20, food[1] * 20, 19, 19);
        
      } catch (err) {
        console.error("Python Error:", err);
      }
    }, 150);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isLoading, pyodide]);

  return (
    <main style={{ textAlign: 'center', marginTop: '50px' }}>
      {isLoading ? <p>Loading Python Engine...</p> : (
        <>
          <p>Score: {score} {gameOver && "— GAME OVER!"}</p>
          <canvas ref={canvasRef} width={400} height={400} style={{ border: '5px solid #333' }} />
          {gameOver && <button onClick={() => window.location.reload()} style={{ display: 'block', margin: '20px auto', padding: '10px 20px' }}>Restart</button>}

          <div className="status-container">
            <p style={{ color: '#FFD700' }}>🏆 High Score: {highScore}</p> 
            {gameOver && <h2 style={{ color: 'red' }}>GAME OVER!</h2>}
          </div>
          
        </>
      )}
    </main>
  );
}