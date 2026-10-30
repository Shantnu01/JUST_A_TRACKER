// Daymark Native Web Audio Focus Engine
// Supports both Real Nature Audio Web Streams (Rain, Birds, River) & Synthetic Procedural Fallback

let audioCtx = null;
let currentSource = null;
let gainNode = null;
let activeSoundType = 'off';
let realAudioEl = null;

const REAL_AUDIO_STREAMS = {
  rain: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3?filename=soft-rain-ambient-111154.mp3',
  birds: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=birds-in-the-forest-24189.mp3',
  river: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=birds-singing-calm-river-nature-ambient-sound-12470.mp3'
};

export function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Global user-gesture unlock listener for mobile browsers
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

// Generate 5 seconds of looping Brownian (Brown) Noise
function createBrownNoiseBuffer(ctx) {
  const bufferSize = ctx.sampleRate * 5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5; // Gain compensation
  }
  return buffer;
}

// Generate 5 seconds of looping Pink Noise (Paul Kellet's algorithm)
function createPinkNoiseBuffer(ctx) {
  const bufferSize = ctx.sampleRate * 5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

export function stopFocusSound() {
  if (realAudioEl) {
    try {
      realAudioEl.pause();
      realAudioEl.currentTime = 0;
      realAudioEl.src = '';
    } catch {}
    realAudioEl = null;
  }
  if (currentSource) {
    try {
      if (currentSource.destroy) {
        currentSource.destroy();
      } else if (currentSource.stop) {
        currentSource.stop();
      } else if (currentSource.oscLeft && currentSource.oscRight) {
        currentSource.oscLeft.stop();
        currentSource.oscRight.stop();
      } else if (currentSource.carrier) {
        currentSource.carrier.stop();
        if (currentSource.modulator) currentSource.modulator.stop();
      }
    } catch {}
    currentSource = null;
  }
  activeSoundType = 'off';
}

export function setSoundVolume(volume) {
  const safeVol = Math.max(0.01, Math.min(1, volume || 0.4));
  if (realAudioEl) {
    try {
      realAudioEl.volume = safeVol;
    } catch {}
  }
  if (gainNode && audioCtx) {
    try {
      gainNode.gain.setValueAtTime(safeVol, audioCtx.currentTime);
    } catch {
      gainNode.gain.value = safeVol;
    }
  }
}

// Helper: Start synthetic rain sound with droplet taps
function startRainSound(ctx, destGain) {
  const buffer = createPinkNoiseBuffer(ctx);
  const rainSrc = ctx.createBufferSource();
  rainSrc.buffer = buffer;
  rainSrc.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(1150, ctx.currentTime);

  const rainGain = ctx.createGain();
  rainGain.gain.setValueAtTime(0.75, ctx.currentTime);

  rainSrc.connect(lowpass);
  lowpass.connect(rainGain);
  rainGain.connect(destGain);
  rainSrc.start(0);

  // Periodic subtle water droplet taps
  let isRunning = true;
  let dropletTimer = null;

  function scheduleDroplet() {
    if (!isRunning || !ctx || ctx.state === 'closed') return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const dropGain = ctx.createGain();
      const freq = 1400 + Math.random() * 1200;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, now + 0.035);

      dropGain.gain.setValueAtTime(0.0001, now);
      dropGain.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.02, now + 0.004);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(dropGain);
      dropGain.connect(destGain);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}

    const nextDelay = 140 + Math.random() * 320;
    dropletTimer = setTimeout(scheduleDroplet, nextDelay);
  }

  scheduleDroplet();

  return {
    destroy: () => {
      isRunning = false;
      if (dropletTimer) clearTimeout(dropletTimer);
      try {
        rainSrc.stop();
        rainSrc.disconnect();
        lowpass.disconnect();
        rainGain.disconnect();
      } catch {}
    }
  };
}

// Helper: Start synthetic birdsong with forest breeze
function startBirdSound(ctx, destGain) {
  // Ambient breeze bed
  const buffer = createPinkNoiseBuffer(ctx);
  const breezeSrc = ctx.createBufferSource();
  breezeSrc.buffer = buffer;
  breezeSrc.loop = true;

  const breezeFilter = ctx.createBiquadFilter();
  breezeFilter.type = 'bandpass';
  breezeFilter.frequency.setValueAtTime(500, ctx.currentTime);
  breezeFilter.Q.setValueAtTime(0.7, ctx.currentTime);

  const breezeGain = ctx.createGain();
  breezeGain.gain.setValueAtTime(0.05, ctx.currentTime);

  breezeSrc.connect(breezeFilter);
  breezeFilter.connect(breezeGain);
  breezeGain.connect(destGain);
  breezeSrc.start(0);

  // Procedural bird calls
  let isRunning = true;
  let birdTimer = null;

  function scheduleBirdCall() {
    if (!isRunning || !ctx || ctx.state === 'closed') return;
    try {
      const now = ctx.currentTime;
      const numChirps = Math.floor(Math.random() * 3) + 1;
      const baseFreq = 2600 + Math.random() * 1200;

      for (let c = 0; c < numChirps; c++) {
        const chirpStart = now + c * (0.08 + Math.random() * 0.04);
        const osc = ctx.createOscillator();
        const chirpGain = ctx.createGain();

        osc.type = 'sine';
        const sweepUp = Math.random() > 0.45;
        if (sweepUp) {
          osc.frequency.setValueAtTime(baseFreq, chirpStart);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, chirpStart + 0.035);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, chirpStart + 0.07);
        } else {
          osc.frequency.setValueAtTime(baseFreq * 1.4, chirpStart);
          osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, chirpStart + 0.065);
        }

        chirpGain.gain.setValueAtTime(0.0001, chirpStart);
        chirpGain.gain.linearRampToValueAtTime(0.055 + Math.random() * 0.03, chirpStart + 0.012);
        chirpGain.gain.exponentialRampToValueAtTime(0.0001, chirpStart + 0.07);

        osc.connect(chirpGain);
        chirpGain.connect(destGain);

        osc.start(chirpStart);
        osc.stop(chirpStart + 0.075);
      }
    } catch {}

    const nextDelay = 1800 + Math.random() * 2600;
    birdTimer = setTimeout(scheduleBirdCall, nextDelay);
  }

  scheduleBirdCall();

  return {
    destroy: () => {
      isRunning = false;
      if (birdTimer) clearTimeout(birdTimer);
      try {
        breezeSrc.stop();
        breezeSrc.disconnect();
        breezeFilter.disconnect();
        breezeGain.disconnect();
      } catch {}
    }
  };
}

export async function playFocusSound(type, volume = 0.4) {
  stopFocusSound();
  if (type === 'off') return;

  const safeVol = Math.max(0.01, Math.min(1, volume || 0.4));

  // 1. If it's a real web audio soundscape stream (Rain, Birds, River), stream high-fidelity recording
  if (REAL_AUDIO_STREAMS[type]) {
    try {
      const audio = new Audio(REAL_AUDIO_STREAMS[type]);
      audio.loop = true;
      audio.volume = safeVol;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            realAudioEl = audio;
            activeSoundType = type;
          })
          .catch(() => {
            // If autoplay policy or network blocks, fall back to procedural synthesis
            startProceduralFallback(type, safeVol);
          });
      }
      return;
    } catch {
      startProceduralFallback(type, safeVol);
      return;
    }
  }

  // 2. Synthetic procedural focus generators (Brown noise, Pink noise, Binaural waves)
  startProceduralFallback(type, safeVol);
}

function startProceduralFallback(type, safeVol) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  gainNode = ctx.createGain();
  try {
    gainNode.gain.setValueAtTime(safeVol, ctx.currentTime);
  } catch {
    gainNode.gain.value = safeVol;
  }
  gainNode.connect(ctx.destination);

  if (type === 'brown') {
    const buffer = createBrownNoiseBuffer(ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNode);
    source.start(0);
    currentSource = source;
    activeSoundType = 'brown';
  } else if (type === 'pink') {
    const buffer = createPinkNoiseBuffer(ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNode);
    source.start(0);
    currentSource = source;
    activeSoundType = 'pink';
  } else if (type === 'rain') {
    currentSource = startRainSound(ctx, gainNode);
    activeSoundType = 'rain';
  } else if (type === 'birds' || type === 'river') {
    currentSource = startBirdSound(ctx, gainNode);
    activeSoundType = type;
  } else if (type === 'binaural') {
    // 40 Hz Gamma Focus
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(216, ctx.currentTime);

    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(0.5, ctx.currentTime);

    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(40, ctx.currentTime);
    modulator.connect(modGain.gain);

    carrier.connect(modGain);
    modGain.connect(gainNode);

    carrier.start(0);
    modulator.start(0);

    currentSource = {
      destroy: () => {
        try {
          carrier.stop();
          modulator.stop();
          carrier.disconnect();
          modulator.disconnect();
          modGain.disconnect();
        } catch {}
      }
    };
    activeSoundType = 'binaural';
  }
}

export function getActiveSoundType() {
  return activeSoundType;
}
