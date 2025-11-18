import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { checkContractCompletion, calculateRewards } from './gameLogic';

const GameContext = createContext();

const INITIAL_STATE = {
  credits: 500,
  fuel: 100,
  currentMode: 'STATION', // STATION | MAP | RUNNER
  currentLocation: 'home',
  targetLocation: null,
  
  reputation: {
    navigators: 0,
    miners: 0,
    merchants: 0
  },
  
  // Shared inventory for Materials (strings) and Items (blueprints)
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
      
    case 'ACCEPT_CONTRACT':
      return { 
        ...state, 
        activeContract: action.payload,
        // Auto-set target if it's a travel contract
        targetLocation: action.payload.type === 'travel' ? action.payload.destinationId : state.targetLocation
      };

    case 'UPDATE_CREDITS':
      return { ...state, credits: state.credits + action.payload };

    case 'CRAFT_ITEM': {
      const bp = action.payload;
      const newInv = { ...state.inventory };
      
      // Deduct materials
      Object.entries(bp.materials).forEach(([mat, qty]) => {
        newInv[mat] = (newInv[mat] || 0) - qty;
      });
      
      // Add item
      newInv[bp.id] = (newInv[bp.id] || 0) + 1;
      
      return { ...state, inventory: newInv };
    }

    case 'SELL_ITEM': {
      const { id, qty, value } = action.payload;
      const newInv = { ...state.inventory };
      
      // Remove items
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
      
      // 1. Update Inventory with gathered materials
      const updatedInv = { ...state.inventory };
      if (runStats.collectedMaterials) {
        Object.entries(runStats.collectedMaterials).forEach(([mat, qty]) => {
          updatedInv[mat] = (updatedInv[mat] || 0) + qty;
        });
      }

      // 2. Check Contract
      if (contract) {
        if (contract.type === 'travel' || contract.type === 'mining') {
           isMissionSuccess = checkContractCompletion(contract, runStats, updatedInv);
        }
      }

      // 3. Calculate Rewards
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
        // Successful landing without a specific mission
        rewardSummary = { 
          success: true, 
          message: 'Sector Traversal Complete', 
          rewards: { credits: 0, reputation: {} } 
        };
      }

      // If we failed a run (crashed), we might lose fuel but not move? 
      // For MVP simplicity, we always consume fuel and return to station on 'COMPLETE_RUN'.
      
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
      
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE, (initial) => {
    try {
      const saved = localStorage.getItem('LSNavigator_Save_v3');
      return saved ? JSON.parse(saved) : initial;
    } catch (e) {
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