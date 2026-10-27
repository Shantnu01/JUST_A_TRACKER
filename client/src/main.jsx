import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlarmClock,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  Coffee,
  Database,
  Download,
  Leaf,
  Lock,
  Menu,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings2,
  Sun,
  Target,
  TrendingUp,
  Utensils,
  X
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

function readSavedSchedule() {
  try {
    const raw = localStorage.getItem('daymark-schedule');
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

// Gentle Web Audio API chime for reminders and timers
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch {
    // Audio context may require user gesture on some browsers
  }
}

function App() {
  const [store, setStore] = useState(readStore);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeId, setActiveId] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmTime, setAlarmTime] = useState('06:55');
  const [toast, setToast] = useState('');
  const [view, setView] = useState('Today');
  const [notes, setNotes] = useState('');
  const [dbStatus, setDbStatus] = useState('checking'); // 'connected' | 'local' | 'checking'

  // Dynamic schedule state loaded from DB / LocalStorage
  const [schedule, setSchedule] = useState(readSavedSchedule);
  const [editingSchedule, setEditingSchedule] = useState(schedule);

  const todayKey = dateKey(new Date());
  const key = dateKey(selectedDate);
  const isToday = key === todayKey;
  const isPast = key < todayKey;
  const isFuture = key > todayKey;

  const day = store[key] || blankDay();

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

  // Load custom schedule from database on startup
  useEffect(() => {
    let mounted = true;
    const fetchScheduleFromDb = async () => {
      try {
        const response = await fetch(`${API}/settings/schedule`);
        if (response.ok) {
          const data = await response.json();
          if (mounted && Array.isArray(data) && data.length > 0) {
            setSchedule(data);
            localStorage.setItem('daymark-schedule', JSON.stringify(data));
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
  }, []);

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

    fetch(`${API}/days/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch(`${API}/days/${key}`);
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
  }, [key]);

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
    const rows = [['Date', 'DSA', 'Project', 'Reading', 'Revision', 'Breaks', 'Sleep', 'Notes']];
    Object.keys(store)
      .sort()
      .forEach(k => {
        const d = store[k];
        rows.push([
          k,
          ...habits.map(h => (d.checks?.[h.id] ? 'Done' : 'Not done')),
          (d.notes || '').replaceAll('"', '""')
        ]);
      });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'daymark-progress.csv';
    a.click();
    URL.revokeObjectURL(a.href);
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
    localStorage.setItem('daymark-schedule', JSON.stringify(editingSchedule));
    try {
      const res = await fetch(`${API}/settings/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSchedule)
      });
      if (res.ok) {
        setDbStatus('connected');
        setToast('Routine timings updated and saved to PostgreSQL database!');
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
    localStorage.setItem('daymark-schedule', JSON.stringify(defaultSchedule));
    try {
      await fetch(`${API}/settings/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultSchedule)
      });
      setToast('Routine reset to default 7 AM - 9 PM schedule');
    } catch {
      setToast('Routine reset locally');
    }
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
            </button>
          ))}
        </nav>

        {/* Daily Inspiring Quote (Changes Daily) */}
        <div className="sidebar-bottom">
          <div className="quote-mark">“</div>
          <p>{todayQuote.quote}</p>
          <span>{todayQuote.author.toUpperCase()}</span>
        </div>

        <div className="profile">
          <div className="avatar">D</div>
          <div>
            <strong>My workspace</strong>
            <small>Personal routine</small>
          </div>
          <Menu size={17} className="profile-menu" />
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
                : 'Customize your routine schedule'}
            </h1>
          </div>
          <div className="top-actions">
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
