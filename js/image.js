// js/image.js

/**
 * Convert canvas content to grayscale (linear array width * height)
 * @param {HTMLCanvasElement} canvas - Canvas element to convert
 * @returns {Object} Object with gray (Float32Array), width, and height
 */
export function getGrayscaleFromCanvas(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data; // RGBA
  const gray = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // Approximate luma (standard grayscale conversion)
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return { gray, width, height };
}

/**
 * Build integral image (same resolution, cumulative sum)
 * Also builds squared integral image for variance calculation
 * @param {Float32Array} gray - Grayscale pixel array
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Object} Object with ii (integral image) and ii2 (squared integral image)
 */
export function computeIntegralImage(gray, width, height) {
  const ii = new Float32Array(width * height);
  const ii2 = new Float32Array(width * height); // For variance calculation

  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    let rowSum2 = 0;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const val = gray[idx];
      rowSum += val;
      rowSum2 += val * val;
      ii[idx] = rowSum + (y > 0 ? ii[(y - 1) * width + x] : 0);
      ii2[idx] = rowSum2 + (y > 0 ? ii2[(y - 1) * width + x] : 0);
    }
  }

  return { ii, ii2 };
}

/**
 * Fast rectangle sum using integral image
 * @param {Float32Array} ii - Integral image
 * @param {number} width - Image width
 * @param {number} x - Rectangle top-left x coordinate
 * @param {number} y - Rectangle top-left y coordinate
 * @param {number} w - Rectangle width
 * @param {number} h - Rectangle height
 * @returns {number} Sum of pixel values in the rectangle
 */
export function rectSum(ii, width, x, y, w, h) {
  // Validate rectangle is within bounds
  if (x < 0 || y < 0 || w <= 0 || h <= 0) return 0;
  
  const x2 = x + w - 1;
  const y2 = y + h - 1;
  
  // Ensure we don't exceed array bounds
  if (x2 < 0 || y2 < 0) return 0;

  // Use integral image formula: D - B - C + A
  const D = ii[y2 * width + x2];
  const C = (x > 0) ? ii[y2 * width + (x - 1)] : 0;
  const B = (y > 0) ? ii[(y - 1) * width + x2] : 0;
  const A = (x > 0 && y > 0) ? ii[(y - 1) * width + (x - 1)] : 0;

  return D - B - C + A;
}