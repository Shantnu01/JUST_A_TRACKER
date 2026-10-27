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

// Clean, simple 3-stage starter curriculum for NLP
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
        └── Semantic Search Project`;

// Clean 3-stage starter curriculum for DSA
export const DEFAULT_DSA_CURRICULUM_RAW = `DSA Mastery
│
├── STAGE 1 — FOUNDATIONS & CORE PATTERNS
│   ├── 1.1 Two Pointers & Sliding Window
│   │   ├── Array boundaries
│   │   └── Subarray sums
│   ├── 1.2 Hash Maps & Frequency Counting
│   │   ├── Fast lookups O(1)
│   │   └── Anagram & target pair patterns
│   └── 1.3 Linked Lists & Fast/Slow Pointers
│       ├── Reversal in-place
│       └── Cycle detection
│
├── STAGE 2 — TREES, RECURSION & SEARCH
│   ├── 2.1 Binary Trees & Invert / Max Depth
│   │   ├── Depth First Search (DFS)
│   │   └── Breadth First Search (BFS)
│   ├── 2.2 Binary Search Trees & LCA
│   │   ├── BST properties
│   │   └── Lowest Common Ancestor
│   └── 2.3 Binary Search on Sorted Arrays
│       ├── Rotated arrays
│       └── Search space reduction
│
└── STAGE 3 — ADVANCED ALGORITHMS & GRAPHS 🚀
    ├── 3.1 Dynamic Programming (1D & 2D)
    │   ├── State transitions
    │   └── Memoization vs Tabulation
    ├── 3.2 Graph Traversal (DFS/BFS)
    │   ├── Island count patterns
    │   └── Topological sort / Course schedule
    └── 3.3 Complexity & Speed Verification
        ├── Space & Time trade-offs
        └── Edge case resilience`;

// Clean 3-stage starter curriculum for System Design & Projects
export const DEFAULT_SYSTEM_DESIGN_CURRICULUM_RAW = `System Design & Architecture
│
├── STAGE 1 — CORE ARCHITECTURE & APIS
│   ├── 1.1 Client-Server Protocols & REST
│   │   ├── Stateless HTTP & status codes
│   │   └── WebSockets & Real-time
│   ├── 1.2 Relational vs NoSQL Storage
│   │   ├── ACID transactions & normalization
│   │   └── Document stores & partitioning
│   └── 1.3 In-Memory Caching (Redis)
│       ├── Cache-aside pattern
│       └── Eviction policies (LRU)
│
├── STAGE 2 — SCALABILITY & ASYNC FLOWS
│   ├── 2.1 Load Balancing & Reverse Proxies
│   │   ├── Round-robin & least-connections
│   │   └── Nginx & SSL termination
│   ├── 2.2 Event-Driven Message Queues
│   │   ├── Kafka / RabbitMQ producer-consumer
│   │   └── Idempotency & retries
│   └── 2.3 Database Replication & Sharding
│       ├── Leader-follower replication
│       └── Consistent hashing
│
└── STAGE 3 — PRODUCTION RESILIENCE & OBSERVABILITY 🚀
    ├── 3.1 Rate Limiting & DoS Protection
    │   ├── Token bucket algorithm
    │   └── API gateway enforcement
    ├── 3.2 Logging, Tracing & Metrics
    │   ├── Prometheus & Grafana
    │   └── Distributed trace IDs
    └── 3.3 CI/CD & Zero-Downtime Deployment
        ├── Blue-green deployments
        └── Automated rollbacks`;

export function getStarterCurriculumRaw(subjectName = '') {
  const clean = (subjectName || '').toLowerCase();
  if (clean.includes('nlp') || clean.includes('natural language') || clean.includes('ai') || clean.includes('ml')) {
    return DEFAULT_NLP_CURRICULUM_RAW;
  }
  if (clean.includes('dsa') || clean.includes('leetcode') || clean.includes('algo') || clean.includes('data structure')) {
    return DEFAULT_DSA_CURRICULUM_RAW;
  }
  if (clean.includes('system design') || clean.includes('architecture') || clean.includes('backend') || clean.includes('project')) {
    return DEFAULT_SYSTEM_DESIGN_CURRICULUM_RAW;
  }
  return `${subjectName || 'Subject'} Roadmap
│
├── STAGE 1 — CORE FUNDAMENTALS
│   ├── 1.1 Core Principles & Terminology
│   │   ├── Basic concepts
│   │   └── Working environment setup
│   ├── 1.2 Essential Workflows & Syntax
│   │   ├── Standard conventions
│   │   └── First practical examples
│   └── 1.3 Foundation Exercises
│       ├── Building blocks
│       └── Initial verification
│
├── STAGE 2 — INTERMEDIATE DEEP DIVE
│   ├── 2.1 Core Architectural Patterns
│   │   ├── Structure & modularity
│   │   └── Handling edge cases
│   ├── 2.2 Problem Solving & Tooling
│   │   ├── Debugging techniques
│   │   └── Common pitfalls
│   └── 2.3 Integrated Practice
│       ├── Combining topics
│       └── Real-world application
│
└── STAGE 3 — ADVANCED MASTERY & PROJECTS 🚀
    ├── 3.1 Advanced Optimization
    │   ├── Performance & efficiency
    │   └── Production standards
    ├── 3.2 Mini Capstone Implementation
    │   ├── End-to-end execution
    │   └── Deployment or demonstration
    └── 3.3 Review & Active Recall
        ├── Summary synthesis
        └── Retention testing`;
}

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

// Convert structured curriculum object back to clean raw text outline for easy editing
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

// Generate normalized storage key
export function getCurriculumKey(subjectName = '') {
  const clean = (subjectName || '').toLowerCase().replace(/[^a-z0-9]/g, '_').trim();
  return `daymark-curriculum-${clean || 'general'}`;
}

// Load curriculum from localStorage (with intelligent clean starter if requested or matching known subject)
export function loadSubjectCurriculum(subjectName = '', autoSeed = false) {
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

  // Auto-seed for common subjects or when autoSeed flag is true
  const lower = subjectName.toLowerCase();
  const shouldAutoSeed = autoSeed || 
    lower.includes('nlp') || 
    lower.includes('dsa') || 
    lower.includes('system design');

  if (shouldAutoSeed) {
    const raw = getStarterCurriculumRaw(subjectName);
    const parsed = parseCurriculumText(raw);
    parsed.subject = subjectName;
    try {
      localStorage.setItem(key, JSON.stringify(parsed));
    } catch {}
    return parsed;
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
          nextCheckpoints.push({ ...cp, stageId: stage.id, stageTitle: stage.title });
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
