// js/main.js
import { drawVideoFrameToCanvas } from './video.js';
import { getGrayscaleFromCanvas } from './image.js';
import { detectFaces } from './detector.js';
import { drawFaceBox } from './draw.js';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

let cascade = null;
let features = null;
let running = false;
let frameCount = 0;
let currentFaceBox = null;

// Load Haar Cascade classifier from tracking.js format
async function loadCascade() {
  const res = await fetch('./data/haarcascade_frontalface_default.js');
  const jsCode = await res.text();
  
  // Extract array from JavaScript code
  const match = jsCode.match(/\[([\s\S]*)\]/);
  if (!match) {
    throw new Error('Failed to extract cascade array');
  }
  
  const cascadeData = eval('[' + match[1] + ']');
  const parsed = parseTrackingJsCascade(cascadeData);
  cascade = parsed.cascade;
  features = parsed.features;
}

// Parse tracking.js cascade format
// Format: [width, height, stageData...]
// Each stage: stageThreshold, numWeakClassifiers, weakClassifier1Data..., weakClassifierNData
// Each weakClassifier: tilted, numRects, x, y, w, h, weight (per rect), threshold, left_val, right_val
function parseTrackingJsCascade(data) {
  const baseWindowWidth = data[0];
  const baseWindowHeight = data[1];
  
  const stages = [];
  const features = [];
  let featureIndex = 0;
  let i = 2;
  
  while (i < data.length) {
    const stageThreshold = data[i++];
    const numWeakClassifiers = data[i++];
    const weakClassifiers = [];
    
    for (let j = 0; j < numWeakClassifiers; j++) {
      const tilted = data[i++];
      const numRects = data[i++];
      
      const rects = [];
      for (let r = 0; r < numRects; r++) {
        rects.push({
          x: data[i++],
          y: data[i++],
          width: data[i++],
          height: data[i++],
          weight: data[i++]
        });
      }
      
      const threshold = data[i++];
      const left_val = data[i++];
      const right_val = data[i++];
      
      features.push({ tilted, rects });
      
      // tracking.js logic: if feature_value < threshold, return left_val, else right_val
      weakClassifiers.push({
        featureIndex: featureIndex++,
        threshold,
        alpha: left_val,
        beta: right_val
      });
    }
    
    stages.push({ stageThreshold, weakClassifiers });
  }
  
  return {
    cascade: { baseWindowWidth, baseWindowHeight, stages },
    features
  };
}

// Wait for video metadata to be ready
function waitForVideoReady(videoElement) {
  return new Promise(resolve => {
    if (videoElement.readyState >= 1) {
      resolve();
    } else {
      videoElement.addEventListener('loadedmetadata', () => resolve(), { once: true });
    }
  });
}

// Start face detection automatically
async function startDetection() {
  if (running) return;

  if (!cascade || !features) {
    await loadCascade();
  }

  if (!video.src) {
    console.error('video.mp4 not found');
    return;
  }

  await waitForVideoReady(video);
  video.play();

  running = true;
  frameCount = 0;
  currentFaceBox = null;

  requestAnimationFrame(processLoop);
}

// Auto-start when page loads
startDetection();

// Main processing loop
function processLoop() {
  if (!running) return;

  if (video.paused || video.ended) {
    running = false;
    return;
  }

  frameCount++;

  // Process every 5th frame to optimize CPU usage
  if (frameCount % 5 === 0) {
    drawVideoFrameToCanvas(video, canvas);
    const { gray, width, height } = getGrayscaleFromCanvas(canvas);

    const detections = detectFaces(gray, width, height, cascade, features, {
      scaleFactor: 1.1,
      minSize: 30,
      maxSize: Math.min(width, height) * 0.9
    });

    currentFaceBox = selectBestFace(detections, currentFaceBox);
  } else {
    drawVideoFrameToCanvas(video, canvas);
  }

  if (currentFaceBox) {
    drawFaceBox(canvas, currentFaceBox);
  }

  requestAnimationFrame(processLoop);
}

// Calculate Intersection over Union (IoU) between two boxes
function calculateIoU(boxA, boxB) {
  const x1 = Math.max(boxA.x, boxB.x);
  const y1 = Math.max(boxA.y, boxB.y);
  const x2 = Math.min(boxA.x + boxA.w, boxB.x + boxB.w);
  const y2 = Math.min(boxA.y + boxA.h, boxB.y + boxB.h);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersectionArea = intersectionWidth * intersectionHeight;

  if (intersectionArea <= 0) return 0;

  const areaA = boxA.w * boxA.h;
  const areaB = boxB.w * boxB.h;
  const unionArea = areaA + areaB - intersectionArea;

  return intersectionArea / unionArea;
}

// Select the best face to track based on IoU with previous detection
function selectBestFace(detections, previousBox) {
  if (!detections.length) return null;

  // If no previous box, select the largest face
  if (!previousBox) {
    return detections.reduce((largest, current) =>
      current.w * current.h > largest.w * largest.h ? current : largest
    );
  }

  // Find detection with highest IoU with previous box
  let bestMatch = null;
  let bestScore = 0;

  for (const detection of detections) {
    const score = calculateIoU(previousBox, detection);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = detection;
    }
  }

  // If match quality is too low, fallback to largest face
  if (!bestMatch || bestScore < 0.1) {
    bestMatch = detections.reduce((largest, current) =>
      current.w * current.h > largest.w * largest.h ? current : largest
    );
  }

  return bestMatch;
}