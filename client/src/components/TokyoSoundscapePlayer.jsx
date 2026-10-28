import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, MoreHorizontal, Radio, CloudRain, Bird, Brain, Coffee, X } from 'lucide-react';

const SOUNDSCAPES = [
  {
    id: 'radio',
    title: '24/7 Tokyo Chill Beats',
    subtitle: 'LIVE LOFI STUDY BROADCAST',
    icon: Radio,
    desc: 'Continuous live 24/7 stream of chill lofi hip hop & downtempo study beats.'
  },
  {
    id: 'birds',
    title: 'Kyoto Morning & Birdsong',
    subtitle: 'FOREST BIRDS & BAMBOO BREEZE',
    icon: Bird,
    desc: 'Gentle chirping forest birds with soft morning breeze through bamboo leaves.'
  },
  {
    id: 'pure_rain',
    title: 'Tokyo Window Rainstorm',
    subtitle: 'SOOTHING RAIN & WATER DROPLETS',
    icon: CloudRain,
    desc: 'Immersive natural rain acoustics with soft water droplet taps on window glass.'
  },
  {
    id: 'rain',
    title: 'Shibuya Rain & 2am Tape Hum',
    subtitle: 'SYNTHESIZED AMBIENT NOISE (432Hz)',
    icon: CloudRain,
    desc: 'Cozy Tokyo rainfall through glass with 60Hz analog tape warmth.'
  },
  {
    id: 'binaural',
    title: 'Deep Alpha 40Hz Focus',
    subtitle: 'GAMMA/ALPHA BINAURAL OSCILLATOR',
    icon: Brain,
    desc: 'Binaural 40Hz frequency synchronization for sustained coding focus.'
  },
  {
    id: 'coffee',
    title: 'Late-Night Roppongi Vinyl',
    subtitle: 'VINYL CRACKLE & ROOM AMBIENCE',
    icon: Coffee,
    desc: 'Gentle vinyl surface noise and warm midnight cafe room tone.'
  }
];

// Reliable 24/7 Lofi & Chillout Streams with automatic fallback
const RADIO_STREAMS = [
  'https://radio.plaza.one/mp3',
  'https://ice1.somafm.com/groovesalad-128-mp3',
  'https://ice1.somafm.com/lush-128-mp3'
];

export default function TokyoSoundscapePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSoundId, setActiveSoundId] = useState(() => {
    return localStorage.getItem('tokyo-soundscape-id') || 'radio';
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('tokyo-soundscape-vol');
    return saved !== null ? parseFloat(saved) : 0.75;
  });
  const [showMenu, setShowMenu] = useState(false);

  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const audioNodesRef = useRef([]);
  const customTimersRef = useRef([]);
  const htmlAudioRef = useRef(null);
  const menuRef = useRef(null);
  const streamIndexRef = useRef(0);

  const activePreset = SOUNDSCAPES.find(s => s.id === activeSoundId) || SOUNDSCAPES[0];

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Clean stop for all audio sources and timers
  const stopAllAudio = () => {
    // 1. Clear any procedural audio timers (e.g. birdsong / droplets)
    if (customTimersRef.current) {
      customTimersRef.current.forEach(timer => clearTimeout(timer));
      customTimersRef.current = [];
    }

    // 2. Stop Web Audio nodes
    if (audioNodesRef.current) {
      audioNodesRef.current.forEach(node => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch {}
      });
      audioNodesRef.current = [];
    }

    // 3. Stop HTML5 stream
    if (htmlAudioRef.current) {
      try {
        htmlAudioRef.current.pause();
        htmlAudioRef.current.src = '';
        htmlAudioRef.current.load();
      } catch {}
      htmlAudioRef.current = null;
    }

    setIsLoading(false);
  };

  // Teardown on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  // Update volume when slider changes
  useEffect(() => {
    localStorage.setItem('tokyo-soundscape-vol', volume.toString());

    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(volume, audioCtxRef.current.currentTime);
    }
    if (htmlAudioRef.current) {
      htmlAudioRef.current.volume = volume;
    }
  }, [volume]);

  // Helper to create Pink Noise buffer
  const createPinkNoiseBuffer = (ctx, seconds = 2) => {
    const bufferSize = ctx.sampleRate * seconds;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.024;
      b6 = white * 0.115926;
    }
    return noiseBuffer;
  };

  // Play Live Radio Stream with fallback handling
  const playRadioStream = (streamIdx = 0) => {
    setIsLoading(true);
    streamIndexRef.current = streamIdx;
    const url = RADIO_STREAMS[streamIdx % RADIO_STREAMS.length];

    const audio = new Audio();
    // Do NOT set audio.crossOrigin = 'anonymous' (causes CORS blocks on Icecast!)
    audio.src = url;
    audio.volume = volume;

    audio.addEventListener('playing', () => {
      setIsLoading(false);
      setIsPlaying(true);
    });

    audio.addEventListener('waiting', () => {
      setIsLoading(true);
    });

    audio.addEventListener('error', (e) => {
      console.warn(`Radio stream failed for index ${streamIdx} (${url}), trying fallback...`, e);
      if (streamIdx + 1 < RADIO_STREAMS.length) {
        playRadioStream(streamIdx + 1);
      } else {
        setIsLoading(false);
        setIsPlaying(false);
      }
    });

    audio.play().then(() => {
      htmlAudioRef.current = audio;
    }).catch(err => {
      console.warn('Playback error, trying next stream:', err);
      if (streamIdx + 1 < RADIO_STREAMS.length) {
        playRadioStream(streamIdx + 1);
      } else {
        setIsLoading(false);
        setIsPlaying(false);
      }
    });
  };

  // Start selected soundscape
  const startSoundscape = (soundId) => {
    stopAllAudio();

    if (soundId === 'radio') {
      playRadioStream(0);
      return;
    }

    // Web Audio API Synthesis
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Master Gain Node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      const currentNodes = [];

      if (soundId === 'birds') {
        // --- 1. KYOTO MORNING & BIRDSONG ---
        // Ambient breeze bed
        const breezeBuffer = createPinkNoiseBuffer(ctx, 3);
        const breezeSrc = ctx.createBufferSource();
        breezeSrc.buffer = breezeBuffer;
        breezeSrc.loop = true;

        const breezeFilter = ctx.createBiquadFilter();
        breezeFilter.type = 'bandpass';
        breezeFilter.frequency.setValueAtTime(500, ctx.currentTime);
        breezeFilter.Q.setValueAtTime(0.7, ctx.currentTime);

        const breezeGain = ctx.createGain();
        breezeGain.gain.setValueAtTime(0.04, ctx.currentTime);

        breezeSrc.connect(breezeFilter);
        breezeFilter.connect(breezeGain);
        breezeGain.connect(masterGain);
        breezeSrc.start(0);

        currentNodes.push(breezeSrc, breezeFilter, breezeGain);

        // Procedural bird chirps
        let isRunning = true;
        const scheduleBirdChirp = () => {
          if (!isRunning || !ctx || ctx.state === 'closed') return;
          try {
            const now = ctx.currentTime;
            const numChirps = Math.floor(Math.random() * 3) + 1;
            const baseFreq = 2600 + Math.random() * 1400; // 2600 to 4000 Hz

            for (let c = 0; c < numChirps; c++) {
              const chirpStart = now + c * (0.08 + Math.random() * 0.04);
              const osc = ctx.createOscillator();
              const chirpGain = ctx.createGain();

              osc.type = 'sine';
              const sweepUp = Math.random() > 0.45;
              if (sweepUp) {
                osc.frequency.setValueAtTime(baseFreq, chirpStart);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.55, chirpStart + 0.035);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, chirpStart + 0.07);
              } else {
                osc.frequency.setValueAtTime(baseFreq * 1.45, chirpStart);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.82, chirpStart + 0.065);
              }

              chirpGain.gain.setValueAtTime(0.0001, chirpStart);
              chirpGain.gain.linearRampToValueAtTime(0.08 + Math.random() * 0.03, chirpStart + 0.012);
              chirpGain.gain.exponentialRampToValueAtTime(0.0001, chirpStart + 0.07);

              osc.connect(chirpGain);
              chirpGain.connect(masterGain);

              osc.start(chirpStart);
              osc.stop(chirpStart + 0.075);
            }
          } catch {}

          const nextDelay = 1800 + Math.random() * 2400; // 1.8s to 4.2s interval
          const t = setTimeout(scheduleBirdChirp, nextDelay);
          customTimersRef.current.push(t);
        };

        scheduleBirdChirp();
      } else if (soundId === 'pure_rain') {
        // --- 2. TOKYO WINDOW RAINSTORM (Pure Natural Rain) ---
        const rainBuffer = createPinkNoiseBuffer(ctx, 3);
        const rainSrc = ctx.createBufferSource();
        rainSrc.buffer = rainBuffer;
        rainSrc.loop = true;

        const rainFilter = ctx.createBiquadFilter();
        rainFilter.type = 'lowpass';
        rainFilter.frequency.setValueAtTime(1150, ctx.currentTime);

        const rainGain = ctx.createGain();
        rainGain.gain.setValueAtTime(0.08, ctx.currentTime);

        rainSrc.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(masterGain);
        rainSrc.start(0);

        currentNodes.push(rainSrc, rainFilter, rainGain);

        // Water droplet taps
        let isRunning = true;
        const scheduleDroplet = () => {
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
            dropGain.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.02, now + 0.004);
            dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

            osc.connect(dropGain);
            dropGain.connect(masterGain);

            osc.start(now);
            osc.stop(now + 0.04);
          } catch {}

          const nextDelay = 130 + Math.random() * 320;
          const t = setTimeout(scheduleDroplet, nextDelay);
          customTimersRef.current.push(t);
        };

        scheduleDroplet();
      } else if (soundId === 'rain') {
        // --- 3. SHIBUYA RAIN & 2AM TAPE HUM ---
        const noiseBuffer = createPinkNoiseBuffer(ctx, 2);
        const rainSource = ctx.createBufferSource();
        rainSource.buffer = noiseBuffer;
        rainSource.loop = true;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(850, ctx.currentTime);

        const humOsc = ctx.createOscillator();
        humOsc.type = 'sine';
        humOsc.frequency.setValueAtTime(60, ctx.currentTime);
        const humGain = ctx.createGain();
        humGain.gain.setValueAtTime(0.012, ctx.currentTime);

        rainSource.connect(lowpass);
        lowpass.connect(masterGain);
        humOsc.connect(humGain);
        humGain.connect(masterGain);

        rainSource.start(0);
        humOsc.start(0);

        currentNodes.push(rainSource, humOsc, lowpass, humGain);
      } else if (soundId === 'binaural') {
        // --- 4. DEEP ALPHA / 40Hz FOCUS ---
        const merger = ctx.createChannelMerger(2);

        const oscL = ctx.createOscillator();
        oscL.type = 'sine';
        oscL.frequency.setValueAtTime(216, ctx.currentTime);

        const oscR = ctx.createOscillator();
        oscR.type = 'sine';
        oscR.frequency.setValueAtTime(256, ctx.currentTime);

        const gainL = ctx.createGain();
        gainL.gain.setValueAtTime(0.04, ctx.currentTime);
        const gainR = ctx.createGain();
        gainR.gain.setValueAtTime(0.04, ctx.currentTime);

        oscL.connect(gainL);
        gainL.connect(merger, 0, 0);
        oscR.connect(gainR);
        gainR.connect(merger, 0, 1);

        const padBuffer = createPinkNoiseBuffer(ctx, 2);
        const brownSrc = ctx.createBufferSource();
        brownSrc.buffer = padBuffer;
        brownSrc.loop = true;
        const padFilter = ctx.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(320, ctx.currentTime);

        brownSrc.connect(padFilter);
        padFilter.connect(masterGain);
        merger.connect(masterGain);

        oscL.start(0);
        oscR.start(0);
        brownSrc.start(0);

        currentNodes.push(oscL, oscR, brownSrc, gainL, gainR, merger, padFilter);
      } else if (soundId === 'coffee') {
        // --- 5. LATE-NIGHT ROPPONGI VINYL ---
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const out = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          const isPop = Math.random() < 0.0003;
          const pop = isPop ? (Math.random() * 2 - 1) * 0.12 : 0;
          const brown = (Math.random() * 2 - 1) * 0.008;
          out[i] = pop + brown;
        }

        const vinylSrc = ctx.createBufferSource();
        vinylSrc.buffer = noiseBuffer;
        vinylSrc.loop = true;

        const warmFilter = ctx.createBiquadFilter();
        warmFilter.type = 'bandpass';
        warmFilter.frequency.setValueAtTime(450, ctx.currentTime);
        warmFilter.Q.setValueAtTime(1.2, ctx.currentTime);

        vinylSrc.connect(warmFilter);
        warmFilter.connect(masterGain);
        vinylSrc.start(0);

        currentNodes.push(vinylSrc, warmFilter);
      }

      audioNodesRef.current = currentNodes;
      setIsPlaying(true);
      setIsLoading(false);
    } catch (err) {
      console.warn('Audio Context initialization error:', err);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying || isLoading) {
      stopAllAudio();
      setIsPlaying(false);
    } else {
      startSoundscape(activeSoundId);
    }
  };

  const handleSelectSound = (soundId) => {
    setActiveSoundId(soundId);
    localStorage.setItem('tokyo-soundscape-id', soundId);
    if (isPlaying || isLoading) {
      startSoundscape(soundId);
    }
    setShowMenu(false);
  };

  return (
    <div className="tokyo-ambient-player-container" ref={menuRef}>
      {/* 1. Main Player Strip Matching media_1793169455883_c2054737.png */}
      <div className="tokyo-ambient-player">
        <div className="tokyo-player-left">
          {/* Circular Amber Play/Pause Button */}
          <button
            type="button"
            className={`tokyo-audio-toggle-btn ${isLoading ? 'loading' : ''}`}
            onClick={handleTogglePlay}
            title={isPlaying ? 'Pause Study Soundscape' : 'Play Study Soundscape'}
          >
            {isLoading ? (
              <svg className="animate-spin" style={{ width: '13px', height: '13px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
              </svg>
            ) : isPlaying ? (
              <svg style={{ width: '13px', height: '13px' }} fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg style={{ width: '13px', height: '13px', marginLeft: '2px' }} fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {/* Sound Title & Frequency Tag */}
          <div className="tokyo-player-info">
            <div className="tokyo-player-title">{activePreset.title}</div>
            <div className="tokyo-player-sub">
              {isLoading ? 'BUFFERING 24/7 STREAM...' : activePreset.subtitle}
            </div>
          </div>
        </div>

        {/* Right: Visualizer & Menu Button (•••) */}
        <div className="tokyo-player-right">
          <div className={`tokyo-visualizer ${isPlaying ? 'playing' : ''}`}>
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
          </div>

          <button
            type="button"
            className={`tokyo-sound-menu-btn ${showMenu ? 'active' : ''}`}
            onClick={() => setShowMenu(prev => !prev)}
            title="Soundscape Presets & Volume"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* 2. Interactive Soundscape Popover Menu (when ••• is clicked) */}
      {showMenu && (
        <div className="tokyo-sound-dropdown">
          <div className="tokyo-sound-dropdown-header">
            <span className="dropdown-eyebrow">STUDY SOUNDSCAPES // 音響選択</span>
            <button
              type="button"
              className="dropdown-close-btn"
              onClick={() => setShowMenu(false)}
            >
              <X size={13} />
            </button>
          </div>

          {/* Preset List */}
          <div className="tokyo-sound-list">
            {SOUNDSCAPES.map(item => {
              const Icon = item.icon;
              const isSelected = item.id === activeSoundId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`tokyo-sound-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectSound(item.id)}
                >
                  <div className="option-icon-box">
                    <Icon size={14} />
                  </div>
                  <div className="option-text-box">
                    <div className="option-title-row">
                      <span className="option-name">{item.title}</span>
                      {isSelected && <span className="option-active-badge">ACTIVE</span>}
                    </div>
                    <span className="option-desc">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Volume Slider Row */}
          <div className="tokyo-sound-volume-row">
            <button
              type="button"
              className="volume-icon-btn"
              onClick={() => setVolume(v => v > 0 ? 0 : 0.75)}
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="tokyo-volume-slider"
            />
            <span className="volume-percent">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
