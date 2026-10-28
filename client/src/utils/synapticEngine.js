// Daymark Synaptic Bridge Engine
// Neuroscience-grounded active recall & spaced interleaving retrieval engine

export const SYNAPTIC_KNOWLEDGE_BANK = {
  // --- DSA & ALGORITHMS ---
  'two pointers': {
    topic: 'Two Pointers & Sliding Window',
    question: 'When optimizing a contiguous subarray sum problem using a Sliding Window, what condition MUST hold true for the two-pointer approach to be valid?',
    options: [
      { id: 'A', text: 'All array elements must be strictly non-negative (monotonic window expansion).', isCorrect: true },
      { id: 'B', text: 'The array must be pre-sorted in ascending order.', isCorrect: false },
      { id: 'C', text: 'The subarray length must be an even integer.', isCorrect: false },
      { id: 'D', text: 'Window shrink operations must take O(log N) time.', isCorrect: false }
    ],
    explanation: 'Standard sliding window requires monotonicity: expanding the right pointer only increases the property (like sum), and shrinking the left pointer only decreases it. Negative numbers break monotonicity, requiring a Prefix Sum + Hash Map (O(N)) instead.',
    memoryHook: 'Negative values break sliding window monotonicity — reach for Prefix Sum + Hash Map.'
  },
  'binary search': {
    topic: 'Binary Search & Monotonic Predicates',
    question: 'In Binary Search on Answer (e.g., Koko Eating Bananas, Capacity to Ship Packages), what is the fundamental property of the feasibility check function?',
    options: [
      { id: 'A', text: 'The feasibility function must be monotonic: transitions from False to True (or vice versa) exactly once.', isCorrect: true },
      { id: 'B', text: 'The input array elements must be strictly distinct prime numbers.', isCorrect: false },
      { id: 'C', text: 'The search space must be bounded by O(1) space complexity.', isCorrect: false },
      { id: 'D', text: 'The target value must always be a known array index.', isCorrect: false }
    ],
    explanation: 'Binary Search on Answer works because the predicate function F(x) is monotonic: F(x) = [F, F, F, T, T, T]. This allows discarding half the search range in O(log(High - Low)) iterations.',
    memoryHook: 'Monotonic predicate (FFFFTTTT) = Binary Search on the boundary.'
  },
  'graphs': {
    topic: 'Graph Theory & Topological Sort',
    question: 'Why does Kahn\'s Algorithm fail to produce a topological ordering of all V vertices if a directed graph contains a directed cycle?',
    options: [
      { id: 'A', text: 'Nodes participating in the cycle never reach an in-degree of 0, so they are never enqueued.', isCorrect: true },
      { id: 'B', text: 'Cycles cause BFS queues to exceed O(V) space and trigger a memory overflow.', isCorrect: false },
      { id: 'C', text: 'Topological sort only works on undirected bipartite graphs.', isCorrect: false },
      { id: 'D', text: 'Kahn\'s algorithm requires edge weights to calculate the shortest path.', isCorrect: false }
    ],
    explanation: 'Kahn\'s algorithm dequeues vertices with in-degree 0. Every node in a directed cycle has at least one incoming edge from another cycle node, so their in-degree never drops to 0. Thus, processed_count < V indicates a cycle.',
    memoryHook: 'Cycle nodes never hit in-degree 0 = Kahn’s queue starves.'
  },
  'dynamic programming': {
    topic: 'Dynamic Programming (Memoization vs Tabulation)',
    question: 'What is the primary trade-off between Top-Down (Memoization) and Bottom-Up (Tabulation) Dynamic Programming?',
    options: [
      { id: 'A', text: 'Top-Down only explores reachable subproblems but incurs call-stack overhead; Bottom-Up computes all states iteratively and allows O(1) space optimization.', isCorrect: true },
      { id: 'B', text: 'Top-Down always has lower Big-O time complexity than Bottom-Up.', isCorrect: false },
      { id: 'C', text: 'Tabulation cannot solve 2D grid dynamic programming problems.', isCorrect: false },
      { id: 'D', text: 'Memoization operates strictly without a cache array or hash table.', isCorrect: false }
    ],
    explanation: 'Top-Down uses recursion + memo cache (can cause stack overflow on deep recursion but avoids calculating unreachable states). Bottom-Up fills a table iteratively, eliminating stack frames and often allowing rolling variables for O(1) auxiliary space.',
    memoryHook: 'Top-down visits only needed states; bottom-up saves the call stack and shrinks space.'
  },
  'trees': {
    topic: 'Binary Search Trees & Traversals',
    question: 'Which tree traversal order visits the nodes of a valid Binary Search Tree (BST) in strictly ascending sorted order?',
    options: [
      { id: 'A', text: 'In-order Traversal (Left, Root, Right)', isCorrect: true },
      { id: 'B', text: 'Pre-order Traversal (Root, Left, Right)', isCorrect: false },
      { id: 'C', text: 'Post-order Traversal (Left, Right, Root)', isCorrect: false },
      { id: 'D', text: 'Breadth-First Level Order Traversal', isCorrect: false }
    ],
    explanation: 'In a BST, all left descendants are smaller than root, and all right descendants are greater. In-order traversal processes (Left Subtree -> Current Root -> Right Subtree), yielding elements in ascending sequence.',
    memoryHook: 'In-order traversal = In-order sorted sequence for BST.'
  },
  'linked list': {
    topic: 'Linked Lists & Fast/Slow Pointers',
    question: 'In Floyd\'s Cycle Detection (Tortoise and Hare), when the fast pointer meets the slow pointer inside a cycle, how do you locate the cycle entrance node?',
    options: [
      { id: 'A', text: 'Reset one pointer to head; advance both pointers 1 step at a time until they meet at the entrance.', isCorrect: true },
      { id: 'B', text: 'Reverse the linked list in-place and traverse until null.', isCorrect: false },
      { id: 'C', text: 'Advance the fast pointer by 3 steps while keeping the slow pointer stationary.', isCorrect: false },
      { id: 'D', text: 'Double the speed of both pointers until the second collision occurs.', isCorrect: false }
    ],
    explanation: 'Mathematically, the distance from head to cycle entrance equals the distance from collision point to cycle entrance around the cycle. Moving one pointer to head and stepping both by 1 guarantees meeting at the entrance.',
    memoryHook: 'Collision point + head $\to$ step by 1 $\to$ meet at cycle entrance.'
  },

  // --- SYSTEM DESIGN & BACKEND ARCHITECTURE ---
  'system design': {
    topic: 'System Design & Scalability',
    question: 'In distributed caching, what is the primary benefit of Consistent Hashing over simple Modulo Hashing (hash(key) % N)?',
    options: [
      { id: 'A', text: 'When a cache server is added or removed, only K/N keys need to be remapped on average rather than almost all keys.', isCorrect: true },
      { id: 'B', text: 'Consistent hashing eliminates all network latency across data centers.', isCorrect: false },
      { id: 'C', text: 'It guarantees ACID transactional atomicity across all nodes.', isCorrect: false },
      { id: 'D', text: 'It converts disk storage into non-volatile optical memory.', isCorrect: false }
    ],
    explanation: 'With standard hash(key) % N, changing N causes almost 100% of keys to hash to new nodes, triggering a massive cache stampede. Consistent Hashing places nodes on a ring so only K/N keys relocate during node churn.',
    memoryHook: 'Consistent Hashing ring = Minimal key remapping during server scaling.'
  },
  'caching': {
    topic: 'Caching & Concurrency',
    question: 'Under high concurrent read/write traffic, how does the Cache-Aside pattern mitigate race conditions when updating data?',
    options: [
      { id: 'A', text: 'Update the database first, then invalidate (delete) the cache entry rather than updating it with stale data.', isCorrect: true },
      { id: 'B', text: 'Always write to cache first and let an async background worker flush to disk once per day.', isCorrect: false },
      { id: 'C', text: 'Lock the entire Redis instance with a global mutex on every write.', isCorrect: false },
      { id: 'D', text: 'Store all database records in local browser localStorage.', isCorrect: false }
    ],
    explanation: 'Writing to DB first and then deleting from cache avoids stale write collisions (where an older write overrides a newer one). Subsequent reads will fetch fresh data from DB and repopulate the cache.',
    memoryHook: 'DB update first, then cache delete $\to$ avoids stale write collisions.'
  },
  'cap theorem': {
    topic: 'CAP Theorem & Distributed Databases',
    question: 'According to the CAP Theorem, when a network partition (P) inevitably occurs in a distributed system, what fundamental trade-off must be made?',
    options: [
      { id: 'A', text: 'Choose between Consistency (rejecting updates to prevent stale reads) or Availability (accepting updates on all nodes despite divergence).', isCorrect: true },
      { id: 'B', text: 'Choose between CPU utilization and GPU parallel processing speed.', isCorrect: false },
      { id: 'C', text: 'Choose between SQL relational schema or NoSQL document stores.', isCorrect: false },
      { id: 'D', text: 'Choose between synchronous HTTPS and asynchronous WebSockets.', isCorrect: false }
    ],
    explanation: 'Partitions (P) in distributed networks are inevitable physical realities. When nodes cannot communicate, you either prioritize Consistency (CP: return error rather than stale data) or Availability (AP: return data even if stale).',
    memoryHook: 'P is non-negotiable in real networks; choose between C (strict correctness) or A (100% uptime).'
  },

  // --- COMPUTER SCIENCE CORE (OS, NETWORKS, MEMORY) ---
  'operating systems': {
    topic: 'Operating Systems & Virtual Memory',
    question: 'What occurs during a Page Fault in an operating system with demand paging?',
    options: [
      { id: 'A', text: 'A hardware trap occurs because the requested virtual page is not currently in physical RAM, requiring the OS to load it from disk swap.', isCorrect: true },
      { id: 'B', text: 'The CPU permanently terminates the process due to a segmentation violation.', isCorrect: false },
      { id: 'C', text: 'The operating system switches from 64-bit to 32-bit execution mode.', isCorrect: false },
      { id: 'D', text: 'All CPU registers are cleared and the system reboots into BIOS.', isCorrect: false }
    ],
    explanation: 'When the MMU looks up a virtual address whose valid bit is 0 in the page table, it raises a page fault interrupt. The OS suspends the thread, reads the page from disk swap into an available RAM frame, updates the page table, and resumes execution.',
    memoryHook: 'Valid bit = 0 $\to$ Page fault trap $\to$ Disk fetch to RAM frame.'
  },
  'concurrency': {
    topic: 'Concurrency & Deadlocks',
    question: 'Which of the following is NOT one of the 4 Coffman conditions required for a deadlock to occur?',
    options: [
      { id: 'A', text: 'Preemptive Resource Seizure (the OS forcibly steals allocated resources from running threads)', isCorrect: true },
      { id: 'B', text: 'Mutual Exclusion (resources cannot be shared simultaneously)', isCorrect: false },
      { id: 'C', text: 'Hold and Wait (processes hold existing resources while requesting new ones)', isCorrect: false },
      { id: 'D', text: 'Circular Wait (a closed loop of threads waiting on each other\'s resources)', isCorrect: false }
    ],
    explanation: 'The 4 Coffman conditions are: 1) Mutual Exclusion, 2) Hold and Wait, 3) No Preemption (resources cannot be forcibly taken), and 4) Circular Wait. Preemption breaks deadlocks; "No Preemption" is the deadlock condition.',
    memoryHook: 'Deadlock needs NO preemption. Breaking any 1 of the 4 Coffman conditions prevents deadlocks.'
  },

  // --- FRONTEND ARCHITECTURE & BROWSER ---
  'react': {
    topic: 'React Architecture & Reconciliation',
    question: 'In React 18+ Fiber architecture, what distinguishes the Render phase from the Commit phase?',
    options: [
      { id: 'A', text: 'Render phase is asynchronous and can be paused or aborted; Commit phase is synchronous and mutates the actual DOM.', isCorrect: true },
      { id: 'B', text: 'Render phase directly manipulates the browser DOM, while Commit phase compiles JSX to JS.', isCorrect: false },
      { id: 'C', text: 'Commit phase only runs when errors are thrown inside ErrorBoundaries.', isCorrect: false },
      { id: 'D', text: 'Render phase runs entirely on a Web Worker thread.', isCorrect: false }
    ],
    explanation: 'Fiber splits work into: 1) Render phase (computing diffs and work-in-progress trees; can yield to browser to prevent UI stutter), and 2) Commit phase (applying DOM updates, run synchronously in a single flush).',
    memoryHook: 'Render is interruptible math; Commit is the synchronous DOM reality.'
  },

  // --- COGNITIVE SCIENCE & NEUROLOGY ---
  'focus': {
    topic: 'Cognitive Neuroscience & Ultradian Flow',
    question: 'According to Kleitman’s Basic Rest-Activity Cycle (BRAC), why is 90 minutes considered the optimal ceiling for continuous deep cognitive focus?',
    options: [
      { id: 'A', text: 'Neural acetylcholine and dopamine baseline reserves deplete, while adenosine accumulates, triggering autonomic downregulation.', isCorrect: true },
      { id: 'B', text: 'The brain physically shrinks by 5% during extended study blocks.', isCorrect: false },
      { id: 'C', text: 'Human optic nerves stop transmitting photons after 90 minutes of screen exposure.', isCorrect: false },
      { id: 'D', text: 'Cerebrospinal fluid freezes in the prefrontal cortex without caffeine.', isCorrect: false }
    ],
    explanation: 'Ultradian rhythms govern biological alertness in 90-minute oscillation cycles. Pushing past 90 minutes without downshifting (like NSDR or optic flow) elevates cortisol, accumulates cognitive debt, and reduces memory consolidation.',
    memoryHook: '90-min peak $\to$ 20-min autonomic recharge for sustained neuroplasticity.'
  }
};

// Auto-detect the best matching knowledge topic from session titles or checkpoints
export function resolveSynapticTopic(sessionTitle = '', sessionSubtitle = '', checkpointTitle = '') {
  const combined = `${sessionTitle} ${sessionSubtitle} ${checkpointTitle}`.toLowerCase();

  for (const [key, drill] of Object.entries(SYNAPTIC_KNOWLEDGE_BANK)) {
    if (combined.includes(key) || key.split(' ').every(w => combined.includes(w))) {
      return drill;
    }
  }

  // Common aliases & keywords
  if (combined.includes('dsa') || combined.includes('leetcode') || combined.includes('algorithm') || combined.includes('codeforces')) {
    return SYNAPTIC_KNOWLEDGE_BANK['two pointers'];
  }
  if (combined.includes('graph') || combined.includes('tree') || combined.includes('bfs') || combined.includes('dfs')) {
    return SYNAPTIC_KNOWLEDGE_BANK['graphs'];
  }
  if (combined.includes('system') || combined.includes('backend') || combined.includes('api') || combined.includes('scale')) {
    return SYNAPTIC_KNOWLEDGE_BANK['system design'];
  }
  if (combined.includes('react') || combined.includes('frontend') || combined.includes('web') || combined.includes('javascript')) {
    return SYNAPTIC_KNOWLEDGE_BANK['react'];
  }
  if (combined.includes('os') || combined.includes('linux') || combined.includes('memory') || combined.includes('thread')) {
    return SYNAPTIC_KNOWLEDGE_BANK['operating systems'];
  }

  // Dynamic fallback synthesis for custom topics
  const displayTopic = checkpointTitle || sessionTitle || 'Deep Work Session';
  return {
    topic: displayTopic,
    question: `In today's deep work on "${displayTopic}", which core principle was most essential for solving the primary bottleneck?`,
    options: [
      { id: 'A', text: 'Identifying the core invariant and breaking down complexity into modular, testable steps.', isCorrect: true },
      { id: 'B', text: 'Relying exclusively on trial-and-error without profiling or measuring constraints.', isCorrect: false },
      { id: 'C', text: 'Ignoring edge cases until production release.', isCorrect: false },
      { id: 'D', text: 'Maximizing cognitive multitasking across unrelated tabs.', isCorrect: false }
    ],
    explanation: `Deliberate practice requires isolating key invariants and mastering the fundamental bottlenecks before scaling complexity.`,
    memoryHook: `Master the invariants first; optimization follows understanding.`
  };
}

// Synaptic Mastery & Reinforcement Queue Store
const STATS_KEY = 'daymark-synaptic-stats';
const QUEUE_KEY = 'daymark-synaptic-reinforce-queue';

export function getSynapticStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    totalAnswered: 0,
    totalCorrect: 0,
    xp: 0,
    streak: 0,
    history: []
  };
}

export function recordSynapticDrillResult(drill, selectedOptionId, isCorrect, userExplanation = '') {
  const stats = getSynapticStats();
  stats.totalAnswered += 1;
  if (isCorrect) {
    stats.totalCorrect += 1;
    stats.xp += 25;
    stats.streak += 1;
  } else {
    stats.streak = 0;
    // Add to tomorrow's reinforcement queue
    addToReinforceQueue(drill);
  }

  stats.history.unshift({
    timestamp: Date.now(),
    topic: drill.topic,
    isCorrect,
    selectedOptionId,
    userExplanation
  });

  // Keep last 30
  if (stats.history.length > 30) stats.history = stats.history.slice(0, 30);

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {}

  return stats;
}

export function addToReinforceQueue(drill) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    if (!queue.find(q => q.topic === drill.topic)) {
      queue.push({
        topic: drill.topic,
        question: drill.question,
        queuedAt: Date.now()
      });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (e) {}
}

export function getReinforcementQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
