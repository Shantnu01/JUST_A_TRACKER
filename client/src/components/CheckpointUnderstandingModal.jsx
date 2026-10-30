import React, { useState, useEffect } from 'react';
import { Brain, Check, X, Sparkles } from 'lucide-react';

export default function CheckpointUnderstandingModal({
  isOpen,
  checkpointTitle = 'Checkpoint',
  initialText = '',
  onSave,
  onClose,
  theme = ''
}) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setText(initialText || '');
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (onSave) onSave(text.trim());
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div
        className="modal-content checkpoint-understanding-modal"
        style={{
          maxWidth: '520px',
          background: theme === 'tokyo-lofi' ? '#181524' : '#fffefa',
          border: theme === 'tokyo-lofi' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--line)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          borderRadius: '14px',
          padding: '22px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'grid', placeItems: 'center' }}>
              <Brain size={18} color="#f59e0b" />
            </div>
            <div>
              <span style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#f59e0b', fontWeight: 800, display: 'block' }}>
                ACTIVE RECALL // CHECKPOINT ACHIEVED
              </span>
              <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--ink)' }}>
                Write Your Core Takeaway
              </h3>
            </div>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            style={{ background: 'transparent', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: '18px' }}
          >
            ×
          </button>
        </div>

        <div style={{ background: theme === 'tokyo-lofi' ? 'rgba(255,255,255,0.03)' : '#f8faf7', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '9px', padding: '10px 14px', marginBottom: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Topic:</span>
          <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>{checkpointTitle}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
              What is your key understanding or mental model?
            </label>
            <textarea
              className="unblock-textarea"
              rows={4}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Explain this concept in your own words. Mention key formulas, caveats, or why this matters..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '9px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: theme === 'tokyo-lofi' ? 'rgba(10, 8, 16, 0.6)' : '#fff',
                color: 'var(--ink)',
                fontSize: '13px',
                lineHeight: '1.55',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <small style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Supports markdown & math. Press <kbd style={{ padding: '2px 4px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', fontSize: '10px' }}>Ctrl+Enter</kbd> to save.
              </small>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: 0 }}>
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: 'var(--muted)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Skip for Now
            </button>
            <button
              type="submit"
              className="primary-button"
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: '#f59e0b',
                color: '#181524',
                border: 0,
                fontWeight: 800,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
              }}
            >
              <Check size={14} /> Save Understanding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
