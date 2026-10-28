/* js/ui.js
 * Battle HUD and status presentation.
 *
 * Patch: numeric-status-hud-2 + cyber-tokusatsu-jp-hud
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

    const popup = document.createElement("div");

    popup.classList.add(
      "damage-popup",
      supported.has(type) ? type : "scratch"
    );

    popup.textContent = String(text);
    popup.style.whiteSpace = "pre-line";

    box.appendChild(popup);

    setTimeout(() => popup.remove(), 2500);
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

      /* --- Damage & Action Popups (Japanese & English Ready) --- */
      .damage-popup {
        font-family: var(--kf-hud-font-display) !important;
        font-weight: 900 !important;
        letter-spacing: 0.04em !important;
      }

      .damage-popup.block {
        color: #ffd166;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.95), 0 0 10px rgba(255, 209, 102, 0.55);
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
    showBattleBanner,
    showActionBanner,
    describeStatus,
    statusName
  };

  // Existing compatibility entry points.
  g.updatePlayerHUD = updatePlayerHUD;
  g.showDamagePopup = showDamagePopup;
  g.showBattleBanner = showBattleBanner;
  g.showActionBanner = showActionBanner;
})(window);
