// src/core/mathUtils.js
export const toRad = (deg) => (deg * Math.PI) / 180;
export const toDeg = (rad) => (rad * 180) / Math.PI;

/**
 * polarToCartesian
 * Converts Polar (r, θ) to Cartesian (x, y).
 * Assumes Standard Mathematical orientation (Angle 0 is East, Counter-Clockwise).
 */
export const polarToCartesian = (r, thetaDegrees) => {
  const rad = toRad(thetaDegrees);
  // Round to 2 decimal places to avoid floating point weirdness in UI
  const x = Math.round(r * Math.cos(rad) * 100) / 100;
  const y = Math.round(r * Math.sin(rad) * 100) / 100;
  return { x, y };
};

/**
 * cartesianToPolar
 * Converts Cartesian (x, y) to Polar (r, θ).
 */
export const cartesianToPolar = (x, y) => {
  const r = Math.sqrt(x * x + y * y);
  const thetaRad = Math.atan2(y, x);
  let thetaDeg = toDeg(thetaRad);
  
  if (thetaDeg < 0) thetaDeg += 360; // Normalize to 0-360 range
  
  return { 
    r: Math.round(r * 100) / 100, 
    theta: Math.round(thetaDeg * 100) / 100 
  };
};

/**
 * getDistance
 * Euclidean distance between two point objects {x,y}
 */
export const getDistance = (p1, p2) => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};