import React, { useState, useEffect } from 'react';
import {
  Milestone,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Brain,
  BookOpen,
  Edit3
} from 'lucide-react';
import {
  loadSubjectCurriculum,
  saveSubjectCurriculum,
  calculateCurriculumProgress,
  toggleCurriculumCheckpoint,
  updateCheckpointUnderstanding
} from '../utils/curriculumEngine';
import CheckpointUnderstandingModal from './CheckpointUnderstandingModal';

export default function TimetableCurrentCheckpoint({
  subject = '',
  item,
  onPlayChime,
  setToast,
  isReadOnly = false,
  onOpenRoadmap
}) {
  const cleanSubject = (subject || item?.title || 'General').trim();
  const [curriculum, setCurriculum] = useState(() => loadSubjectCurriculum(cleanSubject));
  const [understandingModalOpen, setUnderstandingModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Reload when subject changes or on periodic focus
  useEffect(() => {
    setCurriculum(loadSubjectCurriculum(cleanSubject));
  }, [cleanSubject]);

  const progress = calculateCurriculumProgress(curriculum);
  const nextTarget = progress.nextCheckpoints[0];

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isReadOnly || !curriculum || !nextTarget) return;

    const updated = toggleCurriculumCheckpoint(curriculum, nextTarget.stageId, nextTarget.id);
    setCurriculum(updated);
    saveSubjectCurriculum(cleanSubject, updated);

    if (onPlayChime) onPlayChime(true);
    if (updated && updated._isCompletedNow) {
      setUnderstandingModalOpen(true);
      if (setToast) {
        setToast(`🎯 Completed checkpoint: ${nextTarget.title}`);
        setTimeout(() => setToast(''), 2200);
      }
    } else if (setToast) {
      setToast(`✓ Checkpoint updated: ${nextTarget.title}`);
      setTimeout(() => setToast(''), 2200);
    }
  };

  const handleSaveUnderstanding = (text) => {
    if (!curriculum || !nextTarget) return;
    const updated = updateCheckpointUnderstanding(curriculum, nextTarget.stageId, nextTarget.id, text);
    setCurriculum(updated);
    saveSubjectCurriculum(cleanSubject, updated);
    setUnderstandingModalOpen(false);
    if (setToast) {
      setToast('🧠 Understanding saved to active recall!');
      setTimeout(() => setToast(''), 2500);
    }
  };

  // If no roadmap exists yet: show a clean minimal invitation
  if (!curriculum || !curriculum.stages || curriculum.stages.length === 0) {
    return (
      <div className="timetable-checkpoint-capsule unassigned">
        <div className="capsule-left">
          <Milestone size={12} className="capsule-icon" />
          <span className="capsule-label-dim">Roadmap: No stage plan</span>
        </div>
        <button
          type="button"
          className="capsule-nav-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenRoadmap) onOpenRoadmap(cleanSubject);
          }}
          title="Open Stage Roadmaps tab to set stages for this subject"
        >
          <span>Set Stages</span>
          <ExternalLink size={10} />
        </button>
      </div>
    );
  }

  // If all checkpoints completed
  if (progress.isFinished) {
    return (
      <div className="timetable-checkpoint-capsule completed">
        <div className="capsule-left">
          <CheckCircle2 size={13} color="#10b981" />
          <span className="capsule-stage-title">All Stages 100% Mastered</span>
        </div>
        <button
          type="button"
          className="capsule-nav-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenRoadmap) onOpenRoadmap(cleanSubject);
          }}
        >
          <span>Roadmap</span>
          <ExternalLink size={10} />
        </button>
      </div>
    );
  }

  // Active Target Checkpoint Single Slim Row
  return (
    <>
      <div
        className="timetable-checkpoint-capsule active"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ position: 'relative' }}
      >
        <div className="capsule-left">
          <span className="capsule-stage-pill">
            STAGE {progress.activeStageIndex + 1}
          </span>
          <label className="capsule-checkpoint-label">
            <input
              type="checkbox"
              checked={false}
              onChange={handleToggle}
              disabled={isReadOnly}
              className="capsule-checkbox"
              title="Click to check off this checkpoint"
            />
            <span className="capsule-checkpoint-text" title={nextTarget?.title}>
              {nextTarget?.title || 'Next topic'}
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Active Recall status badge */}
          {nextTarget?.understanding ? (
            <button
              type="button"
              className="checkpoint-recall-pill has-understanding"
              onClick={(e) => {
                e.stopPropagation();
                setUnderstandingModalOpen(true);
              }}
              title="Key understanding recorded. Click to review or edit."
              style={{ padding: '3px 7px', fontSize: '10px' }}
            >
              <Brain size={11} color="#f59e0b" />
              <span>Takeaway</span>
            </button>
          ) : (
            <button
              type="button"
              className="checkpoint-recall-pill revise-it"
              onClick={(e) => {
                e.stopPropagation();
                setUnderstandingModalOpen(true);
              }}
              title="No takeaway recorded yet — click to write your understanding!"
              style={{ padding: '3px 7px', fontSize: '10px' }}
            >
              <BookOpen size={11} color="#a78bfa" />
              <span>Revise it</span>
            </button>
          )}

          <button
            type="button"
            className="capsule-nav-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenRoadmap) onOpenRoadmap(cleanSubject);
            }}
            title="Open full roadmap & set stages in the Roadmaps tab"
          >
            <span>Roadmap</span>
            <ExternalLink size={10} />
          </button>
        </div>

        {/* Hover Tooltip for Understanding or Revise it */}
        {isHovered && nextTarget && (
          <div className="checkpoint-hover-tooltip" style={{ bottom: '115%', left: '10px', width: '280px' }} onClick={e => e.stopPropagation()}>
            <div className="tooltip-top-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Brain size={12} color="#f59e0b" />
                <span className="tooltip-headline">
                  {nextTarget.understanding ? 'ACTIVE RECALL // UNDERSTANDING' : 'ACTIVE RECALL // STATUS'}
                </span>
              </div>
              <button
                type="button"
                className="tooltip-quick-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setUnderstandingModalOpen(true);
                }}
              >
                <Edit3 size={11} /> {nextTarget.understanding ? 'Edit' : 'Record'}
              </button>
            </div>
            <div className="tooltip-content-area">
              {nextTarget.understanding ? (
                <div className="tooltip-understanding-prose">
                  {nextTarget.understanding}
                </div>
              ) : (
                <div className="tooltip-revise-box">
                  <span className="revise-pill-tag">📖 Revise it</span>
                  <p className="revise-help-msg">
                    No takeaway notes recorded yet. Active recall reinforces long-term retention!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CheckpointUnderstandingModal
        isOpen={understandingModalOpen}
        checkpointTitle={nextTarget?.title}
        initialText={nextTarget?.understanding || ''}
        onSave={handleSaveUnderstanding}
        onClose={() => setUnderstandingModalOpen(false)}
      />
    </>
  );
}
