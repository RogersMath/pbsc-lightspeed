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
  
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.0);
  const [selectedId, setSelectedId] = useState(null);
  const [navInput, setNavInput] = useState({ r: '', theta: '' });
  const [isAligned, setIsAligned] = useState(false);

  const playerLoc = LOCATIONS.find(l => l.id === state.currentLocation) || LOCATIONS[0];
  const selectedLoc = LOCATIONS.find(l => l.id === selectedId);

  const handleEngage = () => {
    if (selectedLoc) {
      play('warp'); // Sound Effect
      dispatch({ type: 'SET_TARGET', payload: selectedId });
      dispatch({ type: 'SET_MODE', payload: 'RUNNER' });
    }
  };

  useEffect(() => {
    if (!selectedLoc || !navInput.r || !navInput.theta) {
      setIsAligned(false);
      return;
    }
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;
    const UNIT = 40 * zoom;
    
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const panX = offset.x * UNIT;
    const panY = offset.y * UNIT;

    ctx.beginPath();
    for (let i = -10; i <= 10; i++) {
        const x = cx + panX + (i * UNIT);
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
        const y = cy + panY + (i * UNIT);
        ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();

    LOCATIONS.forEach(loc => {
      const relX = loc.x - playerLoc.x;
      const relY = loc.y - playerLoc.y;
      const screenX = cx + panX + (relX * UNIT);
      const screenY = cy + panY - (relY * UNIT);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.beginPath();
      ctx.moveTo(cx + panX, cy + panY);
      ctx.lineTo(screenX, screenY);
      ctx.stroke();

      ctx.font = `${24 * zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(loc.icon, screenX, screenY);
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${12 * zoom}px sans-serif`;
      ctx.fillText(loc.name, screenX, screenY + (24 * zoom));
      
      ctx.font = `${10 * zoom}px monospace`;
      ctx.fillText(`(${loc.x}, ${loc.y})`, screenX, screenY + (34 * zoom));

      if (loc.id === selectedId) {
        ctx.strokeStyle = '#fdb913';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 20 * zoom, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    const px = cx + panX;
    const py = cy + panY;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, 6 * zoom, 0, Math.PI * 2);
    ctx.fill();
    
    if (navInput.r && navInput.theta) {
      const r = parseFloat(navInput.r);
      const theta = parseFloat(navInput.theta);
      const dest = polarToCartesian(r, theta);
      const dx = dest.x * UNIT;
      const dy = dest.y * UNIT;
      const endX = px + dx;
      const endY = py - dy; 

      ctx.strokeStyle = isAligned ? '#10b981' : '#ef4444';
      ctx.setLineDash([10, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [offset, zoom, selectedId, navInput, playerLoc, isAligned]);

  useEffect(() => {
    let frameId;
    const render = () => { draw(); frameId = requestAnimationFrame(render); };
    render();
    return () => cancelAnimationFrame(frameId);
  }, [draw]);

  const handleCanvasClick = () => {
    play('click');
    const currentIdx = LOCATIONS.findIndex(l => l.id === selectedId);
    const nextIdx = (currentIdx + 1) % LOCATIONS.length;
    const nextLoc = LOCATIONS[nextIdx];
    
    if (nextLoc.id === playerLoc.id) {
        const skipIdx = (nextIdx + 1) % LOCATIONS.length;
        setSelectedId(LOCATIONS[skipIdx].id);
    } else {
        setSelectedId(nextLoc.id);
    }
  };

  return (
    <div className="dashboard-split">
      <div className="panel">
        <div className="panel-header">
          <span>Navigation Computer</span>
          <Navigation size={18} />
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column' }}>
          {selectedLoc ? (
            <div className="card animate-fade-in" style={{ border: 'var(--border-gold)' }}>
              <h3 style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>{selectedLoc.name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: '0.8rem', gap: '0.5rem', fontFamily: 'monospace' }}>
                <div><span style={{ color: 'var(--text-dim)' }}>DEST X:</span> {selectedLoc.x}</div>
                <div><span style={{ color: 'var(--text-dim)' }}>DEST Y:</span> {selectedLoc.y}</div>
                <div><span style={{ color: 'var(--text-dim)' }}>CURR X:</span> {playerLoc.x}</div>
                <div><span style={{ color: 'var(--text-dim)' }}>CURR Y:</span> {playerLoc.y}</div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ fontStyle: 'italic', color: 'var(--text-dim)', textAlign: 'center' }}>
              No Target Selected.<br/>Click map to scan.
            </div>
          )}

          <div style={{ marginTop: '1rem', flex: 1 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--cyan)' }}>VECTOR INPUT (POLAR)</label>
            <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '20px', fontWeight: 'bold' }}>r</span>
                <input type="number" className="btn" style={{ flex: 1, background: '#000' }} placeholder="Dist" value={navInput.r} onChange={e => setNavInput({ ...navInput, r: e.target.value })} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '20px', fontWeight: 'bold' }}>θ</span>
                <input type="number" className="btn" style={{ flex: 1, background: '#000' }} placeholder="Deg" value={navInput.theta} onChange={e => setNavInput({ ...navInput, theta: e.target.value })} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
               Calculate distance and angle from Current to Dest.
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'grid', gap: '0.5rem' }}>
            <button className={`btn ${isAligned ? 'btn-primary' : ''}`} disabled={!isAligned} onClick={handleEngage}>
              <Target size={18} /> {isAligned ? 'ENGAGE WARP' : 'ALIGN VECTOR'}
            </button>
            <button className="btn" onClick={() => { play('click'); dispatch({ type: 'SET_MODE', payload: 'STATION' }); }}>
              <ArrowLeft size={18} /> Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ position: 'relative', background: '#000' }}>
        <canvas ref={canvasRef} width={800} height={600} onClick={handleCanvasClick} style={{ width: '100%', height: '100%', cursor: 'crosshair' }} />
        <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
           <button className="btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}><ZoomOut size={20} /></button>
           <button className="btn" onClick={() => setOffset({x:0, y:0})}><MapIcon size={20} /></button>
           <button className="btn" onClick={() => setZoom(z => Math.min(3.0, z + 0.2))}><ZoomIn size={20} /></button>
        </div>
        <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px', color: 'var(--cyan)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
           PAN: {offset.x.toFixed(1)}, {offset.y.toFixed(1)} | ZOOM: {zoom.toFixed(1)}x
        </div>
      </div>
    </div>
  );
}