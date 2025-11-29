// js/haar.js
import { rectSum } from './image.js';

/**
 * Evaluate a Haar-like feature at a specific window location
 * @param {Object} feature - Feature with rects array [{x, y, width, height, weight}]
 *                           Coordinates are relative to base window (e.g., 20x20)
 * @param {Float32Array} ii - Integral image
 * @param {number} imageWidth - Image width
 * @param {number} wx - Window top-left x coordinate
 * @param {number} wy - Window top-left y coordinate
 * @param {number} scale - Scale factor
 * @param {number} invArea - Inverse of window area (1 / area)
 * @param {number} stdDev - Standard deviation for normalization
 * @returns {number} Normalized feature value
 */
export function evaluateFeature(feature, ii, imageWidth, wx, wy, scale, invArea, stdDev) {
  let value = 0;

  for (const r of feature.rects) {
    const rx = wx + Math.round(r.x * scale);
    const ry = wy + Math.round(r.y * scale);
    const rw = Math.round(r.width * scale);
    const rh = Math.round(r.height * scale);

    const s = rectSum(ii, imageWidth, rx, ry, rw, rh);
    value += r.weight * s;
  }

  // Normalize by area and standard deviation
  return value * invArea / stdDev;
}

/**
 * Evaluate a cascade stage (collection of weak classifiers)
 * @param {Object} stage - Stage with weakClassifiers array and stageThreshold
 * @param {Array} features - Array of Haar features
 * @param {Float32Array} ii - Integral image
 * @param {number} imageWidth - Image width
 * @param {number} wx - Window top-left x coordinate
 * @param {number} wy - Window top-left y coordinate
 * @param {number} scale - Scale factor
 * @param {number} invArea - Inverse of window area
 * @param {number} stdDev - Standard deviation
 * @returns {boolean} True if stage passes, false if rejected
 */
export function evaluateStage(stage, features, ii, imageWidth, wx, wy, scale, invArea, stdDev) {
  let sum = 0;

  for (const wc of stage.weakClassifiers) {
    const feature = features[wc.featureIndex];
    const fVal = evaluateFeature(feature, ii, imageWidth, wx, wy, scale, invArea, stdDev);

    // tracking.js logic: if featureValue < threshold, use alpha (left_val), else use beta (right_val)
    const h = (fVal < wc.threshold) ? wc.alpha : wc.beta;

    sum += h;
  }

  // If threshold not reached, window is rejected
  return sum >= stage.stageThreshold;
}

/**
 * Evaluate full Haar Cascade at a window location
 * @param {Object} cascade - Cascade with baseWindowWidth, baseWindowHeight, and stages array
 * @param {Array} features - Array of Haar features
 * @param {Float32Array} ii - Integral image
 * @param {Float32Array} ii2 - Squared integral image (for variance)
 * @param {number} imageWidth - Image width
 * @param {number} wx - Window top-left x coordinate
 * @param {number} wy - Window top-left y coordinate
 * @param {number} scale - Scale factor
 * @param {number} winW - Scaled window width
 * @param {number} winH - Scaled window height
 * @returns {boolean} True if all stages pass (face detected), false otherwise
 */
export function evaluateCascade(cascade, features, ii, ii2, imageWidth, wx, wy, scale, winW, winH) {
  // Calculate mean and variance of the window
  const mean = rectSum(ii, imageWidth, wx, wy, winW, winH) / (winW * winH);
  const sqSum = rectSum(ii2, imageWidth, wx, wy, winW, winH);
  const variance = sqSum / (winW * winH) - mean * mean;
  const stdDev = Math.sqrt(Math.max(variance, 1.0));
  const invArea = 1.0 / (winW * winH);

  for (const stage of cascade.stages) {
    if (!evaluateStage(stage, features, ii, imageWidth, wx, wy, scale, invArea, stdDev)) {
      return false; // rejected at this stage → not a face
    }
  }
  return true; // passed all stages → face detected
}