import { Utils } from './utils.js';
import { GameConfig } from './config.js';

export class Car {
    constructor(scene) {
        this.scene = scene;
        this.currentLane = 1;
        this.targetLane = 1;
        this.changingLane = false;
        this.laneChangeProgress = 0;
        this.speed = GameConfig.CAR.SPEED;
        this.mesh = null;
        this.wheels = [];
        this.createMesh();
    }

    createMesh() {
        const group = new THREE.Group();

        const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 4);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: GameConfig.VISUALS.CYAN,
            emissive: 0x003344,
            shininess: 100
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        group.add(body);

        const cabinGeometry = new THREE.BoxGeometry(1.6, 0.6, 2);
        const cabinMaterial = new THREE.MeshPhongMaterial({
            color: 0x001122,
            transparent: true,
            opacity: 0.8
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.y = 1.1;
        cabin.position.z = -0.3;
        group.add(cabin);

        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x111111 });
        const wheelPositions = [[-1, 0.3, 1.3], [1, 0.3, 1.3], [-1, 0.3, -1.3], [1, 0.3, -1.3]];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            group.add(wheel);
            this.wheels.push(wheel);
        });

        const glowGeometry = new THREE.PlaneGeometry(2.5, 4.5);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: GameConfig.VISUALS.CYAN,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.05;
        group.add(glow);

        const headlightGeometry = new THREE.CircleGeometry(0.15, 16);
        const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [[-0.6, 0.5, 2], [0.6, 0.5, 2]].forEach(pos => {
            const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            headlight.position.set(...pos);
            group.add(headlight);
        });

        this.mesh = group;
        this.scene.add(group);
    }

    changeLane(direction) {
        if (this.changingLane) return false;
        const newLane = this.currentLane + direction;
        if (newLane < 0 || newLane > 2) return false;

        this.targetLane = newLane;
        this.changingLane = true;
        this.laneChangeProgress = 0;
        return true;
    }

    update(delta) {
        if (this.changingLane) {
            this.laneChangeProgress += delta * 3;
            const startX = GameConfig.LANES.POSITIONS[this.currentLane];
            const endX = GameConfig.LANES.POSITIONS[this.targetLane];
            const t = Utils.clamp(this.laneChangeProgress, 0, 1);
            const smoothT = Utils.smoothStep(t);

            this.mesh.position.x = Utils.lerp(startX, endX, smoothT);

            if (this.laneChangeProgress >= 1) {
                this.currentLane = this.targetLane;
                this.changingLane = false;
                this.mesh.position.x = GameConfig.LANES.POSITIONS[this.currentLane];
            }
        }

        const wheelRotation = this.speed * 0.5;
        this.wheels.forEach(wheel => wheel.rotation.x += wheelRotation);

        this.mesh.position.y = Math.sin(Date.now() * 0.005) * 0.03;
    }

    getBoundingBox() {
        return {
            minX: this.mesh.position.x - 1,
            maxX: this.mesh.position.x + 1,
            minZ: -2,
            maxZ: 2
        };
    }

    reset() {
        this.currentLane = 1;
        this.targetLane = 1;
        this.changingLane = false;
        this.mesh.position.x = GameConfig.LANES.POSITIONS[1];
    }
}