// Daymark Autonomous Curriculum & Stage Roadmap Engine

export const CHATGPT_ROADMAP_PROMPT_TEMPLATE = `Generate a comprehensive, structured stage-by-stage learning roadmap for [SUBJECT NAME, e.g. Operating Systems / System Design / Computer Networks].
Format it strictly as a clean numbered stage outline using this exact hierarchy:

[SUBJECT NAME]
│
├── STAGE 1 — [STAGE NAME IN CAPS]
│   ├── 1.1 [First Topic / Checkpoint]
│   │   ├── [Subtopic / detail]
│   │   └── [Subtopic / detail]
│   ├── 1.2 [Second Topic]
│   └── 1.3 [Third Topic]
│
├── STAGE 2 — [STAGE NAME IN CAPS]
│   ├── 2.1 [Topic]
...

Keep it strictly sequential from beginner fundamentals up to advanced production implementations and real-world practical projects.`;

// Clean, simple 3-stage starter curriculum by default
export const DEFAULT_NLP_CURRICULUM_RAW = `NLP Foundations
│
├── STAGE 1 — FUNDAMENTALS & TOKENS
│   ├── 1.1 What is NLP? & Corpus Basics
│   │   ├── Text as data
│   │   ├── Corpus & Vocabulary
│   │   └── Tokens
│   ├── 1.2 Tokenization Methods
│   │   ├── Word-level
│   │   ├── Character-level
│   │   └── Subword (BPE)
│   └── 1.3 Token IDs & Sequence Prep
│       ├── ID mapping
│       ├── Padding & Truncation
│       └── Attention masks
│
├── STAGE 2 — EMBEDDINGS & REPRESENTATION
│   ├── 2.1 Classical Representations
│   │   ├── One-Hot Encoding
│   │   └── TF-IDF Scores
│   ├── 2.2 Word2Vec (CBOW & Skip-Gram)
│   │   ├── Distributional Hypothesis
│   │   └── Negative Sampling
│   └── 2.3 Dense Vector Embeddings
│       ├── Embedding Space & Geometry
│       ├── Cosine Similarity
│       └── PyTorch nn.Embedding
│
└── STAGE 3 — ATTENTION & TRANSFORMERS 🚀
    ├── 3.1 Sequential Models & Limitations
    │   ├── RNN & LSTM Recap
    │   └── Context Bottleneck
    ├── 3.2 Self-Attention Mechanisms
    │   ├── Query, Key, Value
    │   └── Scaled Dot-Product
    └── 3.3 Modern Pretrained LLMs
        ├── Hugging Face Transformers
        ├── AutoTokenizer & AutoModel
        └── Semantic Search Project
`;

// Parse raw outline, markdown, or ASCII tree into structured stages and checkpoints
export function parseCurriculumText(text) {
  if (!text) return { title: 'Curriculum Roadmap', stages: [] };

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

    // Checkpoint Matcher (e.g. "1.1 What is NLP?", "16.10 Word vs Sentence Embeddings")
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

// Generate normalized storage key
export function getCurriculumKey(subjectName = '') {
  const clean = (subjectName || '').toLowerCase().replace(/[^a-z0-9]/g, '_').trim();
  return `daymark-curriculum-${clean || 'general'}`;
}

// Load curriculum from localStorage (with intelligent clean 3-stage starter)
export function loadSubjectCurriculum(subjectName = '') {
  if (!subjectName) return null;
  const key = getCurriculumKey(subjectName);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  // Auto-seed small clean starter if subject name contains 'nlp' or 'natural language'
  const lower = subjectName.toLowerCase();
  if (lower.includes('nlp') || lower.includes('natural language')) {
    const defaultCurriculum = parseCurriculumText(DEFAULT_NLP_CURRICULUM_RAW);
    defaultCurriculum.subject = subjectName;
    try {
      localStorage.setItem(key, JSON.stringify(defaultCurriculum));
    } catch {}
    return defaultCurriculum;
  }

  return null;
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
  let activeStageIndex = -1;
  let nextCheckpoints = [];

  curriculum.stages.forEach((stage, idx) => {
    let stageHasIncomplete = false;
    (stage.checkpoints || []).forEach(cp => {
      total++;
      if (cp.completed) {
        completed++;
      } else {
        stageHasIncomplete = true;
        if (nextCheckpoints.length < 4) {
          nextCheckpoints.push({ ...cp, stageTitle: stage.title });
        }
      }
    });

    if (stageHasIncomplete && activeStageIndex === -1) {
      activeStageIndex = idx;
    }
  });

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const finalStageIndex = activeStageIndex === -1 ? curriculum.stages.length - 1 : activeStageIndex;

  return {
    totalCheckpoints: total,
    completedCheckpoints: completed,
    percent,
    activeStageIndex: finalStageIndex,
    activeStage: curriculum.stages[finalStageIndex] || null,
    nextCheckpoints,
    isFinished: completed === total && total > 0
  };
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
