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

Keep it strictly sequential from beginner fundamentals up to advanced production implementations and real-world practical projects. Include 10 to 16 stages.`;

export const DEFAULT_NLP_CURRICULUM_RAW = `NLP
│
├── STAGE 1 — NLP FUNDAMENTALS
│   ├── 1.1 What is NLP?
│   │   ├── Text as data
│   │   ├── Corpus
│   │   ├── Vocabulary
│   │   └── Tokens
│   ├── 1.2 Tokenization
│   │   ├── Word-level
│   │   ├── Character-level
│   │   └── Subword-level
│   ├── 1.3 Token IDs
│   │   ├── Vocabulary → ID mapping
│   │   ├── ID → token mapping
│   │   └── OOV / UNK
│   ├── 1.4 Sequence Preparation
│   │   ├── Padding
│   │   ├── Truncation
│   │   ├── Attention masks
│   │   └── Sequence length
│   └── 1.5 Dataset Splitting
│       ├── Training
│       ├── Validation
│       └── Test
│
├── STAGE 2 — TEXT PREPROCESSING
│   ├── 2.1 Text Cleaning
│   ├── 2.2 Regex
│   ├── 2.3 Lowercasing
│   ├── 2.4 Stopwords
│   ├── 2.5 Stemming
│   ├── 2.6 Lemmatization
│   ├── 2.7 N-grams
│   │   ├── Unigram
│   │   ├── Bigram
│   │   └── Trigram
│   └── 2.8 Normalization
│       ├── Whitespace
│       ├── Unicode
│       └── Task-dependent normalization
│
├── STAGE 3 — TEXT REPRESENTATION
│   ├── 3.1 Numerical Representation
│   │   ├── Why text must become numbers
│   │   └── Sparse vs dense representation
│   ├── 3.2 One-Hot Encoding
│   │   ├── How it works
│   │   ├── Vocabulary mapping
│   │   └── Limitations
│   ├── 3.3 Bag of Words
│   │   ├── Word counts
│   │   ├── Vocabulary vector
│   │   └── Loss of word order
│   ├── 3.4 TF-IDF
│   │   ├── Term Frequency
│   │   ├── Inverse Document Frequency
│   │   ├── TF-IDF score
│   │   └── When it is useful
│   └── 3.5 Limitations
│       ├── No semantic understanding
│       ├── Sparse vectors
│       ├── Large dimensionality
│       └── Weak contextual information
│
├── STAGE 4 — WORD EMBEDDINGS ⭐
│   ├── 4.1 Why Embeddings?
│   ├── 4.2 Dense Vectors
│   │   ├── Vector representation
│   │   ├── Dimensions
│   │   └── Semantic relationships
│   ├── 4.3 Embedding Space
│   │   ├── Similarity
│   │   ├── Distance
│   │   └── Cosine similarity
│   ├── 4.4 Embedding Matrix
│   │   ├── Vocabulary size
│   │   ├── Embedding dimension
│   │   └── Lookup mechanism
│   ├── 4.5 Learnable Embeddings
│   │   ├── Random initialization
│   │   ├── Forward pass
│   │   ├── Loss
│   │   └── Backpropagation
│   ├── 4.6 PyTorch Embeddings
│   │   └── nn.Embedding
│   └── 4.7 Static vs Contextual Embeddings
│
├── STAGE 5 — WORD2VEC
│   ├── 5.1 Why Word2Vec?
│   ├── 5.2 Distributional Hypothesis
│   ├── 5.3 CBOW
│   │   ├── Context
│   │   ├── Target word
│   │   └── Context → Target
│   ├── 5.4 Skip-Gram
│   │   ├── Target word
│   │   └── Target → Context
│   ├── 5.5 Training Word2Vec
│   ├── 5.6 Negative Sampling
│   └── 5.7 Semantic Similarity
│
├── STAGE 6 — VANILLA RNN ⭐⭐⭐⭐⭐
│   ├── 6.1 Why RNN?
│   ├── 6.2 RNN Intuition
│   ├── 6.3 RNN Cell
│   ├── 6.4 Hidden State
│   ├── 6.5 RNN Forward Pass
│   ├── 6.6 Unrolling
│   ├── 6.7 RNN Architecture
│   │   ├── Many-to-One
│   │   ├── One-to-Many
│   │   └── Many-to-Many
│   ├── 6.8 Output Layer
│   └── 6.9 PyTorch RNN (nn.RNN)
│
├── STAGE 7 — TRAINING RNNs
│   ├── 7.1 Forward Pass
│   ├── 7.2 Loss Calculation
│   ├── 7.3 Backpropagation Through Time (BPTT)
│   ├── 7.4 Vanishing Gradients ⭐
│   ├── 7.5 Exploding Gradients ⭐
│   ├── 7.6 Gradient Clipping
│   └── 7.7 Truncated BPTT
│
├── STAGE 8 — LSTM ⭐⭐⭐⭐⭐
│   ├── 8.1 Why LSTM?
│   ├── 8.2 LSTM Architecture (Cell state & Hidden state)
│   ├── 8.3 Forget Gate
│   ├── 8.4 Input Gate & Candidate State
│   ├── 8.5 Cell State Update
│   ├── 8.6 Output Gate
│   ├── 8.7 Complete LSTM Forward Pass
│   ├── 8.8 LSTM Shapes (input_size, hidden_size, batch_first)
│   └── 8.9 PyTorch LSTM (nn.LSTM)
│
├── STAGE 9 — GRU
│   ├── 9.1 Why GRU?
│   ├── 9.2 Update Gate & Reset Gate
│   ├── 9.3 Hidden State Update
│   ├── 9.4 LSTM vs GRU Tradeoffs
│   └── 9.5 PyTorch GRU (nn.GRU)
│
├── STAGE 10 — ADVANCED RNN ARCHITECTURES
│   ├── 10.1 Bidirectional RNN & LSTM
│   ├── 10.2 Multi-layer Stacking & Dropout
│   ├── 10.3 Variable-length sequences & Padding Masks
│   └── 10.4 Packed Sequences in PyTorch
│
├── STAGE 11 — LANGUAGE MODELING
│   ├── 11.1 What is a Language Model?
│   ├── 11.2 Next-token Prediction & Autoregressive Flow
│   ├── 11.3 Teacher Forcing vs Free Running
│   └── 11.4 Cross-Entropy Loss & Perplexity
│
├── STAGE 12 — SEQUENCE-TO-SEQUENCE
│   ├── 12.1 Seq2Seq Architecture (Encoder & Decoder)
│   ├── 12.2 Context Vector Bottleneck
│   ├── 12.3 Seq2Seq Training vs Inference Loop
│   └── 12.4 Exposure Bias
│
├── STAGE 13 — ATTENTION MECHANISM ⭐⭐⭐⭐⭐
│   ├── 13.1 Overcoming the Fixed Context Bottleneck
│   ├── 13.2 Attention Intuition (Query, Key, Value)
│   ├── 13.3 Alignment Scores & Softmax Weights
│   ├── 13.4 Context Vector as Dynamic Weighted Sum
│   ├── 13.5 Bahdanau (Additive) vs Luong (Dot-Product) Attention
│   └── 13.6 Attention Layer Implementation
│
├── STAGE 14 — NLP TRAINING & EVALUATION
│   ├── 14.1 Dataset & DataLoader Pipeline
│   ├── 14.2 Loss Functions & Optimizers
│   ├── 14.3 Learning Rate Schedulers & Early Stopping
│   ├── 14.4 Metrics: Accuracy, Precision, Recall, F1
│   └── 14.5 Translation & Generation: BLEU & ROUGE
│
├── STAGE 15 — PRACTICAL NLP PROJECTS
│   ├── 15.1 Sentiment Analysis (BiLSTM Classifier)
│   ├── 15.2 Text Classification (Transformer / GRU)
│   ├── 15.3 Character / Word-Level Language Model
│   └── 15.4 Seq2Seq Machine Translation with Attention
│
└── STAGE 16 — TRANSFORMERS & MODERN LLMs 🚀
    ├── 16.1 Why Transformers? (Overcoming RNN Sequential Bottleneck)
    ├── 16.2 Scaled Dot-Product Self-Attention (Q, K, V)
    ├── 16.3 Multi-Head Attention Mechanism
    ├── 16.4 Positional Encodings (Sinusoidal & RoPE)
    ├── 16.5 Residual Connections & Layer Normalization
    ├── 16.6 Transformer Encoder Architecture (BERT)
    ├── 16.7 Transformer Decoder Architecture (GPT)
    ├── 16.8 Hugging Face Transformers Library
    ├── 16.9 Pretrained Model Inference (AutoTokenizer & AutoModel)
    ├── 16.10 Word vs Sentence Embeddings & Cosine Search
    ├── 16.11 LLM API Integration & Prompt Engineering
    └── 16.12 Mini Implementation Project (Semantic Search & RAG Flow)
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

// Load curriculum from localStorage (with intelligent NLP auto-seeding)
export function loadSubjectCurriculum(subjectName = '') {
  if (!subjectName) return null;
  const key = getCurriculumKey(subjectName);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  // Auto-seed if subject name contains 'nlp' or 'natural language'
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
