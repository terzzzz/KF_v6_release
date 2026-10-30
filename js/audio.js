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
   * Synthesizes a heavy, bone-crushing impact SFX using multi-layer audio synthesis:
   * Layer 1: Sub-bass sine sweep (deep body thump)
   * Layer 2: Distorted sawtooth sweep (mid-range punch force)
   * Layer 3: Bandpass white noise burst (bone crunch / fracture snap)
   */
  function playHitSFX(heavy = false) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = heavy ? 0.22 : 0.14;

    // Master bus
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.0, now);
    masterGain.connect(ctx.destination);

    // Soft-clipping distortion node for aggressive saturation
    const waveShaper = ctx.createWaveShaper();
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    const k = heavy ? 22 : 10; // Drive factor
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    waveShaper.curve = curve;
    waveShaper.oversample = "4x";
    waveShaper.connect(masterGain);

    // 1. SUB-BASS THUMP (Physical mass weight)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    const startSubFreq = heavy ? 260 : 180;
    subOsc.frequency.setValueAtTime(startSubFreq, now);
    subOsc.frequency.exponentialRampToValueAtTime(22, now + duration);

    subGain.gain.setValueAtTime(heavy ? 0.95 : 0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(now);
    subOsc.stop(now + duration);

    // 2. MID PUNCH (Sawtooth pitch drop driven through distortion)
    const midOsc = ctx.createOscillator();
    const midGain = ctx.createGain();
    midOsc.type = "sawtooth";
    const startMidFreq = heavy ? 680 : 420;
    midOsc.frequency.setValueAtTime(startMidFreq, now);
    midOsc.frequency.exponentialRampToValueAtTime(35, now + duration * 0.85);

    midGain.gain.setValueAtTime(heavy ? 0.8 : 0.5, now);
    midGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.85);

    midOsc.connect(midGain);
    midGain.connect(waveShaper);
    midOsc.start(now);
    midOsc.stop(now + duration);

    // 3. BONE CRUNCH / FRACTURE SNAP (Bandpass filtered white noise burst)
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Bandpass filter isolates crunchy fracture frequencies (1.8kHz - 2.8kHz)
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(heavy ? 2400 : 1800, now);
    filter.Q.setValueAtTime(heavy ? 2.8 : 2.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(heavy ? 0.9 : 0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.16 : 0.09));

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(waveShaper);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);
  }

  g.KFAudio = { shout, playHitSFX, getAudioContext };
})(window);
