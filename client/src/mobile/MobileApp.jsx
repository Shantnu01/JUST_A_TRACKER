import React, { useState, useMemo, useEffect } from 'react';
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
  VolumeX,
  LogOut,
  LogIn,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Send,
  Monitor,
  Headphones,
  Target
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
    dbStatus,
    focusSoundType,
    handleSelectSound,
    focusSoundVolume,
    setFocusSoundVolume,
    curriculumSubject,
    activeCurriculum,
    openSubjectCurriculum,
    columnStyle
  } = props;

  const [activeTab, setActiveTab] = useState('today');
  const [habitFilter, setHabitFilter] = useState('all'); // 'all' | 'pending' | 'done'
  const [expandedStageId, setExpandedStageId] = useState(null);
  const [alarmsExpanded, setAlarmsExpanded] = useState(false);
  const [soundscapeExpanded, setSoundscapeExpanded] = useState(false);
  const [localCooldown, setLocalCooldown] = useState(nudgeCooldownRemaining || 0);

  // Sync and tick local cooldown countdown smoothly every second
  useEffect(() => {
    setLocalCooldown(nudgeCooldownRemaining || 0);
  }, [nudgeCooldownRemaining]);

  useEffect(() => {
    if (localCooldown <= 0) return;
    const timer = setInterval(() => {
      setLocalCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [localCooldown]);

  // Format MM:SS for digital timer
  const formattedTimer = useMemo(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [seconds]);

  // Format cooldown MM:SS
  const formattedCooldown = useMemo(() => {
    const mins = Math.floor(localCooldown / 60);
    const secs = localCooldown % 60;
    return `${mins}m ${String(secs).padStart(2, '0')}s`;
  }, [localCooldown]);

  // Format header date
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(new Date());
  }, []);

  // Filter habits
  const filteredHabits = useMemo(() => {
    if (!habits) return [];
    return habits.filter((h) => {
      const isChecked = !!(day?.checks && day.checks[h.id]);
      if (habitFilter === 'pending') return !isChecked;
      if (habitFilter === 'done') return isChecked;
      return true;
    });
  }, [habits, day, habitFilter]);

  // Active alarms count
  const activeAlarmsCount = useMemo(() => {
    return (alarms || []).filter((a) => a.enabled).length;
  }, [alarms]);

  // Curriculum stages (fallback to curated curriculum if activeCurriculum is empty)
  const curriculumStages = useMemo(() => {
    if (activeCurriculum && activeCurriculum.stages && activeCurriculum.stages.length > 0) {
      return activeCurriculum.stages;
    }
    return [
      {
        id: 's1',
        title: 'Stage 1 — Python, Linear Algebra & Neural Nets',
        status: 'done',
        checkpoints: [
          { id: '1.1', title: 'Python 3.12 & NumPy Matrix Ops', completed: true },
          { id: '1.2', title: 'PyTorch Tensors, Autograd & GPU Backprop', completed: true },
          { id: '1.3', title: 'MLP from Scratch & Loss Functions', completed: true }
        ]
      },
      {
        id: 's2',
        title: 'Stage 2 — Word Embeddings & Recurrent Networks',
        status: 'done',
        checkpoints: [
          { id: '2.1', title: 'Word2Vec (Skip-Gram & CBOW)', completed: true },
          { id: '2.2', title: 'LSTMs, GRUs & Bidirectional Encoders', completed: true },
          { id: '2.3', title: 'Seq2Seq with Bahdanau Attention', completed: true }
        ]
      },
      {
        id: 's3',
        title: 'Stage 3 — Transformers & Self-Attention Mechanics',
        status: 'active',
        checkpoints: [
          { id: '3.1', title: 'Scaled Dot-Product & Multi-Head Attention', completed: true },
          { id: '3.2', title: 'Rotary Position Embeddings (RoPE)', completed: true },
          { id: '3.3', title: 'FlashAttention 2 & KV-Cache Optimization', completed: false },
          { id: '3.4', title: 'RMSNorm & SwiGLU Activation Architectures', completed: false }
        ]
      },
      {
        id: 's4',
        title: 'Stage 4 — LLM Pretraining, SFT & RLHF Alignment',
        status: 'upcoming',
        checkpoints: [
          { id: '4.1', title: 'Byte-Pair Encoding (tiktoken) Tokenizer', completed: false },
          { id: '4.2', title: 'DeepSpeed ZeRO-3 & FSDP Distributed Training', completed: false },
          { id: '4.3', title: 'LoRA, QLoRA & Parameter-Efficient Fine-Tuning', completed: false },
          { id: '4.4', title: 'DPO (Direct Preference Optimization)', completed: false }
        ]
      },
      {
        id: 's5',
        title: 'Stage 5 — Autonomous Agentic Deployments & MCP',
        status: 'upcoming',
        checkpoints: [
          { id: '5.1', title: 'vLLM & TensorRT-LLM Serving Engines', completed: false },
          { id: '5.2', title: 'Model Context Protocol (MCP) Server Architecture', completed: false },
          { id: '5.3', title: 'Multi-Agent Tool Orchestration & Guardrails', completed: false }
        ]
      }
    ];
  }, [activeCurriculum]);

  return (
    <div className="mobile-viewport-root" data-column-style={columnStyle || 'normal'}>
      {/* =================================================================== */}
      {/* 1. MINIMAL APP HEADER (Brand + Date + Streak Flame)                 */}
      {/* =================================================================== */}
      <header className="m-app-header">
        <div className="m-header-left">
          <img
            src="./favicon.png"
            alt="Daymark Logo"
            className="m-header-logo-img"
          />
          <div>
            <h1 className="m-header-title">
              Daymark
              {running && <span className="m-pulse-dot" style={{ color: '#10b981' }} />}
            </h1>
            <span className="m-header-sub">{formattedDate}</span>
          </div>
        </div>

        <div className="m-header-actions">
          {/* Streak Flame Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.28)', padding: '4px 8px', borderRadius: '16px', fontSize: '11px', fontWeight: '800', color: '#f59e0b' }}>
            <Flame size={13} fill="#f59e0b" color="#f59e0b" />
            <span>{completion}%</span>
          </div>

          {/* Quick Audio Sheet Toggle */}
          <button
            type="button"
            className={`m-icon-btn ${focusSoundType && focusSoundType !== 'off' ? 'is-active' : ''}`}
            onClick={() => setSoundscapeExpanded((prev) => !prev)}
            title="Focus Audio Soundscapes"
            aria-label="Focus Audio Soundscapes"
          >
            <Headphones size={15} />
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* 2. MAIN VIEWS CONTAINER                                             */}
      {/* =================================================================== */}
      <main className="m-tab-container">
        {/* ================================================================= */}
        {/* TAB 1: TODAY (Routine & Active Session)                           */}
        {/* ================================================================= */}
        {activeTab === 'today' && (
          <div>
            {/* HERO FOCUS CARD (Focused & Uncluttered) */}
            <div className="m-focus-hero">
              <div className="m-hero-top-row">
                <div className={`m-hero-pill ${running ? 'is-running' : ''}`}>
                  <span className="m-pulse-dot" />
                  <span>{running ? 'In Flow' : current ? 'Up Next' : 'Ready to Focus'}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {current ? `${current.start} - ${current.end}` : 'Self-Paced'}
                </div>
              </div>

              <h2 className="m-hero-session-name">
                {current ? current.title : (activeId ? 'Active Focus Block' : 'Ready for Next Session')}
              </h2>
              <div className="m-hero-session-sub">
                {current ? current.subtitle : 'Lock in without distractions and build momentum.'}
              </div>

              {/* Monospace Digits */}
              <div className="m-hero-digits-wrap">
                <span className="m-hero-digits">{formattedTimer}</span>
                <span className="m-hero-digits-label">elapsed</span>
              </div>

              {/* 48px+ Tactile Action Buttons */}
              <div className={`m-hero-controls ${!running && seconds === 0 ? 'is-idle' : ''}`}>
                {running ? (
                  <>
                    <button
                      type="button"
                      className="m-hero-btn m-hero-btn-pause"
                      onClick={pauseSession}
                    >
                      <Pause size={16} /> Pause
                    </button>
                    <button
                      type="button"
                      className="m-hero-btn m-hero-btn-finish"
                      onClick={finishSession}
                    >
                      <Check size={16} /> Done
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="m-hero-btn m-hero-btn-primary"
                    onClick={() => startSession(current ? current.id : 'focus')}
                  >
                    <Play size={16} /> {seconds > 0 ? 'Resume Session' : 'Start Focus Session'}
                  </button>
                )}
              </div>
            </div>

            {/* Compact 1-Row Metrics Bar (Zero Cluster) */}
            <div className="m-compact-strip">
              <div className="m-strip-item">
                <Clock size={13} color="#3b82f6" />
                <span>Focus: <strong>{Math.round((focusMinutes / 60) * 10) / 10}h</strong></span>
              </div>
              <div className="m-strip-item">
                <CheckCircle2 size={13} color="#10b981" />
                <span>Habits: <strong>{doneCount}/{habits?.length || 0}</strong></span>
              </div>
              <div className="m-strip-item">
                <Users size={13} color="#a78bfa" />
                <span>Pod: <strong>{podMembers ? podMembers.length : 1} live</strong></span>
              </div>
            </div>

            {/* PROGRESSIVE DISCLOSURE 1: Focus Soundscapes Drawer */}
            {soundscapeExpanded && (
              <div className="m-collapsible-banner">
                <div
                  className="m-collapsible-header"
                  onClick={() => setSoundscapeExpanded(false)}
                >
                  <div className="m-collapsible-left">
                    <Headphones size={15} color="#3b82f6" />
                    <span>Focus Soundscapes ({focusSoundType || 'off'})</span>
                  </div>
                  <ChevronDown size={15} color="#94a3b8" />
                </div>
                <div className="m-collapsible-content">
                  <div className="m-sound-grid">
                    {[
                      { id: 'off', label: '⏹️ Off' },
                      { id: 'rain', label: '🌧️ Soft Rain' },
                      { id: 'brown', label: '🌊 Brown Noise' },
                      { id: 'birds', label: '🌲 Forest Birds' },
                      { id: 'pink', label: '📻 Pink Noise' },
                      { id: 'binaural', label: '🧠 40Hz Gamma' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`m-sound-btn ${(focusSoundType || 'off') === s.id ? 'is-active' : ''}`}
                        onClick={() => handleSelectSound && handleSelectSound(s.id)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Volume Slider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Volume2 size={14} color="#94a3b8" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={focusSoundVolume || 0.4}
                      onChange={(e) => setFocusSoundVolume && setFocusSoundVolume(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: '#3b82f6' }}
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '28px', textAlign: 'right' }}>
                      {Math.round((focusSoundVolume || 0.4) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PROGRESSIVE DISCLOSURE 2: Collapsible Routine Alarms Accordion */}
            <div className="m-collapsible-banner">
              <div
                className="m-collapsible-header"
                onClick={() => setAlarmsExpanded((prev) => !prev)}
              >
                <div className="m-collapsible-left">
                  <AlarmClock size={15} color="#f59e0b" />
                  <span>Routine Alarms ({activeAlarmsCount} Active)</span>
                </div>
                {alarmsExpanded ? (
                  <ChevronDown size={15} color="#94a3b8" />
                ) : (
                  <ChevronRight size={15} color="#94a3b8" />
                )}
              </div>

              {alarmsExpanded && (
                <div className="m-collapsible-content">
                  {alarms && alarms.map((alarm) => (
                    <div key={alarm.id} className="m-alarm-card">
                      <div>
                        <div className="m-alarm-time">{alarm.time}</div>
                        <div className="m-alarm-label">{alarm.label || 'Routine alert'}</div>
                      </div>

                      <div
                        className={`m-toggle-switch ${alarm.enabled ? 'is-on' : ''}`}
                        onClick={() => toggleAlarm(alarm.id)}
                      >
                        <div className="m-toggle-knob" />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    style={{ width: '100%', padding: '8px', marginTop: '6px', background: 'transparent', border: '1px solid var(--m-border)', borderRadius: '8px', fontSize: '11px', fontWeight: '700', color: '#94a3b8', cursor: 'pointer' }}
                    onClick={testAlarmSound}
                  >
                    🔊 Test Native Sound & Vibration
                  </button>
                </div>
              )}
            </div>

            {/* Routine Timeline */}
            <div className="m-section-title-row">
              <h3>
                <Clock size={15} color="#3b82f6" />
                <span>Today's Routine</span>
              </h3>
              <span className="m-section-badge">{schedule?.length || 0} blocks</span>
            </div>

            <div className="m-timeline-wrapper">
              {schedule?.map((item, idx) => {
                const isActive = (current && current.id === item.id) || activeId === item.id;
                const isDone = item.completed;
                return (
                  <div key={item.id || idx} className="m-timeline-item">
                    <div className={`m-timeline-node ${isActive ? 'is-active' : isDone ? 'is-done' : ''}`}>
                      {isDone && <Check size={7} color="#fff" strokeWidth={3} />}
                    </div>

                    <div className={`m-timeline-card ${isActive ? 'is-active' : ''}`}>
                      <div className="m-timeline-time">
                        <span className="m-time-start">{item.start}</span>
                        <span className="m-time-end">{item.end}</span>
                      </div>

                      <div className="m-timeline-info">
                        <div className="m-timeline-title">{item.title}</div>
                        <div className="m-timeline-sub">{item.subtitle}</div>
                      </div>

                      <button
                        type="button"
                        className={`m-timeline-action ${isActive && running ? 'is-running' : ''}`}
                        onClick={() => {
                          if (isActive && running) {
                            pauseSession();
                          } else {
                            startSession(item.id);
                          }
                        }}
                        title={isActive && running ? 'Pause' : 'Start'}
                        aria-label={isActive && running ? 'Pause block' : 'Start block'}
                      >
                        {isActive && running ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: HABITS (Clean Daily Checklist)                             */}
        {/* ================================================================= */}
        {activeTab === 'habits' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>
                Daily Commitments
              </span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981' }}>
                {doneCount} of {habits?.length || 0} Done ({completion}%)
              </span>
            </div>

            <div className="m-habit-progress-bar">
              <div className="m-habit-progress-fill" style={{ width: `${completion}%` }} />
            </div>

            {/* Filter Chips */}
            <div className="m-filter-chips">
              <button
                type="button"
                className={`m-filter-chip ${habitFilter === 'all' ? 'is-active' : ''}`}
                onClick={() => setHabitFilter('all')}
              >
                All ({habits?.length || 0})
              </button>
              <button
                type="button"
                className={`m-filter-chip ${habitFilter === 'pending' ? 'is-active' : ''}`}
                onClick={() => setHabitFilter('pending')}
              >
                Remaining ({(habits?.length || 0) - doneCount})
              </button>
              <button
                type="button"
                className={`m-filter-chip ${habitFilter === 'done' ? 'is-active' : ''}`}
                onClick={() => setHabitFilter('done')}
              >
                Done ({doneCount})
              </button>
            </div>

            <div>
              {filteredHabits.map((habit) => {
                const isChecked = !!(day?.checks && day.checks[habit.id]);
                return (
                  <div
                    key={habit.id}
                    className={`m-habit-card ${isChecked ? 'is-checked' : ''}`}
                    onClick={() => toggleHabit(habit.id)}
                  >
                    <div className="m-habit-checkbox">
                      <Check size={14} strokeWidth={3} />
                    </div>

                    <span className="m-habit-name">{habit.name}</span>

                    <span className="m-habit-flame">
                      <Flame size={12} fill="#f59e0b" color="#f59e0b" />
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
            <div className="m-pod-hero">
              <div className="m-pod-hero-top">
                <h3 className="m-pod-title">
                  {activePod ? activePod.name : 'Focus Study Pod'}
                </h3>
                <span className="m-pod-count-badge">
                  {podMembers ? podMembers.length : 1} Members
                </span>
              </div>

              {podNotice && (
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0', margin: '8px 0 10px' }}>
                  📢 {podNotice}
                </div>
              )}

              <div className="m-pod-actions">
                <button
                  type="button"
                  className="m-btn-nudge"
                  onClick={sendNudge}
                  disabled={localCooldown > 0}
                >
                  <Send size={13} />
                  {localCooldown > 0 ? `Nudge in ${formattedCooldown}` : 'Nudge Pod'}
                </button>

                {activePod && (
                  <button
                    type="button"
                    className="m-btn-leave"
                    onClick={leavePod}
                  >
                    Leave
                  </button>
                )}
              </div>
            </div>

            <div className="m-section-title-row">
              <h3>
                <Users size={15} color="#8b5cf6" />
                <span>Live Member Radar</span>
              </h3>
            </div>

            <div>
              {podMembers && podMembers.length > 0 ? (
                podMembers.map((member, idx) => {
                  const isSelf = user && member.id === user.id;
                  return (
                    <div
                      key={member.id || idx}
                      className={`m-pod-member-row ${isSelf ? 'is-self' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="m-member-avatar">
                          {(member.username || member.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ fontSize: '13px', color: '#fff', display: 'block' }}>
                            {member.username || member.name || 'Member'}
                            {isSelf && ' (You)'}
                          </strong>
                          <span style={{ fontSize: '10px', color: '#10b981' }}>
                            {member.status || 'Focusing'}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '13px', color: '#3b82f6' }}>
                          {member.focus_minutes || member.focusMinutes || 0}m
                        </strong>
                        <small style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>
                          {member.streak_days || member.streak || 1}d
                        </small>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '12px' }}>
                  No other members in pod. Share your code to study together!
                </div>
              )}
            </div>

            {/* Pod Leaderboard */}
            <div className="m-section-title-row" style={{ marginTop: '18px' }}>
              <h3>
                <Flame size={15} color="#f59e0b" />
                <span>Leaderboard</span>
              </h3>
            </div>

            <div>
              {podLeaderboard && podLeaderboard.map((m, idx) => (
                <div key={m.id || idx} className="m-pod-member-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', width: '20px', textAlign: 'center' }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <span style={{ fontSize: '13px', color: '#fff' }}>
                      {m.username || m.name || 'Member'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981' }}>
                    {m.focus_minutes || m.focusMinutes || 0} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: ROADMAPS                                                   */}
        {/* ================================================================= */}
        {activeTab === 'roadmaps' && (
          <div>
            <div style={{ background: 'var(--m-surface)', border: '1px solid var(--m-border)', borderRadius: '14px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#60a5fa', textTransform: 'uppercase' }}>
                  TRACK: {curriculumSubject || 'NLP & DEEP LEARNING'}
                </span>
                <span className="m-section-badge">68% Done</span>
              </div>
              <h3 style={{ fontSize: '15px', margin: '0 0 6px', color: '#fff', fontWeight: '800' }}>
                LLM Foundations & Architectures
              </h3>
              <div className="m-habit-progress-bar">
                <div className="m-habit-progress-fill" style={{ width: '68%', background: '#3b82f6' }} />
              </div>
            </div>

            <div className="m-section-title-row">
              <h3>
                <GitBranch size={15} color="#3b82f6" />
                <span>Stages & Milestones</span>
              </h3>
            </div>

            <div>
              {curriculumStages.map((stage, sIdx) => {
                const isExpanded = expandedStageId === (stage.id || sIdx);
                const isCompleted = stage.status === 'done' || sIdx < 2;
                const isActive = stage.status === 'active' || sIdx === 2;
                return (
                  <div
                    key={stage.id || sIdx}
                    className={`m-stage-card ${isActive ? 'is-active' : ''}`}
                  >
                    <div
                      className="m-stage-header"
                      onClick={() => setExpandedStageId(isExpanded ? null : (stage.id || sIdx))}
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isCompleted ? (
                          <CheckCircle2 size={15} color="#10b981" />
                        ) : isActive ? (
                          <span className="m-pulse-dot" style={{ color: '#3b82f6' }} />
                        ) : (
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#475569' }} />
                        )}
                        <h4 className="m-stage-title">{stage.title}</h4>
                      </div>
                      {isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
                    </div>

                    {isExpanded && stage.checkpoints && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {stage.checkpoints.map((chk, cIdx) => (
                          <div key={chk.id || cIdx} className="m-checkpoint-item">
                            <CheckCircle2
                              size={14}
                              color={chk.completed ? '#10b981' : '#475569'}
                            />
                            <span style={{ color: chk.completed ? '#f1f5f9' : '#94a3b8' }}>
                              {chk.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: PROFILE & SYSTEM                                           */}
        {/* ================================================================= */}
        {activeTab === 'profile' && (
          <div>
            <div style={{ background: 'var(--m-surface)', border: '1px solid var(--m-border)', borderRadius: '16px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src="./favicon.png"
                  alt="Daymark Profile Icon"
                  style={{ width: '44px', height: '44px', borderRadius: '12px' }}
                />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '15px', margin: 0, color: '#fff' }}>
                    {user ? user.username : 'Guest User'}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <ShieldCheck size={12} />
                    {dbStatus === 'connected' ? 'Cloud Synced' : 'Device Local'}
                  </span>
                </div>
                {user ? (
                  <button
                    type="button"
                    className="m-icon-btn"
                    onClick={logout}
                    title="Log out"
                    aria-label="Log out"
                  >
                    <LogOut size={15} color="#f87171" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="m-hero-btn m-hero-btn-primary"
                    style={{ height: '34px', padding: '0 12px', fontSize: '11px' }}
                    onClick={() => setAuthModalOpen(true)}
                  >
                    <LogIn size={12} /> Log In
                  </button>
                )}
              </div>
            </div>

            <div className="m-section-title-row">
              <h3>
                <Monitor size={15} color="#3b82f6" />
                <span>Application & View</span>
              </h3>
            </div>

            <div style={{ background: 'var(--m-surface)', border: '1px solid var(--m-border)', borderRadius: '14px', overflow: 'hidden' }}>
              <div
                style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--m-border)', cursor: 'pointer' }}
                onClick={onSwitchToDesktop}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Monitor size={15} color="#3b82f6" />
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>Switch to Full Desktop UI</span>
                </div>
                <ChevronRight size={14} color="#64748b" />
              </div>

              <div
                style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={testAlarmSound}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 size={15} color="#10b981" />
                  <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>Test Sound & Vibration</span>
                </div>
                <ChevronRight size={14} color="#64748b" />
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: 'var(--m-text-muted)' }}>
              Daymark Routine Engine v1.0.0
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* 3. FLOATING BOTTOM NAVIGATION BAR                                   */}
      {/* =================================================================== */}
      <nav className="m-bottom-nav">
        <button
          type="button"
          className={`m-nav-tab ${activeTab === 'today' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('today')}
          aria-label="Today tab"
        >
          <div className="m-nav-icon-wrap">
            <Sun size={19} />
            {running && <span className="m-nav-dot" />}
          </div>
          <span className="m-nav-label">Today</span>
        </button>

        <button
          type="button"
          className={`m-nav-tab ${activeTab === 'habits' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('habits')}
          aria-label="Habits tab"
        >
          <div className="m-nav-icon-wrap">
            <CheckCircle2 size={19} />
          </div>
          <span className="m-nav-label">Habits</span>
        </button>

        <button
          type="button"
          className={`m-nav-tab ${activeTab === 'pods' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('pods')}
          aria-label="Pods tab"
        >
          <div className="m-nav-icon-wrap">
            <Users size={19} />
          </div>
          <span className="m-nav-label">Pods</span>
        </button>

        <button
          type="button"
          className={`m-nav-tab ${activeTab === 'roadmaps' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('roadmaps')}
          aria-label="Roadmaps tab"
        >
          <div className="m-nav-icon-wrap">
            <GitBranch size={19} />
          </div>
          <span className="m-nav-label">Roadmaps</span>
        </button>

        <button
          type="button"
          className={`m-nav-tab ${activeTab === 'profile' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('profile')}
          aria-label="Profile tab"
        >
          <div className="m-nav-icon-wrap">
            <User size={19} />
          </div>
          <span className="m-nav-label">Profile</span>
        </button>
      </nav>
    </div>
  );
}
