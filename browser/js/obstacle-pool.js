import { Utils } from './utils.js';
import { GameConfig } from './config.js';
import { eventBus } from './event-bus.js';
import { Obstacle } from './obstacle.js';

export class ObstaclePool {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.nextSpawnZ = 60;
        this.totalDistance = 0;
        this.avoidedCount = 0;
    }

    update(playerSpeed) {
        const moveAmount = playerSpeed * 60 * 0.016;
        this.totalDistance += moveAmount;

        while (this.nextSpawnZ < this.totalDistance + GameConfig.OBSTACLES.SPAWN_DISTANCE) {
            const spawnZ = this.nextSpawnZ - this.totalDistance + 50;
            this.spawnObstacle(spawnZ);
            this.nextSpawnZ += GameConfig.OBSTACLES.MIN_SPAWN_GAP + Utils.randomRange(0, 20);
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.update(playerSpeed);

            if (obs.mesh.position.z < -30) {
                this.avoidedCount++;
                eventBus.emit('obstacleAvoided', this.avoidedCount);
                obs.destroy();
                this.obstacles.splice(i, 1);
            }
        }
    }

    spawnObstacle(z) {
        const types = GameConfig.OBSTACLES.TYPES;
        const type = types[Utils.randomInt(0, types.length - 1)];
        const lane = Utils.randomInt(0, 2);
        this.obstacles.push(new Obstacle(this.scene, type, lane, z));
    }

    getObstacleData() {
        return this.obstacles
            .map(obs => ({
                type: obs.type,
                colorTag: obs.colorTag,
                laneIndex: obs.laneIndex,
                distance: obs.mesh.position.z,
                riskLevel: obs.riskLevel,
                width: obs.width,
                relativeSpeed: obs.speed
            }))
            .filter(o => o.distance > -5 && o.distance < 100);
    }

    checkCollision(carBox) {
        for (const obs of this.obstacles) {
            const obsBox = obs.getBoundingBox();
            if (carBox.maxX > obsBox.minX && carBox.minX < obsBox.maxX &&
                carBox.maxZ > obsBox.minZ && carBox.minZ < obsBox.maxZ) {
                return true;
            }
        }
        return false;
    }

    reset() {
        this.obstacles.forEach(obs => obs.destroy());
        this.obstacles = [];
        this.nextSpawnZ = 60;
        this.totalDistance = 0;
        this.avoidedCount = 0;
    }
}