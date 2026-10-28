import React, { useState } from 'react';
import { X, Youtube, Sliders, Check, Sparkles, ExternalLink } from 'lucide-react';

export function extractYouTubeId(urlOrId) {
  if (!urlOrId) return 'XPPdim4fLto';
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
  const match = trimmed.match(regExp);
  return match ? match[1] : trimmed;
}

const PRESET_VIDEOS = [
  {
    id: 'XPPdim4fLto',
    title: 'Rainy Balcony & Trees',
    desc: 'Anime girl studying on veranda with rain falling on forest trees',
    badge: 'DEFAULT'
  },
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Girl Live 24/7',
    desc: 'Classic 24/7 study beats window view with cat & rain',
    badge: 'LIVE'
  },
  {
    id: '4xDzrJKXOOY',
    title: 'Midnight Rain Veranda',
    desc: 'Late-night cozy rainstorm outside a Japanese garden room',
    badge: 'RAIN'
  },
  {
    id: 'TURbeWK2wwg',
    title: 'Ghibli Meadow & Summer Breeze',
    desc: 'Lush green grassy hill and gentle watercolor anime clouds',
    badge: 'GHIBLI'
  }
];

export default function DynamicVideoModal({ isOpen, onClose, currentVideoUrl, onSaveVideo, overlayDim, onChangeDim }) {
  const [inputUrl, setInputUrl] = useState(currentVideoUrl || '');
  const [tempDim, setTempDim] = useState(overlayDim || 0.45);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  if (!isOpen) return null;

  const currentExtractedId = extractYouTubeId(inputUrl);

  const handleApplyPreset = (presetId) => {
    setInputUrl(presetId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const id = extractYouTubeId(inputUrl);
    onSaveVideo(id);
    onChangeDim(tempDim);
    onClose();
  };

  return (
    <div className="dynamic-modal-backdrop" onClick={onClose}>
      <div className="dynamic-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dynamic-modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <Youtube size={18} className="text-amber-400" />
            </div>
            <div>
              <h3>Dynamic Video Theme Settings</h3>
              <p>Paste any YouTube URL to stream as your live dashboard background</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dynamic-modal-body">
          {/* Input field */}
          <div className="input-group">
            <label htmlFor="yt-url-input">
              <span>YouTube Video Link or ID:</span>
            </label>
            <div className="input-with-icon">
              <input
                id="yt-url-input"
                type="text"
                placeholder="https://www.youtube.com/watch?v=... or Video ID"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                autoFocus
              />
            </div>
            <span className="input-hint">
              Accepts full URLs (youtube.com/watch?v=..., youtu.be/...) or direct 11-char Video IDs.
            </span>
          </div>

          {/* Quick Presets */}
          <div className="presets-section">
            <label className="section-label">
              <Sparkles size={13} className="text-amber-400" />
              <span>Recommended Ambient Presets:</span>
            </label>
            <div className="preset-grid">
              {PRESET_VIDEOS.map((preset) => {
                const isSelected = currentExtractedId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleApplyPreset(preset.id)}
                  >
                    <div className="preset-top">
                      <span className="preset-name">{preset.title}</span>
                      <span className="preset-badge">{preset.badge}</span>
                    </div>
                    <span className="preset-desc">{preset.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Video Dimming Slider */}
          <div className="dimmer-section">
            <div className="dimmer-header">
              <span className="dimmer-label">
                <Sliders size={13} />
                Background Dimming (Contrast):
              </span>
              <span className="dimmer-val">{Math.round(tempDim * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.75"
              step="0.05"
              value={tempDim}
              onChange={(e) => setTempDim(parseFloat(e.target.value))}
              className="dynamic-slider"
            />
            <div className="slider-hints">
              <span>Vibrant / Transparent (15%)</span>
              <span>High Readability (75%)</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="dynamic-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save">
              <Check size={15} />
              <span>Apply Video Background</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
