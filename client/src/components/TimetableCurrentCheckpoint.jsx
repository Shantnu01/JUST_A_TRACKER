import React, { useState, useEffect } from 'react';
import {
  Milestone,
  CheckCircle2,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import {
  loadSubjectCurriculum,
  saveSubjectCurriculum,
  calculateCurriculumProgress,
  toggleCurriculumCheckpoint
} from '../utils/curriculumEngine';

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
    if (setToast) {
      setToast(`✓ Completed checkpoint: ${nextTarget.title}`);
      setTimeout(() => setToast(''), 2200);
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
    <div className="timetable-checkpoint-capsule active" onClick={(e) => e.stopPropagation()}>
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
  );
}
