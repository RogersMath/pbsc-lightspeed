// src/core/useGameLoop.js
import { useEffect, useRef } from 'react';

export const useGameLoop = (callback, isRunning) => {
  const requestRef = useRef();
  const previousTimeRef = useRef();

  const animate = (time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      // Cap deltaTime to prevent huge jumps if tab was inactive
      const safeDelta = Math.min(deltaTime, 100); 
      callback(safeDelta);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
      previousTimeRef.current = undefined;
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRunning, callback]);
};