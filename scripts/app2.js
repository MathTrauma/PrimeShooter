import * as THREE from 'three';
import { isPrime, isForbiddenTarget, generateTargetNumber, getPrimeFactorCount } from './mathUtils.js';

export class GameEngine {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.scenery = []; // For trees and buildings
    
    this.animationId = 0;
    this.score = 0;
    this.isRunning = false;
    this.gameStartTime = 0;
    
    // Input State
    this.keys = { w: false, a: false, s: false, d: false };
    this.lastShotTime = 0;

    // Constants & Config
    this.PLAYER_SPEED = 0.4;
    this.BOUNDS_X = 10; // Narrower playable area
    this.BOUNDS_Z_MIN = -5;
    this.BOUNDS_Z_MAX = 10;
    this.BULLET_SPEED = 1.2;
    
    // Difficulty Base Values
    this.BASE_ENEMY_SPEED = 0.2;
    this.BASE_SPAWN_RATE = 1200; // ms
    this.lastSpawnTime = 0;
    this.lastScenerySpawnTime = 0;

    // Init ThreeJS
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);
    
    // Adjusted Fog: Start later so spawn area (-70) is visible
    // Camera is at +25. Spawn at -70. Dist = 95.
    // Fog 60-150 ensures spawn is visible but fades into distance.
    this.scene.fog = new THREE.Fog(0x111111, 60, 150);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200);
    this.camera.position.set(0, 15, 25);
    this.camera.lookAt(0, 0, -10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Lights
    // Hemisphere light ensures objects are never fully black
    // Increased intensity to 1.0 for better visibility
    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444, 1.0 );
    hemiLight.position.set( 0, 20, 0 );
    this.scene.add( hemiLight );

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Floor (Grid)
    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x111111);
    this.scene.add(gridHelper);

    // Player
    this.player = this.createPlayerVoxel();
    this.scene.add(this.player);

    // Input Listeners
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

  // Method for external control (e.g. mobile buttons)
  setControlState(key, isPressed) {
    if (key in this.keys) {
      this.keys[key] = isPressed;
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
    this.gameStartTime = Date.now();
    this.player.position.set(0, 0, 8);
    
    // Clear entities
    this.enemies.forEach(e => this.scene.remove(e.mesh));
    this.enemies = [];
    this.bullets.forEach(b => this.scene.remove(b.mesh));
    this.bullets = [];
    this.scenery.forEach(s => this.scene.remove(s.mesh));
    this.scenery = [];
    this.particles.forEach(p => this.scene.remove(p));
    this.particles = [];

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
    if (now - this.lastShotTime < 150) return; // Fire rate

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

  // --- Environment & Scenery ---

  createTree() {
    const group = new THREE.Group();
    // Trunk
    const trunkGeo = new THREE.BoxGeometry(1, 4, 1);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2;
    group.add(trunk);

    // Leaves
    const leavesGeo = new THREE.BoxGeometry(3, 3, 3);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 5;
    group.add(leaves);

    return group;
  }

  createBuilding() {
    const height = 5 + Math.random() * 10;
    const geo = new THREE.BoxGeometry(4, height, 4);
    const mat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = height / 2;
    return mesh;
  }

  spawnScenery() {
    const now = Date.now();
    if (now - this.lastScenerySpawnTime > 400) { // Spawn scenery frequently
      const isTree = Math.random() > 0.3;
      const mesh = isTree ? this.createTree() : this.createBuilding();
      
      // Spawn on Left or Right
      const side = Math.random() > 0.5 ? 1 : -1;
      const xOffset = this.BOUNDS_X + 4 + Math.random() * 5; // Outside bounds
      
      mesh.position.set(side * xOffset, 0, -70);
      this.scene.add(mesh);
      this.scenery.push({ mesh });
      this.lastScenerySpawnTime = now;
    }
  }

  updateScenery(speed) {
    for (let i = this.scenery.length - 1; i >= 0; i--) {
      const s = this.scenery[i];
      s.mesh.position.z += speed;
      if (s.mesh.position.z > 20) {
        this.scene.remove(s.mesh);
        this.scenery.splice(i, 1);
      }
    }
  }

  // --- Enemies ---

  createEnemy(value) {
    const group = new THREE.Group();
    
    // HP determines robustness
    const factorCount = getPrimeFactorCount(value);
    
    // Base Box
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    
    // UPDATE: Made color lighter (0x666666) and added emissive for visibility
    const material = new THREE.MeshLambertMaterial({ 
        color: 0x666666, 
        emissive: 0x222222 
    }); 
    
    const box = new THREE.Mesh(geometry, material);
    box.position.y = 1;
    box.castShadow = true;
    // Add reference to box in userData to change color later
    box.name = 'body'; 
    group.add(box);

    // Create Text Texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Background for text
      ctx.fillStyle = isForbiddenTarget(value) ? '#330000' : '#003300';
      ctx.fillRect(0, 0, 256, 256);
      
      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 120px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toString(), 128, 128);
      
      // Border
      ctx.strokeStyle = isForbiddenTarget(value) ? '#ff0000' : '#00ff00';
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, 256, 256);
      
      // Add factor count indicators (dots) if valid target
      if (!isForbiddenTarget(value)) {
        ctx.fillStyle = '#00ff00';
        const dotSize = 20;
        const spacing = 30;
        const startX = 128 - ((factorCount - 1) * spacing) / 2;
        for(let i=0; i<factorCount; i++) {
           ctx.beginPath();
           ctx.arc(startX + i * spacing, 220, dotSize/2, 0, Math.PI*2);
           ctx.fill();
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    const planeGeo = new THREE.PlaneGeometry(1.8, 1.8);
    const planeMat = new THREE.MeshBasicMaterial({ map: texture });
    const label = new THREE.Mesh(planeGeo, planeMat);
    label.position.set(0, 1, 1.01); 
    group.add(label);

    return { group, factorCount };
  }

  spawnEnemy(currentSpeed, currentSpawnRate) {
    const now = Date.now();
    if (now - this.lastSpawnTime > currentSpawnRate) {
      const val = generateTargetNumber();
      const { group, factorCount } = this.createEnemy(val);
      
      const xPos = (Math.random() - 0.5) * (this.BOUNDS_X * 1.8); 
      group.position.set(xPos, 0, -70); 

      this.scene.add(group);
      
      const isForbidden = isForbiddenTarget(val);
      
      // 30% chance to be a "Bouncer", but not if it's too close to edges (visual glitch prevention)
      const isBouncing = Math.random() < 0.3;

      this.enemies.push({
        id: Math.random().toString(),
        mesh: group,
        value: val,
        hp: isForbidden ? 1 : factorCount, // Forbidden dies in 1 hit (causing game over)
        maxHp: factorCount,
        isForbidden: isForbidden,
        isBouncing: isBouncing,
        bounceOffset: Math.random() * Math.PI * 2, // Random phase
        speed: currentSpeed
      });
      this.lastSpawnTime = now;
    }
  }

  // --- Game Loop Update Methods ---

  updatePlayer() {
    if (this.keys.w && this.player.position.z > this.BOUNDS_Z_MIN) this.player.position.z -= this.PLAYER_SPEED;
    if (this.keys.s && this.player.position.z < this.BOUNDS_Z_MAX) this.player.position.z += this.PLAYER_SPEED;
    if (this.keys.a && this.player.position.x > -this.BOUNDS_X) this.player.position.x -= this.PLAYER_SPEED;
    if (this.keys.d && this.player.position.x < this.BOUNDS_X) this.player.position.x += this.PLAYER_SPEED;

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
      
      // Move Forward
      e.mesh.position.z += e.speed;

      // Apply Bouncing
      if (e.isBouncing) {
         // Use abs(sin) so they bounce on the floor (y=0) up to y=4
         const time = Date.now() * 0.005;
         // Base Y was 0. 
         const y = Math.abs(Math.sin(time + e.bounceOffset)) * 4;
         e.mesh.position.y = y;
      }

      // Update Matrix for collision
      e.mesh.updateMatrixWorld();

      // Check Out of Bounds (Passed player)
      if (e.mesh.position.z > 20) {
        this.scene.remove(e.mesh);
        this.enemies.splice(i, 1);
        continue;
      }

      // Re-calculate box with updated matrix
      const enemyBox = new THREE.Box3().setFromObject(e.mesh);

      // Check Collision with Player
      if (playerBox.intersectsBox(enemyBox)) {
        this.stopGame();
        this.callbacks.onGameOver(`${e.value}와 충돌했습니다!`);
        return;
      }

      // Check Collision with Bullets
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        
        // GAMEPLAY FIX: 
        // Create a very tall bounding box for the bullet so the player doesn't have to aim up
        const bulletBox = new THREE.Box3().setFromObject(b.mesh);
        bulletBox.min.y = -10;
        bulletBox.max.y = 20;

        if (bulletBox.intersectsBox(enemyBox)) {
          // HIT!
          this.scene.remove(b.mesh);
          this.bullets.splice(j, 1);

          this.createExplosion(b.mesh.position, 0xffff00, 3); // Small impact sparks

          if (e.isForbidden) {
            this.stopGame();
            const msg = isPrime(e.value) ? "소수" : "소수의 2배수";
            this.callbacks.onGameOver(`${e.value}를 쏘았습니다! (${msg}는 공격 금지)`);
            return;
          } else {
            // Valid Target Hit Logic
            e.hp--;
            
            if (e.hp <= 0) {
              // DESTROY
              this.createExplosion(e.mesh.position, 0x00ff00, 12);
              this.scene.remove(e.mesh);
              this.enemies.splice(i, 1);
              this.score += (e.maxHp * 10);
              this.callbacks.onScoreUpdate(this.score);
            } else {
               // DAMAGED BUT ALIVE
               this.applyDamageVisuals(e);
            }
          }
          break; 
        }
      }
    }
  }

  applyDamageVisuals(enemy) {
    // Find the body mesh
    const body = enemy.mesh.children.find(c => c.name === 'body');
    if (!body) return;

    // Flash White
    const oldColor = body.material.color.getHex();
    body.material.color.setHex(0xffffff);
    
    // Reset after flash
    setTimeout(() => {
        // If critical (HP == 1), turn on bloom (emissive red)
        if (enemy.hp === 1) {
            body.material.color.setHex(0xff0000);
            body.material.emissive.setHex(0xff4400); // Orange/Red Glow
            body.material.emissiveIntensity = 2.0;
        } else {
            // Revert to normal base color (0x666666)
            body.material.color.setHex(0x666666);
            // Keep the slight emissive for visibility
            body.material.emissive.setHex(0x222222);
            body.material.emissiveIntensity = 1.0;
        }
    }, 100);
  }

  createExplosion(pos, color, count) {
    const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const material = new THREE.MeshBasicMaterial({ color: color });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);
      
      mesh.userData = {
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8
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
      p.rotation.x += 0.2;
      p.rotation.y += 0.2;
      p.scale.multiplyScalar(0.9);

      if (p.scale.x < 0.05) {
        this.scene.remove(p);
        this.particles.splice(i, 1);
      }
    }
  }

  animate() {
    if (!this.isRunning) return;

    // Calculate Difficulty scaling
    const elapsedSeconds = (Date.now() - this.gameStartTime) / 1000;
    
    // Speed increases linearly
    const currentSpeed = this.BASE_ENEMY_SPEED + (elapsedSeconds * 0.015);
    
    // Spawn rate decreases (gets faster), capped at 300ms
    const currentSpawnRate = Math.max(300, this.BASE_SPAWN_RATE - (elapsedSeconds * 10));

    this.updatePlayer();
    
    // Spawn Systems
    this.spawnEnemy(currentSpeed, currentSpawnRate);
    this.spawnScenery();
    this.updateScenery(currentSpeed); // Scenery moves at same speed as enemies
    
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
