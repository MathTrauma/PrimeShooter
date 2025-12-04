import * as THREE from 'three';
import { isForbiddenTarget, generateTargetNumber } from './mathUtils.js';

export class GameEngine {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    
    this.animationId = 0;
    this.score = 0;
    this.isRunning = false;
    
    // Input State
    this.keys = { w: false, a: false, s: false, d: false };
    this.lastShotTime = 0;

    // Constants
    this.PLAYER_SPEED = 0.4;
    this.BOUNDS_X = 18;
    this.BOUNDS_Z_MIN = -5;
    this.BOUNDS_Z_MAX = 10;
    this.BULLET_SPEED = 1.0;
    this.SPAWN_RATE = 1000; // ms
    this.lastSpawnTime = 0;

    // Init ThreeJS
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);
    this.scene.fog = new THREE.Fog(0x111111, 20, 100);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200);
    this.camera.position.set(0, 15, 25);
    this.camera.lookAt(0, 0, -10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Floor (Grid)
    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    // Player
    this.player = this.createPlayerVoxel();
    this.scene.add(this.player);

    // Input Listeners - bind this context
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
    this.boundHandleResize = this.handleResize.bind(this);
    this.boundAnimate = this.animate.bind(this);

    window.addEventListener('keydown', this.boundHandleKeyDown);
    window.addEventListener('keyup', this.boundHandleKeyUp);
    window.addEventListener('resize', this.boundHandleResize);
  }

  createPlayerVoxel() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x00ffff });
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Simple Ship Shape
    const positions = [
      [0, 0, 0], [-1, 0, 1], [1, 0, 1], [0, 1, 0], [0, 0, -1] 
    ];

    positions.forEach(pos => {
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(pos[0], pos[1] + 0.5, pos[2]);
      mesh.castShadow = true;
      group.add(mesh);
    });

    group.position.set(0, 0, 8);
    return group;
  }

  handleKeyDown(e) {
    switch(e.key.toLowerCase()) {
      case 'w': this.keys.w = true; break;
      case 'a': this.keys.a = true; break;
      case 's': this.keys.s = true; break;
      case 'd': this.keys.d = true; break;
      case ' ': this.shoot(); break;
    }
  }

  handleKeyUp(e) {
    switch(e.key.toLowerCase()) {
      case 'w': this.keys.w = false; break;
      case 'a': this.keys.a = false; break;
      case 's': this.keys.s = false; break;
      case 'd': this.keys.d = false; break;
    }
  }

  handleResize() {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  startGame() {
    this.score = 0;
    this.isRunning = true;
    this.player.position.set(0, 0, 8);
    
    // Clear entities
    this.enemies.forEach(e => this.scene.remove(e.mesh));
    this.enemies = [];
    this.bullets.forEach(b => this.scene.remove(b.mesh));
    this.bullets = [];

    this.callbacks.onScoreUpdate(0);
    this.animate();
  }

  stopGame() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationId);
  }

  shoot() {
    if (!this.isRunning) return;
    const now = Date.now();
    if (now - this.lastShotTime < 200) return; // Fire rate limit

    this.lastShotTime = now;

    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.copy(this.player.position);
    mesh.position.y += 0.5;
    mesh.position.z -= 1.5;

    this.scene.add(mesh);
    this.bullets.push({
      id: Math.random().toString(36),
      mesh,
      velocity: new THREE.Vector3(0, 0, -this.BULLET_SPEED)
    });
  }

  createEnemy(value) {
    const group = new THREE.Group();
    
    // Determine color based on number (Subtle hint or random?)
    // Let's make them all look similar so user has to read the number
    const color = 0xff0044;
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshLambertMaterial({ color });
    const box = new THREE.Mesh(geometry, material);
    box.position.y = 1;
    box.castShadow = true;
    group.add(box);

    // Create Text Texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 120px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toString(), 128, 128);
      
      // Border
      ctx.strokeStyle = isForbiddenTarget(value) ? '#ff0000' : '#00ff00';
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, 256, 256);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const planeGeo = new THREE.PlaneGeometry(1.8, 1.8);
    const planeMat = new THREE.MeshBasicMaterial({ map: texture });
    const label = new THREE.Mesh(planeGeo, planeMat);
    label.position.set(0, 1, 1.01); // Front face
    group.add(label);

    return group;
  }

  spawnEnemy() {
    const now = Date.now();
    if (now - this.lastSpawnTime > this.SPAWN_RATE) {
      const val = generateTargetNumber();
      const enemyGroup = this.createEnemy(val);
      
      // Random X position within bounds
      const xPos = (Math.random() - 0.5) * (this.BOUNDS_X * 1.8); 
      enemyGroup.position.set(xPos, 0, -60); // Spawn far away

      this.scene.add(enemyGroup);
      this.enemies.push({
        id: Math.random().toString(),
        mesh: enemyGroup,
        value: val,
        isForbidden: isForbiddenTarget(val),
        speed: 0.2 + (this.score * 0.01) // Gets harder
      });
      this.lastSpawnTime = now;
    }
  }

  updatePlayer() {
    if (this.keys.w && this.player.position.z > this.BOUNDS_Z_MIN) this.player.position.z -= this.PLAYER_SPEED;
    if (this.keys.s && this.player.position.z < this.BOUNDS_Z_MAX) this.player.position.z += this.PLAYER_SPEED;
    if (this.keys.a && this.player.position.x > -this.BOUNDS_X) this.player.position.x -= this.PLAYER_SPEED;
    if (this.keys.d && this.player.position.x < this.BOUNDS_X) this.player.position.x += this.PLAYER_SPEED;

    // Tilt effect
    this.player.rotation.z = THREE.MathUtils.lerp(this.player.rotation.z, (Number(this.keys.a) - Number(this.keys.d)) * 0.3, 0.1);
  }

  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.mesh.position.add(b.velocity);
      
      if (b.mesh.position.z < -100) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
      }
    }
  }

  updateEnemies() {
    const playerBox = new THREE.Box3().setFromObject(this.player);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.mesh.position.z += e.speed;

      // Pass player check (Despawn behind player)
      if (e.mesh.position.z > 20) {
        this.scene.remove(e.mesh);
        this.enemies.splice(i, 1);
        continue;
      }

      const enemyBox = new THREE.Box3().setFromObject(e.mesh);

      // Check Collision with Player
      if (playerBox.intersectsBox(enemyBox)) {
        this.stopGame();
        this.callbacks.onGameOver(`Crashed into ${e.value}!`);
        return;
      }

      // Check Collision with Bullets
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        const bulletBox = new THREE.Box3().setFromObject(b.mesh);

        if (bulletBox.intersectsBox(enemyBox)) {
          // HIT!
          
          // Remove bullet
          this.scene.remove(b.mesh);
          this.bullets.splice(j, 1);

          // Logic
          if (e.isForbidden) {
            // Hit a Prime or Prime*2 -> GAME OVER
            this.stopGame();
            this.callbacks.onGameOver(`You shot ${e.value}! (Forbidden: Prime or 2*Prime)`);
          } else {
            // Good hit -> Score up, remove enemy
            this.createExplosion(e.mesh.position);
            this.scene.remove(e.mesh);
            this.enemies.splice(i, 1);
            this.score += 10;
            this.callbacks.onScoreUpdate(this.score);
          }
          break; // Bullet hit something, stop checking other enemies for this bullet
        }
      }
    }
  }

  createExplosion(pos) {
    const particleCount = 8;
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);
      
      // Random velocity
      mesh.userData = {
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        )
      };
      
      this.scene.add(mesh);
      this.particles.push(mesh);
    }
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.position.add(p.userData.vel);
      p.rotation.x += 0.1;
      p.rotation.y += 0.1;
      p.scale.multiplyScalar(0.9); // Shrink

      if (p.scale.x < 0.01) {
        this.scene.remove(p);
        this.particles.splice(i, 1);
      }
    }
  }

  animate() {
    if (!this.isRunning) return;

    this.updatePlayer();
    this.spawnEnemy();
    this.updateBullets();
    this.updateEnemies();
    this.updateParticles();

    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.boundAnimate);
  }

  cleanup() {
    this.stopGame();
    window.removeEventListener('keydown', this.boundHandleKeyDown);
    window.removeEventListener('keyup', this.boundHandleKeyUp);
    window.removeEventListener('resize', this.boundHandleResize);
    
    // Dispose helper (simplified)
    this.scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(m => m.dispose());
            } else {
                object.material.dispose();
            }
        }
    });
    
    if (this.container && this.renderer.domElement) {
        this.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
