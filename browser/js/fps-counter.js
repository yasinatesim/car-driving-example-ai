export class FPSCounter {
    constructor() {
        this.frames = 0;
        this.lastTime = performance.now();
        this.fps = 60;
    }

    update() {
        this.frames++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            this.fps = Math.round(this.frames * 1000 / (now - this.lastTime));
            this.frames = 0;
            this.lastTime = now;
        }
        return this.fps;
    }
}