// Alternative: using tracking.js library directly
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const btnStart = document.getElementById('btn-start');
const ctx = canvas.getContext('2d');

btnStart.addEventListener('click', () => {
  // Initialize tracking.js face tracker
  const tracker = new tracking.ObjectTracker('face');
  tracker.setInitialScale(1.5);
  tracker.setStepSize(1.5);
  tracker.setEdgesDensity(0.1);

  tracking.track(video, tracker);

  tracker.on('track', event => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    event.data.forEach(rect => {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    });
  });

  video.play();
  btnStart.disabled = true;
});
