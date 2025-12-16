import * as THREE from 'three';

export class Particle {
  constructor(position, options = {}) {
    this.color = options.color || 0xffff00;
    this.size = options.size || 0.4;
    this.velocityRange = options.velocityRange || 0.8;
    this.shrinkRate = options.shrinkRate || 0.9;
    this.rotationSpeed = options.rotationSpeed || 0.2;
    this.minScale = options.minScale || 0.05;

    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * this.velocityRange,
      (Math.random() - 0.5) * this.velocityRange,
      (Math.random() - 0.5) * this.velocityRange
    );

    this.mesh = this.createMesh();
    this.mesh.position.copy(position);
    this.isAlive = true;
  }

  createMesh() {
    const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    return new THREE.Mesh(geometry, material);
  }

  update(deltaTime) {
    this.mesh.position.addScaledVector(this.velocity, deltaTime);
    this.mesh.rotation.x += this.rotationSpeed * deltaTime;
    this.mesh.rotation.y += this.rotationSpeed * deltaTime;
    this.mesh.scale.multiplyScalar(Math.pow(this.shrinkRate, deltaTime));

    if (this.mesh.scale.x < this.minScale) {
      this.isAlive = false;
    }
  }

  get position() {
    return this.mesh.position;
  }
}

// Particle system for managing multiple particles
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  createExplosion(position, options = {}) {
    const count = options.count || 10;
    const color = options.color || 0xffff00;

    for (let i = 0; i < count; i++) {
      const particle = new Particle(position, { color, ...options });
      this.scene.add(particle.mesh);
      this.particles.push(particle);
    }
  }

  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(deltaTime);

      if (!particle.isAlive) {
        this.scene.remove(particle.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  clear() {
    for (const particle of this.particles) {
      this.scene.remove(particle.mesh);
    }
    this.particles = [];
  }

  get count() {
    return this.particles.length;
  }
}
