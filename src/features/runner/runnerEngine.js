import { TRIG_VALUES } from '../../data/gameData';

// --- Constants ---
const LANE_WIDTH = 150; // World units between lanes
const HORIZON_Y = 0.4;  // Screen height % where the "vanishing point" is
const FOV = 300;        // Field of View scale factor

/**
 * Project 3D world coordinates to 2D screen coordinates.
 */
export const project = (x, z, width, height) => {
  const scale = FOV / (FOV + z);
  const x2d = (x * scale) + (width / 2);
  const y2d = (height * HORIZON_Y) + ((height * 0.3) * scale); 
  return { x: x2d, y: y2d, scale };
};

/**
 * Generate a new entity.
 * @param {number} zStart - Depth to spawn at
 * @param {number} requiredValue - The value the player currently NEEDS (e.g. 0.707)
 */
export const spawnEntity = (zStart, requiredValue) => {
  // Lanes: -1 (Left), 0 (Center), 1 (Right)
  const lane = Math.floor(Math.random() * 3) - 1;
  
  // 20% Chance Debris (Avoid)
  // 80% Chance Data (Collect)
  const isDebris = Math.random() > 0.8;

  if (isDebris) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      x: lane * LANE_WIDTH,
      z: zStart,
      type: 'debris',
      content: null,
      collected: false
    };
  }

  // DATA SPAWNING LOGIC
  // We want to ensure the "Correct" answer spawns frequently enough to be fun.
  // 40% Chance: Spawn the EXACT value needed.
  // 60% Chance: Spawn random value (might be wrong).
  
  let dataItem;
  if (requiredValue !== null && Math.random() < 0.4) {
    // Find items that match the required value
    const matches = TRIG_VALUES.filter(t => Math.abs(t.value - requiredValue) < 0.001);
    dataItem = matches[Math.floor(Math.random() * matches.length)];
  } else {
    // Random item
    dataItem = TRIG_VALUES[Math.floor(Math.random() * TRIG_VALUES.length)];
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    x: lane * LANE_WIDTH,
    z: zStart,
    type: 'data',
    content: dataItem, 
    collected: false
  };
};

/**
 * Check collision between Player and Entity
 */
export const checkCollision = (playerLane, entity) => {
  // Z-Check: Is it passing the player? (Player at Z=0)
  const inHitZone = entity.z < 20 && entity.z > -20;
  
  // X-Check: Is it in the same lane?
  const entityLane = Math.round(entity.x / LANE_WIDTH);
  
  return inHitZone && (playerLane === entityLane);
};