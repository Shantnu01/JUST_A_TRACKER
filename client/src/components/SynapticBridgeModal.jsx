import React, { useState, useEffect, useMemo } from 'react';
import { Brain, CheckCircle2, XCircle, Sparkles, Award, ArrowRight, RotateCcw, HelpCircle, Layers, X, BookOpen, Zap } from 'lucide-react';
import { resolveSynapticTopic, recordSynapticDrillResult, getSynapticStats } from '../utils/synapticEngine';

export default function SynapticBridgeModal({
  isOpen,
  onClose,
  activeBlock,
  pinnedCheckpoint,
  theme,
  columnStyle
}) {
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [mode, setMode] = useState('drill'); // 'drill' | 'feynman'
  const [feynmanText, setFeynmanText] = useState('');
  const [feynmanGrade, setFeynmanGrade] = useState(null); // 'mastery' | 'partial' | 'missed'
  const [stats, setStats] = useState(() => getSynapticStats());
  const [xpGained, setXpGained] = useState(0);

  // Resolve drill question from current context
  const drill = useMemo(() => {
    return resolveSynapticTopic(
      activeBlock?.title || '',
      activeBlock?.subtitle || '',
      pinnedCheckpoint?.title || ''
    );
  }, [activeBlock, pinnedCheckpoint, isOpen]);

  // Reset state when opening modal
  useEffect(() => {
    if (isOpen) {
      setSelectedOptionId(null);
      setIsAnswerSubmitted(false);
      setFeynmanText('');
      setFeynmanGrade(null);
      setXpGained(0);
      setStats(getSynapticStats());
    }
  }, [isOpen, drill]);

  if (!isOpen) return null;

  const correctOption = drill.options.find(o => o.isCorrect);

  const handleSelectOption = (optId) => {
    if (isAnswerSubmitted) return;
    setSelectedOptionId(optId);
    setIsAnswerSubmitted(true);
    const isCorrect = optId === correctOption?.id;
    if (isCorrect) {
      setXpGained(25);
    }
    const updated = recordSynapticDrillResult(drill, optId, isCorrect);
    setStats(updated);
  };

  const handleFeynmanEvaluate = () => {
    if (!feynmanText.trim()) return;
    const lower = feynmanText.toLowerCase();
    const keywords = (drill.explanation + ' ' + (correctOption?.text || '')).toLowerCase();
    
    // Quick semantic check
    let matches = 0;
    const keyTerms = drill.explanation.toLowerCase().split(/\s+/).filter(w => w.length > 5);
    keyTerms.forEach(term => {
      if (lower.includes(term.slice(0, -2))) matches++;
    });

    let grade = 'missed';
    let xp = 0;
    if (matches >= 3 || lower.includes('because') || lower.includes('invariant') || lower.includes('monotonic') || lower.includes('queue') || lower.includes('in-degree')) {
      grade = 'mastery';
      xp = 35;
    } else if (matches >= 1 || lower.length > 25) {
      grade = 'partial';
      xp = 15;
    }

    setFeynmanGrade(grade);
    setXpGained(xp);
    const updated = recordSynapticDrillResult(drill, 'FEYNMAN', grade === 'mastery', feynmanText);
    setStats(updated);
  };

  return (
    <div className="synaptic-modal-backdrop" onClick={onClose}>
      <div 
        className="synaptic-modal-card" 
        onClick={e => e.stopPropagation()}
        data-theme={theme}
        data-column-style={columnStyle}
      >
        {/* Modal Top Header */}
        <div className="synaptic-modal-header">
          <div className="synaptic-header-left">
            <div className="synaptic-brain-badge">
              <Brain size={18} />
              <span>SYNAPTIC BRIDGE</span>
            </div>
            <span className="synaptic-topic-badge" title="Active study context">
              {drill.topic}
            </span>
          </div>

          <div className="synaptic-header-right">
            <div className="synaptic-xp-chip">
              <Sparkles size={13} className="text-amber-400" />
              <span>{stats.xp} XP</span>
              {stats.streak > 1 && (
                <small className="synaptic-streak-pill">🔥 {stats.streak}x</small>
              )}
            </div>
            <button className="synaptic-close-btn" onClick={onClose} title="Close modal">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="synaptic-mode-tabs">
          <button 
            type="button" 
            className={`synaptic-tab-btn ${mode === 'drill' ? 'active' : ''}`}
            onClick={() => setMode('drill')}
          >
            <Zap size={13} />
            <span>Interactive Concept Drill</span>
          </button>
          <button 
            type="button" 
            className={`synaptic-tab-btn ${mode === 'feynman' ? 'active' : ''}`}
            onClick={() => setMode('feynman')}
          >
            <BookOpen size={13} />
            <span>Feynman 1-Sentence Test</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="synaptic-modal-body">
          {/* Conceptual Question */}
          <div className="synaptic-question-box">
            <div className="synaptic-question-prompt">
              <HelpCircle size={15} />
              <span>RETRIEVAL DRILL</span>
            </div>
            <h3>{drill.question}</h3>
          </div>

          {/* Mode 1: Interactive Options Grid */}
          {mode === 'drill' && (
            <div className="synaptic-options-list">
              {drill.options.map(opt => {
                const isSelected = selectedOptionId === opt.id;
                let stateClass = '';
                if (isAnswerSubmitted) {
                  if (opt.isCorrect) {
                    stateClass = 'correct';
                  } else if (isSelected && !opt.isCorrect) {
                    stateClass = 'incorrect';
                  } else {
                    stateClass = 'dimmed';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`synaptic-option-card ${stateClass} ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(opt.id)}
                    disabled={isAnswerSubmitted}
                  >
                    <div className="synaptic-opt-id-col">
                      <span className="synaptic-opt-letter">{opt.id}</span>
                      {isAnswerSubmitted && opt.isCorrect && (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      )}
                      {isAnswerSubmitted && isSelected && !opt.isCorrect && (
                        <XCircle size={16} className="text-rose-400" />
                      )}
                    </div>
                    <div className="synaptic-opt-text">
                      {opt.text}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Mode 2: Feynman 1-Sentence Test */}
          {mode === 'feynman' && (
            <div className="synaptic-feynman-box">
              <p className="synaptic-feynman-hint">
                Explain the core mechanism in 1 clear sentence as if explaining to a peer:
              </p>
              <textarea
                className="synaptic-feynman-input"
                rows={3}
                placeholder="e.g. In this scenario, we maintain the invariant by..."
                value={feynmanText}
                onChange={e => setFeynmanText(e.target.value)}
                disabled={feynmanGrade !== null}
              />
              {feynmanGrade === null ? (
                <button
                  type="button"
                  className="synaptic-evaluate-btn"
                  onClick={handleFeynmanEvaluate}
                  disabled={!feynmanText.trim()}
                >
                  <Sparkles size={14} /> Evaluate My Recall
                </button>
              ) : (
                <div className={`synaptic-grade-badge ${feynmanGrade}`}>
                  {feynmanGrade === 'mastery' && <span>🟢 Mastery: Core conceptual invariant articulated accurately! (+35 XP)</span>}
                  {feynmanGrade === 'partial' && <span>🟡 Partial: Intuition is solid, but key formal conditions were missed. (+15 XP)</span>}
                  {feynmanGrade === 'missed' && <span>🔴 Needs Reinforcement: Review the breakdown below to cement this mental model.</span>}
                </div>
              )}
            </div>
          )}

          {/* Explanation & Memory Hook Box (Appears after submission) */}
          {(isAnswerSubmitted || feynmanGrade !== null) && (
            <div className="synaptic-explanation-box">
              <div className="synaptic-exp-header">
                <div className="synaptic-exp-title">
                  <Award size={15} />
                  <span>SYNAPTIC CONSOLIDATION</span>
                </div>
                {xpGained > 0 && (
                  <span className="synaptic-xp-reward">+{xpGained} XP</span>
                )}
              </div>
              <p className="synaptic-exp-text">
                {drill.explanation}
              </p>
              <div className="synaptic-hook-pill">
                <strong>💡 Memory Invariant:</strong>
                <span>{drill.memoryHook}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="synaptic-modal-footer">
          <div className="synaptic-footer-stats">
            <span>Accuracy: <strong>{stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 100}%</strong></span>
            <span>Drills: <strong>{stats.totalAnswered}</strong></span>
          </div>

          <button 
            type="button" 
            className="synaptic-done-btn"
            onClick={onClose}
          >
            <span>{(isAnswerSubmitted || feynmanGrade !== null) ? 'Consolidate & Continue' : 'Skip for Now'}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
