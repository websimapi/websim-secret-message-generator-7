export class NoiseGenerator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
    }

    generate(scale = 1, type = 'color') {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        scale = Math.max(1, Math.floor(scale));
        const smallW = Math.ceil(w / scale);
        const smallH = Math.ceil(h / scale);

        if (this.tempCanvas.width !== smallW || this.tempCanvas.height !== smallH) {
            this.tempCanvas.width = smallW;
            this.tempCanvas.height = smallH;
        }

        const imgData = this.tempCtx.createImageData(smallW, smallH);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            let r, g, b;
            if (type === 'color') {
                r = Math.floor(Math.random() * 256);
                g = Math.floor(Math.random() * 256);
                b = Math.floor(Math.random() * 256);
            } else { // grayscale
                const val = Math.floor(Math.random() * 256);
                r = g = b = val;
            }
            data[i] = r;
            data[i+1] = g;
            data[i+2] = b;
            data[i+3] = 255;
        }

        this.tempCtx.putImageData(imgData, 0, 0);

        this.ctx.clearRect(0, 0, w, h);
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(this.tempCanvas, 0, 0, smallW, smallH, 0, 0, w, h);
    }
}

