import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useGame } from '../../core/GameContext';
import { useGameLoop } from '../../core/useGameLoop';
import { project, spawnEntity, checkCollision } from './runnerEngine';
import { useAudio } from '../../hooks/useAudio';
import { HARMONICS } from '../../data/gameData';
import { Zap, ShieldAlert, Activity, ChevronLeft, ChevronRight, Radio } from 'lucide-react';

// Game Settings
const TARGET_DISTANCE = 3000; 
const BASE_SPEED = 0.6;       
const SPAWN_RATE = 400;       

export default function RunnerMode() {
  const { state, dispatch } = useGame();
  const { play } = useAudio();
  const canvasRef = useRef(null);

  // --- State ---
  const [lane, setLane] = useState(0); 
  
  // We use a Ref for lane in the loop to avoid stale closures
  const laneRef = useRef(0); 
  
  const [stats, setStats] = useState({ 
    score: 0, 
    health: 100, 
    distance: 0,
    collectedMaterials: {}
  });
  
  // The current "Question" the player must answer
  const [harmonic, setHarmonic] = useState(HARMONICS[0]);
  const harmonicRef = useRef(HARMONICS[0]); // Ref for loop access

  const [status, setStatus] = useState('running'); 

  // Mutable Game Physics State
  const gameState = useRef({
    entities: [],
    lastSpawnZ: 0,
    speed: 8,
    wobble: 0
  });

  // --- Logic ---

  const cycleHarmonic = useCallback(() => {
    const next = HARMONICS[Math.floor(Math.random() * HARMONICS.length)];
    setHarmonic(next);
    harmonicRef.current = next;
    play('success'); // Good sound
  }, [play]);

  const handleMove = useCallback((dir) => {
    if (status !== 'running') return;
    
    setLane(prev => {
      const next = Math.max(-1, Math.min(1, prev + dir));
      laneRef.current = next; // Update Ref for the loop!
      return next;
    });
  }, [status]);

  // Keyboard Input
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') handleMove(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') handleMove(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleMove]);

  // --- Game Loop ---
  useGameLoop((dt) => {
    if (status !== 'running') return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const cvs = ctx.canvas;
    const w = cvs.width;
    const h = cvs.height;
    const game = gameState.current;

    // 1. Physics
    const moveDist = game.speed * (dt / 16) * BASE_SPEED;
    setStats(prev => ({ ...prev, distance: prev.distance + moveDist }));
    
    // Move entities
    game.entities.forEach(ent => { ent.z -= moveDist; });

    // Spawn
    if (stats.distance - game.lastSpawnZ > SPAWN_RATE) {
      // Pass the current required value to spawner to bias the RNG
      game.entities.push(spawnEntity(1200, harmonicRef.current.targetValue));
      game.lastSpawnZ = stats.distance;
    }
    
    // Cleanup
    game.entities = game.entities.filter(ent => ent.z > -100);

    // 2. Collision
    // Use laneRef.current for accurate player position
    game.entities.forEach(ent => {
      if (!ent.collected && checkCollision(laneRef.current, ent)) {
        ent.collected = true;

        if (ent.type === 'debris') {
          // Hit Debris
          play('crash');
          setStats(prev => ({ ...prev, health: Math.max(0, prev.health - 15) }));
        } else {
          // Hit Data - Check Harmonic Match
          const val = ent.content.value;
          const target = harmonicRef.current.targetValue;
          
          // Float comparison tolerance
          const isMatch = Math.abs(val - target) < 0.001;

          if (isMatch) {
            // CORRECT: Heal, Score, Collect, Switch Harmonic
            cycleHarmonic(); // New question!
            setStats(prev => {
              const matId = ent.content.materialId;
              return { 
                ...prev, 
                score: prev.score + 100,
                health: Math.min(100, prev.health + 5),
                collectedMaterials: {
                  ...prev.collectedMaterials,
                  [matId]: (prev.collectedMaterials[matId] || 0) + 1
                }
              };
            });
          } else {
            // WRONG: Damage
            play('error');
            setStats(prev => ({ ...prev, health: Math.max(0, prev.health - 10) }));
          }
        }
      }
    });

    // Game Over Checks
    if (stats.health <= 0) setStatus('crashed');
    if (stats.distance >= TARGET_DISTANCE) setStatus('complete');

    // --- RENDER ---
    
    // Background
    ctx.fillStyle = '#050b14'; 
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = '#ffffff';
    for(let i=0; i<50; i++) {
      const sx = (Math.sin(i * 123) * w + (stats.distance * 0.1)) % w;
      const sy = (Math.cos(i * 456) * h) % h;
      ctx.globalAlpha = Math.random() * 0.5 + 0.2;
      ctx.fillRect(Math.abs(sx), Math.abs(sy), 2, 2);
    }
    ctx.globalAlpha = 1.0;

    // Grid (Retro Style)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)'; // Cyan Grid
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Verticals
    for(let l = -2; l <= 2; l++) {
      const p1 = project(l * 150, 0, w, h);
      const p2 = project(l * 150, 1200, w, h);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    // Horizontals
    const zOffset = stats.distance % 200;
    for(let z = 0; z < 1200; z+=200) {
      const zPos = z - zOffset;
      if (zPos < 0) continue;
      const pLeft = project(-300, zPos, w, h);
      const pRight = project(300, zPos, w, h);
      ctx.moveTo(pLeft.x, pLeft.y);
      ctx.lineTo(pRight.x, pRight.y);
    }
    ctx.stroke();

    // Entities
    // Sort back-to-front for Painter's Algorithm
    const sortedEntities = [...game.entities].sort((a, b) => b.z - a.z);
    
    sortedEntities.forEach(ent => {
      const proj = project(ent.x, ent.z, w, h);
      if (ent.collected) return; 
      const size = 60 * proj.scale;
      
      if (ent.type === 'debris') {
        // Red Cube
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.fillRect(proj.x - size/2, proj.y - size/2, size, size);
        ctx.shadowBlur = 0;
      } else {
        // Data Orb
        // Is it a match? (Cheat for visuals: Color code it slightly?) 
        // No, keep it challenging. All look similar.
        ctx.fillStyle = 'rgba(253, 185, 19, 0.2)'; // Gold Glow
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, size * 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${24 * proj.scale}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ent.content.label, proj.x, proj.y);
      }
    });

    // Player Ship
    // Use laneRef.current for smooth animation if we wanted to interpolate
    // For now, snap to lane
    const playerX = w/2 + (laneRef.current * (w * 0.25)); 
    const playerY = h - 80;
    
    // Shield Bubble (Visual feedback of current Harmonic)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(playerX, playerY + 10, 40, 0, Math.PI*2);
    ctx.stroke();

    // Ship Body
    ctx.fillStyle = '#fdb913'; // Gold
    ctx.beginPath();
    ctx.moveTo(playerX, playerY - 10); 
    ctx.lineTo(playerX - 20, playerY + 30); 
    ctx.lineTo(playerX, playerY + 20); 
    ctx.lineTo(playerX + 20, playerY + 30); 
    ctx.fill();

  }, status === 'running');

  // --- End Game ---
  useEffect(() => {
    if (status === 'complete' || status === 'crashed') {
      if (status === 'complete') play('warp');
      if (status === 'crashed') play('crash');

      const timer = setTimeout(() => {
        dispatch({ 
          type: 'COMPLETE_RUN', 
          payload: { 
            score: stats.score, 
            success: status === 'complete',
            collectedMaterials: stats.collectedMaterials,
            destinationId: state.targetLocation
          } 
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, stats, dispatch, state.targetLocation, play]);

  return (
    <div className="panel" style={{ position: 'relative', background: '#000', height: '100%', overflow: 'hidden', padding: 0 }}>
      
      {/* TOP HUD */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1rem', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          {/* Health & Score */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--red)' }}>
              <ShieldAlert size={20} color={stats.health > 30 ? "var(--green)" : "var(--red)"} />
              <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{Math.round(stats.health)}%</span>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--gold)' }}>
              <Zap size={20} color="var(--gold)" fill="var(--gold)" />
              <span style={{ fontWeight: 'bold', color: 'var(--gold)' }}>{stats.score}</span>
            </div>
          </div>
          
          {/* Distance */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--cyan)' }}>
            <Activity size={20} color="var(--cyan)" />
            <span style={{ fontFamily: 'monospace', color: 'var(--cyan)' }}>{(TARGET_DISTANCE - stats.distance).toFixed(0)}m</span>
          </div>
        </div>

        {/* CENTER: SHIELD HARMONIC (The Question) */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="card animate-fade-in" style={{ 
            padding: '0.75rem 2rem', 
            background: 'rgba(0, 0, 0, 0.8)', 
            border: '2px solid var(--gold)',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <Radio size={14} className="animate-pulse" color="var(--red)" /> Shield Harmonic
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)', fontFamily: 'monospace' }}>
              {harmonic.label}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gold)' }}>COLLECT MATCHING VALUE</div>
          </div>
        </div>
      </div>

      {/* Status Overlay */}
      {status !== 'running' && (
        <div className="modal-overlay" style={{ flexDirection: 'column', gap: '1rem' }}>
          <h1 style={{ fontSize: '3rem', color: status === 'complete' ? 'var(--green)' : 'var(--red)', textShadow: '0 0 20px currentColor' }}>
            {status === 'complete' ? 'HYPERSPACE EXIT' : 'CRITICAL FAILURE'}
          </h1>
          <p style={{ color: 'var(--text-main)' }}>Initializing docking procedures...</p>
        </div>
      )}

      {/* Canvas */}
      <canvas ref={canvasRef} width={800} height={600} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Touch Controls */}
      <div style={{ position: 'absolute', bottom: '2rem', left: '1rem', right: '1rem', display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
        <button className="btn" style={{ pointerEvents: 'auto', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }} onTouchStart={() => handleMove(-1)} onClick={() => handleMove(-1)}>
          <ChevronLeft size={32} />
        </button>
        <button className="btn" style={{ pointerEvents: 'auto', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }} onTouchStart={() => handleMove(1)} onClick={() => handleMove(1)}>
          <ChevronRight size={32} />
        </button>
      </div>

    </div>
  );
}