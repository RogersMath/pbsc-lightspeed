// src/App.jsx
import React from 'react';
import { GameProvider, useGame } from './core/GameContext';
import { useTranslation } from './core/i18n';
import { Zap, Droplet, Star } from 'lucide-react';

// Styles
import './styles/variables.css';
import './styles/global.css';

// Feature Modules
import StationMode from './features/station/StationMode';
import MapMode from './features/navigation/MapMode';
import RunnerMode from './features/runner/RunnerMode';
import MainMenu from './features/menu/MainMenu';
import FlightPrepMode from './features/navigation/FlightPrepMode';

function MissionSummary() {
  const { state, dispatch } = useGame();
  if (!state.lastRunResult) return null;

  const isSuccess = state.lastRunResult.success;

  return (
    <div className="modal-overlay">
      <div className="panel" style={{ width: '400px', border: isSuccess ? 'var(--border-gold)' : '2px solid var(--red)' }}>
        <div className="panel-header" style={{ color: isSuccess ? 'var(--gold)' : 'var(--red)' }}>
          {isSuccess ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED'}
        </div>
        <div className="panel-body" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>{state.lastRunResult.message}</p>
          
          {state.lastRunResult.rewards && (
            <div className="card" style={{ background: '#000', textAlign: 'left' }}>
               <div style={{ color: 'var(--gold)', fontWeight: 'bold' }}>
                 Credits: +{state.lastRunResult.rewards.credits}
               </div>
               <div style={{ marginTop: '0.5rem' }}>
                 {Object.entries(state.lastRunResult.rewards.reputation).map(([g, v]) => (
                   <div key={g} style={{ color: v > 0 ? 'var(--green)' : 'var(--red)', fontSize: '0.9rem' }}>
                     {g.toUpperCase()}: {v > 0 ? '+' : ''}{v}
                   </div>
                 ))}
               </div>
            </div>
          )}
          
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => dispatch({ type: 'DISMISS_SUMMARY' })}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function GameShell() {
  const { state } = useGame();
  const { t } = useTranslation();

  // Mode Router
  const renderMode = () => {
    switch(state.currentMode) {
      case 'MENU': return <MainMenu />; 
      case 'MAP': return <MapMode />;
      case 'FLIGHT_PREP': return <FlightPrepMode />; // Add this
      case 'RUNNER': return <RunnerMode />;
      case 'STATION': 
      default: return <StationMode />;
    }
  };

  const showHeader = state.currentMode !== 'MENU';

  return (
    <div className="app-root">
      <a href="#main-content" className="skip-link">{t('a11y.skip')}</a>
      <MissionSummary />

      {/* Header Bar */}
      <header className="header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Star fill="var(--gold)" stroke="none" color="var(--gold)" />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
            {t('app.title')}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <div style={{ color: 'var(--gold)' }}>💎</div>
             <span>{state.credits}</span>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Droplet size={16} color="var(--cyan)" fill="var(--cyan)" />
             <span>{state.fuel}%</span>
           </div>
        </div>
      </header>

      {/* Main Stage */}
      <main id="main-content" className="main-stage">
        {renderMode()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameShell />
    </GameProvider>
  );
}