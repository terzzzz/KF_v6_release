/* js/audio.js */
(function (g) {
  "use strict";

  let audioCtx = null;
  let cachedVoices = [];

  // Populate voice cache asynchronously (SpeechSynthesis voices load lazily)
  function loadVoices() {
    if (!("speechSynthesis" in window)) return;
    cachedVoices = window.speechSynthesis.getVoices();
  }

  if ("speechSynthesis" in window) {
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  /**
   * Searches system voices for a male voice matching the requested language.
   */
  function findMaleVoice(lang = "ja-JP") {
    if (!cachedVoices.length) loadVoices();
    const targetLangPrefix = lang.toLowerCase().substring(0, 2);

    const maleKeywords = ["male", "keita", "ichiro", "daichi", "takumi", "naoki", "george", "david", "mark"];
    const femaleKeywords = ["female", "kyoko", "haruka", "nanami", "ayumi", "zira", "jenny", "aria"];

    const langVoices = cachedVoices.filter(v => v.lang.toLowerCase().startsWith(targetLangPrefix));
    if (!langVoices.length) return null;

    // 1. Explicit male voice match
    const maleVoice = langVoices.find(v =>
      maleKeywords.some(kw => v.name.toLowerCase().includes(kw))
    );
    if (maleVoice) return maleVoice;

    // 2. Any voice that is not explicitly female
    const nonFemaleVoice = langVoices.find(v =>
      !femaleKeywords.some(kw => v.name.toLowerCase().includes(kw))
    );
    if (nonFemaleVoice) return nonFemaleVoice;

    // 3. Fallback to first available voice in target lang
    return langVoices[0];
  }

  // Shouts move names in a deep masculine arcade voice
  function shout(text, lang = "ja-JP") {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    const maleVoice = findMaleVoice(lang);
    if (maleVoice) {
      utterance.voice = maleVoice;
    }

    utterance.rate = 1.25;  // High-energy pace
    utterance.pitch = 0.82; // Deeper, masculine pitch shift (0.80 - 0.85)
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
