import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlarmClock,
  ArrowUpRight,
  Award,
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
  Database,
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
  Moon,
  Pause,
  Play,
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
  X,
  Zap
} from 'lucide-react';
import './styles.css';

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

const habits = [
  { id: 'dsa', label: 'DSA · 3 hours' },
  { id: 'project', label: 'Project · 6 hours' },
  { id: 'reading', label: 'Reading · 2 hours' },
  { id: 'revision', label: 'Revision · 1 hour' },
  { id: 'breaks', label: 'Take both breaks' },
  { id: 'sleep', label: 'Sleep 7–8 hours' },
];

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

// Curated Top Patterns & Interview DSA Sheet (Blind 75 & NeetCode standard)
const dsaCuratedList = [
  // Arrays & Hashing
  { id: 'two-sum', title: 'Two Sum', category: 'Arrays & Hashing', difficulty: 'Easy', url: 'https://leetcode.com/problems/two-sum/' },
  { id: 'valid-anagram', title: 'Valid Anagram', category: 'Arrays & Hashing', difficulty: 'Easy', url: 'https://leetcode.com/problems/valid-anagram/' },
  { id: 'group-anagrams', title: 'Group Anagrams', category: 'Arrays & Hashing', difficulty: 'Medium', url: 'https://leetcode.com/problems/group-anagrams/' },
  { id: 'top-k-frequent', title: 'Top K Frequent Elements', category: 'Arrays & Hashing', difficulty: 'Medium', url: 'https://leetcode.com/problems/top-k-frequent-elements/' },
  { id: 'product-of-array', title: 'Product of Array Except Self', category: 'Arrays & Hashing', difficulty: 'Medium', url: 'https://leetcode.com/problems/product-of-array-except-self/' },

  // Two Pointers & Sliding Window
  { id: 'valid-palindrome', title: 'Valid Palindrome', category: 'Two Pointers & Sliding Window', difficulty: 'Easy', url: 'https://leetcode.com/problems/valid-palindrome/' },
  { id: 'three-sum', title: '3Sum', category: 'Two Pointers & Sliding Window', difficulty: 'Medium', url: 'https://leetcode.com/problems/3sum/' },
  { id: 'container-water', title: 'Container With Most Water', category: 'Two Pointers & Sliding Window', difficulty: 'Medium', url: 'https://leetcode.com/problems/container-with-most-water/' },
  { id: 'best-time-stock', title: 'Best Time to Buy and Sell Stock', category: 'Two Pointers & Sliding Window', difficulty: 'Easy', url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/' },
  { id: 'longest-substring', title: 'Longest Substring Without Repeating Characters', category: 'Two Pointers & Sliding Window', difficulty: 'Medium', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },

  // Binary Search
  { id: 'binary-search', title: 'Binary Search', category: 'Binary Search', difficulty: 'Easy', url: 'https://leetcode.com/problems/binary-search/' },
  { id: 'search-rotated-array', title: 'Search in Rotated Sorted Array', category: 'Binary Search', difficulty: 'Medium', url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
  { id: 'find-min-rotated', title: 'Find Minimum in Rotated Sorted Array', category: 'Binary Search', difficulty: 'Medium', url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/' },

  // Linked List
  { id: 'reverse-linked-list', title: 'Reverse Linked List', category: 'Linked List', difficulty: 'Easy', url: 'https://leetcode.com/problems/reverse-linked-list/' },
  { id: 'merge-two-sorted-lists', title: 'Merge Two Sorted Lists', category: 'Linked List', difficulty: 'Easy', url: 'https://leetcode.com/problems/merge-two-sorted-lists/' },
  { id: 'linked-list-cycle', title: 'Linked List Cycle', category: 'Linked List', difficulty: 'Easy', url: 'https://leetcode.com/problems/linked-list-cycle/' },

  // Trees & BST
  { id: 'invert-binary-tree', title: 'Invert Binary Tree', category: 'Trees & BST', difficulty: 'Easy', url: 'https://leetcode.com/problems/invert-binary-tree/' },
  { id: 'max-depth-tree', title: 'Maximum Depth of Binary Tree', category: 'Trees & BST', difficulty: 'Easy', url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/' },
  { id: 'lca-bst', title: 'Lowest Common Ancestor of a BST', category: 'Trees & BST', difficulty: 'Medium', url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/' },
  { id: 'level-order-traversal', title: 'Binary Tree Level Order Traversal', category: 'Trees & BST', difficulty: 'Medium', url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/' },

  // Dynamic Programming & Graphs
  { id: 'climbing-stairs', title: 'Climbing Stairs', category: 'Dynamic Programming & Graphs', difficulty: 'Easy', url: 'https://leetcode.com/problems/climbing-stairs/' },
  { id: 'coin-change', title: 'Coin Change', category: 'Dynamic Programming & Graphs', difficulty: 'Medium', url: 'https://leetcode.com/problems/coin-change/' },
  { id: 'house-robber', title: 'House Robber', category: 'Dynamic Programming & Graphs', difficulty: 'Medium', url: 'https://leetcode.com/problems/house-robber/' },
  { id: 'number-of-islands', title: 'Number of Islands', category: 'Dynamic Programming & Graphs', difficulty: 'Medium', url: 'https://leetcode.com/problems/number-of-islands/' },
  { id: 'course-schedule', title: 'Course Schedule', category: 'Dynamic Programming & Graphs', difficulty: 'Medium', url: 'https://leetcode.com/problems/course-schedule/' }
];

// Curated Ideas & Recommendations to make Daymark the ultimate Coder Hub
const coderSuggestions = [
  {
    id: 'cf-rating',
    title: 'Codeforces Rating & Div. Battle Arena',
    badge: 'Popular',
    desc: 'Link your Codeforces handle to display current rating (Specialist, Expert, Candidate Master) and compete with pod members on contest rating delta.'
  },
  {
    id: 'git-commit-sync',
    title: 'Automated GitHub Commit → Habit Sync',
    badge: 'Recommended',
    desc: 'Connect GitHub webhooks so whenever you git push to any repo, your daily "Project" or "DSA" habit is marked Done automatically with zero friction.'
  },
  {
    id: 'lofi-player',
    title: 'Built-in Lo-Fi Coding Radio & Rain Ambient',
    badge: 'Flow State',
    desc: 'Stream synthwave, lofi beats, and rain sounds directly alongside the focus timer to maintain uninterrupted concentration without leaving the tab.'
  },
  {
    id: 'pod-code-share',
    title: 'Peer Code Review & Snippet Sharing in Pods',
    badge: 'Social',
    desc: 'Share code snippets with syntax highlighting directly to your 5-member study pod to get unblocked on tricky edge cases or time complexity optimizations.'
  },
  {
    id: 'wakatime-sync',
    title: 'VS Code & JetBrains WakaTime Sync',
    badge: 'Productivity',
    desc: 'Pull precise active coding hours from your code editor into Daymark daily metrics so you see exact language and project breakdowns.'
  },
  {
    id: 'company-sheets',
    title: 'FAANG / MAANG Company-Targeted Problem Filters',
    badge: 'Interview Prep',
    desc: 'Toggle between Google, Amazon, Meta, and Microsoft high-frequency tags with time-boxed 45-minute mock interview simulator modes.'
  }
];

const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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

// Gentle Web Audio API chime for reminders, timers, and nudges
function playChime(isNudge = false) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (isNudge) {
      // Friendly double-ping for incoming nudge
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    }
  } catch {}
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

  // 1:00 AM Recap State
  const [recapModalOpen, setRecapModalOpen] = useState(false);
  const [recapData, setRecapData] = useState(null);

  // Core App State
  const [store, setStore] = useState(readStore);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeId, setActiveId] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmTime, setAlarmTime] = useState('06:55');
  const [toast, setToast] = useState('');
  const [view, setView] = useState('Today'); // 'Today' | 'Weekly report' | 'Study pods' | 'Routine settings'
  const [notes, setNotes] = useState('');
  const [dbStatus, setDbStatus] = useState('checking'); // 'connected' | 'local' | 'checking'

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
  const [inputLcUser, setInputLcUser] = useState('');
  const [inputGhUser, setInputGhUser] = useState('');
  const [leetcodeData, setLeetcodeData] = useState(null);
  const [leetcodeLoading, setLeetcodeLoading] = useState(false);
  const [leetcodeError, setLeetcodeError] = useState('');
  const [githubData, setGithubData] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState('');
  const [codingSubTab, setCodingSubTab] = useState('overview'); // 'overview' | 'sheet' | 'contests' | 'suggestions'
  const [contestsList, setContestsList] = useState([]);

  // Problem of the day based on day of year
  const potd = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    return dsaCuratedList[dayOfYear % dsaCuratedList.length];
  }, []);

  // Dynamic schedule state loaded from DB / LocalStorage
  const [schedule, setSchedule] = useState(readSavedSchedule);
  const [editingSchedule, setEditingSchedule] = useState(schedule);

  const todayKey = dateKey(new Date());
  const key = dateKey(selectedDate);
  const isToday = key === todayKey;
  const isPast = key < todayKey;
  const isFuture = key > todayKey;

  const day = store[key] || blankDay();
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

  // Unread nudges poller (checks every 15s)
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
            setSchedule(data);
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
  }, [codingProfile.leetcode_username, codingProfile.github_username]);

  const handleSaveCodingHandles = async (e) => {
    e?.preventDefault?.();
    const updated = {
      ...codingProfile,
      leetcode_username: inputLcUser.trim(),
      github_username: inputGhUser.trim()
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

  useEffect(() => {
    if (!alarmEnabled || !isToday) return;
    const timer = setInterval(() => {
      const now = new Date();
      if (`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` === alarmTime && now.getSeconds() < 2) {
        playChime();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Daymark Reminder', { body: 'Time to start your planned routine.' });
        }
        setToast('Routine reminder triggered');
        setTimeout(() => setToast(''), 3500);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [alarmEnabled, alarmTime, isToday]);

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
    patchDay({ checks: { ...(day.checks || {}), [id]: !day.checks?.[id] } });
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

  const finishSession = () => {
    if (activeId && isToday) {
      const mins = Math.max(1, Math.round(seconds / 60));
      const previous = day.completedMinutes?.[activeId] || 0;
      patchDay({ completedMinutes: { ...(day.completedMinutes || {}), [activeId]: previous + mins } });
      playChime();
    }
    setRunning(false);
    setActiveId(null);
    setSeconds(0);
    setToast('Session logged');
    setTimeout(() => setToast(''), 2200);
  };

  const requestAlarm = async () => {
    if (!isToday) {
      setToast('Alarms can only be adjusted on today’s schedule.');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    if (!('Notification' in window)) {
      setToast('This browser does not support web notifications');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setAlarmEnabled(v => !v);
      setToast(!alarmEnabled ? 'Alarm notifications enabled' : 'Alarm disabled');
    } else {
      setToast('Allow notifications in browser settings');
    }
    setTimeout(() => setToast(''), 3000);
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
    const rows = [['Date', 'Focus Logged', 'DSA', 'Project', 'Reading', 'Revision', 'Breaks', 'Sleep', 'Notes']];
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
    setSchedule(editingSchedule);
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
        setToast('Your personal routine timings were saved to database!');
      } else {
        setToast('Routine saved locally (syncing with database)');
      }
    } catch {
      setToast('Routine saved locally in offline storage');
    }
    setTimeout(() => setToast(''), 3000);
  };

  const resetScheduleToDefaults = async () => {
    setEditingSchedule(defaultSchedule);
    setSchedule(defaultSchedule);
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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Leaf size={19} />
          </div>
          <span>
            daymark<span className="brand-dot">.</span>
          </span>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {[
            ['Today', Sun],
            ['Weekly report', TrendingUp],
            ['Study pods', Users],
            ['Coding', Code2],
            ['Routine settings', Settings2]
          ].map(([label, Icon]) => (
            <button
              key={label}
              className={`nav-item ${view === label ? 'selected' : ''}`}
              onClick={() => setView(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === 'Today' && <span className="nav-indicator" />}
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

      <main className="main-content">
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
              <div style={{ position: 'relative' }}>
                <button
                  className="pod-pill"
                  onClick={() => setPodDropdownOpen(v => !v)}
                  title="Switch or manage study pods"
                >
                  <Users size={14} color="#315b45" />
                  <span>{activeGroup ? activeGroup.name : 'No Pod Selected'}</span>
                  {activeGroup && <span className="pod-pill-count">{activeGroup.member_count}/5</span>}
                  <ChevronDown size={13} />
                </button>

                {podDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '6px',
                      background: '#fff',
                      border: '1px solid #dbe0d7',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      width: '230px',
                      zIndex: 100,
                      padding: '8px 0'
                    }}
                  >
                    <div style={{ padding: '4px 12px 8px', fontSize: '10px', fontWeight: '700', color: '#889289' }}>
                      YOUR STUDY PODS (MAX 5)
                    </div>
                    {groups.map(g => (
                      <button
                        key={g.id}
                        onClick={() => {
                          setActiveGroupId(g.id);
                          localStorage.setItem('daymark-active-group', g.id);
                          setPodDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '8px 14px',
                          border: 0,
                          background: g.id === activeGroupId ? '#f0f5ee' : 'transparent',
                          color: '#28382c',
                          fontSize: '12px',
                          fontWeight: g.id === activeGroupId ? '700' : '500',
                          textAlign: 'left'
                        }}
                      >
                        <span>{g.name}</span>
                        <small style={{ color: '#68776b', fontSize: '10px' }}>{g.member_count}/5</small>
                      </button>
                    ))}
                    <div style={{ borderTop: '1px solid #edf0ea', margin: '6px 0' }} />
                    <button
                      onClick={() => {
                        setPodDropdownOpen(false);
                        setCreatePodModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        width: '100%',
                        padding: '7px 14px',
                        border: 0,
                        background: 'transparent',
                        color: '#315b45',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}
                    >
                      <UserPlus size={13} /> Create New Pod
                    </button>
                    <button
                      onClick={() => {
                        setPodDropdownOpen(false);
                        setJoinPodModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        width: '100%',
                        padding: '7px 14px',
                        border: 0,
                        background: 'transparent',
                        color: '#496b52',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}
                    >
                      <Share2 size={13} /> Join Pod with Code
                    </button>
                  </div>
                )}
              </div>
            )}

            <div
              className="sync-chip"
              title={
                dbStatus === 'connected'
                  ? 'Connected to PostgreSQL database'
                  : 'Operating in local browser storage mode (ready for database link)'
              }
            >
              <span
                className={`status-dot ${
                  dbStatus === 'connected' ? 'synced' : dbStatus === 'checking' ? 'checking' : 'local'
                }`}
              />
              <span>{dbStatus === 'connected' ? 'Cloud Synced' : dbStatus === 'checking' ? 'Checking…' : 'Local Storage'}</span>
            </div>
            <button className="icon-button" title="Export progress as CSV" onClick={exportCsv}>
              <Download size={17} />
            </button>
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
                <button className="jump-today-btn" onClick={() => setSelectedDate(new Date())}>
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
            </section>

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
                    <span className="eyebrow">{isToday ? 'YOUR PLAN' : isPast ? 'PAST LOG' : 'UPCOMING'}</span>
                    <h3>{isToday ? "Today's schedule" : `Schedule for ${prettyDate(selectedDate)}`}</h3>
                  </div>
                  <div className="date-controls">
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
              </section>

              <div className="right-column">
                <section className={`panel habits-panel ${!isToday ? 'read-only' : ''}`}>
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">{isToday ? 'DAILY CHECK-IN' : 'ARCHIVED HABITS'}</span>
                      <h3>Keep yourself honest</h3>
                    </div>
                    <span className="count-badge">
                      {doneCount}/{habits.length}
                    </span>
                  </div>
                  <div className="habit-list">
                    {habits.map(h => (
                      <button
                        key={h.id}
                        className={`habit-row ${day.checks?.[h.id] ? 'checked' : ''} ${!isToday ? 'read-only' : ''}`}
                        onClick={() => toggleHabit(h.id)}
                        title={!isToday ? 'Past and future habits are view-only' : undefined}
                      >
                        <span className="check-box">{day.checks?.[h.id] && <Check size={14} />}</span>
                        <span>{h.label}</span>
                        {!isToday && <Lock size={12} style={{ marginLeft: 'auto', opacity: 0.4 }} />}
                      </button>
                    ))}
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
                </section>

                <section className={`panel alarm-panel ${!isToday ? 'read-only' : ''}`}>
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">GENTLE REMINDER</span>
                      <h3>Routine alarm</h3>
                    </div>
                    <div className="alarm-icon">
                      <AlarmClock size={18} />
                    </div>
                  </div>
                  <p className="muted alarm-copy">
                    {isToday
                      ? 'Get an audio chime & browser reminder when it’s time to begin.'
                      : 'Alarms are active only during today’s session.'}
                  </p>
                  <div className="alarm-controls">
                    <input
                      aria-label="Alarm time"
                      type="time"
                      value={alarmTime}
                      disabled={!isToday}
                      onChange={e => setAlarmTime(e.target.value)}
                    />
                    <button
                      className={`toggle ${alarmEnabled && isToday ? 'on' : ''}`}
                      onClick={requestAlarm}
                      disabled={!isToday}
                      aria-label="Toggle alarm"
                    >
                      <span />
                    </button>
                  </div>
                  <div className="alarm-foot">
                    <span className={`status-dot ${alarmEnabled && isToday ? '' : 'inactive'}`} />
                    {isToday
                      ? alarmEnabled
                        ? 'Notifications enabled'
                        : 'Browser permission required'
                      : 'Available on Today'}
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
                <Users size={40} color="#315b45" style={{ marginBottom: '12px' }} />
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
                {/* Active Pod Banner & Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span className="eyebrow">ACCOUNTABILITY POD</span>
                    <h3 style={{ font: '700 22px Manrope', margin: '2px 0 4px', color: '#1f2e24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {activeGroup ? activeGroup.name : 'Select or Create a Pod'}
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

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {activeGroup && (
                      <button className="recap-btn" onClick={openRecapModal}>
                        <Award size={15} /> 1:00 AM Recap
                      </button>
                    )}
                    <button className="save-schedule-btn" onClick={() => setCreatePodModalOpen(true)}>
                      <UserPlus size={15} /> Create Pod
                    </button>
                    <button className="reset-schedule-btn" onClick={() => setJoinPodModalOpen(true)}>
                      <Share2 size={15} /> Join with Code
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
                      <strong style={{ fontSize: '18px', color: '#44664e' }}>1:00 AM Daily</strong>
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
                                {member.username} {isSelf && <span style={{ color: '#527c5f', fontSize: '11px' }}>(You)</span>}
                                {member.rank === 1 && member.points > 0 && (
                                  <span style={{ fontSize: '10px', color: '#b45309', fontWeight: '800' }}>👑 POD LEADER</span>
                                )}
                              </strong>
                              <small>
                                {Math.floor(member.total_minutes / 60)}h {member.total_minutes % 60}m logged · {member.habits_done}/6 habits
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
                    setCodingModalOpen(true);
                  }}
                >
                  <Terminal size={15} /> {codingProfile.leetcode_username || codingProfile.github_username ? 'Edit Handles' : 'Connect LeetCode / GitHub'}
                </button>
                {(codingProfile.leetcode_username || codingProfile.github_username) && (
                  <button
                    className="reset-schedule-btn"
                    onClick={() => {
                      refreshLeetcode();
                      refreshGithub();
                      setToast('Refreshing stats…');
                      setTimeout(() => setToast(''), 1500);
                    }}
                    title="Refresh live stats"
                  >
                    <RefreshCw size={14} className={leetcodeLoading || githubLoading ? 'spin-anim' : ''} /> Refresh
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Tabs: Overview, Top Patterns Sheet, Contests, Suggestions */}
            <div className="coding-subtabs">
              {[
                ['overview', 'Stats & POTD', Flame],
                ['sheet', 'Interview Patterns (Blind 75)', CheckCircle2],
                ['contests', 'Contest Calendar', Trophy],
                ['suggestions', 'Coder Hub Ideas', Sparkles]
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
                </button>
              ))}
            </div>

            {/* SUBTAB 1: OVERVIEW */}
            {codingSubTab === 'overview' && (
              <div className="coding-overview-grid">
                {/* 1. Daily DSA Problem of the Day */}
                <div className="panel dsa-potd-card">
                  <div className="potd-badge-row">
                    <span className="potd-chip">
                      <Flame size={13} color="#f59e0b" /> PROBLEM OF THE DAY
                    </span>
                    <span className={`diff-badge ${potd.difficulty.toLowerCase()}`}>{potd.difficulty}</span>
                    <span className="topic-pill">{potd.category}</span>
                  </div>
                  <div className="potd-body">
                    <h4>{potd.title}</h4>
                    <p>
                      Solve today's high-frequency interview problem to earn +50 Grind Points toward your daily pod standing!
                    </p>
                  </div>
                  <div className="potd-actions">
                    <a
                      href={potd.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="potd-solve-btn"
                    >
                      <ExternalLink size={14} /> Solve on LeetCode
                    </a>
                    <button
                      className={`potd-check-btn ${codingProfile.solved_dsa_ids?.includes(potd.id) ? 'done' : ''}`}
                      onClick={() => toggleDsaSolved(potd.id, true)}
                    >
                      <Check size={14} />
                      {codingProfile.solved_dsa_ids?.includes(potd.id) ? 'Solved Today (+50 GP)' : 'Mark as Solved'}
                    </button>
                  </div>
                </div>

                {/* 2. LeetCode Performance Card */}
                <div className="panel coding-metric-panel">
                  <div className="coding-panel-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="platform-icon lc">LC</span>
                      <div>
                        <strong>LeetCode Stats</strong>
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
                      <Terminal size={32} color="#8a948c" />
                      <p>Connect your LeetCode username to see total solved, Easy/Medium/Hard breakdown, and rank.</p>
                      <button
                        className="save-schedule-btn"
                        onClick={() => {
                          setInputLcUser('');
                          setInputGhUser(codingProfile.github_username || '');
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
                              <Trophy size={12} color="#f59e0b" /> Rank #{leetcodeData.ranking.toLocaleString()}
                            </span>
                          )}
                          <span className="lc-acc-badge">
                            Acc: {leetcodeData.acceptanceRate}
                          </span>
                        </div>
                      </div>

                      {/* Difficulty Progress Bars */}
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

                {/* 3. GitHub Activity & Heatmap Card */}
                <div className="panel coding-metric-panel">
                  <div className="coding-panel-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="platform-icon gh"><Github size={15} /></span>
                      <div>
                        <strong>GitHub Profile</strong>
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
                      <Github size={32} color="#8a948c" />
                      <p>Connect your GitHub handle to see your commit streak heatmap and public projects.</p>
                      <button
                        className="save-schedule-btn"
                        onClick={() => {
                          setInputLcUser(codingProfile.leetcode_username || '');
                          setInputGhUser('');
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

                      {/* Live Commit Consistency Heatmap */}
                      <div className="gh-chart-container">
                        <div className="gh-chart-title">
                          <GitBranch size={13} />
                          <span>Annual Contribution Heatmap</span>
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

                      {/* Top Repositories */}
                      {githubData.repos && githubData.repos.length > 0 && (
                        <div className="gh-repos-list">
                          <div className="gh-chart-title" style={{ marginTop: '12px' }}>
                            <Star size={13} />
                            <span>Recent Public Repositories</span>
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
              </div>
            )}

            {/* SUBTAB 2: INTERVIEW PATTERNS / BLIND 75 SHEET */}
            {codingSubTab === 'sheet' && (
              <div className="panel coding-sheet-panel">
                <div className="sheet-header">
                  <div>
                    <span className="eyebrow">ESSENTIAL INTERVIEW PATTERNS</span>
                    <h3>Curated Blind 75 / Top Patterns Checklist</h3>
                    <p className="muted">
                      Master the highest-yield DSA patterns tested in top tech engineering interviews.
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

                {/* Categorized Problems */}
                {['Arrays & Hashing', 'Two Pointers & Sliding Window', 'Binary Search', 'Linked List', 'Trees & BST', 'Dynamic Programming & Graphs'].map(cat => {
                  const items = dsaCuratedList.filter(p => p.category === cat);
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
                              <span className="pattern-title">{p.title}</span>
                              <span className={`diff-pill ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
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

            {/* SUBTAB 3: UPCOMING CONTESTS */}
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

            {/* SUBTAB 4: CODER HUB SUGGESTIONS & IDEAS */}
            {codingSubTab === 'suggestions' && (
              <div className="panel coding-suggestions-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">ROADMAP & ENHANCEMENTS</span>
                    <h3>Ideas to Make Daymark the Ultimate Coder Hub</h3>
                    <p className="muted">
                      Here are high-impact features specifically designed for developers and competitive programmers.
                    </p>
                  </div>
                  <span className="count-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={13} color="#d97706" /> 6 Ideas
                  </span>
                </div>

                <div className="suggestions-grid">
                  {coderSuggestions.map(s => (
                    <div className="suggestion-card" key={s.id}>
                      <div className="suggestion-badge-row">
                        <span className="suggestion-badge">{s.badge}</span>
                      </div>
                      <h4>{s.title}</h4>
                      <p>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {view === 'Routine settings' && (
          <section className="panel settings-panel">
            <span className="eyebrow">ROUTINE CONFIGURATION</span>
            <h3>Edit Routine Timings & Blocks</h3>
            <p className="muted">
              Customize the start time, end time, and titles of your daily schedule. Any changes made here are saved directly to your PostgreSQL database and will update your daily tracker instantly.
            </p>

            <div className="db-status-banner">
              <Database size={20} color={dbStatus === 'connected' ? '#315b45' : '#8b6c4d'} />
              <div>
                <strong>
                  Database Status: {dbStatus === 'connected' ? 'Connected (PostgreSQL Cloud)' : 'Local Browser Storage Fallback'}
                </strong>
                <p>
                  {dbStatus === 'connected'
                    ? 'Routine schedule updates are synchronized in real-time to the routine_settings table in PostgreSQL.'
                    : 'The webapp is currently storing your custom schedule in local browser storage until PostgreSQL is connected.'}
                </p>
              </div>
            </div>

            {/* Save & Reset Actions Bar */}
            <div className="settings-actions">
              <button className="save-schedule-btn" onClick={saveScheduleChanges}>
                <Save size={15} /> Save Routine Changes to Database
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
                        {Math.floor(m.total_minutes / 60)}h {m.total_minutes % 60}m · {m.habits_done}/6 habits
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
                    <p style={{ margin: 0, fontStyle: m.notes ? 'normal' : 'italic', color: m.notes ? '#334437' : '#99a39a' }}>
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

              <button type="submit" className="form-submit-btn">
                Save Handles & Fetch Stats
              </button>
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
