// js/detector.js
import { computeIntegralImage } from './image.js';
import { evaluateCascade } from './haar.js';

/**
 * Detect faces in a grayscale image using Haar Cascade Classifier
 * @param {Float32Array} gray - Grayscale pixel array (width * height)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {Object} cascade - Cascade object with baseWindowWidth/baseWindowHeight/stages
 * @param {Array} features - Array of Haar features
 * @param {Object} options - Detection options (scaleFactor, minSize, maxSize)
 * @returns {Array} Array of detected face rectangles after NMS
 */
export function detectFaces(gray, width, height, cascade, features, options = {}) {
  const {
    scaleFactor = 1.2,
    minSize = cascade.baseWindowWidth || 24,
    maxSize = Math.min(width, height)
  } = options;

  const { ii, ii2 } = computeIntegralImage(gray, width, height);
  const detections = [];

  const baseW = cascade.baseWindowWidth;
  const baseH = cascade.baseWindowHeight;

  if (!baseW || !baseH) {
    return detections;
  }

  let scale = 1.0;

  while (baseW * scale <= maxSize && baseH * scale <= maxSize) {
    const winW = Math.round(baseW * scale);
    const winH = Math.round(baseH * scale);

    if (winW < minSize || winH < minSize) {
      scale *= scaleFactor;
      continue;
    }

    // Optimized window step - larger for better performance
    const step = Math.max(2, Math.floor(0.1 * winW));

    for (let y = 0; y <= height - winH; y += step) {
      for (let x = 0; x <= width - winW; x += step) {
        const isFace = evaluateCascade(cascade, features, ii, ii2, width, x, y, scale, winW, winH);
        if (isFace) {
          detections.push({ x, y, w: winW, h: winH, scale });
        }
      }
    }

    scale *= scaleFactor;
  }

  return nonMaximumSuppression(detections);
}

// Non-Maximum Suppression to eliminate overlapping detections
function nonMaximumSuppression(detections, overlapThreshold = 0.3) {
  if (detections.length === 0) return [];
  
  // Sort by area (largest to smallest)
  detections.sort((a, b) => (b.w * b.h) - (a.w * a.h));
  
  const keep = [];
  const suppressed = new Set();
  
  for (let i = 0; i < detections.length; i++) {
    if (suppressed.has(i)) continue;
    
    keep.push(detections[i]);
    
    for (let j = i + 1; j < detections.length; j++) {
      if (suppressed.has(j)) continue;
      
      const iou = computeIOU(detections[i], detections[j]);
      if (iou > overlapThreshold) {
        suppressed.add(j);
      }
    }
  }
  
  return keep;
}

function computeIOU(boxA, boxB) {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.w, boxB.x + boxB.w);
  const yB = Math.min(boxA.y + boxA.h, boxB.y + boxB.h);
  
  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  
  if (interArea === 0) return 0;
  
  const boxAArea = boxA.w * boxA.h;
  const boxBArea = boxB.w * boxB.h;
  
  return interArea / (boxAArea + boxBArea - interArea);
}