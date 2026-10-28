import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, MoreHorizontal, Radio, CloudRain, Brain, Coffee, Check, X } from 'lucide-react';

const SOUNDSCAPES = [
  {
    id: 'rain',
    title: 'Shibuya Rain & 2am Tape Hum',
    subtitle: 'SYNTHESIZED AMBIENT NOISE (432Hz)',
    icon: CloudRain,
    desc: 'Cozy Tokyo rainfall through window glass with 60Hz analog tape warmth.'
  },
  {
    id: 'radio',
    title: '24/7 Tokyo Chill Beats',
    subtitle: 'LIVE DOWNTEMPO STUDY BROADCAST',
    icon: Radio,
    desc: 'Continuous stream of royalty-free lofi downtempo beats for deep work.'
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

const STREAM_URL = 'https://ice1.somafm.com/groovesalad-128-mp3';

export default function TokyoSoundscapePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSoundId, setActiveSoundId] = useState(() => {
    return localStorage.getItem('tokyo-soundscape-id') || 'rain';
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('tokyo-soundscape-vol');
    return saved !== null ? parseFloat(saved) : 0.75;
  });
  const [showMenu, setShowMenu] = useState(false);

  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const audioNodesRef = useRef([]);
  const htmlAudioRef = useRef(null);
  const menuRef = useRef(null);

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

  // Clean stop for all audio sources
  const stopAllAudio = () => {
    // 1. Stop Web Audio nodes
    if (audioNodesRef.current) {
      audioNodesRef.current.forEach(node => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch {}
      });
      audioNodesRef.current = [];
    }

    // 2. Stop HTML5 stream
    if (htmlAudioRef.current) {
      try {
        htmlAudioRef.current.pause();
        htmlAudioRef.current.src = '';
        htmlAudioRef.current.load();
      } catch {}
      htmlAudioRef.current = null;
    }
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

  // Start selected soundscape
  const startSoundscape = (soundId) => {
    stopAllAudio();

    if (soundId === 'radio') {
      // Stream live audio via HTML5 Audio element
      const audio = new Audio(STREAM_URL);
      audio.crossOrigin = 'anonymous';
      audio.volume = volume;
      audio.play().then(() => {
        htmlAudioRef.current = audio;
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Live stream playback blocked or failed:', err);
        setIsPlaying(false);
      });
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

      if (soundId === 'rain') {
        // --- 1. SHIBUYA RAIN & 2AM TAPE HUM ---
        // Pink Noise Buffer for natural rain sound
        const bufferSize = ctx.sampleRate * 2;
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

        const rainSource = ctx.createBufferSource();
        rainSource.buffer = noiseBuffer;
        rainSource.loop = true;

        // Lowpass filter for warm window acoustics
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(850, ctx.currentTime);

        // 60Hz Vintage Tape Hum
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
        // --- 2. DEEP ALPHA / 40Hz FOCUS ---
        // Left Ear: 216Hz carrier / Right Ear: 256Hz (40Hz Gamma differential)
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
        gainL.connect(merger, 0, 0); // left channel
        oscR.connect(gainR);
        gainR.connect(merger, 0, 1); // right channel

        // Gentle warm pad underlay
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const out = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          out[i] = (Math.random() * 2 - 1) * 0.005;
        }
        const brownSrc = ctx.createBufferSource();
        brownSrc.buffer = noiseBuffer;
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
        // --- 3. LATE-NIGHT ROPPONGI VINYL ---
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const out = noiseBuffer.getChannelData(0);

        // Soft vinyl crackle & warm room tone
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
    } catch (err) {
      console.warn('Audio Context initialization prevented:', err);
      setIsPlaying(false);
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAllAudio();
      setIsPlaying(false);
    } else {
      startSoundscape(activeSoundId);
    }
  };

  const handleSelectSound = (soundId) => {
    setActiveSoundId(soundId);
    localStorage.setItem('tokyo-soundscape-id', soundId);
    if (isPlaying) {
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
            className="tokyo-audio-toggle-btn"
            onClick={handleTogglePlay}
            title={isPlaying ? 'Pause Study Soundscape' : 'Play Study Soundscape'}
          >
            {isPlaying ? (
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
            <div className="tokyo-player-sub">{activePreset.subtitle}</div>
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
