import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from '../../core/GameContext';
import { LOCATIONS } from '../../data/gameData';
import { polarToCartesian } from '../../core/mathUtils';
import { useAudio } from '../../hooks/useAudio';
import { Navigation, Target, ZoomIn, ZoomOut, Map as MapIcon, ArrowLeft } from 'lucide-react';

export default function MapMode() {
  const { state, dispatch } = useGame();
  const { play } = useAudio();
  const canvasRef = useRef(null);
  
  // Viewport State
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.0);
  
  // Gesture State
  const gestureRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    hasDragged: false
  });
  
  // Game State
  const [selectedId, setSelectedId] = useState(null);
  const [navInput, setNavInput] = useState({ r: '', theta: '' });
  const [isAligned, setIsAligned] = useState(false);
  
  const playerLoc = LOCATIONS.find(l => l.id === state.currentLocation) || LOCATIONS[0];
  const selectedLoc = LOCATIONS.find(l => l.id === selectedId);

  // --- ACTIONS ---

  const handleEngage = () => {
    if (selectedLoc && isAligned) {
      play('click');
      dispatch({ type: 'SET_TARGET', payload: selectedId });
      dispatch({ type: 'SET_MODE', payload: 'FLIGHT_PREP' });
    }
  };

  // --- COORDINATE UTILS ---

  // Converts Screen/Mouse Pixels -> Internal Canvas 800x600 Pixels
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;   // Relationship bitmap vs element
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Centralized logic for "Where is this star on the screen?"
  // Returns {x, y} or null if off screen (optional optimization)
  const projectLocation = (loc, width, height) => {
    const cx = width / 2;
    const cy = height / 2;
    const UNIT = 40 * zoom;
    
    // Pan Offset
    const panX = offset.x * UNIT;
    const panY = offset.y * UNIT; // Standardize: offset.y is positive UP

    // Relative Position
    const relX = loc.x - playerLoc.x;
    const relY = loc.y - playerLoc.y;

    // Screen Projection (Y is inverted on canvas)
    const screenX = cx + panX + (relX * UNIT);
    const screenY = cy - panY - (relY * UNIT); 

    return { x: screenX, y: screenY };
  };

  // --- GESTURE HANDLERS ---

  const handlePointerDown = (e) => {
    const pos = getMousePos(e);
    gestureRef.current = {
      isDown: true,
      startX: pos.x,
      startY: pos.y,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
      hasDragged: false
    };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!gestureRef.current.isDown) return;
    
    const pos = getMousePos(e);
    const dx = pos.x - gestureRef.current.startX;
    const dy = pos.y - gestureRef.current.startY;

    // Threshold: 5 canvas pixels
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        gestureRef.current.hasDragged = true;
    }

    if (gestureRef.current.hasDragged) {
        const unitPx = 40 * zoom;
        setOffset({
            x: gestureRef.current.startOffsetX + (dx / unitPx),
            y: gestureRef.current.startOffsetY - (dy / unitPx) // Invert dy because Up is +Y in World
        });
    }
  };

  const handlePointerUp = (e) => {
    e.target.releasePointerCapture(e.pointerId);
    
    if (!gestureRef.current.hasDragged && gestureRef.current.isDown) {
        handleTap(e);
    }
    gestureRef.current.isDown = false;
  };

  const handleTap = (e) => {
    const pos = getMousePos(e);
    const { width, height } = canvasRef.current;
    
    let closest = null;
    let minDist = 50; // Hit radius (in internal pixels)

    LOCATIONS.forEach(loc => {
        const screenPos = projectLocation(loc, width, height);
        const dist = Math.sqrt(Math.pow(pos.x - screenPos.x, 2) + Math.pow(pos.y - screenPos.y, 2));
        
        if (dist < minDist) {
            minDist = dist;
            closest = loc;
        }
    });

    if (closest) {
        play('click');
        setSelectedId(closest.id);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.2;
    setZoom(z => Math.max(0.5, Math.min(4.0, z + delta)));
  };

  // --- RENDER ---

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;
    const UNIT = 40 * zoom;
    
    // Background
    ctx.fillStyle = '#050b14'; ctx.fillRect(0, 0, width, height);

    // Calculate Pan in Pixels
    const panX = offset.x * UNIT;
    const panY = offset.y * UNIT;

    // Grid
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    
    // Vertical Lines
    // We calculate where the "0" line is, then draw outwards
    const screenZeroX = cx + panX;
    const startIdxX = Math.floor(-screenZeroX / UNIT) - 1;
    const endIdxX = Math.floor((width - screenZeroX) / UNIT) + 1;
    
    ctx.beginPath();
    for (let i = startIdxX; i <= endIdxX; i++) {
        const x = screenZeroX + (i * UNIT);
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
    }
    
    // Horizontal Lines (Remember Y is inverted visually)
    const screenZeroY = cy - panY;
    const startIdxY = Math.floor((screenZeroY - height) / UNIT) - 1;
    const endIdxY = Math.floor(screenZeroY / UNIT) + 1;

    for (let i = startIdxY; i <= endIdxY; i++) {
         const y = screenZeroY - (i * UNIT);
         ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Draw Locations
    LOCATIONS.forEach(loc => {
      const pos = projectLocation(loc, width, height);
      
      // Line from center
      const origin = projectLocation(playerLoc, width, height); // Should match screen center if offset is 0
      
      // Optimization: Check bounds
      if (pos.x < -50 || pos.x > width + 50 || pos.y < -50 || pos.y > height + 50) return;

      // Connection Line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();

      // Icon
      ctx.font = `${24 * zoom}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(loc.icon, pos.x, pos.y);
      
      // Text
      ctx.fillStyle = '#94a3b8'; ctx.font = `bold ${12 * zoom}px sans-serif`;
      ctx.fillText(loc.name, pos.x, pos.y + (24 * zoom));
      
      // Selection Circle
      if (loc.id === selectedId) {
        ctx.strokeStyle = '#fdb913'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 25 * zoom, 0, Math.PI * 2); ctx.stroke();
      }
    });

    // Draw Player
    const center = projectLocation(playerLoc, width, height);
    ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(center.x, center.y, 8 * zoom, 0, Math.PI * 2); ctx.fill();
    
    // Draw Vector
    if (navInput.r && navInput.theta) {
      const r = parseFloat(navInput.r);
      const theta = parseFloat(navInput.theta);
      const dest = polarToCartesian(r, theta);
      
      // Calculate endpoint relative to player
      const endX = center.x + (dest.x * UNIT);
      const endY = center.y - (dest.y * UNIT); // Invert Y for screen

      ctx.strokeStyle = isAligned ? '#10b981' : '#ef4444';
      ctx.setLineDash([10, 5]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(center.x, center.y); ctx.lineTo(endX, endY); ctx.stroke(); ctx.setLineDash([]);
    }

  }, [offset, zoom, selectedId, navInput, playerLoc, isAligned]);

  useEffect(() => {
    let frameId;
    const render = () => { draw(); frameId = requestAnimationFrame(render); };
    render();
    return () => cancelAnimationFrame(frameId);
  }, [draw]);

  // --- MATH CHECK ---
  useEffect(() => {
    if (!selectedLoc || !navInput.r || !navInput.theta) { setIsAligned(false); return; }
    const rUser = parseFloat(navInput.r);
    const tUser = parseFloat(navInput.theta);
    const dx = selectedLoc.x - playerLoc.x;
    const dy = selectedLoc.y - playerLoc.y;
    const rTrue = Math.sqrt(dx*dx + dy*dy);
    const tRad = Math.atan2(dy, dx);
    let tTrue = (tRad * 180) / Math.PI;
    if (tTrue < 0) tTrue += 360;
    const rOk = Math.abs(rUser - rTrue) < 1.0;
    const tOk = Math.abs(tUser - tTrue) < 10; 
    setIsAligned(rOk && tOk);
  }, [navInput, selectedLoc, playerLoc]);


  return (
    <div className="dashboard-split">
      <div className="panel">
        <div className="panel-header"><span>Navigation Computer</span><Navigation size={18} /></div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ flex: 1 }}>
             {selectedLoc ? (
                <div className="card animate-fade-in" style={{ border: 'var(--border-gold)' }}>
                  <h3 style={{ color: 'var(--gold)' }}>{selectedLoc.name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-dim)' }}>
                     <div>X: {selectedLoc.x}</div>
                     <div>Y: {selectedLoc.y}</div>
                  </div>
                </div>
             ) : (
                <div className="card" style={{ borderLeft: '4px solid var(--cyan)' }}>
                   <div>Select a Destination</div>
                   <div style={{fontSize:'0.8rem', color:'var(--text-dim)', marginTop:'0.25rem'}}>Tap any star system on the map</div>
                </div>
             )}

             <div style={{ marginTop: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--cyan)' }}>VECTOR INPUT</label>
                <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '20px', fontWeight: 'bold' }}>r</span>
                    <input type="number" className="btn" style={{ flex: 1, background: '#000' }} placeholder="Distance" value={navInput.r} onChange={e => setNavInput({ ...navInput, r: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '20px', fontWeight: 'bold' }}>θ</span>
                    <input type="number" className="btn" style={{ flex: 1, background: '#000' }} placeholder="Degrees" value={navInput.theta} onChange={e => setNavInput({ ...navInput, theta: e.target.value })} />
                  </div>
                </div>
             </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'grid', gap: '0.5rem' }}>
            <button className={`btn ${isAligned ? 'btn-primary' : ''}`} disabled={!isAligned} onClick={handleEngage}>
              <Target size={18} /> {isAligned ? 'PREPARE FOR LAUNCH' : 'ALIGN VECTOR'}
            </button>
            <button className="btn" onClick={() => dispatch({ type: 'SET_MODE', payload: 'STATION' })}><ArrowLeft size={18} /> Cancel</button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ position: 'relative', background: '#000', overflow: 'hidden' }}>
        <canvas 
          ref={canvasRef} width={800} height={600} 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp} 
          onWheel={handleWheel}
          style={{ width: '100%', height: '100%', cursor: 'grab', touchAction: 'none' }} 
        />
        
        <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
           <button className="btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}><ZoomOut size={20} /></button>
           <button className="btn" onClick={() => setOffset({x:0, y:0})}><MapIcon size={20} /></button>
           <button className="btn" onClick={() => setZoom(z => Math.min(4.0, z + 0.5))}><ZoomIn size={20} /></button>
        </div>
      </div>
    </div>
  );
}