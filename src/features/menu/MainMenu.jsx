import React, { useState, useEffect } from 'react';
import { useGame } from '../../core/GameContext';
import { useAudio } from '../../hooks/useAudio';
import { Play, RotateCcw, Info, X } from 'lucide-react';

export default function MainMenu() {
  const { state, dispatch } = useGame();
  const { play } = useAudio();
  const [showAbout, setShowAbout] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    // Check if a save actually exists in storage
    const save = localStorage.getItem('LSNavigator_Save_v3');
    if (save) setHasSave(true);
  }, []);

  const handleNewGame = () => {
    if (hasSave) {
      if (!window.confirm("Starting a new game will erase your current progress. Are you sure?")) return;
    }
    play('click');
    dispatch({ type: 'RESET_GAME' });
  };

  const handleLoadGame = () => {
    play('click');
    // The state is already loaded from localStorage by GameContext, 
    // we just need to switch out of MENU mode.
    // If the saved mode was MENU (weird edge case), default to STATION.
    const targetMode = state.currentMode === 'MENU' ? 'STATION' : state.currentMode;
    dispatch({ type: 'SET_MODE', payload: targetMode });
  };

  return (
    <div style={{ 
      width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      
      {/* --- BACKGROUND LAYER --- */}
      <div style={{ 
        position: 'absolute', inset: 0, zIndex: 0, 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', opacity: 0.6
      }}>
        {/* The GIGANTIC Cosmos Emoji */}
        <div style={{ fontSize: '150vh', filter: 'blur(10px)', transform: 'rotate(15deg)' }}>
          🌌
        </div>
      </div>

      {/* --- CONTENT LAYER (Glassy) --- */}
      <div className="animate-fade-in" style={{ 
        position: 'relative', zIndex: 10,
        width: '400px', padding: '2rem',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', gap: '1.5rem'
      }}>
        
        {/* Logo / Rocket */}
        <div>
           <div style={{ fontSize: '5rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(253, 185, 19, 0.5))', animation: 'float 3s ease-in-out infinite' }}>
             🚀
           </div>
           <h1 style={{ fontSize: '2rem', fontWeight: 'bold', background: 'linear-gradient(to right, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
             Lightspeed<br/>Navigator
           </h1>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {hasSave && (
            <button className="btn btn-primary" style={{ fontSize: '1.1rem', justifyContent: 'center' }} onClick={handleLoadGame}>
              <Play size={20} fill="currentColor" /> Continue Journey
            </button>
          )}

          <button className="btn" style={{ fontSize: '1.1rem', justifyContent: 'center', border: '1px solid var(--text-dim)' }} onClick={handleNewGame}>
            <RotateCcw size={20} /> New Game
          </button>

          <button className="btn" style={{ fontSize: '1rem', justifyContent: 'center', opacity: 0.8 }} onClick={() => setShowAbout(true)}>
            <Info size={18} /> About
          </button>
        </div>

      </div>

      {/* --- ABOUT MODAL --- */}
      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="panel animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', border: 'var(--border-gold)' }}>
             <div className="panel-header">
                <span>Mission Archives</span>
                <button className="btn" onClick={() => setShowAbout(false)} style={{ padding: '4px' }}><X size={16}/></button>
             </div>
             <div className="panel-body" style={{ textAlign: 'center', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '1rem' }}>
                  <strong>Lightspeed Navigator</strong> is an educational simulation designed to teach polar coordinates and trigonometric functions through gamified systems.
                </p>
                <hr style={{ borderColor: 'var(--text-dim)', opacity: 0.3, margin: '1rem 0' }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                  Created by<br/>
                  <strong style={{ color: 'var(--gold)', fontSize: '1.1rem' }}>Jesse Rogers</strong><br/>
                  Student Learning Center<br/>
                  Palm Beach State College
                </p>
                <div style={{ marginTop: '1.5rem', fontSize: '2rem' }}>
                  👨‍🚀 📐
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Inline Styles for Animation */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}