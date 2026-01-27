export class RLAgent {
    constructor() {
        this.session = null;
        this.isModelLoaded = false;
        this.inputName = 'obs';
        this.outputName = 'action';
    }

    async loadModel(modelPath = 'models/policy.onnx') {
        const statusEl = document.getElementById('model-status');
        const loadingOverlay = document.getElementById('loading-overlay');

        try {
            statusEl.textContent = 'Loading AI Model...';
            statusEl.className = 'model-status loading';

            console.log('🔄 Loading ONNX model from:', modelPath);

            this.session = await ort.InferenceSession.create(modelPath, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all'
            });

            const inputNames = this.session.inputNames;
            const outputNames = this.session.outputNames;

            console.log('📥 Model inputs:', inputNames);
            console.log('📤 Model outputs:', outputNames);

            this.inputName = inputNames[0] || 'obs';
            this.outputName = outputNames[0] || 'action';

            const testInput = new Float32Array(10).fill(0.5);
            const testTensor = new ort.Tensor('float32', testInput, [1, 10]);
            const testResult = await this.session.run({ [this.inputName]: testTensor });

            console.log('✅ Test inference result:', testResult);
            console.log('✅ Test action:', testResult[this.outputName].data);

            this.isModelLoaded = true;

            statusEl.textContent = 'AI Model Ready (ONNX)';
            statusEl.className = 'model-status ready';

            loadingOverlay.classList.add('hidden');

            return true;
        } catch (error) {
            console.error('❌ Failed to load ONNX model:', error);
            statusEl.textContent = 'Model Load Failed! Check console.';
            statusEl.className = 'model-status error';

            loadingOverlay.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                    <div class="loading-text" style="color: #ff0066; margin-bottom: 15px;">ONNX Model Load Failed</div>
                    <div style="color: #888; font-size: 14px; max-width: 400px; margin-bottom: 20px;">
                        ${error.message}
                    </div>
                    <div style="color: #00f0ff; font-size: 12px;">
                        Run: <code style="background: rgba(0,240,255,0.2); padding: 5px 10px; border-radius: 4px;">
                        cd training && python quick_train.py --timesteps 100000</code>
                    </div>
                </div>
            `;

            return false;
        }
    }

    async predict(stateVector) {
        if (!this.isModelLoaded || !this.session) {
            console.warn('⚠️ Model not loaded, returning STAY action');
            return { action: 1, probabilities: [0.33, 0.34, 0.33] };
        }

        try {
            const inputTensor = new ort.Tensor('float32', new Float32Array(stateVector), [1, 10]);

            const feeds = { [this.inputName]: inputTensor };
            const results = await this.session.run(feeds);

            const outputTensor = results[this.outputName];
            const actionValue = outputTensor.data[0];

            const action = typeof actionValue === 'bigint' ? Number(actionValue) : Math.round(actionValue);

            const validAction = Math.max(0, Math.min(2, action));

            const probs = [0.1, 0.1, 0.1];
            probs[validAction] = 0.8;

            return {
                action: validAction,
                probabilities: probs
            };
        } catch (error) {
            console.error('❌ Inference error:', error);
            return { action: 1, probabilities: [0.33, 0.34, 0.33] };
        }
    }

    reset() {}
}