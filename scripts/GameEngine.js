import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { Bullet } from './entities/Bullet.js';
import { Tree, Building } from './entities/Scenery.js';
import { ParticleSystem } from './entities/Particle.js';
import { isPrime, generateTargetNumber } from './mathUtils.js';

export class GameEngine {
  constructor(container, callbacks) {
    this.callbacks = callbacks;

    // Scene management
    this.sceneManager = new SceneManager(container);

    // Game entities
    this.player = new Player({
      speed: 0.4,
      boundsX: 10,
      boundsZMin: -5,
      boundsZMax: 10
    });
    this.sceneManager.add(this.player.mesh);

    this.enemies = [];
    this.bullets = [];
    this.scenery = [];

    // Particle system
    this.particleSystem = new ParticleSystem(this.sceneManager.scene);

    // Game state
    this.isRunning = false;
    this.score = 0;
    this.gameStartTime = 0;
    this.lastTimestamp = 0;

    // Timing
    this.lastShotTime = 0;
    this.lastSpawnTime = 0;
    this.lastScenerySpawnTime = 0;

    // Game constants
    this.GAME_DURATION = 60;
    this.BULLET_SPEED = 1.2;
    this.BASE_ENEMY_SPEED = 0.16;
    this.BASE_SPAWN_RATE = 1200;
    this.BOUNDS_X = 10;

    // Input handlers
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
    this.boundAnimate = this.animate.bind(this);

    window.addEventListener('keydown', this.boundHandleKeyDown);
    window.addEventListener('keyup', this.boundHandleKeyUp);
  }

  handleKeyDown(e) {
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'a':
      case 's':
      case 'd':
        this.player.setControlState(e.key.toLowerCase(), true);
        break;
      case ' ':
        this.shoot();
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.key.toLowerCase()) {
      case 'w':
      case 'a':
      case 's':
      case 'd':
        this.player.setControlState(e.key.toLowerCase(), false);
        break;
    }
  }

  setControlState(key, isPressed) {
    this.player.setControlState(key, isPressed);
  }

  startGame() {
    this.score = 0;
    this.isRunning = true;
    this.gameStartTime = Date.now();
    this.lastTimestamp = 0;

    // Reset player
    this.player.reset();

    // Clear entities
    this.clearEntities();

    this.callbacks.onScoreUpdate(0);
    this.callbacks.onTimeUpdate(this.GAME_DURATION);

    requestAnimationFrame(this.boundAnimate);
  }

  clearEntities() {
    // Clear enemies
    for (const enemy of this.enemies) {
      this.sceneManager.remove(enemy.mesh);
    }
    this.enemies = [];

    // Clear bullets
    for (const bullet of this.bullets) {
      this.sceneManager.remove(bullet.mesh);
    }
    this.bullets = [];

    // Clear scenery
    for (const obj of this.scenery) {
      this.sceneManager.remove(obj.mesh);
    }
    this.scenery = [];

    // Clear particles
    this.particleSystem.clear();
  }

  stopGame() {
    this.isRunning = false;
  }

  shoot() {
    if (!this.isRunning) return;

    const now = Date.now();
    if (now - this.lastShotTime < 150) return;

    this.lastShotTime = now;

    const bullet = new Bullet(this.player.position, {
      speed: this.BULLET_SPEED
    });

    this.sceneManager.add(bullet.mesh);
    this.bullets.push(bullet);
  }

  spawnEnemy(currentSpeed, currentSpawnRate) {
    const now = Date.now();
    if (now - this.lastSpawnTime > currentSpawnRate) {
      const value = generateTargetNumber();
      const enemy = new Enemy(value, {
        speed: currentSpeed,
        isBouncing: Math.random() < 0.3
      });

      const xPos = (Math.random() - 0.5) * (this.BOUNDS_X * 1.8);
      enemy.setPosition(xPos, 0, -70);

      this.sceneManager.add(enemy.mesh);
      this.enemies.push(enemy);
      this.lastSpawnTime = now;
    }
  }

  spawnScenery() {
    const now = Date.now();
    if (now - this.lastScenerySpawnTime > 300) {
      const side = Math.random() > 0.5 ? 1 : -1;

      // Spawn tree
      const tree = new Tree();
      const treeOffset = this.BOUNDS_X + 3;
      tree.setPosition(side * treeOffset, 0, -70);
      this.sceneManager.add(tree.mesh);
      this.scenery.push(tree);

      // Optionally spawn building
      if (Math.random() > 0.5) {
        const building = new Building();
        const buildingOffset = this.BOUNDS_X + 10;
        building.setPosition(side * buildingOffset, 0, -70);
        this.sceneManager.add(building.mesh);
        this.scenery.push(building);
      }

      this.lastScenerySpawnTime = now;
    }
  }

  updateBullets(deltaTime) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.update(deltaTime);

      if (bullet.isOutOfBounds()) {
        this.sceneManager.remove(bullet.mesh);
        this.bullets.splice(i, 1);
      }
    }
  }

  updateEnemies(deltaTime) {
    const playerBox = this.player.getBoundingBox();

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(deltaTime);

      // Check if out of bounds
      if (enemy.isOutOfBounds()) {
        this.sceneManager.remove(enemy.mesh);
        this.enemies.splice(i, 1);
        continue;
      }

      const enemyBox = enemy.getBoundingBox();

      // Check player collision
      if (playerBox.intersectsBox(enemyBox)) {
        this.stopGame();
        this.callbacks.onGameOver(`${enemy.value}와 충돌했습니다!`, false);
        return;
      }

      // Check bullet collisions
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const bullet = this.bullets[j];
        const bulletBox = bullet.getBoundingBox(deltaTime);

        if (bulletBox.intersectsBox(enemyBox)) {
          // Remove bullet
          this.sceneManager.remove(bullet.mesh);
          this.bullets.splice(j, 1);

          // Hit effect
          this.particleSystem.createExplosion(bullet.position, {
            color: 0xffff00,
            count: 3
          });

          // Check if forbidden target
          if (enemy.isForbidden) {
            this.stopGame();
            const msg = isPrime(enemy.value) ? "소수" : "소수의 2배수";
            this.callbacks.onGameOver(
              `${enemy.value}를 쏘았습니다! (${msg}는 공격 금지)`,
              false
            );
            return;
          }

          // Apply damage
          const destroyed = enemy.takeDamage();

          if (destroyed) {
            this.particleSystem.createExplosion(enemy.position, {
              color: 0x00ff00,
              count: 12
            });
            this.sceneManager.remove(enemy.mesh);
            this.enemies.splice(i, 1);
            this.score += enemy.getScore();
            this.callbacks.onScoreUpdate(this.score);
          }

          break;
        }
      }
    }
  }

  updateScenery(speed, deltaTime) {
    for (let i = this.scenery.length - 1; i >= 0; i--) {
      const obj = this.scenery[i];
      obj.update(speed, deltaTime);

      if (obj.isOutOfBounds()) {
        this.sceneManager.remove(obj.mesh);
        this.scenery.splice(i, 1);
      }
    }
  }

  animate(timestamp) {
    if (!this.isRunning) return;

    // Delta time calculation (normalized to 60fps)
    if (this.lastTimestamp === 0) this.lastTimestamp = timestamp;
    const deltaTime = Math.min((timestamp - this.lastTimestamp) / 16.67, 3);
    this.lastTimestamp = timestamp;

    const now = Date.now();
    const elapsedSeconds = (now - this.gameStartTime) / 1000;

    // Check time limit
    const timeLeft = this.GAME_DURATION - elapsedSeconds;
    this.callbacks.onTimeUpdate(timeLeft);

    if (timeLeft <= 0) {
      this.stopGame();
      if (this.score >= 150) {
        this.callbacks.onGameOver(
          `시간 종료! 목표 점수 달성! (${this.score}점)`,
          true
        );
      } else {
        this.callbacks.onGameOver(
          `시간 종료! 점수가 부족합니다. (목표: 150, 현재: ${this.score})`,
          false
        );
      }
      return;
    }

    // Progressive difficulty
    const currentSpeed = this.BASE_ENEMY_SPEED + (elapsedSeconds * 0.015);
    const currentSpawnRate = Math.max(300, this.BASE_SPAWN_RATE - (elapsedSeconds * 10));

    // Update entities
    this.player.update(deltaTime);
    this.sceneManager.updateCamera(this.player.position, deltaTime);

    this.spawnEnemy(currentSpeed, currentSpawnRate);
    this.spawnScenery();

    this.updateBullets(deltaTime);
    this.updateEnemies(deltaTime);
    this.updateScenery(currentSpeed, deltaTime);
    this.particleSystem.update(deltaTime);

    // Render
    this.sceneManager.render();

    requestAnimationFrame(this.boundAnimate);
  }

  cleanup() {
    this.stopGame();

    window.removeEventListener('keydown', this.boundHandleKeyDown);
    window.removeEventListener('keyup', this.boundHandleKeyUp);

    this.clearEntities();
    this.sceneManager.dispose();
  }
}
