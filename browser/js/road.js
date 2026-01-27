import { Utils } from './utils.js';
import { GameConfig } from './config.js';

export class Road {
    constructor(scene) {
        this.scene = scene;
        this.dashLines = [];
        this.lightPosts = [];
        this.dashSpacing = 8;
        this.postSpacing = 40;
        this.createRoad();
        this.createEnvironment();
    }

    createRoad() {
        const roadGeometry = new THREE.PlaneGeometry(15, 1000);
        const roadMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a2e, side: THREE.DoubleSide });
        const road = new THREE.Mesh(roadGeometry, roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.position.z = 300;
        this.scene.add(road);

        const lineGeometry = new THREE.PlaneGeometry(0.15, 1000);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x444466 });
        [-6, 6].forEach(x => {
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.rotation.x = -Math.PI / 2;
            line.position.set(x, 0.01, 300);
            this.scene.add(line);
        });

        const dashMaterial = new THREE.MeshBasicMaterial({ color: GameConfig.VISUALS.CYAN });
        for (let z = -50; z < 600; z += this.dashSpacing) {
            [-2, 2].forEach(x => {
                const dashGeometry = new THREE.PlaneGeometry(0.1, 4);
                const dash = new THREE.Mesh(dashGeometry, dashMaterial);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(x, 0.02, z);
                this.scene.add(dash);
                this.dashLines.push(dash);
            });
        }

        const barrierGeometry = new THREE.BoxGeometry(0.3, 0.5, 1000);
        const barrierMaterial = new THREE.MeshPhongMaterial({ color: 0x333355 });
        [-7.5, 7.5].forEach(x => {
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            barrier.position.set(x, 0.25, 300);
            this.scene.add(barrier);
        });

        for (let z = -20; z < 500; z += this.postSpacing) {
            this.createLightPost(-9, z);
            this.createLightPost(9, z);
        }
    }

    createLightPost(x, z) {
        const postGroup = new THREE.Group();

        const poleGeometry = new THREE.CylinderGeometry(0.1, 0.15, 6, 8);
        const poleMaterial = new THREE.MeshPhongMaterial({ color: 0x334455 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 3;
        postGroup.add(pole);

        const lightGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const lightMaterial = new THREE.MeshBasicMaterial({ color: GameConfig.VISUALS.MAGENTA });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.y = 6.2;
        postGroup.add(light);

        const pointLight = new THREE.PointLight(GameConfig.VISUALS.MAGENTA, 0.5, 15);
        pointLight.position.y = 6;
        postGroup.add(pointLight);

        postGroup.position.set(x, 0, z);
        this.scene.add(postGroup);
        this.lightPosts.push(postGroup);
    }

    createEnvironment() {
        const groundGeometry = new THREE.PlaneGeometry(500, 1000);
        const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x0a0a1a, side: THREE.DoubleSide });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.position.z = 300;
        this.scene.add(ground);

        this.createSkyline(-80, 150);
        this.createSkyline(80, 150);

        const starGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(3000);
        for (let i = 0; i < 3000; i += 3) {
            positions[i] = (Math.random() - 0.5) * 400;
            positions[i + 1] = Math.random() * 100 + 20;
            positions[i + 2] = Math.random() * 400;
        }
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8 });
        this.scene.add(new THREE.Points(starGeometry, starMaterial));
    }

    createSkyline(offsetX, offsetZ) {
        const colors = [0x1a1a3e, 0x2a2a4e, 0x0a0a2e];
        for (let i = 0; i < 20; i++) {
            const width = Utils.randomRange(5, 15);
            const height = Utils.randomRange(10, 50);
            const depth = Utils.randomRange(5, 15);

            const geometry = new THREE.BoxGeometry(width, height, depth);
            const material = new THREE.MeshPhongMaterial({ color: colors[Utils.randomInt(0, 2)] });
            const building = new THREE.Mesh(geometry, material);
            building.position.set(offsetX + Utils.randomRange(-30, 30), height / 2, offsetZ + i * 20);
            this.scene.add(building);
        }
    }

    update(speed) {
        const scrollAmount = speed * 60;

        this.dashLines.forEach(dash => {
            dash.position.z -= scrollAmount;
            if (dash.position.z < -50) dash.position.z += 650;
        });

        this.lightPosts.forEach(post => {
            post.position.z -= scrollAmount;
            if (post.position.z < -30) post.position.z += 520;
        });
    }
}