import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ArrowLeft,
  Flame,
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import {
  loadSubjectCurriculum,
  saveSubjectCurriculum,
  deleteSubjectCurriculum,
  calculateCurriculumProgress,
  toggleCurriculumCheckpoint,
  addCheckpointToStage,
  addStageToCurriculum,
  deleteStageFromCurriculum,
  deleteCheckpointFromStage,
  setActiveStageForCurriculum,
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
  // 1. Discover subjects strictly from routine focus items (no dummy/arbitrary subjects)
  const routineSubjects = useMemo(() => {
    const list = [];
    (routine || []).forEach(item => {
      if (item.kind === 'focus' && item.title && !list.includes(item.title)) {
        list.push(item.title);
      }
    });
    return list;
  }, [routine]);

  // 2. Custom subjects saved by the user
  const [customSubjects, setCustomSubjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('daymark-custom-roadmap-subjects') || '[]');
    } catch {
      return [];
    }
  });

  // All available roadmap subjects: strictly routine subjects + user-created custom subjects
  const allSubjects = useMemo(() => {
    const combined = [...routineSubjects];
    customSubjects.forEach(s => {
      if (!combined.includes(s)) combined.push(s);
    });
    return combined;
  }, [routineSubjects, customSubjects]);

  const [activeSubject, setActiveSubject] = useState(() => {
    return selectedSubject || allSubjects[0] || (routine[0]?.title || 'Study Session');
  });

  // Load subject curriculum (strictly user-created, null if uninitialized)
  const [curriculum, setCurriculum] = useState(() => loadSubjectCurriculum(activeSubject));

  // Active Stage Index for stage-by-stage focused viewing (Shows only 1 stage at a time)
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  // New Subject Modal
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');

  // Generation / Text Input State
  const [inputText, setImportText] = useState('');
  const [isEditingOutline, setIsEditingOutline] = useState(false);
  const [rawText, setRawText] = useState('');
  const [newCheckpointText, setNewCheckpointText] = useState('');
  const [newStageInputTitle, setNewStageInputTitle] = useState('');
  const [showAddStageInput, setShowAddStageInput] = useState(false);

  const fileInputRef = useRef(null);

  // Sync selectedSubject prop
  useEffect(() => {
    if (selectedSubject && selectedSubject !== activeSubject) {
      setActiveSubject(selectedSubject);
    }
  }, [selectedSubject]);

  // Load subject curriculum on activeSubject change
  useEffect(() => {
    const loaded = loadSubjectCurriculum(activeSubject);
    setCurriculum(loaded);
    setIsEditingOutline(false);
    setImportText('');
    setNewCheckpointText('');

    if (loaded && loaded.stages && loaded.stages.length > 0) {
      const prog = calculateCurriculumProgress(loaded);
      setActiveStageIdx(prog.activeStageIndex || 0);
    } else {
      setActiveStageIdx(0);
    }
  }, [activeSubject]);

  const progress = calculateCurriculumProgress(curriculum);

  // Switch Active Subject
  const handleSelectSubject = (subj) => {
    setActiveSubject(subj);
    if (onSelectSubject) onSelectSubject(subj);
  };

  // Create New Subject (Starts completely uninitialized!)
  const handleCreateNewSubject = (e) => {
    if (e) e.preventDefault();
    const cleanName = newSubjectTitle.trim();
    if (!cleanName) return;

    if (!customSubjects.includes(cleanName)) {
      const nextCustom = [...customSubjects, cleanName];
      setCustomSubjects(nextCustom);
      try {
        localStorage.setItem('daymark-custom-roadmap-subjects', JSON.stringify(nextCustom));
      } catch {}
    }

    setCurriculum(null);
    deleteSubjectCurriculum(cleanName);
    setActiveSubject(cleanName);
    setNewSubjectTitle('');
    setShowAddSubjectModal(false);
    setActiveStageIdx(0);

    if (setToast) {
      setToast(`Created roadmap for "${cleanName}". Paste your stage outline to generate checkpoints!`);
      setTimeout(() => setToast(''), 3000);
    }
  };

  // Delete Current Roadmap
  const handleDeleteRoadmap = () => {
    const isCustom = customSubjects.includes(activeSubject);
    const confirmMsg = isCustom
      ? `Delete roadmap and remove "${activeSubject}" from subjects?`
      : `Delete roadmap and reset stages for "${activeSubject}"?`;

    if (!window.confirm(confirmMsg)) return;

    // Remove from storage
    deleteSubjectCurriculum(activeSubject);
    setCurriculum(null);

    // If custom, also remove from custom list
    if (isCustom) {
      const updatedCustom = customSubjects.filter(s => s !== activeSubject);
      setCustomSubjects(updatedCustom);
      try {
        localStorage.setItem('daymark-custom-roadmap-subjects', JSON.stringify(updatedCustom));
      } catch {}
      // Switch to routine subject
      const fallback = routineSubjects[0] || 'Study Session';
      setActiveSubject(fallback);
    }

    if (setToast) {
      setToast(`✓ Roadmap deleted for ${activeSubject}`);
      setTimeout(() => setToast(''), 2500);
    }
  };

  // File Upload (.txt or .md)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string' && content.trim()) {
        const parsed = parseCurriculumText(content);
        parsed.subject = activeSubject;
        setCurriculum(parsed);
        saveSubjectCurriculum(activeSubject, parsed);
        setActiveStageIdx(0);
        if (setToast) {
          setToast(`✓ Generated ${parsed.stages.length} stages from ${file.name}!`);
          setTimeout(() => setToast(''), 3000);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Generate Roadmap from Pasted Text Outline
  const handleGenerateRoadmap = () => {
    if (!inputText.trim()) return;
    const parsed = parseCurriculumText(inputText);
    if (!parsed.stages || parsed.stages.length === 0) {
      if (setToast) setToast('⚠️ Could not find any STAGE headers in text. Use the format shown below.');
      return;
    }
    parsed.subject = activeSubject;
    setCurriculum(parsed);
    saveSubjectCurriculum(activeSubject, parsed);
    setImportText('');
    setActiveStageIdx(0);
    if (setToast) {
      setToast(`🚀 Generated ${parsed.stages.length} stages with checkpoints for ${activeSubject}!`);
      setTimeout(() => setToast(''), 3000);
    }
  };

  // Set Active Stage for Timetable
  const handleSetTimetableActiveStage = (stageId, stageTitle) => {
    if (!curriculum) return;
    const updated = setActiveStageForCurriculum(curriculum, stageId);
    setCurriculum(updated);
    saveSubjectCurriculum(activeSubject, updated);
    if (onPlayChime) onPlayChime(true);
    if (setToast) {
      setToast(`🎯 Active stage set to: ${stageTitle || stageId} (Pinned to Timetable)`);
      setTimeout(() => setToast(''), 3000);
    }
  };

  // Toggle Checkpoint Complete/Incomplete
  const handleToggleCheckpoint = (stageId, checkpointId, checkpointTitle) => {
    if (!curriculum) return;
    const updated = toggleCurriculumCheckpoint(curriculum, stageId, checkpointId);
    setCurriculum(updated);
    saveSubjectCurriculum(activeSubject, updated);
    if (onPlayChime) onPlayChime(true);
    if (setToast) {
      setToast(`✓ Checkpoint updated: ${checkpointTitle || 'Saved'}`);
      setTimeout(() => setToast(''), 2200);
    }
  };

  // Add Checkpoint to CURRENT Stage
  const handleAddCheckpoint = (stageId) => {
    if (!newCheckpointText.trim() || !curriculum) return;
    const updated = addCheckpointToStage(curriculum, stageId, newCheckpointText.trim());
    setCurriculum(updated);
    saveSubjectCurriculum(activeSubject, updated);
    setNewCheckpointText('');
    if (setToast) {
      setToast('✓ Added new checkpoint to stage');
      setTimeout(() => setToast(''), 2000);
    }
  };

  // Delete Checkpoint
  const handleDeleteCheckpoint = (stageId, checkpointId) => {
    if (!curriculum) return;
    const updated = deleteCheckpointFromStage(curriculum, stageId, checkpointId);
    setCurriculum(updated);
    saveSubjectCurriculum(activeSubject, updated);
    if (setToast) {
      setToast('Checkpoint deleted');
      setTimeout(() => setToast(''), 1800);
    }
  };

  // Add New Stage
  const handleAddStage = () => {
    if (!newStageInputTitle.trim() || !curriculum) return;
    const updated = addStageToCurriculum(curriculum, newStageInputTitle.trim());
    setCurriculum(updated);
    saveSubjectCurriculum(activeSubject, updated);
    setNewStageInputTitle('');
    setShowAddStageInput(false);
    setActiveStageIdx(updated.stages.length - 1);
    if (setToast) {
      setToast(`✓ Added Stage: "${newStageInputTitle.trim()}"`);
      setTimeout(() => setToast(''), 2500);
    }
  };

  // Delete Stage
  const handleDeleteCurrentStage = (stageId) => {
    if (!curriculum || !window.confirm('Delete this stage and all its checkpoints?')) return;
    const updated = deleteStageFromCurriculum(curriculum, stageId);
    setCurriculum(updated);
    saveSubjectCurriculum(activeSubject, updated);
    setActiveStageIdx(prev => Math.max(0, prev - 1));
    if (setToast) {
      setToast('Stage deleted');
      setTimeout(() => setToast(''), 2000);
    }
  };

  // Edit Raw Outline
  const handleStartEdit = () => {
    if (curriculum && curriculum.stages && curriculum.stages.length > 0) {
      setRawText(formatCurriculumToText(curriculum));
    } else {
      setRawText('');
    }
    setIsEditingOutline(true);
  };

  const handleSaveRaw = () => {
    if (!rawText.trim()) return;
    const parsed = parseCurriculumText(rawText);
    parsed.subject = activeSubject;
    setCurriculum(parsed);
    saveSubjectCurriculum(activeSubject, parsed);
    setIsEditingOutline(false);
    setActiveStageIdx(0);
    if (setToast) {
      setToast(`💾 Saved roadmap for ${activeSubject} (${parsed.stages.length} stages)`);
      setTimeout(() => setToast(''), 2500);
    }
  };

  // Copy ChatGPT Roadmap Prompt
  const handleCopyChatGPT = () => {
    const prompt = CHATGPT_ROADMAP_PROMPT_TEMPLATE.replace(/\[SUBJECT NAME[^\]]*\]/g, activeSubject);
    navigator.clipboard.writeText(prompt);
    if (setToast) {
      setToast(`📋 ChatGPT prompt for "${activeSubject}" copied to clipboard!`);
      setTimeout(() => setToast(''), 2500);
    }
  };

  const hasStages = Boolean(curriculum && curriculum.stages && curriculum.stages.length > 0);
  const currentStage = hasStages ? (curriculum.stages[activeStageIdx] || curriculum.stages[0]) : null;

  return (
    <div className="stage-roadmaps-hub">
      {/* 1. Header Bar */}
      <div className="roadmap-hub-header">
        <div className="roadmap-hub-title-group">
          <div className="roadmap-hub-icon-wrap">
            <Milestone size={26} />
          </div>
          <div>
            <h2 className="roadmap-hub-title">Stage Roadmaps & Checkpoint Hub</h2>
            <p className="roadmap-hub-subtitle">
              Manage your stage plans for each subject. Provide your stages in the format below to generate interactive checkpoints.
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

      {/* 2. Subject Tabs Pill Row (Routine subjects + custom subjects) */}
      <div className="roadmap-subjects-tabs">
        <div className="roadmap-tabs-scroll">
          {allSubjects.map(subj => {
            const isChosen = subj === activeSubject;
            const subCurr = loadSubjectCurriculum(subj);
            const subProg = calculateCurriculumProgress(subCurr);
            const isConfigured = Boolean(subCurr && subCurr.stages && subCurr.stages.length > 0);
            return (
              <button
                key={subj}
                type="button"
                className={`roadmap-subject-pill ${isChosen ? 'active' : ''}`}
                onClick={() => handleSelectSubject(subj)}
              >
                <span>{subj}</span>
                {isConfigured ? (
                  <span className="roadmap-pill-percent">{subProg.percent}%</span>
                ) : (
                  <span className="roadmap-pill-empty">Set Stages</span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            className="roadmap-add-subject-btn"
            onClick={() => setShowAddSubjectModal(true)}
            title="Add a new custom subject roadmap"
          >
            <Plus size={14} />
            <span>+ Add Subject</span>
          </button>
        </div>
      </div>

      {/* Modal: Create New Subject */}
      {showAddSubjectModal && (
        <div className="roadmap-modal-overlay" onClick={() => setShowAddSubjectModal(false)}>
          <div className="roadmap-modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-card-title">Add New Subject Roadmap</h3>
            <p className="modal-card-sub">
              Enter the subject name. You can then paste your stages in the format or upload a roadmap file.
            </p>
            <form onSubmit={handleCreateNewSubject}>
              <input
                type="text"
                value={newSubjectTitle}
                onChange={e => setNewSubjectTitle(e.target.value)}
                placeholder="e.g. Operating Systems / Computer Networks"
                autoFocus
                className="modal-card-input"
              />
              <div className="modal-card-actions">
                <button type="submit" className="modal-card-btn primary">
                  Create Roadmap
                </button>
                <button
                  type="button"
                  className="modal-card-btn cancel"
                  onClick={() => setShowAddSubjectModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. If Subject Has NO Stages Yet: Format Guide & Generation Screen */}
      {!hasStages && (
        <div className="roadmap-blank-creator-card">
          <div className="blank-creator-header">
            <div className="blank-creator-badge">UNCONFIGURED ROADMAP</div>
            <h3 className="blank-creator-title">Generate Stage Roadmap for {activeSubject}</h3>
            <p className="blank-creator-desc">
              Provide your stages in the simple format below, upload a text file, or generate it with AI.
            </p>
          </div>

          {/* Format Explanation Box */}
          <div className="roadmap-format-guide-box">
            <div className="format-guide-head">
              <HelpCircle size={15} />
              <strong>Expected Stage Format:</strong>
            </div>
            <pre className="format-guide-code">
{`STAGE 1 — [STAGE NAME IN CAPS]
  1.1 [Checkpoint / Topic Title]
      [Optional detail or bullet]
  1.2 [Checkpoint Title]
STAGE 2 — [STAGE NAME]
  2.1 [Checkpoint Title]
STAGE 3 — [STAGE NAME]
  3.1 [Checkpoint Title]`}
            </pre>
          </div>

          <div className="blank-creator-options-grid">
            {/* Option 1: AI Prompt Generator */}
            <div className="creator-option-box">
              <div className="option-icon-box">
                <Sparkles size={22} />
              </div>
              <h4 className="option-title">1. Generate with ChatGPT / Claude</h4>
              <p className="option-desc">
                Copies our prompt customized for "{activeSubject}" to generate the exact format.
              </p>
              <button
                type="button"
                className="option-action-btn secondary"
                onClick={handleCopyChatGPT}
              >
                <Copy size={13} />
                <span>Copy ChatGPT Prompt</span>
              </button>
            </div>

            {/* Option 2: Upload File */}
            <div className="creator-option-box">
              <div className="option-icon-box">
                <Upload size={22} />
              </div>
              <h4 className="option-title">2. Or Upload File (.txt / .md)</h4>
              <p className="option-desc">
                Select any text or markdown file containing your stage outline.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                accept=".txt,.md"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="option-action-btn primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={13} />
                <span>Upload Roadmap File</span>
              </button>
            </div>
          </div>

          {/* Paste Stage Outline Area */}
          <div className="creator-paste-section">
            <label className="paste-label">
              <FileText size={15} />
              <span>3. Paste Your Stages Text:</span>
            </label>
            <textarea
              className="creator-paste-textarea"
              rows={9}
              value={inputText}
              onChange={e => setImportText(e.target.value)}
              placeholder={`STAGE 1 — CORE FUNDAMENTALS\n  1.1 First Principles & Setup\n  1.2 Syntax & Basic Patterns\nSTAGE 2 — DEEP DIVE\n  2.1 Key Implementation Patterns\n  2.2 Edge Cases & Debugging\nSTAGE 3 — ADVANCED MASTERY\n  3.1 Performance Optimization`}
            />
            <div className="creator-paste-actions">
              <button
                type="button"
                className="build-roadmap-btn"
                onClick={handleGenerateRoadmap}
                disabled={!inputText.trim()}
              >
                <Check size={15} />
                <span>Generate Roadmap & Checkpoints</span>
              </button>

              {customSubjects.includes(activeSubject) && (
                <button
                  type="button"
                  className="delete-subject-btn"
                  onClick={handleDeleteRoadmap}
                >
                  <Trash2 size={13} />
                  <span>Remove Subject</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Command Center & Stage Switcher (When Stages Exist) */}
      {hasStages && (
        <>
          <div className="roadmap-command-center">
            <div className="command-center-top">
              <div className="command-subject-row">
                <h3 className="command-subject-name">{activeSubject}</h3>
                <span className="command-progress-badge">
                  {progress.completedCheckpoints} of {progress.totalCheckpoints} Done ({progress.percent}%)
                </span>
                <span className="timetable-pinned-badge">
                  <Flame size={12} />
                  <span>Timetable Active: STAGE {progress.activeStageIndex + 1}</span>
                </span>
              </div>

              <div className="command-center-actions">
                <button
                  type="button"
                  className="command-tool-btn"
                  onClick={handleStartEdit}
                  title="Edit roadmap outline"
                >
                  <Layers size={13} />
                  <span>{isEditingOutline ? 'Close Editor' : 'Edit Outline'}</span>
                </button>
                <button
                  type="button"
                  className="command-tool-btn danger"
                  onClick={handleDeleteRoadmap}
                  title="Delete this entire roadmap"
                >
                  <Trash2 size={13} />
                  <span>Delete Roadmap</span>
                </button>
              </div>
            </div>

            {/* Overall Progress Track */}
            <div className="roadmap-full-progress-track">
              <div
                className="roadmap-full-progress-fill"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {/* STAGE SELECTOR TABS: Click on a stage to view ONLY that stage! */}
            <div className="stage-tabs-navigation-bar">
              <span className="stage-nav-label">Click a Stage to View:</span>
              <div className="stage-tabs-scroll">
                {curriculum.stages.map((st, idx) => {
                  const isViewing = idx === activeStageIdx;
                  const isTimetableActive = idx === progress.activeStageIndex;
                  const doneCount = (st.checkpoints || []).filter(c => c.completed).length;
                  const totalCount = (st.checkpoints || []).length;
                  const isStageComplete = doneCount === totalCount && totalCount > 0;

                  return (
                    <button
                      key={st.id || idx}
                      type="button"
                      className={`single-stage-tab-btn ${isViewing ? 'viewing' : ''} ${isTimetableActive ? 'timetable-active' : ''}`}
                      onClick={() => setActiveStageIdx(idx)}
                      title={`View Stage ${idx + 1}`}
                    >
                      <span className="stage-tab-num">STAGE {idx + 1}</span>
                      <span className="stage-tab-ratio">({doneCount}/{totalCount})</span>
                      {isStageComplete && <span className="stage-tab-check">✓</span>}
                      {isTimetableActive && <span className="stage-tab-pinned-dot" title="Active on Timetable" />}
                    </button>
                  );
                })}

                {/* Add Stage Inline */}
                {showAddStageInput ? (
                  <div className="add-stage-inline-form">
                    <input
                      type="text"
                      value={newStageInputTitle}
                      onChange={e => setNewStageInputTitle(e.target.value)}
                      placeholder="Stage Title..."
                      autoFocus
                      className="add-stage-input"
                    />
                    <button type="button" className="add-stage-save-btn" onClick={handleAddStage}>
                      Add
                    </button>
                    <button
                      type="button"
                      className="add-stage-cancel-btn"
                      onClick={() => setShowAddStageInput(false)}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="add-stage-trigger-btn"
                    onClick={() => setShowAddStageInput(true)}
                  >
                    <Plus size={12} />
                    <span>Add Stage</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Raw Outline Editor Drawer */}
          {isEditingOutline && (
            <div className="roadmap-outline-editor-card">
              <div className="editor-card-header">
                <div>
                  <strong>Edit Full Roadmap Outline — {activeSubject}</strong>
                  <p className="editor-subtext">
                    Format as <code>STAGE 1 — NAME</code> followed by <code>1.1 Topic</code>.
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
              />

              <div className="editor-card-footer">
                <button type="button" className="editor-save-btn" onClick={handleSaveRaw}>
                  <Check size={13} /> Save Changes
                </button>
                <button type="button" className="editor-cancel-btn" onClick={() => setIsEditingOutline(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* 5. SINGLE STAGE DETAIL VIEW: ONLY SHOWS THIS PARTICULAR STAGE! */}
          {!isEditingOutline && currentStage && (
            <div className="single-stage-focused-card">
              {/* Stage Header Banner */}
              <div className="stage-focus-header">
                <div className="stage-focus-left">
                  <span className="stage-focus-number-badge">
                    STAGE {activeStageIdx + 1} OF {curriculum.stages.length}
                  </span>
                  <h3 className="stage-focus-title">{currentStage.title}</h3>
                </div>

                <div className="stage-focus-right">
                  <span className="stage-focus-counter">
                    {(currentStage.checkpoints || []).filter(c => c.completed).length} of {(currentStage.checkpoints || []).length} Checkpoints Done
                  </span>

                  {/* Pin to Timetable Button */}
                  {activeStageIdx !== progress.activeStageIndex ? (
                    <button
                      type="button"
                      className="pin-timetable-btn"
                      onClick={() => handleSetTimetableActiveStage(currentStage.id, currentStage.title)}
                      title="Set this stage so its next checkpoint displays on your timetable"
                    >
                      <Flame size={12} />
                      <span>Set as Active on Timetable</span>
                    </button>
                  ) : (
                    <span className="pinned-badge-active">
                      ★ Active on Timetable
                    </span>
                  )}

                  <button
                    type="button"
                    className="delete-stage-btn"
                    onClick={() => handleDeleteCurrentStage(currentStage.id)}
                    title="Delete this stage"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Checkpoints for THIS Stage Only */}
              <div className="stage-focus-checkpoints-list">
                {(!currentStage.checkpoints || currentStage.checkpoints.length === 0) ? (
                  <div className="empty-checkpoints-prompt">
                    <span>No checkpoints in this stage yet. Add your first checkpoint below!</span>
                  </div>
                ) : (
                  currentStage.checkpoints.map(cp => (
                    <div
                      key={cp.id}
                      className={`single-checkpoint-row ${cp.completed ? 'completed' : ''}`}
                    >
                      <label className="checkpoint-toggle-label">
                        <input
                          type="checkbox"
                          checked={cp.completed}
                          onChange={() => handleToggleCheckpoint(currentStage.id, cp.id, cp.title)}
                          className="single-checkpoint-box"
                        />
                        <div className="checkpoint-label-body">
                          <span className={`checkpoint-headline ${cp.completed ? 'strikethrough' : ''}`}>
                            {cp.title}
                          </span>
                          {cp.details && cp.details.length > 0 && (
                            <div className="checkpoint-tags-wrap">
                              {cp.details.map((det, dIdx) => (
                                <span key={dIdx} className="checkpoint-sub-pill">• {det}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>

                      <button
                        type="button"
                        className="delete-checkpoint-btn"
                        onClick={() => handleDeleteCheckpoint(currentStage.id, cp.id)}
                        title="Delete checkpoint"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Checkpoint to this Stage */}
              <div className="stage-focus-add-checkpoint-row">
                <input
                  type="text"
                  value={newCheckpointText}
                  onChange={e => setNewCheckpointText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddCheckpoint(currentStage.id);
                  }}
                  placeholder={`+ Add checkpoint to Stage ${activeStageIdx + 1}...`}
                  className="add-checkpoint-input"
                />
                <button
                  type="button"
                  className="add-checkpoint-submit-btn"
                  onClick={() => handleAddCheckpoint(currentStage.id)}
                >
                  <Plus size={13} />
                  <span>Add Checkpoint</span>
                </button>
              </div>

              {/* Stage Navigation Arrows (Prev / Next) */}
              <div className="stage-footer-nav">
                <button
                  type="button"
                  className="stage-nav-arrow-btn"
                  disabled={activeStageIdx === 0}
                  onClick={() => setActiveStageIdx(prev => Math.max(0, prev - 1))}
                >
                  <ArrowLeft size={14} />
                  <span>Previous Stage</span>
                </button>

                <span className="stage-nav-counter">
                  Viewing Stage {activeStageIdx + 1} of {curriculum.stages.length}
                </span>

                <button
                  type="button"
                  className="stage-nav-arrow-btn"
                  disabled={activeStageIdx === curriculum.stages.length - 1}
                  onClick={() => setActiveStageIdx(prev => Math.min(curriculum.stages.length - 1, prev + 1))}
                >
                  <span>Next Stage</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
