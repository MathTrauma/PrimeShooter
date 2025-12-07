import * as THREE from 'three';
import { isPrime, isForbiddenTarget, generateTargetNumber, getPrimeFactorCount } from './mathUtils.js';

export class GameEngine {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    
    this.enemies = [];
    this.bullets = [];
    this.particles = [];
    this.scenery = []; 
    
    this.animationId = 0;
    this.score = 0;
    this.isRunning = false;
    this.gameStartTime = 0;
    
    this.keys = { w: false, a: false, s: false, d: false };
    this.lastShotTime = 0;

    this.PLAYER_SPEED = 0.4;
    this.BOUNDS_X = 10;
    this.BOUNDS_Z_MIN = -5;
    this.BOUNDS_Z_MAX = 10;
    this.BULLET_SPEED = 1.2;
    
    this.BASE_ENEMY_SPEED = 0.2;
    this.BASE_SPAWN_RATE = 1200;
    this.lastSpawnTime = 0;
    this.lastScenerySpawnTime = 0;

    // Added: Game duration constant (60 seconds)
    this.GAME_DURATION = 60;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);
    this.scene.fog = new THREE.Fog(0x111111, 60, 150);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 200);
    this.camera.position.set(0, 15, 25);
    this.camera.lookAt(0, 0, -10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x111111);
    this.scene.add(gridHelper);

    this.player = this.createPlayerVoxel();
    this.scene.add(this.player);

    // Added: Create "MathTrauma" title in the sky
    this.createVoxelTitle();

    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
    this.boundHandleResize = this.handleResize.bind(this);
    this.boundAnimate = this.animate.bind(this);

    window.addEventListener('keydown', this.boundHandleKeyDown);
    window.addEventListener('keyup', this.boundHandleKeyUp);
    window.addEventListener('resize', this.boundHandleResize);
  }

  // Added: Function to display game title in 3D space
  createVoxelTitle() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0)'; // Transparent background
        ctx.clearRect(0,0, 1024, 256);
        
        // Glow effect
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 150px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("MathTrauma", 512, 128);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.8 });
    const geometry = new THREE.PlaneGeometry(40, 10);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 15, -40); // High up in the background
    mesh.rotation.x = 0.2; // Slight tilt
    this.scene.add(mesh);
  }

  createPlayerVoxel() {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x00ffff });
    const geometry = new THREE.BoxGeometry(1, 1, 1);

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
    
    this.enemies.forEach(e => this.scene.remove(e.mesh));
    this.enemies = [];
    this.bullets.forEach(b => this.scene.remove(b.mesh));
    this.bullets = [];
    this.scenery.forEach(s => this.scene.remove(s.mesh));
    this.scenery = [];
    this.particles.forEach(p => this.scene.remove(p));
    this.particles = [];

    this.callbacks.onScoreUpdate(0);
    this.callbacks.onTimeUpdate(this.GAME_DURATION); // Initialize timer display
    this.animate();
  }

  stopGame() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationId);
  }

  shoot() {
    if (!this.isRunning) return;
    const now = Date.now();
    if (now - this.lastShotTime < 150) return;

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

  createTree() {
    const group = new THREE.Group();
    const trunkGeo = new THREE.BoxGeometry(1, 4, 1);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2;
    group.add(trunk);

    const leavesGeo = new THREE.BoxGeometry(3, 3, 3);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 5;
    group.add(leaves);

    return group;
  }

  createBuilding() {
    const height = 10 + Math.random() * 15; // Taller buildings
    const geo = new THREE.BoxGeometry(6, height, 6); // Wider buildings
    const mat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = height / 2;
    return mesh;
  }

  // Updated: Scenery spawning logic to layer trees and buildings
  spawnScenery() {
    const now = Date.now();
    if (now - this.lastScenerySpawnTime > 300) { // Spawn faster
      // Spawn Tree (Inner Layer)
      const tree = this.createTree();
      const side = Math.random() > 0.5 ? 1 : -1;
      const treeOffset = this.BOUNDS_X + 3; // Closer to play area
      tree.position.set(side * treeOffset, 0, -70);
      this.scene.add(tree);
      this.scenery.push({ mesh: tree });

      // Spawn Building (Outer Layer)
      if (Math.random() > 0.5) {
        const building = this.createBuilding();
        const buildingOffset = this.BOUNDS_X + 10; // Further out
        building.position.set(side * buildingOffset, 0, -70);
        this.scene.add(building);
        this.scenery.push({ mesh: building });
      }

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

  createEnemy(value) {
    const group = new THREE.Group();
    
    const factorCount = getPrimeFactorCount(value);
    
    // Updated: Uniform appearance for all enemies
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshLambertMaterial({ 
        color: 0x444444, // Uniform Dark Grey
        emissive: 0x111111 
    }); 
    
    const box = new THREE.Mesh(geometry, material);
    box.position.y = 1;
    box.castShadow = true;
    box.name = 'body'; 
    group.add(box);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Updated: Uniform background for label
      ctx.fillStyle = '#222222'; 
      ctx.fillRect(0, 0, 256, 256);
      
      // Updated: White text for everyone
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 120px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value.toString(), 128, 128);
      
      // Updated: Uniform border color (White)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, 256, 256);
      
      // Note: Removed the "factor dots" hint. 
      // Players must rely on mental math now.
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
      
      const isBouncing = Math.random() < 0.3;

      this.enemies.push({
        id: Math.random().toString(),
        mesh: group,
        value: val,
        hp: isForbidden ? 1 : factorCount,
        maxHp: factorCount,
        isForbidden: isForbidden,
        isBouncing: isBouncing,
        bounceOffset: Math.random() * Math.PI * 2,
        speed: currentSpeed
      });
      this.lastSpawnTime = now;
    }
  }

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
      
      e.mesh.position.z += e.speed;

      if (e.isBouncing) {
         const time = Date.now() * 0.005;
         const y = Math.abs(Math.sin(time + e.bounceOffset)) * 4;
         e.mesh.position.y = y;
      }

      e.mesh.updateMatrixWorld();

      if (e.mesh.position.z > 20) {
        this.scene.remove(e.mesh);
        this.enemies.splice(i, 1);
        continue;
      }

      const enemyBox = new THREE.Box3().setFromObject(e.mesh);

      if (playerBox.intersectsBox(enemyBox)) {
        this.stopGame();
        this.callbacks.onGameOver(`${e.value}와 충돌했습니다!`, false);
        return;
      }

      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const b = this.bullets[j];
        
        const bulletBox = new THREE.Box3().setFromObject(b.mesh);
        bulletBox.min.y = -10;
        bulletBox.max.y = 20;

        if (bulletBox.intersectsBox(enemyBox)) {
          this.scene.remove(b.mesh);
          this.bullets.splice(j, 1);

          this.createExplosion(b.mesh.position, 0xffff00, 3);

          if (e.isForbidden) {
            this.stopGame();
            const msg = isPrime(e.value) ? "소수" : "소수의 2배수";
            this.callbacks.onGameOver(`${e.value}를 쏘았습니다! (${msg}는 공격 금지)`, false);
            return;
          } else {
            e.hp--;
            
            if (e.hp <= 0) {
              this.createExplosion(e.mesh.position, 0x00ff00, 12);
              this.scene.remove(e.mesh);
              this.enemies.splice(i, 1);
              this.score += (e.maxHp * 10);
              this.callbacks.onScoreUpdate(this.score);
            } else {
               this.applyDamageVisuals(e);
            }
          }
          break; 
        }
      }
    }
  }

  applyDamageVisuals(enemy) {
    const body = enemy.mesh.children.find(c => c.name === 'body');
    if (!body) return;

    body.material.color.setHex(0xffffff);
    
    setTimeout(() => {
        if (enemy.hp === 1) {
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

    const now = Date.now();
    const elapsedSeconds = (now - this.gameStartTime) / 1000;
    
    // Added: Check time limit
    const timeLeft = this.GAME_DURATION - elapsedSeconds;
    this.callbacks.onTimeUpdate(timeLeft);

    if (timeLeft <= 0) {
        this.stopGame();
        if (this.score >= 150) {
            this.callbacks.onGameOver(`시간 종료! 목표 점수 달성! (${this.score}점)`, true);
        } else {
            this.callbacks.onGameOver(`시간 종료! 점수가 부족합니다. (목표: 150, 현재: ${this.score})`, false);
        }
        return;
    }
    
    const currentSpeed = this.BASE_ENEMY_SPEED + (elapsedSeconds * 0.015);
    
    const currentSpawnRate = Math.max(300, this.BASE_SPAWN_RATE - (elapsedSeconds * 10));

    this.updatePlayer();
    
    this.spawnEnemy(currentSpeed, currentSpawnRate);
    this.spawnScenery();
    this.updateScenery(currentSpeed);
    
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