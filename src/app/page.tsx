"use client";
import { useEffect, useRef, useState } from 'react';
import { usePyodide } from '@/hooks/usePyodide';

/**
 * Home Component: A Snake game powered by a Python engine running in the browser.
 * * DESIGN ARCHITECTURE:
 * 1. React: Handles the UI, High Scores, and the "Heartbeat" (setInterval).
 * 2. HTML5 Canvas: Handles the high-performance rendering of the snake and food.
 * 3. Pyodide: Executes Python logic to calculate movement and collisions.
 * 4. Refs: Store game data (snake, food) to prevent data loss when the game speeds up.
 */
export default function Home() {
  // --- PYODIDE HOOK ---
  const { pyodide, isLoading } = usePyodide();
  
  // --- DOM REFERENCES ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // --- PERSISTENT GAME STATE (Refs) ---
  /**
   * Why use Refs instead of State?
   * React State triggers a re-render every time it changes. In a game, we update 
   * coordinates 10+ times per second. Using Refs allows us to store and update 
   * positions without the overhead of React's render cycle, and prevents the 
   * "Reset Bug" when the speed variable changes.
   */
  const snakeRef = useRef([[10, 10], [10, 11], [10, 12]]);
  const foodRef = useRef([5, 5]);
  const directionRef = useRef("UP");

  // --- UI STATE ---
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(150); // Milliseconds between moves

  // --- INITIALIZATION ---
  // Load the high score from LocalStorage once when the component mounts
  useEffect(() => {
    const saved = localStorage.getItem("snakeHighScore");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // --- MAIN GAME LOOP EFFECT ---
  /**
   * This effect runs the game loop. It restarts whenever 'speed' or 'gameOver' changes.
   * Because it depends on 'speed', it creates a new setInterval with the updated timing
   * every time the player eats food.
   */
  useEffect(() => {
    // Stop the loop if Python isn't ready or the player lost
    if (isLoading || !pyodide || gameOver) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    /**
     * Input Listener: Updates the directionRef.
     * We use a Ref here so the Interval always has access to the latest key pressed.
     */
    const handleKey = (e: KeyboardEvent) => {
      const keys: Record<string, string> = { 
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT" 
      };
      if (keys[e.key]) directionRef.current = keys[e.key];
    };

    window.addEventListener('keydown', handleKey);

    // The Interval acts as the "Engine"
    const interval = setInterval(() => {
      try {
        /**
         * 1. THE BRIDGE: CALLING PYTHON
         * We pass current JS values into the Python 'move_snake' function.
         * .toJs() converts the Python return value into a JavaScript Map.
         */
        const result = pyodide.runPython(`
          move_snake(${JSON.stringify(snakeRef.current)}, "${directionRef.current}", ${JSON.stringify(foodRef.current)})
        `)?.toJs();

        // If Python returns None/null, a collision occurred
        if (!result) {
          setGameOver(true);
          clearInterval(interval);
          return;
        }

        // 2. UPDATE POSITION
        // Update our Ref with the new snake body calculated by Python
        snakeRef.current = result.get("snake");

        // 3. LOGIC: IF FOOD WAS EATEN
        if (result.get("ate")) {
          // Functional update for score (safest way to update based on previous state)
          setScore(s => {
            const newScore = s + 1;
            // Update High Score logic
            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem("snakeHighScore", newScore.toString());
            }
            return newScore;
          });

          // Move food to a random grid coordinate (0-19)
          foodRef.current = [Math.floor(Math.random() * 20), Math.floor(Math.random() * 20)];
          
          /**
           * 4. SPEED SCALING:
           * Every time food is eaten, we reduce the delay by 2ms.
           * This triggers the useEffect to re-run and start a faster setInterval.
           */
          setSpeed(prevSpeed => Math.max(50, prevSpeed - 2));
        }

        // 5. RENDERING (Drawing the Game)
        // Clear background
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 400, 400);

        // Draw Snake segments
        ctx.fillStyle = "#00FF00";
        snakeRef.current.forEach(([x, y]: any) => ctx.fillRect(x * 20, y * 20, 19, 19));

        // Draw Food
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(foodRef.current[0] * 20, foodRef.current[1] * 20, 19, 19);
        
      } catch (err) {
        console.error("Python Execution Error:", err);
      }
    }, speed);

    // CLEANUP: Removes listeners and stops the timer when the component re-renders or unmounts
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isLoading, pyodide, speed, gameOver]); 

  return (
    <main style={{ textAlign: 'center', marginTop: '50px' }}>
      {isLoading ? <p>Loading Python Engine...</p> : (
        <>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            Score: {score} {gameOver && "— GAME OVER!"}
          </p>
          
          <canvas 
            ref={canvasRef} 
            width={400} 
            height={400} 
            style={{ border: '5px solid #333', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }} 
          />
          
          <div className="status-container" style={{ marginTop: '20px' }}>
            <p style={{ color: '#FFD700', fontSize: '1.2rem' }}>🏆 High Score: {highScore}</p> 
            
            {/* Speed Feedback: 200ms is 0% speed, 50ms is near 100% */}
            <div style={{ fontSize: '0.9rem', color: '#00FF00', fontWeight: 'mono' }}>
              ENGINE VELOCITY: {Math.round(((150 - speed) / 100) * 100 + 100)}%
            </div>

            {gameOver && (
              <button 
                onClick={() => window.location.reload()} 
                style={{ 
                  marginTop: '20px', 
                  padding: '10px 30px', 
                  fontSize: '1rem', 
                  cursor: 'pointer',
                  backgroundColor: '#444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px'
                }}
              >
                Try Again
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}