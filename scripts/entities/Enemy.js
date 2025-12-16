import * as THREE from 'three';
import { getPrimeFactorCount, isForbiddenTarget } from '../mathUtils.js';

export class Enemy {
  constructor(value, options = {}) {
    this.id = Math.random().toString(36);
    this.value = value;
    this.speed = options.speed || 0.16;
    this.isBouncing = options.isBouncing || false;
    this.bounceOffset = options.bounceOffset || Math.random() * Math.PI * 2;
    this.bounceHeight = options.bounceHeight || 4;

    // Calculate properties based on value
    this.factorCount = getPrimeFactorCount(value);
    this.isForbidden = isForbiddenTarget(value);
    this.maxHp = this.factorCount;
    this.hp = this.isForbidden ? 1 : this.factorCount;

    this.mesh = this.createMesh();
    this.isAlive = true;
  }

  createMesh() {
    const group = new THREE.Group();

    // Body
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshLambertMaterial({
      color: 0x444444,
      emissive: 0x111111
    });

    const box = new THREE.Mesh(geometry, material);
    box.position.y = 1;
    box.castShadow = true;
    box.name = 'body';
    group.add(box);

    // Label
    const label = this.createLabel();
    group.add(label);

    return group;
  }

  createLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#222222';
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 120px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.value.toString(), 128, 128);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, 256, 256);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(1.8, 1.8);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const label = new THREE.Mesh(geometry, material);
    label.position.set(0, 1, 1.01);

    return label;
  }

  update(deltaTime) {
    // Move forward
    this.mesh.position.z += this.speed * deltaTime;

    // Bouncing motion
    if (this.isBouncing) {
      const time = Date.now() * 0.005;
      const y = Math.abs(Math.sin(time + this.bounceOffset)) * this.bounceHeight;
      this.mesh.position.y = y;
    }

    this.mesh.updateMatrixWorld();
  }

  takeDamage() {
    this.hp--;

    if (this.hp <= 0) {
      this.isAlive = false;
      return true; // Destroyed
    }

    this.applyDamageVisuals();
    return false;
  }

  applyDamageVisuals() {
    const body = this.mesh.children.find(c => c.name === 'body');
    if (!body) return;

    // Flash white
    body.material.color.setHex(0xffffff);

    setTimeout(() => {
      if (this.hp === 1) {
        // Critical state - red glow
        body.material.color.setHex(0xff0000);
        body.material.emissive.setHex(0xff4400);
        body.material.emissiveIntensity = 2.0;
      } else {
        // Revert to standard grey
        body.material.color.setHex(0x444444);
        body.material.emissive.setHex(0x111111);
        body.material.emissiveIntensity = 1.0;
      }
    }, 100);
  }

  get position() {
    return this.mesh.position;
  }

  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
  }

  getBoundingBox() {
    return new THREE.Box3().setFromObject(this.mesh);
  }

  getScore() {
    return this.maxHp * 10;
  }

  isOutOfBounds(maxZ = 20) {
    return this.mesh.position.z > maxZ;
  }
}
