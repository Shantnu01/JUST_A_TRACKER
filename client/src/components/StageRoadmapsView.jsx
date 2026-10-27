import React, { useState, useEffect, useRef } from 'react';
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
  ChevronRight
} from 'lucide-react';
import {
  loadSubjectCurriculum,
  saveSubjectCurriculum,
  calculateCurriculumProgress,
  toggleCurriculumCheckpoint,
  addCheckpointToStage,
  addStageToCurriculum,
  deleteStageFromCurriculum,
  deleteCheckpointFromStage,
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
  // Extract routine focus subjects and ensure all routine subjects have default roadmaps
  const routineSubjects = React.useMemo(() => {
    const list = [];
    (routine || []).forEach(item => {
      if (item.kind === 'focus' && item.title && !list.includes(item.title)) {
        list.push(item.title);
      }
    });
    // Standard routine defaults
    if (!list.includes('NLP Foundations')) list.unshift('NLP Foundations');
    if (!list.includes('DSA practice') && !list.includes('DSA Practice')) list.push('DSA practice');
    if (!list.includes('Project development')) list.push('Project development');
    if (!list.includes('System design reading')) list.push('System design reading');
    if (!list.includes('Daily revision')) list.push('Daily revision');
    return list;
  }, [routine]);

  // Track all known subjects (routine + custom)
  const [allSubjects, setAllSubjects] = useState(() => {
    try {
      const savedCustom = JSON.parse(localStorage.getItem('daymark-custom-roadmap-subjects') || '[]');
      const combined = [...routineSubjects];
      savedCustom.forEach(s => {
        if (!combined.includes(s)) combined.push(s);
      });
      return combined;
    } catch {
      return routineSubjects;
    }
  });

  const [activeSubject, setActiveSubject] = useState(() => {
    return selectedSubject || routineSubjects[0] || 'NLP Foundations';
  });

  // Curriculum state
  const isRoutineSubj = routineSubjects.includes(activeSubject);
  const [curriculum, setCurriculum] = useState(() => {
    return loadSubjectCurriculum(activeSubject, isRoutineSubj);
  });

  // Active Stage Index for stage-by-stage viewing (Only shows ONE stage at a time!)
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  // New Subject Creation State
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');

  // Creation / Import Form State for Blank Roadmaps
  const [importText, setImportText] = useState('');
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

  // Load subject curriculum and reset stage index
  useEffect(() => {
    const isDef = routineSubjects.includes(activeSubject);
    const loaded = loadSubjectCurriculum(activeSubject, isDef);
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

  // Switch Subject
  const handleSelectSubject = (subj) => {
    setActiveSubject(subj);
    if (onSelectSubject) onSelectSubject(subj);
  };

  // Add Brand New Custom Subject (Initializes BLANK without dummy data!)
  const handleCreateNewSubject = (e) => {
    if (e) e.preventDefault();
    const cleanName = newSubjectTitle.trim();
    if (!cleanName) return;

    if (!allSubjects.includes(cleanName)) {
      const updatedList = [...allSubjects, cleanName];
      setAllSubjects(updatedList);
      try {
        const customOnly = updatedList.filter(s => !routineSubjects.includes(s));
        localStorage.setItem('daymark-custom-roadmap-subjects', JSON.stringify(customOnly));
      } catch {}
    }

    // Blank curriculum for new custom subject
    const blankCurriculum = {
      subject: cleanName,
      title: `${cleanName} Roadmap`,
      stages: []
    };
    setCurriculum(blankCurriculum);
    saveSubjectCurriculum(cleanName, blankCurriculum);
    setActiveSubject(cleanName);
    setNewSubjectTitle('');
    setShowAddSubjectModal(false);
    setActiveStageIdx(0);

    if (setToast) {
      setToast(`Created roadmap for "${cleanName}". Upload a file or paste your outline!`);
      setTimeout(() => setToast(''), 3000);
    }
  };

  // File Upload Handler (.txt or .md)
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
          setToast(`✓ Successfully imported roadmap from ${file.name} (${parsed.stages.length} stages)!`);
          setTimeout(() => setToast(''), 3000);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Build Roadmap from Pasted Text
  const handleBuildFromPastedText = () => {
    if (!importText.trim()) return;
    const parsed = parseCurriculumText(importText);
    parsed.subject = activeSubject;
    setCurriculum(parsed);
    saveSubjectCurriculum(activeSubject, parsed);
    setImportText('');
    setActiveStageIdx(0);
    if (setToast) {
      setToast(`✓ Roadmap loaded for ${activeSubject} with ${parsed.stages.length} stages!`);
      setTimeout(() => setToast(''), 3000);
    }
  };

  // Set Active Stage for Daily Timetable
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

  // Toggle Checkpoint
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

  // Add Checkpoint to CURRENT Active Stage
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

  // Delete Current Stage
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
      setRawText(getStarterCurriculumRaw(activeSubject));
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

  const hasStages = curriculum && curriculum.stages && curriculum.stages.length > 0;
  const currentStage = hasStages ? (curriculum.stages[activeStageIdx] || curriculum.stages[0]) : null;

  return (
    <div className="stage-roadmaps-hub">
      {/* 1. Header Bar */}
      <div className="roadmap-hub-header">
        <div className="roadmap-hub-title-group">
          <div className="roadmap-hub-icon-wrap">
            <Milestone size={26} color="#312e81" />
          </div>
          <div>
            <h2 className="roadmap-hub-title">Stage Roadmaps & Checkpoint Hub</h2>
            <p className="roadmap-hub-subtitle">
              Structured stage-by-stage mastery. Set your active stage here, and your daily timetable will display only your current checkpoint.
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
          {allSubjects.map(subj => {
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

          <button
            type="button"
            className="roadmap-add-subject-btn"
            onClick={() => setShowAddSubjectModal(true)}
            title="Create a new custom subject roadmap"
          >
            <Plus size={14} />
            <span>New Subject</span>
          </button>
        </div>
      </div>

      {/* Modal: Create New Subject (Starts Blank!) */}
      {showAddSubjectModal && (
        <div className="roadmap-modal-overlay" onClick={() => setShowAddSubjectModal(false)}>
          <div className="roadmap-modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="modal-card-title">Create New Subject Roadmap</h3>
            <p className="modal-card-sub">
              Enter the subject name. It will start blank so you can upload your file or paste your custom roadmap.
            </p>
            <form onSubmit={handleCreateNewSubject}>
              <input
                type="text"
                value={newSubjectTitle}
                onChange={e => setNewSubjectTitle(e.target.value)}
                placeholder="e.g. Operating Systems / Cloud Architecture"
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

      {/* 3. If Subject Has NO Stages Yet (Clean Blank Creation Canvas) */}
      {!hasStages && (
        <div className="roadmap-blank-creator-card">
          <div className="blank-creator-header">
            <div className="blank-creator-badge">CUSTOM SUBJECT</div>
            <h3 className="blank-creator-title">Set Up Roadmap for {activeSubject}</h3>
            <p className="blank-creator-desc">
              No dummy templates added. Upload your roadmap text file, paste an outline, or generate one using AI.
            </p>
          </div>

          <div className="blank-creator-options-grid">
            {/* Option 1: File Upload */}
            <div className="creator-option-box">
              <div className="option-icon-box">
                <Upload size={22} color="#312e81" />
              </div>
              <h4 className="option-title">Upload Roadmap File</h4>
              <p className="option-desc">Select any .txt or .md file with your stages and topics.</p>
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
                <span>Select .txt / .md File</span>
              </button>
            </div>

            {/* Option 2: AI Prompt Generator */}
            <div className="creator-option-box">
              <div className="option-icon-box">
                <Sparkles size={22} color="#047857" />
              </div>
              <h4 className="option-title">Generate with ChatGPT / Claude</h4>
              <p className="option-desc">Copy our prompt formatted specifically for {activeSubject}.</p>
              <button
                type="button"
                className="option-action-btn secondary"
                onClick={handleCopyChatGPT}
              >
                <Copy size={13} />
                <span>Copy AI Prompt</span>
              </button>
            </div>
          </div>

          {/* Paste Outline Area */}
          <div className="creator-paste-section">
            <label className="paste-label">
              <FileText size={14} />
              <span>Or Paste Your Stage Outline Here:</span>
            </label>
            <textarea
              className="creator-paste-textarea"
              rows={8}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={`STAGE 1 — FOUNDATIONS\n  1.1 Core Concepts\n  1.2 Syntax Basics\nSTAGE 2 — PRACTICAL APPLICATION\n  2.1 Implementation Patterns`}
            />
            <div className="creator-paste-actions">
              <button
                type="button"
                className="build-roadmap-btn"
                onClick={handleBuildFromPastedText}
                disabled={!importText.trim()}
              >
                <Check size={14} />
                <span>Build Stages from Outline</span>
              </button>
              <button
                type="button"
                className="starter-fallback-btn"
                onClick={() => {
                  const raw = getStarterCurriculumRaw(activeSubject);
                  const parsed = parseCurriculumText(raw);
                  parsed.subject = activeSubject;
                  setCurriculum(parsed);
                  saveSubjectCurriculum(activeSubject, parsed);
                }}
              >
                <RotateCcw size={13} />
                <span>Use Starter Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Subject Overview & Stage Selector Bar (When Stages Exist) */}
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
                  <Flame size={12} color="#b45309" />
                  <span>Timetable Pinned: STAGE {progress.activeStageIndex + 1}</span>
                </span>
              </div>

              <div className="command-center-actions">
                <button
                  type="button"
                  className="command-tool-btn"
                  onClick={handleStartEdit}
                  title="Edit outline text directly"
                >
                  <Layers size={13} />
                  <span>{isEditingOutline ? 'Close Editor' : 'Edit Outline'}</span>
                </button>
                <button
                  type="button"
                  className="command-tool-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload a new roadmap file"
                >
                  <Upload size={13} />
                  <span>Upload File</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Overall Progress Fill Bar */}
            <div className="roadmap-full-progress-track">
              <div
                className="roadmap-full-progress-fill"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {/* Stage Selector Tabs: Click on a stage to view ONLY that stage! */}
            <div className="stage-tabs-navigation-bar">
              <span className="stage-nav-label">Select Stage to View:</span>
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

                {/* Add Stage Button */}
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

          {/* Outline Editor (If Opened) */}
          {isEditingOutline && (
            <div className="roadmap-outline-editor-card">
              <div className="editor-card-header">
                <div>
                  <strong>Edit Full Roadmap Outline — {activeSubject}</strong>
                  <p className="editor-subtext">
                    Format as <code>STAGE 1 — NAME</code> followed by <code>1.1 Topic</code> and subtopics.
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

          {/* 5. SINGLE STAGE DETAIL VIEW (ONLY SHOWS THE SELECTED STAGE!) */}
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
                      title="Pin this stage so its next checkpoint displays on your timetable"
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
                    <span>No checkpoints in this stage yet. Add your first topic below!</span>
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

              {/* Add Checkpoint Form */}
              <div className="stage-focus-add-checkpoint-row">
                <input
                  type="text"
                  value={newCheckpointText}
                  onChange={e => setNewCheckpointText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddCheckpoint(currentStage.id);
                  }}
                  placeholder={`+ Add checkpoint to Stage ${activeStageIdx + 1} (e.g. 1.4 Sequence Length & Masks)...`}
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
                  Stage {activeStageIdx + 1} of {curriculum.stages.length}
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
