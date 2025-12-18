export class AIGenerator {
    constructor(frameManager, canvasRenderer, uiElements, animationController, controls) {
        this.frameManager = frameManager;
        this.canvasRenderer = canvasRenderer;
        this.ui = uiElements;
        this.animationController = animationController;
        this.controls = controls;

        this.ui.generateBtn.addEventListener('click', () => this.generate());
        this.ui.applyBtn.addEventListener('click', () => this.applyBackground());
    }

    async generate() {
        const prompt = this.ui.promptTextarea.value.trim();
        if (!prompt) {
            this.ui.statusEl.textContent = 'Please enter a scene description.';
            return;
        }

        const frames = this.frameManager.getFramesData();
        if (frames.length === 0) {
            this.ui.statusEl.textContent = 'No frame to generate from.';
            return;
        }
        
        const currentFrameIndex = this.animationController.isPlaying() ? this.animationController.getCurrentFrame() : 0;
        const currentFrameData = frames[currentFrameIndex];

        this.setLoadingState(true);
        this.ui.statusEl.textContent = 'Capturing current frame...';

        try {
            const imageDataUrl = await this.canvasRenderer.captureFrame(currentFrameData, true);
            
            this.ui.statusEl.textContent = 'Sending to AI for generation...';

            const preservationStrength = parseInt(this.ui.preservePercentage.value, 10);
            let preservationInstructions;

            if (preservationStrength === 100) {
                preservationInstructions = `2. You MUST preserve this text art *exactly* as it appears in the input image. Do not alter its colors, shape, text, or position. It must be perfectly preserved.`;
            } else if (preservationStrength >= 85) {
                preservationInstructions = `2. Preserve the text art with very high fidelity (around ${preservationStrength}%). Minor, subtle stylistic blending with the background is acceptable, but the original text's shape, color, and legibility must be almost perfectly maintained.`;
            } else { // 50-84
                preservationInstructions = `2. The text art should be preserved at about ${preservationStrength}% strength. You have creative freedom to stylistically integrate it with the scene (e.g., matching textures, lighting). The text must remain the clear subject and be fully legible, but it does not need to be an exact pixel-for-pixel copy.`;
            }

            const fullPrompt = `**Primary Goal:** Generate a new scene based on the user's prompt that serves as a background for the graphic element provided in the input image.

**User's scene description:** "${prompt}"

**Critical Instructions:**
1.  The input image contains a piece of text art with an anaglyph effect. This entire text block is the main subject.
${preservationInstructions}
3.  The text art must be the central focus of the final image, clearly visible and unobstructed.
4.  Your task is to create a scene *behind* or *around* the text art that matches the user's description. The text art should appear as an overlay on your generated scene.
5.  Do not attempt to interpret or change the text itself. Treat it as a single, immutable graphic element.`;
            
            const { width, height } = this.canvasRenderer.outputContainer.getBoundingClientRect();

            const result = await websim.imageGen({
                prompt: fullPrompt,
                width: Math.round(width),
                height: Math.round(height),
                image_inputs: [{ url: imageDataUrl }],
            });

            this.ui.resultImg.src = result.url;
            this.ui.resultContainer.style.display = 'flex';
            this.ui.statusEl.textContent = 'Generation complete!';

        } catch (error) {
            console.error('AI generation failed:', error);
            this.ui.statusEl.textContent = `Error: ${error.message}`;
        } finally {
            this.setLoadingState(false);
        }
    }
    
    applyBackground() {
        const imageUrl = this.ui.resultImg.src;
        if (!imageUrl) return;

        // Also update the UIController's reference to the output container
        const outputContainer = document.getElementById('output-container');
        outputContainer.style.backgroundImage = `url('${imageUrl}')`;
        // Turn off background color so image is visible
        outputContainer.style.backgroundColor = 'transparent';
    }

    setLoadingState(isLoading) {
        this.ui.generateBtn.disabled = isLoading;
        this.ui.promptTextarea.disabled = isLoading;
        this.ui.preservePercentage.disabled = isLoading;
        if (isLoading) {
            this.ui.resultContainer.style.display = 'none';
        }
    }
}