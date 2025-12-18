// Preload the worker script and store it as a blob. This is more robust.
let gifWorkerBlob = null;
(async function preloadWorker() {
  try {
    const resp = await fetch('https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js');
    if (!resp.ok) throw new Error(`Failed to fetch worker: ${resp.statusText}`);
    gifWorkerBlob = await resp.blob();
    console.log('GIF worker preloaded successfully.');
  } catch (error) {
    console.error('Failed to preload GIF worker:', error);
  }
})();

// Utility to wait for a condition to be true
function waitFor(fn, interval = 50, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const t = setInterval(() => {
      if (fn()) {
        clearInterval(t);
        resolve();
      } else if (performance.now() - start > timeout) {
        clearInterval(t);
        reject(new Error('Timeout waiting for GIF worker'));
      }
    }, interval);
  });
}

export class GifGenerator {
    constructor(frameManager, canvasRenderer, statusEl, controls, noiseGenerator) {
        this.frameManager = frameManager;
        this.canvasRenderer = canvasRenderer;
        this.statusEl = statusEl;
        this.controls = controls;
        this.noiseGenerator = noiseGenerator;
    }

    async generate(animationController) {
        const framesData = this.frameManager.getFramesData();
        if (framesData.length === 0) {
            this.statusEl.textContent = 'Add at least one frame.';
            return;
        }

        // Wait for the worker if it hasn't loaded yet
        if (!gifWorkerBlob) {
            this.statusEl.textContent = 'Loading GIF engine...';
            try {
                await waitFor(() => !!gifWorkerBlob, 100, 10000);
            } catch (e) {
                this.statusEl.textContent = 'Error: Could not load GIF engine.';
                console.error(e);
                return;
            }
        }
        
        // Temporarily stop live animation
        const wasPlaying = animationController.isPlaying();
        if (wasPlaying) animationController.stop();

        const { width, height } = this.canvasRenderer.outputContainer.getBoundingClientRect();
        const fps = parseInt(this.controls.gifFps.value, 10);
        const delay = 1000 / fps;
        const dialogueFps = parseInt(this.controls.dialogueFps.value, 10);
        const dialogueDelay = 1000 / dialogueFps;

        const workerUrl = URL.createObjectURL(gifWorkerBlob);

        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: width,
            height: height,
            workerScript: workerUrl
        });

        // Pre-calculate total frames for accurate progress updates
        let totalFramesToRender = 0;
        framesData.forEach(frame => {
            if (frame.dialogueMode) {
                totalFramesToRender += Math.max(frame.scrambled.length, frame.hidden.length) || 1;
            } else {
                totalFramesToRender++;
            }
        });

        let renderedFramesCount = 0;
        const noiseScale = parseInt(this.controls.noiseScale.value, 10);
        const noiseType = this.controls.noiseType.value;

        for (const frameData of framesData) {
            if (frameData.dialogueMode) {
                const scrambledLines = frameData.scrambled.split('\n');
                const hiddenLines = frameData.hidden.split('\n');
                const maxLineCount = Math.max(scrambledLines.length, hiddenLines.length);
                 const charCounts = Array(maxLineCount).fill(0).map((_, i) => 
                    Math.max(
                        (scrambledLines[i] || '').length, 
                        (hiddenLines[i] || '').length
                    )
                );
                const totalChars = charCounts.reduce((sum, count) => sum + count, 0);
                
                if (totalChars === 0) { // Render one blank frame if no text
                     this.noiseGenerator.generate(noiseScale, noiseType);
                     const frameCtx = await this.canvasRenderer.captureFrame({ scrambled: '', hidden: '' }, false);
                     gif.addFrame(frameCtx.canvas, { delay: dialogueDelay, copy: true });
                     renderedFramesCount++;
                     this.statusEl.textContent = `Rendering frame ${renderedFramesCount}/${totalFramesToRender}...`;
                     continue;
                }
                
                let currentScrambledLines = Array(maxLineCount).fill('');
                let currentHiddenLines = Array(maxLineCount).fill('');

                for (let lineIndex = 0; lineIndex < maxLineCount; lineIndex++) {
                    for (let charIndex = 1; charIndex <= charCounts[lineIndex]; charIndex++) {
                        renderedFramesCount++;
                        this.statusEl.textContent = `Rendering dialogue frame ${renderedFramesCount}/${totalFramesToRender}...`;
                        
                        currentScrambledLines[lineIndex] = (scrambledLines[lineIndex] || '').substring(0, charIndex);
                        currentHiddenLines[lineIndex] = (hiddenLines[lineIndex] || '').substring(0, charIndex);
                        
                        const subFrameData = {
                            scrambled: currentScrambledLines.join('\n'),
                            hidden: currentHiddenLines.join('\n')
                        };
                        
                        this.noiseGenerator.generate(noiseScale, noiseType);
                        const frameCtx = await this.canvasRenderer.captureFrame(subFrameData, false);
                        gif.addFrame(frameCtx.canvas, { delay: dialogueDelay, copy: true });
                    }
                }

            } else {
                renderedFramesCount++;
                this.statusEl.textContent = `Rendering frame ${renderedFramesCount}/${totalFramesToRender}...`;
                this.noiseGenerator.generate(noiseScale, noiseType);
                const frameCtx = await this.canvasRenderer.captureFrame(frameData, false);
                gif.addFrame(frameCtx.canvas, { delay, copy: true });
            }
        }

        gif.on('finished', (blob) => {
            // Clean up the worker URL
            URL.revokeObjectURL(workerUrl);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'secret-message.gif';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.statusEl.textContent = 'Done!';
            if (wasPlaying) animationController.start();
        });
        
        gif.on('progress', (p) => {
            this.statusEl.textContent = `Building GIF... ${Math.round(p * 100)}%`;
        });

        this.statusEl.textContent = `Building GIF... 0%`;
        gif.render();
    }
}