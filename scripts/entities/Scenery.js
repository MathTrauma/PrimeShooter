import * as THREE from 'three';

// Base class for scenery objects
export class Scenery {
  constructor() {
    this.mesh = null;
    this.isAlive = true;
  }

  update(speed, deltaTime) {
    if (this.mesh) {
      this.mesh.position.z += speed * deltaTime;
    }
  }

  get position() {
    return this.mesh?.position;
  }

  setPosition(x, y, z) {
    if (this.mesh) {
      this.mesh.position.set(x, y, z);
    }
  }

  isOutOfBounds(maxZ = 20) {
    return this.mesh && this.mesh.position.z > maxZ;
  }

  destroy() {
    this.isAlive = false;
  }
}

// Tree scenery
export class Tree extends Scenery {
  constructor(options = {}) {
    super();
    this.trunkColor = options.trunkColor || 0x8B4513;
    this.leavesColor = options.leavesColor || 0x228B22;
    this.mesh = this.createMesh();
  }

  createMesh() {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.BoxGeometry(1, 4, 1);
    const trunkMat = new THREE.MeshLambertMaterial({ color: this.trunkColor });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2;
    group.add(trunk);

    // Leaves
    const leavesGeo = new THREE.BoxGeometry(3, 3, 3);
    const leavesMat = new THREE.MeshLambertMaterial({ color: this.leavesColor });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 5;
    group.add(leaves);

    return group;
  }
}

// Building scenery
export class Building extends Scenery {
  constructor(options = {}) {
    super();
    this.color = options.color || 0x555555;
    this.minHeight = options.minHeight || 10;
    this.maxHeight = options.maxHeight || 25;
    this.width = options.width || 6;
    this.depth = options.depth || 6;
    this.mesh = this.createMesh();
  }

  createMesh() {
    const height = this.minHeight + Math.random() * (this.maxHeight - this.minHeight);
    const geometry = new THREE.BoxGeometry(this.width, height, this.depth);
    const material = new THREE.MeshLambertMaterial({ color: this.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = height / 2;
    return mesh;
  }
}

// Factory for creating scenery objects
export class SceneryFactory {
  static createTree(options = {}) {
    return new Tree(options);
  }

  static createBuilding(options = {}) {
    return new Building(options);
  }

  static createRandom(type, options = {}) {
    switch (type) {
      case 'tree':
        return this.createTree(options);
      case 'building':
        return this.createBuilding(options);
      default:
        return this.createTree(options);
    }
  }
}
