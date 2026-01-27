import { GameConfig } from './config.js';
import { eventBus } from './event-bus.js';
import { StorageService } from './storage.js';
import { FPSCounter } from './fps-counter.js';
import { FuzzyController } from './fuzzy-controller.js';
import { RLAgent } from './rl-agent.js';
import { StateBuilder } from './state-builder.js';
import { ActionLogger } from './action-logger.js';
import { UIManager } from './ui-manager.js';
import { Car } from './car.js';
import { Road } from './road.js';
import { ObstaclePool } from './obstacle-pool.js';

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.car = null;
        this.road = null;
        this.obstaclePool = null;

        this.fuzzyController = new FuzzyController();
        this.agent = new RLAgent();
        this.stateBuilder = new StateBuilder();
        this.actionLogger = new ActionLogger();
        this.uiManager = new UIManager();
        this.fpsCounter = new FPSCounter();

        this.score = 0;
        this.distance = 0;
        this.episode = 1;
        this.highScore = StorageService.get('highScore', 0);
        this.isPaused = false;
        this.isGameOver = false;
        this.laneChangeCooldown = 0;
        this.lastActionTime = 0;
        this.lastAction = 1;

        this.init();
    }

    async init() {
        this.setupScene();
        this.setupLights();
        this.createGameObjects();
        this.setupEventListeners();
        this.setupEventBus();

        const modelLoaded = await this.agent.loadModel();

        if (!modelLoaded) {
            console.error('❌ Cannot start game without ONNX model');
            return;
        }

        console.log('🚀 Starting game with ONNX model');
        this.uiManager.updateStats(60, this.highScore, 0, 1);
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(GameConfig.VISUALS.BACKGROUND_COLOR);
        this.scene.fog = new THREE.Fog(GameConfig.VISUALS.BACKGROUND_COLOR, GameConfig.VISUALS.FOG_NEAR, GameConfig.VISUALS.FOG_FAR);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 8, -12);
        this.camera.lookAt(0, 0, 20);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupLights() {
        this.scene.add(new THREE.AmbientLight(0x222244, 0.5));

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
        dirLight.position.set(0, 50, 50);
        this.scene.add(dirLight);

        const cyanLight = new THREE.PointLight(GameConfig.VISUALS.CYAN, 1, 50);
        cyanLight.position.set(-10, 10, 0);
        this.scene.add(cyanLight);

        const magentaLight = new THREE.PointLight(GameConfig.VISUALS.MAGENTA, 1, 50);
        magentaLight.position.set(10, 10, 0);
        this.scene.add(magentaLight);
    }

    createGameObjects() {
        this.road = new Road(this.scene);
        this.car = new Car(this.scene);
        this.obstaclePool = new ObstaclePool(this.scene);
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            switch (e.key.toLowerCase()) {
                case 'r':
                    if (this.isGameOver) this.restart();
                    break;
                case ' ':
                    if (!this.isGameOver) this.togglePause();
                    e.preventDefault();
                    break;
            }
        });

        this.uiManager.onRestart(() => this.restart());
    }

    setupEventBus() {
        eventBus.on('obstacleAvoided', (count) => {
            this.uiManager.updateStats(
                this.fpsCounter.fps,
                this.highScore,
                count,
                this.car.currentLane
            );
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.uiManager.togglePause(this.isPaused);
    }

    gameOver() {
        this.isGameOver = true;

        const finalScore = Math.floor(this.score);
        const isNewRecord = finalScore > this.highScore;

        if (isNewRecord) {
            this.highScore = finalScore;
            StorageService.set('highScore', this.highScore);
        }

        this.uiManager.showGameOver(
            finalScore,
            this.distance,
            this.obstaclePool.avoidedCount,
            this.highScore,
            isNewRecord
        );
    }

    restart() {
        this.isGameOver = false;
        this.uiManager.hideGameOver();

        this.car.reset();
        this.obstaclePool.reset();
        this.agent.reset();
        this.actionLogger.reset();

        this.score = 0;
        this.distance = 0;
        this.episode++;
        this.laneChangeCooldown = 0;
        this.lastAction = 1;

        this.uiManager.updateHUD(0, 0, this.episode);
        this.uiManager.updateStats(60, this.highScore, 0, 1);
        this.uiManager.updateActionHistory([]);
    }

    async processAI() {
        const now = Date.now();
        if (now - this.lastActionTime < GameConfig.AI.ACTION_INTERVAL) return;
        this.lastActionTime = now;

        const obstacles = this.obstaclePool.getObstacleData();
        const fuzzyResult = this.fuzzyController.assess(obstacles, this.car.speed);
        const state = this.stateBuilder.build(this.car, obstacles, fuzzyResult, this.laneChangeCooldown, this.car.speed);
        const prediction = await this.agent.predict(state);

        if (prediction.action !== this.lastAction) {
            this.lastAction = prediction.action;
            const entry = this.actionLogger.log(prediction.action);
            this.uiManager.updateCurrentAction(entry.name);
            this.uiManager.updateActionHistory(this.actionLogger.getHistory());
        }

        if (this.laneChangeCooldown <= 0) {
            if (prediction.action === 0 && this.car.currentLane > 0) {
                if (this.car.changeLane(-1)) {
                    this.laneChangeCooldown = GameConfig.AI.LANE_CHANGE_COOLDOWN;
                }
            } else if (prediction.action === 2 && this.car.currentLane < 2) {
                if (this.car.changeLane(1)) {
                    this.laneChangeCooldown = GameConfig.AI.LANE_CHANGE_COOLDOWN;
                }
            }
        }
    }

    update(delta) {
        if (this.isPaused || this.isGameOver) return;

        if (this.laneChangeCooldown > 0) this.laneChangeCooldown--;

        this.car.update(delta);
        this.road.update(this.car.speed * delta);
        this.obstaclePool.update(this.car.speed);

        this.distance += this.car.speed * 60 * delta;
        this.score += delta * 10;

        const carBox = this.car.getBoundingBox();
        if (this.obstaclePool.checkCollision(carBox)) {
            this.gameOver();
            return;
        }

        this.processAI();

        const fps = this.fpsCounter.update();
        this.uiManager.updateHUD(this.score, this.distance, this.episode);
        this.uiManager.updateStats(fps, this.highScore, this.obstaclePool.avoidedCount, this.car.currentLane);

        this.camera.position.x = this.car.mesh.position.x * 0.3;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update(1 / 60);
        this.renderer.render(this.scene, this.camera);
    }
}