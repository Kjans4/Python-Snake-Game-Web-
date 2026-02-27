import { useState, useEffect } from 'react';

export const usePyodide = () => {
  const [pyodide, setPyodide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPyodideInstance = async () => {
      // @ts-ignore
      if (!window.loadPyodide) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
        script.onload = async () => {
          // @ts-ignore
          const py = await window.loadPyodide();
          const pythonCode = await fetch('/snake_logic.py').then(res => res.text());
          await py.runPythonAsync(pythonCode);
          setPyodide(py);
          setIsLoading(false);
        };
        document.head.appendChild(script);
      }
    };
    loadPyodideInstance();
  }, []);

  return { pyodide, isLoading };
};