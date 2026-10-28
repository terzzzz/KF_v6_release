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
    '[ Kamen Fight ]',
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
    '----------------------------------------',
    'SPECIAL THANKS',
    '----------------------------------------',
    '    Friends of Terence Cheng',
    '    All of my game testers',
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
        <p>Pick your Kamen Rider on the character selection screen. Choose whether to battle a friend or face off against CPU opponents ranging from <strong>Rugrat</strong> (Easy) up to the 36-matrix neural <strong>Rider</strong> tier.</p>
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
                <td>Heavy Finisher Attacks (e.g., Rider Kick, Rider Punch, etc.)</td>
              </tr>
              <tr>
                <td class="kf-key-cell">A Key</td>
                <td class="kf-stance-cell">Defensive Guard</td>
                <td>Shields and Blocks to reduce incoming damage and absorb bonus CHI</td>
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
   * All 6 Riders (6x6 = 36 Matrix) enabled for RIDER difficulty.
   */
  const RIDER_READY_IDS = new Set([
    'ichigo',
    'nigo',
    'v3',
    'riderman',
    'x',
    'amazon'
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
   * Modern Cyber-Tokusatsu UI Theme & Component Styles
   */
  function installRiderBadgeStyles() {
    if (document.getElementById('kf-rider-badge-styles')) {
      return;
    }

    // Load modern geometric display fonts (Chakra Petch & Orbitron)
    if (!document.getElementById('kf-modern-fonts')) {
      const fontLink = document.createElement('link');
      fontLink.id = 'kf-modern-fonts';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,500;0,600;0,700;1,700&family=Orbitron:wght@600;700;800;900&display=swap';
      (document.head || document.documentElement).appendChild(fontLink);
    }

    const style = document.createElement('style');
    style.id = 'kf-rider-badge-styles';

    style.textContent = `
      :root {
        --kf-font-display: 'Orbitron', 'Chakra Petch', 'Segoe UI', system-ui, sans-serif;
        --kf-font-ui: 'Chakra Petch', 'Segoe UI', Roboto, system-ui, sans-serif;
        --kf-p1-accent: #00f0ff;
        --kf-p1-glow: rgba(0, 240, 255, 0.38);
        --kf-p2-accent: #ff2a6d;
        --kf-p2-glow: rgba(255, 42, 109, 0.38);
        --kf-gold: #ffd166;
        --kf-bg-deep: #070a12;
      }

      /* --- Screen Atmosphere & Cyber Grid --- */
      #vs-select-screen {
        font-family: var(--kf-font-ui) !important;
        background:
          radial-gradient(circle at 22% 38%, rgba(0, 240, 255, 0.13) 0%, transparent 45%),
          radial-gradient(circle at 78% 38%, rgba(255, 42, 109, 0.13) 0%, transparent 45%),
          radial-gradient(circle at 50% 10%, rgba(255, 209, 102, 0.08) 0%, transparent 40%),
          linear-gradient(180deg, #060911 0%, #0b101d 60%, #070a12 100%) !important;
        position: relative;
        overflow: hidden;
      }

      #vs-select-screen::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(0, 240, 255, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 240, 255, 0.04) 1px, transparent 1px);
        background-size: 44px 44px;
        mask-image: radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.85) 20%, transparent 80%);
        -webkit-mask-image: radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.85) 20%, transparent 80%);
        pointer-events: none;
        z-index: 0;
      }

      #vs-select-screen > * {
        position: relative;
        z-index: 1;
      }

      /* --- Header & Step Tracker --- */
      #select-step-title,
      #vs-header-text {
        font-family: var(--kf-font-display) !important;
        font-size: clamp(1.1rem, 2.2vw, 1.65rem) !important;
        font-weight: 900 !important;
        letter-spacing: 0.14em !important;
        text-transform: uppercase;
        color: #ffffff !important;
        text-shadow: 0 0 18px rgba(0, 240, 255, 0.45), 0 2px 6px rgba(0, 0, 0, 0.9) !important;
        margin-bottom: 4px !important;
      }

      .kf-step-tracker {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 4px auto 12px;
        z-index: 5;
      }

      .kf-step-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 999px;
        font-family: var(--kf-font-display);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: rgba(255, 255, 255, 0.4);
        background: rgba(15, 22, 36, 0.75);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.25s ease;
      }

      .kf-step-pill.is-active {
        color: #060911;
        background: linear-gradient(90deg, #00f0ff, #5cfbff);
        border-color: #ffffff;
        box-shadow: 0 0 14px rgba(0, 240, 255, 0.55);
        transform: scale(1.04);
      }

      .kf-step-pill.is-active.step-p2 {
        color: #ffffff;
        background: linear-gradient(90deg, #ff2a6d, #ff6b8b);
        box-shadow: 0 0 14px rgba(255, 42, 109, 0.55);
      }

      .kf-step-pill.is-active.step-ready {
        color: #060911;
        background: linear-gradient(90deg, #ffd166, #ffae00);
        box-shadow: 0 0 16px rgba(255, 209, 102, 0.65);
      }

      .kf-step-pill.is-done {
        color: #78ff9c;
        border-color: rgba(120, 255, 156, 0.4);
        background: rgba(16, 40, 32, 0.65);
      }

      .kf-step-connector {
        width: 18px;
        height: 2px;
        background: rgba(255, 255, 255, 0.14);
        border-radius: 2px;
      }

      /* --- Player Cards (#p1-card & #p2-card) --- */
      #p1-card,
      #p2-card {
        background: linear-gradient(165deg, rgba(20, 28, 46, 0.88) 0%, rgba(9, 13, 24, 0.94) 100%) !important;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-radius: 14px !important;
        padding: 14px 16px !important;
        transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
                    border-color 0.28s ease,
                    box-shadow 0.28s ease,
                    opacity 0.28s ease !important;
        position: relative;
        overflow: hidden;
      }

      #p1-card::before,
      #p2-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        opacity: 0.85;
        pointer-events: none;
      }

      #p1-card::before {
        background: linear-gradient(90deg, transparent, var(--kf-p1-accent), transparent);
      }

      #p2-card::before {
        background: linear-gradient(90deg, transparent, var(--kf-p2-accent), transparent);
      }

      #p1-card.active-slot {
        border: 2px solid var(--kf-p1-accent) !important;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.65),
                    0 0 24px var(--kf-p1-glow),
                    inset 0 0 18px rgba(0, 240, 255, 0.08) !important;
        transform: translateY(-3px);
        opacity: 1 !important;
        filter: none !important;
      }

      #p2-card.active-slot {
        border: 2px solid var(--kf-p2-accent) !important;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.65),
                    0 0 24px var(--kf-p2-glow),
                    inset 0 0 18px rgba(255, 42, 109, 0.08) !important;
        transform: translateY(-3px);
        opacity: 1 !important;
        filter: none !important;
      }

      #p1-card.locked-slot,
      #p2-card.locked-slot {
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5) !important;
        opacity: 0.52 !important;
        transform: scale(0.985);
      }

      /* --- Portrait Image Styling --- */
      #p1-img,
      #p2-img {
        border-radius: 10px !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        background: radial-gradient(circle at 50% 35%, #1f2942 0%, #090d16 100%) !important;
        box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8), 0 4px 14px rgba(0, 0, 0, 0.5) !important;
        transition: transform 0.35s ease, filter 0.35s ease !important;
      }

      #p1-card.active-slot #p1-img {
        border-color: rgba(0, 240, 255, 0.45) !important;
      }

      #p2-card.active-slot #p2-img {
        border-color: rgba(255, 42, 109, 0.45) !important;
      }

      /* --- Rider Name & Live Stat Strip --- */
      #p1-name-display,
      #p2-name-display {
        font-family: var(--kf-font-display) !important;
        font-size: clamp(0.95rem, 1.5vw, 1.2rem) !important;
        font-weight: 800 !important;
        letter-spacing: 0.06em !important;
        color: #ffffff !important;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.85);
        margin-top: 8px !important;
        margin-bottom: 2px !important;
      }

      #p1-card.active-slot #p1-name-display {
        color: #7df9ff !important;
      }

      #p2-card.active-slot #p2-name-display {
        color: #ff8da8 !important;
      }

      .kf-stat-strip {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 4px 0 8px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
      }

      .kf-stat-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #cbd5e1;
      }

      .kf-stat-chip strong {
        color: #ffd166;
        font-family: var(--kf-font-display);
      }

      .kf-stat-chip.ai-ready {
        background: rgba(187, 100, 255, 0.14);
        border-color: rgba(224, 166, 255, 0.45);
        color: #f3d5ff;
      }

      /* --- Cycle Arrow Buttons & Control Type Selector --- */
      #p1-left-btn,
      #p1-right-btn,
      #p2-left-btn,
      #p2-right-btn {
        border-radius: 8px !important;
        background: rgba(255, 255, 255, 0.07) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        color: #ffffff !important;
        font-family: var(--kf-font-display) !important;
        font-weight: 800 !important;
        transition: all 0.15s ease !important;
      }

      #p1-left-btn:hover:not(:disabled),
      #p1-right-btn:hover:not(:disabled) {
        background: rgba(0, 240, 255, 0.22) !important;
        border-color: var(--kf-p1-accent) !important;
        box-shadow: 0 0 12px var(--kf-p1-glow) !important;
        transform: translateY(-1px);
      }

      #p2-left-btn:hover:not(:disabled),
      #p2-right-btn:hover:not(:disabled) {
        background: rgba(255, 42, 109, 0.22) !important;
        border-color: var(--kf-p2-accent) !important;
        box-shadow: 0 0 12px var(--kf-p2-glow) !important;
        transform: translateY(-1px);
      }

      #p1-type-display,
      #p2-type-display {
        border-radius: 8px !important;
        font-family: var(--kf-font-display) !important;
        font-weight: 700 !important;
        letter-spacing: 0.1em !important;
        background: rgba(13, 20, 34, 0.85) !important;
        border: 1px solid rgba(255, 255, 255, 0.18) !important;
        transition: all 0.15s ease !important;
      }

      #p1-card.active-slot #p1-type-display:hover {
        border-color: var(--kf-p1-accent) !important;
        background: rgba(0, 240, 255, 0.14) !important;
      }

      #p2-card.active-slot #p2-type-display:hover {
        border-color: var(--kf-p2-accent) !important;
        background: rgba(255, 42, 109, 0.14) !important;
      }

      /* --- Difficulty Badges --- */
      #p1-diff-display,
      #p2-diff-display {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px !important;
        padding: 3px 10px !important;
        font-family: var(--kf-font-display) !important;
        font-size: 0.75rem !important;
        font-weight: 700 !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase;
        transition: all 0.18s ease !important;
      }

      #p1-diff-display.easy,
      #p2-diff-display.easy {
        color: #78ff9c !important;
        border-color: rgba(120, 255, 156, 0.55) !important;
        background: rgba(20, 60, 40, 0.5) !important;
      }

      #p1-diff-display.balanced,
      #p2-diff-display.balanced {
        color: #6ee7ff !important;
        border-color: rgba(110, 231, 255, 0.55) !important;
        background: rgba(16, 48, 68, 0.5) !important;
      }

      #p1-diff-display.master,
      #p2-diff-display.master {
        color: #ff9e64 !important;
        border-color: rgba(255, 158, 100, 0.65) !important;
        background: rgba(70, 32, 18, 0.55) !important;
      }

      #p1-diff-display.soul,
      #p2-diff-display.soul {
        color: #ff6b8b !important;
        border-color: rgba(255, 107, 139, 0.65) !important;
        background: rgba(70, 18, 38, 0.55) !important;
        box-shadow: 0 0 10px rgba(255, 107, 139, 0.25);
      }

      #p1-diff-display.rider,
      #p2-diff-display.rider {
        border-color: #e0a6ff !important;
        background: rgba(42, 18, 68, 0.72) !important;
        box-shadow: 0 0 14px rgba(187, 100, 255, 0.45) !important;
      }

      .kf-rider-rainbow {
        display: inline-block;
        color: #ffe17d;
        font-weight: 900;
        letter-spacing: 0.09em;
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
          background-size: 200% auto;
          animation: kfRainbowShift 3.5s linear infinite;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }
      }

      @keyframes kfRainbowShift {
        0% { background-position: 0% center; }
        100% { background-position: 200% center; }
      }

      @media (forced-colors: active) {
        .kf-rider-rainbow {
          background: none;
          color: ButtonText;
          -webkit-text-fill-color: ButtonText;
        }
      }

      /* --- Bottom Quick-Select Roster Dock --- */
      .kf-roster-dock {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 14px auto 8px;
        padding: 10px 18px;
        max-width: min(760px, 94vw);
        background: rgba(11, 16, 28, 0.82);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 14px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
        z-index: 10;
      }

      .kf-roster-dock-title {
        font-family: var(--kf-font-display);
        font-size: 0.66rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.55);
        margin-bottom: 8px;
      }

      .kf-roster-grid {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      .kf-roster-tile {
        position: relative;
        width: clamp(64px, 8.5vw, 84px);
        padding: 5px;
        border-radius: 10px;
        background: rgba(20, 28, 46, 0.9);
        border: 1.5px solid rgba(255, 255, 255, 0.14);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1);
        user-select: none;
      }

      .kf-roster-tile:hover {
        transform: translateY(-3px);
        border-color: rgba(255, 255, 255, 0.5);
        background: rgba(32, 44, 70, 0.95);
      }

      .kf-roster-tile.is-p1 {
        border-color: var(--kf-p1-accent);
        box-shadow: 0 0 14px var(--kf-p1-glow);
      }

      .kf-roster-tile.is-p2 {
        border-color: var(--kf-p2-accent);
        box-shadow: 0 0 14px var(--kf-p2-glow);
      }

      .kf-roster-tile.is-p1.is-p2 {
        border-color: var(--kf-gold);
        box-shadow: 0 0 16px rgba(255, 209, 102, 0.5);
      }

      .kf-roster-tile-img {
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: cover;
        border-radius: 6px;
        background: #090d16;
        display: block;
      }

      .kf-roster-tile-name {
        margin-top: 4px;
        font-family: var(--kf-font-display);
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: #e2e8f0;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .kf-roster-badges {
        position: absolute;
        top: 3px;
        left: 3px;
        right: 3px;
        display: flex;
        justify-content: space-between;
        pointer-events: none;
      }

      .kf-roster-tag {
        padding: 1px 5px;
        border-radius: 4px;
        font-family: var(--kf-font-display);
        font-size: 0.55rem;
        font-weight: 900;
        letter-spacing: 0.04em;
        line-height: 1.2;
      }

      .kf-roster-tag.p1 {
        background: var(--kf-p1-accent);
        color: #050811;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.65);
      }

      .kf-roster-tag.p2 {
        background: var(--kf-p2-accent);
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.65);
        margin-left: auto;
      }

      /* --- Bottom Action Buttons (BACK / CONFIRM / START) --- */
      #back-btn,
      .btn-back {
        font-family: var(--kf-font-display) !important;
        font-weight: 700 !important;
        letter-spacing: 0.1em !important;
        border-radius: 8px !important;
        background: rgba(20, 27, 42, 0.85) !important;
        border: 1px solid rgba(255, 255, 255, 0.22) !important;
        color: #cbd5e1 !important;
        transition: all 0.18s ease !important;
      }

      #back-btn:hover:not(:disabled),
      .btn-back:hover:not(:disabled) {
        background: rgba(40, 52, 78, 0.95) !important;
        border-color: #ffffff !important;
        color: #ffffff !important;
        transform: translateY(-1px);
      }

      #confirm-btn,
      #confirm-p1-btn,
      #confirm-p2-btn,
      .btn-confirm,
      .confirm-btn {
        font-family: var(--kf-font-display) !important;
        font-weight: 800 !important;
        letter-spacing: 0.12em !important;
        border-radius: 8px !important;
        background: linear-gradient(135deg, rgba(0, 240, 255, 0.22) 0%, rgba(0, 140, 255, 0.35) 100%) !important;
        border: 1.5px solid var(--kf-p1-accent) !important;
        color: #ffffff !important;
        box-shadow: 0 0 18px rgba(0, 240, 255, 0.3) !important;
        transition: all 0.18s ease !important;
      }

      #confirm-btn:hover:not(:disabled),
      .btn-confirm:hover:not(:disabled),
      .confirm-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #00f0ff 0%, #00a8ff 100%) !important;
        color: #050811 !important;
        box-shadow: 0 0 24px rgba(0, 240, 255, 0.65) !important;
        transform: translateY(-1px);
      }

      #start-game-btn,
      .btn-start {
        font-family: var(--kf-font-display) !important;
        font-weight: 900 !important;
        letter-spacing: 0.14em !important;
        border-radius: 8px !important;
        background: linear-gradient(135deg, #ffd166 0%, #ff9f1c 100%) !important;
        border: 2px solid #fff3c4 !important;
        color: #0b0e17 !important;
        box-shadow: 0 0 24px rgba(255, 209, 102, 0.55) !important;
        transition: all 0.18s ease !important;
      }

      #start-game-btn:hover:not(:disabled),
      .btn-start:hover:not(:disabled) {
        filter: brightness(1.08);
        box-shadow: 0 0 32px rgba(255, 209, 102, 0.85) !important;
        transform: translateY(-2px) scale(1.02);
      }

      /* --- Credits Link (Bottom Right) --- */
      .kf-credits-link {
        position: fixed;
        bottom: 14px;
        right: 18px;
        z-index: 120;
        background: rgba(15, 22, 36, 0.88);
        backdrop-filter: blur(8px);
        color: #ffd166;
        border: 1px solid rgba(255, 209, 102, 0.55);
        border-radius: 999px;
        padding: 6px 16px;
        font-family: var(--kf-font-display);
        font-size: 0.76rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        text-decoration: none;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
        transition: all 0.16s ease;
      }

      .kf-credits-link:hover,
      .kf-credits-link:focus-visible {
        background: rgba(255, 209, 102, 0.18);
        border-color: #ffffff;
        color: #ffffff;
        box-shadow: 0 0 16px rgba(255, 209, 102, 0.45);
        transform: translateY(-1px);
        outline: none;
      }

      /* --- How To Play Link (Just Below BGM Tune-Bar at Top Right) --- */
      .kf-howto-link {
        position: absolute;
        top: calc(max(8px, env(safe-area-inset-top, 0px)) + 30px);
        right: max(12px, env(safe-area-inset-right, 0px));
        z-index: 120;
        background: rgba(15, 22, 36, 0.9);
        backdrop-filter: blur(8px);
        color: #00f0ff;
        border: 1px solid rgba(0, 240, 255, 0.65);
        border-radius: 999px;
        padding: 5px 14px;
        font-family: var(--kf-font-display);
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        text-decoration: none;
        cursor: pointer;
        box-shadow: 0 0 12px rgba(0, 240, 255, 0.22), 0 2px 8px rgba(0, 0, 0, 0.6);
        transition: all 0.16s ease;
      }

      .kf-howto-link:hover,
      .kf-howto-link:focus-visible {
        background: rgba(0, 240, 255, 0.2);
        border-color: #ffffff;
        color: #ffffff;
        box-shadow: 0 0 16px rgba(0, 240, 255, 0.55);
        transform: translateY(-1px);
        outline: none;
      }

      @media (orientation: portrait), (max-height: 760px) {
        .kf-roster-dock {
          margin: 6px auto 4px;
          padding: 6px 12px;
        }
        .kf-roster-tile {
          width: clamp(50px, 7vw, 66px);
          padding: 4px;
        }
        .kf-step-tracker {
          margin: 2px auto 6px;
        }
      }

      /* --- Upper Layer Modal Shared Styles --- */
      .kf-credits-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(5, 8, 15, 0.84);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
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
        background: linear-gradient(180deg, rgba(20, 28, 46, 0.96) 0%, rgba(10, 14, 24, 0.98) 100%);
        border: 1.5px solid rgba(255, 209, 102, 0.75);
        border-radius: 16px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.9), 0 0 24px rgba(255, 209, 102, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #f4f6fb;
      }

      .kf-howto-modal-card {
        border-color: rgba(0, 240, 255, 0.75);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.9), 0 0 24px rgba(0, 240, 255, 0.2);
      }

      .kf-credits-modal-body {
        padding: 22px 26px;
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
        border: 2px solid #ffd166;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.65);
        display: block;
      }

      .kf-credits-pre {
        width: 100%;
        margin: 0;
        font-family: var(--kf-font-ui);
        font-size: clamp(0.82rem, 1.8vw, 0.96rem);
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        text-align: center;
        color: #f4f6fb;
      }

      /* --- How To Play Content Formatting --- */
      .kf-howto-content {
        width: 100%;
        text-align: left;
        font-family: var(--kf-font-ui);
        font-size: clamp(0.82rem, 1.8vw, 0.95rem);
        line-height: 1.55;
        color: #e2e8f0;
      }

      .kf-howto-main-title {
        font-family: var(--kf-font-display);
        text-align: center;
        color: #ffd166;
        font-size: clamp(1.15rem, 2.8vw, 1.45rem);
        letter-spacing: 0.12em;
        margin: 0 0 16px 0;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(0, 240, 255, 0.3);
        text-shadow: 0 0 12px rgba(255, 209, 102, 0.4);
      }

      .kf-howto-section {
        margin-bottom: 16px;
      }

      .kf-howto-section h3 {
        font-family: var(--kf-font-display);
        color: #00f0ff;
        font-size: clamp(0.9rem, 2vw, 1.04rem);
        margin: 0 0 6px 0;
        letter-spacing: 0.04em;
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
        font-size: clamp(0.76rem, 1.7vw, 0.88rem);
        background: rgba(10, 14, 23, 0.78);
        border: 1px solid rgba(0, 240, 255, 0.35);
        border-radius: 8px;
        overflow: hidden;
      }

      .kf-howto-table th,
      .kf-howto-table td {
        border: 1px solid rgba(0, 240, 255, 0.22);
        padding: 9px 12px;
        text-align: left;
        vertical-align: top;
      }

      .kf-howto-table th {
        font-family: var(--kf-font-display);
        background: rgba(0, 240, 255, 0.14);
        color: #ffd166;
        font-weight: 800;
        letter-spacing: 0.05em;
      }

      .kf-howto-table .kf-key-cell {
        font-family: var(--kf-font-display);
        color: #00f0ff;
        font-weight: 800;
        white-space: nowrap;
      }

      .kf-howto-table .kf-stance-cell {
        color: #ffd166;
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
        color: #ffd166;
      }

      .kf-credits-modal-footer {
        padding: 12px 20px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        display: flex;
        justify-content: center;
        background: rgba(8, 11, 19, 0.92);
      }

      .kf-credits-ok-btn {
        min-width: 140px;
        padding: 9px 28px;
        font-family: var(--kf-font-display);
        font-size: 0.9rem;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #0b0e17;
        background: linear-gradient(180deg, #ffe793 0%, #f5b935 100%);
        border: 2px solid #fff3c4;
        border-radius: 999px;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(245, 185, 53, 0.4);
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

    let linkBtn =
      document.getElementById('kf-credits-link') ||
      document.getElementById('credits-btn');

    if (!linkBtn) {
      linkBtn = document.createElement('button');
      linkBtn.id = 'kf-credits-link';
      linkBtn.type = 'button';
      linkBtn.className = 'kf-credits-link';
      linkBtn.textContent = '★ CREDITS';
      selectScreen.appendChild(linkBtn);
    }

    if (!linkBtn.dataset.kfCreditsBound) {
      linkBtn.addEventListener('click', window.openCreditsModal);
      linkBtn.dataset.kfCreditsBound = '1';
    }

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

      const qrWrap = document.createElement('div');
      qrWrap.className = 'kf-credits-qr-wrap';

      const qrImg = document.createElement('img');
      qrImg.id = 'kf-credits-qr-img';
      qrImg.className = 'kf-credits-qr-img';
      qrImg.alt = 'Support QR Code';
      qrImg.dataset.pathIndex = '0';
      qrImg.src = CREDITS_QR_PATHS[0];

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

    let linkBtn =
      document.getElementById('kf-howto-link') ||
      document.getElementById('how-to-play-btn');

    if (!linkBtn) {
      linkBtn = document.createElement('button');
      linkBtn.id = 'kf-howto-link';
      linkBtn.type = 'button';
      linkBtn.className = 'kf-howto-link';
      linkBtn.textContent = '? HOW TO PLAY';
      selectScreen.appendChild(linkBtn);
    }

    if (!linkBtn.dataset.kfHowtoBound) {
      linkBtn.addEventListener('click', window.openHowToPlayModal);
      linkBtn.dataset.kfHowtoBound = '1';
    }

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
      okBtn.textContent = 'GOT IT';
      okBtn.addEventListener('click', window.closeHowToPlayModal);

      footer.appendChild(okBtn);
      card.appendChild(body);
      card.appendChild(footer);
      modal.appendChild(card);

      modal.addEventListener('click', function (event) {
        if (event.target === modal) {
          window.closeHowToPlayModal(event);
        }
      });

      selectScreen.appendChild(modal);
    }
  }

  /** Injects and updates the 3-step progress tracker pill bar under the header. */
  function updateStepTrackerUI(currentStep) {
    const headerText = document.getElementById('select-step-title') || document.getElementById('vs-header-text');
    if (!headerText || !headerText.parentNode) return;

    let tracker = document.getElementById('kf-step-tracker');
    if (!tracker) {
      tracker = document.createElement('div');
      tracker.id = 'kf-step-tracker';
      tracker.className = 'kf-step-tracker';
      tracker.innerHTML = `
        <span class="kf-step-pill step-p1" data-step="1">01 P1 SELECT</span>
        <span class="kf-step-connector"></span>
        <span class="kf-step-pill step-p2" data-step="2">02 P2 SELECT</span>
        <span class="kf-step-connector"></span>
        <span class="kf-step-pill step-ready" data-step="3">03 VS READY</span>
      `;
      headerText.insertAdjacentElement('afterend', tracker);
    }

    const pills = tracker.querySelectorAll('.kf-step-pill');
    pills.forEach(pill => {
      const stepNum = parseInt(pill.getAttribute('data-step'), 10);
      pill.classList.toggle('is-active', stepNum === currentStep);
      pill.classList.toggle('is-done', stepNum < currentStep);
    });
  }

  /** Injects or updates the LP & AI Matrix Ready stat strip below each Rider's name. */
  function updateRiderStatStrip(playerKey, rider) {
    const nameEl = document.getElementById(playerKey + '-name-display');
    if (!nameEl || !rider) return;

    let strip = document.getElementById(playerKey + '-stat-strip');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = playerKey + '-stat-strip';
      strip.className = 'kf-stat-strip';
      nameEl.insertAdjacentElement('afterend', strip);
    }

    const lp = rider.maxLp || 3000;
    const hasRiderAI = riderLevelAvailable(rider);

    strip.innerHTML = `
      <span class="kf-stat-chip">LP <strong>${lp}</strong></span>
      ${hasRiderAI ? '<span class="kf-stat-chip ai-ready">★ RIDER AI</span>' : ''}
    `;
  }

  /** Renders and updates the bottom Quick-Select Roster Dock. */
  function updateRosterDockUI() {
    const selectScreen = document.getElementById('vs-select-screen');
    const p1Card = document.getElementById('p1-card');
    if (!selectScreen || !p1Card) return;

    const riders = window.AVAILABLE_RIDERS || [];
    const state = window.vsSelectionState;
    const currentStep = parseInt(state.step, 10) || 1;

    let dock = document.getElementById('kf-roster-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'kf-roster-dock';
      dock.className = 'kf-roster-dock';

      const cardsContainer = p1Card.parentElement;
      if (cardsContainer && cardsContainer !== selectScreen) {
        cardsContainer.insertAdjacentElement('afterend', dock);
      } else {
        selectScreen.appendChild(dock);
      }
    }

    const promptLabel =
      currentStep === 1
        ? 'QUICK SELECT — CLICK TO ASSIGN PLAYER 1'
        : currentStep === 2
        ? 'QUICK SELECT — CLICK TO ASSIGN PLAYER 2'
        : 'MATCHUP LOCKED — READY FOR BATTLE';

    dock.innerHTML = `
      <div class="kf-roster-dock-title">${promptLabel}</div>
      <div class="kf-roster-grid" id="kf-roster-grid"></div>
    `;

    const grid = dock.querySelector('#kf-roster-grid');
    riders.forEach((rider, idx) => {
      const isP1 = idx === state.p1Index;
      const isP2 = idx === state.p2Index;

      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'kf-roster-tile' + (isP1 ? ' is-p1' : '') + (isP2 ? ' is-p2' : '');
      tile.title = rider.name;

      const shortName = String(rider.name || rider.id).replace(/^Kamen Rider\s+/i, '');

      tile.innerHTML = `
        <div class="kf-roster-badges">
          ${isP1 ? '<span class="kf-roster-tag p1">P1</span>' : ''}
          ${isP2 ? '<span class="kf-roster-tag p2">P2</span>' : ''}
        </div>
        <img class="kf-roster-tile-img" src="${rider.icon}" alt="${shortName}">
        <span class="kf-roster-tile-name">${shortName}</span>
      `;

      tile.addEventListener('click', () => {
        const stepNow = parseInt(window.vsSelectionState.step, 10) || 1;
        if (stepNow === 1) {
          window.vsSelectionState.p1Index = idx;
          window.updateSelectionUI();
        } else if (stepNow === 2) {
          window.vsSelectionState.p2Index = idx;
          window.updateSelectionUI();
        }
      });

      grid.appendChild(tile);
    });
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

  // Default fallback roster definitions (all 6 Riders)
  window.AVAILABLE_RIDERS = window.AVAILABLE_RIDERS || [
    { id: 'ichigo', name: 'Kamen Rider Ichigo', icon: 'assets/images/icons/ichigo.png', maxLp: 3000 },
    { id: 'nigo', name: 'Kamen Rider Nigo', icon: 'assets/images/icons/nigo.png', maxLp: 3300 },
    { id: 'v3', name: 'Kamen Rider V3', icon: 'assets/images/icons/v3.png', maxLp: 3150 },
    { id: 'riderman', name: 'Riderman', icon: 'assets/images/icons/riderman.png', maxLp: 2800 },
    { id: 'x', name: 'Kamen Rider X', icon: 'assets/images/icons/x.png', maxLp: 3100 },
    { id: 'amazon', name: 'Kamen Rider Amazon', icon: 'assets/images/icons/amazon.png', maxLp: 2900 }
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
    updateRiderStatStrip('p1', p1);

    const p1TypeEl = document.getElementById('p1-type-display');
    if (p1TypeEl) p1TypeEl.textContent = state.p1IsCPU ? 'CPU' : 'HUMAN';

    const p1DiffDisplay = document.getElementById('p1-diff-display');
    if (p1DiffDisplay) {
      if (!state.p1IsCPU) {
        p1DiffDisplay.textContent = 'N/A';
      } else {
        p1DiffDisplay.textContent = DIFF_LABELS[state.p1Difficulty] || 'All-rounder';
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
    updateRiderStatStrip('p2', p2);

    const p2TypeEl = document.getElementById('p2-type-display');
    if (p2TypeEl) p2TypeEl.textContent = state.p2IsCPU ? 'CPU' : 'HUMAN';

    const p2DiffDisplay = document.getElementById('p2-diff-display');
    if (p2DiffDisplay) {
      if (!state.p2IsCPU) {
        p2DiffDisplay.textContent = 'N/A';
      } else {
        p2DiffDisplay.textContent = DIFF_LABELS[state.p2Difficulty] || 'All-rounder';
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

    updateStepTrackerUI(currentStep);
    updateRosterDockUI();
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
