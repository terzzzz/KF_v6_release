/**
 * Character Selection Screen, BGM Manager, Match Preparation & Credits Modal
 * Path: js/vs_select.js
 */

(function (window) {
  'use strict';

  window.selectionBGM = window.selectionBGM || null;
  window.battleBGM = window.battleBGM || null;
  window.currentVolume = typeof window.currentVolume === 'number' ? window.currentVolume : 0.5;

  const SELECTION_BGM_TRACKS = [
    'assets/sounds/matchup.mp3',
    'assets/sounds/matchup1.mp3',
    'assets/sounds/matchup2.mp3'
  ];

  const DIFF_LABELS = {
    easy: 'Rugrat',
    balanced: 'All-rounder',
    master: 'Geek',
    soul: 'Monomaniac',
    rider: 'Rider'
  };

  /*
   * Add more IDs here when their RIDER models are ready.
   * This controls selection availability, not checkpoint validation.
   */
  const RIDER_READY_IDS = new Set([
    'ichigo',
    'nigo',
    'v3',
    'riderman'
  ]);

  function riderLevelAvailable(rider) {
    return RIDER_READY_IDS.has(rider?.id);
  }

  function difficultyOptions(rider) {
    const options = [
      'easy',
      'balanced',
      'master',
      'soul'
    ];

    if (riderLevelAvailable(rider)) {
      options.push('rider');
    }

    return options;
  }

  function normalizeSelectedDifficulty(value, rider) {
    let difficulty = String(value || 'balanced').toLowerCase();

    if (difficulty === 'mcts') {
      difficulty = 'rider';
    }

    if (!Object.prototype.hasOwnProperty.call(
      DIFF_LABELS,
      difficulty
    )) {
      difficulty = 'balanced';
    }

    if (
      difficulty === 'rider' &&
      !riderLevelAvailable(rider)
    ) {
      return 'soul';
    }

    return difficulty;
  }

  /*
   * Static rainbow text and Credits Modal UI styling.
   */
  function installRiderBadgeStyles() {
    if (document.getElementById('kf-rider-badge-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'kf-rider-badge-styles';

    style.textContent = `
      #p1-diff-display.rider,
      #p2-diff-display.rider {
        border-color: #e0a6ff;
        box-shadow: 0 0 10px rgba(187, 100, 255, 0.3);
      }

      .kf-rider-rainbow {
        display: inline-block;
        color: #ffe17d;
        font-weight: 900;
        letter-spacing: 0.08em;
      }

      @supports ((background-clip: text) or (-webkit-background-clip: text)) {
        .kf-rider-rainbow {
          background-image: linear-gradient(
            90deg,
            #ff6b8b 0%,
            #ffac60 17%,
            #fff176 33%,
            #78ff9c 50%,
            #6ee7ff 67%,
            #a7a0ff 83%,
            #f58bff 100%
          );

          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }
      }

      @media (forced-colors: active) {
        .kf-rider-rainbow {
          background: none;
          color: ButtonText;
          -webkit-text-fill-color: ButtonText;
        }
      }

      /* Floating Credits Button */
      .credits-btn-trigger {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 99;
        padding: 8px 16px;
        background: rgba(10, 15, 25, 0.85);
        border: 1.5px solid #00ffcc;
        color: #00ffcc;
        font-family: inherit;
        font-size: 0.85rem;
        font-weight: bold;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        border-radius: 4px;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(0, 255, 204, 0.3);
        transition: all 0.2s ease;
      }

      .credits-btn-trigger:hover {
        background: #00ffcc;
        color: #000000;
        box-shadow: 0 0 14px rgba(0, 255, 204, 0.7);
      }

      /* Credits Modal Front Layer */
      .credits-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(5, 8, 15, 0.92);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        padding: 20px;
        box-sizing: border-box;
      }

      .credits-modal-card {
        background: #0d1117;
        border: 2px solid #00ffcc;
        box-shadow: 0 0 25px rgba(0, 255, 204, 0.4);
        border-radius: 8px;
        width: 100%;
        max-width: 580px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .credits-modal-body {
        padding: 24px;
        overflow-y: auto;
        color: #e6edf3;
        font-family: monospace, 'Courier New', Courier, sans-serif;
        font-size: 0.88rem;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .credits-modal-footer {
        padding: 12px 24px;
        background: #161b22;
        border-top: 1px solid rgba(0, 255, 204, 0.2);
        text-align: right;
      }

      .credits-close-btn {
        padding: 8px 20px;
        background: #00ffcc;
        border: none;
        color: #05080f;
        font-weight: bold;
        font-family: inherit;
        font-size: 0.9rem;
        border-radius: 4px;
        cursor: pointer;
        transition: transform 0.1s ease, background-color 0.2s ease;
      }

      .credits-close-btn:hover {
        background: #78ff9c;
        transform: scale(1.03);
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  installRiderBadgeStyles();

  // Default fallback roster definitions
  window.AVAILABLE_RIDERS = window.AVAILABLE_RIDERS || [
    { id: 'ichigo', name: 'Kamen Rider Ichigo', icon: 'assets/images/icons/ichigo.png', maxLp: 3000 },
    { id: 'nigo', name: 'Kamen Rider Nigo', icon: 'assets/images/icons/nigo.png', maxLp: 3300 },
    { id: 'v3', name: 'Kamen Rider V3', icon: 'assets/images/icons/v3.png', maxLp: 3150 },
    { id: 'riderman', name: 'Riderman', icon: 'assets/images/icons/riderman.png', maxLp: 2800 },
    { id: 'x', name: 'Kamen Rider X', icon: 'assets/images/icons/x.png', maxLp: 3100 }
  ];

  // Global VS Selection state controller
  window.vsSelectionState = window.vsSelectionState || {
    step: 1,           // Step 1: P1 Select, Step 2: P2 Select, Step 3: Ready
    p1Index: 0,
    p1IsCPU: false,
    p1Difficulty: 'balanced',
    p2Index: 1,
    p2IsCPU: true,
    p2Difficulty: 'balanced'
  };

  /** Displays the Game Credits modal overlay. */
  window.showCreditsModal = function () {
    if (document.getElementById('credits-modal-overlay')) return;

    const creditsText = `Thank you for playing!! I sincerely wish you a joyful game experience and able to beat all Riders in rider mode!!

========================================
              GAME CREDITS
========================================

Dedicated to the heroes who taught us the meaning of  Henshin!!

[ Kamen Fight]
A Game By Terence Cheng

----------------------------------------
CREATED & DEVELOPED BY
----------------------------------------
Lead Developer:       Terence Cheng
Game Designer:       Terence Cheng
Programming:           Terence Cheng

----------------------------------------
ART & ANIMATION
----------------------------------------
Lead Artist:          Terence Cheng
UI / UX Design:       Terence Cheng
Asset Packs:         Terence Cheng

----------------------------------------
AUDIO & MUSIC
----------------------------------------
Composer:            Terence Cheng 


----------------------------------------
SPECIAL THANKS
----------------------------------------
- Friends of Terence Cheng
- All of my game testers

========================================
   Thank you for playing!
   © 2026 
========================================`;

    const overlay = document.createElement('div');
    overlay.id = 'credits-modal-overlay';
    overlay.className = 'credits-modal-overlay';

    const card = document.createElement('div');
    card.className = 'credits-modal-card';

    const body = document.createElement('div');
    body.className = 'credits-modal-body';
    body.textContent = creditsText;

    const footer = document.createElement('div');
    footer.className = 'credits-modal-footer';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'credits-close-btn';
    closeBtn.textContent = 'CLOSE';
    closeBtn.onclick = function () {
      window.hideCreditsModal();
    };

    footer.appendChild(closeBtn);
    card.appendChild(body);
    card.appendChild(footer);
    overlay.appendChild(card);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        window.hideCreditsModal();
      }
    });

    document.body.appendChild(overlay);
  };

  /** Removes the Game Credits modal overlay. */
  window.hideCreditsModal = function () {
    const overlay = document.getElementById('credits-modal-overlay');
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };

  /** Inserts the Credits button into the VS Selection screen UI. */
  function ensureCreditsButton() {
    let btn = document.getElementById('credits-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'credits-btn';
      btn.type = 'button';
      btn.className = 'credits-btn-trigger';
      btn.textContent = 'CREDITS';
      btn.onclick = window.showCreditsModal;

      const selectScreen = document.getElementById('vs-select-screen');
      if (selectScreen) {
        selectScreen.appendChild(btn);
      } else {
        document.body.appendChild(btn);
      }
    }
  }

  /** Applies difficulty badge styling classes to UI element. */
  function setDiffBadgeClasses(el, difficulty, isCPU) {
    if (!el) return;

    el.classList.remove(
      'easy',
      'normal',
      'balanced',
      'hard',
      'master',
      'soul',
      'rider'
    );

    if (!isCPU) return;

    const name = Object.prototype.hasOwnProperty.call(
      DIFF_LABELS,
      difficulty
    )
      ? difficulty
      : 'balanced';

    el.classList.add(name);

    if (name === 'rider') {
      const label = document.createElement('span');
      label.className = 'kf-rider-rainbow';
      label.textContent = DIFF_LABELS.rider;

      el.replaceChildren(label);
    }
  }

  /** Toggles active/locked highlight styles on selection cards. */
  function setCardSlotClasses(cardEl, isActive) {
    if (!cardEl) return;
    if (isActive) {
      cardEl.classList.add('active-slot');
      cardEl.classList.remove('locked-slot');
    } else {
      cardEl.classList.add('locked-slot');
      cardEl.classList.remove('active-slot');
    }
  }

  /** Advances selection wizard step state forward. */
  window.confirmStep = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const state = window.vsSelectionState;
    let currentStep = parseInt(state.step, 10) || 1;

    if (currentStep === 1) {
      state.step = 2;
    } else if (currentStep ===
