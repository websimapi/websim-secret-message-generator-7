export class UIController {
    constructor(controls, valueDisplays, noiseGenerator) {
        this.controls = controls;
        this.valueDisplays = valueDisplays;
        this.noiseGenerator = noiseGenerator;
        
        this.scrambledOutput = document.getElementById('output-scrambled');
        this.hiddenOutput = document.getElementById('output-hidden');
        this.outputContainer = document.getElementById('output-container');
        this.noiseCanvas = document.getElementById('noise-canvas');
        this.customFontInput = document.getElementById('custom-font-input');

        this.setupEventListeners();
        this.populateSelects();
        this.populateFontList();
    }

    populateFontList() {
        const webSafeFonts = [
            { name: 'Courier New', value: "'Courier New', Courier, monospace" },
            { name: 'Arial', value: "Arial, Helvetica, sans-serif" },
            { name: 'Times New Roman', value: "'Times New Roman', Times, serif" },
            { name: 'Georgia', value: "Georgia, serif" },
            { name: 'Verdana', value: "Verdana, Geneva, sans-serif" },
            { name: 'Impact', value: "Impact, Charcoal, sans-serif" },
            { name: 'Trebuchet MS', value: "'Trebuchet MS', Helvetica, sans-serif" },
            { name: 'Lucida Console', value: "'Lucida Console', Monaco, monospace" }
        ];

        const googleFonts = [
            'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 
            'Source Sans Pro', 'Slabo 27px', 'Raleway', 'PT Sans', 
            'Merriweather', 'Noto Sans', 'Nunito', 'Concert One', 
            'Prompt', 'Work Sans', 'Creepster', 'Nosifer', 'Butcherman', 
            'Frijole', 'Eater', 'Press Start 2P', 'VT323', 'Orbitron', 
            'Exo 2', 'Pacifico', 'Dancing Script', 'Anton', 'Bebas Neue', 
            'Playfair Display', 'Cinzel', 'Aleo', 'Permanent Marker', 'Rubik Glitch'
        ];

        const select = this.controls.fontFamily;
        select.innerHTML = '';

        // Web Safe Group
        const webSafeGroup = document.createElement('optgroup');
        webSafeGroup.label = 'Web Safe Fonts';
        webSafeFonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font.value;
            option.textContent = font.name;
            if (font.name === 'Courier New') option.selected = true;
            webSafeGroup.appendChild(option);
        });
        select.appendChild(webSafeGroup);

        // Google Fonts Group
        const googleGroup = document.createElement('optgroup');
        googleGroup.label = 'Google Fonts';
        googleFonts.sort().forEach(font => {
            const option = document.createElement('option');
            option.value = font; 
            option.textContent = font;
            googleGroup.appendChild(option);
        });
        select.appendChild(googleGroup);

        // Custom Fonts Group
        this.customFontGroup = document.createElement('optgroup');
        this.customFontGroup.label = 'Custom Uploads';
        select.appendChild(this.customFontGroup);
    }

    loadGoogleFont(fontName) {
        const id = `font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
        if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}&display=swap`;
            document.head.appendChild(link);
        }
    }

    populateSelects() {
        const blendModes = [
            'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 
            'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
            'exclusion', 'hue', 'saturation', 'color', 'luminosity'
        ];

        this.populateSelect(this.controls.scrambledBlendMode, blendModes, 'lighten');
        this.populateSelect(this.controls.hiddenBlendMode, blendModes, 'darken');
    }

    populateSelect(selectElement, options, selectedValue) {
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option.charAt(0).toUpperCase() + option.slice(1);
            if (option === selectedValue) {
                optionElement.selected = true;
            }
            selectElement.appendChild(optionElement);
        });
    }

    setupEventListeners() {
        for (const key in this.controls) {
            this.controls[key].addEventListener('input', () => {
                this.updateStyles();
                if (this.onSettingsChange) {
                    this.onSettingsChange();
                }
            });
        }
        // Also handle the AI slider, which is not in the main `controls` object
        const aiPreserveSlider = document.getElementById('ai-preserve-percentage');
        if (aiPreserveSlider) {
            aiPreserveSlider.addEventListener('input', () => this.updateValueDisplays());
        }

        if (this.customFontInput) {
            this.customFontInput.addEventListener('change', (e) => this.handleCustomFont(e));
        }
    }

    async handleCustomFont(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();
            // Create a unique font name
            const fontName = `CustomFont_${Date.now()}`;
            const font = new FontFace(fontName, buffer);
            
            await font.load();
            document.fonts.add(font);

            // Add to select
            const option = document.createElement('option');
            option.value = fontName;
            option.textContent = file.name;
            option.selected = true;
            this.customFontGroup.appendChild(option);

            // Trigger update
            this.controls.fontFamily.dispatchEvent(new Event('input'));
        } catch (err) {
            console.error('Error loading custom font:', err);
            alert('Could not load font. Please ensure it is a valid font file.');
        }
    }

    setOnSettingsChange(callback) {
        this.onSettingsChange = callback;
    }

    updateStyles() {
        // Scrambled Text
        this.scrambledOutput.style.color = this.controls.scrambledColor.value;
        this.scrambledOutput.style.mixBlendMode = this.controls.scrambledBlendMode.value;

        // Hidden Text
        const offsetX = this.controls.hiddenOffsetX.value;
        const offsetY = this.controls.hiddenOffsetY.value;
        this.hiddenOutput.style.color = this.controls.hiddenColor.value;
        this.hiddenOutput.style.mixBlendMode = this.controls.hiddenBlendMode.value;
        this.hiddenOutput.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        
        // General Text
        let fontFamily = this.controls.fontFamily.value;
        
        // If it doesn't contain commas and isn't a custom loaded one (starts with CustomFont_), it's likely a Google Font that needs loading
        if (fontFamily && !fontFamily.includes(',') && !fontFamily.startsWith('CustomFont_')) {
             this.loadGoogleFont(fontFamily);
        }

        const fontSize = this.controls.fontSize.value;
        const fontWeight = this.controls.fontWeight.value;
        const letterSpacing = this.controls.letterSpacing.value;
        const lineHeight = this.controls.lineHeight.value;
        
        const sharedTextStyle = `
            font-family: ${fontFamily};
            font-size: ${fontSize}px;
            font-weight: ${fontWeight};
            letter-spacing: ${letterSpacing}px;
            line-height: ${lineHeight};
        `;
        this.scrambledOutput.style.cssText += sharedTextStyle;
        this.hiddenOutput.style.cssText += sharedTextStyle;

        // Background
        const noiseOpacity = this.controls.noiseOpacity.value;
        this.outputContainer.style.backgroundColor = this.controls.bgColor.value;
        this.noiseCanvas.style.opacity = noiseOpacity;

        // Update value displays
        this.updateValueDisplays();
        
        // Regenerate noise if noise-related settings changed
        const scale = parseInt(this.controls.noiseScale.value, 10);
        const type = this.controls.noiseType.value;
        this.noiseGenerator.generate(scale, type);
    }

    updateValueDisplays() {
        // Main controls
        this.valueDisplays.hiddenOffsetX.textContent = this.controls.hiddenOffsetX.value;
        this.valueDisplays.hiddenOffsetY.textContent = this.controls.hiddenOffsetY.value;
        this.valueDisplays.fontSize.textContent = this.controls.fontSize.value;
        this.valueDisplays.fontWeight.textContent = this.controls.fontWeight.value;
        this.valueDisplays.letterSpacing.textContent = this.controls.letterSpacing.value;
        this.valueDisplays.lineHeight.textContent = this.controls.lineHeight.value;
        this.valueDisplays.noiseOpacity.textContent = this.controls.noiseOpacity.value;
        this.valueDisplays.noiseScale.textContent = this.controls.noiseScale.value;
        this.valueDisplays.gifFps.textContent = this.controls.gifFps.value;
        this.valueDisplays.dialogueFps.textContent = this.controls.dialogueFps.value;

        // AI preserve percentage
        if (this.valueDisplays.aiPreservePercentage) {
            const aiSlider = document.getElementById('ai-preserve-percentage');
            this.valueDisplays.aiPreservePercentage.textContent = aiSlider.value;
        }
    }
}