/**
 * Character Selection Screen, BGM Manager & Match Preparation
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

  // Candidate paths for the Credits QR code image (tries in order)
  const CREDITS_QR_PATHS = [
    'assets/images/bmc_qr.png',
    'assets/images/bmc_qr.jpg',
    'assets/images/qr.png',
    'assets/images/qr.jpg',
    'bmc_qr.png',
    'qr.png'
  ];

  const CREDITS_CONTENT = [
    'Thank you for playing!! I sincerely wish you a joyful game experience and able to beat all Riders in rider mode!!',
    '',
    '========================================',
    'GAME CREDITS',
    '========================================',
    '',
    'Dedicated to the heroes who taught us the meaning of Henshin!!',
    '',
    '[ Kamen Fight]',
    'A Game By Terence Cheng',
    '',
    '----------------------------------------',
    'CREATED & DEVELOPED BY',
    '----------------------------------------',
    'Lead Developer: Terence Cheng',
    'Game Designer: Terence Cheng',
    'Programming: Terence Cheng',
    '',
    '----------------------------------------',
    'ART & ANIMATION',
    '----------------------------------------',
    'Lead Artist: Terence Cheng',
    'UI / UX Design: Terence Cheng',
    'Asset Packs: Terence Cheng',
    '',
    '----------------------------------------',
    'AUDIO & MUSIC',
    '----------------------------------------',
    'Composer: Terence Cheng',
    '',
    '',
    '----------------------------------------',
    'SPECIAL THANKS',
    '----------------------------------------',
    '    Friends of Terence Cheng',
    '    All of my game testers ',
    '',
    '========================================',
    'Thank you for playing!',
    '© 2026',
    '========================================'
  ].join('\n');

  const HOW_TO_PLAY_HTML = `
    <div class="kf-howto-content">
      <h2 class="kf-howto-main-title">HOW TO PLAY</h2>

      <div class="kf-howto-section">
        <h3>1. Select Your Rider &amp; Match Setup</h3>
        <p>Pick your Kamen Rider (Ichigo, Nigo, V3, etc..) on the character selection screen. Choose whether to battle a friend (support in later version) or face off against CPU opponents ranging from rugrat (easy) to geek (red).</p>
      </div>

      <div class="kf-howto-section">
        <h3>2. Learn the Combat Controls</h3>
        <p>Every action requires combining a <strong>Direction Key</strong> (to choose move type and build charge) with an <strong>Action Key</strong> (to execute the move).</p>

        <div class="kf-howto-table-wrap">
          <table class="kf-howto-table">
            <thead>
              <tr>
                <th>Direction Key</th>
                <th>Stance Type</th>
                <th>Action Buttons (I, J, K, L) Outcome</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="kf-key-cell">W Key</td>
                <td class="kf-stance-cell">Utility &amp; Buffs</td>
                <td>High Jumps, Speed Enhancements, Attack Focus, and Stun Recovery</td>
              </tr>
              <tr>
                <td class="kf-key-cell">D Key</td>
                <td class="kf-stance-cell">Physical Attacks</td>
                <td>Quick Punches, Kicks, and Combos that generate extra CHI</td>
              </tr>
              <tr>
                <td class="kf-key-cell">S Key</td>
                <td class="kf-stance-cell">Special Moves</td>
                <td>Heavy Finisher Attacks (e.g., Rider Kick, Rider Punch, etc..)</td>
              </tr>
              <tr>
                <td class="kf-key-cell">A Key</td>
                <td class="kf-stance-cell">Defensive Guard</td>
                <td>Shields and Blocks to reduce incoming damage and absorb bonus CHI.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="kf-howto-section">
        <h3>3. General Strategy</h3>
        <ul class="kf-howto-list">
          <li><strong>Hold a Direction Key:</strong> Hold W, A, S, or D to charge your power up to 100%.</li>
          <li><strong>Lock in Your Move:</strong> Press I, J, K, or L before the decision timer expires to confirm your action.</li>
          <li><strong>Build CHI with Basic Strikes:</strong> Use D-Stance physical attacks to hit your opponent and quickly fill your CHI meter.</li>
          <li><strong>Guard Incoming Threats:</strong> Use A-Stance blocks to reduce damage when you suspect your opponent is preparing a large attack.</li>
          <li><strong>Unleash Finishers:</strong> Once your CHI meter is high, use S-Stance to deal big damage to KO your opponent.</li>
        </ul>
      </div>
    </div>
  `;

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
   * Static rainbow text + Credits & How-To-Play links & upper-layer modal styles.
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

      /* --- Credits Link (Bottom Right) --- */
      .kf-credits-link {
        position: fixed;
        bottom: 14px;
        right: 18px;
        z-index: 120;
        background: rgba(15, 18, 28, 0.88);
        color: #ffe17d;
        border: 1px solid rgba(255, 225, 125, 0.55);
        border-radius: 6px;
        padding: 6px 14px;
        font-family: inherit;
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        text-decoration: underline;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
        transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease;
      }

      .kf-credits-link:hover,
      .kf-credits-link:focus-visible {
        background: rgba(35, 42, 64, 0.96);
        border-color: #ffffff;
        color: #ffffff;
        transform: translateY(-1px);
        outline: none;
      }

      /* --- How To Play Link (Just Below BGM Tune-Bar at Top Right) --- */
      .kf-howto-link {
        position: absolute;
        top: calc(max(8px, env(safe-area-inset-top, 0px)) + 28px);
        right: max(12px, env(safe-area-inset-right, 0px));
        z-index: 120;
        background: rgba(15, 18, 28, 0.92);
        color: #00ffcc;
        border: 1px solid rgba(0, 255, 204, 0.7);
        border-radius: 6px;
        padding: 5px 12px;
        font-family: inherit;
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        text-decoration: underline;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 255, 204, 0.25), 0 2px 8px rgba(0, 0, 0, 0.6);
        transition: transform 0.12s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      }

      .kf-howto-link:hover,
      .kf-howto-link:focus-visible {
        background: rgba(0, 255, 204, 0.18);
        border-color: #ffffff;
        color: #ffffff;
        box-shadow: 0 0 14px rgba(0, 255, 204, 0.55);
        transform: translateY(-1px);
        outline: none;
      }

      @media (orientation: portrait) {
        .kf-howto-link {
          top: calc(max(6px, env(safe-area-inset-top, 0px)) + 22px);
          right: max(8px, env(safe-area-inset-right, 0px));
          font-size: 0.7rem;
          padding: 4px 9px;
        }
      }

      /* --- Upper Layer Modal Shared Styles --- */
      .kf-credits-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(5, 7, 12, 0.86);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
      }

      .kf-credits-modal-backdrop[hidden] {
        display: none !important;
      }

      .kf-credits-modal-card {
        width: min(680px, 94vw);
        max-height: 86vh;
        background: linear-gradient(180deg, #141926 0%, #0b0e17 100%);
        border: 2px solid #ffe17d;
        border-radius: 12px;
        box-shadow: 0 0 28px rgba(0, 0, 0, 0.9), 0 0 16px rgba(255, 225, 125, 0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #f4f6fb;
      }

      .kf-howto-modal-card {
        border-color: #00ffcc;
        box-shadow: 0 0 28px rgba(0, 0, 0, 0.9), 0 0 16px rgba(0, 255, 204, 0.25);
      }

      .kf-credits-modal-body {
        padding: 20px 24px;
        overflow-y: auto;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .kf-credits-qr-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      }

      .kf-credits-qr-img {
        width: clamp(140px, 32vw, 185px);
        height: clamp(140px, 32vw, 185px);
        object-fit: contain;
        background: #ffffff;
        padding: 8px;
        border-radius: 12px;
        border: 2px solid #ffe17d;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.65);
        display: block;
      }

      .kf-credits-pre {
        width: 100%;
        margin: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: clamp(0.78rem, 1.8vw, 0.95rem);
        line-height: 1.55;
        white-space: pre-wrap;
        word-break: break-word;
        text-align: center;
        color: #f4f6fb;
      }

      /* --- How To Play Content Formatting --- */
      .kf-howto-content {
        width: 100%;
        text-align: left;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: clamp(0.78rem, 1.8vw, 0.92rem);
        line-height: 1.55;
        color: #e2e8f0;
      }

      .kf-howto-main-title {
        text-align: center;
        color: #ffcc00;
        font-size: clamp(1.1rem, 2.8vw, 1.4rem);
        letter-spacing: 0.1em;
        margin: 0 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(0, 255, 204, 0.35);
        text-shadow: 0 0 8px rgba(255, 204, 0, 0.45);
      }

      .kf-howto-section {
        margin-bottom: 16px;
      }

      .kf-howto-section h3 {
        color: #00ffcc;
        font-size: clamp(0.88rem, 2vw, 1.02rem);
        margin: 0 0 6px 0;
      }

      .kf-howto-section p {
        margin: 0 0 8px 0;
        color: #f4f6fb;
      }

      .kf-howto-table-wrap {
        width: 100%;
        overflow-x: auto;
        margin-top: 8px;
      }

      .kf-howto-table {
        width: 100%;
        border-collapse: collapse;
        font-size: clamp(0.72rem, 1.7vw, 0.86rem);
        background: rgba(10, 14, 23, 0.75);
        border: 1px solid rgba(0, 255, 204, 0.4);
      }

      .kf-howto-table th,
      .kf-howto-table td {
        border: 1px solid rgba(0, 255, 204, 0.28);
        padding: 8px 10px;
        text-align: left;
        vertical-align: top;
      }

      .kf-howto-table th {
        background: rgba(0, 255, 204, 0.14);
        color: #ffcc00;
        font-weight: 800;
      }

      .kf-howto-table .kf-key-cell {
        color: #00ffcc;
        font-weight: 800;
        white-space: nowrap;
      }

      .kf-howto-table .kf-stance-cell {
        color: #ffe17d;
        font-weight: 700;
        white-space: nowrap;
      }

      .kf-howto-list {
        margin: 6px 0 0 0;
        padding-left: 18px;
      }

      .kf-howto-list li {
        margin-bottom: 6px;
      }

      .kf-howto-list strong {
        color: #ffe17d;
      }

      .kf-credits-modal-footer {
        padding: 12px 20px 16px;
        border-top: 1px solid rgba(255, 225, 125, 0.22);
        display: flex;
        justify-content: center;
        background: rgba(8, 10, 16, 0.9);
      }

      .kf-credits-ok-btn {
        min-width: 130px;
        padding: 9px 28px;
        font-family: inherit;
        font-size: 0.95rem;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #111520;
        background: linear-gradient(180deg, #ffe793 0%, #f5b935 100%);
        border: 2px solid #fff3c4;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 3px 12px rgba(245, 185, 53, 0.35);
        transition: transform 0.12s ease, filter 0.15s ease;
      }

      .kf-credits-ok-btn:hover,
      .kf-credits-ok-btn:focus-visible {
        filter: brightness(1.08);
        transform: translateY(-1px);
        outline: none;
      }

      .kf-credits-ok-btn:active {
        transform: translateY(0);
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  installRiderBadgeStyles();

  /** Opens the upper-layer Credits modal on the VS Selection screen. */
  window.openCreditsModal = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    if (typeof window.closeHowToPlayModal === 'function') {
      window.closeHowToPlayModal();
    }

    ensureCreditsUI();

    const modal = document.getElementById('kf-credits-modal');
    if (!modal) return;

    modal.hidden = false;
    modal.style.display = 'flex';

    const body = modal.querySelector('.kf-credits-modal-body');
    if (body) body.scrollTop = 0;

    const okBtn = document.getElementById('kf-credits-ok-btn');
    if (okBtn) okBtn.focus();
  };

  /** Closes the Credits modal and returns focus to the VS Selection screen. */
  window.closeCreditsModal = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const modal = document.getElementById('kf-credits-modal');
    if (!modal) return;

    modal.hidden = true;
    modal.style.display = 'none';
  };

  /** Opens the upper-layer How To Play modal on the VS Selection screen. */
  window.openHowToPlayModal = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    if (typeof window.closeCreditsModal === 'function') {
      window.closeCreditsModal();
    }

    ensureHowToPlayUI();

    const modal = document.getElementById('kf-howto-modal');
    if (!modal) return;

    modal.hidden = false;
    modal.style.display = 'flex';

    const body = modal.querySelector('.kf-credits-modal-body');
    if (body) body.scrollTop = 0;

    const okBtn = document.getElementById('kf-howto-ok-btn');
    if (okBtn) okBtn.focus();
  };

  /** Closes the How To Play modal and returns focus to the VS Selection screen. */
  window.closeHowToPlayModal = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const modal = document.getElementById('kf-howto-modal');
    if (!modal) return;

    modal.hidden = true;
    modal.style.display = 'none';
  };

  /** Ensures the Credits link and upper-layer modal exist inside #vs-select-screen. */
  function ensureCreditsUI() {
    const selectScreen = document.getElementById('vs-select-screen');
    if (!selectScreen) return;

    // 1. Ensure Credits trigger link exists
    let linkBtn =
      document.getElementById('kf-credits-link') ||
      document.getElementById('credits-btn');

    if (!linkBtn) {
      linkBtn = document.createElement('button');
      linkBtn.id = 'kf-credits-link';
      linkBtn.type = 'button';
      linkBtn.className = 'kf-credits-link';
      linkBtn.textContent = 'CREDITS';
      selectScreen.appendChild(linkBtn);
    }

    if (!linkBtn.dataset.kfCreditsBound) {
      linkBtn.addEventListener('click', window.openCreditsModal);
      linkBtn.dataset.kfCreditsBound = '1';
    }

    // 2. Ensure upper-layer Credits modal exists
    let modal = document.getElementById('kf-credits-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'kf-credits-modal';
      modal.className = 'kf-credits-modal-backdrop';
      modal.hidden = true;
      modal.style.display = 'none';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Game Credits');

      const card = document.createElement('div');
      card.className = 'kf-credits-modal-card';

      const body = document.createElement('div');
      body.className = 'kf-credits-modal-body';

      // QR Code at the start of the Credits prompt
      const qrWrap = document.createElement('div');
      qrWrap.className = 'kf-credits-qr-wrap';

      const qrImg = document.createElement('img');
      qrImg.id = 'kf-credits-qr-img';
      qrImg.className = 'kf-credits-qr-img';
      qrImg.alt = 'Support QR Code';
      qrImg.dataset.pathIndex = '0';
      qrImg.src = CREDITS_QR_PATHS[0];

      // Automatic fallback through candidate paths if named differently
      qrImg.addEventListener('error', function () {
        const nextIdx = (parseInt(qrImg.dataset.pathIndex, 10) || 0) + 1;
        if (nextIdx < CREDITS_QR_PATHS.length) {
          qrImg.dataset.pathIndex = String(nextIdx);
          qrImg.src = CREDITS_QR_PATHS[nextIdx];
        } else {
          qrWrap.style.display = 'none';
        }
      });

      qrWrap.appendChild(qrImg);
      body.appendChild(qrWrap);

      const pre = document.createElement('pre');
      pre.className = 'kf-credits-pre';
      pre.textContent = CREDITS_CONTENT;

      body.appendChild(pre);

      const footer = document.createElement('div');
      footer.className = 'kf-credits-modal-footer';

      const okBtn = document.createElement('button');
      okBtn.id = 'kf-credits-ok-btn';
      okBtn.type = 'button';
      okBtn.className = 'kf-credits-ok-btn';
      okBtn.textContent = 'OK';
      okBtn.addEventListener('click', window.closeCreditsModal);

      footer.appendChild(okBtn);
      card.appendChild(body);
      card.appendChild(footer);
      modal.appendChild(card);

      // Clicking outside the card closes the modal
      modal.addEventListener('click', function (event) {
        if (event.target === modal) {
          window.closeCreditsModal(event);
        }
      });

      selectScreen.appendChild(modal);
    }
  }

  /** Ensures the How To Play link (below BGM slider) and upper-layer modal exist inside #vs-select-screen. */
  function ensureHowToPlayUI() {
    const selectScreen = document.getElementById('vs-select-screen');
    if (!selectScreen) return;

    // 1. Ensure How To Play trigger link exists just below BGM tune-bar
    let linkBtn =
      document.getElementById('kf-howto-link') ||
      document.getElementById('how-to-play-btn');

    if (!linkBtn) {
      linkBtn = document.createElement('button');
      linkBtn.id = 'kf-howto-link';
      linkBtn.type = 'button';
      linkBtn.className = 'kf-howto-link';
      linkBtn.textContent = 'HOW TO PLAY';
      selectScreen.appendChild(linkBtn);
    }

    if (!linkBtn.dataset.kfHowtoBound) {
      linkBtn.addEventListener('click', window.openHowToPlayModal);
      linkBtn.dataset.kfHowtoBound = '1';
    }

    // 2. Ensure upper-layer How To Play modal exists
    let modal = document.getElementById('kf-howto-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'kf-howto-modal';
      modal.className = 'kf-credits-modal-backdrop';
      modal.hidden = true;
      modal.style.display = 'none';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'How To Play');

      const card = document.createElement('div');
      card.className = 'kf-credits-modal-card kf-howto-modal-card';

      const body = document.createElement('div');
      body.className = 'kf-credits-modal-body';
      body.innerHTML = HOW_TO_PLAY_HTML;

      const footer = document.createElement('div');
      footer.className = 'kf-credits-modal-footer';

      const okBtn = document.createElement('button');
      okBtn.id = 'kf-howto-ok-btn';
      okBtn.type = 'button';
      okBtn.className = 'kf-credits-ok-btn';
      okBtn.textContent = 'OK';
      okBtn.addEventListener('click', window.closeHowToPlayModal);

      footer.appendChild(okBtn);
      card.appendChild(body);
      card.appendChild(footer);
      modal.appendChild(card);

      // Clicking outside the card closes the modal
      modal.addEventListener('click', function (event) {
        if (event.target === modal) {
          window.closeHowToPlayModal(event);
        }
      });

      selectScreen.appendChild(modal);
    }
  }

  // Close Credits or How To Play modal on Escape or Enter key
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' && event.key !== 'Enter') return;

    const creditsModal = document.getElementById('kf-credits-modal');
    if (creditsModal && !creditsModal.hidden) {
      window.closeCreditsModal(event);
    }

    const howtoModal = document.getElementById('kf-howto-modal');
    if (howtoModal && !howtoModal.hidden) {
      window.closeHowToPlayModal(event);
    }
  });

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
    } else if (currentStep === 2) {
      state.step = 3;
    }
    window.updateSelectionUI();
  };

  /** Reverts selection wizard step state backward. */
  window.goBackStep = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const state = window.vsSelectionState;
    let currentStep = parseInt(state.step, 10) || 1;

    if (currentStep === 2) {
      state.step = 1;
    } else if (currentStep === 3) {
      state.step = 2;
    }
    window.updateSelectionUI();
  };

  // Step confirmation alias mappings
  window.handleConfirmStep = window.confirmStep;
  window.handleBackStep = window.goBackStep;

  window.confirmP1 = function(e) { window.vsSelectionState.step = 2; window.updateSelectionUI(); };
  window.confirmP2 = function(e) { window.vsSelectionState.step = 3; window.updateSelectionUI(); };
  window.confirmSelection = window.confirmStep;
  window.nextStep = window.confirmStep;
  window.confirmP1Selection = window.confirmP1;
  window.confirmP2Selection = window.confirmP2;

  /** Updates audio background track volume. */
  window.changeBGMVolume = function(val) {
    window.currentVolume = parseFloat(val);
    if (window.selectionBGM) window.selectionBGM.volume = window.currentVolume;
    if (window.battleBGM) window.battleBGM.volume = window.currentVolume;
  };

  /** Plays background music for character selection screen. */
  window.playSelectionBGM = function() {
    if (window.selectionBGM) return;
    try {
      const randomIndex = Math.floor(Math.random() * SELECTION_BGM_TRACKS.length);
      const randomTrack = SELECTION_BGM_TRACKS[randomIndex];

      window.selectionBGM = new Audio(randomTrack);
      window.selectionBGM.loop = true;
      window.selectionBGM.volume = window.currentVolume;
      const playPromise = window.selectionBGM.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
    } catch (e) {
      console.warn("Audio load error:", e);
    }
  };

  /** Stops selection screen background music. */
  window.stopSelectionBGM = function() {
    if (window.selectionBGM) {
      try {
        window.selectionBGM.pause();
        window.selectionBGM.currentTime = 0;
      } catch (e) {}
      window.selectionBGM = null;
    }
  };

  /** Plays background music for live battle screen. */
  window.playBattleBGM = function() {
    if (window.battleBGM) return;
    try {
      window.battleBGM = new Audio('assets/sounds/matchup1.mp3');
      window.battleBGM.loop = true;
      window.battleBGM.volume = window.currentVolume;
      const playPromise = window.battleBGM.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
    } catch (e) {
      console.warn("Audio load error:", e);
    }
  };

  /** Stops battle background music. */
  window.stopBattleBGM = function() {
    if (window.battleBGM) {
      try {
        window.battleBGM.pause();
        window.battleBGM.currentTime = 0;
      } catch (e) {}
      window.battleBGM = null;
    }
  };

  /** Cycles active rider selection index for P1 or P2. */
  window.cycleRider = function(playerKey, direction) {
    const riders = window.AVAILABLE_RIDERS;
    const state = window.vsSelectionState;
    const currentStep = parseInt(state.step, 10) || 1;
    if (!riders || riders.length === 0) return;

    if (playerKey === 'p1' && currentStep === 1) {
      state.p1Index = (state.p1Index + direction + riders.length) % riders.length;
    } else if (playerKey === 'p2' && currentStep === 2) {
      state.p2Index = (state.p2Index + direction + riders.length) % riders.length;
    }
    window.updateSelectionUI();
  };

  /** Toggles player control type between Human and CPU. */
  window.toggleControlType = function(playerKey) {
    if (playerKey !== 'p1' && playerKey !== 'p2') {
      return;
    }

    const state = window.vsSelectionState;
    const currentStep = parseInt(state.step, 10) || 1;
    const requiredStep = playerKey === 'p1' ? 1 : 2;

    if (currentStep !== requiredStep) {
      return;
    }

    state[playerKey + 'IsCPU'] = !state[playerKey + 'IsCPU'];
    window.updateSelectionUI();
  };

  /** Cycles CPU difficulty setting (easy -> balanced -> master -> soul -> [rider]). */
  window.toggleDifficulty = function(playerKey) {
    if (playerKey !== 'p1' && playerKey !== 'p2') {
      return;
    }

    const state = window.vsSelectionState;
    const riders = window.AVAILABLE_RIDERS || [];

    const currentStep = parseInt(state.step, 10) || 1;
    const requiredStep = playerKey === 'p1' ? 1 : 2;

    if (
      currentStep !== requiredStep ||
      !state[playerKey + 'IsCPU']
    ) {
      return;
    }

    const rider =
      riders[state[playerKey + 'Index']] ||
      riders[0];

    if (!rider) return;

    const options = difficultyOptions(rider);

    const current = normalizeSelectedDifficulty(
      state[playerKey + 'Difficulty'],
      rider
    );

    const index = options.indexOf(current);

    state[playerKey + 'Difficulty'] =
      options[(index + 1) % options.length];

    window.updateSelectionUI();
  };

  /** Synchronizes selection screen UI elements, controls, and card highlights with selection state. */
  window.updateSelectionUI = function() {
    ensureCreditsUI();
    ensureHowToPlayUI();

    const riders = window.AVAILABLE_RIDERS;
    const state = window.vsSelectionState;
    if (!riders || riders.length === 0) return;

    const currentStep = parseInt(state.step, 10) || 1;

    if (state.p1Index >= riders.length) state.p1Index = 0;
    if (state.p2Index >= riders.length) state.p2Index = 0;

    const p1 = riders[state.p1Index] || riders[0];
    const p2 = riders[state.p2Index] || riders[0];

    state.p1Difficulty = normalizeSelectedDifficulty(
      state.p1Difficulty,
      p1
    );

    state.p2Difficulty = normalizeSelectedDifficulty(
      state.p2Difficulty,
      p2
    );

    // P1 Display updates
    const p1ImgEl = document.getElementById('p1-img');
    if (p1ImgEl) p1ImgEl.src = p1.icon;

    const p1NameEl = document.getElementById('p1-name-display');
    if (p1NameEl) p1NameEl.textContent = p1.name;

    const p1TypeEl = document.getElementById('p1-type-display');
    if (p1TypeEl) p1TypeEl.textContent = state.p1IsCPU ? 'CPU' : 'HUMAN';

    const p1DiffDisplay = document.getElementById('p1-diff-display');
    if (p1DiffDisplay) {
      if (!state.p1IsCPU) {
        p1DiffDisplay.textContent = 'N/A';
      } else {
        p1DiffDisplay.textContent = DIFF_LABELS[state.p1Difficulty] || 'Zoomer';
      }
      setDiffBadgeClasses(p1DiffDisplay, state.p1Difficulty, state.p1IsCPU);
    }

    // P2 Display updates
    const p2ImgEl = document.getElementById('p2-img');
    if (p2ImgEl) {
      p2ImgEl.src = p2.icon;
      p2ImgEl.classList.toggle('p2-mirror-palette', p1.id === p2.id);
    }

    const p2NameEl = document.getElementById('p2-name-display');
    if (p2NameEl) p2NameEl.textContent = p2.name;

    const p2TypeEl = document.getElementById('p2-type-display');
    if (p2TypeEl) p2TypeEl.textContent = state.p2IsCPU ? 'CPU' : 'HUMAN';

    const p2DiffDisplay = document.getElementById('p2-diff-display');
    if (p2DiffDisplay) {
      if (!state.p2IsCPU) {
        p2DiffDisplay.textContent = 'N/A';
      } else {
        p2DiffDisplay.textContent = DIFF_LABELS[state.p2Difficulty] || 'Zoomer';
      }
      setDiffBadgeClasses(p2DiffDisplay, state.p2Difficulty, state.p2IsCPU);
    }

    const p1Card = document.getElementById('p1-card');
    const p2Card = document.getElementById('p2-card');
    const headerText = document.getElementById('select-step-title') || document.getElementById('vs-header-text');

    const confirmBtns = document.querySelectorAll('#confirm-btn, #confirm-p1-btn, #confirm-p2-btn, .btn-confirm, .confirm-btn');
    const startBtn = document.getElementById('start-game-btn') || document.querySelector('.btn-start');
    const backBtn = document.getElementById('back-btn') || document.querySelector('.btn-back');

    const p1LeftBtn = document.getElementById('p1-left-btn');
    const p1RightBtn = document.getElementById('p1-right-btn');
    const p2LeftBtn = document.getElementById('p2-left-btn');
    const p2RightBtn = document.getElementById('p2-right-btn');

    if (currentStep === 1) {
      if (headerText) headerText.textContent = 'STEP 1: SELECT PLAYER 1 RIDER';
      setCardSlotClasses(p1Card, true);
      setCardSlotClasses(p2Card, false);

      if (p1LeftBtn) p1LeftBtn.disabled = false;
      if (p1RightBtn) p1RightBtn.disabled = false;
      if (p2LeftBtn) p2LeftBtn.disabled = true;
      if (p2RightBtn) p2RightBtn.disabled = true;

      confirmBtns.forEach(btn => {
        btn.hidden = false;
        btn.style.display = '';
        btn.textContent = 'CONFIRM P1';
        btn.disabled = false;
      });

      if (startBtn) {
        startBtn.hidden = true;
        startBtn.style.display = 'none';
      }
      if (backBtn) backBtn.disabled = true;

    } else if (currentStep === 2) {
      if (headerText) headerText.textContent = 'STEP 2: SELECT PLAYER 2 RIDER';
      setCardSlotClasses(p1Card, false);
      setCardSlotClasses(p2Card, true);

      if (p1LeftBtn) p1LeftBtn.disabled = true;
      if (p1RightBtn) p1RightBtn.disabled = true;
      if (p2LeftBtn) p2LeftBtn.disabled = false;
      if (p2RightBtn) p2RightBtn.disabled = false;

      confirmBtns.forEach(btn => {
        btn.hidden = false;
        btn.style.display = '';
        btn.textContent = 'CONFIRM P2';
        btn.disabled = false;
      });

      if (startBtn) {
        startBtn.hidden = true;
        startBtn.style.display = 'none';
      }
      if (backBtn) backBtn.disabled = false;

    } else if (currentStep === 3) {
      if (headerText) headerText.textContent = 'READY FOR BATTLE!';
      setCardSlotClasses(p1Card, true);
      setCardSlotClasses(p2Card, true);

      if (p1LeftBtn) p1LeftBtn.disabled = true;
      if (p1RightBtn) p1RightBtn.disabled = true;
      if (p2LeftBtn) p2LeftBtn.disabled = true;
      if (p2RightBtn) p2RightBtn.disabled = true;

      confirmBtns.forEach(btn => {
        btn.hidden = true;
        btn.style.display = 'none';
      });

      if (startBtn) {
        startBtn.hidden = false;
        startBtn.style.display = '';
        startBtn.disabled = false;
      }
      if (backBtn) backBtn.disabled = false;
    }
  };

  /** Validates selection state and transitions to live battle mode via startBattle(). */
  window.validateAndStartMatch = function() {
    window.closeCreditsModal();
    window.closeHowToPlayModal();

    if (typeof window.unlockMobileVideos === 'function') {
      window.unlockMobileVideos();
    }

    window.stopSelectionBGM();
    window.playBattleBGM();

    const selectScreen = document.getElementById('vs-select-screen');
    const battleScreen = document.getElementById('battle-screen');

    if (selectScreen) selectScreen.hidden = true;
    if (battleScreen) battleScreen.hidden = false;

    const riders = window.AVAILABLE_RIDERS;
    const state = window.vsSelectionState;

    const matchConfig = {
      p1Rider: riders[state.p1Index] || riders[0],
      p1IsCPU: state.p1IsCPU,
      p1Difficulty: state.p1IsCPU ? state.p1Difficulty : 'balanced',
      p2Rider: riders[state.p2Index] || riders[0],
      p2IsCPU: state.p2IsCPU,
      p2Difficulty: state.p2IsCPU ? state.p2Difficulty : 'balanced'
    };

    if (typeof window.startBattle === 'function') {
      window.startBattle(matchConfig);
    }
  };

  // Step confirm button click listener
  document.addEventListener('click', (e) => {
    const p1Btn = e.target.closest('#confirm-p1-btn, #btn-confirm-p1');
    if (p1Btn) {
      window.vsSelectionState.step = 2;
      window.updateSelectionUI();
      return;
    }

    const p2Btn = e.target.closest('#confirm-p2-btn, #btn-confirm-p2');
    if (p2Btn) {
      window.vsSelectionState.step = 3;
      window.updateSelectionUI();
      return;
    }
  });

  // DOM initialization and roster fetching
  document.addEventListener('DOMContentLoaded', async () => {
    const selectScreen = document.getElementById('vs-select-screen');
    const battleScreen = document.getElementById('battle-screen');
    if (selectScreen) selectScreen.hidden = false;
    if (battleScreen) battleScreen.hidden = true;

    ensureCreditsUI();
    ensureHowToPlayUI();

    try {
      const res = await fetch('data/riders.json');
      if (res.ok) {
        const allRiders = await res.json();
        const activeRiders = allRiders.filter(r => r.active === true);
        if (activeRiders.length > 0) {
          window.AVAILABLE_RIDERS = activeRiders;
        }
      }
    } catch (err) {
      console.warn("Could not load riders.json, defaulting to fallback roster.");
    }

    window.updateSelectionUI();

    const unlockAudio = () => {
      window.playSelectionBGM();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);
  });

})(window);
