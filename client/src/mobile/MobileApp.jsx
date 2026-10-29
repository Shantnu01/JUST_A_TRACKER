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
  Radio,
  LogOut,
  LogIn,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Send,
  Trash2,
  Monitor,
  Headphones,
  Zap,
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
    <div className="mobile-viewport-root" data-column-style={columnStyle || "normal"}>
      {/* =================================================================== */}
      {/* TOP MOBILE APP BAR                                                  */}
      {/* =================================================================== */}
      <header className="m-app-header">
        <div className="m-header-left">
          <div className="m-header-logo">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="m-header-title">
              Daymark
              {running && <span className="m-pulse-dot" style={{ color: '#10b981' }} />}
            </h1>
            <span className="m-header-sub">{formattedDate}</span>
          </div>
        </div>

        <div className="m-header-actions">
          {/* Quick Soundscape Active Chip */}
          {focusSoundType && focusSoundType !== 'off' && (
            <button
              type="button"
              className="m-icon-btn is-active"
              onClick={() => handleSelectSound && handleSelectSound('off')}
              title={`Mute soundscape (${focusSoundType})`}
              aria-label="Mute soundscape"
            >
              <Headphones size={15} />
            </button>
          )}

          {/* Quick Alarm Sound Test */}
          <button
            type="button"
            className="m-icon-btn"
            onClick={testAlarmSound}
            title="Test alarm sound"
            aria-label="Test alarm sound"
          >
            <AlarmClock size={16} />
          </button>

          {/* Switch to Full Desktop UI */}
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

      {/* =================================================================== */}
      {/* MAIN VIEWS CONTAINER                                                */}
      {/* =================================================================== */}
      <main className="m-tab-container">
        {/* ================================================================= */}
        {/* TAB 1: TODAY (Routine Timeline & Focus Session)                    */}
        {/* ================================================================= */}
        {activeTab === 'today' && (
          <div>
            {/* HERO FOCUS CARD (Forest & Structured Inspired) */}
            <div className="m-focus-hero">
              <div className="m-hero-top-row">
                <div className={`m-hero-pill ${running ? 'is-running' : ''}`}>
                  <span className="m-pulse-dot" />
                  <span>{running ? 'In Flow' : current ? 'Ready to Focus' : 'Focus Session'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                  <Flame size={13} color="#f59e0b" fill="#f59e0b" />
                  <strong>{completion}% Done</strong>
                </div>
              </div>

              <h2 className="m-hero-session-name">
                {current ? current.title : (activeId ? 'Active Deep Work' : 'Ready for Next Block')}
              </h2>
              <div className="m-hero-session-sub">
                {current ? current.subtitle : 'Lock in without distractions and build momentum.'}
              </div>

              {/* Digital Monospace Timer */}
              <div className="m-hero-digits-wrap">
                <span className="m-hero-digits">{formattedTimer}</span>
                <span className="m-hero-digits-label">elapsed</span>
              </div>

              {/* Touch Ergonomic Controls */}
              <div className={`m-hero-controls ${!running && seconds === 0 ? 'is-idle' : ''}`}>
                {running ? (
                  <>
                    <button
                      type="button"
                      className="m-hero-btn m-hero-btn-pause"
                      onClick={pauseSession}
                    >
                      <Pause size={17} /> Pause
                    </button>
                    <button
                      type="button"
                      className="m-hero-btn m-hero-btn-finish"
                      onClick={finishSession}
                    >
                      <Check size={17} /> Complete Block
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="m-hero-btn m-hero-btn-primary"
                    onClick={() => startSession(current ? current.id : 'focus')}
                  >
                    <Play size={17} /> {seconds > 0 ? 'Resume Session' : 'Start Focus Session'}
                  </button>
                )}
              </div>

              {/* Integrated Ambient Soundscapes Pill Strip */}
              <div className="m-hero-soundscapes">
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginRight: '4px' }}>
                  🎧 AUDIO:
                </span>
                {[
                  { id: 'off', label: 'Off' },
                  { id: 'rain', label: 'Rain 🌧️' },
                  { id: 'brown', label: 'Brown Noise 🌊' },
                  { id: 'birds', label: 'Birds 🌲' },
                  { id: 'binaural', label: '40Hz Gamma 🧠' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`m-sound-chip ${(focusSoundType || 'off') === s.id ? 'is-active' : ''}`}
                    onClick={() => handleSelectSound && handleSelectSound(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick 3-Pill Metrics Row */}
            <div className="m-quick-stats">
              <div className="m-stat-pill">
                <span className="m-stat-pill-label">Focus</span>
                <span className="m-stat-pill-value">
                  {Math.round((focusMinutes / 60) * 10) / 10}h
                </span>
                <span className="m-stat-pill-sub">of {totalPlannedFocusHours}h</span>
              </div>

              <div className="m-stat-pill">
                <span className="m-stat-pill-label">Habits</span>
                <span className="m-stat-pill-value">{doneCount}/{habits?.length || 0}</span>
                <span className="m-stat-pill-sub">{completion}% score</span>
              </div>

              <div className="m-stat-pill">
                <span className="m-stat-pill-label">Pod</span>
                <span className="m-stat-pill-value" style={{ color: '#a78bfa' }}>
                  {podMembers ? podMembers.length : 1} live
                </span>
                <span className="m-stat-pill-sub">accountable</span>
              </div>
            </div>

            {/* Structured Routine Timeline with Connected Line */}
            <div className="m-section-title-row">
              <h3>
                <Clock size={16} color="#3b82f6" />
                <span>Routine Timeline</span>
              </h3>
              <span className="m-section-badge">{schedule?.length || 0} blocks</span>
            </div>

            <div className="m-timeline-wrapper">
              {schedule?.map((item, idx) => {
                const isActive = (current && current.id === item.id) || activeId === item.id;
                const isDone = item.completed;
                return (
                  <div key={item.id || idx} className="m-timeline-item">
                    {/* Node on vertical connector */}
                    <div className={`m-timeline-node ${isActive ? 'is-active' : isDone ? 'is-done' : ''}`}>
                      {isDone && <Check size={8} color="#fff" strokeWidth={3} />}
                    </div>

                    {/* Timeline Event Card */}
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
                        title={isActive && running ? 'Pause block' : 'Start this block'}
                        aria-label={isActive && running ? 'Pause block' : 'Start this block'}
                      >
                        {isActive && running ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Routine Alarms (Native Android Protected) */}
            <div className="m-section-title-row" style={{ marginTop: '26px' }}>
              <h3>
                <AlarmClock size={16} color="#f59e0b" />
                <span>Routine Alarms</span>
              </h3>
              <span className="m-section-badge">Exact Alert</span>
            </div>

            <div>
              {alarms && alarms.map((alarm) => (
                <div key={alarm.id} className="m-alarm-card">
                  <div>
                    <div className="m-alarm-time">{alarm.time}</div>
                    <div className="m-alarm-label">{alarm.label || 'Routine wake & focus trigger'}</div>
                  </div>

                  <div
                    className={`m-toggle-switch ${alarm.enabled ? 'is-on' : ''}`}
                    onClick={() => toggleAlarm(alarm.id)}
                    title="Toggle alarm"
                  >
                    <div className="m-toggle-knob" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: HABITS (Things 3 & Notion Inspired Checklist)              */}
        {/* ================================================================= */}
        {activeTab === 'habits' && (
          <div>
            {/* Completion Progress Card */}
            <div className="m-habit-progress-card">
              <div className="m-habit-prog-head">
                <div>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Daily Discipline Score
                  </span>
                  <div className="m-habit-prog-pct">{completion}%</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                    {doneCount} of {habits?.length || 0} Done
                  </span>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {completion >= 80 ? '🔥 On Fire' : 'Keep building'}
                  </div>
                </div>
              </div>

              <div className="m-habit-bar">
                <div className="m-habit-fill" style={{ width: `${completion}%` }} />
              </div>
            </div>

            {/* Filter Pills */}
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
                Pending ({(habits?.length || 0) - doneCount})
              </button>
              <button
                type="button"
                className={`m-filter-chip ${habitFilter === 'done' ? 'is-active' : ''}`}
                onClick={() => setHabitFilter('done')}
              >
                Done ({doneCount})
              </button>
            </div>

            {/* Habit Cards */}
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
                      <Check size={16} strokeWidth={3} />
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
        {/* TAB 3: STUDY PODS (Accountability & Live Radar)                    */}
        {/* ================================================================= */}
        {activeTab === 'pods' && (
          <div>
            <div className="m-pod-hero">
              <div className="m-pod-hero-top">
                <div>
                  <span style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '800', textTransform: 'uppercase' }}>
                    Active Study Pod
                  </span>
                  <h3 className="m-pod-title">
                    {activePod ? activePod.name : 'Deep Work Pod'}
                  </h3>
                </div>
                <span className="m-pod-count-badge">
                  {podMembers ? podMembers.length : 1} Members
                </span>
              </div>

              {podNotice && (
                <div className="m-pod-notice">
                  📢 <strong>Notice:</strong> {podNotice}
                </div>
              )}

              {/* Nudge Pod with Active Countdown Timer */}
              <div className="m-pod-actions">
                <button
                  type="button"
                  className="m-btn-nudge"
                  onClick={sendNudge}
                  disabled={localCooldown > 0}
                >
                  <Send size={14} />
                  {localCooldown > 0 ? `Nudge in ${formattedCooldown}` : 'Nudge Study Pod'}
                </button>

                {activePod && (
                  <button
                    type="button"
                    className="m-btn-leave"
                    onClick={leavePod}
                  >
                    Leave Pod
                  </button>
                )}
              </div>
            </div>

            <div className="m-section-title-row">
              <h3>
                <Users size={16} color="#8b5cf6" />
                <span>Live Radar & Members</span>
              </h3>
            </div>

            {/* Member List */}
            <div>
              {podMembers && podMembers.length > 0 ? (
                podMembers.map((member, idx) => {
                  const isSelf = user && member.id === user.id;
                  return (
                    <div
                      key={member.id || idx}
                      className={`m-pod-member-row ${isSelf ? 'is-self' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="m-member-avatar">
                          {(member.username || member.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#fff', display: 'block' }}>
                            {member.username || member.name || 'Anonymous'}
                            {isSelf && ' (You)'}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="m-pulse-dot" style={{ width: '5px', height: '5px' }} />
                            {member.status || 'Active Deep Focus'}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '14px', color: '#3b82f6' }}>
                          {member.focus_minutes || member.focusMinutes || 0}m
                        </strong>
                        <small style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>
                          {member.streak_days || member.streak || 1}d streak
                        </small>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>
                  No other members in this pod yet. Share your invite code to study together!
                </div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="m-section-title-row" style={{ marginTop: '22px' }}>
              <h3>
                <Flame size={16} color="#f59e0b" />
                <span>Pod Leaderboard</span>
              </h3>
            </div>

            <div>
              {podLeaderboard && podLeaderboard.map((m, idx) => (
                <div key={m.id || idx} className="m-pod-member-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', width: '22px', textAlign: 'center' }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                      {m.username || m.name || 'Member'}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>
                    {m.focus_minutes || m.focusMinutes || 0} min
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: ROADMAPS (Curriculum & Stage Learning)                     */}
        {/* ================================================================= */}
        {activeTab === 'roadmaps' && (
          <div>
            <div className="m-roadmap-hero">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#60a5fa', textTransform: 'uppercase' }}>
                  ACTIVE TRACK: {curriculumSubject || 'NLP & TRANSFORMERS'}
                </span>
                <span className="m-section-badge">Stage 3 of 5</span>
              </div>
              <h3 style={{ fontSize: '17px', margin: '0 0 6px', color: '#fff', fontWeight: '800' }}>
                LLM Foundations & Agentic Deployments
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--m-text-secondary)', margin: '0 0 12px', lineHeight: 1.5 }}>
                Mastering tokenization, attention mechanisms, rotary embeddings, fine-tuning, and MCP tool agents.
              </p>
              <div className="m-habit-bar">
                <div className="m-habit-fill" style={{ width: '68%', background: '#3b82f6' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                <span>Overall Curriculum Progress</span>
                <span>68% Complete</span>
              </div>
            </div>

            <div className="m-section-title-row">
              <h3>
                <GitBranch size={16} color="#3b82f6" />
                <span>Learning Stages</span>
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
                          <CheckCircle2 size={16} color="#10b981" />
                        ) : isActive ? (
                          <span className="m-pulse-dot" style={{ color: '#3b82f6' }} />
                        ) : (
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#475569' }} />
                        )}
                        <h4 className="m-stage-title">{stage.title}</h4>
                      </div>
                      {isExpanded ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
                    </div>

                    {isExpanded && stage.checkpoints && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {stage.checkpoints.map((chk, cIdx) => (
                          <div key={chk.id || cIdx} className="m-checkpoint-item">
                            <CheckCircle2
                              size={15}
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
        {/* TAB 5: FOCUS SOUNDSCAPES & PROFILE                                */}
        {/* ================================================================= */}
        {activeTab === 'profile' && (
          <div>
            {/* User Profile Card */}
            <div style={{ background: 'var(--m-surface)', border: '1px solid var(--m-border)', borderRadius: '18px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '18px', fontWeight: '800' }}>
                  {user ? (user.username ? user.username.charAt(0).toUpperCase() : 'U') : 'G'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', margin: 0, color: '#fff' }}>
                    {user ? user.username : 'Guest User'}
                  </h3>
                  <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <ShieldCheck size={12} />
                    {dbStatus === 'connected' ? 'PostgreSQL Cloud Synced' : 'Ready'}
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
                    <LogOut size={16} color="#f87171" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="m-hero-btn m-hero-btn-primary"
                    style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
                    onClick={() => setAuthModalOpen(true)}
                  >
                    <LogIn size={13} /> Log In
                  </button>
                )}
              </div>
            </div>

            {/* Soundscapes Audio Suite */}
            <div className="m-section-title-row">
              <h3>
                <Headphones size={16} color="#3b82f6" />
                <span>Focus Soundscape Engine</span>
              </h3>
            </div>

            <div style={{ background: 'var(--m-surface)', border: '1px solid var(--m-border)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {[
                  { id: 'rain', label: '🌧️ Soft Rain' },
                  { id: 'brown', label: '🌊 Brown Noise' },
                  { id: 'birds', label: '🌲 Forest Birds' },
                  { id: 'pink', label: '📻 Pink Noise' },
                  { id: 'binaural', label: '🧠 40Hz Gamma' },
                  { id: 'off', label: '⏹️ Mute Audio' }
                ].map((sound) => {
                  const isCurrent = (focusSoundType || 'off') === sound.id;
                  return (
                    <button
                      key={sound.id}
                      type="button"
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: isCurrent ? '1.5px solid #3b82f6' : '1px solid var(--m-border)',
                        background: isCurrent ? 'rgba(59, 130, 246, 0.2)' : 'var(--m-surface-card)',
                        color: isCurrent ? '#fff' : '#94a3b8',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                      onClick={() => handleSelectSound && handleSelectSound(sound.id)}
                    >
                      {sound.label}
                    </button>
                  );
                })}
              </div>

              {/* Volume Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Volume2 size={16} color="#94a3b8" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={focusSoundVolume || 0.4}
                  onChange={(e) => setFocusSoundVolume && setFocusSoundVolume(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: '#3b82f6' }}
                />
                <span style={{ fontSize: '12px', color: '#94a3b8', minWidth: '32px', textAlign: 'right' }}>
                  {Math.round((focusSoundVolume || 0.4) * 100)}%
                </span>
              </div>
            </div>

            {/* App Preferences & Controls */}
            <div className="m-section-title-row">
              <h3>
                <Monitor size={16} color="#a78bfa" />
                <span>Display & System</span>
              </h3>
            </div>

            <div style={{ background: 'var(--m-surface)', border: '1px solid var(--m-border)', borderRadius: '16px', overflow: 'hidden' }}>
              <div
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--m-border)', cursor: 'pointer' }}
                onClick={onSwitchToDesktop}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Monitor size={16} color="#3b82f6" />
                  <span style={{ fontSize: '14px', color: '#fff', fontWeight: '600' }}>Switch to Full Desktop UI</span>
                </div>
                <ChevronRight size={16} color="#64748b" />
              </div>

              <div
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={testAlarmSound}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Volume2 size={16} color="#10b981" />
                  <span style={{ fontSize: '14px', color: '#fff', fontWeight: '600' }}>Test Sound & Vibration</span>
                </div>
                <ChevronRight size={16} color="#64748b" />
              </div>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--m-text-muted)' }}>
              Daymark Routine Engine v1.0.0 • Mobile Production Build
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* FLOATING BOTTOM NAVIGATION BAR                                      */}
      {/* =================================================================== */}
      <nav className="m-bottom-nav">
        <button
          type="button"
          className={`m-nav-tab ${activeTab === 'today' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('today')}
          aria-label="Today Routine tab"
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
          aria-label="Habits Checklist tab"
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
          aria-label="Study Pods tab"
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
          aria-label="Roadmaps tab"
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
          aria-label="Focus Audio & Profile tab"
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
