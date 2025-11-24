// src/data/gameData.js
export const GUILDS = {
  NAVIGATORS: { id: 'navigators', name: 'Navigator\'s Guild', icon: '🧭', color: 'var(--purple)', description: 'Masters of astrogation and mapping.' },
  MINERS: { id: 'miners', name: 'Miner\'s Alliance', icon: '⛏️', color: 'var(--red)', description: 'The backbone of resource extraction.' },
  MERCHANTS: { id: 'merchants', name: 'Merchant\'s Consortium', icon: '⚖️', color: 'var(--green)', description: 'Logistics and market control.' }
};

export const LOCATIONS = [
  { id: 'home', name: 'Pantheon Station', type: 'station', x: 0, y: 0, icon: '🏠', faction: 'neutral' },
  { id: 'trade1', name: 'Azure Post', type: 'station', x: 5, y: 12, icon: '🏪', faction: 'merchants' },
  { id: 'mine1', name: 'Radian Fields', type: 'asteroid', x: -8, y: 15, icon: '☄️', faction: 'miners' },
  { id: 'nav1', name: 'Echo Buoy', type: 'outpost', x: 10, y: -5, icon: '📡', faction: 'navigators' }
];

// The "Answer Keys" - Materials floating in space
// We map multiple display labels to the same underlying value for variety
export const TRIG_VALUES = [
  { label: '1/2', value: 0.5, materialId: 'sin30' },
  { label: '0.5', value: 0.5, materialId: 'sin30' },
  
  { label: '√2/2', value: 0.707, materialId: 'sin45' },
  { label: '0.707', value: 0.707, materialId: 'sin45' },
  
  { label: '√3/2', value: 0.866, materialId: 'sin60' },
  { label: '0.866', value: 0.866, materialId: 'sin60' },
  
  { label: '1', value: 1.0, materialId: 'tan45' },
  { label: '1.0', value: 1.0, materialId: 'tan45' }
];

// The "Questions" - What the shield harmonic requires
export const HARMONICS = [
  { label: 'sin(30°)', targetValue: 0.5 },
  { label: 'cos(60°)', targetValue: 0.5 },
  { label: 'sin(45°)', targetValue: 0.707 },
  { label: 'cos(45°)', targetValue: 0.707 },
  { label: 'sin(60°)', targetValue: 0.866 },
  { label: 'cos(30°)', targetValue: 0.866 },
  { label: 'tan(45°)', targetValue: 1.0 },
  { label: 'sin(90°)', targetValue: 1.0 }
];

export const MATERIALS = {
  'sin30': { name: 'Resin (0.5)', rarity: 'common', value: 10 },
  'sin45': { name: 'Resin (0.707)', rarity: 'uncommon', value: 20 },
  'sin60': { name: 'Resin (0.866)', rarity: 'rare', value: 30 },
  'tan45': { name: 'Flux (1.0)', rarity: 'common', value: 15 },
};

export const BLUEPRINTS = [
  { id: 'nav_comp', name: 'Nav Computer', icon: '🖥️', difficulty: 1, baseValue: 150, materials: { 'sin30': 3, 'tan45': 2 } },
  { id: 'warp_coil', name: 'Warp Coil', icon: '🌀', difficulty: 2, baseValue: 300, materials: { 'sin45': 3, 'sin60': 2 } },
  { id: 'hull_plate', name: 'Hull Plate', icon: '🛡️', difficulty: 1, baseValue: 100, materials: { 'sin30': 5 } }
];

export const CONTRACT_TEMPLATES = [
  { id: 'mining_basic', type: 'mining', guildId: 'miners', titleKey: 'contract.mining_basic', descKey: 'contract.desc_mining', targetMaterial: 'sin30', requiredCount: 5, rewardCredits: 300, rewardRep: { miners: 10, merchants: -2 } },
  { id: 'nav_survey', type: 'travel', guildId: 'navigators', titleKey: 'contract.nav_survey', descKey: 'contract.desc_survey', destinationId: 'nav1', rewardCredits: 500, rewardRep: { navigators: 15 } },
  { id: 'supply_run', type: 'craft', guildId: 'merchants', titleKey: 'contract.supply_run', descKey: 'contract.desc_supply', targetItem: 'nav_comp', requiredCount: 1, rewardCredits: 400, rewardRep: { merchants: 15, miners: -5 } }
];