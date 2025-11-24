/**
 * src/core/AudioSynth.js A pure Web Audio API synthesizer.
 * Generates sounds procedurally without external assets.
 */

let audioCtx = null;
let masterGain = null;

const initAudio = () => {
  if (!audioCtx) {
    const CtxClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new CtxClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3; // Master volume (keep it reasonable)
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// --- Sound Generators ---

const playTone = (freq, type, duration, startTime = 0, vol = 1.0) => {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
  
  // Envelope (Attack/Decay)
  gain.gain.setValueAtTime(0, audioCtx.currentTime + startTime);
  gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + startTime + 0.01); // Attack
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + startTime + duration); // Decay
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start(audioCtx.currentTime + startTime);
  osc.stop(audioCtx.currentTime + startTime + duration + 0.1);
};

const playNoise = (duration, type = 'white') => {
  if (!audioCtx) return;
  
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    // Simple white noise
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  // Filter for "Sci-Fi" swoosh
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  filter.Q.value = 1;
  
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  
  noise.start();
};

// --- SFX Library ---

export const SFX = {
  // UI Sounds
  click: () => {
    initAudio();
    playTone(800, 'sine', 0.1, 0, 0.5);
  },
  hover: () => {
    initAudio();
    playTone(300, 'sine', 0.05, 0, 0.1); // Very subtle
  },
  error: () => {
    initAudio();
    playTone(150, 'sawtooth', 0.3);
    playTone(100, 'sawtooth', 0.3, 0.1);
  },
  
  // Game Sounds
  warpEngage: () => {
    initAudio();
    playTone(200, 'square', 1.0, 0, 0.3);
    playNoise(1.5); // Swoosh
    // Rising pitch
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 1);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 1);
  },
  
  pickup: () => {
    initAudio();
    // High cheerful arpeggio
    playTone(880, 'sine', 0.1, 0, 0.4); // A5
    playTone(1108, 'sine', 0.1, 0.05, 0.4); // C#6
    playTone(1318, 'sine', 0.2, 0.1, 0.4); // E6
  },
  
  crash: () => {
    initAudio();
    playTone(100, 'sawtooth', 0.5);
    playNoise(0.4);
  },
  
  craft: () => {
    initAudio();
    // Computer processing sounds
    [0, 0.1, 0.2, 0.3].forEach(t => {
        playTone(400 + Math.random() * 400, 'square', 0.05, t, 0.2);
    });
    playTone(800, 'sine', 0.5, 0.4); // Ding
  }
};