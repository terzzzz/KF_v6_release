/* js/ui.js
 * Battle HUD and status presentation.
 *
 * Patch: numeric-status-hud-2 + cyber-tokusatsu-jp-hud + glass-shatter-dmg-fx
 */
(function (g) {
  "use strict";

  const STATUS_NAMES = Object.freeze({
    typhoon_speed: "Typhoon Charge",
    charge_speed: "Charge Speed",
    focus: "Typhoon Focus",
    v3_focus: "V3 Focus",
    red_shutter: "Red Shutter",
    power_focus: "Power Focus",
    double_typhoon_speed: "Double Typhoon",
    red_lamp_boost: "Red Lamp",
    accuracy_focus: "Target Lock",
    arm_calibration: "Arm Calibration",
    rope_bind: "Rope Bind",
    mercury_atk: "Mercury Attack",
    mercury_def: "Mercury Defense",
    airborne_evasion: "Airborne Evasion",
    inca_blessing: "Inca Blessing",
    gigi_focus: "Gigi Focus",
    bleeding: "Bleeding",
    lprecover: "LP Recovery",
    lpRecovery: "LP Recovery",
    airborne_boost: "Airborne Boost"
  });

  const DIFF_LABELS = Object.freeze({
    easy: "Rugrat",
    balanced: "All-rounder",
    master: "Geek",
    soul: "Monomaniac",
    rider: "Rider"
  });

  const renderedTags = new WeakMap();

  const byId = id => document.getElementById(id);

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function pretty(value) {
    return String(Math.round(number(value) * 100) / 100);
  }

  function signed(value) {
    const rounded = Math.round(number(value) * 100) / 100;
    return (rounded > 0 ? "+" : "") + rounded;
  }

  function currentRound() {
    return number(
      g.gameState?.presentationRound ?? g.gameState?.core?.round,
      1
    );
  }

  function statusName(id) {
    if (STATUS_NAMES[id]) {
      return STATUS_NAMES[id];
    }
    return String(id || "Status")
      .replace(/_/g, " ")
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function periodicAmount(buff, field) {
    return Math.max(
      0,
      number(buff?.[field] ?? buff?.effects?.[field])
    );
  }

  function describeStatus(buff, round = currentRound()) {
    const effects = buff?.effects || {};
    const remaining = Math.max(0, number(buff?.roundsLeft));
    const parts = [];
    let harmful = false;

    const multiplicative = [
      ["attack", "ATK"],
      ["dAttack", "D-ATK"],
      ["sAttack", "S-ATK"],
      ["armor", "damage taken"],
      ["speed", "charge speed"]
    ];

    for (const [field, label] of multiplicative) {
      if (effects[field] === undefined) continue;

      const multiplier = number(effects[field], 1);
      const percent = 100 * (multiplier - 1);

      if (Math.abs(percent) < 0.000001) continue;

      parts.push(`${label} ${signed(percent)}%`);

      if (field === "armor" ? multiplier > 1 : multiplier < 1) {
        harmful = true;
      }
    }

    if (effects.accuracy !== undefined && number(effects.accuracy) !== 0) {
      const value = number(effects.accuracy);
      parts.push(`HIT ${signed(value)}pp`);
      if (value < 0) harmful = true;
    }

    if (effects.evasion !== undefined && number(effects.evasion) !== 0) {
      const value = 100 * number(effects.evasion);
      parts.push(`EVS ${signed(value)}pp`);
      if (value < 0) harmful = true;
    }

    const regeneration = periodicAmount(buff, "lpRegen");
    const bleeding = periodicAmount(buff, "lpBleed");

    if (regeneration > 0) parts.push(`+${pretty(regeneration)} LP/turn`);
    if (bleeding > 0) {
      parts.push(`-${pretty(bleeding)} LP/turn`);
      harmful = true;
    }

    const fragile = Boolean(
      buff?.cancelOnLpDamage ?? effects.cancelOnLpDamage ?? false
    );
    if (fragile) parts.push("breaks on LP damage");

    const periodic = regeneration > 0 || bleeding > 0;
    const firstApplied =
      buff?.periodicAppliedRound ?? buff?.appliedRound ?? round - 1;
    const paymentDue = periodic && remaining > 0 && firstApplied < round;

    const name = statusName(buff?.id);

    const text = [
      name,
      parts.length ? parts.join(", ") : "",
      `${pretty(remaining)}t`
    ].filter(Boolean).join(" · ");

    const details = [
      name,
      ...parts,
      `Engine duration remaining: ${pretty(remaining)} turns.`
    ];

    if (periodic) {
      details.push(
        paymentDue
          ? "Eligible for this turn's periodic payment."
          : "No periodic payment on the initial application turn."
      );
      details.push(
        "Regeneration resolves before bleeding. " +
        "Regeneration cannot revive a fighter at zero LP."
      );
    }

    return {
      id: buff?.id || "",
      name,
      text,
      title: details.join("\n"),
      remaining,
      periodic,
      paymentDue,
      fragile,
      harmful,
      regeneration,
      bleeding
    };
  }

  function renderTags(tray, tags) {
    if (!tray) return;

    const signature = JSON.stringify(tags);
    if (renderedTags.get(tray) === signature) return;

    renderedTags.set(tray, signature);
    const fragment = document.createDocumentFragment();

    for (const tag of tags) {
      const element = document.createElement("span");
      element.className = "buff-tag";
      if (tag.className) element.classList.add(tag.className);
      element.textContent = tag.text;
      element.title = tag.title || tag.text;
      fragment.appendChild(element);
    }

    tray.replaceChildren(fragment);
  }

  /**
   * Resolves whether a given slot ("p1" or "p2") is controlled by CPU and its difficulty,
   * checking player properties, gameState, and vsSelectionState as fallbacks.
   */
  function resolveControllerInfo(slot, player) {
    const vs = g.vsSelectionState || {};
    const gs = g.gameState || {};

    let isCPU;
    if (typeof player?.isCPU === "boolean") {
      isCPU = player.isCPU;
    } else if (typeof player?.isCpu === "boolean") {
      isCPU = player.isCpu;
    } else if (typeof player?.cpu === "boolean") {
      isCPU = player.cpu;
    } else if (typeof player?.ai === "boolean") {
      isCPU = player.ai;
    } else if (typeof player?.controller === "string") {
      isCPU = player.controller.toLowerCase() === "cpu";
    } else if (typeof gs?.matchConfig?.[`${slot}IsCPU`] === "boolean") {
      isCPU = gs.matchConfig[`${slot}IsCPU`];
    } else if (typeof gs[`${slot}IsCPU`] === "boolean") {
      isCPU = gs[`${slot}IsCPU`];
    } else if (typeof vs[`${slot}IsCPU`] === "boolean") {
      isCPU = vs[`${slot}IsCPU`];
    } else {
      isCPU = false;
    }

    const rawDiff =
      player?.difficulty ||
      player?.cpuDifficulty ||
      player?.aiDifficulty ||
      gs?.matchConfig?.[`${slot}Difficulty`] ||
      gs[`${slot}Difficulty`] ||
      vs[`${slot}Difficulty`] ||
      "balanced";

    let diffKey = String(rawDiff).toLowerCase();
    if (diffKey === "mcts") diffKey = "rider";

    return { isCPU, diffKey };
  }

  function updatePlayerHUD(slot, player) {
    if (!player) return;

    const maxLp = Math.max(1, number(player.maxLp, 2300));
    const lp = clamp(number(player.lp), 0, maxLp);

    const maxChi = Math.max(
      1,
      number(player.maxChi, g.COMBAT_RULES?.MAX_CHI || 16)
    );
    const chi = clamp(number(player.chi), 0, maxChi);

    const faintThreshold = Math.max(
      1,
      number(g.COMBAT_RULES?.FAINT_THRESHOLD, 100)
    );
    const faint = clamp(number(player.faintMeter), 0, faintThreshold);

    const lpPercent = (100 * lp) / maxLp;
    const chiPercent = (100 * chi) / maxChi;
    const faintPercent = (100 * faint) / faintThreshold;

    const nameElement = byId(`${slot}-name`);
    const subtextElement = byId(`${slot}-subtext`);
    const lpElement = byId(`${slot}-lp`);
    const chiElement = byId(`${slot}-chi`);
    const chiFill = byId(`${slot}-chi-bar-fill`);

    if (nameElement) {
      nameElement.textContent = player.name || slot.toUpperCase();
    }

    // Dynamic Subtext (Blank for Human, Difficulty badge for CPU)
    if (subtextElement) {
      const { isCPU, diffKey } = resolveControllerInfo(slot, player);

      if (isCPU) {
        const label = DIFF_LABELS[diffKey] || diffKey.toUpperCase();
        subtextElement.textContent = label;
        subtextElement.classList.add("cpu-subtext");
        subtextElement.classList.remove("human-subtext");
        subtextElement.classList.toggle("rider-tier-subtext", diffKey === "rider");
        subtextElement.hidden = false;
      } else {
        subtextElement.textContent = "";
        subtextElement.classList.remove("cpu-subtext", "human-subtext", "rider-tier-subtext");
        subtextElement.hidden = true;
      }
    }

    if (lpElement) {
      lpElement.textContent = `LP ${pretty(lp)} / ${pretty(maxLp)}`;
      lpElement.classList.toggle("lp-text-danger", lpPercent < 40);
      lpElement.classList.toggle("lp-text-warn", lpPercent >= 40 && lpPercent <= 60);
    }

    // Dynamic Stylish LP Bar Filling & Color Transitions
    document.querySelectorAll(`#${slot}-lp-bar-fill, .${slot}-lp-fill`).forEach(fill => {
      fill.style.width = `${lpPercent}%`;

      if (lpPercent > 60) {
        // Cyber Emerald Phase (60% - 100%)
        fill.style.background =
          "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, transparent 45%), " +
          "linear-gradient(90deg, #00994d 0%, #00e676 55%, #69f0ae 100%)";
        fill.style.boxShadow = "0 0 12px rgba(0, 230, 118, 0.55)";
      } else if (lpPercent >= 40) {
        // Tactical Amber Phase (40% - 60%)
        fill.style.background =
          "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, transparent 45%), " +
          "linear-gradient(90deg, #c67c00 0%, #ffbe0b 55%, #ffe169 100%)";
        fill.style.boxShadow = "0 0 12px rgba(255, 190, 11, 0.6)";
      } else {
        // Critical Crimson Phase (0% - 40%)
        fill.style.background =
          "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, transparent 45%), " +
          "linear-gradient(90deg, #8a001d 0%, #ff1e42 55%, #ff6b8b 100%)";
        fill.style.boxShadow = "0 0 14px rgba(255, 30, 66, 0.85)";
      }
    });

    if (chiElement) {
      chiElement.textContent = `CHI ${pretty(chi)} / ${pretty(maxChi)}`;

      chiElement.classList.toggle("chi-text-low", chi < 5);
      chiElement.classList.toggle("chi-text-full", chi > 14);

      chiElement.style.color =
        chi < 5 ? "#ff4d6d" : chi > 14 ? "#ffd166" : "#00f0ff";
    }

    if (chiFill) {
      chiFill.style.width = `${chiPercent}%`;

      chiFill.classList.toggle("chi-bar-low", chi < 5);
      chiFill.classList.toggle("chi-bar-full", chi > 14);

      if (chi < 5) {
        chiFill.style.background =
          "linear-gradient(90deg, #990022 0%, #ff2a55 60%, #ff758f 100%)";
        chiFill.style.boxShadow = "0 0 10px rgba(255, 42, 85, 0.7)";
      } else if (chi > 14) {
        chiFill.style.background =
          "linear-gradient(90deg, #c27800 0%, #ffd166 60%, #fff3b0 100%)";
        chiFill.style.boxShadow = "0 0 12px rgba(255, 209, 102, 0.8)";
      } else {
        chiFill.style.background =
          "linear-gradient(90deg, #006699 0%, #00d2ff 60%, #7df9ff 100%)";
        chiFill.style.boxShadow = "0 0 10px rgba(0, 210, 255, 0.55)";
      }
    }

    const faintText = byId(`${slot}-faint-text`) || byId(`${slot}-faint`);
    if (faintText) {
      faintText.textContent = `FAINT ${pretty(faint)} / ${pretty(faintThreshold)}`;
    }

    // Update FAINT label inside .faint-bar-wrapper with live percentage
    const hudContainer = document.querySelector(`.${slot}-hud`);
    if (hudContainer) {
      const faintLabel = hudContainer.querySelector(".faint-label");
      if (faintLabel) {
        faintLabel.textContent = `FAINT ${Math.round(faintPercent)}%`;
        faintLabel.classList.toggle("faint-danger", faintPercent >= 75);
      }
    }

    // Render FAINT gauge as a sleek horizontal bar
    document.querySelectorAll(
      `#${slot}-faint-fill, .${slot}-faint-fill, #${slot}-faint-bar-fill`
    ).forEach(element => {
      element.style.width = `${faintPercent}%`;
      element.style.height = "100%";

      element.setAttribute("role", "progressbar");
      element.setAttribute("aria-valuemin", "0");
      element.setAttribute("aria-valuemax", String(faintThreshold));
      element.setAttribute("aria-valuenow", String(faint));
      element.setAttribute("aria-label", "Faint buildup");
    });

    const faintOverlay = byId(`${slot}-stun-overlay`);
    if (faintOverlay) {
      faintOverlay.hidden = !player.isFainted;
    }

    const stateLabels = [];
    if (lp <= 0) {
      stateLabels.push("KO");
    } else if (player.isFainted) {
      stateLabels.push("FAINTED — forced recovery");
    }

    if (number(player.airborneTicks) > 0) {
      stateLabels.push(`AIRBORNE · ${pretty(player.airborneTicks)}t`);
    }

    const statusElement = byId(`${slot}-status`);
    if (statusElement) {
      statusElement.textContent = stateLabels.join(" / ");
      statusElement.hidden = stateLabels.length === 0;
    }

    const tags = [];
    for (const buff of player.activeBuffs || []) {
      if (!(buff.roundsLeft > 0)) continue;

      const description = describeStatus(buff);

      tags.push({
        text: description.text,
        title: description.title,
        className: description.harmful ? "combat-debuff" : "combat-buff"
      });
    }

    if (chi < 5) {
      tags.push({
        text: "LOW CHI · damage taken +25% · EVS -25pp",
        title:
          "Below 5 CHI: incoming LP damage is multiplied by 1.25, evasion is reduced by 25 percentage points, and faint buildup is increased.",
        className: "debuff-low-power"
      });
    } else if (chi > 14) {
      tags.push({
        text: "HIGH CHI · ATK +20% · HIT +20pp",
        title:
          "Above 14 CHI: the attack resolver can apply +20% damage and +20 percentage points of accuracy. The attack's CHI cost is paid before these checks.",
        className: "buff-full-power"
      });
    }

    renderTags(byId(`${slot}-buff-tray`), tags);
  }

  /**
   * Builds or retrieves the SVG glass-shatter overlay inside a player video box.
   */
  function ensureGlassCrackOverlay(box) {
    let overlay = box.querySelector(".glass-crack-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "glass-crack-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <svg viewBox="0 0 300 300" preserveAspectRatio="none">
        <!-- Translucent fractured glass shards -->
        <polygon points="150,150 112,88 172,74" fill="rgba(210,248,255,0.16)"/>
        <polygon points="150,150 224,106 206,168" fill="rgba(210,248,255,0.12)"/>
        <polygon points="150,150 92,190 136,228" fill="rgba(210,248,255,0.14)"/>
        <polygon points="150,150 64,122 112,88" fill="rgba(255,255,255,0.09)"/>
        <polygon points="150,150 202,220 140,208" fill="rgba(255,255,255,0.11)"/>

        <!-- Primary radial fracture lines -->
        <g stroke="rgba(255,255,255,0.96)" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <path d="M150,150 L118,96 L92,42 L65,6" stroke-width="2.7"/>
          <path d="M118,96 L74,78 L16,50" stroke-width="1.9"/>
          <path d="M150,150 L168,82 L195,34 L216,4" stroke-width="2.5"/>
          <path d="M168,82 L224,58 L280,22" stroke-width="1.8"/>
          <path d="M150,150 L216,114 L268,95 L298,78" stroke-width="2.6"/>
          <path d="M216,114 L254,142 L296,158" stroke-width="1.8"/>
          <path d="M150,150 L204,172 L248,218 L294,268" stroke-width="2.5"/>
          <path d="M204,172 L188,232 L205,296" stroke-width="1.9"/>
          <path d="M150,150 L138,212 L114,264 L96,298" stroke-width="2.7"/>
          <path d="M138,212 L82,248 L26,290" stroke-width="1.8"/>
          <path d="M150,150 L88,182 L38,208 L4,228" stroke-width="2.5"/>
          <path d="M88,182 L44,158 L4,144" stroke-width="1.7"/>
          <path d="M150,150 L72,124 L26,98 L2,82" stroke-width="2.6"/>

          <!-- Secondary concentric spiderweb rings -->
          <path d="M132,120 L158,112 L184,132 L176,164 L144,178 L116,166 L112,136 Z" stroke-width="1.6" stroke-opacity="0.9"/>
          <path d="M104,72 L174,64 L228,106 L218,186 L168,228 L102,216 L66,168 L74,108 Z" stroke-width="1.25" stroke-opacity="0.76"/>
          <path d="M62,38 L192,28 L266,88 L256,222 L184,274 L74,258 L28,194 L32,84 Z" stroke-width="0.95" stroke-opacity="0.58"/>
        </g>

        <!-- Impact center starburst -->
        <circle cx="150" cy="150" r="5.5" fill="rgba(255,255,255,0.98)"/>
      </svg>
    `;

    box.appendChild(overlay);
    return overlay;
  }

  /**
   * Triggers the glass-shatter crack overlay and viewport impact shake on the victim's box.
   */
  function triggerGlassCrack(boxOrId, damageAmount = 0) {
    const box = typeof boxOrId === "string" ? byId(boxOrId) : boxOrId;
    if (!box) return;

    const overlay = ensureGlassCrackOverlay(box);
    const svg = overlay.querySelector("svg");

    if (svg) {
      const deg = Math.floor(Math.random() * 360);
      const flipX = Math.random() > 0.5 ? -1 : 1;
      svg.style.transform = `scale(${flipX}, 1) rotate(${deg}deg)`;
    }

    overlay.classList.remove("crack-active", "heavy-crack");
    box.classList.remove("victim-hit-shake");

    // Force reflow so rapid consecutive hits cleanly restart the animation
    void overlay.offsetWidth;

    if (number(damageAmount) >= 300) {
      overlay.classList.add("heavy-crack");
    }

    overlay.classList.add("crack-active");
    box.classList.add("victim-hit-shake");
  }

  function showDamagePopup(boxId, text, type = "damage") {
    const box = byId(boxId);
    if (!box) return;

    const supported = new Set([
      "damage",
      "heal",
      "miss",
      "scratch",
      "block"
    ]);

    const rawText = String(text ?? "");
    const resolvedType = supported.has(type) ? type : "scratch";

    // Extract numeric value if present (e.g. "-400" -> 400)
    const dmgMatch = rawText.replace(/,/g, "").match(/-\s*(\d+(?:\.\d+)?)/);
    const dmgValue = dmgMatch ? number(dmgMatch[1], 0) : 0;

    // Trigger glass-shatter crack effect on victim viewport when taking damage
    if (resolvedType === "damage" || resolvedType === "scratch" || dmgValue > 0) {
      triggerGlassCrack(box, dmgValue || (resolvedType === "damage" ? 200 : 80));
    }

    const popup = document.createElement("div");

    popup.classList.add("damage-popup", resolvedType);
    if (dmgValue >= 300) {
      popup.classList.add("heavy-dmg");
    }

    // Slightly stagger vertical position if multiple popups are simultaneously active
    const activeCount = box.querySelectorAll(".damage-popup").length;
    if (activeCount > 0) {
      popup.style.top = `${Math.min(68, 42 + activeCount * 12)}%`;
    }

    popup.textContent = rawText;
    popup.style.whiteSpace = "pre-line";

    box.appendChild(popup);

    setTimeout(() => popup.remove(), 1450);
  }

  function showBattleBanner(message) {
    const banner = byId("battle-message");
    if (!banner) return;

    banner.textContent = String(message || "");
    banner.style.whiteSpace = "pre-line";
    banner.hidden = !message;
  }

  function showActionBanner(message) {
    const banner = byId("center-action-label");
    if (!banner) return;

    banner.textContent = String(message || "");
    banner.hidden = !message;
  }

  function installStyles() {
    if (byId("kf-status-hud-styles")) return;

    // Load stylish Latin + Japanese (Kanji / Kana) display fonts
    if (!byId("kf-jp-hud-fonts")) {
      const fontLink = document.createElement("link");
      fontLink.id = "kf-jp-hud-fonts";
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,600;0,700;1,700&family=M+PLUS+1p:wght@700;800;900&family=Noto+Sans+JP:wght@700;900&family=Orbitron:wght@700;800;900&display=swap";
      (document.head || document.documentElement).appendChild(fontLink);
    }

    const style = document.createElement("style");
    style.id = "kf-status-hud-styles";

    style.textContent = `
      :root {
        --kf-hud-font-display: 'Orbitron', 'Chakra Petch', 'M PLUS 1p', 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif;
        --kf-hud-font-ui: 'Chakra Petch', 'M PLUS 1p', 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo', sans-serif;
        --kf-p1-cyan: #00f0ff;
        --kf-p2-pink: #ff2a6d;
        --kf-gold: #ffd166;
      }

      /* --- Global In-Game Font Inheritance (Supports English & Japanese) --- */
      #battle-screen,
      #match-transition-screen,
      #loading-screen {
        font-family: var(--kf-hud-font-ui) !important;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      /* --- Top HUD Container (#battle-hud) --- */
      #battle-hud.hud-bar {
        background:
          radial-gradient(circle at 14% 25%, rgba(0, 240, 255, 0.14) 0%, transparent 42%),
          radial-gradient(circle at 86% 25%, rgba(255, 42, 109, 0.14) 0%, transparent 42%),
          linear-gradient(180deg, rgba(11, 16, 29, 0.96) 0%, rgba(6, 9, 17, 0.94) 100%) !important;
        border: 1px solid rgba(0, 240, 255, 0.32) !important;
        border-top: 2px solid rgba(0, 240, 255, 0.65) !important;
        border-radius: 10px !important;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
        padding: 10px 16px !important;
        position: relative;
        overflow: hidden;
      }

      /* --- Rider Names (#p1-name, #p2-name) --- */
      #p1-name,
      #p2-name {
        font-family: var(--kf-hud-font-display) !important;
        font-size: clamp(0.95rem, 1.65vw, 1.3rem) !important;
        font-weight: 900 !important;
        letter-spacing: 0.06em !important;
        line-height: 1.2 !important;
        margin: 0 0 3px 0 !important;
      }

      #p1-name {
        color: #7df9ff !important;
        text-shadow: 0 0 14px rgba(0, 240, 255, 0.45), 0 2px 4px rgba(0, 0, 0, 0.9) !important;
      }

      #p2-name {
        color: #ff8da8 !important;
        text-shadow: 0 0 14px rgba(255, 42, 109, 0.45), 0 2px 4px rgba(0, 0, 0, 0.9) !important;
      }

      /* --- CPU Difficulty Subtext Pill --- */
      .rider-subtext {
        display: inline-flex;
        align-items: center;
        font-family: var(--kf-hud-font-display) !important;
        font-size: clamp(0.58rem, 1.1vw, 0.7rem) !important;
        font-weight: 800 !important;
        letter-spacing: 0.12em !important;
        margin-top: 0;
        margin-bottom: 5px;
        padding: 1px 8px;
        border-radius: 999px;
        text-transform: uppercase;
        min-height: 1.2em;
      }

      .p2-hud .rider-subtext {
        margin-left: auto;
      }

      .rider-subtext.human-subtext {
        color: #00f0ff;
        background: rgba(0, 240, 255, 0.12);
        border: 1px solid rgba(0, 240, 255, 0.35);
      }

      .rider-subtext.cpu-subtext {
        color: #ffd166;
        background: rgba(255, 209, 102, 0.12);
        border: 1px solid rgba(255, 209, 102, 0.4);
        text-shadow: 0 0 8px rgba(255, 209, 102, 0.45);
      }

      .rider-subtext.rider-tier-subtext {
        color: #f3d5ff;
        background: rgba(187, 100, 255, 0.2);
        border: 1px solid rgba(224, 166, 255, 0.65);
        box-shadow: 0 0 10px rgba(187, 100, 255, 0.4);
      }

      /* --- Stat Readouts (LP & CHI Values) --- */
      .stat-line {
        margin: 2px 0 !important;
      }

      .stat-value-styled,
      #p1-lp,
      #p2-lp,
      #p1-chi,
      #p2-chi {
        font-family: var(--kf-hud-font-display) !important;
        font-variant-numeric: tabular-nums;
        font-size: clamp(0.76rem, 1.25vw, 0.94rem) !important;
        font-weight: 800 !important;
        letter-spacing: 0.06em !important;
        color: #f8fafc !important;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 240, 255, 0.25) !important;
        filter: none !important;
      }

      #p1-lp.lp-text-warn,
      #p2-lp.lp-text-warn {
        color: #ffd166 !important;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.95), 0 0 10px rgba(255, 209, 102, 0.45) !important;
      }

      #p1-lp.lp-text-danger,
      #p2-lp.lp-text-danger {
        color: #ff5c77 !important;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.95), 0 0 12px rgba(255, 42, 85, 0.65) !important;
      }

      /* --- Modern Skewed & Segmented LP Bar --- */
      .lp-bar-wrapper {
        position: relative;
        width: 100%;
        height: 15px !important;
        background: linear-gradient(180deg, #05080f 0%, #101726 100%) !important;
        border: 1px solid rgba(255, 255, 255, 0.24) !important;
        margin: 3px 0 6px 0 !important;
        border-radius: 4px !important;
        overflow: hidden;
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.9), 0 1px 0 rgba(255, 255, 255, 0.06) !important;
        transform: skewX(-14deg);
      }

      .p2-hud .lp-bar-wrapper {
        transform: skewX(14deg);
      }

      /* 10% Tick Segment Grid Overlay on LP Bar */
      .lp-bar-wrapper::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image: repeating-linear-gradient(
          90deg,
          transparent 0,
          transparent calc(10% - 1.5px),
          rgba(5, 8, 15, 0.55) calc(10% - 1.5px),
          rgba(5, 8, 15, 0.55) 10%
        );
        pointer-events: none;
        z-index: 2;
      }

      .lp-bar-fill {
        width: 100%;
        height: 100%;
        border-radius: 2px;
        transition: width 0.32s cubic-bezier(0.22, 1, 0.36, 1),
                    background 0.3s ease,
                    box-shadow 0.3s ease !important;
      }

      .p2-hud .lp-bar-fill {
        margin-left: auto;
      }

      /* --- Modern 16-Cell Segmented CHI Bar --- */
      .chi-bar-wrapper {
        position: relative;
        width: 100%;
        height: 10px !important;
        background: linear-gradient(180deg, #05080f 0%, #0d1422 100%) !important;
        border: 1px solid rgba(0, 240, 255, 0.35) !important;
        margin: 3px 0 7px 0 !important;
        border-radius: 3px !important;
        overflow: hidden;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.9) !important;
        transform: skewX(-14deg);
      }

      .p2-hud .chi-bar-wrapper {
        transform: skewX(14deg);
      }

      /* 16-Unit Cell Divider Overlay on CHI Bar */
      .chi-bar-wrapper::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image: repeating-linear-gradient(
          90deg,
          transparent 0,
          transparent calc(6.25% - 1.5px),
          rgba(5, 8, 15, 0.72) calc(6.25% - 1.5px),
          rgba(5, 8, 15, 0.72) 6.25%
        );
        pointer-events: none;
        z-index: 2;
      }

      .chi-bar-fill {
        width: 50%;
        height: 100%;
        transition: width 0.26s cubic-bezier(0.22, 1, 0.36, 1),
                    background 0.25s ease,
                    box-shadow 0.25s ease !important;
      }

      .p2-hud .chi-bar-fill {
        margin-left: auto;
      }

      /* --- Modern Horizontal FAINT / Stun Gauge --- */
      .faint-bar-wrapper {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        margin-top: 3px !important;
        width: 100% !important;
        max-width: 220px !important;
      }

      .p2-hud .faint-bar-wrapper {
        margin-left: auto !important;
        flex-direction: row-reverse !important;
      }

      .faint-label {
        font-family: var(--kf-hud-font-display) !important;
        font-variant-numeric: tabular-nums;
        font-size: 0.65rem !important;
        font-weight: 800 !important;
        letter-spacing: 0.08em !important;
        color: #fbbf24 !important;
        white-space: nowrap;
        min-width: 68px;
      }

      .p2-hud .faint-label {
        text-align: right;
      }

      .faint-label.faint-danger {
        color: #ff4d6d !important;
        text-shadow: 0 0 8px rgba(255, 77, 109, 0.7);
      }

      .faint-track {
        flex: 1 1 auto !important;
        width: 100% !important;
        height: 7px !important;
        background: rgba(8, 12, 22, 0.95) !important;
        border: 1px solid rgba(251, 191, 36, 0.45) !important;
        border-radius: 999px !important;
        overflow: hidden !important;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.9) !important;
        position: relative;
      }

      .faint-fill {
        width: 0%;
        height: 100% !important;
        background: linear-gradient(90deg, #f59e0b 0%, #ff2a6d 100%) !important;
        box-shadow: 0 0 8px rgba(255, 42, 109, 0.7) !important;
        border-radius: 999px !important;
        transition: width 0.25s ease !important;
      }

      .p2-hud .faint-fill {
        margin-left: auto;
      }

      /* --- Center HUD (Round Counter & Digital Timer) --- */
      .center-hud {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        gap: 4px;
      }

      #turn-display.round-title {
        font-family: var(--kf-hud-font-display) !important;
        font-variant-numeric: tabular-nums;
        font-size: clamp(0.75rem, 1.3vw, 0.95rem) !important;
        font-weight: 800 !important;
        letter-spacing: 0.14em !important;
        color: #ffd166 !important;
        background: rgba(255, 209, 102, 0.1);
        border: 1px solid rgba(255, 209, 102, 0.4);
        border-radius: 999px;
        padding: 3px 14px;
        text-shadow: 0 0 10px rgba(255, 209, 102, 0.4) !important;
      }

      #turn-timer.timer-display {
        font-family: var(--kf-hud-font-display) !important;
        font-variant-numeric: tabular-nums;
        font-size: clamp(0.95rem, 1.75vw, 1.3rem) !important;
        font-weight: 900 !important;
        letter-spacing: 0.08em !important;
        color: #ff4d6d !important;
        text-shadow: 0 0 14px rgba(255, 77, 109, 0.55), 0 2px 4px rgba(0, 0, 0, 0.9) !important;
      }

      /* --- Battle Banner & Center Action Sub-Banner --- */
      #battle-message.battle-banner {
        font-family: var(--kf-hud-font-display) !important;
        font-size: clamp(0.78rem, 1.3vw, 0.95rem) !important;
        font-weight: 800 !important;
        letter-spacing: 0.1em !important;
        color: #ffd166 !important;
        background: linear-gradient(90deg, rgba(10, 15, 28, 0.85) 0%, rgba(24, 34, 58, 0.95) 50%, rgba(10, 15, 28, 0.85) 100%) !important;
        border: 1px solid rgba(255, 209, 102, 0.55) !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.65), 0 0 12px rgba(255, 209, 102, 0.18) !important;
        padding: 5px 14px !important;
      }

      #center-action-label.action-sub-banner {
        font-family: var(--kf-hud-font-display) !important;
        font-weight: 800 !important;
        letter-spacing: 0.08em !important;
        color: #7df9ff !important;
        text-shadow: 0 0 12px rgba(0, 240, 255, 0.55), 0 2px 4px #000 !important;
      }

      /* --- Player Viewport Frame & Bottom READY / Charge Bar --- */
      .player-box {
        position: relative !important;
        border-radius: 10px !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65) !important;
        overflow: hidden;
      }

      .player-charge-container {
        padding: 4px 6px !important;
        background: rgba(6, 9, 17, 0.92) !important;
        border-top: 1px solid rgba(0, 240, 255, 0.25) !important;
      }

      .player-charge-track {
        height: 20px !important;
        background: rgba(13, 20, 34, 0.95) !important;
        border: 1px solid rgba(255, 255, 255, 0.18) !important;
        border-radius: 6px !important;
        overflow: hidden !important;
        position: relative;
        box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.85) !important;
      }

      .player-charge-fill {
        height: 100% !important;
        background: linear-gradient(90deg, #0077aa 0%, #00f0ff 65%, #7df9ff 100%) !important;
        box-shadow: 0 0 12px rgba(0, 240, 255, 0.6) !important;
        transition: width 0.1s linear !important;
      }

      #p2-box .player-charge-fill {
        background: linear-gradient(90deg, #a80038 0%, #ff2a6d 65%, #ff8da8 100%) !important;
        box-shadow: 0 0 12px rgba(255, 42, 109, 0.6) !important;
      }

      .player-charge-text {
        font-family: var(--kf-hud-font-display) !important;
        font-size: 0.68rem !important;
        font-weight: 800 !important;
        letter-spacing: 0.14em !important;
        color: #ffffff !important;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95) !important;
      }

      /* --- Buff & Debuff Status Chips --- */
      .buff-tray {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
      }

      .p2-hud .buff-tray {
        justify-content: flex-end;
      }

      .buff-tray .buff-tag {
        font-family: var(--kf-hud-font-ui) !important;
        font-size: 0.68rem !important;
        font-weight: 700 !important;
        letter-spacing: 0.03em;
        padding: 2px 8px !important;
        border-radius: 6px !important;
        max-width: 100%;
        white-space: normal;
        overflow-wrap: anywhere;
        line-height: 1.25;
        pointer-events: auto;
        backdrop-filter: blur(6px);
      }

      .buff-tray .combat-debuff,
      .buff-tray .debuff-low-power {
        border: 1px solid rgba(255, 107, 130, 0.65) !important;
        color: #ffb3c1 !important;
        background: rgba(68, 14, 28, 0.82) !important;
      }

      .buff-tray .combat-buff {
        border: 1px solid rgba(0, 240, 255, 0.55) !important;
        color: #a5f3fc !important;
        background: rgba(8, 45, 68, 0.82) !important;
      }

      .buff-tray .buff-full-power {
        border: 1px solid rgba(255, 209, 102, 0.7) !important;
        color: #ffe8a3 !important;
        background: rgba(68, 48, 10, 0.85) !important;
      }

      /* --- Glass Shatter Crack Overlay & Victim Viewport Hit Shake --- */
      .glass-crack-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 26;
        opacity: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        mix-blend-mode: screen;
      }

      .glass-crack-overlay svg {
        width: 116%;
        height: 116%;
        transform-origin: center center;
        filter: drop-shadow(0 0 6px rgba(195, 245, 255, 0.92))
                drop-shadow(0 2px 5px rgba(0, 0, 0, 0.95));
      }

      .glass-crack-overlay.heavy-crack svg {
        filter: drop-shadow(0 0 9px rgba(255, 55, 55, 0.98))
                drop-shadow(0 0 18px rgba(255, 190, 0, 0.8))
                drop-shadow(0 2px 5px rgba(0, 0, 0, 0.95));
      }

      .glass-crack-overlay.crack-active {
        animation: kfGlassShatter 1.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .victim-hit-shake {
        animation: kfVictimShake 0.42s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
      }

      @keyframes kfGlassShatter {
        0% {
          opacity: 1;
          background: rgba(255, 255, 255, 0.42);
          transform: scale(0.84);
        }
        12% {
          opacity: 1;
          background: rgba(255, 35, 35, 0.15);
          transform: scale(1.02);
        }
        65% {
          opacity: 0.9;
          background: transparent;
          transform: scale(1);
        }
        100% {
          opacity: 0;
          background: transparent;
          transform: scale(1.03);
        }
      }

      @keyframes kfVictimShake {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        15% { transform: translate(-8px, -5px) rotate(-1.2deg); }
        30% { transform: translate(8px, 4px) rotate(1.2deg); }
        45% { transform: translate(-6px, 5px) rotate(-0.8deg); }
        60% { transform: translate(6px, -4px) rotate(0.8deg); }
        75% { transform: translate(-3px, 2px) rotate(-0.4deg); }
      }

      /* --- Big Stylish Arcade Damage & Action Popups (-400, BLOCK, HEAL, MISS) --- */
      .damage-popup {
        position: absolute !important;
        left: 50% !important;
        top: 42%;
        transform: translate(-50%, -50%);
        z-index: 35 !important;
        pointer-events: none !important;
        text-align: center !important;
        font-family: var(--kf-hud-font-display) !important;
        font-size: clamp(2.4rem, 5.8vw, 4.2rem) !important;
        font-weight: 900 !important;
        font-style: italic !important;
        letter-spacing: 0.04em !important;
        line-height: 1.05 !important;
        background: linear-gradient(180deg, #ffffff 0%, #ffe66d 28%, #ff3b1f 68%, #9e0000 100%) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        -webkit-text-stroke: 2.5px #1a0000 !important;
        filter: drop-shadow(0 4px 0 #000000)
                drop-shadow(0 0 14px rgba(255, 35, 0, 0.95))
                drop-shadow(0 0 28px rgba(255, 180, 0, 0.65)) !important;
        animation: kfStylishDmgPop 1.35s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards !important;
      }

      .damage-popup.heavy-dmg {
        font-size: clamp(2.9rem, 7vw, 4.9rem) !important;
        background: linear-gradient(180deg, #ffffff 0%, #fff3a1 22%, #ff0044 62%, #6b001b 100%) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        filter: drop-shadow(0 5px 0 #000000)
                drop-shadow(0 0 18px rgba(255, 0, 68, 1))
                drop-shadow(0 0 34px rgba(255, 215, 0, 0.85)) !important;
      }

      .damage-popup.scratch {
        font-size: clamp(1.95rem, 4.6vw, 3.3rem) !important;
        background: linear-gradient(180deg, #ffffff 0%, #ffd166 38%, #ff7b00 85%, #993d00 100%) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-stroke: 2px #1a0900 !important;
        filter: drop-shadow(0 3px 0 #000000)
                drop-shadow(0 0 12px rgba(255, 140, 0, 0.9)) !important;
      }

      .damage-popup.heal {
        font-size: clamp(2rem, 4.8vw, 3.4rem) !important;
        background: linear-gradient(180deg, #ffffff 0%, #a8ffdb 35%, #00e676 78%, #007a3d 100%) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-stroke: 2px #001f0f !important;
        filter: drop-shadow(0 3px 0 #000000)
                drop-shadow(0 0 14px rgba(0, 230, 118, 0.9)) !important;
      }

      .damage-popup.block {
        font-size: clamp(1.85rem, 4.3vw, 3.1rem) !important;
        background: linear-gradient(180deg, #ffffff 0%, #ffe89e 40%, #f59e0b 85%, #92400e 100%) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-stroke: 2px #1c0d00 !important;
        filter: drop-shadow(0 3px 0 #000000)
                drop-shadow(0 0 14px rgba(255, 209, 102, 0.85)) !important;
      }

      .damage-popup.miss {
        font-size: clamp(1.85rem, 4.3vw, 3.1rem) !important;
        background: linear-gradient(180deg, #ffffff 0%, #bae6fd 45%, #38bdf8 88%, #0369a1 100%) !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        -webkit-text-stroke: 2px #021824 !important;
        filter: drop-shadow(0 3px 0 #000000)
                drop-shadow(0 0 12px rgba(56, 189, 248, 0.85)) !important;
      }

      @keyframes kfStylishDmgPop {
        0% {
          opacity: 0;
          transform: translate(-50%, -18%) scale(0.25) rotate(-8deg);
        }
        16% {
          opacity: 1;
          transform: translate(-50%, -55%) scale(1.28) rotate(3deg);
        }
        32% {
          opacity: 1;
          transform: translate(-50%, -48%) scale(0.96) rotate(-1deg);
        }
        48% {
          opacity: 1;
          transform: translate(-50%, -54%) scale(1.05) rotate(0deg);
        }
        78% {
          opacity: 1;
          transform: translate(-50%, -68%) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -95%) scale(0.88);
        }
      }

      /* --- On-Screen Control Pad Typography --- */
      .pad-label,
      .charge-status,
      .action-flag,
      .pad-btn {
        font-family: var(--kf-hud-font-display) !important;
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  installStyles();

  g.UI = {
    ...(g.UI || {}),
    PATCH: "numeric-status-hud-2",
    updatePlayerHUD,
    showDamagePopup,
    triggerGlassCrack,
    showBattleBanner,
    showActionBanner,
    describeStatus,
    statusName
  };

  // Existing compatibility entry points.
  g.updatePlayerHUD = updatePlayerHUD;
  g.showDamagePopup = showDamagePopup;
  g.triggerGlassCrack = triggerGlassCrack;
  g.showBattleBanner = showBattleBanner;
  g.showActionBanner = showActionBanner;
})(window);
