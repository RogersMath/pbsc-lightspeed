import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { checkContractCompletion, calculateRewards } from './gameLogic';

const GameContext = createContext();

const INITIAL_STATE = {
  credits: 500,
  fuel: 100,
  currentMode: 'MENU', // Start here!, // MENU | STATION | MAP | FLIGHT_PREP | RUNNER
  currentLocation: 'home',
  targetLocation: null,
  
  // FEATURE FLAG: Accessibility Preference
  runnerInterface: 'flight', // 'flight' | 'tactical'

  reputation: {
    navigators: 0,
    miners: 0,
    merchants: 0
  },
  
  inventory: {},
  activeContract: null,
  lastRunResult: null
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, currentMode: action.payload };
      
    case 'SET_TARGET':
      return { ...state, targetLocation: action.payload };

    case 'SET_RUNNER_INTERFACE':
      return { ...state, runnerInterface: action.payload };
    
    case 'RESET_GAME':
      // Clear local storage to be safe
      localStorage.removeItem('LSNavigator_Save_v3');
      // Return the fresh initial state, but ensure we start at STATION
      return { 
        ...INITIAL_STATE, 
        currentMode: 'STATION' 
      };
      
    case 'ACCEPT_CONTRACT':
      return { 
        ...state, 
        activeContract: action.payload,
        targetLocation: action.payload.type === 'travel' ? action.payload.destinationId : state.targetLocation
      };

    case 'UPDATE_CREDITS':
      return { ...state, credits: state.credits + action.payload };

    case 'CRAFT_ITEM': {
      const bp = action.payload;
      const newInv = { ...state.inventory };
      Object.entries(bp.materials).forEach(([mat, qty]) => {
        newInv[mat] = (newInv[mat] || 0) - qty;
      });
      newInv[bp.id] = (newInv[bp.id] || 0) + 1;
      return { ...state, inventory: newInv };
    }

    case 'SELL_ITEM': {
      const { id, qty, value } = action.payload;
      const newInv = { ...state.inventory };
      if (newInv[id]) {
        newInv[id] = Math.max(0, newInv[id] - qty);
        if (newInv[id] === 0) delete newInv[id];
      }
      return {
        ...state,
        credits: state.credits + (value * qty),
        inventory: newInv
      };
    }

    case 'COMPLETE_RUN': {
      const runStats = action.payload;
      const contract = state.activeContract;
      let isMissionSuccess = false;
      
      const updatedInv = { ...state.inventory };
      if (runStats.collectedMaterials) {
        Object.entries(runStats.collectedMaterials).forEach(([mat, qty]) => {
          updatedInv[mat] = (updatedInv[mat] || 0) + qty;
        });
      }

      if (contract) {
        if (contract.type === 'travel' || contract.type === 'mining') {
           isMissionSuccess = checkContractCompletion(contract, runStats, updatedInv);
        }
      }

      let newCredits = state.credits;
      let newRep = { ...state.reputation };
      let rewardSummary = null;

      if (isMissionSuccess) {
        const rewards = calculateRewards(contract);
        newCredits += rewards.credits;
        Object.entries(rewards.reputation).forEach(([g, val]) => {
          newRep[g] = (newRep[g] || 0) + val;
        });
        rewardSummary = { success: true, message: 'Contract Complete', rewards };
      } else if (contract && (contract.type === 'travel' || contract.type === 'mining')) {
        rewardSummary = { success: false, message: 'Contract Objectives Not Met' };
      } else {
        rewardSummary = { 
          success: true, 
          message: 'Sector Traversal Complete', 
          rewards: { credits: 0, reputation: {} } 
        };
      }
      
      return {
        ...state,
        credits: newCredits,
        reputation: newRep,
        inventory: updatedInv,
        currentMode: 'STATION',
        currentLocation: state.targetLocation || state.currentLocation,
        targetLocation: null,
        activeContract: isMissionSuccess ? null : state.activeContract, 
        lastRunResult: rewardSummary,
        fuel: Math.max(0, state.fuel - 10)
      };
    }

    case 'DISMISS_SUMMARY':
      return { ...state, lastRunResult: null };
      
    // DEV TOOL: Call this to fix broken saves
    case 'RESET_STATE':
      return INITIAL_STATE;

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE, (initial) => {
    try {
      const saved = localStorage.getItem('LSNavigator_Save_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        // SMART MERGE: Keeps new fields from INITIAL_STATE if they are missing in parsed
        // This fixes the issue where 'runnerInterface' was undefined in old saves.
        return { 
            ...initial, 
            ...parsed,
            // Force a valid value if missing
            runnerInterface: parsed.runnerInterface || 'flight' 
        };
      }
      return initial;
    } catch (e) {
      console.error("Save file corrupted, resetting.", e);
      return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem('LSNavigator_Save_v3', JSON.stringify(state));
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);