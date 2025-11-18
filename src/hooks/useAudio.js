import { useCallback } from 'react';
import { SFX } from '../core/AudioSynth';

export const useAudio = () => {
  // In a future iteration, we can pull "isMuted" from GameContext
  const isMuted = false; 

  const play = useCallback((soundName) => {
    if (isMuted) return;
    
    const soundFunc = SFX[soundName];
    if (soundFunc) {
      soundFunc();
    } else {
      console.warn(`Sound "${soundName}" not found in library.`);
    }
  }, [isMuted]);

  return { play };
};