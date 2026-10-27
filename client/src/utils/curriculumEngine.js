// Daymark Autonomous Curriculum & Stage Roadmap Engine (Format-First, No Auto-Seeded Stages)

export const CHATGPT_ROADMAP_PROMPT_TEMPLATE = `Generate a comprehensive, structured stage-by-stage learning roadmap for [SUBJECT NAME].
Format it strictly as a clean numbered stage outline using this exact hierarchy:

[SUBJECT NAME]
│
├── STAGE 1 — [STAGE NAME IN CAPS]
│   ├── 1.1 [First Topic / Checkpoint Title]
│   │   ├── [Subtopic detail]
│   │   └── [Subtopic detail]
│   ├── 1.2 [Second Topic Title]
│   └── 1.3 [Third Topic Title]
│
├── STAGE 2 — [STAGE NAME IN CAPS]
│   ├── 2.1 [Topic Title]
│   └── 2.2 [Topic Title]
│
└── STAGE 3 — [STAGE NAME IN CAPS]
    ├── 3.1 [Topic Title]
    └── 3.2 [Topic Title]

Keep it strictly sequential from beginner fundamentals up to advanced production implementations.`;

// Parse raw outline, markdown, or ASCII tree into structured stages and checkpoints
export function parseCurriculumText(text) {
  if (!text || !text.trim()) return { title: 'Curriculum Roadmap', stages: [] };

  const lines = text.split(/\r?\n/);
  const stages = [];
  let currentStage = null;
  let currentCheckpoint = null;
  let overallTitle = '';

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === '│') continue;

    // Clean branch symbols and markdown headers
    const clean = line.replace(/^[│├──└──\s\-\*#]+/g, '').trim();
    if (!clean) continue;

    // Check if line is title
    if (!overallTitle && !clean.toUpperCase().startsWith('STAGE') && !/^\d+\.\d+/.test(clean)) {
      overallTitle = clean;
      continue;
    }

    // Stage Header Matcher
    const isStage = clean.toUpperCase().startsWith('STAGE ') || (/^\d+\.\d+\s+[A-Z\s]{4,}/.test(clean) && !currentStage);

    if (isStage) {
      currentStage = {
        id: 'stage-' + (stages.length + 1),
        title: clean,
        checkpoints: []
      };
      stages.push(currentStage);
      currentCheckpoint = null;
      continue;
    }

    // Checkpoint Matcher (e.g. "1.1 What is NLP?", "2.3 In-Memory Caching")
    const isCheckpoint = /^\d+\.\d+/.test(clean);

    if (isCheckpoint) {
      if (!currentStage) {
        currentStage = {
          id: 'stage-1',
          title: 'STAGE 1 — FOUNDATIONS',
          checkpoints: []
        };
        stages.push(currentStage);
      }
      const idMatch = clean.match(/^(\d+\.\d+)/);
      currentCheckpoint = {
        id: idMatch ? idMatch[1] : 'chk-' + (currentStage.checkpoints.length + 1),
        title: clean,
        details: [],
        completed: false
      };
      currentStage.checkpoints.push(currentCheckpoint);
      continue;
    }

    // Detail / Subtopic
    if (currentCheckpoint) {
      currentCheckpoint.details.push(clean);
    } else if (currentStage) {
      currentCheckpoint = {
        id: 'chk-' + (currentStage.checkpoints.length + 1),
        title: clean,
        details: [],
        completed: false
      };
      currentStage.checkpoints.push(currentCheckpoint);
    }
  }

  return {
    title: overallTitle || 'Curriculum Roadmap',
    stages
  };
}

// Convert structured curriculum object back to clean raw text outline for editing
export function formatCurriculumToText(curriculum) {
  if (!curriculum || !curriculum.stages || curriculum.stages.length === 0) {
    return '';
  }

  const lines = [curriculum.title || 'Roadmap', '│'];
  curriculum.stages.forEach((stage, sIdx) => {
    const isLastStage = sIdx === curriculum.stages.length - 1;
    const stageBranch = isLastStage ? '└──' : '├──';
    const stagePipe = isLastStage ? '   ' : '│  ';

    lines.push(`${stageBranch} ${stage.title}`);

    const cps = stage.checkpoints || [];
    cps.forEach((cp, cIdx) => {
      const isLastCp = cIdx === cps.length - 1 && (!cp.details || cp.details.length === 0);
      const cpBranch = isLastCp ? '└──' : '├──';
      lines.push(`${stagePipe} ${cpBranch} ${cp.title}`);

      if (cp.details && cp.details.length > 0) {
        const cpPipe = isLastCp ? '   ' : '│  ';
        cp.details.forEach((det, dIdx) => {
          const isLastDet = dIdx === cp.details.length - 1;
          const detBranch = isLastDet ? '└──' : '├──';
          lines.push(`${stagePipe} ${cpPipe} ${detBranch} ${det}`);
        });
      }
    });

    if (!isLastStage) {
      lines.push('│');
    }
  });

  return lines.join('\n');
}

// Generate normalized storage key (v2 key guarantees zero legacy default pre-seeds)
export function getCurriculumKey(subjectName = '') {
  const clean = (subjectName || '').toLowerCase().replace(/[^a-z0-9]/g, '_').trim();
  return `daymark-roadmap-v2-${clean || 'general'}`;
}

// One-time purge of old legacy auto-seeded keys from previous versions
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('daymark-curriculum-')) {
        localStorage.removeItem(k);
      }
    });
  } catch {}
}

// Load curriculum from localStorage (STRICTLY returns user-saved roadmap, null if not created yet)
export function loadSubjectCurriculum(subjectName = '') {
  if (!subjectName) return null;
  const key = getCurriculumKey(subjectName);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.stages) && parsed.stages.length > 0) {
        return parsed;
      }
    }
  } catch {}
  // NEVER auto-seed default stages!
  return null;
}

// Delete curriculum from localStorage
export function deleteSubjectCurriculum(subjectName = '') {
  if (!subjectName) return;
  const key = getCurriculumKey(subjectName);
  try {
    localStorage.removeItem(key);
  } catch {}
}

// Save curriculum to localStorage
export function saveSubjectCurriculum(subjectName, curriculum) {
  if (!subjectName || !curriculum) return;
  const key = getCurriculumKey(subjectName);
  try {
    localStorage.setItem(key, JSON.stringify(curriculum));
  } catch {}
}

// Calculate progress, active stage, and next incomplete checkpoints
export function calculateCurriculumProgress(curriculum) {
  if (!curriculum || !curriculum.stages || curriculum.stages.length === 0) {
    return {
      totalCheckpoints: 0,
      completedCheckpoints: 0,
      percent: 0,
      activeStageIndex: 0,
      activeStage: null,
      nextCheckpoints: [],
      isFinished: false
    };
  }

  let total = 0;
  let completed = 0;
  let firstIncompleteStageIdx = -1;
  const stageIncompleteMap = {};

  curriculum.stages.forEach((stage, idx) => {
    stageIncompleteMap[stage.id] = [];
    (stage.checkpoints || []).forEach(cp => {
      total++;
      if (cp.completed) {
        completed++;
      } else {
        stageIncompleteMap[stage.id].push({ ...cp, stageId: stage.id, stageTitle: stage.title });
        if (firstIncompleteStageIdx === -1) {
          firstIncompleteStageIdx = idx;
        }
      }
    });
  });

  // Respect manual active stage if set
  let activeStageIndex = -1;
  if (curriculum.manualActiveStageId) {
    const manualIdx = curriculum.stages.findIndex(st => st.id === curriculum.manualActiveStageId);
    if (manualIdx !== -1) {
      activeStageIndex = manualIdx;
    }
  }

  if (activeStageIndex === -1) {
    activeStageIndex = firstIncompleteStageIdx === -1 ? curriculum.stages.length - 1 : firstIncompleteStageIdx;
  }

  // Collect next target checkpoints from active stage first
  let nextCheckpoints = [];
  const activeStage = curriculum.stages[activeStageIndex];
  if (activeStage && stageIncompleteMap[activeStage.id]) {
    nextCheckpoints.push(...stageIncompleteMap[activeStage.id]);
  }

  // If active stage is done, check other stages
  if (nextCheckpoints.length === 0) {
    curriculum.stages.forEach(st => {
      if (nextCheckpoints.length < 5 && stageIncompleteMap[st.id]) {
        nextCheckpoints.push(...stageIncompleteMap[st.id]);
      }
    });
  }

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    totalCheckpoints: total,
    completedCheckpoints: completed,
    percent,
    activeStageIndex,
    activeStage: curriculum.stages[activeStageIndex] || null,
    nextCheckpoints: nextCheckpoints.slice(0, 4),
    isFinished: completed === total && total > 0
  };
}

// Set manual active stage for a subject curriculum
export function setActiveStageForCurriculum(curriculum, stageId) {
  if (!curriculum || !curriculum.stages) return curriculum;
  return { ...curriculum, manualActiveStageId: stageId };
}

// Toggle a checkpoint completed status
export function toggleCurriculumCheckpoint(curriculum, stageId, checkpointId) {
  if (!curriculum || !curriculum.stages) return curriculum;

  const updatedStages = curriculum.stages.map(st => {
    if (st.id !== stageId) return st;
    const updatedCps = (st.checkpoints || []).map(cp => {
      if (cp.id === checkpointId) {
        return { ...cp, completed: !cp.completed };
      }
      return cp;
    });
    return { ...st, checkpoints: updatedCps };
  });

  return { ...curriculum, stages: updatedStages };
}

// Add a quick new checkpoint to an existing stage
export function addCheckpointToStage(curriculum, stageId, checkpointTitle) {
  if (!curriculum || !curriculum.stages || !checkpointTitle.trim()) return curriculum;

  const updatedStages = curriculum.stages.map(st => {
    if (st.id !== stageId) return st;
    const nextIdx = (st.checkpoints || []).length + 1;
    const stageNum = st.title.match(/STAGE\s*(\d+)/i)?.[1] || '1';
    const newCp = {
      id: `${stageNum}.${nextIdx}`,
      title: `${stageNum}.${nextIdx} ${checkpointTitle.trim()}`,
      details: [],
      completed: false
    };
    return { ...st, checkpoints: [...(st.checkpoints || []), newCp] };
  });

  return { ...curriculum, stages: updatedStages };
}

// Add a brand new stage to curriculum
export function addStageToCurriculum(curriculum, stageTitle) {
  if (!curriculum) return curriculum;
  const stages = curriculum.stages || [];
  const nextStageNum = stages.length + 1;
  const newStage = {
    id: `stage-${Date.now()}-${nextStageNum}`,
    title: stageTitle || `STAGE ${nextStageNum} — NEW MILESTONE`,
    checkpoints: []
  };
  return { ...curriculum, stages: [...stages, newStage] };
}

// Delete an entire stage from curriculum
export function deleteStageFromCurriculum(curriculum, stageId) {
  if (!curriculum || !curriculum.stages) return curriculum;
  const filtered = curriculum.stages.filter(s => s.id !== stageId);
  return { ...curriculum, stages: filtered };
}

// Delete a single checkpoint from a stage
export function deleteCheckpointFromStage(curriculum, stageId, checkpointId) {
  if (!curriculum || !curriculum.stages) return curriculum;
  const updatedStages = curriculum.stages.map(st => {
    if (st.id !== stageId) return st;
    const cps = (st.checkpoints || []).filter(c => c.id !== checkpointId);
    return { ...st, checkpoints: cps };
  });
  return { ...curriculum, stages: updatedStages };
}
