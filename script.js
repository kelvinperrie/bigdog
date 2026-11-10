/**
 * Expanding Word Web Application
 * Core interactive typography engine adhering to REQUIREMENTS.md
 */

(() => {
  'use strict';

  // --- Constants & Config ---
  const INITIAL_FONT_SIZE_PT = 10;
  const BASE_GROWTH_RATE_PT_PER_SEC = 2.0; // 1 point per 0.5s = 2.0 pt/s
  const SPEED_STEP = 0.10; // +/- 10% of base rate per arrow press (additive, no caps)
  const MIN_FONT_SIZE_PT = 0; // shrinking stops here
  const BASE_ROTATION_SPEED_DEG_PER_SEC = 45;
  const ROTATION_STEP_FACTOR = 0.10; // 10% faster per repeated arrow press
  const SCROLL_STEP_FRACTION = 0.10; // 10% of viewport per W/A/S/D press
  const DEFAULT_WORD = 'dog';

  // --- Application State ---
  const state = {
    word: DEFAULT_WORD,
    fontSize: INITIAL_FONT_SIZE_PT,
    isRunning: false,      // drives both expansion and rotation
    speedMultiplier: 0,    // starts at zero: no growth until Up/Down is pressed
    hasStarted: false,
    hudVisible: true,
    rotationAngle: 0,      // degrees, positive = clockwise
    rotationVelocity: 0,   // degrees/sec, sign gives direction, 0 = not rotating
    scrollX: 0,            // view offset in px (positive = viewing further right)
    scrollY: 0             // view offset in px (positive = viewing further down)
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
  const hudRotation = document.getElementById('hud-rotation');
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

  // Returns true if a custom word was supplied via the query string.
  function initWordFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const paramWord = params.get('word');
    if (paramWord && paramWord.trim()) {
      setWord(paramWord.trim());
      return true;
    }
    setWord(DEFAULT_WORD);
    return false;
  }

  // --- Visual & HUD Updates (Point 6.2) ---
  function updateHud() {
    hudFontSize.innerHTML = `${state.fontSize.toFixed(1)} <small>pt</small>`;

    const currentRate = BASE_GROWTH_RATE_PT_PER_SEC * state.speedMultiplier;
    hudSpeed.innerHTML = `${currentRate.toFixed(2)} <small>pt/s</small>`;
    hudMultiplier.textContent = `${state.speedMultiplier.toFixed(2)}x`;

    const rotSpeed = Math.abs(state.rotationVelocity);
    const rotDir = state.rotationVelocity < 0 ? ' ↺' : state.rotationVelocity > 0 ? ' ↻' : '';
    hudRotation.innerHTML = `${rotSpeed.toFixed(1)} <small>°/s${rotDir}</small>`;

    if (!state.hasStarted) {
      hudStatusBadge.textContent = 'Ready';
      hudStatusBadge.className = 'hud-badge';
      labelSpaceAction.textContent = 'Start animation';
      btnPlayText.textContent = 'Start (Space)';
      btnPlayPause.classList.remove('active-pause');
    } else if (state.isRunning) {
      hudStatusBadge.textContent =
        state.speedMultiplier > 0 ? 'Expanding' : state.speedMultiplier < 0 ? 'Shrinking' : 'Running';
      hudStatusBadge.className = 'hud-badge active';
      labelSpaceAction.textContent = 'Pause animation';
      btnPlayText.textContent = 'Pause (Space)';
      btnPlayPause.classList.add('active-pause');
    } else {
      hudStatusBadge.textContent = 'Paused';
      hudStatusBadge.className = 'hud-badge paused';
      labelSpaceAction.textContent = 'Resume animation';
      btnPlayText.textContent = 'Resume (Space)';
      btnPlayPause.classList.remove('active-pause');
    }
  }

  // How far (px) the view may scroll from center on each axis, based on the
  // bounding box of the rotated word versus the viewport.
  function getScrollLimits() {
    const w = wordDisplay.offsetWidth;
    const h = wordDisplay.offsetHeight;
    const rad = state.rotationAngle * Math.PI / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const boxW = w * cos + h * sin;
    const boxH = w * sin + h * cos;
    return {
      x: Math.max(0, (boxW - window.innerWidth) / 2),
      y: Math.max(0, (boxH - window.innerHeight) / 2)
    };
  }

  function clamp(value, limit) {
    return Math.max(-limit, Math.min(limit, value));
  }

  function renderWord() {
    wordDisplay.style.fontSize = `${state.fontSize}pt`;
    const limits = getScrollLimits();
    state.scrollX = clamp(state.scrollX, limits.x);
    state.scrollY = clamp(state.scrollY, limits.y);
    wordDisplay.style.transform =
      `translate(-50%, -50%) translate(${-state.scrollX}px, ${-state.scrollY}px) rotate(${state.rotationAngle}deg)`;
  }

  // --- Animation Loop ---
  function animationTick(currentTimestamp) {
    if (lastTimestamp === null) {
      lastTimestamp = currentTimestamp;
    }
    const deltaSeconds = (currentTimestamp - lastTimestamp) / 1000;
    lastTimestamp = currentTimestamp;

    if (state.isRunning) {
      state.rotationAngle = (state.rotationAngle + state.rotationVelocity * deltaSeconds) % 360;
      const growthPerSec = BASE_GROWTH_RATE_PT_PER_SEC * state.speedMultiplier;
      state.fontSize = Math.max(MIN_FONT_SIZE_PT, state.fontSize + growthPerSec * deltaSeconds);
      renderWord();
      updateHud();
    }

    animFrameId = requestAnimationFrame(animationTick);
  }

  // --- Action Handlers ---
  function setRunning(running) {
    state.hasStarted = true;
    state.isRunning = running;
    lastTimestamp = null; // reset delta tracking to prevent jumps
    updateHud();
  }

  function toggleStartPause() {
    setRunning(!state.isRunning);
    if (state.isRunning) {
      showToast('Animation started');
    } else {
      showToast(`Paused at ${state.fontSize.toFixed(1)} pt`);
    }
  }

  // Arrow keys start the animation if it is stopped (ready or paused).
  function ensureRunning() {
    if (!state.isRunning) setRunning(true);
  }

  // delta: +1 or -1 steps of 10% of the base rate. No upper or lower cap.
  function changeSpeed(delta) {
    // round to avoid floating-point drift (e.g. 0.30000000000000004)
    state.speedMultiplier = Math.round((state.speedMultiplier + delta * SPEED_STEP) * 100) / 100;
    ensureRunning();
    updateHud();
    const rate = BASE_GROWTH_RATE_PT_PER_SEC * state.speedMultiplier;
    showToast(`Expansion speed: ${rate.toFixed(2)} pt/s (${delta > 0 ? '+' : '-'}10%)`);
  }

  function resetToOriginal() {
    state.fontSize = INITIAL_FONT_SIZE_PT;
    state.rotationAngle = 0;
    state.rotationVelocity = 0;
    renderWord();
    updateHud();
    showToast('Reset to 10 pt, rotation stopped');
  }

  // direction: -1 = left (counter-clockwise), +1 = right (clockwise)
  function rotate(direction) {
    const label = direction < 0 ? 'left' : 'right';
    const currentDir = Math.sign(state.rotationVelocity);
    const speed = Math.abs(state.rotationVelocity);

    if (currentDir === 0) {
      // Not rotating: start in the requested direction at base speed
      state.rotationVelocity = direction * BASE_ROTATION_SPEED_DEG_PER_SEC;
    } else if (currentDir === direction) {
      state.rotationVelocity *= (1 + ROTATION_STEP_FACTOR);
    } else {
      // Opposite direction: slow down by 10% of current speed, but at least
      // 10% of base speed so it always reaches a stop.
      const step = Math.max(speed * ROTATION_STEP_FACTOR, BASE_ROTATION_SPEED_DEG_PER_SEC * ROTATION_STEP_FACTOR);
      const newSpeed = Math.round((speed - step) * 100) / 100;
      state.rotationVelocity = newSpeed > 0 ? currentDir * newSpeed : 0;
    }

    ensureRunning();
    updateHud();
    if (state.rotationVelocity === 0) {
      showToast('Rotation stopped');
    } else if (Math.sign(state.rotationVelocity) === direction) {
      showToast(`Rotating ${label}: ${Math.abs(state.rotationVelocity).toFixed(1)}°/s`);
    } else {
      showToast(`Rotation slowing: ${Math.abs(state.rotationVelocity).toFixed(1)}°/s`);
    }
  }

  // dx/dy: -1, 0 or +1 for the direction to scroll the view
  function scrollView(dx, dy) {
    const limits = getScrollLimits();
    const limit = dx !== 0 ? limits.x : limits.y;
    if (limit <= 0) {
      showToast('Text fits on screen in that direction');
      return;
    }
    state.scrollX += dx * window.innerWidth * SCROLL_STEP_FRACTION;
    state.scrollY += dy * window.innerHeight * SCROLL_STEP_FRACTION;
    renderWord();
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
        changeSpeed(1);
        break;

      case 'ArrowDown':
        e.preventDefault();
        changeSpeed(-1);
        break;

      case 'Enter':
        e.preventDefault();
        resetToOriginal();
        break;

      case 'ArrowLeft':
        e.preventDefault();
        rotate(-1);
        break;

      case 'ArrowRight':
        e.preventDefault();
        rotate(1);
        break;

      case 'KeyW':
        e.preventDefault();
        scrollView(0, -1);
        break;

      case 'KeyS':
        e.preventDefault();
        scrollView(0, 1);
        break;

      case 'KeyA':
        e.preventDefault();
        scrollView(-1, 0);
        break;

      case 'KeyD':
        e.preventDefault();
        scrollView(1, 0);
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
    resetToOriginal();
  });

  // --- Initialization ---
  const hasCustomWord = initWordFromUrl();
  renderWord();
  updateHud();
  if (hasCustomWord) {
    toggleStartPause(); // start running as if Space had been pressed
  }
  window.addEventListener('resize', renderWord);
  animFrameId = requestAnimationFrame(animationTick);
})();

