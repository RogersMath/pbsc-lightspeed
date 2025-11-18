import React, { useState } from 'react';
import { useGame } from '../../core/GameContext';
import { useTranslation } from '../../core/i18n';
import { useAudio } from '../../hooks/useAudio';
import { 
  Package, ShoppingCart, Wrench, ScrollText, 
  X, Check, Briefcase, LogOut 
} from 'lucide-react';
import { CONTRACT_TEMPLATES, BLUEPRINTS, MATERIALS, GUILDS } from '../../data/gameData';
import { polarToCartesian } from '../../core/mathUtils';

export default function StationMode() {
  const { state, dispatch } = useGame();
  const { t } = useTranslation();
  const { play } = useAudio(); // Audio Hook
  const [activeTab, setActiveTab] = useState('contracts');
  const [craftingProject, setCraftingProject] = useState(null);
  
  const canCraft = (blueprint) => {
    return Object.entries(blueprint.materials).every(([matId, qty]) => 
      (state.inventory[matId] || 0) >= qty
    );
  };

  const handleTabSwitch = (tab) => {
    play('click');
    setActiveTab(tab);
  };

  const handleCraftClick = (blueprint) => {
    play('click');
    const problem = generateMathProblem(blueprint.difficulty);
    setCraftingProject({ blueprint, problem });
  };

  const handleMathSolve = (answer) => {
    const isCorrect = validateAnswer(craftingProject.problem, answer);
    if (isCorrect) {
      play('craft'); // Sound Effect
      dispatch({ type: 'CRAFT_ITEM', payload: craftingProject.blueprint });
    } else {
      play('error'); // Sound Effect
      alert("Calibration Failed: Coordinates Mismatched.");
    }
    setCraftingProject(null);
  };

  const handleAcceptContract = (c) => {
    play('success'); // Sound Effect
    dispatch({ type: 'ACCEPT_CONTRACT', payload: c });
  };

  return (
    <div className="dashboard-split">
      {/* LEFT SIDEBAR */}
      <div className="panel">
        <div className="panel-header">
          <span>Station Services</span>
          <Briefcase size={18} />
        </div>
        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeTab === 'contracts' ? 'btn-primary' : ''}`} 
            onClick={() => handleTabSwitch('contracts')}
          >
            <ScrollText size={18} /> Contracts
          </button>
          <button 
            className={`btn ${activeTab === 'craft' ? 'btn-primary' : ''}`} 
            onClick={() => handleTabSwitch('craft')}
          >
            <Wrench size={18} /> Workshop
          </button>
          <button 
            className={`btn ${activeTab === 'market' ? 'btn-primary' : ''}`} 
            onClick={() => handleTabSwitch('market')}
          >
            <ShoppingCart size={18} /> Market
          </button>
          
          <div style={{ marginTop: 'auto', borderTop: 'var(--border-thin)', paddingTop: '1rem' }}>
            <h4 style={{ color: 'var(--text-dim)', marginBottom: '0.5rem', fontSize: '0.8rem' }}>Cargo Hold</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
              {Object.entries(state.inventory).map(([key, qty]) => {
                const matName = MATERIALS[key]?.name || BLUEPRINTS.find(b => b.id === key)?.name || key;
                return qty > 0 ? (
                  <div key={key} className="card" style={{ padding: '0.25rem 0.5rem', margin: 0 }}>
                    <span style={{ color: 'var(--cyan)' }}>{qty}x</span> {matName}
                  </div>
                ) : null;
              })}
            </div>
          </div>

          <button 
            className="btn btn-danger" 
            style={{ marginTop: '1rem' }} 
            onClick={() => { play('click'); dispatch({ type: 'SET_MODE', payload: 'MAP' }); }}
          >
            <LogOut size={18} /> Undock
          </button>
        </div>
      </div>

      {/* RIGHT CONTENT AREA */}
      <div className="panel">
        {activeTab === 'contracts' && <ContractsPanel t={t} onAccept={handleAcceptContract} />}
        {activeTab === 'craft' && (
          <CraftingPanel 
            blueprints={BLUEPRINTS} 
            canCraft={canCraft} 
            onCraft={handleCraftClick} 
          />
        )}
        {activeTab === 'market' && <MarketPanel inventory={state.inventory} dispatch={dispatch} play={play} />}
      </div>

      {/* MODAL */}
      {craftingProject && (
        <MathModal 
          project={craftingProject} 
          onSolve={handleMathSolve} 
          onCancel={() => { play('click'); setCraftingProject(null); }} 
        />
      )}
    </div>
  );
}

// --- Sub-Components ---

function ContractsPanel({ t, onAccept }) {
  const { state } = useGame();
  return (
    <>
      <div className="panel-header">Available Contracts</div>
      <div className="panel-body">
        {state.activeContract ? (
          <div className="card" style={{ border: 'var(--border-gold)', background: 'rgba(253, 185, 19, 0.1)' }}>
            <h3 style={{ color: 'var(--gold)' }}>ACTIVE: {t(state.activeContract.titleKey)}</h3>
            <p style={{ margin: '0.5rem 0' }}>{t(state.activeContract.descKey)}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {CONTRACT_TEMPLATES.map(c => {
              const guild = Object.values(GUILDS).find(g => g.id === c.guildId);
              return (
                <div key={c.id} className="card" style={{ borderLeft: `4px solid ${guild.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span>{guild.icon}</span>
                    <span style={{ fontWeight: 'bold', color: guild.color }}>{guild.name}</span>
                  </div>
                  <h4 style={{ marginBottom: '0.5rem' }}>{t(c.titleKey)}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>{t(c.descKey)}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{c.rewardCredits} 💎</span>
                    <button className="btn btn-primary" onClick={() => onAccept(c)}>Accept</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function CraftingPanel({ blueprints, canCraft, onCraft }) {
  return (
    <>
      <div className="panel-header">Fabrication Workshop</div>
      <div className="panel-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {blueprints.map(bp => (
            <div key={bp.id} className="card" style={{ opacity: canCraft(bp) ? 1 : 0.6, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '2.5rem', textAlign: 'center', margin: '1rem 0' }}>{bp.icon}</div>
              <h3 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{bp.name}</h3>
              <div style={{ fontSize: '0.8rem', background: 'var(--bg-deep)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', flex: 1 }}>
                <div style={{ color: 'var(--text-dim)', marginBottom: '0.25rem' }}>Requires:</div>
                {Object.entries(bp.materials).map(([matId, qty]) => (
                  <div key={matId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{MATERIALS[matId]?.name || matId}</span>
                    <span style={{ color: 'var(--cyan)' }}>x{qty}</span>
                  </div>
                ))}
              </div>
              <button 
                className={`btn ${canCraft(bp) ? 'btn-success' : ''}`}
                style={{ width: '100%' }}
                disabled={!canCraft(bp)}
                onClick={() => onCraft(bp)}
              >
                <Wrench size={16} /> Fabricate
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function MarketPanel({ inventory, dispatch, play }) {
  const sellableItems = Object.entries(inventory).filter(([id, qty]) => qty > 0 && (MATERIALS[id] || BLUEPRINTS.find(b => b.id === id)));

  const handleSell = (id, qty) => {
    let unitValue = 0;
    if (MATERIALS[id]) unitValue = MATERIALS[id].value;
    else {
       const bp = BLUEPRINTS.find(b => b.id === id);
       if (bp) unitValue = bp.baseValue;
    }

    if (unitValue > 0) {
      play('success'); // Sound
      dispatch({ type: 'SELL_ITEM', payload: { id, qty, value: unitValue } });
    }
  };

  return (
    <>
      <div className="panel-header">Commodities Market</div>
      <div className="panel-body">
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {sellableItems.length === 0 && <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>No commodities.</p>}
          {sellableItems.map(([id, qty]) => {
            const info = MATERIALS[id] || BLUEPRINTS.find(b => b.id === id);
            return (
              <div key={id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <span style={{ fontSize: '1.5rem' }}>{info.icon || '📦'}</span>
                   <div>
                     <div style={{ fontWeight: 'bold' }}>{info.name}</div>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Value: {info.value || info.baseValue} 💎</div>
                   </div>
                </div>
                <button className="btn btn-success" onClick={() => handleSell(id, qty)}>Sell All ({qty})</button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function MathModal({ project, onSolve, onCancel }) {
  const [r, setR] = useState('');
  const [theta, setTheta] = useState('');

  return (
    <div className="modal-overlay">
      <div className="panel" style={{ width: '400px', border: 'var(--border-gold)', boxShadow: 'var(--shadow-glow)' }}>
        <div className="panel-header">
          <span>Assembler Calibration</span>
          <button onClick={onCancel} className="btn" style={{ padding: '4px' }}><X size={16} /></button>
        </div>
        <div className="panel-body" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-dim)', marginBottom: '1rem' }}>Calculate Polar Coordinates for the target.</p>
          <div className="card" style={{ background: '#000', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ color: 'var(--cyan)', fontSize: '0.9rem' }}>TARGET VECTOR</div>
            <div style={{ fontSize: '2rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--text-main)' }}>
              ({project.problem.x}, {project.problem.y})
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Radius (r)</label>
              <input type="number" className="btn" style={{ background: '#000', textAlign: 'center' }} value={r} onChange={e => setR(e.target.value)} autoFocus />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Angle (θ°)</label>
              <input type="number" className="btn" style={{ background: '#000', textAlign: 'center' }} value={theta} onChange={e => setTheta(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={() => onSolve({ r, theta })}>
            <Check size={18} /> Calibrate
          </button>
        </div>
      </div>
    </div>
  );
}

const generateMathProblem = (diff) => {
  const angles = [0, 30, 45, 60, 90, 135, 180, 270];
  const theta = angles[Math.floor(Math.random() * angles.length)];
  const r = Math.floor(Math.random() * 4) + 2;
  const coords = polarToCartesian(r, theta);
  return { x: coords.x, y: coords.y, answerR: r, answerTheta: theta };
};

const validateAnswer = (problem, answer) => {
  const rUser = parseFloat(answer.r);
  const tUser = parseFloat(answer.theta);
  if (isNaN(rUser) || isNaN(tUser)) return false;
  const rOk = Math.abs(rUser - problem.answerR) <= 0.2;
  const tOk = Math.abs(tUser - problem.answerTheta) <= 5;
  return rOk && tOk;
};