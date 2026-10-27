import React, { useState, useEffect } from 'react';
import {
  Milestone,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Layers,
  Sparkles,
  RotateCcw,
  Check
} from 'lucide-react';
import {
  loadSubjectCurriculum,
  saveSubjectCurriculum,
  calculateCurriculumProgress,
  toggleCurriculumCheckpoint,
  addCheckpointToStage,
  getStarterCurriculumRaw,
  parseCurriculumText,
  formatCurriculumToText,
  CHATGPT_ROADMAP_PROMPT_TEMPLATE
} from '../utils/curriculumEngine';

export default function RoutineStageTracker({
  subject = '',
  item,
  onPlayChime,
  setToast,
  isReadOnly = false
}) {
  const cleanSubject = (subject || item?.title || 'General').trim();
  
  // Curriculum state for this specific subject
  const [curriculum, setCurriculum] = useState(() => loadSubjectCurriculum(cleanSubject));
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [openStages, setOpenStages] = useState({});
  const [newCheckpointInput, setNewCheckpointInput] = useState('');
  const [activeAddStageId, setActiveAddStageId] = useState(null);

  // Sync state if subject changes
  useEffect(() => {
    const loaded = loadSubjectCurriculum(cleanSubject);
    setCurriculum(loaded);
    setIsEditing(false);
    setIsExpanded(false);
  }, [cleanSubject]);

  const progress = calculateCurriculumProgress(curriculum);

  // Direct In-Routine Checkpoint Ticking
  const handleToggle = (stageId, checkpointId, checkpointTitle) => {
    if (isReadOnly || !curriculum) return;
    const updated = toggleCurriculumCheckpoint(curriculum, stageId, checkpointId);
    setCurriculum(updated);
    saveSubjectCurriculum(cleanSubject, updated);

    if (onPlayChime) onPlayChime(true);
    if (setToast) {
      setToast(`✓ Stage Checkpoint updated: ${checkpointTitle || 'Saved'}`);
      setTimeout(() => setToast(''), 2200);
    }
  };

  // Quick Inline Add Checkpoint
  const handleAddCheckpoint = (stageId) => {
    if (!newCheckpointInput.trim() || !curriculum) return;
    const updated = addCheckpointToStage(curriculum, stageId, newCheckpointInput.trim());
    setCurriculum(updated);
    saveSubjectCurriculum(cleanSubject, updated);
    setNewCheckpointInput('');
    setActiveAddStageId(null);
    if (setToast) {
      setToast('✓ Added new checkpoint to stage');
      setTimeout(() => setToast(''), 2000);
    }
  };

  // Initialize Clean 3-Stage Starter
  const handleInitStarter = () => {
    const raw = getStarterCurriculumRaw(cleanSubject);
    const parsed = parseCurriculumText(raw);
    parsed.subject = cleanSubject;
    setCurriculum(parsed);
    saveSubjectCurriculum(cleanSubject, parsed);
    if (setToast) {
      setToast(`🎯 3-Stage Roadmap activated for ${cleanSubject}!`);
      setTimeout(() => setToast(''), 2500);
    }
  };

  // Start Outline Editing
  const handleStartEdit = () => {
    if (curriculum) {
      setRawText(formatCurriculumToText(curriculum));
    } else {
      setRawText(getStarterCurriculumRaw(cleanSubject));
    }
    setIsEditing(true);
    setIsExpanded(true);
  };

  // Save Raw Outline
  const handleSaveRaw = () => {
    if (!rawText.trim()) return;
    const parsed = parseCurriculumText(rawText);
    parsed.subject = cleanSubject;
    setCurriculum(parsed);
    saveSubjectCurriculum(cleanSubject, parsed);
    setIsEditing(false);
    if (setToast) {
      setToast(`💾 Saved roadmap for ${cleanSubject} (${parsed.stages.length} stages)`);
      setTimeout(() => setToast(''), 2500);
    }
  };

  // Copy ChatGPT Roadmap Prompt
  const handleCopyChatGPT = () => {
    const prompt = CHATGPT_ROADMAP_PROMPT_TEMPLATE.replace(/\[SUBJECT NAME[^\]]*\]/g, cleanSubject);
    navigator.clipboard.writeText(prompt);
    if (setToast) {
      setToast(`📋 ChatGPT prompt for "${cleanSubject}" copied to clipboard!`);
      setTimeout(() => setToast(''), 2500);
    }
  };

  // Active Next Checkpoint for the Hero Row
  const nextTarget = progress.nextCheckpoints[0];

  // If no curriculum exists yet: render a clean, uncluttered activation prompt
  if (!curriculum || !curriculum.stages || curriculum.stages.length === 0) {
    return (
      <div className="routine-stage-box uninitialized">
        <div className="stage-uninit-row">
          <div className="stage-uninit-left">
            <Milestone size={14} className="stage-icon" />
            <span>No Stage Roadmap set for <strong>{cleanSubject}</strong></span>
          </div>
          <div className="stage-uninit-actions">
            <button
              type="button"
              className="stage-init-btn primary"
              onClick={(e) => {
                e.stopPropagation();
                handleInitStarter();
              }}
              title="Generate a clean 3-stage roadmap"
            >
              <Sparkles size={12} />
              <span>+ 3-Stage Plan</span>
            </button>
            <button
              type="button"
              className="stage-init-btn secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit();
              }}
              title="Paste your custom outline or ChatGPT roadmap"
            >
              <Layers size={12} />
              <span>Paste Outline</span>
            </button>
          </div>
        </div>

        {/* Inline editor if user clicked Paste Outline */}
        {isEditing && (
          <div className="stage-inline-editor">
            <div className="editor-top-actions">
              <span className="editor-title">Custom Roadmap Outline</span>
              <button type="button" className="editor-sub-btn" onClick={handleCopyChatGPT}>
                <Copy size={11} /> Copy AI Prompt
              </button>
            </div>
            <textarea
              className="stage-outline-textarea"
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste stage outline here..."
            />
            <div className="editor-bottom-actions">
              <button type="button" className="stage-btn-save" onClick={handleSaveRaw}>
                <Check size={12} /> Save Roadmap
              </button>
              <button type="button" className="stage-btn-cancel" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`routine-stage-box ${isExpanded ? 'is-expanded' : ''}`}>
      {/* 1. Sleek Compact Header Bar */}
      <div
        className="stage-compact-head"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(prev => !prev);
        }}
        title="Click to view all stages and checkpoints"
      >
        <div className="stage-head-left">
          <span className="stage-badge-pill">
            <Milestone size={11} />
            <span>STAGE {progress.activeStageIndex + 1}/{curriculum.stages.length}</span>
          </span>
          <span className="stage-name-text">
            {progress.activeStage ? progress.activeStage.title.replace(/^STAGE\s*\d+\s*[—\-:]*\s*/i, '') : 'Completed'}
          </span>
        </div>

        <div className="stage-head-right">
          <div className="stage-progress-track">
            <div
              className="stage-progress-fill"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="stage-percent-text">{progress.percent}%</span>
          <button
            type="button"
            className="stage-expand-chevron"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* 2. Hero Interactive Checkpoint (Tick directly from Routine Card!) */}
      {!isEditing && nextTarget && (
        <div className="stage-hero-checkpoint">
          <label className="stage-checkpoint-row hero" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={false}
              onChange={() => handleToggle(nextTarget.stageId, nextTarget.id, nextTarget.title)}
              className="stage-custom-checkbox hero-box"
              disabled={isReadOnly}
            />
            <div className="stage-checkpoint-info">
              <span className="hero-target-label">NEXT CHECKPOINT</span>
              <span className="checkpoint-text-hero">{nextTarget.title}</span>
              {nextTarget.details && nextTarget.details.length > 0 && (
                <div className="checkpoint-details-pills">
                  {nextTarget.details.slice(0, 3).map((det, i) => (
                    <span key={i} className="detail-pill-tag">• {det}</span>
                  ))}
                </div>
              )}
            </div>
          </label>
        </div>
      )}

      {/* If all checkpoints are complete */}
      {!isEditing && progress.isFinished && (
        <div className="stage-all-complete-banner">
          <CheckCircle2 size={15} color="#10b981" />
          <span>All stages completed! 100% mastered.</span>
          <button
            type="button"
            className="stage-reset-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleStartEdit();
            }}
          >
            <RotateCcw size={11} /> Add More Stages
          </button>
        </div>
      )}

      {/* 3. Smooth Slide-Down Stages & Checkpoint List (Expanded View) */}
      {isExpanded && !isEditing && (
        <div className="stage-expanded-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="stage-drawer-toolbar">
            <span className="drawer-subtitle">
              {progress.completedCheckpoints} of {progress.totalCheckpoints} checkpoints checked
            </span>
            <div className="drawer-actions">
              <button
                type="button"
                className="drawer-action-btn"
                onClick={handleCopyChatGPT}
                title="Copy prompt to generate roadmap with ChatGPT"
              >
                <Copy size={11} /> AI Prompt
              </button>
              <button
                type="button"
                className="drawer-action-btn"
                onClick={handleStartEdit}
                title="Edit raw outline or stages"
              >
                <Layers size={11} /> Edit Plan
              </button>
            </div>
          </div>

          <div className="stage-accordion-list">
            {curriculum.stages.map((st, sIdx) => {
              const isCurrent = sIdx === progress.activeStageIndex;
              const isStageOpen = openStages[st.id] !== undefined ? openStages[st.id] : isCurrent;
              const completedCount = (st.checkpoints || []).filter(c => c.completed).length;
              const totalCount = (st.checkpoints || []).length;
              const isStageDone = completedCount === totalCount && totalCount > 0;

              return (
                <div key={st.id || sIdx} className={`stage-card-block ${isCurrent ? 'active-block' : ''} ${isStageDone ? 'done-block' : ''}`}>
                  <div
                    className="stage-card-header"
                    onClick={() => setOpenStages(prev => ({ ...prev, [st.id]: !isStageOpen }))}
                  >
                    <div className="stage-card-left">
                      <span className={`stage-status-bullet ${isStageDone ? 'done' : isCurrent ? 'active' : ''}`}>
                        {isStageDone ? '✓' : isCurrent ? '▶' : '•'}
                      </span>
                      <strong className="stage-block-title">{st.title}</strong>
                    </div>
                    <div className="stage-card-right">
                      <span className="stage-counter-pill">{completedCount}/{totalCount}</span>
                      {isStageOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </div>
                  </div>

                  {isStageOpen && (
                    <div className="stage-checkpoints-group">
                      {(st.checkpoints || []).map((cp) => (
                        <label key={cp.id} className={`stage-checkpoint-item ${cp.completed ? 'completed' : ''}`}>
                          <input
                            type="checkbox"
                            checked={cp.completed}
                            onChange={() => handleToggle(st.id, cp.id, cp.title)}
                            className="stage-custom-checkbox"
                            disabled={isReadOnly}
                          />
                          <div className="stage-checkpoint-text-wrap">
                            <span className={`checkpoint-name ${cp.completed ? 'done-text' : ''}`}>{cp.title}</span>
                            {cp.details && cp.details.length > 0 && (
                              <div className="checkpoint-details-pills">
                                {cp.details.map((d, dIdx) => (
                                  <span key={dIdx} className="detail-pill-tag">• {d}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}

                      {/* Quick Add Checkpoint in Stage */}
                      {activeAddStageId === st.id ? (
                        <div className="stage-quick-add-form">
                          <input
                            type="text"
                            placeholder="e.g. 1.4 Backprop & Loss"
                            value={newCheckpointInput}
                            onChange={(e) => setNewCheckpointInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddCheckpoint(st.id);
                              if (e.key === 'Escape') setActiveAddStageId(null);
                            }}
                            autoFocus
                            className="stage-add-input"
                          />
                          <button
                            type="button"
                            className="stage-add-save-btn"
                            onClick={() => handleAddCheckpoint(st.id)}
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            className="stage-add-cancel-btn"
                            onClick={() => setActiveAddStageId(null)}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="stage-add-trigger-btn"
                          onClick={() => {
                            setActiveAddStageId(st.id);
                            setNewCheckpointInput('');
                          }}
                        >
                          <Plus size={11} /> Add checkpoint to this stage
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Inline Plan Editor / Outline Drawer */}
      {isEditing && (
        <div className="stage-inline-editor" onClick={(e) => e.stopPropagation()}>
          <div className="editor-top-actions">
            <span className="editor-title">Edit Roadmap Outline for {cleanSubject}</span>
            <button type="button" className="editor-sub-btn" onClick={handleCopyChatGPT}>
              <Copy size={11} /> Copy ChatGPT Prompt
            </button>
          </div>
          <p className="editor-hint">
            Format as <code>STAGE 1 — NAME</code> followed by <code>1.1 Topic</code> and subtopics.
          </p>
          <textarea
            className="stage-outline-textarea"
            rows={10}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <div className="editor-bottom-actions">
            <button type="button" className="stage-btn-save" onClick={handleSaveRaw}>
              <Check size={12} /> Save Changes
            </button>
            <button
              type="button"
              className="stage-btn-template"
              onClick={() => setRawText(getStarterCurriculumRaw(cleanSubject))}
            >
              <RotateCcw size={11} /> Load Starter
            </button>
            <button type="button" className="stage-btn-cancel" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
