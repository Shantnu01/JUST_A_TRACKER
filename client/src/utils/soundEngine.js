// Daymark Native Web & YouTube Focus Audio Engine
// Real YouTube Ambience Streams & Native Fallback:
// 1. Rain: https://www.youtube.com/watch?v=Jvgx5HHJ0qw (Rooftop Rain Ambience)
// 2. Birds: https://www.youtube.com/watch?v=Kc4u56Y-FAQ (Relaxing Forest Birdsong)
// 3. Waves: https://www.youtube.com/watch?v=vPhg6sc1Mk4 (Relaxing Ocean Waves)
// 4. 40Hz: https://www.youtube.com/watch?v=lkkGlVWvkLk (40Hz Gamma Focus Beats)

let activeSoundType = 'off';
let activeVolume = 0.5;

// Exact YouTube ambient streams provided by user
export const YOUTUBE_SOUND_IDS = {
  rain: 'Jvgx5HHJ0qw',
  birds: 'Kc4u56Y-FAQ',
  waves: 'vPhg6sc1Mk4',
  wave: 'vPhg6sc1Mk4',
  river: 'vPhg6sc1Mk4',
  '40hz': 'lkkGlVWvkLk',
  binaural: 'lkkGlVWvkLk'
};

export const SOUND_DEFINITIONS = [
  {
    id: 'rain',
    name: 'Real Rain',
    badge: '🌧️ Rain',
    youtubeId: 'Jvgx5HHJ0qw',
    title: 'Rooftop Study Room with Rain Sounds',
    desc: 'Deep continuous soothing rainfall for concentration'
  },
  {
    id: 'birds',
    name: 'Forest Birds',
    badge: '🐦 Birds',
    youtubeId: 'Kc4u56Y-FAQ',
    title: 'Relaxing Nature Bird Sounds for Studying',
    desc: 'Gentle, natural forest bird chirping in calm woodland'
  },
  {
    id: 'waves',
    name: 'Ocean Waves',
    badge: '🌊 Waves',
    youtubeId: 'vPhg6sc1Mk4',
    title: 'The Most Relaxing Waves Ever - Ocean Sounds',
    desc: 'Calm rhythmic ocean water waves to sleep and study'
  },
  {
    id: '40hz',
    name: '40Hz Tone',
    badge: '🧠 40Hz',
    youtubeId: 'lkkGlVWvkLk',
    title: 'Intense Study - 40Hz Gamma Binaural Beats',
    desc: 'Scientifically tuned 40Hz gamma binaural beat for deep mental flow'
  }
];

// Helper: Get or create invisible YouTube iframe audio player
function getOrCreateYouTubePlayer() {
  if (typeof document === 'undefined') return null;
  let player = document.getElementById('daymark-yt-sound-player');
  if (!player) {
    player = document.createElement('iframe');
    player.id = 'daymark-yt-sound-player';
    player.title = 'Daymark Focus Audio Player';
    player.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    player.style.position = 'fixed';
    player.style.bottom = '10px';
    player.style.right = '10px';
    player.style.width = '120px';
    player.style.height = '80px';
    player.style.opacity = '0.001';
    player.style.pointerEvents = 'none';
    player.style.zIndex = '-99999';
    document.body.appendChild(player);
  }
  return player;
}

function sendYtCommand(player, func, args = []) {
  if (player && player.contentWindow) {
    try {
      player.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    } catch {}
  }
}

export function stopFocusSound() {
  const player = typeof document !== 'undefined' ? document.getElementById('daymark-yt-sound-player') : null;
  if (player) {
    try {
      sendYtCommand(player, 'stopVideo');
      sendYtCommand(player, 'pauseVideo');
      player.src = 'about:blank';
    } catch {}
  }

  // Also stop any HTML5 audio element if active
  if (typeof window !== 'undefined' && window.__daymarkAudio) {
    try {
      window.__daymarkAudio.pause();
      window.__daymarkAudio.src = '';
    } catch {}
    window.__daymarkAudio = null;
  }

  activeSoundType = 'off';
}

export function setSoundVolume(volume) {
  const safeVol = Math.max(0.01, Math.min(1, volume != null ? volume : 0.5));
  activeVolume = safeVol;

  const player = typeof document !== 'undefined' ? document.getElementById('daymark-yt-sound-player') : null;
  if (player) {
    const volInt = Math.round(safeVol * 100);
    sendYtCommand(player, 'setVolume', [volInt]);
    sendYtCommand(player, 'unMute');
  }

  if (typeof window !== 'undefined' && window.__daymarkAudio) {
    try {
      window.__daymarkAudio.volume = safeVol;
    } catch {}
  }
}

export function playFocusSound(type, volume = 0.5) {
  stopFocusSound();
  if (!type || type === 'off') return;

  const safeVol = Math.max(0.01, Math.min(1, volume != null ? volume : 0.5));
  activeVolume = safeVol;

  // Resolve key to video ID
  const normalizedKey = (type === 'wave' || type === 'river') ? 'waves' : (type === 'binaural') ? '40hz' : type;
  const videoId = YOUTUBE_SOUND_IDS[normalizedKey] || YOUTUBE_SOUND_IDS[type];

  if (videoId) {
    const player = getOrCreateYouTubePlayer();
    if (player) {
      // Load YouTube embed with autoplay & looping enabled
      const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&loop=1&playlist=${videoId}&playsinline=1&controls=0&rel=0`;
      player.src = embedUrl;

      // Ensure unmuted & set volume with progressive retries as iframe loads
      [400, 800, 1500, 2500].forEach((delay) => {
        setTimeout(() => {
          sendYtCommand(player, 'unMute');
          sendYtCommand(player, 'setVolume', [Math.round(safeVol * 100)]);
          sendYtCommand(player, 'playVideo');
        }, delay);
      });

      activeSoundType = normalizedKey;
      return;
    }
  }

  // Fallback to local audio file if YouTube player not available
  const localMap = {
    rain: '/sounds/rain.mp3',
    birds: '/sounds/birds.mp3',
    waves: '/sounds/river.mp3',
    '40hz': '/sounds/rain.mp3'
  };

  if (localMap[normalizedKey] && typeof Audio !== 'undefined') {
    try {
      const audio = new Audio(localMap[normalizedKey]);
      audio.loop = true;
      audio.volume = safeVol;
      audio.play().then(() => {
        if (typeof window !== 'undefined') window.__daymarkAudio = audio;
        activeSoundType = normalizedKey;
      }).catch(() => {});
    } catch {}
  }
}

export function getActiveSoundType() {
  return activeSoundType;
}

export function getActiveSoundVolume() {
  return activeVolume;
}
