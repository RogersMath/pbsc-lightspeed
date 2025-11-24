import React from 'react';
import { useGame } from '../../core/GameContext';
import { Smartphone, Monitor, ArrowLeft, Zap } from 'lucide-react';
import { useAudio } from '../../hooks/useAudio';

export default function FlightPrepMode() {
  const { state, dispatch } = useGame();
  const { play } = useAudio();

  const launch = (mode) => {
    play('warp');
    dispatch({ type: 'SET_RUNNER_INTERFACE', payload: mode });
    dispatch({ type: 'SET_MODE', payload: 'RUNNER' });
  };

  return (
    <div className="panel" style={{ maxWidth: '600px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <span>Pre-Flight Configuration</span>
        <Zap size={18} color="var(--gold)" />
      </div>
      
      <div className="panel-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2rem', justifyContent: 'center' }}>
        
        <div>
          <h2 style={{ color: 'var(--cyan)', marginBottom: '0.5rem' }}>Destination Locked</h2>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>ENGAGING ENGINES</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          
          {/* MANUAL BUTTON */}
          <button 
            className="card btn" 
            onClick={() => launch('flight')}
            style={{ 
              height: '200px', flexDirection: 'column', 
              border: '2px solid var(--gold)', background: 'rgba(253, 185, 19, 0.1)' 
            }}
          >
            <Smartphone size={48} color="var(--gold)" />
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '1rem' }}>Manual Pilot</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Direct Reflex Control</span>
          </button>

          {/* AUTO BUTTON */}
          <button 
            className="card btn" 
            onClick={() => launch('tactical')}
            style={{ 
              height: '200px', flexDirection: 'column', 
              border: '2px solid var(--cyan)', background: 'rgba(56, 189, 248, 0.1)' 
            }}
          >
            <Monitor size={48} color="var(--cyan)" />
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '1rem' }}>Tactical Computer</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Accessible / Screen Reader</span>
          </button>
        </div>

        <button className="btn" onClick={() => dispatch({ type: 'SET_MODE', payload: 'MAP' })}>
          <ArrowLeft size={18} /> Abort Launch
        </button>

      </div>
    </div>
  );
}