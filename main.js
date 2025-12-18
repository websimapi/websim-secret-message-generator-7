import { NoiseGenerator } from './noise-generator.js';
import { FrameManager } from './frame-manager.js';
import { AnimationController } from './animation-controller.js';
import { GifGenerator } from './gif-generator.js';
import { UIController } from './ui-controller.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { AIGenerator } from './ai-generator.js';

class App {
    constructor() {
        this.initElements();
        this.initComponents();
        this.setupEventListeners();
        this.initialSetup();
    }

    initElements() {
        this.framesList = document.getElementById('frames-list');
        this.addFrameBtn = document.getElementById('add-frame-btn');
        this.scrambledOutput = document.getElementById('output-scrambled');
        this.hiddenOutput = document.getElementById('output-hidden');
        this.outputContainer = document.getElementById('output-container');
        this.noiseCanvas = document.getElementById('noise-canvas');
        this.playPauseBtn = document.getElementById('play-pause-animation');
        this.generateGifBtn = document.getElementById('generate-gif-btn');
        this.gifStatusEl = document.getElementById('gif-status');

        this.aiUI = {
            promptTextarea: document.getElementById('ai-prompt'),
            generateBtn: document.getElementById('generate-ai-scene-btn'),
            statusEl: document.getElementById('ai-status'),
            resultContainer: document.getElementById('ai-result-container'),
            resultImg: document.getElementById('ai-result-img'),
            applyBtn: document.getElementById('apply-ai-scene-btn'),
            preservePercentage: document.getElementById('ai-preserve-percentage'),
        };

        this.controls = {
            scrambledColor: document.getElementById('scrambled-color'),
            scrambledBlendMode: document.getElementById('scrambled-blend-mode'),
            hiddenColor: document.getElementById('hidden-color'),
            hiddenBlendMode: document.getElementById('hidden-blend-mode'),
            hiddenOffsetX: document.getElementById('hidden-offset-x'),
            hiddenOffsetY: document.getElementById('hidden-offset-y'),
            fontFamily: document.getElementById('font-family'),
            fontSize: document.getElementById('font-size'),
            fontWeight: document.getElementById('font-weight'),
            letterSpacing: document.getElementById('letter-spacing'),
            lineHeight: document.getElementById('line-height'),
            bgColor: document.getElementById('bg-color'),
            noiseOpacity: document.getElementById('noise-opacity'),
            noiseType: document.getElementById('noise-type'),
            noiseScale: document.getElementById('noise-scale'),
            gifFps: document.getElementById('gif-fps'),
            dialogueFps: document.getElementById('dialogue-fps'),
            aiPreservePercentage: document.getElementById('ai-preserve-percentage-value'),
        };

        this.valueDisplays = {
            hiddenOffsetX: document.getElementById('hidden-offset-x-value'),
            hiddenOffsetY: document.getElementById('hidden-offset-y-value'),
            fontSize: document.getElementById('font-size-value'),
            fontWeight: document.getElementById('font-weight-value'),
            letterSpacing: document.getElementById('letter-spacing-value'),
            lineHeight: document.getElementById('line-height-value'),
            noiseOpacity: document.getElementById('noise-opacity-value'),
            noiseScale: document.getElementById('noise-scale-value'),
            gifFps: document.getElementById('gif-fps-value'),
            dialogueFps: document.getElementById('dialogue-fps-value'),
        };
    }

    initComponents() {
        this.noiseGenerator = new NoiseGenerator(this.noiseCanvas);
        
        this.frameManager = new FrameManager(this.framesList, (action) => {
            if (action === 'remove') {
                this.animationController.stop();
            }
            this.updateOutput();
        });

        this.animationController = new AnimationController(
            this.frameManager, 
            (state) => this.updateOutput(state),
            this.playPauseBtn,
            this.controls.gifFps,
            this.controls.dialogueFps
        );

        this.canvasRenderer = new CanvasRenderer(this.outputContainer, this.noiseCanvas, this.controls);

        this.gifGenerator = new GifGenerator(
            this.frameManager,
            this.canvasRenderer,
            this.gifStatusEl,
            this.controls,
            this.noiseGenerator
        );

        this.aiGenerator = new AIGenerator(
            this.frameManager,
            this.canvasRenderer,
            this.aiUI,
            this.animationController,
            this.controls
        );

        this.uiController = new UIController(this.controls, this.valueDisplays, this.noiseGenerator);
        this.uiController.setOnSettingsChange(() => {
            if (this.animationController.isPlaying()) {
                this.animationController.stop();
            }
        });
    }

    setupEventListeners() {
        this.addFrameBtn.addEventListener('click', () => {
            this.frameManager.createFrameInput();
        });

        this.generateGifBtn.addEventListener('click', async () => {
            this.generateGifBtn.disabled = true;
            this.playPauseBtn.disabled = true;
            this.gifStatusEl.textContent = 'Initializing...';
            
            try {
                await this.gifGenerator.generate(this.animationController);
            } catch (error) {
                console.error('GIF generation failed:', error);
                this.gifStatusEl.textContent = 'Generation failed.';
            } finally {
                this.generateGifBtn.disabled = false;
                this.playPauseBtn.disabled = false;
            }
        });

        // Resize observer for the output container
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                this.noiseCanvas.width = width;
                this.noiseCanvas.height = height;
                this.uiController.updateStyles();
            }
        });

        resizeObserver.observe(this.outputContainer);
    }

    updateOutput(renderState = null) {
        // Regenerate noise for dynamic effect
        const scale = parseInt(this.controls.noiseScale.value, 10);
        const type = this.controls.noiseType.value;
        this.noiseGenerator.generate(scale, type);

        // Handle live animation state
        if (renderState && renderState.type) {
            if (renderState.type === 'reset') {
                // Reset to show the first full frame statically
                const frames = this.frameManager.getFramesData();
                if (frames.length > 0) {
                    this.scrambledOutput.textContent = frames[0].scrambled;
                    this.hiddenOutput.textContent = frames[0].hidden;
                } else {
                    this.scrambledOutput.textContent = '';
                    this.hiddenOutput.textContent = '';
                }
                document.querySelectorAll('.frame-item').forEach(item => item.style.borderColor = '#ddd');
                return;
            }

            // Update text content from render state
            this.scrambledOutput.textContent = renderState.frameData.scrambled;
            this.hiddenOutput.textContent = renderState.frameData.hidden;
            
            // Highlight the corresponding source frame
            document.querySelectorAll('.frame-item').forEach((item, index) => {
                item.style.borderColor = index === renderState.originalFrameIndex ? '#007bff' : '#ddd';
            });
            return;
        }

        // Handle static view (when not playing)
        const frames = this.frameManager.getFramesData();
        if (frames.length > 0) {
            this.scrambledOutput.textContent = frames[0].scrambled;
            this.hiddenOutput.textContent = frames[0].hidden;
        } else {
            this.scrambledOutput.textContent = '';
            this.hiddenOutput.textContent = '';
        }
        document.querySelectorAll('.frame-item').forEach(item => item.style.borderColor = '#ddd');
    }

    initialSetup() {
        // Create initial frame
        this.frameManager.createFrameInput(
            'THISE ISW AJUMBLEF OF LETTERS ANDX WORDS TOD HIDES A MESSAGE.',
            'THIS IS A HIDDEN MESSAGE. YOU FOUND IT! GREAT JOB DETECTIVE!'
        );
        
        // Initial size setup
        const initialRect = this.outputContainer.getBoundingClientRect();
        this.noiseCanvas.width = initialRect.width;
        this.noiseCanvas.height = initialRect.height;
        
        this.uiController.updateStyles();
        this.updateOutput();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});