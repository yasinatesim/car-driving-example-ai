import { Utils } from './utils.js';
import { GameConfig } from './config.js';

export class UIManager {
    constructor() {
        this.elements = {
            score: document.getElementById('score'),
            distance: document.getElementById('distance'),
            episode: document.getElementById('episode'),
            fps: document.getElementById('fps'),
            highScore: document.getElementById('high-score'),
            avoidedCount: document.getElementById('avoided-count'),
            currentLane: document.getElementById('current-lane'),
            currentAction: document.getElementById('current-action'),
            actionList: document.getElementById('action-list'),
            gameOverOverlay: document.getElementById('game-over-overlay'),
            finalScore: document.getElementById('final-score'),
            finalDistance: document.getElementById('final-distance'),
            finalAvoided: document.getElementById('final-avoided'),
            finalHighScore: document.getElementById('final-high-score'),
            pauseOverlay: document.getElementById('pause-overlay'),
            restartButton: document.getElementById('restart-button')
        };
    }

    updateHUD(score, distance, episode) {
        this.elements.score.textContent = Utils.formatNumber(score);
        this.elements.distance.textContent = `${Math.floor(distance)}m`;
        this.elements.episode.textContent = episode;
    }

    updateStats(fps, highScore, avoidedCount, currentLane) {
        this.elements.fps.textContent = fps;
        this.elements.highScore.textContent = Utils.formatNumber(highScore);
        this.elements.avoidedCount.textContent = avoidedCount;
        this.elements.currentLane.textContent = GameConfig.LANES.NAMES[currentLane];
    }

    updateCurrentAction(actionName) {
        const el = this.elements.currentAction;
        el.textContent = actionName;
        el.className = 'current-action-value ' + actionName.toLowerCase();
    }

    updateActionHistory(history) {
        this.elements.actionList.innerHTML = history.slice(0, 15).map(entry => `
            <div class="action-item action-${entry.name.toLowerCase()}">
                <span class="action-icon">${entry.icon}</span>
                <span>${entry.name}</span>
                <span class="action-time">${entry.time}</span>
            </div>
        `).join('');
    }

    showGameOver(score, distance, avoided, highScore, isNewRecord) {
        this.elements.finalScore.textContent = Utils.formatNumber(score);
        this.elements.finalDistance.textContent = `${Math.floor(distance)}m`;
        this.elements.finalAvoided.textContent = avoided;
        this.elements.finalHighScore.textContent = Utils.formatNumber(highScore);

        if (isNewRecord) {
            this.elements.finalScore.classList.add('new-record');
            this.elements.finalScore.innerHTML = `${Utils.formatNumber(score)} <span class="new-record-badge">NEW RECORD!</span>`;
        } else {
            this.elements.finalScore.classList.remove('new-record');
        }

        this.elements.gameOverOverlay.classList.add('active');
    }

    hideGameOver() {
        this.elements.gameOverOverlay.classList.remove('active');
    }

    togglePause(isPaused) {
        this.elements.pauseOverlay.classList.toggle('active', isPaused);
    }

    onRestart(callback) {
        this.elements.restartButton.addEventListener('click', callback);
    }
}