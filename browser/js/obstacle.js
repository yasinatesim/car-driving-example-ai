import { Utils } from './utils.js';
import { GameConfig } from './config.js';

export class Obstacle {
    constructor(scene, type, laneIndex, zPosition) {
        this.scene = scene;
        this.type = type;
        this.laneIndex = laneIndex;
        this.active = true;
        this.speed = Utils.randomRange(0.1, 0.3);
        this.mesh = null;

        const props = GameConfig.OBSTACLES.PROPERTIES[type];
        this.width = props.width;
        this.length = props.length;
        this.riskLevel = props.risk;
        this.colorTag = type === 'car' ? (Math.random() > 0.5 ? 'red' : 'blue') : type;

        this.createMesh(zPosition);
    }

    createMesh(zPosition) {
        const group = new THREE.Group();

        if (this.type === 'car') {
            const color = this.colorTag === 'red' ? 0xff3344 : 0x3344ff;
            const bodyGeometry = new THREE.BoxGeometry(1.8, 0.7, 3.5);
            const bodyMaterial = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.2 });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 0.45;
            group.add(body);

            const cabinGeometry = new THREE.BoxGeometry(1.4, 0.5, 1.8);
            const cabinMaterial = new THREE.MeshPhongMaterial({ color: 0x111122, transparent: true, opacity: 0.7 });
            const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
            cabin.position.y = 1;
            cabin.position.z = -0.2;
            group.add(cabin);
        } else if (this.type === 'truck') {
            const bodyGeometry = new THREE.BoxGeometry(2.2, 1.5, 5);
            const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xffaa00, emissive: 0x553300, emissiveIntensity: 0.3 });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 0.9;
            group.add(body);

            const cabGeometry = new THREE.BoxGeometry(2.2, 1.2, 1.5);
            const cab = new THREE.Mesh(cabGeometry, bodyMaterial);
            cab.position.set(0, 0.7, 3);
            group.add(cab);
        } else if (this.type === 'barrier') {
            const barrierGeometry = new THREE.BoxGeometry(2.5, 1, 1);
            const barrierMaterial = new THREE.MeshPhongMaterial({ color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 0.5 });
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrier.position.y = 0.5;
            group.add(barrier);

            const stripeGeometry = new THREE.BoxGeometry(2.6, 0.3, 1.1);
            const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            stripe.position.y = 0.5;
            group.add(stripe);
        }

        group.position.set(GameConfig.LANES.POSITIONS[this.laneIndex], 0, zPosition);
        this.mesh = group;
        this.scene.add(group);
    }

    update(playerSpeed) {
        const relativeSpeed = playerSpeed * 60 - this.speed * 20;
        this.mesh.position.z -= relativeSpeed * 0.016;
    }

    getBoundingBox() {
        const w = this.width / 2;
        const d = this.length / 2;
        return {
            minX: this.mesh.position.x - w,
            maxX: this.mesh.position.x + w,
            minZ: this.mesh.position.z - d,
            maxZ: this.mesh.position.z + d
        };
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.active = false;
    }
}