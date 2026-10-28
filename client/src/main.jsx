import {
  parseCurriculumText,
  loadSubjectCurriculum,
  saveSubjectCurriculum,
  calculateCurriculumProgress,
  toggleCurriculumCheckpoint,
  CHATGPT_ROADMAP_PROMPT_TEMPLATE
} from './utils/curriculumEngine';
import TimetableCurrentCheckpoint from './components/TimetableCurrentCheckpoint';
import StageRoadmapsView from './components/StageRoadmapsView';
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlarmClock,
  Activity,
  Milestone,
  Layers,
  ArrowUpRight,
  Award,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  Coffee,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Flame,
  GitBranch,
  GitFork,
  Github,
  Leaf,
  Lock,
  LogIn,
  LogOut,
  Medal,
  Menu,
  Moon, Palette,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Share2,
  Sparkles,
  Star,
  Sun,
  Target,
  Terminal,
  TrendingUp,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Utensils,
  Volume2,
  Headphones,
  FileText,
  Link2,
  ShieldCheck,
  SlidersHorizontal,
  Rocket,
  Brain,
  ListTodo,
  Wind,
  X,
  Zap
} from 'lucide-react';
import './styles.css';
import { playFocusSound, stopFocusSound, setSoundVolume } from './utils/soundEngine';
import { calculateCircadianScore, getCircadianEnergyLevel, getCognitiveTier, calculateAutoShift, detectScheduleDrift, generateChiefOfStaffPlan, slotScheduleToCircadian } from './utils/circadianEngine';

// Dynamic API endpoint: Uses relative /api for unified production & Vite proxy,
// or uses VITE_API_URL if configured for separate frontend/backend deployments.
const API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

const iconMap = {
  Code2,
  Coffee,
  Utensils,
  BookOpen,
  RotateCcw,
  Clock3,
  Sun
};

const defaultSchedule = [
  { id: 'dsa', start: '07:00', end: '10:00', title: 'DSA practice', subtitle: 'Patterns, problem solving & complexity', hours: 3, kind: 'focus', icon: 'Code2', tone: 'sage' },
  { id: 'break1', start: '10:00', end: '11:00', title: 'Morning break', subtitle: 'Breakfast, walk, reset', hours: 1, kind: 'break', icon: 'Coffee', tone: 'sand' },
  { id: 'project1', start: '11:00', end: '14:00', title: 'Project development', subtitle: 'Build core features and architecture', hours: 3, kind: 'focus', icon: 'Code2', tone: 'blue' },
  { id: 'break2', start: '14:00', end: '15:00', title: 'Lunch break', subtitle: 'Eat, move, clear your head', hours: 1, kind: 'break', icon: 'Utensils', tone: 'sand' },
  { id: 'project2', start: '15:00', end: '18:00', title: 'Project development', subtitle: 'Testing, debugging & shipping', hours: 3, kind: 'focus', icon: 'Code2', tone: 'blue' },
  { id: 'reading', start: '18:00', end: '20:00', title: 'System design reading', subtitle: 'Read, take notes, connect to your project', hours: 2, kind: 'focus', icon: 'BookOpen', tone: 'lilac' },
  { id: 'revision', start: '20:00', end: '21:00', title: 'Daily revision', subtitle: 'Recall key ideas and plan tomorrow', hours: 1, kind: 'focus', icon: 'RotateCcw', tone: 'rose' },
];

function computeDurationHours(start, end) {
  if (!start || !end) return 1;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.round((mins / 60) * 10) / 10;
  return h > 0 ? h : 1;
}

function readSavedSchedule(userId = null) {
  try {
    const key = userId ? `daymark-schedule-${userId}` : 'daymark-schedule-guest';
    const raw = localStorage.getItem(key) || localStorage.getItem('daymark-schedule');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return defaultSchedule;
}

// Subject extractor & normalizer: groups repeated blocks of the same subject (e.g. Maths 5hr + Maths 3hr = 8hr)
function extractSubject(item) {
  const rawTitle = (item.title || '').trim();
  const lower = rawTitle.toLowerCase();

  if (item.kind === 'break' || lower.includes('break') || lower.includes('lunch') || lower.includes('breakfast')) {
    return { name: 'Break', key: 'breaks', isBreak: true };
  }
  if (lower.startsWith('dsa') || lower.includes('leetcode')) {
    return { name: 'DSA', key: 'dsa', isBreak: false };
  }
  if (lower.includes('project')) {
    return { name: 'Project', key: 'project', isBreak: false };
  }
  if (lower.includes('revision') || lower.includes('review')) {
    return { name: 'Revision', key: 'revision', isBreak: false };
  }
  if (lower.includes('reading') || lower.includes('system design')) {
    return { name: 'Reading', key: 'reading', isBreak: false };
  }

  // Remove trailing session numbers: e.g. "Maths 1" -> "Maths", "Maths - Session 2" -> "Maths"
  const cleaned = rawTitle
    .replace(/\s*[-–—]\s*(session|part|block)?\s*\d+$/i, '')
    .replace(/\s+(part|session|block)?\s*\d+$/i, '')
    .trim();

  const finalName = cleaned || rawTitle || 'Focus';
  const key = finalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'focus';
  return { name: finalName, key, isBreak: false };
}

// Derive routine goals dynamically from the schedule.
// Aggregates multiple blocks of the same subject (e.g. Maths 5hr + Maths 3hr = 8hr).
function getRoutineGoals(schedule = []) {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    return [
      { id: 'dsa', label: 'DSA · 3 hours', subject: 'DSA', assignedMinutes: 180, blockIds: ['dsa'], kind: 'focus', thresholdMinutes: 135 },
      { id: 'project', label: 'Project · 6 hours', subject: 'Project', assignedMinutes: 360, blockIds: ['project1', 'project2'], kind: 'focus', thresholdMinutes: 270 },
      { id: 'reading', label: 'Reading · 2 hours', subject: 'Reading', assignedMinutes: 120, blockIds: ['reading'], kind: 'focus', thresholdMinutes: 90 },
      { id: 'revision', label: 'Revision · 1 hour', subject: 'Revision', assignedMinutes: 60, blockIds: ['revision'], kind: 'focus', thresholdMinutes: 45 },
      { id: 'breaks', label: 'Take scheduled breaks', subject: 'Break', assignedMinutes: 0, blockIds: ['break1', 'break2'], kind: 'break', thresholdMinutes: 0 },
      { id: 'sleep', label: 'Sleep 7–8 hours', subject: 'Sleep', assignedMinutes: 0, blockIds: [], kind: 'health', thresholdMinutes: 0 }
    ];
  }

  const subjectMap = new Map();

  for (const item of schedule) {
    const { name, key, isBreak } = extractSubject(item);
    const durationHours = Number(item.hours) || computeDurationHours(item.start, item.end);
    const durationMins = Math.round(durationHours * 60);

    if (!subjectMap.has(key)) {
      subjectMap.set(key, {
        id: key,
        subject: name,
        assignedMinutes: 0,
        blockIds: [],
        kind: isBreak ? 'break' : 'focus'
      });
    }

    const group = subjectMap.get(key);
    group.assignedMinutes += durationMins;
    if (item.id && !group.blockIds.includes(item.id)) {
      group.blockIds.push(item.id);
    }
  }

  const goals = [];

  // Focus goals first
  for (const group of subjectMap.values()) {
    if (group.kind === 'focus') {
      const hours = Math.round((group.assignedMinutes / 60) * 10) / 10;
      goals.push({
        ...group,
        label: `${group.subject} · ${hours} hour${hours === 1 ? '' : 's'}`,
        thresholdMinutes: Math.ceil(group.assignedMinutes * 0.75)
      });
    }
  }

  // Break habit
  const breakGroup = subjectMap.get('breaks');
  if (breakGroup) {
    goals.push({
      ...breakGroup,
      label: breakGroup.blockIds.length > 1 ? `Take all ${breakGroup.blockIds.length} breaks` : 'Take scheduled break',
      thresholdMinutes: 0
    });
  }

  // Sleep health habit
  goals.push({
    id: 'sleep',
    subject: 'Sleep',
    label: 'Sleep 7–8 hours',
    assignedMinutes: 0,
    blockIds: [],
    kind: 'health',
    thresholdMinutes: 0
  });

  return goals;
}

// Calculate total logged focus minutes for a goal across all its schedule blocks
function getSubjectLoggedMinutes(goal, dayCompletedMinutes = {}) {
  let logged = 0;
  if (goal.blockIds && goal.blockIds.length > 0) {
    for (const bid of goal.blockIds) {
      logged += Number(dayCompletedMinutes[bid] || 0);
    }
  }
  if (dayCompletedMinutes[goal.id] && !goal.blockIds?.includes(goal.id)) {
    logged += Number(dayCompletedMinutes[goal.id] || 0);
  }
  return logged;
}

// Curated daily inspiring quotes for discipline, focus, craftsmanship & progress
const dailyQuotes = [
  { quote: "Small, consistent effort compounds into extraordinary results.", author: "Daily Practice" },
  { quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { quote: "Focus is a muscle. The more you protect your attention, the stronger it gets.", author: "Deep Work" },
  { quote: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { quote: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra" },
  { quote: "First make it work, then make it right, then make it fast.", author: "Kent Beck" },
  { quote: "Action isn't just the effect of motivation; it is also the cause of it.", author: "Mark Manson" },
  { quote: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { quote: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { quote: "Mastery is not a function of genius or talent, but of time and intense focus.", author: "Robert Greene" },
  { quote: "Consistency is the DNA of mastery.", author: "Robin Sharma" },
  { quote: "The way to build an extraordinary life is to build ordinary days well.", author: "Quiet Routine" },
  { quote: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { quote: "Progress made in silence sounds loudest over time.", author: "Focus Rule" },
  { quote: "Patience and persistence are the quietest superpowers.", author: "Calm Mind" },
  { quote: "Show up every day, do the reps, and let the outcome take care of itself.", author: "The Practice" },
  { quote: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
  { quote: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { quote: "One day or day one. You decide.", author: "Daily Mindset" },
  { quote: "Energy flows where attention goes.", author: "Focused Attention" },
  { quote: "Deep craftsmanship demands unbroken solitude.", author: "The Builder" },
  { quote: "Keep your habits small enough to start, but meaningful enough to matter.", author: "Atomic Habits" },
  { quote: "Routine, in an intelligent person, is an ambition of time.", author: "W. H. Auden" },
  { quote: "Clarity comes from engagement, not thought alone.", author: "Marie Forleo" },
  { quote: "Your future is found in your daily routine.", author: "John C. Maxwell" },
  { quote: "Consistency always beats intensity.", author: "Long-term View" },
  { quote: "Protect your mornings; that is where your foundation is poured.", author: "Daily Ritual" },
  { quote: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson" },
  { quote: "The quieter you become, the more you are able to hear.", author: "Rumi" }
];

// Curated Top Patterns & Interview DSA Sheet (Blind 75 & NeetCode standard with Company tags)
const dsaCuratedList = [
  // Arrays & Hashing
  { id: 'two-sum', title: 'Two Sum', category: 'Arrays & Hashing', difficulty: 'Easy', url: 'https://leetcode.com/problems/two-sum/', companies: ['Google', 'Amazon', 'Meta', 'Apple'] },
  { id: 'valid-anagram', title: 'Valid Anagram', category: 'Arrays & Hashing', difficulty: 'Easy', url: 'https://leetcode.com/problems/valid-anagram/', companies: ['Google', 'Apple'] },
  { id: 'group-anagrams', title: 'Group Anagrams', category: 'Arrays & Hashing', difficulty: 'Medium', url: 'https://leetcode.com/problems/group-anagrams/', companies: ['Amazon', 'Meta'] },
  { id: 'top-k-frequent', title: 'Top K Frequent Elements', category: 'Arrays & Hashing', difficulty: 'Medium', url: 'https://leetcode.com/problems/top-k-frequent-elements/', companies: ['Amazon', 'Meta'] },
  { id: 'product-of-array', title: 'Product of Array Except Self', category: 'Arrays & Hashing', difficulty: 'Medium', url: 'https://leetcode.com/problems/product-of-array-except-self/', companies: ['Meta', 'Amazon', 'Apple'] },

  // Two Pointers & Sliding Window
  { id: 'valid-palindrome', title: 'Valid Palindrome', category: 'Two Pointers & Sliding Window', difficulty: 'Easy', url: 'https://leetcode.com/problems/valid-palindrome/', companies: ['Meta', 'Microsoft'] },
  { id: 'three-sum', title: '3Sum', category: 'Two Pointers & Sliding Window', difficulty: 'Medium', url: 'https://leetcode.com/problems/3sum/', companies: ['Google', 'Meta', 'Amazon'] },
  { id: 'container-water', title: 'Container With Most Water', category: 'Two Pointers & Sliding Window', difficulty: 'Medium', url: 'https://leetcode.com/problems/container-with-most-water/', companies: ['Google', 'Amazon', 'Apple'] },
  { id: 'best-time-stock', title: 'Best Time to Buy and Sell Stock', category: 'Two Pointers & Sliding Window', difficulty: 'Easy', url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', companies: ['Amazon', 'Microsoft', 'Google'] },
  { id: 'longest-substring', title: 'Longest Substring Without Repeating Characters', category: 'Two Pointers & Sliding Window', difficulty: 'Medium', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', companies: ['Google', 'Amazon', 'Meta'] },

  // Binary Search
  { id: 'binary-search', title: 'Binary Search', category: 'Binary Search', difficulty: 'Easy', url: 'https://leetcode.com/problems/binary-search/', companies: ['Microsoft', 'Apple'] },
  { id: 'search-rotated-array', title: 'Search in Rotated Sorted Array', category: 'Binary Search', difficulty: 'Medium', url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/', companies: ['Google', 'Microsoft', 'Amazon'] },
  { id: 'find-min-rotated', title: 'Find Minimum in Rotated Sorted Array', category: 'Binary Search', difficulty: 'Medium', url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/', companies: ['Microsoft', 'Amazon'] },

  // Linked List
  { id: 'reverse-linked-list', title: 'Reverse Linked List', category: 'Linked List', difficulty: 'Easy', url: 'https://leetcode.com/problems/reverse-linked-list/', companies: ['Microsoft', 'Google', 'Amazon', 'Apple'] },
  { id: 'merge-two-sorted-lists', title: 'Merge Two Sorted Lists', category: 'Linked List', difficulty: 'Easy', url: 'https://leetcode.com/problems/merge-two-sorted-lists/', companies: ['Microsoft', 'Amazon', 'Google'] },
  { id: 'linked-list-cycle', title: 'Linked List Cycle', category: 'Linked List', difficulty: 'Easy', url: 'https://leetcode.com/problems/linked-list-cycle/', companies: ['Microsoft', 'Amazon'] },

  // Trees & BST
  { id: 'invert-binary-tree', title: 'Invert Binary Tree', category: 'Trees & BST', difficulty: 'Easy', url: 'https://leetcode.com/problems/invert-binary-tree/', companies: ['Google', 'Apple'] },
  { id: 'max-depth-tree', title: 'Maximum Depth of Binary Tree', category: 'Trees & BST', difficulty: 'Easy', url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/', companies: ['Google', 'Microsoft'] },
  { id: 'lca-bst', title: 'Lowest Common Ancestor of a BST', category: 'Trees & BST', difficulty: 'Medium', url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/', companies: ['Meta', 'Amazon'] },
  { id: 'level-order-traversal', title: 'Binary Tree Level Order Traversal', category: 'Trees & BST', difficulty: 'Medium', url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/', companies: ['Microsoft', 'Meta', 'Amazon'] },

  // Dynamic Programming & Graphs
  { id: 'climbing-stairs', title: 'Climbing Stairs', category: 'Dynamic Programming & Graphs', difficulty: 'Easy', url: 'https://leetcode.com/problems/climbing-stairs/', companies: ['Google', 'Microsoft'] },
  { id: 'coin-change', title: 'Coin Change', category: 'Dynamic Programming & Graphs', difficulty: 'Medium', url: 'https://leetcode.com/problems/coin-change/', companies: ['Amazon', 'Microsoft'] },
  { id: 'house-robber', title: 'House Robber', category: 'Dynamic Programming & Graphs', difficulty: 'Medium', url: 'https://leetcode.com/problems/house-robber/', companies: ['Google', 'Microsoft', 'Amazon'] },
  { id: 'number-of-islands', title: 'Number of Islands', category: 'Dynamic Programming & Graphs', difficulty: 'Medium', url: 'https://leetcode.com/problems/number-of-islands/', companies: ['Amazon', 'Google', 'Meta'] },
  { id: 'course-schedule', title: 'Course Schedule', category: 'Dynamic Programming & Graphs', difficulty: 'Medium', url: 'https://leetcode.com/problems/course-schedule/', companies: ['Google', 'Amazon'] }
];

// 4:00 AM Daily Rollover Logic:
// A routine tracking day runs until 4:00 AM next morning.
// If local time is between 00:00 and 03:59:59, the day belongs to previous calendar date.
const getLogicalDate = (date = new Date()) => {
  const d = new Date(date);
  if (d.getHours() < 4) {
    d.setDate(d.getDate() - 1);
  }
  return d;
};

const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getLogicalDateKey = (date = new Date()) => dateKey(getLogicalDate(date));

function getSavedScheduleOverride(dateKeyStr) {
  if (!dateKeyStr) return null;
  try {
    const raw = localStorage.getItem(`daymark-schedule-override-${dateKeyStr}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return null;
}

const prettyDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

const blankDay = () => ({ checks: {}, notes: '', completedMinutes: {}, alarms: {} });

function readStore() {
  try {
    return JSON.parse(localStorage.getItem('daymark-data') || '{}');
  } catch {
    return {};
  }
}

// Pre-unlocked, resilient Web Audio API context for browser compatibility
let globalAudioCtx = null;
function getAudioContext() {
  if (!globalAudioCtx && typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

// Unlock audio on first touch/click anywhere on page
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

// Gentle Web Audio API chime for reminders, timers, and nudges
function playChime(isNudge = false) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (isNudge) {
      // Friendly double-ping for incoming nudge
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    }
  } catch {}
}

// Prominent, energetic multi-note alarm melody ringtone
function playAlarmMelody() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0.0, d: 0.18 },
      { f: 659.25, t: 0.18, d: 0.18 },
      { f: 783.99, t: 0.36, d: 0.18 },
      { f: 1046.50, t: 0.54, d: 0.45 },
      { f: 783.99, t: 1.05, d: 0.18 },
      { f: 1046.50, t: 1.25, d: 0.5 }
    ];

    notes.forEach(({ f, t, d }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + t);
      gain.gain.setValueAtTime(0.35, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + d + 0.05);
    });
  } catch {}
}

function readSavedAlarms(userId = null) {
  try {
    const key = userId ? `daymark-alarms-${userId}` : 'daymark-alarms-guest';
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 5);
    }
  } catch {}
  return [
    { id: 'alarm-1', time: '06:55', label: 'Morning routine start', enabled: true },
    { id: 'alarm-2', time: '11:00', label: 'Deep project focus session', enabled: false }
  ];
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function App() {
  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('daymark-token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('daymark-user') || 'null');
    } catch {
      return null;
    }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Groups / Study Pods State
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(() => localStorage.getItem('daymark-active-group') || '');
  const [podMembers, setPodMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState(null);
  const [createPodModalOpen, setCreatePodModalOpen] = useState(false);
  const [joinPodModalOpen, setJoinPodModalOpen] = useState(false);
  const [newPodName, setNewPodName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [podError, setPodError] = useState('');
  const [podDropdownOpen, setPodDropdownOpen] = useState(false);

  // Friction & Context-Switch Interceptor Agent State
  const [interceptorModalOpen, setInterceptorModalOpen] = useState(false);
  const [interceptTask, setInterceptTask] = useState(null);
  const [interceptorTab, setInterceptorTab] = useState('triage'); // 'triage' | 'unblock' | 'reset' | 'early_proof'
  const [unblockSteps, setUnblockSteps] = useState('');
  const [resetSecondsLeft, setResetSecondsLeft] = useState(120);
  const [resetActive, setResetActive] = useState(false);
  const [earlyProofText, setEarlyProofText] = useState('');

  // Pre-Flight Dispatcher Agent State
  const [preflightModalOpen, setPreflightModalOpen] = useState(false);
  const [preflightDismissed, setPreflightDismissed] = useState(false);

  // Chief of Staff Agent States
  const [chiefOfStaffAlert, setChiefOfStaffAlert] = useState(null);
  const [chiefOfStaffModalOpen, setChiefOfStaffModalOpen] = useState(false);
  const [chiefDismissUntil, setChiefDismissUntil] = useState(0);

  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('daymark-theme');
    if (saved === 'cyber-sakura') return 'tokyo-lofi';
    return saved || 'default';
  });
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  // Tokyo Lofi Live JST Clock & Ambient Web Audio Generator
  const [jstTime, setJstTime] = useState('');
  useEffect(() => {
    const updateJST = () => {
      const now = new Date();
      try {
        const options = { timeZone: 'Asia/Tokyo', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        setJstTime(new Intl.DateTimeFormat([], options).format(now));
      } catch (e) {
        setJstTime(now.toLocaleTimeString());
      }
    };
    updateJST();
    const timer = setInterval(updateJST, 1000);
    return () => clearInterval(timer);
  }, []);

  const [tokyoAudioPlaying, setTokyoAudioPlaying] = useState(false);
  const tokyoAudioRef = React.useRef(null);
  const toggleTokyoAudio = () => {
    if (!tokyoAudioPlaying) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.025;
          b6 = white * 0.115926;
        }

        const rainSource = ctx.createBufferSource();
        rainSource.buffer = noiseBuffer;
        rainSource.loop = true;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(850, ctx.currentTime);

        const humOsc = ctx.createOscillator();
        humOsc.type = 'sine';
        humOsc.frequency.setValueAtTime(60, ctx.currentTime);
        const humGain = ctx.createGain();
        humGain.gain.setValueAtTime(0.012, ctx.currentTime);
        humOsc.connect(humGain);

        const pinkNoiseGain = ctx.createGain();
        pinkNoiseGain.gain.setValueAtTime(0.07, ctx.currentTime);

        rainSource.connect(lowpass);
        lowpass.connect(pinkNoiseGain);
        pinkNoiseGain.connect(ctx.destination);
        humGain.connect(ctx.destination);

        rainSource.start(0);
        humOsc.start(0);

        tokyoAudioRef.current = { ctx, rainSource, humOsc };
        setTokyoAudioPlaying(true);
      } catch (err) {
        console.warn('Audio context prevented:', err);
      }
    } else {
      if (tokyoAudioRef.current) {
        try {
          tokyoAudioRef.current.rainSource.stop();
          tokyoAudioRef.current.rainSource.disconnect();
          tokyoAudioRef.current.humOsc.stop();
          tokyoAudioRef.current.humOsc.disconnect();
          tokyoAudioRef.current.ctx.close();
        } catch (e) {}
        tokyoAudioRef.current = null;
      }
      setTokyoAudioPlaying(false);
    }
  };
  // 7. Subject Curriculum & Stage Roadmap State
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);
  const [curriculumSubject, setCurriculumSubject] = useState('NLP');
  const [activeCurriculum, setActiveCurriculum] = useState(null);
  const [curriculumEditMode, setCurriculumEditMode] = useState(false);
  const [curriculumRawText, setCurriculumRawText] = useState('');
  const [curriculumStageOpen, setCurriculumStageOpen] = useState({});


  // 1:00 AM Recap State
  const [recapModalOpen, setRecapModalOpen] = useState(false);
  const [recapData, setRecapData] = useState(null);

  // Core App State
  const [store, setStore] = useState(readStore);
  const [activeId, setActiveId] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [alarms, setAlarms] = useState(() => readSavedAlarms(user ? user.id : null));
  const [activeAlarmModal, setActiveAlarmModal] = useState(null);
  const [lastTriggeredMinute, setLastTriggeredMinute] = useState('');
  const [toast, setToast] = useState('');
  const [view, setView] = useState('Today');
  const [selectedRoadmapSubject, setSelectedRoadmapSubject] = useState(''); // 'Today' | 'Weekly report' | 'Study pods' | 'Routine settings'
  const [notes, setNotes] = useState('');
  const [dbStatus, setDbStatus] = useState('checking'); // 'connected' | 'local' | 'checking'
  const [pushSubscribed, setPushSubscribed] = useState(() => {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  });

  // Developer & Coding Hub State
  const [codingProfile, setCodingProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('daymark-coding-profile')) || {
        leetcode_username: '',
        github_username: '',
        solved_dsa_ids: []
      };
    } catch {
      return { leetcode_username: '', github_username: '', solved_dsa_ids: [] };
    }
  });
  const [codingModalOpen, setCodingModalOpen] = useState(false);
  const [webhookExpanded, setWebhookExpanded] = useState(false);
  const [inputLcUser, setInputLcUser] = useState('');
  const [inputGhUser, setInputGhUser] = useState('');
  const [leetcodeData, setLeetcodeData] = useState(null);
  const [leetcodeLoading, setLeetcodeLoading] = useState(false);
  const [leetcodeError, setLeetcodeError] = useState('');
  const [githubData, setGithubData] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState('');
  const [codingSubTab, setCodingSubTab] = useState('overview'); // 'overview' | 'sheet' | 'snippets' | 'arena' | 'contests'
  const [contestsList, setContestsList] = useState([]);

  // Codeforces State
  const [inputCfUser, setInputCfUser] = useState('');
  const [codeforcesData, setCodeforcesData] = useState(null);
  const [codeforcesLoading, setCodeforcesLoading] = useState(false);
  const [codeforcesError, setCodeforcesError] = useState('');
  const [cfArenaList, setCfArenaList] = useState([]);
  const [cfArenaLoading, setCfArenaLoading] = useState(false);

  // Company DSA Filter & 45-Min Mock Interview Mode
  const [selectedCompany, setSelectedCompany] = useState('All'); // 'All' | 'Google' | 'Meta' | 'Amazon' | 'Microsoft' | 'Apple'
  const [mockTimerActive, setMockTimerActive] = useState(false);
  const [mockSecondsLeft, setMockSecondsLeft] = useState(2700); // 45 minutes
  const [mockProblemTitle, setMockProblemTitle] = useState('');

  // Pod Snippets & Peer Code Review State
  const [podSnippets, setPodSnippets] = useState([]);
  const [snippetsLoading, setSnippetsLoading] = useState(false);
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);
  const [newSnippetTitle, setNewSnippetTitle] = useState('');
  const [newSnippetCode, setNewSnippetCode] = useState('');
  const [newSnippetLang, setNewSnippetLang] = useState('javascript');
  const [newSnippetNotes, setNewSnippetNotes] = useState('');
  const [newSnippetProblemUrl, setNewSnippetProblemUrl] = useState('');

  // Smart GitHub Commit Project Verification Result
  const [commitVerificationResult, setCommitVerificationResult] = useState(null);
  const [verifyingCommit, setVerifyingCommit] = useState(false);

  // Incoming Nudge Alert Popup
  const [nudgePopup, setNudgePopup] = useState({ open: false, from_username: '', group_name: '', from_user_id: '' });

  // Problem of the day based on day of year
  const potd = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    return dsaCuratedList[dayOfYear % dsaCuratedList.length];
  }, []);

  // Dynamic base daily schedule (Master Blueprint) loaded from DB / LocalStorage
  const [baseSchedule, setBaseSchedule] = useState(readSavedSchedule);
  const [editingSchedule, setEditingSchedule] = useState(baseSchedule);

  // Logical date tracking (rolls over at 4:00 AM)
  const [currentLogicalDate, setCurrentLogicalDate] = useState(() => getLogicalDate(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => getLogicalDate(new Date()));

  const todayKey = dateKey(currentLogicalDate);
  const key = dateKey(selectedDate);
  const isToday = key === todayKey;
  const isPast = key < todayKey;
  const isFuture = key > todayKey;

  // Day record from store
  const day = store[key] || blankDay();

  // Day-Specific Healed Override Resolution:
  // AI Healed Plan or Elastic Shift applies ONLY to today/selected date.
  // Next day and standard days always use baseSchedule (normal daily timetable).
  const dayScheduleOverride = day?.scheduleOverride || getSavedScheduleOverride(key);
  const schedule = dayScheduleOverride || baseSchedule;
  const hasDayOverride = Boolean(dayScheduleOverride);

  const habits = useMemo(() => getRoutineGoals(schedule), [schedule]);

  // 1. Circadian Energy & Cognitive Matching
  const circadianScore = useMemo(() => calculateCircadianScore(schedule), [schedule]);

  // 2. Elastic Schedule Auto-Shift State
  const [elasticModalOpen, setElasticModalOpen] = useState(false);
  const [elasticShiftMins, setElasticShiftMins] = useState(30);
  const [elasticFromNow, setElasticFromNow] = useState(true);
  const [elasticCompressBreaks, setElasticCompressBreaks] = useState(false);

  // 3. Micro-Artifact & Proof of Work State
  const [artifactModalOpen, setArtifactModalOpen] = useState(false);
  const [closingTask, setClosingTask] = useState(null);
  const [artifactNotes, setArtifactNotes] = useState('');
  const [artifactUrl, setArtifactUrl] = useState('');
  const [verifiedArtifacts, setVerifiedArtifacts] = useState({});

  // 4. Native Web Audio Focus Soundscape State
  const [focusSoundType, setFocusSoundType] = useState('off');
  const [focusSoundVolume, setFocusSoundVolume] = useState(0.35);

  // 5. Athletic Deload & Burnout Early-Warning State
  const [isDeloadDay, setIsDeloadDay] = useState(() => localStorage.getItem(`daymark-deload-${todayKey}`) === 'true');
  const rollingVolumeHours = useMemo(() => {
    let totalMins = 0;
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = dateKey(d);
      const dStore = store[k];
      if (dStore && dStore.completedMinutes) {
        Object.values(dStore.completedMinutes).forEach(m => {
          totalMins += (Number(m) || 0);
        });
      }
    }
    return Math.round((totalMins / 60) * 10) / 10;
  }, [store]);

  // 6. Evening Closeout & Morning Non-Negotiable Priority State
  const [closeoutModalOpen, setCloseoutModalOpen] = useState(false);
  const [closeoutWins, setCloseoutWins] = useState('');
  const [closeoutFriction, setCloseoutFriction] = useState('');
  const [closeoutPriority, setCloseoutPriority] = useState('');
  const [morningPriority, setMorningPriority] = useState(() => localStorage.getItem('daymark-tomorrow-priority') || '');

  // day record loaded above
  const activeGroup = groups.find(g => g.id === activeGroupId) || null;

  // Daily new quote calculation based on calendar day
  const todayQuote = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    return dailyQuotes[dayOfYear % dailyQuotes.length];
  }, []);

  // Sync editingSchedule whenever schedule updates
  useEffect(() => {
    setEditingSchedule(schedule);
  }, [schedule]);



  useEffect(() => {
    setSoundVolume(focusSoundVolume);
  }, [schedule]);

  // Load user groups when token is present
  useEffect(() => {
    if (!token) {
      setGroups([]);
      return;
    }
    const fetchGroups = async () => {
      try {
        const res = await fetch(`${API}/groups`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setGroups(data);
          if (data.length > 0 && !activeGroupId) {
            setActiveGroupId(data[0].id);
            localStorage.setItem('daymark-active-group', data[0].id);
          }
        }
      } catch {}
    };
    fetchGroups();
  }, [token]);

  // Load pod leaderboard and members for active group (polled every 15s)
  useEffect(() => {
    if (!token || !activeGroupId) {
      setPodMembers([]);
      setLeaderboard(null);
      return;
    }
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API}/groups/${activeGroupId}/leaderboard?date=${todayKey}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data);
          setPodMembers(data.members || []);
        }
      } catch {}
    };
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, [token, activeGroupId, todayKey]);

  // Heartbeat loop: Sends live presence status when studying
  useEffect(() => {
    if (!token) return;
    const sendHeartbeat = async () => {
      const currentBlock = schedule.find(s => s.id === activeId);
      try {
        await fetch(`${API}/presence/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            is_studying: running,
            current_block_title: running ? currentBlock?.title || 'Focused session' : ''
          })
        });
      } catch {}
    };

    sendHeartbeat();
    if (!running) return;
    const interval = setInterval(sendHeartbeat, 20000); // 20s heartbeat
    return () => clearInterval(interval);
  }, [running, activeId, token, schedule]);

  // Unread nudges poller (checks every 15s) with OS Push Notification & High-Visibility Alert Modal
  useEffect(() => {
    if (!token) return;
    const checkNudges = async () => {
      try {
        const res = await fetch(`${API}/nudges/unread`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const nudges = await res.json();
          if (Array.isArray(nudges) && nudges.length > 0) {
            const first = nudges[0];
            playChime(true);
            setTimeout(() => playChime(true), 400);

            // 1. Native Browser OS Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`👋 ${first.from_username} nudged you!`, {
                  body: `Time to lock in and study in pod "${first.group_name}"!`,
                  icon: '/favicon.svg'
                });
              } catch {}
            }

            // 2. High-Visibility Pop-up Modal Alert
            setNudgePopup({
              open: true,
              from_username: first.from_username,
              group_name: first.group_name,
              from_user_id: first.from_user_id
            });

            // 3. Screen Toast
            setToast(`👋 ${first.from_username} nudged you in "${first.group_name}": Time to lock in!`);
            setTimeout(() => setToast(''), 5000);
          }
        }
      } catch {}
    };

    const interval = setInterval(checkNudges, 15000);
    return () => clearInterval(interval);
  }, [token]);

  // Load custom schedule from database on startup and when user account changes
  useEffect(() => {
    let mounted = true;
    const fetchScheduleFromDb = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(`${API}/settings/schedule`, { headers });
        if (response.ok) {
          const data = await response.json();
          if (mounted && Array.isArray(data) && data.length > 0) {
            setBaseSchedule(data);
            const storageKey = user ? `daymark-schedule-${user.id}` : 'daymark-schedule-guest';
            localStorage.setItem(storageKey, JSON.stringify(data));
          }
        }
      } catch {
        // Fall back to localStorage schedule
      }
    };
    fetchScheduleFromDb();
    return () => {
      mounted = false;
    };
  }, [token, user]);

  // Monitor database connection status
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API}/health`);
        if (!response.ok) throw new Error('Health check non-200');
        const data = await response.json();
        if (mounted) {
          setDbStatus(data.database === 'connected' ? 'connected' : 'local');
        }
      } catch {
        if (mounted) setDbStatus('local');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Web Push & Service Worker Registration
  const requestPushSubscription = async (userToken = null, silent = false) => {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return false;
    }
    try {
      let perm = Notification.permission;
      if (perm !== 'granted') {
        if (silent) return false;
        perm = await Notification.requestPermission();
      }
      if (perm !== 'granted') {
        setPushSubscribed(false);
        return false;
      }

      setPushSubscribed(true);
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch(`${API}/push/public-key`);
      if (!keyRes.ok) return false;
      const { publicKey } = await keyRes.json();
      if (!publicKey) return false;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const headers = { 'Content-Type': 'application/json' };
      if (userToken || token) headers['Authorization'] = `Bearer ${userToken || token}`;

      await fetch(`${API}/push/subscribe`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ subscription: sub, timezone })
      });

      return true;
    } catch (err) {
      console.warn('[Push] Setup failed:', err);
      return false;
    }
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('[SW] Registration failed:', err);
      });
    }
  }, []);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      requestPushSubscription(token, true);
    }
  }, [token]);

  const handleEnablePushAlerts = async () => {
    const success = await requestPushSubscription(token, false);
    if (success) {
      setToast('🔔 Phone Notification Bar Alerts Enabled!');
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          fetch(`${API}/push/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub })
          });
        }
      } catch {}
    } else {
      setToast('Notification permission was denied or not supported');
    }
    setTimeout(() => setToast(''), 3500);
  };

  // Developer & Coding Hub Handlers and Polling
  useEffect(() => {
    if (!token) return;
    const fetchCodingProfile = async () => {
      try {
        const res = await fetch(`${API}/coding/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && (data.leetcode_username || data.github_username || data.solved_dsa_ids?.length)) {
            setCodingProfile(prev => {
              const merged = {
                leetcode_username: data.leetcode_username || prev.leetcode_username,
                github_username: data.github_username || prev.github_username,
                solved_dsa_ids: Array.from(new Set([...(prev.solved_dsa_ids || []), ...(data.solved_dsa_ids || [])]))
              };
              localStorage.setItem('daymark-coding-profile', JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch {}
    };
    fetchCodingProfile();
  }, [token]);

  const refreshLeetcode = async (uname) => {
    const target = (uname !== undefined ? uname : codingProfile.leetcode_username || '').trim();
    if (!target) {
      setLeetcodeData(null);
      return;
    }
    setLeetcodeLoading(true);
    setLeetcodeError('');
    try {
      const res = await fetch(`${API}/coding/leetcode/${encodeURIComponent(target)}`);
      const data = await res.json();
      if (res.ok) {
        setLeetcodeData(data);
      } else {
        setLeetcodeError(data.error || 'Failed to fetch LeetCode data');
      }
    } catch {
      setLeetcodeError('Network error connecting to LeetCode service');
    } finally {
      setLeetcodeLoading(false);
    }
  };

  const refreshGithub = async (uname) => {
    const target = (uname !== undefined ? uname : codingProfile.github_username || '').trim();
    if (!target) {
      setGithubData(null);
      return;
    }
    setGithubLoading(true);
    setGithubError('');
    try {
      const res = await fetch(`${API}/coding/github/${encodeURIComponent(target)}`);
      const data = await res.json();
      if (res.ok) {
        setGithubData(data);
      } else {
        setGithubError(data.error || 'Failed to fetch GitHub data');
      }
    } catch {
      setGithubError('Network error connecting to GitHub service');
    } finally {
      setGithubLoading(false);
    }
  };

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const res = await fetch(`${API}/coding/contests`);
        if (res.ok) {
          const data = await res.json();
          setContestsList(data.contests || []);
        }
      } catch {}
    };
    fetchContests();
  }, []);

  useEffect(() => {
    if (codingProfile.leetcode_username) {
      refreshLeetcode(codingProfile.leetcode_username);
    }
    if (codingProfile.github_username) {
      refreshGithub(codingProfile.github_username);
    }
    if (codingProfile.codeforces_username) {
      refreshCodeforces(codingProfile.codeforces_username);
    }
  }, [codingProfile.leetcode_username, codingProfile.github_username, codingProfile.codeforces_username]);

  const refreshCodeforces = async (handle) => {
    const target = (handle !== undefined ? handle : codingProfile.codeforces_username || '').trim();
    if (!target) {
      setCodeforcesData(null);
      return;
    }
    setCodeforcesLoading(true);
    setCodeforcesError('');
    try {
      const res = await fetch(`${API}/coding/codeforces/${encodeURIComponent(target)}`);
      const data = await res.json();
      if (res.ok) {
        setCodeforcesData(data);
      } else {
        setCodeforcesError(data.error || 'Failed to fetch Codeforces data');
      }
    } catch {
      setCodeforcesError('Network error connecting to Codeforces');
    } finally {
      setCodeforcesLoading(false);
    }
  };

  const fetchCfArena = async () => {
    if (!activeGroupId || !token) return;
    setCfArenaLoading(true);
    try {
      const res = await fetch(`${API}/groups/${activeGroupId}/cf-arena`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCfArenaList(data);
      }
    } catch {}
    finally {
      setCfArenaLoading(false);
    }
  };

  // Fetch CF Arena and Pod Snippets whenever active group changes or Coding/Pods view opens
  useEffect(() => {
    if (activeGroupId && token) {
      fetchCfArena();
      fetchPodSnippets();
    }
  }, [activeGroupId, token, view]);

  // Project Focus metrics for 75% commit auto-check (aggregating all project blocks)
  const projectBlocks = schedule.filter(
    s => (s.id && s.id.toLowerCase().includes('project')) || (s.title && s.title.toLowerCase().includes('project'))
  );
  const projectPlannedMins = projectBlocks.reduce(
    (acc, s) => acc + Math.round((Number(s.hours) || computeDurationHours(s.start, s.end)) * 60),
    0
  ) || 120;
  const projectLoggedMins = projectBlocks.reduce(
    (acc, s) => acc + Number(day.completedMinutes?.[s.id] || 0),
    0
  ) + Number(day.completedMinutes?.['project'] || 0);
  const projectThresholdMins = Math.ceil(projectPlannedMins * 0.75);
  const projectPercent = Math.min(100, Math.round((projectLoggedMins / projectPlannedMins) * 100));
  const isProjectEligible = projectLoggedMins >= projectThresholdMins;

  // Smart GitHub Commit Verifier (Only for Project habit)
  const verifyGithubCommitForProject = async () => {
    setVerifyingCommit(true);
    setToast('Checking GitHub commit & verifying project timer…');
    try {
      const res = await fetch(`${API}/coding/github/verify-commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          dateKey: key,
          schedule,
          loggedMinutes: projectLoggedMins
        })
      });
      const data = await res.json();
      setCommitVerificationResult(data);
      if (data.habitMarked) {
        patchDay({ checks: { ...(day.checks || {}), project: true } });
        playChime(true);
        setToast(data.message || '🎉 Commit Verified! Project habit automatically marked Done!');
      } else {
        setToast(data.message || '⚠️ Commit detected, but not enough focused project time logged yet today.');
      }
      setTimeout(() => setToast(''), 4500);
    } catch {
      setToast('Failed to connect to commit verification service');
    } finally {
      setVerifyingCommit(false);
    }
  };

  // 45-Min Mock Technical Interview Countdown Loop
  useEffect(() => {
    if (!mockTimerActive) return;
    const interval = setInterval(() => {
      setMockSecondsLeft(prev => {
        if (prev <= 1) {
          playChime(true);
          setMockTimerActive(false);
          setToast('⏰ Mock interview 45-minute time is up! Great practice session.');
          return 0;
        }
        if (prev === 300) {
          playChime();
          setToast('⏱️ 5 minutes remaining in your technical mock interview!');
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mockTimerActive]);

  const startMockInterview = (problemTitle) => {
    setMockProblemTitle(problemTitle);
    setMockSecondsLeft(2700);
    setMockTimerActive(true);
    playChime();
    setToast(`⏱️ 45-minute mock interview started for "${problemTitle}"!`);
    setTimeout(() => setToast(''), 3000);
  };

  // Pod Snippets Handlers
  const fetchPodSnippets = async () => {
    if (!activeGroupId || !token) return;
    setSnippetsLoading(true);
    try {
      const res = await fetch(`${API}/groups/${activeGroupId}/snippets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPodSnippets(data);
      }
    } catch {}
    finally {
      setSnippetsLoading(false);
    }
  };

  const handlePostSnippet = async (e) => {
    e.preventDefault();
    if (!newSnippetTitle.trim() || !newSnippetCode.trim() || !activeGroupId || !token) return;
    try {
      const res = await fetch(`${API}/groups/${activeGroupId}/snippets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newSnippetTitle.trim(),
          language: newSnippetLang,
          code: newSnippetCode,
          notes: newSnippetNotes.trim(),
          problem_url: newSnippetProblemUrl.trim()
        })
      });
      if (res.ok) {
        const created = await res.json();
        setPodSnippets(prev => [created, ...prev]);
        setSnippetModalOpen(false);
        setNewSnippetTitle('');
        setNewSnippetCode('');
        setNewSnippetNotes('');
        setNewSnippetProblemUrl('');
        playChime(true);
        setToast('Code snippet shared with your study pod!');
        setTimeout(() => setToast(''), 2500);
      }
    } catch {}
  };

  const handleLikeSnippet = async (snippetId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/snippets/${snippetId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPodSnippets(prev => prev.map(s => s.id === snippetId ? { ...s, likes: data.likes } : s));
      }
    } catch {}
  };

  const handleSaveCodingHandles = async (e) => {
    e?.preventDefault?.();
    const updated = {
      ...codingProfile,
      leetcode_username: inputLcUser.trim(),
      github_username: inputGhUser.trim(),
      codeforces_username: inputCfUser.trim()
    };
    setCodingProfile(updated);
    localStorage.setItem('daymark-coding-profile', JSON.stringify(updated));
    setCodingModalOpen(false);

    if (token) {
      try {
        await fetch(`${API}/coding/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updated)
        });
      } catch {}
    }

    refreshLeetcode(updated.leetcode_username);
    refreshGithub(updated.github_username);
    refreshCodeforces(updated.codeforces_username);
    setToast('Coding handles saved & synced!');
    setTimeout(() => setToast(''), 2500);
  };

  const toggleDsaSolved = async (problemId, isPotd = false) => {
    const isCurrentlySolved = (codingProfile.solved_dsa_ids || []).includes(problemId);
    const updatedIds = isCurrentlySolved
      ? codingProfile.solved_dsa_ids.filter(id => id !== problemId)
      : [...(codingProfile.solved_dsa_ids || []), problemId];

    const updated = { ...codingProfile, solved_dsa_ids: updatedIds };
    setCodingProfile(updated);
    localStorage.setItem('daymark-coding-profile', JSON.stringify(updated));

    if (token) {
      try {
        await fetch(`${API}/coding/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(updated)
        });
      } catch {}
    }

    if (!isCurrentlySolved) {
      playChime(true);
      if (isPotd) {
        setToast('🔥 Problem of the Day Solved! +50 Grind Points added to your pod score!');
      } else {
        setToast('✨ Problem marked as solved!');
      }
    } else {
      setToast('Problem unmarked.');
    }
    setTimeout(() => setToast(''), 3000);
  };

  // Guard: ONLY today's date can be updated. Past and future records are protected and read-only.
  const patchDay = (patch) => {
    if (!isToday) {
      setToast(
        isPast
          ? 'Past records are archived and read-only to preserve your history.'
          : 'Future dates cannot be modified ahead of time.'
      );
      setTimeout(() => setToast(''), 3000);
      return;
    }

    const nextDay = { ...blankDay(), ...(store[key] || {}), ...patch };
    setStore(prev => {
      const updated = { ...prev, [key]: nextDay };
      localStorage.setItem('daymark-data', JSON.stringify(updated));
      return updated;
    });

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    fetch(`${API}/days/${key}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        checks: nextDay.checks || {},
        notes: nextDay.notes || '',
        completed_minutes: nextDay.completedMinutes || {},
        alarms: nextDay.alarms || {}
      })
    })
      .then(res => {
        if (res.ok) setDbStatus('connected');
      })
      .catch(() => {
        // Safe offline / browser-storage fallback
      });
  };

  useEffect(() => {
    localStorage.setItem('daymark-data', JSON.stringify(store));
  }, [store]);

  useEffect(() => {
    setNotes(day.notes || '');
  }, [key]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    let cancelled = false;
    const loadDay = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(`${API}/days/${key}`, { headers });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setDbStatus('connected');
        setStore(prev => {
          const merged = {
            ...blankDay(),
            ...(prev[key] || {}),
            checks: data.checks || prev[key]?.checks || {},
            notes: data.notes ?? prev[key]?.notes ?? '',
            completedMinutes: data.completed_minutes || prev[key]?.completedMinutes || {},
            alarms: data.alarms || prev[key]?.alarms || {}
          };
          const updated = { ...prev, [key]: merged };
          localStorage.setItem('daymark-data', JSON.stringify(updated));
          return updated;
        });
      } catch {
        // Seamless fallback to browser local storage
      }
    };
    loadDay();
    return () => {
      cancelled = true;
    };
  }, [key, token]);

  // Sync alarms when switching user or when day.alarms is loaded from DB
  useEffect(() => {
    if (day.alarms && Array.isArray(day.alarms) && day.alarms.length > 0) {
      setAlarms(day.alarms.slice(0, 5));
    } else {
      const saved = readSavedAlarms(user ? user.id : null);
      setAlarms(saved);
    }
  }, [user?.id, day.alarms]);

  // Reliable Alarm Interval Loop (checked every second, immune to background throttling)
  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      const now = new Date();
      const currentMinute = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayDateStr = dateKey(now);
      const minuteKey = `${todayDateStr} ${currentMinute}`;

      if (minuteKey === lastTriggeredMinute) return;

      const triggered = alarms.find(a => a.enabled && a.time === currentMinute);
      if (triggered) {
        setLastTriggeredMinute(minuteKey);
        setActiveAlarmModal(triggered);
        playAlarmMelody();

        // Browser notification if granted
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`⏰ Daymark Alarm (${triggered.time})`, {
              body: triggered.label || 'Time for your routine activity!',
              icon: '/favicon.svg'
            });
          } catch {}
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [alarms, isToday, lastTriggeredMinute]);

  // Repeating melody ringtone while alarm is actively ringing (repeats every 2.4s)
  useEffect(() => {
    if (!activeAlarmModal) return;
    const ringInterval = setInterval(() => {
      playAlarmMelody();
    }, 2400);
    return () => clearInterval(ringInterval);
  }, [activeAlarmModal]);

  const doneCount = habits.filter(h => day.checks[h.id]).length;
  const completion = Math.round((doneCount / habits.length) * 100);
  const completedMinutes = Object.values(day.completedMinutes || {}).reduce((a, b) => a + b, 0);
  const focusMinutes = Math.min(720, completedMinutes);

  const totalPlannedFocusHours = useMemo(() => {
    return schedule
      .filter(s => s.kind === 'focus')
      .reduce((acc, s) => acc + (s.hours || computeDurationHours(s.start, s.end)), 0);
  }, [schedule]);

  const current = schedule.find(item => {
    if (!isToday) return false;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = item.start.split(':').map(Number);
    const [eh, em] = item.end.split(':').map(Number);
    return mins >= sh * 60 + sm && mins < eh * 60 + em;
  });

  const weekly = useMemo(() => {
    const days = [];
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dkey = dateKey(d);
      const data = store[dkey] || blankDay();
      const n = habits.filter(h => data.checks[h.id]).length;
      days.push({
        date: d,
        count: n,
        percent: Math.round((n / habits.length) * 100),
        key: dkey
      });
    }
    return days;
  }, [store, selectedDate]);

  const weekAvg = Math.round(weekly.reduce((sum, d) => sum + d.percent, 0) / 7);

  const toggleHabit = (id) => {
    if (!isToday) {
      setToast(
        isPast
          ? 'Past habits are locked in view-only mode to preserve history.'
          : 'Future habits cannot be checked ahead of time.'
      );
      setTimeout(() => setToast(''), 2500);
      return;
    }

    const isCurrentlyChecked = !!day.checks?.[id];

    // If currently checked, allow unchecking
    if (isCurrentlyChecked) {
      patchDay({ checks: { ...(day.checks || {}), [id]: false } });
      return;
    }

    // If attempting to check (mark done), enforce 75% focus time rule on goals with assigned time
    const goal = habits.find(h => h.id === id);
    if (goal && goal.assignedMinutes > 0 && goal.kind === 'focus') {
      const logged = getSubjectLoggedMinutes(goal, day.completedMinutes || {});
      const threshold = goal.thresholdMinutes || Math.ceil(goal.assignedMinutes * 0.75);

      if (logged < threshold) {
        const loggedHoursStr = `${Math.floor(logged / 60)}h ${logged % 60}m`;
        const assignedHoursStr = `${Math.round((goal.assignedMinutes / 60) * 10) / 10}h`;
        const thresholdHoursStr = `${Math.floor(threshold / 60)}h ${threshold % 60}m`;
        setToast(
          `⚠️ Cannot mark "${goal.subject}" done yet: Logged ${loggedHoursStr} / ${assignedHoursStr}. At least 75% (${thresholdHoursStr}) required!`
        );
        setTimeout(() => setToast(''), 4500);
        return;
      }
    }

    patchDay({ checks: { ...(day.checks || {}), [id]: true } });
    playChime(true);
    setToast(`🎉 Goal completed: ${goal?.subject || id}!`);
    setTimeout(() => setToast(''), 3000);
  };

  const startSession = (id) => {
    if (!isToday) {
      setToast('Focus timers are only permitted for today’s active schedule.');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    setActiveId(id);
    setSeconds(0);
    setRunning(true);
    setToast('Focus session started');
    setTimeout(() => setToast(''), 2200);
  };

  const finishSession = (force = false) => {
    if (!force && activeId && isToday) {
      const taskObj = schedule.find(s => s.id === activeId);
      if (taskObj) {
        const scheduledMins = Math.round((taskObj.hours || 1) * 60);
        const elapsedMins = Math.round(seconds / 60);
        if (scheduledMins >= 25 && elapsedMins < Math.round(scheduledMins * 0.5)) {
          setInterceptTask({
            ...taskObj,
            scheduledMins,
            elapsedMins,
            percent: Math.max(1, Math.round((elapsedMins / scheduledMins) * 100))
          });
          setInterceptorTab('triage');
          setUnblockSteps('');
          setEarlyProofText('');
          setInterceptorModalOpen(true);
          return;
        }
      }
    }

    if (activeId && isToday) {
      const mins = Math.max(1, Math.round(seconds / 60));
      const previous = day.completedMinutes?.[activeId] || 0;
      patchDay({ completedMinutes: { ...(day.completedMinutes || {}), [activeId]: previous + mins } });
      playChime();

      // Trigger Micro-Artifact Proof of Work prompt
      const taskObj = schedule.find(s => s.id === activeId);
      if (taskObj) {
        setClosingTask({ ...taskObj, loggedMins: mins });
        setArtifactNotes('');
        setArtifactUrl('');
        setArtifactModalOpen(true);
      }
    }
    setRunning(false);
    setActiveId(null);
    setSeconds(0);
    setToast('Session logged');
    setTimeout(() => setToast(''), 2200);
  };

  // Day-Specific Schedule Override Storage Handlers (Applies ONLY to that specific day)
  const saveDayScheduleOverride = (targetDateKey, newSchedule) => {
    localStorage.setItem(`daymark-schedule-override-${targetDateKey}`, JSON.stringify(newSchedule));

    setStore(prev => {
      const existingDay = prev[targetDateKey] || blankDay();
      const updatedDay = {
        ...existingDay,
        scheduleOverride: newSchedule
      };
      const nextStore = { ...prev, [targetDateKey]: updatedDay };
      localStorage.setItem('daymark-data', JSON.stringify(nextStore));
      return nextStore;
    });

    if (token) {
      fetch(`${API}/days/${targetDateKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scheduleOverride: newSchedule })
      }).catch(() => {});
    }
  };

  const revertDayScheduleOverride = (targetDateKey) => {
    localStorage.removeItem(`daymark-schedule-override-${targetDateKey}`);

    setStore(prev => {
      const existingDay = prev[targetDateKey] || blankDay();
      const { scheduleOverride, ...rest } = existingDay;
      const nextStore = { ...prev, [targetDateKey]: rest };
      localStorage.setItem('daymark-data', JSON.stringify(nextStore));
      return nextStore;
    });

    if (token) {
      fetch(`${API}/days/${targetDateKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scheduleOverride: null })
      }).catch(() => {});
    }

    setToast('✓ Reverted to standard daily timetable');
    setTimeout(() => setToast(''), 2500);
  };

  // 1. Elastic Schedule Auto-Shift Action (Day-Specific Override)
  const applyElasticShift = (fromNow = false) => {
    const updated = calculateAutoShift(schedule, {
      shiftMinutes: elasticShiftMins,
      fromNow,
      compressBreaks: elasticCompressBreaks
    });
    // Save only for current day key (does NOT overwrite base daily timetable)
    saveDayScheduleOverride(key, updated);
    setElasticModalOpen(false);
    setToast(fromNow 
      ? '✨ Schedule auto-shifted for today only! Normal timetable resumes at 4 AM.' 
      : `✨ Schedule shifted forward by ${elasticShiftMins}m for today! Normal timetable resumes at 4 AM.`);
    setTimeout(() => setToast(''), 3500);
  };

  // 2. Micro-Artifact Proof of Work Submit
  const handleArtifactSubmit = (e) => {
    if (e) e.preventDefault();
    if (!closingTask) {
      setArtifactModalOpen(false);
      return;
    }
    const cleanNotes = artifactNotes.trim() || 'Focus milestone verified';
    const cleanUrl = artifactUrl.trim() || null;
    const newArtifact = {
      notes: cleanNotes,
      url: cleanUrl,
      timestamp: new Date().toISOString(),
      durationMins: closingTask.loggedMins || 0
    };
    patchDay({
      artifacts: {
        ...(day.artifacts || {}),
        [closingTask.id]: newArtifact
      }
    });
    setArtifactModalOpen(false);
    setToast('Verified proof of work logged!');
    setTimeout(() => setToast(''), 2200);
  };

  // 3. Athletic Deload Day Handlers
  const activateDeloadDay = () => {
    localStorage.setItem(`daymark-deload-${todayKey}`, 'true');
    setIsDeloadDay(true);
    setToast('Athletic Deload Activated: Cognitive targets scaled by 50% to prevent burnout.');
    setTimeout(() => setToast(''), 3000);
  };

  const deactivateDeloadDay = () => {
    localStorage.removeItem(`daymark-deload-${todayKey}`);
    setIsDeloadDay(false);
    setToast('Deload day deactivated. Full volume resumed.');
    setTimeout(() => setToast(''), 2500);
  };

  // 4. Evening Closeout & Morning Non-Negotiable Submit
  const handleSaveCloseout = (e) => {
    if (e) e.preventDefault();
    const target = closeoutPriority.trim();
    if (target) {
      localStorage.setItem('daymark-tomorrow-priority', target);
      setMorningPriority(target);
    }
    patchDay({
      closeout: {
        wins: closeoutWins.trim(),
        friction: closeoutFriction.trim(),
        priority: target,
        timestamp: new Date().toISOString()
      }
    });
    setCloseoutModalOpen(false);
    setToast("Evening shutdown complete. Tomorrow's priority locked!");
    setTimeout(() => setToast(''), 2500);
  };

  
  
  // --- Curriculum & Stage Roadmap Handlers ---
  
  // Enhanced Direct Soundscape Handler (Instant Web Audio unlock on mobile & desktop)
  const handleSelectSound = (type) => {
    setFocusSoundType(type);
    if (type === 'off') {
      stopFocusSound();
      setToast('Soundscape off');
    } else {
      playFocusSound(type, focusSoundVolume);
      setToast(`🎧 ${type === 'binaural' ? '40Hz Gamma Beat' : type === 'brown' ? 'Deep Brown Noise' : 'Pink Noise'} active`);
    }
    setTimeout(() => setToast(''), 2200);
  };

  const openSubjectCurriculum = (title) => {
    const cleanTitle = (title || 'General').trim();
    setCurriculumSubject(cleanTitle);
    const curr = loadSubjectCurriculum(cleanTitle);
    setActiveCurriculum(curr);
    setCurriculumEditMode(!curr);
    setCurriculumRawText('');
    setCurriculumModalOpen(true);
  };

  const handleToggleCheckpoint = (stageId, checkpointId) => {
    if (!activeCurriculum) return;
    const updated = toggleCurriculumCheckpoint(activeCurriculum, stageId, checkpointId);
    setActiveCurriculum(updated);
    saveSubjectCurriculum(curriculumSubject, updated);
    playChime(true);
    setToast('✓ Stage checkpoint updated!');
    setTimeout(() => setToast(''), 2000);
  };

  const handleImportCurriculum = () => {
    if (!curriculumRawText.trim()) return;
    const parsed = parseCurriculumText(curriculumRawText);
    parsed.subject = curriculumSubject;
    setActiveCurriculum(parsed);
    saveSubjectCurriculum(curriculumSubject, parsed);
    setCurriculumEditMode(false);
    setToast(`🗺️ Roadmap loaded for ${curriculumSubject} (${parsed.stages.length} stages)!`);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCopyChatGPTTemplate = () => {
    const prompt = CHATGPT_ROADMAP_PROMPT_TEMPLATE.replace(/\[SUBJECT NAME[^\]]*\]/g, curriculumSubject || 'Subject');
    navigator.clipboard.writeText(prompt);
    setToast('📋 ChatGPT Roadmap prompt copied to clipboard!');
    setTimeout(() => setToast(''), 2500);
  };

  // --- AGENTIC EFFECTS & HANDLERS (Placed after all core state and functions) ---

    // 4:00 AM Daily Rollover Timer:
  // Automatically detects when the clock strikes 4:00 AM,
  // rolling over to the new day and restoring the normal daily timetable.
  useEffect(() => {
    const checkRollover = () => {
      const nextLogical = getLogicalDate(new Date());
      const nextKey = dateKey(nextLogical);
      if (nextKey !== dateKey(currentLogicalDate)) {
        console.log('[Day Rollover] 4:00 AM reached. Advancing day to', nextKey);
        setCurrentLogicalDate(nextLogical);
        setSelectedDate(prev => (dateKey(prev) === dateKey(currentLogicalDate) ? nextLogical : prev));
        setToast('🌅 4:00 AM: New day started! Daily timetable restored to normal.');
        setTimeout(() => setToast(''), 4500);
      }
    };

    const timer = setInterval(checkRollover, 15000);
    return () => clearInterval(timer);
  }, [currentLogicalDate]);

  // Theme attribute effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('daymark-theme', theme);
  }, [theme]);

  // 2-Minute Breathing Box Countdown Effect
  useEffect(() => {
    let timer = null;
    if (resetActive && resetSecondsLeft > 0) {
      timer = setInterval(() => {
        setResetSecondsLeft(s => s - 1);
      }, 1000);
    } else if (resetActive && resetSecondsLeft <= 0) {
      setResetActive(false);
      stopFocusSound();
      playChime();
      setInterceptorModalOpen(false);
      setRunning(true);
      setToast('🧘 Mind reset complete. Back in the zone!');
      setTimeout(() => setToast(''), 3000);
    }
    return () => clearInterval(timer);
  }, [resetActive, resetSecondsLeft]);

  const startBreathingReset = () => {
    setInterceptorTab('reset');
    setResetSecondsLeft(120);
    setResetActive(true);
    playFocusSound('binaural', 0.45);
  };

  const stopBreathingEarly = () => {
    setResetActive(false);
    stopFocusSound();
    setInterceptorModalOpen(false);
    setRunning(true);
    setToast('Resuming focus session!');
    setTimeout(() => setToast(''), 2000);
  };

  const handleUnblockSubmit = (e) => {
    if (e) e.preventDefault();
    if (unblockSteps.trim()) {
      const currentNote = day.note || '';
      const updatedNote = `${currentNote}\n\n[Unblock Micro-Steps for ${interceptTask?.title}]:\n${unblockSteps.trim()}`;
      patchDay({ note: updatedNote });
    }
    setInterceptorModalOpen(false);
    setRunning(true);
    setToast('🚀 Blocker broken down. 15-minute micro-sprint engaged!');
    setTimeout(() => setToast(''), 3000);
  };

  const handleEarlyProofSubmit = (e) => {
    if (e) e.preventDefault();
    setInterceptorModalOpen(false);
    finishSession(true);
    if (earlyProofText.trim()) {
      const storageKey = `daymark-artifacts-${key}`;
      const current = JSON.parse(localStorage.getItem(storageKey) || '[]');
      current.push({
        taskId: interceptTask?.id,
        taskTitle: interceptTask?.title,
        notes: `[Early Finish Proof]: ${earlyProofText.trim()}`,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(storageKey, JSON.stringify(current));
      setVerifiedArtifacts(prev => ({
        ...prev,
        [interceptTask?.id]: { notes: earlyProofText.trim() }
      }));
    }
  };

  // Pre-Flight Morning First-Open Gate
  useEffect(() => {
    if (!isToday) return;
    const todayStr = key;
    const launchedKey = `daymark-preflight-launched-${todayStr}`;
    const hasLaunched = localStorage.getItem(launchedKey);
    const hour = new Date().getHours();
    if (!hasLaunched && hour >= 5 && hour < 13 && !preflightDismissed) {
      setPreflightModalOpen(true);
    }
  }, [isToday, selectedDate, preflightDismissed]);

  const handleLaunchDay = (applyAlignment = true) => {
    const todayStr = key;
    localStorage.setItem(`daymark-preflight-launched-${todayStr}`, 'true');

    if (applyAlignment && schedule && schedule.length > 0) {
      const { alignedSchedule } = slotScheduleToCircadian(schedule, morningPriority);
      saveDayScheduleOverride(todayStr, alignedSchedule);
      setToast('🚀 Day Launched! Priority locked to Circadian Morning Peak for today.');
    } else {
      setToast('🚀 Day Launched! Timetable locked in.');
    }

    setPreflightModalOpen(false);
    setTimeout(() => setToast(''), 3000);
  };

  // Chief of Staff Proactive Slip Detector (Tick every 30 seconds)
  useEffect(() => {
    if (!isToday || !schedule || schedule.length === 0) return;

    const runDriftCheck = () => {
      if (Date.now() < chiefDismissUntil) return;
      const completedIds = habits.filter(h => day.checks?.[h.id]).map(h => h.id);
      const report = detectScheduleDrift(schedule, completedIds, activeId);
      if (report && report.hasDrift) {
        setChiefOfStaffAlert(report);
      } else {
        setChiefOfStaffAlert(null);
      }
    };

    runDriftCheck();
    const interval = setInterval(runDriftCheck, 30000);
    return () => clearInterval(interval);
  }, [isToday, schedule, habits, day, activeId, chiefDismissUntil]);

  // Chief of Staff Action Handlers
  const applyChiefOfStaffHeal = (planToApply = null) => {
    const plan = planToApply || chiefOfStaffAlert;
    if (!plan || !plan.proposedSchedule) return;

    const updated = plan.proposedSchedule;
    // Save as Day-Specific Override for today only (does NOT alter normal daily timetable!)
    saveDayScheduleOverride(key, updated);

    setChiefOfStaffAlert(null);
    setChiefOfStaffModalOpen(false);
    setToast(`✨ AI Healed Plan applied for today only! Saved ${plan.savingsMinutes || 0}m. Normal timetable resumes at 4 AM.`);
    setTimeout(() => setToast(''), 3500);
  };

  const runManualChiefAudit = () => {
    const completedIds = habits.filter(h => day.checks?.[h.id]).map(h => h.id);
    const plan = generateChiefOfStaffPlan(schedule, completedIds);
    setChiefOfStaffAlert({
      hasDrift: true,
      driftMinutes: 0,
      slippingItem: null,
      ...plan
    });
    setChiefOfStaffModalOpen(true);
  };


  const saveAlarms = (nextAlarms) => {
    const capped = nextAlarms.slice(0, 5);
    setAlarms(capped);
    const key = user ? `daymark-alarms-${user.id}` : 'daymark-alarms-guest';
    localStorage.setItem(key, JSON.stringify(capped));
    patchDay({ alarms: capped });
  };

  const addAlarm = () => {
    if (alarms.length >= 5) {
      setToast('Maximum 5 alarms limit reached');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    const newAlarm = {
      id: `alarm-${Date.now()}`,
      time: '08:00',
      label: 'Focus session',
      enabled: true
    };
    saveAlarms([...alarms, newAlarm]);
    setToast('New alarm added (up to 5 max)');
    setTimeout(() => setToast(''), 2500);
  };

  const updateAlarm = (id, field, value) => {
    const updated = alarms.map(a => a.id === id ? { ...a, [field]: value } : a);
    saveAlarms(updated);
  };

  const toggleAlarm = async (id) => {
    if (!isToday) {
      setToast('Alarms can only be adjusted on today’s schedule.');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    const target = alarms.find(a => a.id === id);
    const turningOn = !target?.enabled;
    const updated = alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    saveAlarms(updated);

    if (turningOn) {
      requestPushSubscription(token, false).then(subscribed => {
        if (subscribed) {
          setToast(`Alarm turned on (${target?.time || ''}) • Notification bar alert active`);
        } else {
          setToast(`Alarm turned on (${target?.time || ''})`);
        }
      });
    } else {
      setToast('Alarm turned off');
    }
    setTimeout(() => setToast(''), 2500);
  };

  const removeAlarm = (id) => {
    if (alarms.length <= 1) {
      setToast('Keep at least 1 alarm in your routine');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    const updated = alarms.filter(a => a.id !== id);
    saveAlarms(updated);
  };

  const testAlarmSound = () => {
    playAlarmMelody();
    setToast('🔔 Playing alarm test chime!');
    setTimeout(() => setToast(''), 3000);
  };

  const dismissAlarm = () => {
    setActiveAlarmModal(null);
  };

  const snoozeAlarm = () => {
    if (!activeAlarmModal) return;
    const [h, m] = activeAlarmModal.time.split(':').map(Number);
    const total = h * 60 + m + 5;
    const newH = Math.floor((total % (24 * 60)) / 60);
    const newM = total % 60;
    const snoozeTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    
    updateAlarm(activeAlarmModal.id, 'time', snoozeTime);
    setActiveAlarmModal(null);
    setToast(`Snoozed for 5 minutes (next alarm at ${snoozeTime})`);
    setTimeout(() => setToast(''), 3500);
  };

  const shiftDate = (amount) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + amount);
    setSelectedDate(d);
  };

  const saveNotes = () => {
    if (!isToday) {
      setToast('Notes on past and future dates are read-only.');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    patchDay({ notes });
    setToast('Notes saved');
    setTimeout(() => setToast(''), 2000);
  };

  const exportCsv = () => {
    const habitHeaders = habits.map(h => h.subject || h.label);
    const rows = [['Date', 'Focus Logged', ...habitHeaders, 'Notes']];
    const dateSet = new Set(Object.keys(store));
    if (key) dateSet.add(key);
    if (todayKey) dateSet.add(todayKey);
    const sortedDates = Array.from(dateSet).sort();

    sortedDates.forEach(k => {
      const d = store[k] || blankDay();
      const totalMins = Object.values(d.completedMinutes || {}).reduce((a, b) => a + Number(b || 0), 0);
      const focusStr = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
      rows.push([
        k,
        focusStr,
        ...habits.map(h => (d.checks?.[h.id] ? 'Done' : 'Not done')),
        (d.notes || '').replaceAll('"', '""')
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `daymark-routine-export-${todayKey}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setToast('Progress data exported to CSV');
    setTimeout(() => setToast(''), 2500);
  };

  // Schedule timing editing handlers
  const handleBlockChange = (index, field, value) => {
    setEditingSchedule(prev => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };
      if (field === 'start' || field === 'end') {
        item.hours = computeDurationHours(item.start, item.end);
      }
      copy[index] = item;
      return copy;
    });
  };

  const saveScheduleChanges = async () => {
    setBaseSchedule(editingSchedule);
    const storageKey = user ? `daymark-schedule-${user.id}` : 'daymark-schedule-guest';
    localStorage.setItem(storageKey, JSON.stringify(editingSchedule));
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      const res = await fetch(`${API}/settings/schedule`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editingSchedule)
      });
      if (res.ok) {
        setDbStatus('connected');
        setToast('Your routine timings have been saved!');
      } else {
        setToast('Routine changes saved!');
      }
    } catch {
      setToast('Routine saved successfully');
    }
    setTimeout(() => setToast(''), 3000);
  };

  const resetScheduleToDefaults = async () => {
    setEditingSchedule(defaultSchedule);
    setBaseSchedule(defaultSchedule);
    const storageKey = user ? `daymark-schedule-${user.id}` : 'daymark-schedule-guest';
    localStorage.setItem(storageKey, JSON.stringify(defaultSchedule));
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      await fetch(`${API}/settings/schedule`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(defaultSchedule)
      });
      setToast('Your routine reset to default 7 AM - 9 PM schedule');
    } catch {
      setToast('Routine reset locally');
    }
    setTimeout(() => setToast(''), 2500);
  };

  // Auth Submit Handler
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authTab === 'login' ? '/auth/login' : '/auth/register';
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername, password: authPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed');
        return;
      }
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('daymark-token', data.token);
      localStorage.setItem('daymark-user', JSON.stringify(data.user));
      setAuthModalOpen(false);
      setAuthUsername('');
      setAuthPassword('');
      setToast(`Welcome back, ${data.user.username}!`);
      setTimeout(() => setToast(''), 3000);
    } catch {
      setAuthError('Server unreachable. Please check connection.');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('daymark-token');
    localStorage.removeItem('daymark-user');
    setGroups([]);
    setActiveGroupId('');
    setPodMembers([]);
    setLeaderboard(null);
    setToast('Logged out');
    setTimeout(() => setToast(''), 2000);
  };

  // Group Create / Join Handlers
  const handleCreatePod = async (e) => {
    e.preventDefault();
    setPodError('');
    if (!newPodName.trim()) return;
    try {
      const res = await fetch(`${API}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newPodName.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setPodError(data.error || 'Failed to create pod');
        return;
      }
      setGroups(prev => [data, ...prev]);
      setActiveGroupId(data.id);
      localStorage.setItem('daymark-active-group', data.id);
      setCreatePodModalOpen(false);
      setNewPodName('');
      setToast(`Created pod "${data.name}"! Share code: ${data.invite_code}`);
      setTimeout(() => setToast(''), 4000);
    } catch {
      setPodError('Network error creating pod.');
    }
  };

  const handleJoinPod = async (e) => {
    e.preventDefault();
    setPodError('');
    if (!joinInviteCode.trim()) return;
    try {
      const res = await fetch(`${API}/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ invite_code: joinInviteCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setPodError(data.error || 'Failed to join pod');
        return;
      }
      setGroups(prev => [...prev.filter(g => g.id !== data.id), data]);
      setActiveGroupId(data.id);
      localStorage.setItem('daymark-active-group', data.id);
      setJoinPodModalOpen(false);
      setJoinInviteCode('');
      setToast(`Joined pod "${data.name}"!`);
      setTimeout(() => setToast(''), 3000);
    } catch {
      setPodError('Network error joining pod.');
    }
  };

  const handleNudge = async (toUserId, toUsername) => {
    if (!activeGroupId || !token) return;
    try {
      const res = await fetch(`${API}/groups/${activeGroupId}/nudge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ to_user_id: toUserId })
      });
      const data = await res.json();
      if (res.ok) {
        playChime(true);
        setToast(`👋 Nudged ${toUsername}!`);
      } else {
        setToast(data.error || 'Failed to nudge');
      }
      setTimeout(() => setToast(''), 3000);
    } catch {
      setToast('Network error sending nudge');
      setTimeout(() => setToast(''), 2500);
    }
  };

  // Open 1:00 AM Recap for yesterday
  const openRecapModal = async () => {
    if (!activeGroupId || !token) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = dateKey(yesterday);
    try {
      const res = await fetch(`${API}/groups/${activeGroupId}/leaderboard?date=${yKey}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecapData(data);
        setRecapModalOpen(true);
      }
    } catch {
      setToast('Failed to load yesterday recap');
      setTimeout(() => setToast(''), 2000);
    }
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    setToast(`Invite code ${code} copied to clipboard!`);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            {theme === 'tokyo-lofi' ? (
              <span className="tokyo-kanji-seal">京</span>
            ) : (
              <Leaf size={19} />
            )}
          </div>
          <span>
            {theme === 'tokyo-lofi' ? (
              <>TOKYO <span className="brand-dot" style={{ color: '#F59E0B' }}>LOFI</span></>
            ) : (
              <>daymark<span className="brand-dot">.</span></>
            )}
          </span>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {[
            ['Today', Sun, 'Today'],
            ['Stage Roadmaps', Milestone, 'Roadmaps'],
            ['Weekly report', TrendingUp, 'Reports'],
            ['Study pods', Users, 'Pods'],
            ['Coding', Code2, 'Coding'],
            ['Routine settings', Settings2, 'Settings']
          ].map(([label, Icon, shortLabel]) => (
            <button
              key={label}
              className={`nav-item ${view === label ? 'selected' : ''}`}
              onClick={() => setView(label)}
            >
              <Icon size={17} />
              <span className="nav-item-full">{label}</span>
              <span className="nav-item-short">{shortLabel}</span>
              {label === 'Today' && <span className="nav-indicator" />}
              {label === 'Stage Roadmaps' && (
                <span className="nav-indicator" style={{ background: '#818cf8' }} />
              )}
              {label === 'Study pods' && groups.length > 0 && (
                <span className="nav-indicator" style={{ background: '#3b82f6' }} />
              )}
              {label === 'Coding' && (
                <span className="nav-indicator" style={{ background: '#10b981' }} />
              )}
            </button>
          ))}
        </nav>


        {/* Daily Inspiring Quote (Changes Daily) */}
        <div className="sidebar-bottom">
          <div className="quote-mark">“</div>
          <p>{todayQuote.quote}</p>
          <span>{todayQuote.author.toUpperCase()}</span>
        </div>

        {/* User Account / Profile Area */}
        <div className="profile">
          <div
            className="avatar"
            style={{
              background: user ? user.avatar_color : '#dbe6db',
              color: user ? '#fff' : '#365a43'
            }}
          >
            {user ? user.username.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <strong>{user ? user.username : 'Guest Mode'}</strong>
            <small>{activeGroup ? activeGroup.name : 'Personal Routine'}</small>
          </div>
          {user ? (
            <button className="logout-btn" onClick={handleLogout} title="Log out">
              <LogOut size={16} />
            </button>
          ) : (
            <button className="auth-btn" onClick={() => setAuthModalOpen(true)}>
              <LogIn size={13} /> Sign In
            </button>
          )}
        </div>
      </aside>

            <main className="main-content" style={{ position: 'relative' }}>
        {theme === 'spider-verse' && (
          <div className="spidey-swing-anchor" title="THWIP! Miles Morales on duty!">
            <div className="spidey-web-line" />
            <svg className="spidey-figure-body" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="50" y1="0" x2="50" y2="20" stroke="#00f0ff" strokeWidth="3" strokeDasharray="4 2" />
              <path d="M50 20 L50 35 L42 42" stroke="#e11d48" strokeWidth="7" strokeLinecap="round" />
              <path d="M50 20 L58 35 L62 42" stroke="#e11d48" strokeWidth="7" strokeLinecap="round" />
              <path d="M38 40 Q50 35 62 40 L58 70 Q50 75 42 70 Z" fill="#1e1b4b" stroke="#0f172a" strokeWidth="2" />
              <path d="M43 40 Q50 36 57 40 L55 65 Q50 68 45 65 Z" fill="#e11d48" />
              <path d="M48 50 L52 50 L50 54 Z" fill="#000" />
              <path d="M48 50 L42 46 M52 50 L58 46 M48 53 L40 56 M52 53 L60 56 M49 54 L44 62 M51 54 L56 62" stroke="#000" strokeWidth="1.5" />
              <ellipse cx="50" cy="85" rx="16" ry="19" fill="#e11d48" stroke="#be123c" strokeWidth="2" />
              <line x1="50" y1="66" x2="50" y2="104" stroke="#881337" strokeWidth="1.2" />
              <line x1="34" y1="85" x2="66" y2="85" stroke="#881337" strokeWidth="1.2" />
              <ellipse cx="50" cy="85" rx="9" ry="11" stroke="#881337" strokeWidth="1" fill="none" />
              <path d="M40 82 Q46 80 48 87 Q45 92 39 88 Z" fill="#ffffff" stroke="#000" strokeWidth="2.5" />
              <path d="M60 82 Q54 80 52 87 Q55 92 61 88 Z" fill="#ffffff" stroke="#000" strokeWidth="2.5" />
              <path d="M40 68 L24 55 L16 68" stroke="#1e1b4b" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 68 L10 65" stroke="#e11d48" strokeWidth="8" strokeLinecap="round" />
              <path d="M60 68 L76 55 L84 68" stroke="#1e1b4b" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M84 68 L90 65" stroke="#e11d48" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {theme === 'tokyo-lofi' && (
          <>
            <div className="film-grain" aria-hidden="true" />
            <div className="single-scanline" aria-hidden="true" />
            <div className="tokyo-terminal-strip">
              <div className="tokyo-strip-left">
                <span className="tokyo-strip-dot" />
                <span>TOKYO TERMINAL // METROPOLITAN LINE</span>
                <span className="tokyo-strip-sep">/</span>
                <span className="tokyo-strip-date">{prettyDate(selectedDate).toUpperCase()}</span>
              </div>
              <div className="tokyo-strip-right">
                <svg className="tokyo-weather-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <span>TOKYO WEATHER: 18°C CLOUDY</span>
              </div>
            </div>
          </>
        )}
        <header className="topbar">
          <div>
            <span className="eyebrow">YOUR PERSONAL WORKSPACE</span>
            <h1>
              {view === 'Today'
                ? isToday
                  ? 'A calmer way to make progress'
                  : isPast
                  ? 'Archived Performance Record'
                  : 'Upcoming Routine Plan'
                : view === 'Stage Roadmaps'
                ? 'Stage Roadmaps & Checkpoint Hub'
                : view === 'Weekly report'
                ? 'Your progress, at a glance'
                : view === 'Study pods'
                ? 'Competitive Study Pod'
                : view === 'Coding'
                ? 'Developer & DSA Performance Hub'
                : 'Customize your routine schedule'}
            </h1>
          </div>
          <div className="top-actions">
            {/* Active Study Pod Selector Pill */}
            {user && (
              <div className="pod-selector-wrapper" style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="pod-pill"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPodDropdownOpen(v => !v);
                  }}
                  title="Switch or manage study pods"
                >
                  <Users size={14} className="pod-header-icon" />
                  <span>{activeGroup ? activeGroup.name : 'No Pod Selected'}</span>
                  {activeGroup && <span className="pod-pill-count">{activeGroup.member_count}/5</span>}
                  <ChevronDown size={13} />
                </button>

                {podDropdownOpen && (
                  <>
                    <div
                      className="pod-dropdown-backdrop"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPodDropdownOpen(false);
                      }}
                    />
                    <div className="pod-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      <div className="pod-dropdown-heading">
                        YOUR STUDY PODS (MAX 5)
                      </div>
                      {groups.length === 0 ? (
                        <div style={{ padding: '8px 14px', fontSize: '11px', color: '#7b877d' }}>
                          No pods joined yet
                        </div>
                      ) : (
                        groups.map(g => (
                          <button
                            key={g.id}
                            className={`pod-dropdown-item ${g.id === activeGroupId ? 'active' : ''}`}
                            onClick={() => {
                              setActiveGroupId(g.id);
                              localStorage.setItem('daymark-active-group', g.id);
                              setPodDropdownOpen(false);
                            }}
                          >
                            <span className="pod-dropdown-name">{g.name}</span>
                            <small className="pod-dropdown-count">{g.member_count}/5</small>
                          </button>
                        ))
                      )}
                      <div className="pod-dropdown-divider" />
                      <button
                        className="pod-dropdown-action"
                        onClick={() => {
                          setPodDropdownOpen(false);
                          setCreatePodModalOpen(true);
                        }}
                      >
                        <UserPlus size={13} /> Create New Pod
                      </button>
                      <button
                        className="pod-dropdown-action"
                        onClick={() => {
                          setPodDropdownOpen(false);
                          setJoinPodModalOpen(true);
                        }}
                      >
                        <Share2 size={13} /> Join Pod with Code
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div
              className="sync-chip"
              title={
                dbStatus === 'connected'
                  ? 'All changes synced'
                  : 'Operating in offline mode'
              }
            >
              <span
                className={`status-dot ${
                  dbStatus === 'connected' ? 'synced' : dbStatus === 'checking' ? 'checking' : 'local'
                }`}
              />
              <span>{dbStatus === 'connected' ? 'Synced' : dbStatus === 'checking' ? 'Syncing…' : 'Offline'}</span>
            </div>
            <button className="icon-button" title="Export progress as CSV" onClick={exportCsv}>
              <Download size={17} />
            </button>
            
            {/* Visual Theme Selector */}
            <div className="theme-switcher-wrapper" style={{ position: 'relative' }}>
              <button
                type="button"
                className="theme-switcher-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setThemeDropdownOpen(v => !v);
                }}
                title="Change theme aesthetic"
              >
                <Palette size={13} />
                <span>
                  {theme === 'neo-brutalist'
                    ? 'Neo-Brutalist'
                    : theme === 'zen-paper'
                    ? 'Zen Paper'
                    : theme === 'ghibli-meadow'
                    ? 'Ghibli Meadow'
                    : theme === 'acid-runway'
                    ? 'Acid Runway'
                    : theme === 'spider-verse'
                    ? 'Spider-Verse'
                                        : theme === 'tokyo-lofi'
                    ? 'Tokyo Lofi'
                    : theme === 'sunlit-studio'
                    ? 'Sunlit Studio'
                    : theme === 'warm-parchment'
                    ? 'Warm Parchment'
                    : 'Daymark Classic'}
                </span>
                <ChevronDown size={11} />
              </button>

              {themeDropdownOpen && (
                <>
                  <div
                    className="theme-dropdown-backdrop"
                    onClick={(e) => {
                      e.stopPropagation();
                      setThemeDropdownOpen(false);
                    }}
                  />
                  <div className="theme-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                    <div className="theme-dropdown-heading">AESTHETIC THEME</div>
                    <button
                      className={`theme-dropdown-item ${theme === 'default' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('default');
                        setThemeDropdownOpen(false);
                      }}
                    >
                      <span className="theme-preview-dot classic" />
                      <div className="theme-item-text">
                        <strong>Daymark Classic</strong>
                        <small>Forest green & warm cream (Original)</small>
                      </div>
                    </button>
                    <button
                      className={`theme-dropdown-item ${theme === 'neo-brutalist' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('neo-brutalist');
                        setThemeDropdownOpen(false);
                      }}
                    >
                      <span className="theme-preview-dot brut" />
                      <div className="theme-item-text">
                        <strong>Neo-Brutalist</strong>
                        <small>Architectural bone, crisp 2px ink & Klein blue</small>
                      </div>
                    </button>
                    <button
                      className={`theme-dropdown-item ${theme === 'zen-paper' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('zen-paper');
                        setThemeDropdownOpen(false);
                      }}
                    >
                      <span className="theme-preview-dot zen" />
                      <div className="theme-item-text">
                        <strong>Zen Paper</strong>
                        <small>Tokyo washi, editorial serif & vermillion seal</small>
                      </div>
                    </button>
                    <button
                      className={`theme-dropdown-item ${theme === 'ghibli-meadow' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('ghibli-meadow');
                        setThemeDropdownOpen(false);
                      }}
                    >
                      <span className="theme-preview-dot ghibli" />
                      <div className="theme-item-text">
                        <strong>Ghibli Meadow</strong>
                        <small>Watercolor sky, Totoro moss & storybook cursive</small>
                      </div>
                    </button>
                    <button
                      className={`theme-dropdown-item ${theme === 'acid-runway' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('acid-runway');
                        setThemeDropdownOpen(false);
                      }}
                    >
                      <span className="theme-preview-dot acid" />
                      <div className="theme-item-text">
                        <strong>Acid Runway</strong>
                        <small>High-fashion pitch black & volt acid lime</small>
                      </div>
                    </button>
                    <button
                      className={`theme-dropdown-item ${theme === 'spider-verse' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('spider-verse');
                        setThemeDropdownOpen(false);
                      }}
                    >
                      <span className="theme-preview-dot spidey" />
                      <div className="theme-item-text">
                        <strong>Spider-Verse</strong>
                        <small>Miles Morales comic pop-art & action figure</small>
                      </div>
                    </button>
                    <button
                      className={`theme-dropdown-item ${theme === 'tokyo-lofi' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('tokyo-lofi');
                        setThemeDropdownOpen(false);
                      }}
                    >
                      <span className="theme-preview-dot lofi" />
                      <div className="theme-item-text">
                        <strong>Tokyo Lofi</strong>
                        <small>Midnight slate, warm amber station board & jazz calm</small>
                      </div>
                    </button>
                    <button
                      className={`theme-dropdown-item ${theme === 'sunlit-studio' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('sunlit-studio');
                        setThemeDropdownOpen(false);
                      }}
                    >
                      <span className="theme-preview-dot sunlit" />
                      <div className="theme-item-text">
                        <strong>Sunlit Studio</strong>
                        <small>Airy creative studio, warm saffron & ultra-clean layout</small>
                      </div>
                    </button>
                    <button
                      className={`theme-dropdown-item ${theme === 'warm-parchment' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('warm-parchment');
                        setThemeDropdownOpen(false);
                      }}
                    >
                      <span className="theme-preview-dot parchment" />
                      <div className="theme-item-text">
                        <strong>Warm Parchment</strong>
                        <small>Luxury Moleskine, Georgia serif & amber ink aesthetic</small>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="date-chip">
              <span className={`status-dot ${isToday ? '' : 'inactive'}`} />
              {prettyDate(selectedDate)}
            </div>
          </div>
        </header>

        {view === 'Today' && (
          <>
            {/* Read-Only Status Banner when viewing past or future dates */}
            {!isToday && (
              <div className={`date-lock-banner ${isPast ? 'past' : 'future'}`}>
                <Lock size={15} />
                <span>
                  {isPast
                    ? `Viewing past record for ${prettyDate(selectedDate)}. This day is archived in read-only mode to keep your historical tracking honest.`
                    : `Viewing future schedule for ${prettyDate(selectedDate)}. Sessions and habit tracking unlock on this day.`}
                </span>
                <button className="jump-today-btn" onClick={() => setSelectedDate(getLogicalDate(new Date()))}>
                  Return to Today
                </button>
              </div>
            )}

            <section className="welcome-row">
              <div>
                <p className="muted">{prettyDate(selectedDate)}</p>
                <h2>
                  {isToday ? (
                    <>
                      One day at a time<span>.</span>
                    </>
                  ) : isPast ? (
                    <>
                      Historical record<span>.</span>
                    </>
                  ) : (
                    <>
                      Upcoming routine<span>.</span>
                    </>
                  )}
                </h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                  <button className="evening-closeout-pill" onClick={() => setCloseoutModalOpen(true)} title="Complete your 3-minute evening shutdown ritual">
                    <Moon size={13} />
                    <span>Evening Closeout</span>
                  </button>
                </div>
                <p className="subhead">
                  {isToday
                    ? 'Show up, focus on the next block, and let the progress add up.'
                    : isPast
                    ? 'Review what you accomplished on this date.'
                    : 'Plan ahead and stay prepared for this routine.'}
                </p>
              </div>
              <div className="streak-card">
                <div className="streak-icon">
                  <Target size={19} />
                </div>
                <div>
                  <small>{isToday ? 'DAILY COMPLETION' : isPast ? 'RECORDED SCORE' : 'PLANNED'}</small>
                  <strong>{completion}%</strong>
                </div>
                <div className="ring" style={{ '--progress': `${completion * 3.6}deg` }}>
                  <span>
                    {doneCount}
                    <small>/{habits.length}</small>
                  </span>
                </div>
              </div>
              {theme === 'tokyo-lofi' && (
                <div className="tokyo-clock-card">
                  <div className="tokyo-clock-time">{jstTime || '21:42:08'}</div>
                  <div className="tokyo-clock-label">
                    <span className="tokyo-clock-dot" />
                    <span>TOKYO · JST (UTC+9)</span>
                  </div>
                </div>
              )}

            </section>

            {/* Morning Non-Negotiable Priority Banner */}
            {isToday && morningPriority && (
              <div className="morning-priority-card">
                <div>
                  <div className="priority-tag">
                    <Target size={12} />
                    <span>Locked Morning Non-Negotiable</span>
                  </div>
                  <div className="priority-title">{morningPriority}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    className="priority-action-btn"
                    onClick={() => {
                      const firstFocus = schedule.find(s => s.kind !== 'break');
                      if (firstFocus) startSession(firstFocus.id);
                    }}
                  >
                    Execute Priority
                  </button>
                  <button 
                    className="icon-button small" 
                    onClick={() => {
                      localStorage.removeItem('daymark-tomorrow-priority');
                      setMorningPriority('');
                    }}
                    title="Dismiss priority"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Athletic Deload & Burnout Early-Warning */}
            {isToday && rollingVolumeHours >= 42 && !isDeloadDay && (
              <div className="burnout-warning-card">
                <div>
                  <div className="burnout-title">
                    <Zap size={14} />
                    <span>High Sustained Cognitive Volume ({rollingVolumeHours}h logged in 7 days)</span>
                  </div>
                  <div className="burnout-desc">
                    Your central nervous system has operated at high intensity for 5+ days. Consider activating an athletic Deload Day to consolidate learning without losing your streak.
                  </div>
                </div>
                <button className="deload-trigger-btn" onClick={activateDeloadDay}>
                  Activate Deload Day
                </button>
              </div>
            )}
            {isDeloadDay && (
              <div className="deload-active-banner">
                <span>
                  <strong>Athletic Deload Day Active:</strong> Target capacity scaled by 50% for recovery & synthesis. Completing this day fully protects and extends your streak!
                </span>
                <button 
                  onClick={deactivateDeloadDay}
                  style={{ background: 'transparent', border: 'none', color: '#1e40af', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: '11px' }}
                >
                  Resume Full Volume
                </button>
              </div>
            )}

            <section className="metrics-grid">
              <Metric
                label="Focus logged"
                value={`${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60}m`}
                detail={isToday ? 'Tracked session time' : isPast ? 'Completed session time' : 'Scheduled sessions'}
                icon={Clock3}
                tone="sage"
              />
              <Metric
                label="Planned focus"
                value={`${totalPlannedFocusHours} hours`}
                detail="Customizable in Routine Settings"
                icon={Target}
                tone="blue"
              />
              <Metric
                label={isToday ? 'Current block' : 'Routine structure'}
                value={current?.title || (isToday ? 'Between sessions' : `${schedule.length} routine blocks`)}
                detail={current ? `${current.start} – ${current.end}` : 'Follow your planned schedule'}
                icon={Sun}
                tone="sand"
              />
            </section>

            <div className="content-grid">
              <section className="panel schedule-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">
                      {theme === 'tokyo-lofi'
                        ? 'TIMETABLE // 今日の日程'
                        : isToday
                        ? 'YOUR PLAN'
                        : isPast
                        ? 'PAST LOG'
                        : 'UPCOMING'}
                    </span>
                    <h3>
                      {theme === 'tokyo-lofi'
                        ? 'Shinkansen Departure Board'
                        : isToday
                        ? "Today's schedule"
                        : `Schedule for ${prettyDate(selectedDate)}`}
                    </h3>
                  </div>
                  <div className="date-controls">
                    {isToday && (
                      <div className="chief-elastic-group">
                        <button 
                          className="chief-audit-btn" 
                          onClick={runManualChiefAudit}
                          title="Autonomous Chief of Staff Schedule Audit"
                        >
                          <ShieldCheck size={13} />
                          <span>Chief of Staff</span>
                        </button>
                        <button 
                          className="elastic-btn" 
                          onClick={() => setElasticModalOpen(true)}
                          title="Auto-shift schedule if running late"
                        >
                          <SlidersHorizontal size={13} />
                          <span>Elastic Shift</span>
                        </button>
                      </div>
                    )}
                    <div className="date-nav-group">
                      <button className="icon-button small" onClick={() => shiftDate(-1)} title="Previous day">
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        className={`today-button ${isToday ? 'current' : ''}`}
                        onClick={() => setSelectedDate(new Date())}
                        title="Jump to today"
                      >
                        Today
                      </button>
                      <button className="icon-button small" onClick={() => shiftDate(1)} title="Next day">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Circadian Energy Rhythm Strip */}
                <div className="circadian-strip">
                  <div className="circadian-info">
                    <span className="circadian-badge">
                      <Activity size={12} />
                      <span>{circadianScore}% Biological Alignment</span>
                    </span>
                    <span className="circadian-note">
                      {circadianScore >= 85
                        ? 'Optimal: Heavy cognitive work aligns with natural alertness peaks.'
                        : 'Advisory: High cognitive demand during afternoon circadian trough.'}
                    </span>
                  </div>
                  <div className="circadian-curve-bar" title="Circadian energy wave across the day">
                    {[0.4, 0.6, 0.85, 0.95, 0.9, 0.7, 0.5, 0.55, 0.8, 0.85, 0.7, 0.45].map((val, idx) => {
                      const currentHour = new Date().getHours();
                      const sliceHour = 6 + idx * 1.5;
                      const isCurrentSlice = currentHour >= sliceHour && currentHour < sliceHour + 1.5;
                      return (
                        <div
                          key={idx}
                          className={`circadian-bar-slice ${isCurrentSlice ? 'current' : ''}`}
                          style={{ height: `${Math.round(val * 24)}px` }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Active Day Healed Plan Banner */}
                {hasDayOverride && (
                  <div className="healed-plan-today-banner">
                    <div className="healed-banner-left">
                      <Sparkles size={14} className="healed-icon" />
                      <span>
                        <strong>✨ AI Healed Plan Active (Today Only)</strong>
                        <span className="healed-banner-sub"> · Resets to normal timetable at 4:00 AM</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="healed-banner-revert-btn"
                      onClick={() => revertDayScheduleOverride(key)}
                      title="Revert today's schedule back to the normal daily timetable"
                    >
                      <RotateCcw size={12} />
                      <span>Revert to Normal</span>
                    </button>
                  </div>
                )}

                <div className="schedule-list">
                  {schedule.map(item => {
                    const Icon = iconMap[item.icon] || Clock3;
                    const isActive = isToday && activeId === item.id;
                    const logged = day.completedMinutes?.[item.id] || 0;
                    return (
                      <article className={`schedule-item ${item.tone} ${isActive ? 'active-session' : ''}`} key={item.id}>
                        <div className="time-col">
                          <strong>{item.start}</strong>
                          <span>{item.end}</span>
                        </div>
                        <div className="event-icon">
                          <Icon size={19} />
                        </div>
                        <div className="event-body">
                          <div className="event-title-row">
                            <h4>{item.title}</h4>
                            <span className="duration-pill">{item.hours || computeDurationHours(item.start, item.end)}h</span>
                          </div>
                          <p>{item.subtitle}</p>
                          {/* Timetable Single-Row Current Checkpoint (Clean, Zero Clutter) */}
                          {item.kind === 'focus' && (
                            <TimetableCurrentCheckpoint
                              subject={item.title}
                              item={item}
                              onPlayChime={playChime}
                              setToast={setToast}
                              isReadOnly={!isToday}
                              onOpenRoadmap={(subj) => {
                                setSelectedRoadmapSubject(subj);
                                setView('Stage Roadmaps');
                              }}
                            />
                          )}
                          {logged > 0 && (
                            <span className="logged-label">
                              {Math.floor(logged / 60)}h {logged % 60}m logged
                            </span>
                          )}
                        </div>
                        <div className="event-action">
                          {isToday ? (
                            isActive ? (
                              <button className="action-button running" onClick={() => setRunning(v => !v)}>
                                {running ? <Pause size={15} /> : <Play size={15} />}
                                <span>{running ? 'Pause' : 'Resume'}</span>
                              </button>
                            ) : (
                              <button
                                className="action-button"
                                onClick={() => startSession(item.id)}
                                title="Start a timed session"
                              >
                                <Play size={15} />
                                <span>Start</span>
                              </button>
                            )
                          ) : (
                            <span className="read-only-badge" title={isPast ? 'Past record (read-only)' : 'Future date (locked)'}>
                              <Lock size={11} />
                              {logged > 0 ? `${Math.floor(logged / 60)}h ${logged % 60}m` : isPast ? 'Archived' : 'Locked'}
                            </span>
                          )}
                          {isActive && (
                            <button className="finish-button" onClick={finishSession}>
                              Finish
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="session-footer">
                  {/* Native Web Audio Soundscape Panel */}
                  {isToday && (
                    <div className="soundscape-strip">
                      <span className="soundscape-label">
                        <Headphones size={13} /> Soundscape:
                      </span>
                      <div className="sound-selector">
                        <button 
                          className={`sound-btn ${focusSoundType === 'off' ? 'active' : ''}`}
                          onClick={() => handleSelectSound('off')}
                        >
                          Off
                        </button>
                        <button 
                          className={`sound-btn ${focusSoundType === 'brown' ? 'active' : ''}`}
                          onClick={() => handleSelectSound('brown')}
                          title="Brownian Noise: Deep low-frequency rumble for logic & coding"
                        >
                          Brown
                        </button>
                        <button 
                          className={`sound-btn ${focusSoundType === 'binaural' ? 'active' : ''}`}
                          onClick={() => handleSelectSound('binaural')}
                          title="40Hz Gamma Beat: Binaural frequency synthesis for peak concentration"
                        >
                          40Hz Gamma
                        </button>
                        <button 
                          className={`sound-btn ${focusSoundType === 'pink' ? 'active' : ''}`}
                          onClick={() => handleSelectSound('pink')}
                          title="Pink Noise: Calming natural acoustic mask"
                        >
                          Pink
                        </button>
                      </div>
                      {focusSoundType !== 'off' && (
                        <div className="volume-wrap">
                          <Volume2 size={12} className="volume-icon" />
                          <input 
                            type="range" 
                            min="0.05" 
                            max="0.8" 
                            step="0.05" 
                            value={focusSoundVolume}
                            onChange={(e) => { const v = parseFloat(e.target.value); setFocusSoundVolume(v); setSoundVolume(v); }}
                            title={`Volume: ${Math.round(focusSoundVolume * 100)}%`}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="session-clock">
                    <Clock3 size={17} />
                    <span>
                      {isToday
                        ? activeId
                          ? `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(
                              Math.floor(seconds / 60) % 60
                            ).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
                          : 'Ready when you are'
                        : isPast
                        ? 'Day concluded (Read-Only)'
                        : 'Future day'}
                    </span>
                  </div>
                  <span className="muted small-text">
                    {isToday ? '50 min focus · 10 min reset' : 'Historical records cannot be modified'}
                  </span>
                </div>
                {theme === 'tokyo-lofi' && (
                  <div className="tokyo-board-footer">
                    <div className="tokyo-board-footer-left">
                      <span className="tokyo-strip-dot" />
                      <span style={{ color: '#D4CEEB', fontWeight: 600 }}>NEXT EVENT:</span>
                      <span style={{ color: '#FAF8FF' }}>Evening Focus Block begins shortly</span>
                    </div>
                    <div className="tokyo-board-footer-right">
                      TOTAL SCHEDULED: {totalPlannedFocusHours}h
                    </div>
                  </div>
                )}
              </section>

              <div className="right-column">
                {theme === 'tokyo-lofi' && (
                  <div className="tokyo-ambient-player">
                    <div className="tokyo-player-left">
                      <button
                        type="button"
                        className="tokyo-audio-toggle-btn"
                        onClick={toggleTokyoAudio}
                        title="Toggle Lo-Fi Tape Rain"
                      >
                        {tokyoAudioPlaying ? (
                          <svg style={{ width: '14px', height: '14px' }} fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg style={{ width: '14px', height: '14px', marginLeft: '2px' }} fill="currentColor" viewBox="0 0 24 24">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        )}
                      </button>
                      <div>
                        <div className="tokyo-player-title">Shibuya Rain & 2am Tape Hum</div>
                        <div className="tokyo-player-sub">SYNTHESIZED AMBIENT NOISE (432Hz)</div>
                      </div>
                    </div>
                    <div className={`tokyo-visualizer ${tokyoAudioPlaying ? 'playing' : ''}`}>
                      <div className="wave-bar" />
                      <div className="wave-bar" />
                      <div className="wave-bar" />
                      <div className="wave-bar" />
                    </div>
                  </div>
                )}
                <section className={`panel habits-panel ${!isToday ? 'read-only' : ''}`}>
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">{theme === 'tokyo-lofi' ? 'DAILY RITUALS // 日課' : (isToday ? 'DAILY CHECK-IN' : 'ARCHIVED HABITS')}</span>
                      <h3>{theme === 'tokyo-lofi' ? 'Washi Paper Notebook' : 'Keep yourself honest'}</h3>
                    </div>
                    <span className="count-badge">
                      {doneCount}/{habits.length}
                    </span>
                  </div>
                  <div className="habit-list">
                    {habits.map(h => {
                      const logged = getSubjectLoggedMinutes(h, day.completedMinutes || {});
                      const threshold = h.thresholdMinutes || Math.ceil(h.assignedMinutes * 0.75);
                      const isChecked = !!day.checks?.[h.id];
                      const isEligible = h.assignedMinutes === 0 || logged >= threshold;
                      const percent = h.assignedMinutes > 0 ? Math.min(100, Math.round((logged / h.assignedMinutes) * 100)) : 100;

                      return (
                        <button
                          key={h.id}
                          className={`habit-row ${isChecked ? 'checked' : ''} ${!isToday ? 'read-only' : ''} ${!isChecked && !isEligible ? 'locked-goal' : ''}`}
                          onClick={() => toggleHabit(h.id)}
                          title={
                            !isToday
                              ? 'Past and future habits are view-only'
                              : !isChecked && !isEligible
                              ? `Need at least 75% logged time to complete (${Math.floor(logged / 60)}h ${logged % 60}m / ${Math.round((h.assignedMinutes / 60) * 10) / 10}h)`
                              : undefined
                          }
                        >
                          <span className="check-box">
                            {isChecked ? <Check size={14} /> : (!isEligible && isToday ? <Lock size={11} style={{ opacity: 0.4 }} /> : null)}
                          </span>
                          <span style={{ flex: 1, textAlign: 'left' }}>{h.label}</span>
                          {h.assignedMinutes > 0 && isToday && (
                            <span
                              className={`habit-logged-pill ${isChecked ? 'checked' : isEligible ? 'eligible' : 'pending'}`}
                              style={{
                                fontSize: '10px',
                                padding: '2px 7px',
                                borderRadius: '10px',
                                fontWeight: '600',
                                marginLeft: '8px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {Math.floor(logged / 60)}h {logged % 60}m ({percent}%)
                            </span>
                          )}
                          {!isToday && <Lock size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="habit-progress">
                    <div className="progress-caption">
                      <span>{isToday ? "Today's consistency" : 'Consistency rate'}</span>
                      <strong>{completion}%</strong>
                    </div>
                    <div className="progress-track">
                      <div style={{ width: `${completion}%` }} />
                    </div>
                  </div>
                  {theme === 'tokyo-lofi' && (
                    <div className="tokyo-habits-footer">
                      <span>Click any habit to check or uncheck</span>
                      <span className="tokyo-autosave-badge">AUTO-SAVED</span>
                    </div>
                  )}
                </section>

                <section className={`panel alarm-panel ${!isToday ? 'read-only' : ''}`}>
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">GENTLE REMINDERS</span>
                      <h3>Routine Alarms</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="test-sound-btn"
                        onClick={testAlarmSound}
                        title="Test alarm ringtone sound"
                      >
                        <Volume2 size={13} /> Test Sound
                      </button>
                      <button
                        type="button"
                        className="test-sound-btn"
                        style={pushSubscribed ? { background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' } : {}}
                        onClick={handleEnablePushAlerts}
                        title={pushSubscribed ? 'Notification bar alerts are active' : 'Enable alerts in your phone notification bar'}
                      >
                        <Bell size={13} /> {pushSubscribed ? 'Alerts Active' : 'Enable Phone Alerts'}
                      </button>
                      <div className="alarm-icon">
                        <AlarmClock size={17} />
                      </div>
                    </div>
                  </div>

                  <p className="muted alarm-copy">
                    {isToday
                      ? `Set up to 5 alarms remembered for your daily routine with melody audio & browser alerts.`
                      : 'Alarms are active only during today’s session.'}
                  </p>

                  <div className="alarms-list">
                    {alarms.map(alarm => (
                      <div className={`alarm-row ${alarm.enabled ? 'active' : ''}`} key={alarm.id}>
                        <div className="alarm-time-group">
                          <input
                            type="time"
                            value={alarm.time}
                            disabled={!isToday}
                            onChange={e => updateAlarm(alarm.id, 'time', e.target.value)}
                            aria-label="Alarm time"
                          />
                        </div>
                        <input
                          type="text"
                          className="alarm-label-input"
                          value={alarm.label}
                          placeholder="Alarm label or subject"
                          disabled={!isToday}
                          onChange={e => updateAlarm(alarm.id, 'label', e.target.value)}
                        />
                        <button
                          type="button"
                          className={`toggle ${alarm.enabled && isToday ? 'on' : ''}`}
                          onClick={() => toggleAlarm(alarm.id)}
                          disabled={!isToday}
                          aria-label={`Toggle alarm at ${alarm.time}`}
                          title={alarm.enabled ? 'Disable alarm' : 'Enable alarm'}
                        >
                          <span />
                        </button>
                        {alarms.length > 1 && isToday && (
                          <button
                            type="button"
                            className="alarm-delete-btn"
                            onClick={() => removeAlarm(alarm.id)}
                            title="Delete this alarm"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="alarm-panel-footer">
                    {alarms.length < 5 ? (
                      <button
                        type="button"
                        className="add-alarm-btn"
                        onClick={addAlarm}
                        disabled={!isToday}
                      >
                        <Plus size={13} /> Add Alarm ({alarms.length}/5 max)
                      </button>
                    ) : (
                      <span className="alarm-max-pill">5 of 5 alarms set (maximum limit)</span>
                    )}
                    <span className="alarm-active-indicator">
                      <span className={`status-dot ${alarms.some(a => a.enabled) && isToday ? '' : 'inactive'}`} />
                      {alarms.filter(a => a.enabled).length} of {alarms.length} active
                    </span>
                  </div>
                </section>

                <section className={`note-panel ${!isToday ? 'read-only' : ''}`}>
                  <div className="note-title">
                    <BookOpen size={17} />
                    <strong>{isToday ? 'End-of-day notes' : `Notes (${prettyDate(selectedDate)})`}</strong>
                    {!isToday && <Lock size={13} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
                  </div>
                  <textarea
                    value={notes}
                    readOnly={!isToday}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={
                      isToday
                        ? 'What did you learn? What did you ship? What needs attention tomorrow?'
                        : 'No notes logged for this archived date.'
                    }
                  />
                  {isToday ? (
                    <button onClick={saveNotes}>
                      Save notes <ArrowUpRight size={15} />
                    </button>
                  ) : (
                    <button className="locked" disabled>
                      Archived (Read-Only) <Lock size={13} />
                    </button>
                  )}
                </section>
              </div>
            </div>
          </>
        )}

        {view === 'Stage Roadmaps' && (
          <StageRoadmapsView
            routine={schedule}
            selectedSubject={selectedRoadmapSubject}
            onSelectSubject={setSelectedRoadmapSubject}
            onPlayChime={playChime}
            setToast={setToast}
            onJumpToToday={() => setView('Today')}
            theme={theme}
          />
        )}

        {view === 'Weekly report' && (
          <section className="report-layout">
            <div className="panel report-main">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">WEEKLY REPORT</span>
                  <h3>Your consistency, not perfection</h3>
                </div>
                <span className="count-badge">{weekAvg}% average</span>
              </div>
              <div className="week-chart">
                {weekly.map((d, i) => (
                  <button
                    key={d.key}
                    className={`week-day ${dateKey(selectedDate) === d.key ? 'chosen' : ''}`}
                    onClick={() => setSelectedDate(d.date)}
                  >
                    <div className="bar-wrap">
                      <div className="bar" style={{ height: `${Math.max(4, d.percent)}%` }} />
                      <span className="bar-value">{d.percent}%</span>
                    </div>
                    <strong>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</strong>
                    <small>{d.date.getDate()}</small>
                  </button>
                ))}
              </div>
              <div className="report-summary">
                <div>
                  <small>Weekly average</small>
                  <strong>{weekAvg}%</strong>
                </div>
                <div>
                  <small>Habits completed</small>
                  <strong>
                    {weekly.reduce((s, d) => s + d.count, 0)} <em>/ 42</em>
                  </strong>
                </div>
                <div>
                  <small>Days with progress</small>
                  <strong>
                    {weekly.filter(d => d.count > 0).length}
                    <em> / 7</em>
                  </strong>
                </div>
              </div>
            </div>

            <div className="panel report-main">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">HABIT BREAKDOWN</span>
                  <h3>Where your effort went</h3>
                </div>
              </div>
              {habits.map(h => {
                const n = weekly.filter(d => store[d.key]?.checks?.[h.id]).length;
                return (
                  <div className="breakdown-row" key={h.id}>
                    <span>{h.label}</span>
                    <div className="progress-track">
                      <div style={{ width: `${(n / 7) * 100}%` }} />
                    </div>
                    <strong>{n}/7</strong>
                  </div>
                );
              })}
              <div className="report-tip">
                <TrendingUp size={18} />
                <p>Review the weakest habit and make it easier to start next week. Consistency improves when friction goes down.</p>
              </div>
            </div>
            <button className="export-button" onClick={exportCsv}>
              <Download size={16} /> Export all tracked data (.csv)
            </button>
          </section>
        )}

        {/* Study Pods Competitive Arena View */}
        {view === 'Study pods' && (
          <section style={{ maxWidth: '1000px', margin: '0 auto', paddingTop: '10px' }}>
            {!user ? (
              <div className="panel" style={{ padding: '36px', textAlign: 'center' }}>
                <Users size={40} className="pod-promo-icon" style={{ marginBottom: '12px' }} />
                <h3 style={{ font: '700 20px Manrope', margin: '0 0 8px' }}>Join or Create a Study Pod</h3>
                <p className="muted" style={{ maxWidth: '480px', margin: '0 auto 20px', fontSize: '13px', lineHeight: '1.6' }}>
                  Study pods are tight-knit accountability rooms (max 5 members). Sign in or create an account to compete on daily focus hours, habits, and streak rankings.
                </p>
                <button className="auth-btn" style={{ padding: '10px 20px', fontSize: '13px' }} onClick={() => setAuthModalOpen(true)}>
                  <LogIn size={15} /> Sign In or Create Account
                </button>
              </div>
            ) : (
              <div>
                {/* Horizontal Pod Switcher Bar */}
                {groups.length > 0 && (
                  <div className="pod-switcher-bar">
                    <span className="pod-switcher-label">My Pods:</span>
                    <div className="pod-switcher-scroll">
                      {groups.map(g => (
                        <button
                          key={g.id}
                          className={`pod-switcher-pill ${g.id === activeGroupId ? 'active' : ''}`}
                          onClick={() => {
                            setActiveGroupId(g.id);
                            localStorage.setItem('daymark-active-group', g.id);
                          }}
                        >
                          <Users size={12} />
                          <span>{g.name}</span>
                          <span className="pod-switcher-count">{g.member_count}/5</span>
                        </button>
                      ))}
                      <button
                        className="pod-switcher-add-btn"
                        onClick={() => setCreatePodModalOpen(true)}
                        title="Create another pod (max 5)"
                      >
                        <UserPlus size={12} /> New Pod
                      </button>
                      <button
                        className="pod-switcher-add-btn"
                        onClick={() => setJoinPodModalOpen(true)}
                        title="Join another pod with invite code"
                      >
                        <Share2 size={12} /> Join Pod
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Pod Banner & Controls */}
                <div className="pod-header-row">
                  <div className="pod-header-title-box">
                    <span className="eyebrow">ACCOUNTABILITY POD</span>
                    <h3 className="pod-header-title">
                      <span>{activeGroup ? activeGroup.name : 'Select or Create a Pod'}</span>
                      {activeGroup && (
                        <span
                          className="invite-code-chip"
                          onClick={() => copyInviteCode(activeGroup.invite_code)}
                          title="Click to copy invite code"
                        >
                          <Copy size={11} /> {activeGroup.invite_code}
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="pod-header-actions">
                    {activeGroup && (
                      <button className="recap-btn" onClick={openRecapModal}>
                        <Award size={14} /> 1:00 AM Recap
                      </button>
                    )}
                    <button className="save-schedule-btn" onClick={() => setCreatePodModalOpen(true)}>
                      <UserPlus size={14} /> Create Pod
                    </button>
                    <button className="reset-schedule-btn" onClick={() => setJoinPodModalOpen(true)}>
                      <Share2 size={14} /> Join with Code
                    </button>
                  </div>
                </div>

                {/* Combined Pod Output Banner */}
                {activeGroup && leaderboard && (
                  <div className="pod-summary-banner">
                    <div className="pod-summary-stat">
                      <small>Combined Pod Focus Today</small>
                      <strong>
                        {Math.floor(leaderboard.total_pod_minutes / 60)}h {leaderboard.total_pod_minutes % 60}m
                      </strong>
                    </div>
                    <div className="pod-summary-stat">
                      <small>Pod Habits Completed</small>
                      <strong>{leaderboard.total_pod_habits} checked</strong>
                    </div>
                    <div className="pod-summary-stat">
                      <small>Active Members</small>
                      <strong>{activeGroup.member_count} of 5 max</strong>
                    </div>
                    <div className="pod-summary-stat">
                      <small>Reset & Champion Cutoff</small>
                      <strong className="pod-cutoff-stat" style={{ fontSize: '18px' }}>1:00 AM Daily</strong>
                    </div>
                  </div>
                )}

                {/* Competitive Leaderboard */}
                {activeGroup ? (
                  <div className="panel" style={{ padding: '22px', marginBottom: '24px' }}>
                    <div className="panel-heading" style={{ marginBottom: '12px' }}>
                      <div>
                        <span className="eyebrow">LIVE LEADERBOARD</span>
                        <h3>Today's Pod Rankings</h3>
                      </div>
                      <span className="count-badge" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Flame size={13} color="#d97706" /> Grind Points (GP)
                      </span>
                    </div>

                    <div className="leaderboard-table">
                      {podMembers.map((member, idx) => {
                        const isSelf = member.id === user.id;
                        return (
                          <div className={`leaderboard-row rank-${member.rank || idx + 1}`} key={member.id}>
                            <div className="rank-badge">
                              {member.rank === 1 ? <Crown size={15} color="#fff" /> : member.rank || idx + 1}
                            </div>
                            <div
                              className="member-avatar"
                              style={{ background: member.avatar_color, width: '34px', height: '34px', fontSize: '13px' }}
                            >
                              {member.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="leaderboard-user-info">
                              <strong>
                                {member.username} {isSelf && <span className="leaderboard-you-tag" style={{ fontSize: '11px' }}>(You)</span>}
                                {member.rank === 1 && member.points > 0 && (
                                  <span style={{ fontSize: '10px', color: '#b45309', fontWeight: '800' }}>👑 POD LEADER</span>
                                )}
                              </strong>
                              <small>
                                {Math.floor(member.total_minutes / 60)}h {member.total_minutes % 60}m logged · {member.habits_done}/{habits.length} habits
                              </small>
                            </div>

                            {/* Live Presence indicator */}
                            <div style={{ textAlign: 'center', padding: '0 8px' }}>
                              {member.is_studying ? (
                                <span className="studying-pill">
                                  <span className="status-dot synced" style={{ width: '6px', height: '6px' }} />
                                  {member.current_block_title || 'In Focus'}
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#97a098' }}>On break</span>
                              )}
                            </div>

                            {/* Grind Points Score */}
                            <div className="gp-badge">
                              <Zap size={12} /> {member.points} GP
                            </div>

                            {/* Nudge Button (only for other members) */}
                            {!isSelf && (
                              <button
                                className="nudge-btn"
                                onClick={() => handleNudge(member.id, member.username)}
                                title={`Send an instant notification nudge to ${member.username}`}
                              >
                                👋 Nudge
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="panel" style={{ padding: '32px', textAlign: 'center' }}>
                    <Flame size={32} color="#c5973b" style={{ marginBottom: '10px' }} />
                    <h4 style={{ font: '700 16px Manrope', margin: '0 0 6px' }}>No active pod selected</h4>
                    <p className="muted" style={{ fontSize: '12px', margin: '0 0 16px' }}>
                      Create a new study pod or join with an invite code from a friend.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button className="save-schedule-btn" onClick={() => setCreatePodModalOpen(true)}>
                        Create a Pod
                      </button>
                      <button className="reset-schedule-btn" onClick={() => setJoinPodModalOpen(true)}>
                        Enter Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Developer & Coding Performance Hub View */}
        {view === 'Coding' && (
          <section className="coding-hub-layout">
            {/* Top Bar: Connected Handles & Actions */}
            <div className="coding-top-banner">
              <div>
                <span className="eyebrow">DEVELOPER & DSA HUB</span>
                <h3>Code. Ship. Master Patterns.</h3>
                <p className="muted">
                  Track your real LeetCode stats, monitor your public GitHub contributions, solve curated interview problems, and stay ahead in contests.
                </p>
              </div>
              <div className="coding-handles-actions">
                <button
                  className="save-schedule-btn"
                  onClick={() => {
                    setInputLcUser(codingProfile.leetcode_username || '');
                    setInputGhUser(codingProfile.github_username || '');
                    setInputCfUser(codingProfile.codeforces_username || '');
                    setCodingModalOpen(true);
                  }}
                >
                  <Terminal size={15} /> {codingProfile.leetcode_username || codingProfile.github_username || codingProfile.codeforces_username ? 'Edit Handles' : 'Connect Coding Handles'}
                </button>
                {(codingProfile.leetcode_username || codingProfile.github_username || codingProfile.codeforces_username) && (
                  <button
                    className="reset-schedule-btn"
                    onClick={() => {
                      refreshLeetcode();
                      refreshGithub();
                      refreshCodeforces();
                      fetchCfArena();
                      setToast('Refreshing coding stats…');
                      setTimeout(() => setToast(''), 1500);
                    }}
                    title="Refresh live stats"
                  >
                    <RefreshCw size={14} className={leetcodeLoading || githubLoading || codeforcesLoading ? 'spin-anim' : ''} /> Refresh
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Tabs: Overview, Top Patterns Sheet, Snippets, CF Arena, Contests */}
            <div className="coding-subtabs">
              {[
                ['overview', 'Stats & Sync', Flame],
                ['sheet', 'Company Interview Sheet', CheckCircle2],
                ['snippets', 'Pod Code Reviews', Share2],
                ['arena', 'CF Battle Arena', Trophy],
                ['contests', 'Contest Calendar', Calendar]
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={`coding-subtab-btn ${codingSubTab === id ? 'active' : ''}`}
                  onClick={() => setCodingSubTab(id)}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                  {id === 'sheet' && codingProfile.solved_dsa_ids?.length > 0 && (
                    <span className="count-pill">{codingProfile.solved_dsa_ids.length}</span>
                  )}
                  {id === 'snippets' && podSnippets.length > 0 && (
                    <span className="count-pill">{podSnippets.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* SUBTAB 1: OVERVIEW & SMART COMMIT SYNC */}
            {codingSubTab === 'overview' && (
              <div className="coding-overview-container">
                {/* Main 2-Column Responsive Showcase Grid */}
                <div className="coding-overview-grid">
                  {/* LEFT COLUMN: Daily Practice & Detailed LeetCode */}
                  <div className="coding-col">
                    {/* 1. Daily Problem of the Day Spotlight */}
                    <div className="panel dsa-potd-card coding-anim-2">
                      <div className="potd-badge-row">
                        <span className="potd-chip">
                          <Flame size={12} color="#f59e0b" /> PROBLEM OF THE DAY
                        </span>
                        <span className={`diff-badge ${potd.difficulty.toLowerCase()}`}>{potd.difficulty}</span>
                        <span className="topic-pill">{potd.category}</span>
                        {potd.companies && (
                          <span className="topic-pill" style={{ background: '#fef3c7', color: '#92400e' }}>
                            {potd.companies.slice(0, 2).join(' • ')}
                          </span>
                        )}
                      </div>
                      <div className="potd-body">
                        <h4>{potd.title}</h4>
                        <p>Solve today's high-frequency problem to claim +50 Grind Points toward your squad rank.</p>
                      </div>
                      <div className="potd-actions">
                        <a
                          href={potd.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="potd-solve-btn"
                        >
                          <ExternalLink size={13} /> Solve Challenge
                        </a>
                        <button
                          className="potd-solve-btn secondary"
                          onClick={() => startMockInterview(potd.title)}
                        >
                          <Clock3 size={13} /> 45m Mock
                        </button>
                        <button
                          className={`potd-check-btn ${codingProfile.solved_dsa_ids?.includes(potd.id) ? 'done' : ''}`}
                          onClick={() => toggleDsaSolved(potd.id, true)}
                        >
                          <Check size={13} />
                          {codingProfile.solved_dsa_ids?.includes(potd.id) ? 'Solved (+50 GP)' : 'Mark Solved'}
                        </button>
                      </div>
                    </div>

                    {/* 2. LeetCode Deep Dive Panel */}
                    <div className="panel coding-metric-panel coding-anim-4">
                      <div className="coding-panel-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="platform-icon lc">LC</span>
                          <div>
                            <strong>LeetCode Breakdown</strong>
                            <small>
                              {codingProfile.leetcode_username ? `@${codingProfile.leetcode_username}` : 'No account connected'}
                            </small>
                          </div>
                        </div>
                        {codingProfile.leetcode_username ? (
                          <a
                            href={leetcodeData?.profileUrl || `https://leetcode.com/u/${codingProfile.leetcode_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="external-link-btn"
                            title="View LeetCode profile"
                          >
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <button
                            className="quick-link-btn"
                            onClick={() => {
                              setInputLcUser('');
                              setInputGhUser(codingProfile.github_username || '');
                              setInputCfUser(codingProfile.codeforces_username || '');
                              setCodingModalOpen(true);
                            }}
                          >
                            + Connect
                          </button>
                        )}
                      </div>

                      {leetcodeLoading && (
                        <div className="loading-state">
                          <RefreshCw size={18} className="spin-anim" />
                          <span>Fetching LeetCode stats…</span>
                        </div>
                      )}

                      {leetcodeError && !leetcodeLoading && (
                        <div className="coding-error-box">
                          <p>{leetcodeError}</p>
                          <button onClick={() => refreshLeetcode()}>Retry</button>
                        </div>
                      )}

                      {!codingProfile.leetcode_username && (
                        <div className="empty-prompt">
                          <Terminal size={28} color="#8a948c" />
                          <p>Connect your LeetCode username to see total solved, difficulty breakdown, and rank.</p>
                          <button
                            className="save-schedule-btn"
                            onClick={() => {
                              setInputLcUser('');
                              setInputGhUser(codingProfile.github_username || '');
                              setInputCfUser(codingProfile.codeforces_username || '');
                              setCodingModalOpen(true);
                            }}
                          >
                            Connect LeetCode
                          </button>
                        </div>
                      )}

                      {leetcodeData && !leetcodeLoading && (
                        <div className="lc-stats-body">
                          <div className="lc-total-row">
                            <div className="lc-total-num">
                              <strong>{leetcodeData.totalSolved}</strong>
                              <small>/ {leetcodeData.totalQuestions} Solved</small>
                            </div>
                            <div className="lc-badges">
                              {leetcodeData.ranking && (
                                <span className="lc-rank-badge">
                                  <Trophy size={12} color="#f59e0b" /> #{leetcodeData.ranking.toLocaleString()}
                                </span>
                              )}
                              <span className="lc-acc-badge">
                                Acc: {leetcodeData.acceptanceRate}
                              </span>
                            </div>
                          </div>

                          <div className="lc-diff-bars">
                            <div className="lc-diff-bar-item">
                              <div className="lc-diff-label">
                                <span className="dot easy" />
                                <span>Easy</span>
                                <strong>{leetcodeData.easySolved} <em>/ {leetcodeData.totalEasy}</em></strong>
                              </div>
                              <div className="lc-track">
                                <div
                                  className="fill easy"
                                  style={{ width: `${Math.min(100, (leetcodeData.easySolved / (leetcodeData.totalEasy || 1)) * 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="lc-diff-bar-item">
                              <div className="lc-diff-label">
                                <span className="dot medium" />
                                <span>Medium</span>
                                <strong>{leetcodeData.mediumSolved} <em>/ {leetcodeData.totalMedium}</em></strong>
                              </div>
                              <div className="lc-track">
                                <div
                                  className="fill medium"
                                  style={{ width: `${Math.min(100, (leetcodeData.mediumSolved / (leetcodeData.totalMedium || 1)) * 100)}%` }}
                                />
                              </div>
                            </div>

                            <div className="lc-diff-bar-item">
                              <div className="lc-diff-label">
                                <span className="dot hard" />
                                <span>Hard</span>
                                <strong>{leetcodeData.hardSolved} <em>/ {leetcodeData.totalHard}</em></strong>
                              </div>
                              <div className="lc-track">
                                <div
                                  className="fill hard"
                                  style={{ width: `${Math.min(100, (leetcodeData.hardSolved / (leetcodeData.totalHard || 1)) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Smart GitHub Commit Sync & Heatmap */}
                  <div className="coding-col">
                    {/* 3. Smart GitHub Commit Auto-Check */}
                    <div className="panel smart-commit-panel coding-anim-3">
                      <div className="smart-commit-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="live-pulse-dot" />
                            <strong className="smart-commit-title" style={{ fontSize: '13px' }}>Project Habit Auto-Verification</strong>
                          </div>
                          <p className="muted" style={{ fontSize: '11px', margin: '3px 0 0' }}>
                            Pushes to GitHub automatically verify your Project focus block today.
                          </p>
                        </div>
                        <button
                          className="save-schedule-btn"
                          style={{ padding: '6px 11px', fontSize: '11px' }}
                          onClick={verifyGithubCommitForProject}
                          disabled={verifyingCommit}
                          title="Verify latest commit and focus time"
                        >
                          <RefreshCw size={12} className={verifyingCommit ? 'spin-anim' : ''} /> Verify Now
                        </button>
                      </div>

                      <div className="smart-commit-metrics">
                        <div className="commit-stat-box">
                          <small>Scheduled</small>
                          <strong>{projectPlannedMins}m</strong>
                        </div>
                        <div className="commit-stat-box">
                          <small>Logged Focus</small>
                          <strong className="project-logged-stat">{projectLoggedMins}m ({projectPercent}%)</strong>
                        </div>
                      </div>

                      <div className="lc-track" style={{ height: '7px', margin: '10px 0 4px' }}>
                        <div
                          className="fill"
                          style={{
                            width: `${projectPercent}%`,
                            background: '#16a34a'
                          }}
                        />
                      </div>

                      {commitVerificationResult && (
                        <div
                          className={`verification-msg-box ${commitVerificationResult.habitMarked ? 'success' : 'warn'}`}
                        >
                          <CheckCircle2 size={14} />
                          <span>{commitVerificationResult.message}</span>
                        </div>
                      )}

                      {/* Expandable Webhook Accordion */}
                      <div className="webhook-accordion">
                        <button
                          type="button"
                          className="webhook-toggle-btn"
                          onClick={() => setWebhookExpanded(v => !v)}
                        >
                          <GitBranch size={12} />
                          <span>{webhookExpanded ? 'Hide Webhook Setup' : 'Zero-Click Webhook Setup'}</span>
                          <ChevronDown size={13} style={{ transform: webhookExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 'auto' }} />
                        </button>
                        {webhookExpanded && (
                          <div className="webhook-box coding-anim-1">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <small className="webhook-title" style={{ fontWeight: '700', display: 'block' }}>
                                Dedicated Webhook URL:
                              </small>
                              <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                                {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/github/${user ? user.id : 'guest'}` : ''}
                              </code>
                            </div>
                            <button
                              className="reset-schedule-btn"
                              style={{ padding: '4px 8px', fontSize: '10px' }}
                              onClick={() => {
                                const url = `${window.location.origin}/api/webhooks/github/${user ? user.id : 'guest'}`;
                                navigator.clipboard.writeText(url);
                                setToast('GitHub Webhook URL copied!');
                                setTimeout(() => setToast(''), 2500);
                              }}
                            >
                              <Copy size={12} /> Copy
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. GitHub Activity & Heatmap Card */}
                    <div className="panel coding-metric-panel coding-anim-4">
                      <div className="coding-panel-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="platform-icon gh"><Github size={15} /></span>
                          <div>
                            <strong>GitHub Activity</strong>
                            <small>
                              {codingProfile.github_username ? `@${codingProfile.github_username}` : 'No account connected'}
                            </small>
                          </div>
                        </div>
                        {codingProfile.github_username ? (
                          <a
                            href={`https://github.com/${codingProfile.github_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="external-link-btn"
                            title="View GitHub profile"
                          >
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <button
                            className="quick-link-btn"
                            onClick={() => {
                              setInputLcUser(codingProfile.leetcode_username || '');
                              setInputGhUser('');
                              setInputCfUser(codingProfile.codeforces_username || '');
                              setCodingModalOpen(true);
                            }}
                          >
                            + Connect
                          </button>
                        )}
                      </div>

                      {githubLoading && (
                        <div className="loading-state">
                          <RefreshCw size={18} className="spin-anim" />
                          <span>Fetching GitHub activity…</span>
                        </div>
                      )}

                      {!codingProfile.github_username && (
                        <div className="empty-prompt">
                          <Github size={28} color="#8a948c" />
                          <p>Connect your GitHub handle to see your commit streak heatmap and public projects.</p>
                          <button
                            className="save-schedule-btn"
                            onClick={() => {
                              setInputLcUser(codingProfile.leetcode_username || '');
                              setInputGhUser('');
                              setInputCfUser(codingProfile.codeforces_username || '');
                              setCodingModalOpen(true);
                            }}
                          >
                            Connect GitHub
                          </button>
                        </div>
                      )}

                      {githubData && !githubLoading && (
                        <div className="gh-body">
                          <div className="gh-user-row">
                            <img
                              src={githubData.user?.avatar_url || `https://github.com/${codingProfile.github_username}.png`}
                              alt={githubData.user?.name}
                              className="gh-avatar"
                            />
                            <div className="gh-meta">
                              <strong>{githubData.user?.name || codingProfile.github_username}</strong>
                              {githubData.user?.bio && <p>{githubData.user.bio}</p>}
                              <div className="gh-counts">
                                {githubData.user?.public_repos !== null && (
                                  <span><strong>{githubData.user?.public_repos}</strong> repos</span>
                                )}
                                {githubData.user?.followers !== null && (
                                  <span><strong>{githubData.user?.followers}</strong> followers</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="gh-chart-container">
                            <div className="gh-chart-title">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <GitBranch size={13} />
                                <span>Annual Contribution Heatmap</span>
                              </div>
                              <span style={{ fontSize: '10px', color: '#7a867c', fontWeight: '500' }}>Live Graph</span>
                            </div>
                            <div className="gh-chart-scroll">
                              <img
                                src={githubData.chartUrl || `https://ghchart.rshah.org/315b45/${encodeURIComponent(codingProfile.github_username)}`}
                                alt="GitHub Contribution Calendar"
                                className="gh-chart-img"
                                onError={e => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          </div>

                          {githubData.repos && githubData.repos.length > 0 && (
                            <div className="gh-repos-list">
                              <div className="gh-chart-title" style={{ marginTop: '10px' }}>
                                <Star size={12} />
                                <span>Recent Repositories</span>
                              </div>
                              <div className="gh-repos-grid">
                                {githubData.repos.slice(0, 3).map(repo => (
                                  <a
                                    key={repo.name}
                                    href={repo.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gh-repo-chip"
                                  >
                                    <span className="gh-repo-name">{repo.name}</span>
                                    <div className="gh-repo-stats">
                                      {repo.language && <span className="lang-tag">{repo.language}</span>}
                                      {repo.stargazers_count > 0 && (
                                        <span className="star-tag"><Star size={11} /> {repo.stargazers_count}</span>
                                      )}
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 5. Codeforces Card */}
                    <div className="panel coding-metric-panel coding-anim-5">
                      <div className="coding-panel-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="platform-icon cf">CF</span>
                          <div>
                            <strong>Codeforces Rating</strong>
                            <small>
                              {codingProfile.codeforces_username ? `@${codingProfile.codeforces_username}` : 'No handle connected'}
                            </small>
                          </div>
                        </div>
                        {codingProfile.codeforces_username ? (
                          <a
                            href={codeforcesData?.profileUrl || `https://codeforces.com/profile/${codingProfile.codeforces_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="external-link-btn"
                            title="View Codeforces profile"
                          >
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <button
                            className="quick-link-btn"
                            onClick={() => {
                              setInputLcUser(codingProfile.leetcode_username || '');
                              setInputGhUser(codingProfile.github_username || '');
                              setInputCfUser('');
                              setCodingModalOpen(true);
                            }}
                          >
                            + Connect
                          </button>
                        )}
                      </div>

                      {codeforcesLoading && (
                        <div className="loading-state">
                          <RefreshCw size={18} className="spin-anim" />
                          <span>Fetching Codeforces rating…</span>
                        </div>
                      )}

                      {!codingProfile.codeforces_username && (
                        <div className="empty-prompt">
                          <Trophy size={28} color="#8a948c" />
                          <p>Connect your Codeforces handle to track contest rating and division standings.</p>
                          <button
                            className="save-schedule-btn"
                            onClick={() => {
                              setInputLcUser(codingProfile.leetcode_username || '');
                              setInputGhUser(codingProfile.github_username || '');
                              setInputCfUser('');
                              setCodingModalOpen(true);
                            }}
                          >
                            Connect Codeforces
                          </button>
                        </div>
                      )}

                      {codeforcesData && !codeforcesLoading && (
                        <div className="lc-stats-body">
                          <div className="lc-total-row">
                            <div className="lc-total-num">
                              <strong style={{ color: codeforcesData.rankColor }}>{codeforcesData.rating}</strong>
                              <small>/ Max {codeforcesData.maxRating}</small>
                            </div>
                            <div className="lc-badges">
                              <span
                                className="lc-rank-badge"
                                style={{ background: '#f1f5f9', color: codeforcesData.rankColor, fontWeight: '800' }}
                              >
                                {codeforcesData.rank}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                            <img
                              src={codeforcesData.avatar}
                              alt={codeforcesData.handle}
                              style={{ width: '38px', height: '38px', borderRadius: '8px', border: `2px solid ${codeforcesData.rankColor}` }}
                            />
                            <div className="cf-org-info" style={{ fontSize: '11px' }}>
                              <span className="cf-org-name" style={{ display: 'block', fontWeight: '700' }}>
                                {codeforcesData.organization || 'Independent'}
                              </span>
                              <span>Contribution: {codeforcesData.contribution > 0 ? `+${codeforcesData.contribution}` : codeforcesData.contribution}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: COMPANY-SPECIFIC INTERVIEW PATTERNS & 45-MIN MOCK */}
            {codingSubTab === 'sheet' && (
              <div className="panel coding-sheet-panel">
                <div className="sheet-header">
                  <div>
                    <span className="eyebrow">HIGH-YIELD INTERVIEW PATTERNS</span>
                    <h3>Company-Targeted DSA Sheets & Patterns</h3>
                    <p className="muted">
                      Filter problems frequently asked by top tech giants and practice with timed 45-minute mock sessions.
                    </p>
                  </div>
                  <div className="sheet-progress-box">
                    <div className="progress-caption">
                      <span>Patterns Mastered</span>
                      <strong>
                        {codingProfile.solved_dsa_ids?.length || 0} / {dsaCuratedList.length}
                      </strong>
                    </div>
                    <div className="progress-track">
                      <div
                        style={{
                          width: `${Math.round(
                            ((codingProfile.solved_dsa_ids?.length || 0) / dsaCuratedList.length) * 100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Company Filter Tabs */}
                <div className="company-filter-bar">
                  <span className="company-label">Filter by Company:</span>
                  {['All', 'Google', 'Meta', 'Amazon', 'Microsoft', 'Apple'].map(comp => (
                    <button
                      key={comp}
                      className={`company-chip ${selectedCompany === comp ? 'active' : ''}`}
                      onClick={() => setSelectedCompany(comp)}
                    >
                      {comp === 'Google' && '🇬 '}
                      {comp === 'Meta' && '🇲 '}
                      {comp === 'Amazon' && '🇦 '}
                      {comp === 'Microsoft' && 'Ⓜ️ '}
                      {comp === 'Apple' && '🍎 '}
                      {comp === 'All' ? 'All Companies' : comp}
                    </button>
                  ))}
                </div>

                {/* 45-Minute Mock Interview Active Bar */}
                {mockTimerActive && (
                  <div className="mock-interview-bar">
                    <div className="mock-timer-clock">
                      <Clock3 size={18} color="#b91c1c" className="spin-anim" />
                      <span>
                        45-MIN MOCK INTERVIEW: <strong>{String(Math.floor(mockSecondsLeft / 60)).padStart(2, '0')}:{String(mockSecondsLeft % 60).padStart(2, '0')}</strong>
                      </span>
                    </div>
                    <span className="mock-problem-name">{mockProblemTitle}</span>
                    <button className="reset-schedule-btn" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setMockTimerActive(false)}>
                      End Mock
                    </button>
                  </div>
                )}

                {/* Categorized Problems */}
                {['Arrays & Hashing', 'Two Pointers & Sliding Window', 'Binary Search', 'Linked List', 'Trees & BST', 'Dynamic Programming & Graphs'].map(cat => {
                  let items = dsaCuratedList.filter(p => p.category === cat);
                  if (selectedCompany !== 'All') {
                    items = items.filter(p => p.companies?.includes(selectedCompany));
                  }
                  if (items.length === 0) return null;
                  const solvedCount = items.filter(p => codingProfile.solved_dsa_ids?.includes(p.id)).length;
                  return (
                    <div className="pattern-group" key={cat}>
                      <div className="pattern-group-header">
                        <h4>{cat}</h4>
                        <span className="pattern-count">{solvedCount} / {items.length}</span>
                      </div>
                      <div className="pattern-items-list">
                        {items.map(p => {
                          const isSolved = codingProfile.solved_dsa_ids?.includes(p.id);
                          return (
                            <div className={`pattern-item-row ${isSolved ? 'solved' : ''}`} key={p.id}>
                              <button
                                className="pattern-check-box"
                                onClick={() => toggleDsaSolved(p.id)}
                                title={isSolved ? 'Mark as unsolved' : 'Mark as solved'}
                              >
                                {isSolved && <Check size={13} color="#fff" />}
                              </button>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span className="pattern-title">{p.title}</span>
                                  <span className={`diff-pill ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                                  {p.companies && (
                                    <span className="company-tag-pill">
                                      {p.companies.join(' · ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                className="icon-button small"
                                style={{ width: '28px', height: '28px' }}
                                onClick={() => startMockInterview(p.title)}
                                title="Start 45m timed mock session on this problem"
                              >
                                <Clock3 size={13} />
                              </button>
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pattern-link"
                                title="Solve on LeetCode"
                              >
                                <ExternalLink size={13} />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SUBTAB 3: POD PEER CODE REVIEWS & SNIPPET DISCUSSIONS */}
            {codingSubTab === 'snippets' && (
              <div className="panel coding-sheet-panel">
                <div className="sheet-header">
                  <div>
                    <span className="eyebrow">PEER CODE REVIEW</span>
                    <h3>Pod Code Snippets & Optimization Discussions</h3>
                    <p className="muted">
                      Share tricky edge-cases, discuss time complexities, and get feedback from your 5-member study squad.
                    </p>
                  </div>
                  {user && activeGroup && (
                    <button
                      className="save-schedule-btn"
                      onClick={() => setSnippetModalOpen(true)}
                    >
                      <Share2 size={14} /> Share Code Snippet
                    </button>
                  )}
                </div>

                {!user || !activeGroup ? (
                  <div className="empty-prompt">
                    <Share2 size={32} color="#8a948c" />
                    <p>Join or select a Study Pod to exchange code snippets and conduct peer reviews with your members.</p>
                  </div>
                ) : snippetsLoading ? (
                  <div className="loading-state">
                    <RefreshCw size={18} className="spin-anim" />
                    <span>Loading pod snippet discussions…</span>
                  </div>
                ) : podSnippets.length === 0 ? (
                  <div className="empty-prompt">
                    <Code2 size={32} color="#8a948c" />
                    <p>No code snippets shared yet in "{activeGroup.name}". Be the first to share a solution or ask for review!</p>
                    <button
                      className="save-schedule-btn"
                      onClick={() => setSnippetModalOpen(true)}
                    >
                      Share First Snippet
                    </button>
                  </div>
                ) : (
                  <div className="snippets-feed-grid">
                    {podSnippets.map(snippet => (
                      <div className="snippet-card" key={snippet.id}>
                        <div className="snippet-header">
                          <div className="member-avatar" style={{ background: snippet.author_avatar_color, width: '28px', height: '28px', fontSize: '11px' }}>
                            {snippet.author_username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{snippet.title}</strong>
                            <small>By {snippet.author_username} · {snippet.language?.toUpperCase()}</small>
                          </div>
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {snippet.problem_url && (
                              <a
                                href={snippet.problem_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="external-link-btn"
                                title="Open problem link"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                            <button
                              className="like-btn"
                              onClick={() => handleLikeSnippet(snippet.id)}
                              title="Like snippet"
                            >
                              👍 {snippet.likes || 0}
                            </button>
                          </div>
                        </div>

                        {snippet.notes && (
                          <div className="snippet-notes-box">
                            <strong>Question / Review Notes:</strong> {snippet.notes}
                          </div>
                        )}

                        <pre className="snippet-code-box">
                          <code>{snippet.code}</code>
                        </pre>

                        {/* Reply Thread */}
                        {snippet.replies && snippet.replies.length > 0 && (
                          <div className="snippet-replies-list">
                            <strong className="peer-review-title" style={{ fontSize: '11px' }}>Peer Reviews ({snippet.replies.length}):</strong>
                            {snippet.replies.map(rep => (
                              <div className="snippet-reply-item" key={rep.id}>
                                <strong>{rep.username}:</strong> {rep.comment}
                                {rep.suggested_code && (
                                  <pre className="snippet-code-box mini">
                                    <code>{rep.suggested_code}</code>
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 4: CODEFORCES POD BATTLE ARENA */}
            {codingSubTab === 'arena' && (
              <div className="panel coding-sheet-panel">
                <div className="sheet-header">
                  <div>
                    <span className="eyebrow">CP BATTLE ARENA</span>
                    <h3>Pod Codeforces Standings & Rating Leaderboard</h3>
                    <p className="muted">
                      Real-time competitive programming ratings of your study pod members. Compete in rounds to claim the pod CP Crown!
                    </p>
                  </div>
                  {activeGroup && (
                    <button className="reset-schedule-btn" onClick={fetchCfArena}>
                      <RefreshCw size={13} className={cfArenaLoading ? 'spin-anim' : ''} /> Refresh Arena
                    </button>
                  )}
                </div>

                {!user || !activeGroup ? (
                  <div className="empty-prompt">
                    <Trophy size={32} color="#8a948c" />
                    <p>Join or select a Study Pod to compete in the Codeforces Battle Arena.</p>
                  </div>
                ) : cfArenaLoading ? (
                  <div className="loading-state">
                    <RefreshCw size={18} className="spin-anim" />
                    <span>Loading Codeforces battle arena…</span>
                  </div>
                ) : (
                  <div className="leaderboard-table">
                    {cfArenaList.map((m, idx) => (
                      <div className={`leaderboard-row ${idx === 0 && m.rating > 0 ? 'rank-1' : ''}`} key={m.id}>
                        <div className="rank-badge">
                          {idx === 0 && m.rating > 0 ? <Crown size={15} color="#fff" /> : `#${idx + 1}`}
                        </div>
                        <div className="member-avatar" style={{ background: m.avatar_color, width: '34px', height: '34px', fontSize: '13px' }}>
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="leaderboard-user-info">
                          <strong>
                            {m.username} {m.id === user.id && <span className="leaderboard-you-tag" style={{ fontSize: '11px' }}>(You)</span>}
                            {idx === 0 && m.rating > 0 && (
                              <span style={{ fontSize: '10px', color: '#b45309', fontWeight: '800' }}>👑 CP CHAMPION</span>
                            )}
                          </strong>
                          <small>
                            Handle: {m.cfHandle ? `@${m.cfHandle}` : 'No CF handle linked'}
                          </small>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            className="lc-rank-badge"
                            style={{ background: '#f8fafc', color: m.rankColor, fontWeight: '800' }}
                          >
                            {m.rank}
                          </span>
                          <strong style={{ display: 'block', fontSize: '15px', color: m.rankColor, marginTop: '2px' }}>
                            {m.rating > 0 ? `${m.rating} Rating` : 'Unrated'}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 5: UPCOMING CONTESTS */}
            {codingSubTab === 'contests' && (
              <div className="panel coding-contests-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">COMPETITIVE PROGRAMMING</span>
                    <h3>Weekly Contests Schedule</h3>
                    <p className="muted">
                      Participate regularly in timed rounds to build real interview speed and problem-solving agility.
                    </p>
                  </div>
                  <span className="count-badge">Weekly Cycle</span>
                </div>

                <div className="contests-grid">
                  {contestsList.map(c => (
                    <div className={`contest-card ${c.tone || 'amber'}`} key={c.id}>
                      <div className="contest-badge-row">
                        <span className="platform-tag">{c.platform}</span>
                        <span className="duration-tag">{c.duration}</span>
                      </div>
                      <h4>{c.name}</h4>
                      <p className="contest-time">{c.scheduleText}</p>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contest-link-btn"
                      >
                        Register / Enter Contest <ArrowUpRight size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {view === 'Routine settings' && (
          <section className="panel settings-panel">
            <div className="panel-heading" style={{ marginBottom: '16px' }}>
              <div>
                <span className="eyebrow">
                  {theme === 'tokyo-lofi' ? 'ROUTINE CONFIGURATION // 時間割' : 'ROUTINE CONFIGURATION'}
                </span>
                <h3>
                  {theme === 'tokyo-lofi' ? 'Shinkansen Timetable Master' : 'Edit Routine Timings & Blocks'}
                </h3>
              </div>
              {theme === 'tokyo-lofi' && (
                <span className="count-badge">
                  {editingSchedule.length} BLOCKS
                </span>
              )}
            </div>
            <p className="muted">
              {theme === 'tokyo-lofi'
                ? 'Customize departure times, deep-work sessions, and rest windows. Changes sync directly to your Shinkansen train board.'
                : 'Customize the start time, end time, and titles of your daily schedule. Any changes made here update your daily tracker instantly.'}
            </p>

            {/* Save & Reset Actions Bar */}
            <div className="settings-actions">
              <button className="save-schedule-btn" onClick={saveScheduleChanges}>
                <Save size={15} /> Save Routine Changes
              </button>
              <button className="reset-schedule-btn" onClick={resetScheduleToDefaults}>
                <RotateCcw size={15} /> Reset to Default Schedule
              </button>
            </div>

            {/* Editable Schedule Blocks */}
            <div className="schedule-editor-grid">
              {editingSchedule.map((item, index) => {
                const Icon = iconMap[item.icon] || Clock3;
                const hours = computeDurationHours(item.start, item.end);
                return (
                  <div className="schedule-edit-card" key={item.id}>
                    <div className="edit-icon-box">
                      <Icon size={17} />
                    </div>
                    <div className="edit-times">
                      <input
                        type="time"
                        value={item.start}
                        onChange={e => handleBlockChange(index, 'start', e.target.value)}
                        aria-label={`Start time for ${item.title}`}
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={item.end}
                        onChange={e => handleBlockChange(index, 'end', e.target.value)}
                        aria-label={`End time for ${item.title}`}
                      />
                    </div>
                    <div className="edit-details">
                      <input
                        type="text"
                        className="edit-title-input"
                        value={item.title}
                        onChange={e => handleBlockChange(index, 'title', e.target.value)}
                        placeholder="Block title"
                      />
                      <input
                        type="text"
                        className="edit-sub-input"
                        value={item.subtitle}
                        onChange={e => handleBlockChange(index, 'subtitle', e.target.value)}
                        placeholder="Focus description or notes"
                      />
                    </div>
                    <span className="edit-duration-badge">
                      {hours}h {item.kind === 'break' ? 'Break' : 'Focus'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="settings-note" style={{ marginTop: '20px' }}>
              <Moon size={18} />
              <span>
                Tip: Keep buffer blocks between deep sessions to avoid cognitive fatigue and sustain long-term consistency.
              </span>
            </div>
          </section>
        )}

        <footer className="footer">
          <span>
            DAYMARK <span className="brand-dot">·</span> BUILT FOR CONSISTENCY
          </span>
          <span>Progress over perfection.</span>
        </footer>
      </main>

      {/* 1:00 AM Daily Recap Modal */}
      {recapModalOpen && recapData && (
        <div className="modal-overlay" onClick={() => setRecapModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">1:00 AM DAILY RESET</span>
                <h3 style={{ marginTop: '3px' }}>Yesterday's Pod Recap & Champion</h3>
              </div>
              <button className="modal-close" onClick={() => setRecapModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Pod Total Banner */}
            <div className="pod-summary-banner" style={{ margin: '10px 0 16px' }}>
              <div>
                <small>Combined Pod Focus</small>
                <strong>
                  {Math.floor(recapData.total_pod_minutes / 60)}h {recapData.total_pod_minutes % 60}m
                </strong>
              </div>
              <div>
                <small>Habits Logged</small>
                <strong>{recapData.total_pod_habits} checked</strong>
              </div>
            </div>

            {/* Podium Standings */}
            <div style={{ marginBottom: '18px' }}>
              <strong style={{ fontSize: '11px', color: '#68776b', letterSpacing: '0.5px' }}>
                FINAL YESTERDAY STANDINGS
              </strong>
              <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                {recapData.members.map((m, idx) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      background: m.is_winner ? '#fef9ee' : '#f9faf7',
                      border: `1px solid ${m.is_winner ? '#f0dfab' : '#eaeee6'}`,
                      borderRadius: '8px'
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '800' }}>
                      {m.is_winner ? '👑' : `#${m.rank || idx + 1}`}
                    </span>
                    <div className="member-avatar" style={{ background: m.avatar_color }}>
                      {m.username.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: '12px', display: 'block' }}>
                        {m.username} {m.is_winner && <span style={{ color: '#b45309', fontSize: '10px' }}>(Champion)</span>}
                      </strong>
                      <small style={{ fontSize: '10px', color: '#7e8780' }}>
                        {Math.floor(m.total_minutes / 60)}h {m.total_minutes % 60}m · {m.habits_done}/{habits.length} habits
                      </small>
                    </div>
                    <span className="gp-badge" style={{ fontSize: '11px' }}>
                      {m.points} GP
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* What Each Member Shipped */}
            <div>
              <strong style={{ fontSize: '11px', color: '#68776b', letterSpacing: '0.5px' }}>
                WHAT EVERYONE SHIPPED & LEARNED
              </strong>
              <div style={{ display: 'grid', gap: '8px', marginTop: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {recapData.members.map(m => (
                  <div className="notes-quote-card" key={m.id}>
                    <strong>{m.username} shipped:</strong>
                    <p className="shipped-notes-text" style={{ margin: 0, fontStyle: m.notes ? 'normal' : 'italic' }}>
                      {m.notes || 'No end-of-day notes submitted.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="form-submit-btn"
              style={{ marginTop: '18px' }}
              onClick={() => setRecapModalOpen(false)}
            >
              Let's Crush Today's Grind
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal (Sign In / Register) */}
      {authModalOpen && (
        <div className="modal-overlay" onClick={() => setAuthModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{authTab === 'login' ? 'Sign In to Your Pod' : 'Create an Account'}</h3>
              <button className="modal-close" onClick={() => setAuthModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="auth-tabs">
              <button
                className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('login');
                  setAuthError('');
                }}
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthTab('register');
                  setAuthError('');
                }}
              >
                Create Account
              </button>
            </div>

            {authError && <div className="form-error">{authError}</div>}

            <form onSubmit={handleAuthSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={authUsername}
                  onChange={e => setAuthUsername(e.target.value)}
                  placeholder="e.g. shantnu"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              <button type="submit" className="form-submit-btn">
                {authTab === 'login' ? 'Sign In' : 'Create Account & Start Pod'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Pod Modal */}
      {createPodModalOpen && (
        <div className="modal-overlay" onClick={() => setCreatePodModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create a Study Pod</h3>
              <button className="modal-close" onClick={() => setCreatePodModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="muted" style={{ fontSize: '12px', margin: '-8px 0 16px' }}>
              Pods have a strict maximum limit of 5 members. You'll get an invite code to share with friends.
            </p>

            {podError && <div className="form-error">{podError}</div>}

            <form onSubmit={handleCreatePod}>
              <div className="form-group">
                <label>Pod Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPodName}
                  onChange={e => setNewPodName(e.target.value)}
                  placeholder="e.g. DSA & Dev Grind"
                  required
                />
              </div>
              <button type="submit" className="form-submit-btn">
                Create Pod & Generate Invite Code
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Pod Modal */}
      {joinPodModalOpen && (
        <div className="modal-overlay" onClick={() => setJoinPodModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Join a Study Pod</h3>
              <button className="modal-close" onClick={() => setJoinPodModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="muted" style={{ fontSize: '12px', margin: '-8px 0 16px' }}>
              Enter the 6-character private invite code provided by your friend.
            </p>

            {podError && <div className="form-error">{podError}</div>}

            <form onSubmit={handleJoinPod}>
              <div className="form-group">
                <label>Invite Code</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '700' }}
                  value={joinInviteCode}
                  onChange={e => setJoinInviteCode(e.target.value)}
                  placeholder="e.g. 7X8K2M"
                  maxLength={8}
                  required
                />
              </div>
              <button type="submit" className="form-submit-btn">
                Join Pod
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Connect LeetCode & GitHub Handles Modal */}
      {codingModalOpen && (
        <div className="modal-overlay" onClick={() => setCodingModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Connect Coding Accounts</h3>
              <button className="modal-close" onClick={() => setCodingModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="muted" style={{ fontSize: '12px', margin: '-8px 0 16px' }}>
              Link your public LeetCode and GitHub handles to track your solved problems, acceptance rate, and contribution streak.
            </p>

            <form onSubmit={handleSaveCodingHandles}>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>LeetCode Username</span>
                  <small style={{ color: '#889189', textTransform: 'none' }}>(e.g. neal_wu or tourister)</small>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={inputLcUser}
                  onChange={e => setInputLcUser(e.target.value)}
                  placeholder="LeetCode username"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Github size={13} />
                  <span>GitHub Username</span>
                  <small style={{ color: '#889189', textTransform: 'none' }}>(e.g. torvalds or your username)</small>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={inputGhUser}
                  onChange={e => setInputGhUser(e.target.value)}
                  placeholder="GitHub username"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Trophy size={13} color="#2563eb" />
                  <span>Codeforces Handle (Optional)</span>
                  <small style={{ color: '#889189', textTransform: 'none' }}>(e.g. tourist or your handle)</small>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={inputCfUser}
                  onChange={e => setInputCfUser(e.target.value)}
                  placeholder="Codeforces handle"
                />
              </div>

              <button type="submit" className="form-submit-btn">
                Save Handles & Fetch Stats
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share Code Snippet Modal */}
      {snippetModalOpen && (
        <div className="modal-overlay" onClick={() => setSnippetModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share Code Snippet in Pod</h3>
              <button className="modal-close" onClick={() => setSnippetModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="muted" style={{ fontSize: '12px', margin: '-8px 0 16px' }}>
              Share your solution, ask for peer review, or discuss optimization with your pod members.
            </p>
            <form onSubmit={handlePostSnippet}>
              <div className="form-group">
                <label>Problem Title / Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={newSnippetTitle}
                  onChange={e => setNewSnippetTitle(e.target.value)}
                  placeholder="e.g. 3Sum O(N^2) Solution with Two Pointers"
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Language</label>
                  <select
                    className="form-input"
                    value={newSnippetLang}
                    onChange={e => setNewSnippetLang(e.target.value)}
                  >
                    <option value="javascript">JavaScript / TypeScript</option>
                    <option value="python">Python 3</option>
                    <option value="cpp">C++ (STL)</option>
                    <option value="java">Java</option>
                    <option value="go">Go</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Problem URL (Optional)</label>
                  <input
                    type="url"
                    className="form-input"
                    value={newSnippetProblemUrl}
                    onChange={e => setNewSnippetProblemUrl(e.target.value)}
                    placeholder="https://leetcode.com/problems/..."
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Code Snippet</label>
                <textarea
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontSize: '12px', minHeight: '140px', resize: 'vertical' }}
                  value={newSnippetCode}
                  onChange={e => setNewSnippetCode(e.target.value)}
                  placeholder="Paste your solution or the code you want reviewed..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Review Question / Notes (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={newSnippetNotes}
                  onChange={e => setNewSnippetNotes(e.target.value)}
                  placeholder="e.g. How can I avoid the duplicate triplets without extra set?"
                />
              </div>
              <button type="submit" className="form-submit-btn">
                Post Snippet to Pod
              </button>
            </form>
          </div>
        </div>
      )}

      {/* High-Visibility Real-Time Nudge Alert Modal */}
      {nudgePopup.open && (
        <div className="modal-overlay" onClick={() => setNudgePopup(prev => ({ ...prev, open: false }))}>
          <div className="modal-card nudge-popup-card" onClick={e => e.stopPropagation()}>
            <div className="nudge-popup-icon">👋</div>
            <h3 style={{ margin: '8px 0 4px', fontSize: '20px' }}>{nudgePopup.from_username} nudged you!</h3>
            <p className="muted" style={{ fontSize: '13px', lineHeight: '1.5', margin: '0 0 20px' }}>
              Your squad member sent an urgent nudge in <strong>"{nudgePopup.group_name}"</strong>.
              It's time to jump back into your session and get focused!
            </p>
            <div style={{ display: 'grid', gap: '8px' }}>
              <button
                className="form-submit-btn"
                onClick={() => {
                  setNudgePopup(prev => ({ ...prev, open: false }));
                  setView('Today');
                  const currentOrFirst = current?.id || schedule[0]?.id;
                  if (currentOrFirst && isToday) {
                    startSession(currentOrFirst);
                  }
                  setToast('🚀 Locked in! Focus timer started.');
                }}
              >
                <Play size={14} /> Lock In Now (Start Focus)
              </button>
              <button
                className="reset-schedule-btn"
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                onClick={() => {
                  handleNudge(nudgePopup.from_user_id, nudgePopup.from_username);
                  setNudgePopup(prev => ({ ...prev, open: false }));
                }}
              >
                👋 Nudge Back
              </button>
              <button
                style={{ background: 'transparent', border: 0, color: '#889289', fontSize: '12px', padding: '6px', cursor: 'pointer' }}
                onClick={() => setNudgePopup(prev => ({ ...prev, open: false }))}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Alarm Ringing Overlay Modal */}
      {activeAlarmModal && (
        <div className="alarm-ringing-backdrop">
          <div className="alarm-ringing-modal">
            <div className="alarm-ringing-icon-wrap">
              <AlarmClock size={40} className="alarm-ringing-bell" color="#d97706" />
            </div>
            <span className="eyebrow" style={{ color: '#d97706', letterSpacing: '1px' }}>ROUTINE ALARM TRIGGERED</span>
            <h2 className="alarm-ringing-time">{activeAlarmModal.time}</h2>
            <p className="alarm-ringing-label">{activeAlarmModal.label || 'Time for your routine activity!'}</p>
            <div className="alarm-ringing-actions">
              <button className="alarm-dismiss-btn" onClick={dismissAlarm}>
                <Check size={16} /> Dismiss Alarm
              </button>
              <button className="alarm-snooze-btn" onClick={snoozeAlarm}>
                <Clock3 size={15} /> Snooze 5 Min
              </button>
            </div>
          </div>
        </div>
      )}


      
      {/* 1. Chief of Staff: Floating Proactive Drift Alert Card */}
      {chiefOfStaffAlert && !chiefOfStaffModalOpen && (
        <div className="chief-alert-floating">
          <div className="chief-alert-header">
            <div className="chief-alert-title">
              <ShieldCheck size={16} />
              <span>Chief of Staff (Schedule Arbiter)</span>
            </div>
            {chiefOfStaffAlert.driftMinutes > 0 && (
              <span className="chief-drift-badge">+{chiefOfStaffAlert.driftMinutes}m Slip</span>
            )}
          </div>
          <div className="chief-alert-body">
            {chiefOfStaffAlert.slippingItem ? (
              <span>
                <strong>{chiefOfStaffAlert.slippingItem.title}</strong> has drifted.{' '}
              </span>
            ) : null}
            {chiefOfStaffAlert.narrative}
          </div>
          <div className="chief-alert-actions">
            <button className="chief-heal-btn" onClick={() => applyChiefOfStaffHeal()}>
              <Sparkles size={13} /> Accept AI Heal
            </button>
            <button className="chief-inspect-btn" onClick={() => setChiefOfStaffModalOpen(true)}>
              Inspect Strategy
            </button>
            <button
              className="chief-dismiss-btn"
              onClick={() => {
                setChiefDismissUntil(Date.now() + 20 * 60 * 1000);
                setChiefOfStaffAlert(null);
              }}
            >
              Dismiss (20m)
            </button>
          </div>
        </div>
      )}

      {/* 2. Chief of Staff: Detailed Strategy & Reconciliation Modal */}
      {chiefOfStaffModalOpen && chiefOfStaffAlert && (
        <div className="modal-overlay" onClick={() => setChiefOfStaffModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Chief of Staff: Schedule Re-sequencer</h3>
              </div>
              <button className="modal-close" onClick={() => setChiefOfStaffModalOpen(false)}>×</button>
            </div>

            <div className="chief-modal-narrative" style={{ padding: '16px 0', fontSize: '0.88rem', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 12px 0' }}>
                {chiefOfStaffAlert.narrative}
              </p>

              <div className="chief-stat-chips">
                <div className="chief-stat-chip">
                  <div className="chief-stat-chip-label">Blocks Realigned</div>
                  <div className="chief-stat-chip-value">{chiefOfStaffAlert.shiftedCount || 0}</div>
                </div>
                <div className="chief-stat-chip">
                  <div className="chief-stat-chip-label">Break Time Compacted</div>
                  <div className="chief-stat-chip-value">{chiefOfStaffAlert.savingsMinutes || 0}m</div>
                </div>
                <div className="chief-stat-chip">
                  <div className="chief-stat-chip-label">Projected Cutoff</div>
                  <div className="chief-stat-chip-value">{chiefOfStaffAlert.healedEnd || '--:--'}</div>
                </div>
              </div>

              <div className="chief-strategy-grid">
                <div className="chief-strategy-col">
                  <div className="chief-col-title" style={{ color: '#dc2626' }}>
                    Current Slipping Plan
                  </div>
                  {(schedule || []).slice(0, 6).map((item, i) => (
                    <div key={item.id || i} className="chief-item-row">
                      <span style={{ fontWeight: 500 }}>{item.title}</span>
                      <span style={{ fontFamily: 'monospace', color: '#6b7280' }}>{item.start} - {item.end}</span>
                    </div>
                  ))}
                </div>

                <div className="chief-strategy-col healed">
                  <div className="chief-col-title">
                    ✨ AI Healed Plan
                  </div>
                  {(chiefOfStaffAlert.proposedSchedule || []).slice(0, 6).map((item, i) => (
                    <div key={item.id || i} className="chief-item-row">
                      <span className="chief-healed-title">{item.title}</span>
                      <span className="chief-healed-time">{item.start} - {item.end}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="secondary-button" onClick={() => setChiefOfStaffModalOpen(false)}>
                Keep Current
              </button>
              <button
                className="primary-button"
                style={{ background: '#2563eb', color: '#ffffff' }}
                onClick={() => applyChiefOfStaffHeal()}
              >
                <Sparkles size={14} /> Accept & Apply Healed Timetable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Elastic Schedule Auto-Shift Modal */}
      {elasticModalOpen && (
        <div className="modal-overlay" onClick={() => setElasticModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Elastic Schedule Auto-Shift</h3>
              </div>
              <button className="modal-close" onClick={() => setElasticModalOpen(false)}>×</button>
            </div>

            <div className="modal-field-subtext" style={{ padding: '16px 0', fontSize: '0.88rem', lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 16px 0' }}>
                Running late? Shift your remaining schedule forward smoothly without breaking deep focus durations.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label className="modal-field-label" style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>
                  Shift Remaining Blocks By:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[15, 30, 45, 60].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      className={`secondary-button ${elasticShiftMins === mins && !elasticFromNow ? 'primary' : ''}`}
                      style={{ flex: 1, minWidth: '60px', padding: '8px', fontWeight: 700 }}
                      onClick={() => { setElasticShiftMins(mins); setElasticFromNow(false); }}
                    >
                      +{mins}m
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`secondary-button ${elasticFromNow ? 'primary' : ''}`}
                    style={{ flex: 1.5, minWidth: '100px', padding: '8px', fontWeight: 700, background: elasticFromNow ? '#2563eb' : '', color: elasticFromNow ? '#ffffff' : '' }}
                    onClick={() => setElasticFromNow(true)}
                  >
                    ⚡ From Now
                  </button>
                </div>
              </div>

              <label className="elastic-compress-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={elasticCompressBreaks}
                  onChange={e => setElasticCompressBreaks(e.target.checked)}
                  style={{ accentColor: '#2563eb' }}
                />
                <span className="modal-field-subtext" style={{ fontSize: '0.82rem' }}>
                  <strong>Compress remaining breaks by 35%</strong> to recover time for evening shutdown
                </span>
              </label>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="secondary-button" onClick={() => setElasticModalOpen(false)}>Cancel</button>
              <button
                className="primary-button"
                style={{ background: '#2563eb', color: '#ffffff' }}
                onClick={() => applyElasticShift(elasticFromNow)}
              >
                Apply Shift Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Subject Curriculum & Stage Roadmap Modal */}
      {curriculumModalOpen && (
        <div className="modal-overlay" onClick={() => setCurriculumModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Milestone size={22} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{curriculumSubject} — Curriculum & Stage Roadmap</h3>
              </div>
              <button className="modal-close" onClick={() => setCurriculumModalOpen(false)}>×</button>
            </div>

            <div style={{ padding: '16px 0', overflowY: 'auto', flex: 1 }}>
              {activeCurriculum && !curriculumEditMode && (() => {
                const prog = calculateCurriculumProgress(activeCurriculum);
                return (
                  <>
                    <div className="curriculum-header-stats">
                      <div className="curriculum-progress-circle" style={{ '--p': `${prog.percent}%` }}>
                        <div className="curriculum-progress-inner">
                          {prog.percent}%
                        </div>
                      </div>
                      <div className="curriculum-stat-text">
                        <div className="curriculum-stage-badge">
                          ACTIVE: STAGE {prog.activeStageIndex + 1} OF {activeCurriculum.stages.length}
                        </div>
                        <div className="curriculum-stage-title">
                          {prog.activeStage ? prog.activeStage.title : 'All Stages Complete!'}
                        </div>
                        <div className="curriculum-count-subtitle">
                          {prog.completedCheckpoints} of {prog.totalCheckpoints} checkpoints mastered ({prog.percent}%)
                        </div>
                      </div>
                    </div>

                    <div className="curriculum-actions-bar">
                      <button className="curriculum-btn-secondary" onClick={handleCopyChatGPTTemplate} title="Copy prompt to generate roadmaps for any subject">
                        <Copy size={13} /> Copy ChatGPT Prompt
                      </button>
                      <button className="curriculum-btn-secondary" onClick={() => setCurriculumEditMode(true)}>
                        <Layers size={13} /> Paste / Edit Outline
                      </button>
                    </div>

                    <div className="curriculum-stages-container">
                      {activeCurriculum.stages.map((stage, sIdx) => {
                        const isActive = sIdx === prog.activeStageIndex;
                        const isExpanded = curriculumStageOpen[stage.id] !== undefined ? curriculumStageOpen[stage.id] : (isActive || sIdx < 3);
                        const stageCompletedCount = (stage.checkpoints || []).filter(c => c.completed).length;
                        const stageTotalCount = (stage.checkpoints || []).length;
                        const isStageDone = stageCompletedCount === stageTotalCount && stageTotalCount > 0;

                        return (
                          <div key={stage.id || sIdx} className={`curriculum-stage-card ${isActive ? 'active-stage' : ''}`}>
                            <div
                              className="curriculum-stage-head"
                              onClick={() => setCurriculumStageOpen(prev => ({ ...prev, [stage.id]: !isExpanded }))}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: isStageDone ? '#16a34a' : isActive ? '#4f46e5' : '#64748b' }}>
                                  {isStageDone ? '✓' : isActive ? '▶' : '•'}
                                </span>
                                <span>{stage.title}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748b' }}>
                                <span>{stageCompletedCount}/{stageTotalCount}</span>
                                <span>{isExpanded ? '▲' : '▼'}</span>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="curriculum-checkpoint-list">
                                {(stage.checkpoints || []).map((cp) => (
                                  <div key={cp.id} className="curriculum-checkpoint-item">
                                    <input
                                      type="checkbox"
                                      checked={cp.completed}
                                      onChange={() => handleToggleCheckpoint(stage.id, cp.id)}
                                      className="curriculum-checkbox"
                                    />
                                    <div className="curriculum-checkpoint-content">
                                      <div className={`curriculum-checkpoint-title ${cp.completed ? 'done' : ''}`}>
                                        {cp.title}
                                      </div>
                                      {cp.details && cp.details.length > 0 && (
                                        <div className="curriculum-details-tags">
                                          {cp.details.map((d, dIdx) => (
                                            <span key={dIdx} className="curriculum-detail-tag">{d}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

              {curriculumEditMode && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="modal-field-label" style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                      Paste ASCII Tree or Outline for {curriculumSubject}:
                    </span>
                    <button className="curriculum-btn-secondary" onClick={handleCopyChatGPTTemplate} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                      <Copy size={11} /> Copy Prompt for ChatGPT
                    </button>
                  </div>
                  <textarea
                    className="unblock-textarea"
                    rows={12}
                    placeholder={`Paste your stages here! For example:\n\nSTAGE 1 — FUNDAMENTALS\n├── 1.1 Topic One\n│   ├── Sub-detail\n│   └── Sub-detail\n├── 1.2 Topic Two\n\nSTAGE 2 — ADVANCED CONCEPTS\n├── 2.1 Next Topic`}
                    value={curriculumRawText}
                    onChange={e => setCurriculumRawText(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                    {activeCurriculum && (
                      <button className="secondary-button" onClick={() => setCurriculumEditMode(false)}>
                        Cancel & View Current
                      </button>
                    )}
                    <button
                      className="primary-button"
                      style={{ background: '#4f46e5', marginLeft: 'auto' }}
                      onClick={handleImportCurriculum}
                      disabled={!curriculumRawText.trim()}
                    >
                      <Milestone size={14} /> Import & Build Stages
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Pre-Flight Mission Dispatch Modal */}
      {preflightModalOpen && (
        <div className="modal-overlay" onClick={() => { setPreflightModalOpen(false); setPreflightDismissed(true); }}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sun size={22} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Morning Pre-Flight Mission Dispatch</h3>
              </div>
              <button className="modal-close" onClick={() => { setPreflightModalOpen(false); setPreflightDismissed(true); }}>×</button>
            </div>

            <div style={{ padding: '16px 0' }}>
              <div className="preflight-modal-banner">
                <div>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#92400e', fontWeight: 700, letterSpacing: '0.04em' }}>
                    DAILY BIOLOGICAL READINESS
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#78350f', marginTop: '2px' }}>
                    {isDeloadDay ? 'Deload Recovery State (50% Volume Cap)' : 'Prime Circadian Focus Window Active'}
                  </div>
                </div>
                <span className={`preflight-badge ${isDeloadDay ? 'strain' : ''}`}>
                  {isDeloadDay ? '🛡️ Deload Shield' : '⚡ 95% Cognitive Peak'}
                </span>
              </div>

              {/* Pledged Priority Card */}
              {morningPriority ? (
                <div className="preflight-priority-box">
                  <div className="preflight-priority-label">
                    <span>★ YESTERDAY'S LOCKED NON-NEGOTIABLE PRIORITY</span>
                  </div>
                  <div className="preflight-priority-title">
                    {morningPriority}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#92400e', marginTop: '4px' }}>
                    Targeted for slotting into the 09:00 - 12:00 biological peak window.
                  </div>
                </div>
              ) : null}

              {/* Proposed Battle Plan Preview */}
              <div className="preflight-timeline-card">
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>CIRCADIAN BATTLE PLAN PREVIEW</span>
                  <span style={{ color: '#16a34a' }}>Peak Window: 09:00 - 12:00</span>
                </div>
                {(schedule || []).slice(0, 5).map((item, i) => {
                  const { tier, color } = getCognitiveTier(item);
                  return (
                    <div key={item.id || i} className="preflight-timeline-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="preflight-item-time">{item.start} - {item.end}</span>
                        <span className="preflight-item-title">{item.title}</span>
                      </div>
                      <span className="preflight-tier-tag" style={{ background: `${color}18`, color }}>
                        {tier.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="secondary-button" onClick={() => handleLaunchDay(false)}>
                Keep Current Timetable
              </button>
              <button className="preflight-launch-btn" onClick={() => handleLaunchDay(true)}>
                <Rocket size={15} /> Commit & Launch Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Evening Closeout & Morning Non-Negotiable Modal */}
      {closeoutModalOpen && (
        <div className="modal-overlay" onClick={() => setCloseoutModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Moon size={22} color="#7c3aed" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Evening Shutdown & Next-Day Anchor</h3>
              </div>
              <button className="modal-close" onClick={() => setCloseoutModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSaveCloseout} style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="modal-field-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  1. What moved the needle today? (Daily Highlights / Wins)
                </label>
                <textarea
                  className="unblock-textarea"
                  rows={2}
                  placeholder="e.g., Shipped authentication module and fixed database timeout bug."
                  value={closeoutWins}
                  onChange={e => setCloseoutWins(e.target.value)}
                />
              </div>

              <div>
                <label className="modal-field-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  2. What caused friction or context-switching?
                </label>
                <textarea
                  className="unblock-textarea"
                  rows={2}
                  placeholder="e.g., Spent 45m troubleshooting dependency conflict before asking."
                  value={closeoutFriction}
                  onChange={e => setCloseoutFriction(e.target.value)}
                />
              </div>

              <div className="closeout-priority-box" style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: '10px', padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#92400e', marginBottom: '6px' }}>
                  ★ 3. Tomorrow's Single Non-Negotiable Morning Priority:
                </label>
                <input
                  type="text"
                  className="unblock-textarea"
                  style={{ height: '40px', resize: 'none' }}
                  placeholder="e.g., Refactor Payment Webhook Handler (Must ship before lunch)"
                  value={closeoutPriority}
                  onChange={e => setCloseoutPriority(e.target.value)}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px' }}>
                  This will be pinned as your hero spotlight at 09:00 AM tomorrow.
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: 0 }}>
                <button type="button" className="secondary-button" onClick={() => setCloseoutModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" style={{ background: '#7c3aed' }}>
                  Lock Shutdown & Save Priority
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Friction & Context-Switch Interceptor Modal */}
      {interceptorModalOpen && interceptTask && (
        <div className="modal-overlay" onClick={() => { if (!resetActive) setInterceptorModalOpen(false); }}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={22} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Context-Switch Interceptor</h3>
              </div>
              {!resetActive && (
                <button className="modal-close" onClick={() => setInterceptorModalOpen(false)}>×</button>
              )}
            </div>

            <div style={{ padding: '16px 0' }}>
              <div className="interceptor-banner">
                <div>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#b91c1c', fontWeight: 700, letterSpacing: '0.04em' }}>
                    PREMATURE EXIT DETECTED
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#991b1b', marginTop: '2px' }}>
                    {interceptTask.title}
                  </div>
                </div>
                <span className="interceptor-badge">
                  {interceptTask.elapsedMins}m / {interceptTask.scheduledMins}m ({interceptTask.percent}%)
                </span>
              </div>

              {interceptorTab === 'triage' && (
                <>
                  <p className="modal-field-subtext" style={{ fontSize: '0.86rem', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                    You scheduled <strong>{interceptTask.scheduledMins} minutes</strong> for deep work, but only completed <strong>{interceptTask.elapsedMins} minutes</strong>. What resistance are you experiencing?
                  </p>

                  <div className="interceptor-pathways">
                    <div className="interceptor-tile" onClick={() => setInterceptorTab('unblock')}>
                      <div className="interceptor-tile-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                        <ListTodo size={20} />
                      </div>
                      <div>
                        <div className="interceptor-tile-title">🧱 I'm Stuck / Hit a Wall</div>
                        <div className="interceptor-tile-desc">Dismantle the problem into 2-3 micro-actions to break through the obstacle.</div>
                      </div>
                    </div>

                    <div className="interceptor-tile" onClick={startBreathingReset}>
                      <div className="interceptor-tile-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                        <Wind size={20} />
                      </div>
                      <div>
                        <div className="interceptor-tile-title">🧘 Mental Fog / Distracted</div>
                        <div className="interceptor-tile-desc">Trigger a 2-minute box breathing cycle with 40Hz Gamma binaural beats to reset focus.</div>
                      </div>
                    </div>

                    <div className="interceptor-tile" onClick={() => setInterceptorTab('early_proof')}>
                      <div className="interceptor-tile-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                        <Check size={20} />
                      </div>
                      <div>
                        <div className="interceptor-tile-title">🏁 Genuinely Finished Early</div>
                        <div className="interceptor-tile-desc">Shipped ahead of schedule? Enter a 1-sentence proof of completion to log the block.</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {interceptorTab === 'unblock' && (
                <div>
                  <div className="modal-field-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                    Break down the blocker into 2-3 tiny 5-minute micro-actions:
                  </div>
                  <textarea
                    className="unblock-textarea"
                    rows={4}
                    placeholder="1. Print error response in console&#10;2. Check auth token expiry&#10;3. Run test with isolated mock data"
                    value={unblockSteps}
                    onChange={e => setUnblockSteps(e.target.value)}
                    autoFocus
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                    <button className="secondary-button" onClick={() => setInterceptorTab('triage')}>Back</button>
                    <button className="primary-button" onClick={handleUnblockSubmit} style={{ background: '#2563eb' }}>
                      <Rocket size={14} /> Lock Micro-Steps & Resume Sprint
                    </button>
                  </div>
                </div>
              )}

              {interceptorTab === 'reset' && (
                <div className="breathing-box">
                  <div className="breathing-circle-outer">
                    <div className="breathing-circle-pulse">
                      <div className="breathing-timer">
                        {Math.floor(resetSecondsLeft / 60)}:{(resetSecondsLeft % 60).toString().padStart(2, '0')}
                      </div>
                      <div className="breathing-phase">
                        {resetSecondsLeft % 16 >= 12
                          ? 'HOLD'
                          : resetSecondsLeft % 16 >= 8
                          ? 'EXHALE'
                          : resetSecondsLeft % 16 >= 4
                          ? 'HOLD'
                          : 'INHALE'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    🎧 40Hz Gamma Neural Sync Active. Follow the circle rhythm to clear mental resistance.
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <button className="secondary-button" onClick={stopBreathingEarly} style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>
                      Finish Reset & Return to Task
                    </button>
                  </div>
                </div>
              )}

              {interceptorTab === 'early_proof' && (
                <div>
                  <div className="modal-field-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                    What did you complete or ship ahead of time?
                  </div>
                  <input
                    type="text"
                    className="unblock-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    placeholder="e.g., Finished OAuth login flow and verified unit tests passed"
                    value={earlyProofText}
                    onChange={e => setEarlyProofText(e.target.value)}
                    autoFocus
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                    <button className="secondary-button" onClick={() => setInterceptorTab('triage')}>Back</button>
                    <button
                      className="primary-button"
                      onClick={handleEarlyProofSubmit}
                      disabled={!earlyProofText.trim()}
                      style={{ background: '#16a34a' }}
                    >
                      <Check size={14} /> Verify & Log Completion
                    </button>
                  </div>
                </div>
              )}
            </div>

            {interceptorTab === 'triage' && (
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setInterceptorModalOpen(false);
                    finishSession(true);
                  }}
                  style={{ color: '#94a3b8', fontSize: '0.78rem' }}
                >
                  Force Log Partial Session ({interceptTask.elapsedMins}m)
                </button>
                <button className="primary-button" onClick={() => setInterceptorModalOpen(false)}>
                  Resume Deep Work
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. Micro-Artifact & Proof of Work Modal */}
      {artifactModalOpen && closingTask && (
        <div className="modal-overlay" onClick={() => setArtifactModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Proof of Work: {closingTask.title}</h3>
              </div>
              <button className="modal-close" onClick={() => setArtifactModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleArtifactSubmit} style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p className="modal-field-subtext" style={{ margin: 0, fontSize: '0.85rem' }}>
                Great work! You logged <strong>{closingTask.loggedMins || 0} minutes</strong>. Take 15 seconds to anchor what you shipped or accomplished:
              </p>

              <div>
                <label className="modal-field-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  What did you complete or ship? *
                </label>
                <textarea
                  className="unblock-textarea"
                  rows={3}
                  placeholder="e.g., Built and verified the user authentication API endpoint with JWT tests."
                  value={artifactNotes}
                  onChange={e => setArtifactNotes(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="modal-field-label" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Deliverable / Artifact Link (Optional):
                </label>
                <input
                  type="url"
                  className="unblock-textarea"
                  style={{ height: '40px', resize: 'none' }}
                  placeholder="https://github.com/... or PR link, Google Doc, Loom"
                  value={artifactUrl}
                  onChange={e => setArtifactUrl(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: 0 }}>
                <button type="button" className="secondary-button" onClick={() => setArtifactModalOpen(false)}>
                  Skip
                </button>
                <button type="submit" className="primary-button" style={{ background: '#16a34a' }}>
                  Verify & Log Proof
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {toast}
          <button onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, detail, icon: Icon, tone }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
