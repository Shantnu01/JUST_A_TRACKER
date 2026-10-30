// Daymark Native Web Audio Focus Engine
// High-Fidelity Soothing Focus Soundscapes: Real Rain, Birds Chirping, Calm River, & 40Hz Concentration Tone

let audioCtx = null;
let currentSource = null;
let gainNode = null;
let activeSoundType = 'off';
let realAudioEl = null;

// Verified Real Audio Files stored locally in /sounds/ with remote fallback
const REAL_AUDIO_STREAMS = {
  rain: '/sounds/rain.mp3',
  birds: '/sounds/birds.mp3',
  river: '/sounds/river.mp3'
};

const REMOTE_FALLBACKS = {
  rain: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_db6591201e.mp3',
  birds: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
  river: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3'
};

export const SOUND_DEFINITIONS = [
  {
    id: 'rain',
    name: 'Real Rain',
    badge: '🌧️ Real Rain',
    desc: 'Soothing continuous gentle rainfall for deep concentration'
  },
  {
    id: 'birds',
    name: 'Birds Chirping',
    badge: '🐦 Birds Chirping',
    desc: 'Peaceful woodland birds chirping in calm nature'
  },
  {
    id: 'river',
    name: 'Calm River',
    badge: '🌊 Calm River',
    desc: 'Gentle flowing river stream and water currents'
  },
  {
    id: 'binaural',
    name: '40Hz Focus',
    badge: '🧠 40Hz Tone',
    desc: 'Soothing low-frequency 40Hz gamma tone for peak study & focus'
  }
];

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

// User-gesture audio context unlock listener
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
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

// --------------------------------------------------------------------------
// Soothing Low-Frequency 40Hz Concentration Tone Generator
// Uses warm 136.1 Hz (OM / calm alpha) carrier modulated smoothly at 40 Hz (Gamma)
// Filtered with a steep 220Hz lowpass filter for an ultra-soothing, non-fatiguing drone
// --------------------------------------------------------------------------
function start40HzConcentrationTone(ctx, destGain) {
  const now = ctx.currentTime;

  // Warm low-frequency carrier (136.1 Hz meditative root)
  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(136.1, now);

  // Secondary sub-harmonic for rich acoustic depth (68.05 Hz)
  const subCarrier = ctx.createOscillator();
  subCarrier.type = 'sine';
  subCarrier.frequency.setValueAtTime(68.05, now);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.3, now);
  subCarrier.connect(subGain);

  // 40 Hz Gamma Modulator LFO (smooth concentration rhythm)
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(40, now);

  // Modulation Depth Gain (gentle 28% depth to stay completely soothing)
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.setValueAtTime(0.28, now);
  lfo.connect(lfoDepth);

  // Amplitude VCA
  const vca = ctx.createGain();
  vca.gain.setValueAtTime(0.72, now);
  lfoDepth.connect(vca.gain);

  carrier.connect(vca);
  subGain.connect(vca);

  // Lowpass filter to eliminate any harsh high frequencies
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(220, now);
  lowpass.Q.setValueAtTime(0.7, now);

  vca.connect(lowpass);
  lowpass.connect(destGain);

  carrier.start(now);
  subCarrier.start(now);
  lfo.start(now);

  return {
    destroy: () => {
      try {
        carrier.stop();
        subCarrier.stop();
        lfo.stop();
        carrier.disconnect();
        subCarrier.disconnect();
        lfo.disconnect();
        vca.disconnect();
        lowpass.disconnect();
      } catch {}
    }
  };
}

// Helper: Procedural Soothing Rain Fallback (Low-frequency warm rainfall)
function startProceduralRain(ctx, destGain) {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.025 * white) / 1.025;
    lastOut = data[i];
    data[i] *= 3.0;
  }

  const rainSrc = ctx.createBufferSource();
  rainSrc.buffer = buffer;
  rainSrc.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(700, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.65, ctx.currentTime);

  rainSrc.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(destGain);
  rainSrc.start(0);

  return {
    destroy: () => {
      try {
        rainSrc.stop();
        rainSrc.disconnect();
        lowpass.disconnect();
        gain.disconnect();
      } catch {}
    }
  };
}

// Helper: Procedural Soothing River Stream Fallback
function startProceduralRiver(ctx, destGain) {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99 * b0 + white * 0.08;
    b1 = 0.95 * b1 + white * 0.15;
    b2 = 0.85 * b2 + white * 0.3;
    data[i] = (b0 + b1 + b2) * 0.18;
  }

  const streamSrc = ctx.createBufferSource();
  streamSrc.buffer = buffer;
  streamSrc.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(550, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.6, ctx.currentTime);

  streamSrc.connect(filter);
  filter.connect(gain);
  gain.connect(destGain);
  streamSrc.start(0);

  return {
    destroy: () => {
      try {
        streamSrc.stop();
        streamSrc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {}
    }
  };
}

export async function playFocusSound(type, volume = 0.4) {
  stopFocusSound();
  if (!type || type === 'off') return;

  const safeVol = Math.max(0.01, Math.min(1, volume || 0.4));

  // Map backwards compatibility aliases
  let soundKey = type;
  if (type === '40hz') soundKey = 'binaural';
  if (type === 'brown' || type === 'pink') soundKey = 'rain';

  // 1. Soothing 40Hz Concentration Tone
  if (soundKey === 'binaural') {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(safeVol, ctx.currentTime);
    gainNode.connect(ctx.destination);

    currentSource = start40HzConcentrationTone(ctx, gainNode);
    activeSoundType = 'binaural';
    return;
  }

  // 2. Real Nature Soundscape Streams (Rain, Birds, River)
  const localPath = REAL_AUDIO_STREAMS[soundKey];
  if (localPath) {
    try {
      const audio = new Audio(localPath);
      audio.loop = true;
      audio.volume = safeVol;

      audio.addEventListener('error', () => {
        // Fallback to remote CDN if local path fails
        const remoteUrl = REMOTE_FALLBACKS[soundKey];
        if (remoteUrl) {
          try {
            const fallbackAudio = new Audio(remoteUrl);
            fallbackAudio.loop = true;
            fallbackAudio.volume = safeVol;
            fallbackAudio.play().then(() => {
              realAudioEl = fallbackAudio;
              activeSoundType = soundKey;
            }).catch(() => {
              startProceduralSound(soundKey, safeVol);
            });
          } catch {
            startProceduralSound(soundKey, safeVol);
          }
        } else {
          startProceduralSound(soundKey, safeVol);
        }
      });

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            realAudioEl = audio;
            activeSoundType = soundKey;
          })
          .catch(() => {
            startProceduralSound(soundKey, safeVol);
          });
      }
      return;
    } catch {
      startProceduralSound(soundKey, safeVol);
      return;
    }
  }

  // Fallback
  startProceduralSound(soundKey, safeVol);
}

function startProceduralSound(type, safeVol) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  gainNode = ctx.createGain();
  try {
    gainNode.gain.setValueAtTime(safeVol, ctx.currentTime);
  } catch {
    gainNode.gain.value = safeVol;
  }
  gainNode.connect(ctx.destination);

  if (type === 'rain') {
    currentSource = startProceduralRain(ctx, gainNode);
    activeSoundType = 'rain';
  } else if (type === 'river') {
    currentSource = startProceduralRiver(ctx, gainNode);
    activeSoundType = 'river';
  } else if (type === 'birds') {
    currentSource = startProceduralRiver(ctx, gainNode); // gentle soft ambient fallback
    activeSoundType = 'birds';
  } else {
    currentSource = start40HzConcentrationTone(ctx, gainNode);
    activeSoundType = 'binaural';
  }
}

export function getActiveSoundType() {
  return activeSoundType;
}
