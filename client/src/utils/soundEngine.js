// Daymark Native Web Audio Focus Engine
// 100% Client-side synthetic soundscapes: Zero network requests, Zero dependencies

let audioCtx = null;
let currentSource = null;
let gainNode = null;
let activeSoundType = 'off';

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
  if (currentSource) {
    try {
      if (currentSource.stop) {
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
  if (gainNode && audioCtx) {
    const v = Math.max(0.01, Math.min(1, volume || 0.4));
    try {
      gainNode.gain.setValueAtTime(v, audioCtx.currentTime);
    } catch {
      gainNode.gain.value = v;
    }
  }
}

export async function playFocusSound(type, volume = 0.4) {
  stopFocusSound();
  if (type === 'off') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {}
  }

  gainNode = ctx.createGain();
  const safeVol = Math.max(0.01, Math.min(1, volume || 0.4));
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
  } else if (type === 'binaural') {
    // 40 Hz Gamma Focus: Works on both stereo headphones & mobile phone speakers
    // Uses 200 Hz carrier frequency with a 40 Hz amplitude modulation so phone speakers reproduce the 40Hz beat clearly!
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(216, ctx.currentTime); // 216 Hz soothing warm tone

    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(0.5, ctx.currentTime);

    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(40, ctx.currentTime); // 40 Hz Gamma rhythm
    modulator.connect(modGain.gain);

    carrier.connect(modGain);
    modGain.connect(gainNode);

    carrier.start(0);
    modulator.start(0);

    currentSource = { carrier, modulator };
    activeSoundType = 'binaural';
  }
}

export function getActiveSoundType() {
  return activeSoundType;
}
