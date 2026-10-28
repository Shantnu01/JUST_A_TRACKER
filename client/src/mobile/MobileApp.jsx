import React, { useState, useMemo } from 'react';
import './mobile.css';
import {
  Sun,
  CheckCircle2,
  Users,
  GitBranch,
  User,
  Play,
  Pause,
  Check,
  Flame,
  Clock,
  AlarmClock,
  Sparkles,
  Volume2,
  Radio,
  LogOut,
  LogIn,
  ChevronRight,
  ShieldCheck,
  Send,
  Trash2,
  Monitor
} from 'lucide-react';

export default function MobileApp(props) {
  const {
    user,
    token,
    setAuthModalOpen,
    logout,
    day,
    habits,
    toggleHabit,
    schedule,
    activeId,
    seconds,
    running,
    startSession,
    pauseSession,
    finishSession,
    current,
    completion,
    doneCount,
    focusMinutes,
    totalPlannedFocusHours,
    alarms,
    toggleAlarm,
    testAlarmSound,
    activePod,
    podLeaderboard,
    podMembers,
    podRadar,
    sendNudge,
    nudgeCooldownRemaining,
    podNotice,
    leavePod,
    deletePod,
    onSwitchToDesktop,
    dbStatus
  } = props;

  const [activeTab, setActiveTab] = useState('today');

  // Format MM:SS for focus timer
  const formattedTimer = useMemo(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [seconds]);

  // Current date formatted for mobile
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(new Date());
  }, []);

  return (
    <div className="mobile-viewport-root">
      {/* Top Mobile App Bar */}
      <header className="m-app-header">
        <div className="m-header-left">
          <div className="m-header-logo">
            <Sparkles size={17} />
          </div>
          <div>
            <h1 className="m-header-title">Daymark</h1>
            <span className="m-header-sub">{formattedDate}</span>
          </div>
        </div>

        <div className="m-header-actions">
          <button
            type="button"
            className="m-icon-btn"
            onClick={testAlarmSound}
            title="Test alarm sound"
            aria-label="Test alarm sound"
          >
            <AlarmClock size={16} />
          </button>
          <button
            type="button"
            className="m-icon-btn"
            onClick={onSwitchToDesktop}
            title="Switch to Desktop View"
            aria-label="Switch to Desktop View"
          >
            <Monitor size={16} />
          </button>
        </div>
      </header>

      {/* Main Tab Views */}
      <main className="m-tab-container">
        {/* ================================================================= */}
        {/* TAB 1: TODAY (Routine & Active Session)                           */}
        {/* ================================================================= */}
        {activeTab === 'today' && (
          <div>
            {/* Active Focus / Now Hero Card */}
            <div className="m-hero-card">
              <div className="m-hero-glow" />
              <div className="m-hero-tag">
                <Sun size={12} />
                <span>{current ? 'In Progress' : 'Ready For Deep Focus'}</span>
              </div>
              <h2 className="m-hero-title">
                {current ? current.title : (activeId ? 'Custom Focus Session' : 'Start Next Session')}
              </h2>
              <p className="m-hero-desc">
                {current ? current.subtitle : 'Lock in without distractions and build momentum.'}
              </p>

              <div className="m-hero-timer-row">
                <div className="m-timer-digits">{formattedTimer}</div>
                <div className="m-timer-controls">
                  {running ? (
                    <>
                      <button
                        type="button"
                        className="m-btn-primary"
                        onClick={pauseSession}
                      >
                        <Pause size={14} /> Pause
                      </button>
                      <button
                        type="button"
                        className="m-btn-primary m-btn-finish"
                        onClick={finishSession}
                      >
                        <Check size={14} /> Done
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="m-btn-primary"
                      onClick={() => startSession(current ? current.id : 'focus')}
                    >
                      <Play size={14} /> {seconds > 0 ? 'Resume' : 'Start Focus'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="m-metrics-row">
              <div className="m-metric-box">
                <div className="m-metric-header">
                  <span className="m-metric-label">Focus Logged</span>
                  <Clock size={14} color="#3b82f6" />
                </div>
                <div className="m-metric-val">{Math.round(focusMinutes / 60 * 10) / 10}h</div>
                <span className="m-metric-foot">of {totalPlannedFocusHours}h planned</span>
              </div>

              <div className="m-metric-box">
                <div className="m-metric-header">
                  <span className="m-metric-label">Habits Done</span>
                  <CheckCircle2 size={14} color="#10b981" />
                </div>
                <div className="m-metric-val">{completion}%</div>
                <span className="m-metric-foot">{doneCount} of {habits.length} habits</span>
              </div>
            </div>

            {/* Daily Schedule Timeline */}
            <div className="m-section-header">
              <h3 className="m-section-title">
                <span>Today's Routine</span>
                <span className="m-badge">{schedule.length} blocks</span>
              </h3>
            </div>

            <div className="m-schedule-list">
              {schedule.map((item) => {
                const isActive = (current && current.id === item.id) || activeId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`m-schedule-card ${isActive ? 'is-active' : ''}`}
                  >
                    <div className="m-sched-time-col">
                      <span className="m-sched-start">{item.start}</span>
                      <span className="m-sched-end">{item.end}</span>
                    </div>

                    <div className="m-sched-body">
                      <h4 className="m-sched-title">{item.title}</h4>
                      <div className="m-sched-sub">{item.subtitle}</div>
                    </div>

                    <button
                      type="button"
                      className={`m-sched-action-btn ${isActive && running ? 'running' : ''}`}
                      onClick={() => {
                        if (isActive && running) {
                          pauseSession();
                        } else {
                          startSession(item.id);
                        }
                      }}
                      title={isActive && running ? 'Pause' : 'Start this block'}
                    >
                      {isActive && running ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Routine Alarms (Native Background Protected) */}
            <div className="m-section-header" style={{ marginTop: '24px' }}>
              <h3 className="m-section-title">
                <AlarmClock size={16} color="#f59e0b" />
                <span>Routine Alarms</span>
              </h3>
            </div>

            <div>
              {alarms && alarms.map((alarm) => (
                <div key={alarm.id} className="m-alarm-item">
                  <div className="m-alarm-time-label">
                    <span className="m-alarm-time">{alarm.time}</span>
                    <span className="m-alarm-title">{alarm.label || 'Routine alert'}</span>
                  </div>

                  <div
                    className={`m-toggle-switch ${alarm.enabled ? 'is-on' : ''}`}
                    onClick={() => toggleAlarm(alarm.id)}
                  >
                    <div className="m-toggle-thumb" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: HABITS (Clean Checklist)                                   */}
        {/* ================================================================= */}
        {activeTab === 'habits' && (
          <div>
            <div className="m-section-header">
              <h3 className="m-section-title">
                <span>Daily Commitments</span>
                <span className="m-badge">{doneCount}/{habits.length} Done</span>
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {habits.map((habit) => {
                const isChecked = !!(day.checks && day.checks[habit.id]);
                return (
                  <div
                    key={habit.id}
                    className={`m-habit-card ${isChecked ? 'is-checked' : ''}`}
                    onClick={() => toggleHabit(habit.id)}
                  >
                    <div className="m-habit-checkbox">
                      <Check size={16} strokeWidth={3} />
                    </div>
                    <span className="m-habit-name">{habit.name}</span>
                    <span className="m-habit-streak">
                      <Flame size={13} fill="#f59e0b" color="#f59e0b" />
                      {habit.target || 'Daily'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: STUDY PODS                                                 */}
        {/* ================================================================= */}
        {activeTab === 'pods' && (
          <div>
            <div className="m-pod-banner">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '700', textTransform: 'uppercase' }}>
                    Active Study Pod
                  </span>
                  <h2 style={{ fontSize: '18px', margin: '4px 0', color: '#fff' }}>
                    {activePod ? activePod.name : 'Public Study Pod'}
                  </h2>
                </div>
                <div style={{ background: 'rgba(139, 92, 246, 0.25)', padding: '6px 10px', borderRadius: '20px', fontSize: '11px', color: '#c4b5fd', fontWeight: '700' }}>
                  {podMembers ? podMembers.length : 1} Members
                </div>
              </div>

              {podNotice && (
                <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', color: '#e2e8f0' }}>
                  📢 {podNotice}
                </div>
              )}

              <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="m-btn-primary"
                  onClick={sendNudge}
                  disabled={nudgeCooldownRemaining > 0}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Send size={13} />
                  {nudgeCooldownRemaining > 0
                    ? `Nudge in ${Math.ceil(nudgeCooldownRemaining / 60)}m`
                    : 'Nudge Pod'}
                </button>

                {activePod && (
                  <button
                    type="button"
                    className="m-pill-btn"
                    onClick={leavePod}
                    style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                  >
                    Leave Pod
                  </button>
                )}
              </div>
            </div>

            <div className="m-section-header">
              <h3 className="m-section-title">
                <span>Pod Leaderboard</span>
              </h3>
            </div>

            <div>
              {podLeaderboard && podLeaderboard.map((member, idx) => {
                const isSelf = user && member.id === user.id;
                return (
                  <div
                    key={member.id || idx}
                    className={`m-pod-leaderboard-row ${isSelf ? 'is-self' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', width: '16px' }}>
                        #{idx + 1}
                      </span>
                      <div>
                        <strong style={{ fontSize: '13px', color: '#fff', display: 'block' }}>
                          {member.username || member.name || 'Anonymous'}
                          {isSelf && ' (You)'}
                        </strong>
                        <small style={{ fontSize: '10px', color: '#64748b' }}>
                          {member.status || 'Studying'}
                        </small>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: '14px', color: '#10b981' }}>
                        {member.focus_minutes || member.focusMinutes || 0}m
                      </strong>
                      <small style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>
                        {member.streak_days || member.streak || 0}d streak
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: ROADMAPS                                                   */}
        {/* ================================================================= */}
        {activeTab === 'roadmaps' && (
          <div>
            <div className="m-section-header">
              <h3 className="m-section-title">
                <GitBranch size={16} color="#3b82f6" />
                <span>Learning Curriculum</span>
              </h3>
            </div>

            <div style={{ background: 'var(--m-surface)', border: '1px solid var(--m-border)', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#60a5fa' }}>CURRENT TRACK</span>
                <span className="m-badge">Active</span>
              </div>
              <h3 style={{ fontSize: '17px', margin: '0 0 6px', color: '#fff' }}>NLP & Deep Learning Foundations</h3>
              <p style={{ fontSize: '12px', color: 'var(--m-text-secondary)', margin: '0 0 14px', lineHeight: 1.5 }}>
                Mastering tokenization, attention heads, transformer architectures, and fine-tuning pipelines.
              </p>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: '68%', height: '100%', background: '#3b82f6', borderRadius: '10px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--m-text-muted)' }}>
                <span>Stage 3 of 5</span>
                <span>68% Complete</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['Stage 1: Python, PyTorch & Math Basics (Completed)', 'Stage 2: Embeddings, Word2Vec & RNNs (Completed)', 'Stage 3: Transformers & Self-Attention (In Progress)', 'Stage 4: LLM Pretraining & SFT Fine-tuning (Upcoming)', 'Stage 5: Production Agentic Deployments (Upcoming)'].map((stg, i) => (
                <div key={i} style={{ background: 'var(--m-surface)', border: '1px solid var(--m-border)', borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: i <= 2 ? '#f1f5f9' : '#64748b' }}>
                  {stg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: PROFILE & SETTINGS                                         */}
        {/* ================================================================= */}
        {activeTab === 'profile' && (
          <div>
            <div style={{ background: 'var(--m-surface)', border: '1px solid var(--m-border)', borderRadius: '18px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '18px', fontWeight: '800' }}>
                  {user ? (user.username ? user.username.charAt(0).toUpperCase() : 'U') : 'G'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', margin: 0, color: '#fff' }}>
                    {user ? user.username : 'Guest Mode'}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--m-text-muted)' }}>
                    {user ? 'Cloud Database Synced' : 'Data stored locally on device'}
                  </span>
                </div>
                {user ? (
                  <button
                    type="button"
                    className="m-icon-btn"
                    onClick={logout}
                    title="Log out"
                  >
                    <LogOut size={16} color="#f87171" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="m-btn-primary"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    <LogIn size={14} /> Log In
                  </button>
                )}
              </div>
            </div>

            <div className="m-section-header">
              <h3 className="m-section-title">
                <span>Display & Preferences</span>
              </h3>
            </div>

            <div style={{ background: 'var(--m-surface)', border: '1px solid var(--m-border)', borderRadius: '14px', overflow: 'hidden' }}>
              <div
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--m-border)', cursor: 'pointer' }}
                onClick={onSwitchToDesktop}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Monitor size={16} color="#3b82f6" />
                  <span style={{ fontSize: '14px', color: '#fff' }}>Switch to Full Desktop UI</span>
                </div>
                <ChevronRight size={16} color="#64748b" />
              </div>

              <div
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={testAlarmSound}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Volume2 size={16} color="#10b981" />
                  <span style={{ fontSize: '14px', color: '#fff' }}>Test Native Sound & Vibrate</span>
                </div>
                <ChevronRight size={16} color="#64748b" />
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: 'var(--m-text-muted)' }}>
              Daymark Routine Tracker v1.0.0 • Mobile Engine
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <nav className="m-bottom-nav">
        <button
          type="button"
          className={`m-nav-tab ${activeTab === 'today' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <div className="m-nav-icon-wrap">
            <Sun size={20} />
            {running && <span className="m-nav-dot" />}
          </div>
          <span className="m-nav-label">Today</span>
        </button>

        <button
          type="button"
          className={`m-nav-tab ${activeTab === 'habits' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('habits')}
        >
          <div className="m-nav-icon-wrap">
            <CheckCircle2 size={20} />
          </div>
          <span className="m-nav-label">Habits</span>
        </button>

        <button
          type="button"
          className={`m-nav-tab ${activeTab === 'pods' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('pods')}
        >
          <div className="m-nav-icon-wrap">
            <Users size={20} />
          </div>
          <span className="m-nav-label">Pods</span>
        </button>

        <button
          type="button"
          className={`m-nav-tab ${activeTab === 'roadmaps' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('roadmaps')}
        >
          <div className="m-nav-icon-wrap">
            <GitBranch size={20} />
          </div>
          <span className="m-nav-label">Roadmaps</span>
        </button>

        <button
          type="button"
          className={`m-nav-tab ${activeTab === 'profile' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <div className="m-nav-icon-wrap">
            <User size={20} />
          </div>
          <span className="m-nav-label">Profile</span>
        </button>
      </nav>
    </div>
  );
}
