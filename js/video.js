// js/video.js

/**
 * Draw current video frame to canvas
 * Uses actual video dimensions to prevent distortion
 * @param {HTMLVideoElement} video - Video element
 * @param {HTMLCanvasElement} canvas - Canvas element
 */
export function drawVideoFrameToCanvas(video, canvas) {
  const ctx = canvas.getContext('2d', { 
    alpha: false,
    desynchronized: true 
  });
  
  // Use actual video dimensions to avoid distortion
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  
  // Adjust canvas to actual video size if needed
  if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
    canvas.width = videoWidth;
    canvas.height = videoHeight;
  }
  
  ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
}