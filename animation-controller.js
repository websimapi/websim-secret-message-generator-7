export class AnimationController {
    constructor(frameManager, outputUpdater, playPauseBtn, fpsControl, dialogueFpsControl) {
        this.frameManager = frameManager;
        this.outputUpdater = outputUpdater; // This is a function that takes a state object
        this.playPauseBtn = playPauseBtn;
        this.fpsControl = fpsControl;
        this.dialogueFpsControl = dialogueFpsControl;
        
        this.state = {
            isPlaying: false,
            intervalId: null,
            renderQueue: [],
            playhead: 0,
        };

        this.playPauseBtn.addEventListener('click', () => this.toggle());
        this.fpsControl.addEventListener('input', () => this.handleSettingsChange());
        this.dialogueFpsControl.addEventListener('input', () => this.handleSettingsChange());
    }

    handleSettingsChange() {
        if (this.state.isPlaying) {
            this.stop();
            this.start();
        }
    }

    buildRenderQueue() {
        const frames = this.frameManager.getFramesData();
        const queue = [];
        const dialogueFps = parseInt(this.dialogueFpsControl.value, 10);
        const dialogueDelay = 1000 / dialogueFps;

        frames.forEach((frame, index) => {
            if (frame.dialogueMode) {
                const scrambledLines = frame.scrambled.split('\n');
                const hiddenLines = frame.hidden.split('\n');
                
                const maxLineCount = Math.max(scrambledLines.length, hiddenLines.length);
                const charCounts = Array(maxLineCount).fill(0).map((_, i) => 
                    Math.max(
                        (scrambledLines[i] || '').length, 
                        (hiddenLines[i] || '').length
                    )
                );
                const totalChars = charCounts.reduce((sum, count) => sum + count, 0);

                if (totalChars === 0) {
                     queue.push({
                        type: 'dialogue',
                        frameData: { scrambled: '', hidden: '' },
                        originalFrameIndex: index,
                        delay: dialogueDelay
                    });
                } else {
                    let currentScrambledLines = Array(maxLineCount).fill('');
                    let currentHiddenLines = Array(maxLineCount).fill('');

                    for (let lineIndex = 0; lineIndex < maxLineCount; lineIndex++) {
                        for (let charIndex = 1; charIndex <= charCounts[lineIndex]; charIndex++) {
                            currentScrambledLines[lineIndex] = (scrambledLines[lineIndex] || '').substring(0, charIndex);
                            currentHiddenLines[lineIndex] = (hiddenLines[lineIndex] || '').substring(0, charIndex);
                            
                             queue.push({
                                type: 'dialogue',
                                frameData: {
                                    scrambled: currentScrambledLines.join('\n'),
                                    hidden: currentHiddenLines.join('\n')
                                },
                                originalFrameIndex: index,
                                delay: dialogueDelay
                            });
                        }
                    }
                }
            } else {
                 queue.push({
                    type: 'full',
                    frameData: frame,
                    originalFrameIndex: index,
                    delay: 1000 / parseInt(this.fpsControl.value, 10)
                });
            }
        });
        this.state.renderQueue = queue;
    }

    toggle() {
        if (this.state.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        this.buildRenderQueue();
        const frames = this.state.renderQueue;
        if (frames.length === 0) return;

        this.state.isPlaying = true;
        this.playPauseBtn.textContent = 'Pause';
        this.state.playhead = 0;

        const advanceFrame = () => {
            if (!this.state.isPlaying) return;

            const currentRenderItem = frames[this.state.playhead];
            this.outputUpdater(currentRenderItem);

            this.state.playhead = (this.state.playhead + 1) % frames.length;
            
            // Schedule the next frame
            const nextRenderItem = frames[this.state.playhead];
            this.state.intervalId = setTimeout(advanceFrame, nextRenderItem.delay);
        };
        
        // Initial call
        const firstFrame = frames[0];
        this.outputUpdater(firstFrame);
        this.state.intervalId = setTimeout(advanceFrame, firstFrame.delay);
    }

    stop() {
        if (this.state.intervalId) {
            clearTimeout(this.state.intervalId);
            this.state.intervalId = null;
        }
        this.state.isPlaying = false;
        this.state.playhead = 0;
        this.outputUpdater({ type: 'reset' }); // Special state to reset view
        this.playPauseBtn.textContent = 'Play';
    }

    getCurrentFrame() {
        if (this.state.renderQueue.length > 0) {
            return this.state.renderQueue[this.state.playhead]?.originalFrameIndex || 0;
        }
        return 0;
    }

    isPlaying() {
        return this.state.isPlaying;
    }
}