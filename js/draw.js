// js/draw.js

/**
 * Draw face detection box on canvas
 * Expands box vertically to include full face (mouth area)
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} box - Detection box with x, y, w, h properties
 */
export function drawFaceBox(canvas, box) {
  if (!box) return;
  const ctx = canvas.getContext('2d');
  
  // The tracking.js cascade sometimes detects only upper region (eyes)
  // Expand vertically to include full face
  const expandY = box.h * 0.3;  // Expand 30% downward
  const newH = box.h + expandY;
  
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(0, 255, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.strokeRect(box.x, box.y, box.w, newH);
  ctx.shadowBlur = 0;
}