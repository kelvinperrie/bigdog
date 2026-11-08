/**
 * Expanding Word Web Application
 * Core interactive typography engine adhering to REQUIREMENTS.md
 */

(() => {
  'use strict';

  // --- Constants & Config ---
  const INITIAL_FONT_SIZE_PT = 10;
  const BASE_GROWTH_RATE_PT_PER_SEC = 2.0; // 1 point per 0.5s = 2.0 pt/s
  const SPEED_STEP_FACTOR = 0.10; // 10% change per arrow press
  const MIN_SPEED_MULTIPLIER = 0.05; // Prevent stalling to absolute zero
  const MAX_SPEED_MULTIPLIER = 50.0; // Reasonable upper boundary
  const DEFAULT_WORD = 'blah';

  // --- Application State ---
  const state = {
    word: DEFAULT_WORD,
    fontSize: INITIAL_FONT_SIZE_PT,
    isExpanding: false,
    speedMultiplier: 1.0,
    hasStarted: false,
    hudVisible: true
  };

  // --- DOM Elements ---
  const wordDisplay = document.getElementById('word-display');
  const hudPanel = document.getElementById('hud-panel');
  const btnToggleHud = document.getElementById('btn-toggle-hud');
  const btnCloseHud = document.getElementById('btn-close-hud');
  const hudStatusBadge = document.getElementById('hud-status-badge');
  const hudFontSize = document.getElementById('hud-font-size');
  const hudSpeed = document.getElementById('hud-speed');
  const hudMultiplier = document.getElementById('hud-multiplier');
  const labelSpaceAction = document.getElementById('label-space-action');
  const wordForm = document.getElementById('word-form');
  const wordInput = document.getElementById('word-input');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnPlayText = document.getElementById('btn-play-text');
  const btnReset = document.getElementById('btn-reset');
  const toastEl = document.getElementById('toast');

  let toastTimeout = null;
  let lastTimestamp = null;
  let animFrameId = null;

  // --- Toast Notification Helper ---
  function showToast(message, duration = 1800) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }

  // --- Word Configuration (Point 6.1) ---
  function setWord(newWord) {
    const trimmed = (newWord || '').trim();
    if (!trimmed) return;
    state.word = trimmed;
    wordDisplay.textContent = trimmed;
    if (wordInput && wordInput.value !== trimmed) {
      wordInput.value = trimmed;
    }
  }

  function initWordFromUrlOrStorage() {
    const params = new URLSearchParams(window.location.search);
    const paramWord = params.get('word');
    if (paramWord && paramWord.trim()) {
      setWord(paramWord.trim());
    } else {
      setWord(DEFAULT_WORD);
    }
  }

  // --- Visual & HUD Updates (Point 6.2) ---
  function updateHud() {
    hudFontSize.innerHTML = `${state.fontSize.toFixed(1)} <small>pt</small>`;

    const currentRate = BASE_GROWTH_RATE_PT_PER_SEC * state.speedMultiplier;
    hudSpeed.innerHTML = `${currentRate.toFixed(2)} <small>pt/s</small>`;
    hudMultiplier.textContent = `${state.speedMultiplier.toFixed(2)}x`;

    if (!state.hasStarted) {
      hudStatusBadge.textContent = 'Ready';
      hudStatusBadge.className = 'hud-badge';
      labelSpaceAction.textContent = 'Start expansion';
      btnPlayText.textContent = 'Start (Space)';
      btnPlayPause.classList.remove('active-pause');
    } else if (state.isExpanding) {
      hudStatusBadge.textContent = 'Expanding';
      hudStatusBadge.className = 'hud-badge active';
      labelSpaceAction.textContent = 'Pause expansion';
      btnPlayText.textContent = 'Pause (Space)';
      btnPlayPause.classList.add('active-pause');
    } else {
      hudStatusBadge.textContent = 'Paused';
      hudStatusBadge.className = 'hud-badge paused';
      labelSpaceAction.textContent = 'Resume expansion';
      btnPlayText.textContent = 'Resume (Space)';
      btnPlayPause.classList.remove('active-pause');
    }
  }

  function renderWord() {
    wordDisplay.style.fontSize = `${state.fontSize}pt`;
  }

  // --- Animation Loop ---
  function animationTick(currentTimestamp) {
    if (lastTimestamp === null) {
      lastTimestamp = currentTimestamp;
    }
    const deltaSeconds = (currentTimestamp - lastTimestamp) / 1000;
    lastTimestamp = currentTimestamp;

    if (state.isExpanding) {
      const growthPerSec = BASE_GROWTH_RATE_PT_PER_SEC * state.speedMultiplier;
      state.fontSize += growthPerSec * deltaSeconds;
      renderWord();
      updateHud();
    }

    animFrameId = requestAnimationFrame(animationTick);
  }

  // --- Action Handlers ---
  function toggleStartPause() {
    state.hasStarted = true;
    state.isExpanding = !state.isExpanding;
    lastTimestamp = null; // reset delta tracking to prevent jumps
    updateHud();

    if (state.isExpanding) {
      showToast('Expansion started');
    } else {
      showToast(`Paused at ${state.fontSize.toFixed(1)} pt`);
    }
  }

  function increaseSpeed() {
    state.speedMultiplier = Math.min(MAX_SPEED_MULTIPLIER, state.speedMultiplier * (1 + SPEED_STEP_FACTOR));
    updateHud();
    showToast(`Speed: ${(state.speedMultiplier).toFixed(2)}x (+10%)`);
  }

  function decreaseSpeed() {
    state.speedMultiplier = Math.max(MIN_SPEED_MULTIPLIER, state.speedMultiplier * (1 - SPEED_STEP_FACTOR));
    updateHud();
    showToast(`Speed: ${(state.speedMultiplier).toFixed(2)}x (-10%)`);
  }

  function resetToOriginalSize() {
    state.fontSize = INITIAL_FONT_SIZE_PT;
    renderWord();
    updateHud();
    showToast('Reset font size to 10 pt');
  }

  function toggleHud(forceState) {
    state.hudVisible = typeof forceState === 'boolean' ? forceState : !state.hudVisible;
    if (state.hudVisible) {
      hudPanel.classList.remove('hidden');
    } else {
      hudPanel.classList.add('hidden');
    }
  }

  // --- Keyboard Event Dispatcher ---
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      if (e.key === 'Escape') {
        e.target.blur();
      }
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        toggleStartPause();
        break;

      case 'ArrowUp':
        e.preventDefault();
        increaseSpeed();
        break;

      case 'ArrowDown':
        e.preventDefault();
        decreaseSpeed();
        break;

      case 'Enter':
        e.preventDefault();
        resetToOriginalSize();
        break;

      case 'KeyH':
        e.preventDefault();
        toggleHud();
        break;

      default:
        break;
    }
  });

  // --- UI Event Listeners ---
  wordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newWord = wordInput.value.trim();
    if (newWord) {
      setWord(newWord);
      wordInput.blur();
      showToast(`Word changed to "${newWord}"`);
    }
  });

  btnToggleHud.addEventListener('click', () => {
    toggleHud(true);
  });

  btnCloseHud.addEventListener('click', () => {
    toggleHud(false);
  });

  btnPlayPause.addEventListener('click', () => {
    toggleStartPause();
  });

  btnReset.addEventListener('click', () => {
    resetToOriginalSize();
  });

  // --- Initialization ---
  initWordFromUrlOrStorage();
  renderWord();
  updateHud();
  animFrameId = requestAnimationFrame(animationTick);
})();

