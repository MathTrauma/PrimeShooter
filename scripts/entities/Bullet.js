import * as THREE from 'three';

export class Bullet {
  constructor(position, options = {}) {
    this.id = Math.random().toString(36);
    this.speed = options.speed || 1.2;
    this.color = options.color || 0xffff00;

    this.velocity = new THREE.Vector3(0, 0, -this.speed);
    this.mesh = this.createMesh();

    // Set initial position
    this.mesh.position.copy(position);
    this.mesh.position.y += 1.0;
    this.mesh.position.z -= 1.5;

    this.isAlive = true;
  }

  createMesh() {
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.8);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    return new THREE.Mesh(geometry, material);
  }

  update(deltaTime) {
    this.mesh.position.addScaledVector(this.velocity, deltaTime);
  }

  get position() {
    return this.mesh.position;
  }

  getBoundingBox(deltaTime = 1) {
    const box = new THREE.Box3().setFromObject(this.mesh);
    // Extend bounding box in direction of travel to prevent tunneling
    box.max.z += this.speed * deltaTime;
    return box;
  }

  isOutOfBounds(minZ = -100) {
    return this.mesh.position.z < minZ;
  }

  destroy() {
    this.isAlive = false;
  }
}
