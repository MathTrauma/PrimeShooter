import * as THREE from 'three';

export class Player {
  constructor(options = {}) {
    this.speed = options.speed || 0.4;
    this.boundsX = options.boundsX || 10;
    this.boundsZMin = options.boundsZMin || -5;
    this.boundsZMax = options.boundsZMax || 10;
    this.initialPosition = options.initialPosition || new THREE.Vector3(0, 0, 8);

    this.mesh = this.createMesh();
    this.mesh.position.copy(this.initialPosition);

    // Input state
    this.keys = { w: false, a: false, s: false, d: false };
  }

  createMesh() {
    const group = new THREE.Group();
    const material = new THREE.MeshLambertMaterial({ color: 0x00ffff });
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    const positions = [
      [0, 0, 0],
      [-1, 0, 1],
      [1, 0, 1],
      [0, 1, 0],
      [0, 0, -1]
    ];

    positions.forEach(pos => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos[0], pos[1] + 0.5, pos[2]);
      mesh.castShadow = true;
      group.add(mesh);
    });

    return group;
  }

  setControlState(key, isPressed) {
    if (key in this.keys) {
      this.keys[key] = isPressed;
    }
  }

  update(deltaTime) {
    const moveSpeed = this.speed * deltaTime;

    if (this.keys.w && this.mesh.position.z > this.boundsZMin) {
      this.mesh.position.z -= moveSpeed;
    }
    if (this.keys.s && this.mesh.position.z < this.boundsZMax) {
      this.mesh.position.z += moveSpeed;
    }
    if (this.keys.a && this.mesh.position.x > -this.boundsX) {
      this.mesh.position.x -= moveSpeed;
    }
    if (this.keys.d && this.mesh.position.x < this.boundsX) {
      this.mesh.position.x += moveSpeed;
    }

    // Tilt effect
    const lerpFactor = 1 - Math.pow(0.9, deltaTime);
    const targetRotation = (Number(this.keys.a) - Number(this.keys.d)) * 0.3;
    this.mesh.rotation.z = THREE.MathUtils.lerp(
      this.mesh.rotation.z,
      targetRotation,
      lerpFactor
    );
  }

  reset() {
    this.mesh.position.copy(this.initialPosition);
    this.mesh.rotation.set(0, 0, 0);
    this.keys = { w: false, a: false, s: false, d: false };
  }

  get position() {
    return this.mesh.position;
  }

  getBoundingBox() {
    return new THREE.Box3().setFromObject(this.mesh);
  }
}
