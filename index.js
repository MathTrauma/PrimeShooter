import { GameEngine } from './scripts/GameEngine.js';


// DOM Elements
const uiMenu = document.getElementById('ui-menu');
const uiHud = document.getElementById('ui-hud');
const uiGameOver = document.getElementById('ui-gameover');
const scoreEl = document.getElementById('score-value');
const timerEl = document.getElementById('timer-value'); // Added Timer Element
const finalScoreEl = document.getElementById('final-score');
const reasonEl = document.getElementById('game-over-reason');
const gameOverTitleEl = document.getElementById('game-over-title');
const gameContainer = document.getElementById('game-container');

// Buttons
const startBtn = document.getElementById('btn-start');
const retryBtn = document.getElementById('btn-retry');

let engine = null;

function init() {
    // Initialize Engine with callbacks to update UI
    engine = new GameEngine(gameContainer, {
        onScoreUpdate: (score) => {
            if (scoreEl) scoreEl.innerText = score;
        },
        onTimeUpdate: (timeLeft) => { // Added Time Update Callback
            if (timerEl) timerEl.innerText = Math.max(0, Math.ceil(timeLeft));
        },
        onGameOver: (reason, isWin) => { // Updated Game Over Callback
            if (reasonEl) reasonEl.innerText = reason;
            if (finalScoreEl && scoreEl) finalScoreEl.innerText = scoreEl.innerText;
            
            // Set Game Over Title Style based on Win/Loss using semantic classes
            if (isWin) {
                gameOverTitleEl.innerText = "임무 완수";
                uiGameOver.classList.remove('state-loss');
                uiGameOver.classList.add('state-win');
            } else {
                gameOverTitleEl.innerText = "임무 실패";
                uiGameOver.classList.remove('state-win');
                uiGameOver.classList.add('state-loss');
            }

            setGameState('GAMEOVER');
        }
    });

    // Mobile Control Bindings
    setupMobileControls();

    // Set initial state
    setGameState('MENU');
    
    // Bind button events
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            setGameState('PLAYING');
            engine.startGame();
        });
    }

    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            setGameState('PLAYING');
            engine.startGame();
        });
    }
}

function setupMobileControls() {
    const btns = document.querySelectorAll('.control-btn');
    
    btns.forEach(btn => {
        const key = btn.dataset.key;
        
        const handleStart = (e) => {
            e.preventDefault(); // Prevent text selection/scroll
            if (key === 'space') {
                engine.shoot(); // Direct trigger for shooting
            } else {
                engine.setControlState(key, true);
            }
        };

        const handleEnd = (e) => {
            e.preventDefault();
            if (key !== 'space') {
                engine.setControlState(key, false);
            }
        };

        // Touch events
        btn.addEventListener('touchstart', handleStart, { passive: false });
        btn.addEventListener('touchend', handleEnd, { passive: false });
        
        // Mouse events for testing on desktop without keyboard
        btn.addEventListener('mousedown', handleStart);
        btn.addEventListener('mouseup', handleEnd);
        btn.addEventListener('mouseleave', handleEnd);
    });
}

function setGameState(state) {
    // Hide all layers
    if (uiMenu) uiMenu.classList.add('hidden');
    if (uiHud) uiHud.classList.add('hidden');
    if (uiGameOver) uiGameOver.classList.add('hidden');

    // Show active layer
    if (state === 'MENU') {
        if (uiMenu) uiMenu.classList.remove('hidden');
    } else if (state === 'PLAYING') {
        if (uiHud) uiHud.classList.remove('hidden');
    } else if (state === 'GAMEOVER') {
        if (uiGameOver) uiGameOver.classList.remove('hidden');
    }
}

// Start the app
init();