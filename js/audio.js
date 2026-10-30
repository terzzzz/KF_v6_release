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

  function maleKeywordsExist(name) {
    const maleKeywords = ["keita", "ichiro", "daichi", "takumi", "naoki", "george", "david", "mark", "alex", "male"];
    return maleKeywords.some(kw => String(name).toLowerCase().includes(kw));
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

    const isMale = voice && maleKeywordsExist(voice.name);
    utterance.rate = 1.25;
    utterance.pitch = isMale ? 0.95 : 0.85;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Fast, snappy Light Punch SFX for D-moves.
   * Combines a 360Hz -> 60Hz rapid triangle body drop (80ms)
   * with a high-pass filtered noise slap (25ms).
   */
  function playLightHitSFX() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.08;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.75, now);
    masterGain.connect(ctx.destination);

    // 1. Snappy Body Tone (Triangle sweep)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + duration);

    oscGain.gain.setValueAtTime(0.85, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + duration);

    // 2. Fist Impact Slap (Highpass noise transient)
    const snapLen = Math.floor(ctx.sampleRate * 0.025);
    const noiseBuffer = ctx.createBuffer(1, snapLen, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < snapLen; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(2200, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + 0.025);
  }

  /**
   * Synthesizes hit sound effects:
   * Non-S / Minor (D-moves): Fast snappy punch impact (playLightHitSFX).
   * Heavy / S-Attack: Small bomb explosion (sub-bass drop + distortion clip + white noise explosion).
   */
  function playHitSFX(heavy = false) {
    if (!heavy) {
      playLightHitSFX();
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.48; // Extended duration for bomb rumble decay

    // Master Output Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.0, now);
    masterGain.connect(ctx.destination);

    // Hard distortion node for explosive clip saturation
    const waveShaper = ctx.createWaveShaper();
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    const drive = 50; // Massive overdrive for bomb hit
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + drive) * x * 20 * deg) / (Math.PI + drive * Math.abs(x));
    }
    waveShaper.curve = curve;
    waveShaper.oversample = "4x";
    waveShaper.connect(masterGain);

    // --- S-ATTACK MINI-BOMB SOUND ENGINE ---

    // 1. SUB-BASS BOMB DROP (160Hz -> 18Hz sub rumble)
    const bombSub = ctx.createOscillator();
    const bombSubGain = ctx.createGain();
    bombSub.type = "sine";
    bombSub.frequency.setValueAtTime(160, now);
    bombSub.frequency.exponentialRampToValueAtTime(18, now + duration);

    bombSubGain.gain.setValueAtTime(1.2, now);
    bombSubGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    bombSub.connect(bombSubGain);
    bombSubGain.connect(masterGain);
    bombSub.start(now);
    bombSub.stop(now + duration);

    // 2. MID-PUNCH BLAST (480Hz -> 30Hz distorted sawtooth sweep)
    const blastOsc = ctx.createOscillator();
    const blastGain = ctx.createGain();
    blastOsc.type = "sawtooth";
    blastOsc.frequency.setValueAtTime(480, now);
    blastOsc.frequency.exponentialRampToValueAtTime(30, now + 0.32);

    blastGain.gain.setValueAtTime(0.9, now);
    blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    blastOsc.connect(blastGain);
    blastGain.connect(waveShaper);
    blastOsc.start(now);
    blastOsc.stop(now + 0.32);

    // 3. EXPLOSION NOISE BURST (Filtered white noise shockwave)
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Lowpass Filter sweep for muffled explosive boom
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(3200, now);
    lowpass.frequency.exponentialRampToValueAtTime(120, now + duration * 0.9);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.85);

    noiseSource.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(waveShaper);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  }

  g.KFAudio = { shout, playHitSFX, playLightHitSFX, getAudioContext };
})(window);
