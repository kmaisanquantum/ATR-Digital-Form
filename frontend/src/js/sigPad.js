export class SigPad {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.drawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.resize();
    this.bind();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const isW = rect.width || 800; // Fallback to 800 if rect not fully initialized
    const isH = 100;

    // Save image before resize
    let tempImage = null;
    try {
      tempImage = this.canvas.toDataURL();
    } catch (e) {}

    this.canvas.width = isW * dpr;
    this.canvas.height = isH * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = isW + 'px';
    this.canvas.style.height = isH + 'px';
    this.ctx.strokeStyle = '#c9a84c';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Restore signature
    if (tempImage && tempImage !== 'data:,') {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, isW, isH);
      };
      img.src = tempImage;
    }
  }

  getXY(e) {
    const rect = this.canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return [(t.clientX - rect.left), (t.clientY - rect.top)];
  }

  bind() {
    if (!this.canvas) return;
    const start = (e) => {
      e.preventDefault();
      this.drawing = true;
      [this.lastX, this.lastY] = this.getXY(e);
    };
    const move = (e) => {
      if (!this.drawing) return;
      e.preventDefault();
      const [x, y] = this.getXY(e);
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      [this.lastX, this.lastY] = [x, y];
    };
    const end = () => { this.drawing = false; };

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', move);
    this.canvas.addEventListener('mouseup', end);
    this.canvas.addEventListener('mouseleave', end);
    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove', move, { passive: false });
    this.canvas.addEventListener('touchend', end);
  }

  clear() {
    if (!this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  toDataURL() {
    return this.canvas ? this.canvas.toDataURL() : '';
  }

  isEmpty() {
    if (!this.canvas) return true;
    const buffer = new Uint32Array(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data.buffer);
    return !buffer.some(color => color !== 0);
  }
}
