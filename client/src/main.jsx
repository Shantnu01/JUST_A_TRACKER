import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlarmClock,
  ArrowUpRight,
  BookOpen,
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
  Menu,
  Moon,
  Pause,
  Play,
  RotateCcw,
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

const schedule = [
  { id: 'dsa', start: '07:00', end: '10:00', title: 'DSA practice', subtitle: 'Patterns, problem solving & complexity', hours: 3, kind: 'focus', icon: Code2, tone: 'sage' },
  { id: 'break1', start: '10:00', end: '11:00', title: 'Morning break', subtitle: 'Breakfast, walk, reset', hours: 1, kind: 'break', icon: Coffee, tone: 'sand' },
  { id: 'project1', start: '11:00', end: '14:00', title: 'Project development', subtitle: 'Build core features and architecture', hours: 3, kind: 'focus', icon: Code2, tone: 'blue' },
  { id: 'break2', start: '14:00', end: '15:00', title: 'Lunch break', subtitle: 'Eat, move, clear your head', hours: 1, kind: 'break', icon: Utensils, tone: 'sand' },
  { id: 'project2', start: '15:00', end: '18:00', title: 'Project development', subtitle: 'Testing, debugging & shipping', hours: 3, kind: 'focus', icon: Code2, tone: 'blue' },
  { id: 'reading', start: '18:00', end: '20:00', title: 'System design reading', subtitle: 'Read, take notes, connect to your project', hours: 2, kind: 'focus', icon: BookOpen, tone: 'lilac' },
  { id: 'revision', start: '20:00', end: '21:00', title: 'Daily revision', subtitle: 'Recall key ideas and plan tomorrow', hours: 1, kind: 'focus', icon: RotateCcw, tone: 'rose' },
];

const habits = [
  { id: 'dsa', label: 'DSA · 3 hours' },
  { id: 'project', label: 'Project · 6 hours' },
  { id: 'reading', label: 'Reading · 2 hours' },
  { id: 'revision', label: 'Revision · 1 hour' },
  { id: 'breaks', label: 'Take both breaks' },
  { id: 'sleep', label: 'Sleep 7–8 hours' },
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

  const key = dateKey(selectedDate);
  const day = store[key] || blankDay();

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

  const patchDay = (patch) => {
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
    if (!alarmEnabled) return;
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
  }, [alarmEnabled, alarmTime]);

  const doneCount = habits.filter(h => day.checks[h.id]).length;
  const completion = Math.round((doneCount / habits.length) * 100);
  const completedMinutes = Object.values(day.completedMinutes || {}).reduce((a, b) => a + b, 0);
  const focusMinutes = Math.min(720, completedMinutes);

  const current = schedule.find(item => {
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

  const toggleHabit = (id) =>
    patchDay({ checks: { ...(day.checks || {}), [id]: !day.checks?.[id] } });

  const startSession = (id) => {
    setActiveId(id);
    setSeconds(0);
    setRunning(true);
    setToast('Focus session started');
    setTimeout(() => setToast(''), 2200);
  };

  const finishSession = () => {
    if (activeId) {
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
        <div className="sidebar-bottom">
          <div className="quote-mark">“</div>
          <p>Small, consistent effort compounds into extraordinary results.</p>
          <span>YOUR DAILY PRACTICE</span>
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
                ? 'A calmer way to make progress'
                : view === 'Weekly report'
                ? 'Your progress, at a glance'
                : 'Make the routine work for you'}
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
              <span className="status-dot" />
              {prettyDate()}
            </div>
          </div>
        </header>

        {view === 'Today' && (
          <>
            <section className="welcome-row">
              <div>
                <p className="muted">{prettyDate(selectedDate)}</p>
                <h2>
                  One day at a time<span>.</span>
                </h2>
                <p className="subhead">Show up, focus on the next block, and let the progress add up.</p>
              </div>
              <div className="streak-card">
                <div className="streak-icon">
                  <Target size={19} />
                </div>
                <div>
                  <small>DAILY COMPLETION</small>
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
                detail="Tracked session time"
                icon={Clock3}
                tone="sage"
              />
              <Metric
                label="Planned focus"
                value="12 hours"
                detail="DSA, project, reading, revision"
                icon={Target}
                tone="blue"
              />
              <Metric
                label="Current block"
                value={current?.title || 'Between sessions'}
                detail={current ? `${current.start} – ${current.end}` : 'Follow your planned schedule'}
                icon={Sun}
                tone="sand"
              />
            </section>

            <div className="content-grid">
              <section className="panel schedule-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">YOUR PLAN</span>
                    <h3>Today's schedule</h3>
                  </div>
                  <div className="date-controls">
                    <button className="icon-button small" onClick={() => shiftDate(-1)}>
                      <ChevronLeft size={16} />
                    </button>
                    <button className="today-button" onClick={() => setSelectedDate(new Date())}>
                      Today
                    </button>
                    <button className="icon-button small" onClick={() => shiftDate(1)}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="schedule-list">
                  {schedule.map(item => {
                    const Icon = item.icon;
                    const isActive = activeId === item.id;
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
                            <span className="duration-pill">{item.hours}h</span>
                          </div>
                          <p>{item.subtitle}</p>
                          {logged > 0 && (
                            <span className="logged-label">
                              {Math.floor(logged / 60)}h {logged % 60}m logged
                            </span>
                          )}
                        </div>
                        <div className="event-action">
                          {isActive ? (
                            <button className="action-button running" onClick={() => setRunning(v => !v)}>
                              {running ? <Pause size={15} /> : <Play size={15} />}
                              <span>{running ? 'Pause' : 'Resume'}</span>
                            </button>
                          ) : (
                            <button className="action-button" onClick={() => startSession(item.id)} title="Start a timed session">
                              <Play size={15} />
                              <span>Start</span>
                            </button>
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
                      {activeId
                        ? `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(
                            Math.floor(seconds / 60) % 60
                          ).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
                        : 'Ready when you are'}
                    </span>
                  </div>
                  <span className="muted small-text">50 min focus · 10 min reset</span>
                </div>
              </section>

              <div className="right-column">
                <section className="panel habits-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">DAILY CHECK-IN</span>
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
                        className={`habit-row ${day.checks?.[h.id] ? 'checked' : ''}`}
                        onClick={() => toggleHabit(h.id)}
                      >
                        <span className="check-box">{day.checks?.[h.id] && <Check size={14} />}</span>
                        <span>{h.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="habit-progress">
                    <div className="progress-caption">
                      <span>Today's consistency</span>
                      <strong>{completion}%</strong>
                    </div>
                    <div className="progress-track">
                      <div style={{ width: `${completion}%` }} />
                    </div>
                  </div>
                </section>

                <section className="panel alarm-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">GENTLE REMINDER</span>
                      <h3>Routine alarm</h3>
                    </div>
                    <div className="alarm-icon">
                      <AlarmClock size={18} />
                    </div>
                  </div>
                  <p className="muted alarm-copy">Get an audio chime & browser reminder when it's time to begin.</p>
                  <div className="alarm-controls">
                    <input
                      aria-label="Alarm time"
                      type="time"
                      value={alarmTime}
                      onChange={e => setAlarmTime(e.target.value)}
                    />
                    <button
                      className={`toggle ${alarmEnabled ? 'on' : ''}`}
                      onClick={requestAlarm}
                      aria-label="Toggle alarm"
                    >
                      <span />
                    </button>
                  </div>
                  <div className="alarm-foot">
                    <span className={`status-dot ${alarmEnabled ? '' : 'inactive'}`} />
                    {alarmEnabled ? 'Notifications enabled' : 'Browser permission required'}
                  </div>
                </section>

                <section className="note-panel">
                  <div className="note-title">
                    <BookOpen size={17} />
                    <strong>End-of-day notes</strong>
                  </div>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="What did you learn? What did you ship? What needs attention tomorrow?"
                  />
                  <button onClick={saveNotes}>
                    Save notes <ArrowUpRight size={15} />
                  </button>
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
            <span className="eyebrow">YOUR BASELINE</span>
            <h3>Keep the plan simple</h3>
            <p className="muted">
              Your routine is set to the schedule you defined. Edit alarm time on the Today page.
            </p>

            <div className="db-status-banner">
              <Database size={20} color={dbStatus === 'connected' ? '#315b45' : '#8b6c4d'} />
              <div>
                <strong>
                  Database Status: {dbStatus === 'connected' ? 'Connected (PostgreSQL Cloud)' : 'Local Browser Storage Fallback'}
                </strong>
                <p>
                  {dbStatus === 'connected'
                    ? 'All daily check-ins, focus minutes, alarms, and notes are persisting directly to PostgreSQL.'
                    : 'The webapp is currently using local browser storage and is ready for your PostgreSQL database link. As soon as you configure DATABASE_URL in server/.env, it will automatically connect and create required tables.'}
                </p>
              </div>
            </div>

            <div className="settings-summary">
              {schedule.map(item => (
                <div key={item.id}>
                  <span>
                    {item.start} – {item.end}
                  </span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.hours} hour{item.hours > 1 ? 's' : ''}
                  </small>
                </div>
              ))}
            </div>
            <div className="settings-note">
              <Moon size={18} />
              <span>Protect 7–8 hours of sleep. This schedule ends at 9 PM, so set a consistent wind-down time.</span>
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
