//mport { GameEngine } from './scripts/app1.js';
import { GameEngine } from './scripts/app2.js';

// DOM Elements
const uiMenu = document.getElementById('ui-menu');
const uiHud = document.getElementById('ui-hud');
const uiGameOver = document.getElementById('ui-gameover');
const scoreEl = document.getElementById('score-value');
const finalScoreEl = document.getElementById('final-score');
const reasonEl = document.getElementById('game-over-reason');
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
        onGameOver: (reason) => {
            if (reasonEl) reasonEl.innerText = reason;
            if (finalScoreEl && scoreEl) finalScoreEl.innerText = scoreEl.innerText;
            setGameState('GAMEOVER');
        }
    });

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
