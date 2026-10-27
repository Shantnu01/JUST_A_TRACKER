import React, { useState, useEffect } from 'react';
import {
  Milestone,
  CheckCircle2,
  Copy,
  Plus,
  Layers,
  Sparkles,
  RotateCcw,
  Check,
  ArrowRight,
  Flame,
  Award,
  ChevronRight,
  Clock
} from 'lucide-react';
import {
  loadSubjectCurriculum,
  saveSubjectCurriculum,
  calculateCurriculumProgress,
  toggleCurriculumCheckpoint,
  addCheckpointToStage,
  setActiveStageForCurriculum,
  getStarterCurriculumRaw,
  parseCurriculumText,
  formatCurriculumToText,
  CHATGPT_ROADMAP_PROMPT_TEMPLATE
} from '../utils/curriculumEngine';

export default function StageRoadmapsView({
  routine = [],
  selectedSubject = '',
  onSelectSubject,
  onPlayChime,
  setToast,
  onJumpToToday
}) {
  // Extract unique focus subjects from the schedule
  const defaultSubjects = React.useMemo(() => {
    const list = [];
    (routine || []).forEach(item => {
      if (item.kind === 'focus' && item.title && !list.includes(item.title)) {
        list.push(item.title);
      }
    });
    // Add common defaults if list is short
    if (!list.includes('NLP Foundations')) list.unshift('NLP Foundations');
    if (!list.includes('DSA Practice')) list.push('DSA Practice');
    if (!list.includes('System Design')) list.push('System Design');
    return list;
  }, [routine]);

  const [activeSubject, setActiveSubject] = useState(() => {
    return selectedSubject || defaultSubjects[0] || 'NLP Foundations';
  });

  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [curriculum, setCurriculum] = useState(() => loadSubjectCurriculum(activeSubject, true));
  const [isEditing, setIsEditing] = useState(false);
  const [rawText, setRawText] = useState('');
  const [newCheckpointMap, setNewCheckpointMap] = useState({});

  // Sync when selectedSubject prop changes
  useEffect(() => {
    if (selectedSubject && selectedSubject !== activeSubject) {
      setActiveSubject(selectedSubject);
    }
  }, [selectedSubject]);

  // Load curriculum whenever activeSubject changes
  useEffect(() => {
    const loaded = loadSubjectCurriculum(activeSubject, true);
    setCurriculum(loaded);
    setIsEditing(false);
  }, [activeSubject]);

  const progress = calculateCurriculumProgress(curriculum);

  // Switch Subject
  const handleSelectSubject = (subj) => {
    setActiveSubject(subj);
    if (onSelectSubject) onSelectSubject(subj);
  };

  // Add Custom Subject
  const handleAddCustomSubject = (e) => {
    if (e) e.preventDefault();
    if (!customSubjectInput.trim()) return;
    const name = customSubjectInput.trim();
    setActiveSubject(name);
    setCustomSubjectInput('');
    setShowAddSubject(false);
    if (setToast) {
      setToast(`Created new subject: "${name}"`);
      setTimeout(() => setToast(''), 2500);
    }
  };

  // Set Active Stage for this Subject
  const handleSetActiveStage = (stageId, stageTitle) => {
    if (!curriculum) return;
    const updated = setActiveStageForCurriculum(curriculum, stageId);
    setCurriculum(updated);
    saveSubjectCurriculum(activeSubject, updated);
    if (onPlayChime) onPlayChime(true);
    if (setToast) {
      setToast(`🎯 Active stage set to: ${stageTitle || stageId} (Now pinned to your Timetable)`);
      setTimeout(() => setToast(''), 3000);
    }
  };

  // Toggle Checkpoint
  const handleToggle = (stageId, checkpointId, checkpointTitle) => {
    if (!curriculum) return;
    const updated = toggleCurriculumCheckpoint(curriculum, stageId, checkpointId);
    setCurriculum(updated);
    saveSubjectCurriculum(activeSubject, updated);
    if (onPlayChime) onPlayChime(true);
    if (setToast) {
      setToast(`✓ Stage checkpoint updated: ${checkpointTitle || 'Saved'}`);
      setTimeout(() => setToast(''), 2200);
    }
  };

  // Add Quick Checkpoint
  const handleAddCheckpoint = (stageId) => {
    const text = newCheckpointMap[stageId] || '';
    if (!text.trim() || !curriculum) return;
    const updated = addCheckpointToStage(curriculum, stageId, text.trim());
    setCurriculum(updated);
    saveSubjectCurriculum(activeSubject, updated);
    setNewCheckpointMap(prev => ({ ...prev, [stageId]: '' }));
    if (setToast) {
      setToast('✓ Added new checkpoint to stage');
      setTimeout(() => setToast(''), 2000);
    }
  };

  // Edit Outline Handlers
  const handleStartEdit = () => {
    if (curriculum) {
      setRawText(formatCurriculumToText(curriculum));
    } else {
      setRawText(getStarterCurriculumRaw(activeSubject));
    }
    setIsEditing(true);
  };

  const handleSaveRaw = () => {
    if (!rawText.trim()) return;
    const parsed = parseCurriculumText(rawText);
    parsed.subject = activeSubject;
    setCurriculum(parsed);
    saveSubjectCurriculum(activeSubject, parsed);
    setIsEditing(false);
    if (setToast) {
      setToast(`💾 Saved roadmap for ${activeSubject} (${parsed.stages.length} stages)`);
      setTimeout(() => setToast(''), 2500);
    }
  };

  const handleCopyChatGPT = () => {
    const prompt = CHATGPT_ROADMAP_PROMPT_TEMPLATE.replace(/\[SUBJECT NAME[^\]]*\]/g, activeSubject);
    navigator.clipboard.writeText(prompt);
    if (setToast) {
      setToast(`📋 ChatGPT prompt for "${activeSubject}" copied to clipboard!`);
      setTimeout(() => setToast(''), 2500);
    }
  };

  return (
    <div className="stage-roadmaps-hub">
      {/* 1. Header Bar */}
      <div className="roadmap-hub-header">
        <div className="roadmap-hub-title-group">
          <div className="roadmap-hub-icon-wrap">
            <Milestone size={24} color="#818cf8" />
          </div>
          <div>
            <h2 className="roadmap-hub-title">Stage Roadmaps & Checkpoints</h2>
            <p className="roadmap-hub-subtitle">
              Master subjects stage-by-stage. Set your active stage here, and your daily timetable will display just your current checkpoint.
            </p>
          </div>
        </div>

        <div className="roadmap-hub-actions">
          <button
            type="button"
            className="roadmap-header-btn secondary"
            onClick={handleCopyChatGPT}
            title="Copy ChatGPT roadmap generation prompt"
          >
            <Copy size={13} />
            <span>Copy AI Prompt</span>
          </button>
          <button
            type="button"
            className="roadmap-header-btn primary"
            onClick={onJumpToToday}
            title="Return to today's timetable"
          >
            <span>Back to Timetable</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 2. Subject Tabs Pill Row */}
      <div className="roadmap-subjects-tabs">
        <div className="roadmap-tabs-scroll">
          {defaultSubjects.map(subj => {
            const isChosen = subj === activeSubject;
            const subCurr = loadSubjectCurriculum(subj);
            const subProg = calculateCurriculumProgress(subCurr);
            return (
              <button
                key={subj}
                type="button"
                className={`roadmap-subject-pill ${isChosen ? 'active' : ''}`}
                onClick={() => handleSelectSubject(subj)}
              >
                <span>{subj}</span>
                {subCurr && subProg.totalCheckpoints > 0 && (
                  <span className="roadmap-pill-percent">{subProg.percent}%</span>
                )}
              </button>
            );
          })}

          {showAddSubject ? (
            <form onSubmit={handleAddCustomSubject} className="roadmap-add-subject-form">
              <input
                type="text"
                value={customSubjectInput}
                onChange={e => setCustomSubjectInput(e.target.value)}
                placeholder="Subject name..."
                autoFocus
                className="roadmap-add-subject-input"
              />
              <button type="submit" className="roadmap-add-subject-submit">Add</button>
              <button
                type="button"
                className="roadmap-add-subject-cancel"
                onClick={() => setShowAddSubject(false)}
              >
                ×
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="roadmap-add-subject-btn"
              onClick={() => setShowAddSubject(true)}
              title="Add a custom subject roadmap"
            >
              <Plus size={13} />
              <span>New Subject</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Active Subject Command Center */}
      <div className="roadmap-command-center">
        <div className="command-center-top">
          <div className="command-center-info">
            <div className="command-subject-row">
              <h3 className="command-subject-name">{activeSubject}</h3>
              <span className="command-progress-badge">
                {progress.completedCheckpoints} of {progress.totalCheckpoints} Checkpoints Mastered ({progress.percent}%)
              </span>
            </div>

            {/* Set Active Stage Controller */}
            {curriculum && curriculum.stages && curriculum.stages.length > 0 && (
              <div className="command-stage-selector-row">
                <span className="selector-label">
                  <Flame size={13} color="#f59e0b" />
                  <strong>Active Stage for Timetable:</strong>
                </span>
                <div className="stage-selector-pills">
                  {curriculum.stages.map((st, idx) => {
                    const isSelected = idx === progress.activeStageIndex;
                    return (
                      <button
                        key={st.id || idx}
                        type="button"
                        className={`stage-select-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSetActiveStage(st.id, st.title)}
                        title="Set this stage as active on your daily timetable"
                      >
                        <span>STAGE {idx + 1}</span>
                        {isSelected && <span className="active-dot" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="command-center-actions">
            <button
              type="button"
              className="command-tool-btn"
              onClick={handleStartEdit}
              title="Edit outline text directly"
            >
              <Layers size={13} />
              <span>{isEditing ? 'Close Editor' : 'Edit Outline'}</span>
            </button>
            <button
              type="button"
              className="command-tool-btn"
              onClick={() => {
                const raw = getStarterCurriculumRaw(activeSubject);
                const parsed = parseCurriculumText(raw);
                parsed.subject = activeSubject;
                setCurriculum(parsed);
                saveSubjectCurriculum(activeSubject, parsed);
                if (setToast) setToast(`Reset to clean 3-stage starter for ${activeSubject}`);
              }}
              title="Reset to standard 3-stage template"
            >
              <RotateCcw size={13} />
              <span>Reset Template</span>
            </button>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="roadmap-full-progress-track">
          <div
            className="roadmap-full-progress-fill"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* 4. Raw Outline Editor Drawer */}
      {isEditing && (
        <div className="roadmap-outline-editor-card">
          <div className="editor-card-header">
            <div>
              <strong>Custom Outline Editor — {activeSubject}</strong>
              <p className="editor-subtext">
                Paste structured markdown or stage trees. Format as <code>STAGE 1 — NAME</code> followed by <code>1.1 Topic</code>.
              </p>
            </div>
            <button type="button" className="editor-ai-btn" onClick={handleCopyChatGPT}>
              <Copy size={11} /> Copy AI Prompt
            </button>
          </div>

          <textarea
            className="roadmap-editor-textarea"
            rows={12}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Paste your roadmap outline here..."
          />

          <div className="editor-card-footer">
            <button type="button" className="editor-save-btn" onClick={handleSaveRaw}>
              <Check size={13} /> Save & Apply Roadmap
            </button>
            <button type="button" className="editor-cancel-btn" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 5. All Stages & Checkpoints Canvas (Spacious, Premium Cards) */}
      {!isEditing && curriculum && curriculum.stages && (
        <div className="roadmap-stages-grid">
          {curriculum.stages.map((stage, sIdx) => {
            const isActive = sIdx === progress.activeStageIndex;
            const completedCount = (stage.checkpoints || []).filter(c => c.completed).length;
            const totalCount = (stage.checkpoints || []).length;
            const isDone = completedCount === totalCount && totalCount > 0;

            return (
              <div
                key={stage.id || sIdx}
                className={`roadmap-stage-card ${isActive ? 'is-active-stage' : ''} ${isDone ? 'is-done-stage' : ''}`}
              >
                {/* Stage Card Header */}
                <div className="stage-card-banner">
                  <div className="stage-banner-left">
                    <span className="stage-number-tag">
                      {isDone ? '✓ COMPLETED' : isActive ? '★ ACTIVE STAGE' : `STAGE ${sIdx + 1}`}
                    </span>
                    <h4 className="stage-banner-title">{stage.title}</h4>
                  </div>

                  <div className="stage-banner-right">
                    <span className="stage-completion-badge">
                      {completedCount}/{totalCount} Done
                    </span>
                    {!isActive && (
                      <button
                        type="button"
                        className="set-active-stage-btn"
                        onClick={() => handleSetActiveStage(stage.id, stage.title)}
                        title="Set this stage as active on your daily timetable"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                </div>

                {/* Checkpoint Items List */}
                <div className="stage-card-checkpoints">
                  {(stage.checkpoints || []).map(cp => (
                    <label
                      key={cp.id}
                      className={`roadmap-checkpoint-row ${cp.completed ? 'completed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={cp.completed}
                        onChange={() => handleToggle(stage.id, cp.id, cp.title)}
                        className="roadmap-custom-check"
                      />
                      <div className="roadmap-checkpoint-content">
                        <span className={`roadmap-cp-title ${cp.completed ? 'strikethrough' : ''}`}>
                          {cp.title}
                        </span>
                        {cp.details && cp.details.length > 0 && (
                          <div className="roadmap-cp-details">
                            {cp.details.map((det, dIdx) => (
                              <span key={dIdx} className="roadmap-detail-tag">• {det}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {/* Inline Quick Add Checkpoint */}
                <div className="stage-card-quick-add">
                  <input
                    type="text"
                    value={newCheckpointMap[stage.id] || ''}
                    onChange={e => setNewCheckpointMap({ ...newCheckpointMap, [stage.id]: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddCheckpoint(stage.id);
                    }}
                    placeholder={`+ Add checkpoint to Stage ${sIdx + 1}...`}
                    className="stage-quick-add-input"
                  />
                  <button
                    type="button"
                    className="stage-quick-add-btn"
                    onClick={() => handleAddCheckpoint(stage.id)}
                  >
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
