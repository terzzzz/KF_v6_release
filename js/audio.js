/* js/audio.js */
(function (g) {
  "use strict";

  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Shouts move names in Japanese or English
  function shout(text, lang = "ja-JP") {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.3;  // Energetic arcade pace
    utterance.pitch = 1.25; // Raised shout pitch
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  // Synthesized heavy hit impact
  function playHitSFX(heavy = false) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(heavy ? 280 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + (heavy ? 0.18 : 0.12));

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (heavy ? 0.18 : 0.12));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + (heavy ? 0.18 : 0.12));
  }

  g.KFAudio = { shout, playHitSFX, getAudioContext };
})(window);
