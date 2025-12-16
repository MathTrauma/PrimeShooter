# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Math Trauma** is a browser-based 3D voxel shooter game built with Three.js (v0.181.2) where players shoot composite numbers while avoiding primes and doubles of primes. The game is in Korean and features a 60-second time limit with a target score of 150 points.

## Development Setup

This is a vanilla JavaScript project with no build step or package manager. To run:

```bash
# Serve the directory with any local server
python3 -m http.server 8000
# or
npx serve
```

Then open `http://localhost:8000` in a browser.

## Architecture

### Module Structure

The codebase uses ES6 modules loaded via import maps (CDN-based Three.js):

- **index.html** - Main HTML structure with UI overlays (menu, HUD, game over screens)
- **index.js** - Entry point that initializes the GameEngine and manages UI state transitions
- **scripts/app_0.js** - Core `GameEngine` class handling Three.js scene, game loop, collision detection
- **scripts/mathUtils.js** - Mathematical utilities for prime checking and target validation
- **style.css** - Responsive UI styling with glass-morphism effects

### Game Engine Architecture

The `GameEngine` class in `scripts/app_0.js` is the heart of the game:

**Core Systems:**
- Scene management with Three.js (player voxel, enemies, bullets, particles, scenery)
- Camera follows player with damped interpolation (`updateCamera()`)
- Progressive difficulty scaling (enemy speed and spawn rate increase over time)
- Collision detection using Three.js `Box3` bounding boxes
- Particle system for explosion effects

**Game Loop Flow:**
1. `startGame()` - Initializes game state, clears entities, starts animation loop
2. `animate()` - Main loop that updates all systems and checks win/loss conditions
3. Timer callback updates UI every frame via `callbacks.onTimeUpdate()`
4. Score updates happen via `callbacks.onScoreUpdate()` when enemies are destroyed

**Enemy System:**
- Enemies are voxel groups with dynamic canvas texture labels showing their number
- HP is determined by prime factor count via `getPrimeFactorCount()`
- Forbidden targets (primes and 2×prime) have HP=1 but cause instant game over if shot
- Some enemies have bouncing behavior (`isBouncing` flag)
- Visual damage feedback: enemies flash white on hit, turn red at 1 HP

**Control System:**
- Keyboard (WASD + Space) and touch controls (mobile D-pad)
- `setControlState()` allows external control binding for mobile UI
- Shoot cooldown of 150ms prevents spam

### Mathematical Game Rules

Implemented in `scripts/mathUtils.js`:

**Core Logic:**
- `isPrime(num)` - Optimized primality test using 6k±1 optimization
- `isForbiddenTarget(num)` - Returns true for primes OR numbers that are 2× a prime
- `getPrimeFactorCount(num)` - Counts prime factors with multiplicity (determines enemy HP)

**Example:**
- 121 = 11² → 2 factors → 2 HP → shootable (composite)
- 13 → 1 factor → forbidden (prime)
- 26 = 2×13 → forbidden (2× prime)
- 77 = 7×11 → 2 factors → 2 HP → shootable

### UI State Management

`index.js` manages three UI states via `setGameState()`:
- `MENU` - Initial screen with game rules
- `PLAYING` - Active game with HUD showing score/timer and mobile controls
- `GAMEOVER` - End screen with win/loss styling (`.state-win` / `.state-loss` classes)

Mobile controls are bound to engine methods via `setupMobileControls()`.

## Key Design Patterns

**Callback-based UI Updates:**
The engine doesn't directly manipulate DOM. Instead, it accepts callbacks in the constructor:
```javascript
{
  onScoreUpdate: (score) => { /* update DOM */ },
  onTimeUpdate: (timeLeft) => { /* update timer */ },
  onGameOver: (reason, isWin) => { /* show end screen */ }
}
```

**Entity Arrays:**
Game entities are stored in arrays and updated/culled each frame:
- `enemies[]` - Active enemy objects with mesh, value, HP, speed
- `bullets[]` - Projectiles with velocity
- `particles[]` - Explosion particle meshes with userData velocity
- `scenery[]` - Trees and buildings scrolling past

**Progressive Difficulty:**
Calculated in `animate()` based on elapsed time:
```javascript
currentSpeed = BASE_ENEMY_SPEED + (elapsedSeconds * 0.015)
currentSpawnRate = max(300, BASE_SPAWN_RATE - (elapsedSeconds * 10))
```

## Game Balance Parameters

Defined as class constants in `GameEngine`:
- `GAME_DURATION = 60` seconds
- Victory requires `score >= 150`
- `PLAYER_SPEED = 0.4`
- `BULLET_SPEED = 1.2`
- `BASE_ENEMY_SPEED = 0.2` (increases over time)
- `BASE_SPAWN_RATE = 1200`ms (decreases to 300ms minimum)
- Shoot cooldown: 150ms
- Score: `(enemy.maxHp * 10)` per kill

## Styling Approach

CSS uses:
- Glass-morphism panels (`.glass-panel`) with backdrop filters
- Semantic color classes (`.text-cyan`, `.text-red`, `.panel-yellow`)
- State-based styling (`.state-win`, `.state-loss` modify gameover overlay)
- Responsive mobile controls with touch-action prevention
- Pretendard font for Korean text rendering

## Common Modifications

**Adjusting Difficulty:**
- Modify `GAME_DURATION` or victory score threshold in `scripts/app_0.js:540-545`
- Change spawn/speed scaling factors in `scripts/app_0.js:550-552`

**Changing Game Rules:**
- Edit `isForbiddenTarget()` logic in `scripts/mathUtils.js:12-23`
- Adjust HP calculation by modifying enemy creation in `scripts/app_0.js:327-353`

**Visual Updates:**
- Enemy appearance in `createEnemy()` (scripts/app_0.js:274-325)
- Player voxel shape in `createPlayerVoxel()` (scripts/app_0.js:111-129)
- Explosion effects in `createExplosion()` (scripts/app_0.js:494-513)

**UI/Text Changes:**
- Game rules and labels are in Korean within `index.html`
- HUD layout in `index.html:31-83` and styled in `style.css`

## Dependencies

- **Three.js v0.181.2** - Loaded via CDN import map
- **Pretendard font** - Korean web font via CDN
- No build tools, bundlers, or package managers

## Browser Compatibility

Requires modern browser with ES6 modules support and WebGL. Mobile touch controls are fully implemented.
