/* js/audio.js */
(function (g) {
  "use strict";

  let audioCtx = null;
  let cachedVoices = [];

  function loadVoices() {
    if (!("speechSynthesis" in window)) return;
    cachedVoices = window.speechSynthesis.getVoices() || [];
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
   * Finds the best masculine voice available on the device.
   */
  function findBestMaleVoice(targetLang = "ja-JP") {
    if (!cachedVoices.length) loadVoices();

    const maleKeywords = ["keita", "ichiro", "daichi", "takumi", "naoki", "george", "david", "mark", "alex", "male"];
    const femaleKeywords = ["kyoko", "haruka", "nanami", "ayumi", "zira", "jenny", "aria", "female"];

    // 1. Look for explicit Japanese male voice
    const jaMale = cachedVoices.find(v => 
      v.lang.toLowerCase().startsWith("ja") &&
      maleKeywords.some(kw => v.name.toLowerCase().includes(kw))
    );
    if (jaMale) return { voice: jaMale, lang: "ja-JP" };

    // 2. Look for explicit English male voice as fallback
    const enMale = cachedVoices.find(v => 
      v.lang.toLowerCase().startsWith("en") &&
      maleKeywords.some(kw => v.name.toLowerCase().includes(kw))
    );
    if (enMale) return { voice: enMale, lang: "en-US" };

    // 3. Fallback to any non-female Japanese voice
    const jaNonFemale = cachedVoices.find(v => 
      v.lang.toLowerCase().startsWith("ja") &&
      !femaleKeywords.some(kw => v.name.toLowerCase().includes(kw))
    );
    if (jaNonFemale) return { voice: jaNonFemale, lang: "ja-JP" };

    return { voice: null, lang: targetLang };
  }

  // Shouts move names using the best male voice available
  function shout(text, lang = "ja-JP") {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const { voice, lang: resolvedLang } = findBestMaleVoice(lang);

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = resolvedLang;
    }

    // Keep pitch near natural 1.0 if a true male voice is found; lower slightly if falling back
    const isMaleVoice = voice && maleKeywordsExist(voice.name);
    utterance.rate = 1.25;
    utterance.pitch = isMaleVoice ? 0.95 : 0.85;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  function maleKeywordsExist(name) {
    const maleKeywords = ["keita", "ichiro", "daichi", "takumi", "naoki", "george", "david", "mark", "alex", "male"];
    return maleKeywords.some(kw => String(name).toLowerCase().includes(kw));
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
