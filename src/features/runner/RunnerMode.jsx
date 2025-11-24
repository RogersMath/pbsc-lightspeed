// src/features/runner/RunnerMode.jsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useGame } from '../../core/GameContext';
import { useGameLoop } from '../../core/useGameLoop';
import { spawnEntity, checkCollision } from './runnerEngine';
import { useAudio } from '../../hooks/useAudio';
import { HARMONICS, TRIG_VALUES } from '../../data/gameData';
import { ChevronLeft, ChevronRight, AlertTriangle, Activity } from 'lucide-react';

// --- 3D CONSTANTS ---
const FOV = 300; 
const CAMERA_Y = -100;
const HORIZON_Y = 0.4; 
const LANE_WIDTH = 200; 
const TRACK_LENGTH = 2500; // Draw distance further out so we see them coming

// --- GAMEPLAY BALANCING ---
const TARGET_DISTANCE = 3000;
const START_SPEED = 0.3;       // Much slower (was 0.8)
const MAX_SPEED = 1.2;         // Cap lower
const ACCEL_FACTOR = 0.0002;   // Accelerate slower
const HARMONIC_DURATION = 8000; // ms between harmonic shifts

// --- HELPER: 3D Projector ---
const project3D = (x, y, z, width, height) => {
  const scale = FOV / (FOV + z);
  const x2d = (x * scale) + (width / 2);
  const y2d = (y * scale) + (height * HORIZON_Y) - (CAMERA_Y * scale);
  return { x: x2d, y: y2d, scale };
};

export default function RunnerMode() {
  const { state, dispatch } = useGame();
  const { play } = useAudio();
  const canvasRef = useRef(null);

  const [interfaceMode] = useState(() => state.runnerInterface || 'flight'); 
  
  // UI State
  const [uiStats, setUiStats] = useState({ 
    score: 0, 
    health: 100, 
    distance: 0, 
    harmonicLabel: HARMONICS[0].label,
    nextLabel: HARMONICS[1].label,
    stability: 100 // % of time remaining before switch
  });

  const [status, setStatus] = useState('running');
  const [tacticalData, setTacticalData] = useState(null);

  // Physics State (Mutable Ref)
  const physics = useRef({
    entities: [],
    lastSpawnZ: 0,
    distance: 0,
    score: 0,
    health: 100,
    lane: 0,       
    shipX: 0,      
    
    // Harmonic Logic
    currentHarmonic: HARMONICS[0],
    nextHarmonic: HARMONICS[1],
    timeSinceShift: 0,
    
    lastUiSync: 0,
    collected: {},
    currentSpeed: START_SPEED 
  });

  // --- LOGIC ---

  const shiftHarmonic = useCallback(() => {
    const p = physics.current;
    play('craft'); // Sound cue
    
    // Shift Current -> Next
    p.currentHarmonic = p.nextHarmonic;
    
    // Pick new Next (ensure it's different)
    let candidate = HARMONICS[Math.floor(Math.random() * HARMONICS.length)];
    while (candidate.label === p.currentHarmonic.label) {
        candidate = HARMONICS[Math.floor(Math.random() * HARMONICS.length)];
    }
    p.nextHarmonic = candidate;
    
    p.timeSinceShift = 0;
    
    // Flash Effect (handled in render via timeSinceShift)
  }, [play]);

  const handleCollision = useCallback((ent) => {
    const p = physics.current;
    ent.collected = true;
    
    if (ent.type === 'debris') {
      play('crash');
      p.health = Math.max(0, p.health - 20); 
    } else {
      const val = ent.content.value;
      const target = p.currentHarmonic.targetValue;
      
      // Tolerance 0.001
      if (Math.abs(val - target) < 0.001) {
        play('success');
        p.score += 100;
        p.health = Math.min(100, p.health + 10);
        const matId = ent.content.materialId;
        p.collected[matId] = (p.collected[matId] || 0) + 1;
      } else {
        play('error');
        p.health = Math.max(0, p.health - 10);
      }
    }
  }, [play]);

  const moveShip = useCallback((dir) => {
      const p = physics.current;
      p.lane = Math.max(-1, Math.min(1, p.lane + dir));
      if (interfaceMode === 'flight') play('hover');
  }, [interfaceMode, play]);

  // --- FLIGHT RENDER LOOP ---
  useGameLoop((dt) => {
    if (status !== 'running' || interfaceMode !== 'flight') return;

    const p = physics.current;
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d');
    if (!ctx) return;
    const { width, height } = cvs;

    // 1. UPDATE HARMONICS
    p.timeSinceShift += dt;
    if (p.timeSinceShift > HARMONIC_DURATION) {
        shiftHarmonic();
    }

    // 2. UPDATE PHYSICS
    p.currentSpeed = Math.min(MAX_SPEED, START_SPEED + (p.distance * ACCEL_FACTOR));
    
    // Slower Z movement factor (1.0 pixels per ms * speed)
    const moveDist = (dt * p.currentSpeed * 1.5); 
    p.distance += moveDist * 0.01; 

    // Lerp Ship X
    const targetX = p.lane * LANE_WIDTH;
    p.shipX += (targetX - p.shipX) * 0.1; 

    // Spawn Logic (Spawn whatever the *Current* or *Next* harmonic needs?)
    // Let's mix them so the board is populated for the switch
    if (p.distance - p.lastSpawnZ > 4) { 
      // 70% chance to spawn for Current, 30% for Next (hinting)
      const targetVal = Math.random() > 0.3 ? p.currentHarmonic.targetValue : p.nextHarmonic.targetValue;
      p.entities.push(spawnEntity(TRACK_LENGTH, targetVal));
      p.lastSpawnZ = p.distance;
    }
    
    p.entities.forEach(ent => ent.z -= moveDist);
    p.entities = p.entities.filter(ent => ent.z > 10); 

    // Collision
    p.entities.forEach(ent => {
      if (!ent.collected && ent.z < 150 && ent.z > 50) { 
         const entLane = Math.round(ent.x / LANE_WIDTH);
         if (entLane === p.lane) handleCollision(ent);
      }
    });

    if (p.health <= 0) setStatus('crashed');
    if (p.distance >= TARGET_DISTANCE) setStatus('complete');

    // SYNC UI (Throttled)
    const now = performance.now();
    if (now - p.lastUiSync > 100) { // 10fps UI update
      setUiStats(prev => ({ 
          ...prev, 
          distance: Math.floor(p.distance), 
          score: p.score, 
          health: p.health,
          harmonicLabel: p.currentHarmonic.label,
          nextLabel: p.nextHarmonic.label,
          stability: Math.max(0, 100 - ((p.timeSinceShift / HARMONIC_DURATION) * 100))
      }));
      p.lastUiSync = now;
    }

    // --- RENDER 3D ---
    
    // Sky
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Harmonic Shift Flash
    if (p.timeSinceShift < 500) {
        const alpha = 1 - (p.timeSinceShift / 500);
        ctx.fillStyle = `rgba(253, 185, 19, ${alpha * 0.2})`; // Gold flash
        ctx.fillRect(0, 0, width, height);
    }

    // Road
    const farL = project3D(-LANE_WIDTH * 1.5, 0, TRACK_LENGTH, width, height);
    const farR = project3D(LANE_WIDTH * 1.5, 0, TRACK_LENGTH, width, height);
    const nearL = project3D(-LANE_WIDTH * 1.5, 0, 10, width, height);
    const nearR = project3D(LANE_WIDTH * 1.5, 0, 10, width, height);

    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.moveTo(farL.x, farL.y); ctx.lineTo(farR.x, farR.y); ctx.lineTo(nearR.x, nearR.y); ctx.lineTo(nearL.x, nearL.y); ctx.fill();

    // Lane Lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)'; ctx.lineWidth = 2;
    [-0.5, 0.5].forEach(offset => {
        const f = project3D(offset * LANE_WIDTH, 0, TRACK_LENGTH, width, height);
        const n = project3D(offset * LANE_WIDTH, 0, 10, width, height);
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(n.x, n.y); ctx.stroke();
    });

    // Entities
    [...p.entities].sort((a,b) => b.z - a.z).forEach(ent => {
        if (ent.collected) return;
        const proj = project3D(ent.x, 100, ent.z, width, height);
        const size = 100 * proj.scale;

        // Shadow
        const shad = project3D(ent.x, 0, ent.z, width, height);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.ellipse(shad.x, shad.y, size/2, size/4, 0, 0, Math.PI*2); ctx.fill();

        if (ent.type === 'debris') {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(proj.x - size/2, proj.y - size/2, size, size);
            ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 2;
            ctx.strokeRect(proj.x - size/2, proj.y - size/2, size, size);
        } else {
            // Is this the correct value?
            const isTarget = Math.abs(ent.content.value - p.currentHarmonic.targetValue) < 0.001;
            
            ctx.fillStyle = isTarget ? '#fdb913' : '#334155'; // Gold if matches current, Gray if not
            ctx.beginPath(); ctx.arc(proj.x, proj.y, size/2, 0, Math.PI*2); ctx.fill();
            
            // Ring if it matches NEXT harmonic (Hint)
            if (Math.abs(ent.content.value - p.nextHarmonic.targetValue) < 0.001) {
                ctx.strokeStyle = 'rgba(253, 185, 19, 0.5)'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(proj.x, proj.y, size/1.6, 0, Math.PI*2); ctx.stroke();
            }

            ctx.fillStyle = isTarget ? '#000' : '#fff';
            ctx.font = `bold ${30*proj.scale}px monospace`;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(ent.content.label, proj.x, proj.y);
        }
    });

    // Ship
    const shipProj = project3D(p.shipX, 80, 100, width, height);
    const shipSize = 120 * shipProj.scale;
    
    const sShad = project3D(p.shipX, 0, 100, width, height);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(sShad.x, sShad.y, shipSize/2, shipSize/4, 0, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(shipProj.x, shipProj.y - shipSize/2);
    ctx.lineTo(shipProj.x - shipSize/2, shipProj.y + shipSize/2);
    ctx.lineTo(shipProj.x + shipSize/2, shipProj.y + shipSize/2);
    ctx.fill();
    
    // Engine Particle (simple flicker)
    if (Math.random() > 0.5) {
        ctx.fillStyle = '#fdb913';
        ctx.beginPath(); ctx.arc(shipProj.x, shipProj.y + shipSize/3, shipSize/5, 0, Math.PI*2); ctx.fill();
    }

  }, status === 'running');

  // --- TACTICAL MODE ---
  const generateTacticalScenario = () => {
    const p = physics.current;
    const lanes = [-1, 0, 1].map(laneIdx => {
        const roll = Math.random();
        if (roll > 0.8) return { type: 'debris', label: 'Debris', value: null };
        if (roll > 0.3) {
             const isCorrect = Math.random() > 0.6;
             const val = isCorrect ? p.currentHarmonic.targetValue : Math.random(); 
             const match = TRIG_VALUES.find(t => Math.abs(t.value - val) < 0.001);
             return { type: 'data', label: match ? match.label : 'Unk', value: val || 0.999 };
        }
        return { type: 'empty', label: 'Empty', value: null };
    });
    setTacticalData({ lanes, timeLeft: 5 });
  };
  const handleTacticalChoice = (idx) => {
      const p = physics.current;
      // Tactical moves time forward
      p.timeSinceShift += 2000; 
      if (p.timeSinceShift > HARMONIC_DURATION) shiftHarmonic();
      // ... rest of logic
      generateTacticalScenario(); 
  };
  
  // useEffect hooks for Input/EndGame (same as before)...
  useEffect(() => {
    const h = (e) => {
      if (status!=='running') return;
      if (interfaceMode==='flight') {
         if (e.key==='ArrowLeft'||e.key==='a') moveShip(-1);
         if (e.key==='ArrowRight'||e.key==='d') moveShip(1);
      } else {
         if (['1','2','3'].includes(e.key)) handleTacticalChoice(parseInt(e.key)-2);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [status, interfaceMode, tacticalData]);

  useEffect(() => {
    if (status === 'complete' || status === 'crashed') {
      setTimeout(() => dispatch({ type: 'COMPLETE_RUN', payload: { score: physics.current.score, success: status === 'complete', collectedMaterials: physics.current.collected, destinationId: state.targetLocation } }), 2000);
    }
  }, [status]);


  return (
    <div className="panel" style={{ position: 'relative', background: '#000', height: '100%', overflow: 'hidden', padding: 0 }}>
      
      {/* HUD */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1rem', zIndex: 10, pointerEvents: 'none' }}>
         
         <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' }}>
            <div style={{color:'white', fontSize:'1.2rem'}}>🛡️ {Math.round(uiStats.health)}%</div>
            <div style={{color:'var(--gold)', fontSize:'1.2rem'}}>⚡ {uiStats.score}</div>
         </div>

         {/* HARMONIC MONITOR */}
         <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
             
             {/* CURRENT */}
             <div className="card animate-fade-in" style={{ background: 'rgba(0,0,0,0.8)', border: '2px solid var(--gold)', padding: '0.5rem 1.5rem' }}>
                 <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={12} className="animate-pulse" /> CURRENT HARMONIC
                 </div>
                 <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--gold)', fontFamily: 'monospace' }}>
                    {uiStats.harmonicLabel}
                 </div>
             </div>

             {/* NEXT */}
             <div className="card" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid var(--text-dim)', padding: '0.5rem 1rem', opacity: 0.8 }}>
                 <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>INCOMING...</div>
                 <div style={{ fontSize: '1.2rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                    {uiStats.nextLabel}
                 </div>
             </div>

         </div>

         {/* STABILITY BAR */}
         <div style={{ width: '300px', height: '4px', background: '#333', margin: '0.5rem auto', borderRadius: '2px', overflow: 'hidden' }}>
             <div style={{ 
                 width: `${uiStats.stability}%`, 
                 height: '100%', 
                 background: uiStats.stability < 30 ? 'var(--red)' : 'var(--cyan)',
                 transition: 'width 0.1s linear'
             }} />
         </div>
         {uiStats.stability < 30 && (
             <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: '0.8rem', fontWeight: 'bold' }} className="animate-pulse">
                 <AlertTriangle size={12} style={{ display: 'inline' }} /> HARMONIC DECAY DETECTED
             </div>
         )}

      </div>

      {interfaceMode === 'flight' ? (
        <>
          <canvas ref={canvasRef} width={800} height={600} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: '20%', width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 2rem', pointerEvents: 'none' }}>
            <button className="btn" style={{ pointerEvents: 'auto', borderRadius: '50%', width:'80px', height:'80px', background:'rgba(255,255,255,0.2)' }} onTouchStart={(e)=>{e.preventDefault();moveShip(-1);}} onClick={()=>moveShip(-1)}><ChevronLeft/></button>
            <button className="btn" style={{ pointerEvents: 'auto', borderRadius: '50%', width:'80px', height:'80px', background:'rgba(255,255,255,0.2)' }} onTouchStart={(e)=>{e.preventDefault();moveShip(1);}} onClick={()=>moveShip(1)}><ChevronRight/></button>
          </div>
        </>
      ) : (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-main)' }}>
           <h2>Tactical Interface</h2>
           <p>Select matching harmonic data.</p>
           {/* Placeholder for Tactical Buttons */}
        </div>
      )}
    </div>
  );
}