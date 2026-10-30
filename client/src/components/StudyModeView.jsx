import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Coffee,
  Bell,
  Volume2,
  VolumeX,
  Minimize2,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock,
  RotateCcw,
  Headphones,
  Check
} from 'lucide-react';
import { playFocusSound, stopFocusSound } from '../utils/soundEngine';

export default function StudyModeView({
  activeBlock,
  seconds,
  running,
  onToggleRunning,
  onFinishSession,
  onMinimize,
  theme,
  columnStyle,
  hasWallpaper,
  activeWallpaperUrl,
  playChime,
  setToast,
  isBreak,
  breakSecondsLeft,
  breakDurationMinutes,
  onStartBreak,
  onEndBreakAndResume,
  onExtendBreak,
  breakRunning,
  onToggleBreakRunning,
  activeCheckpoint
}) {
  const [alarmMinutes, setAlarmMinutes] = useState(() => {
    return Number(localStorage.getItem('daymark-study-alarm')) || null;
  });
  const [showAlarmPicker, setShowAlarmPicker] = useState(false);
  const [soundscape, setSoundscape] = useState('off'); // 'off' | 'rain' | 'forest' | 'binaural' | 'brown'

  // Handle Study Alarm Reached
  useEffect(() => {
    if (!isBreak && running && alarmMinutes && seconds > 0) {
      if (seconds === alarmMinutes * 60) {
        playChime();
        if (typeof setToast === 'function') {
          setToast(`🔔 Target Reached! You have studied for ${alarmMinutes} minutes!`);
        }
      }
    }
  }, [seconds, alarmMinutes, isBreak, running, playChime, setToast]);

  // Handle Soundscape changes
  const handleToggleSoundscape = (type) => {
    if (soundscape === type) {
      stopFocusSound();
      setSoundscape('off');
    } else {
      playFocusSound(type, 0.4);
      setSoundscape(type);
    }
  };

  const handleSelectAlarm = (mins) => {
    setAlarmMinutes(mins);
    if (mins) {
      localStorage.setItem('daymark-study-alarm', String(mins));
      if (typeof setToast === 'function') setToast(`🔔 Alarm set for ${mins} minutes`);
    } else {
      localStorage.removeItem('daymark-study-alarm');
      if (typeof setToast === 'function') setToast('Alarm turned off');
    }
    setShowAlarmPicker(false);
  };

  // Time formatters
  const formatTime = (totalSecs) => {
    const s = Math.max(0, totalSecs);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const subjectTitle = activeBlock?.title || 'Focused Study Session';
  const subjectSubtitle = activeCheckpoint?.title || activeBlock?.subtitle || 'Maintain deep flow & deliberate practice';
  const scheduledHours = activeBlock?.hours || 1;
  const scheduledSecs = scheduledHours * 3600;
  const progressPercent = Math.min(100, Math.round((seconds / scheduledSecs) * 100));

  return (
    <div
      className={`study-mode-backdrop ${isBreak ? 'on-break' : 'studying'}`}
      data-theme={theme}
      data-column-style={columnStyle}
    >
      {/* Top Floating Utility Bar */}
      <div className="study-top-bar">
        <div className="study-status-indicator">
          <span className={`study-status-dot ${isBreak ? 'break-dot' : running ? 'active-pulse' : 'paused-dot'}`} />
          <span className="study-status-text">
            {isBreak
              ? `☕ BREAK TIME (${breakDurationMinutes || 5} MIN)`
              : running
              ? '● DEEP STUDY IN PROGRESS'
              : '❚❚ STUDY TIMER PAUSED'}
          </span>
        </div>

        <div className="study-top-actions">
          {/* Audio Soundscape Toggle */}
          <div className="study-soundscape-group">
            <button
              type="button"
              className={`study-sound-btn ${soundscape === 'rain' ? 'active' : ''}`}
              onClick={() => handleToggleSoundscape('rain')}
              title="Lofi Rain Soundscape"
            >
              <Headphones size={13} />
              <span>Rain</span>
            </button>
            <button
              type="button"
              className={`study-sound-btn ${soundscape === 'binaural' ? 'active' : ''}`}
              onClick={() => handleToggleSoundscape('binaural')}
              title="Binaural Alpha Waves"
            >
              <Headphones size={13} />
              <span>Waves</span>
            </button>
            {soundscape !== 'off' && (
              <button
                type="button"
                className="study-sound-btn mute"
                onClick={() => handleToggleSoundscape('off')}
                title="Mute Sound"
              >
                <VolumeX size={13} />
              </button>
            )}
          </div>

          {/* Minimize / Return to Dashboard */}
          <button
            type="button"
            className="study-minimize-btn"
            onClick={onMinimize}
            title="Minimize to dashboard (Timer keeps running in background)"
          >
            <Minimize2 size={14} />
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* Main Study Card */}
      <div className="study-main-card">
        {/* Japanese & Classical Watermark Kanji for Tokyo Lofi */}
        {theme === 'tokyo-lofi' && (
          <div className="study-kanji-watermark" aria-hidden="true">
            {isBreak ? '休息' : '集中'}
          </div>
        )}

        {/* Subject Header */}
        <div className="study-card-header">
          <span className="study-eyebrow">
            {theme === 'tokyo-lofi'
              ? isBreak
                ? 'RECOVERY PHASE // 休憩時間'
                : 'FOCUSED IMMERSION // 集中学習'
              : isBreak
              ? 'BREAK & RECOVERY'
              : 'ACTIVE STUDY FOCUS'}
          </span>
          <h1 className="study-subject-title">{isBreak ? 'Relax & Recharge' : subjectTitle}</h1>
          <p className="study-subject-subtitle">
            {isBreak
              ? 'Take a breath, stretch, drink water. Timer is paused.'
              : subjectSubtitle}
          </p>
        </div>

        {/* Giant Digital Aesthetic Timer */}
        <div className="study-timer-container">
          <div className={`study-timer-display ${isBreak ? 'break-timer' : ''}`}>
            {isBreak ? formatTime(breakSecondsLeft) : formatTime(seconds)}
          </div>
          <div className="study-timer-subline">
            {isBreak ? (
              <span>Break remaining before study resumes</span>
            ) : (
              <span>
                {Math.floor(seconds / 60)}m focused · Target: {scheduledHours}h ({progressPercent}% of block)
              </span>
            )}
          </div>

          {/* Visual Progress Line */}
          {!isBreak && (
            <div className="study-progress-track">
              <div
                className="study-progress-bar"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Primary Controls Row: Pause/Resume, Break Options, Stop & Exit, Alarm */}
        <div className="study-controls-wrapper">
          {/* Pause / Resume Button */}
          <button
            type="button"
            className={`study-primary-btn ${isBreak ? (breakRunning ? 'pause' : 'resume') : (running ? 'pause' : 'resume')}`}
            onClick={isBreak ? onToggleBreakRunning : onToggleRunning}
          >
            {isBreak ? (
              breakRunning ? (
                <>
                  <Pause size={18} />
                  <span>Pause Break</span>
                </>
              ) : (
                <>
                  <Play size={18} />
                  <span>Resume Break</span>
                </>
              )
            ) : running ? (
              <>
                <Pause size={18} />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={18} />
                <span>Resume Study</span>
              </>
            )}
          </button>

          {/* Stop / Finish & Exit Button */}
          <button
            type="button"
            className="study-stop-btn"
            onClick={onFinishSession}
            title="Log elapsed study time and exit back to timetable"
          >
            <Square size={16} />
            <span>Stop & Exit</span>
          </button>

          {/* Alarm Setting Button */}
          <div className="study-alarm-anchor">
            <button
              type="button"
              className={`study-alarm-btn ${alarmMinutes ? 'has-alarm' : ''}`}
              onClick={() => setShowAlarmPicker(v => !v)}
              title="Set study duration alarm"
            >
              <Bell size={16} />
              <span>{alarmMinutes ? `${alarmMinutes}m Alarm` : 'Alarm'}</span>
            </button>

            {showAlarmPicker && (
              <div className="study-alarm-dropdown">
                <div className="alarm-dropdown-title">SET STUDY ALARM</div>
                {[25, 45, 60, 90].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    className={`alarm-opt-btn ${alarmMinutes === mins ? 'selected' : ''}`}
                    onClick={() => handleSelectAlarm(mins)}
                  >
                    <span>{mins} minutes</span>
                    {mins === 25 && <small>Pomodoro</small>}
                    {mins === 60 && <small>1 Hour</small>}
                    {alarmMinutes === mins && <Check size={12} />}
                  </button>
                ))}
                {alarmMinutes && (
                  <button
                    type="button"
                    className="alarm-opt-btn remove"
                    onClick={() => handleSelectAlarm(null)}
                  >
                    Turn Off Alarm
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Break Section: 5, 10, 15 min options */}
        <div className="study-break-section">
          {!isBreak ? (
            <div className="break-trigger-row">
              <span className="break-label">
                <Coffee size={15} />
                <span>Take a Quick Break:</span>
              </span>
              <div className="break-pills-row">
                <button
                  type="button"
                  className="break-pill-btn"
                  onClick={() => onStartBreak(5)}
                  title="Pause study & start 5 min break"
                >
                  5 Min
                </button>
                <button
                  type="button"
                  className="break-pill-btn"
                  onClick={() => onStartBreak(10)}
                  title="Pause study & start 10 min break"
                >
                  10 Min
                </button>
                <button
                  type="button"
                  className="break-pill-btn"
                  onClick={() => onStartBreak(15)}
                  title="Pause study & start 15 min break"
                >
                  15 Min
                </button>
              </div>
            </div>
          ) : (
            <div className="break-active-controls">
              <button
                type="button"
                className="resume-study-hero-btn"
                onClick={onEndBreakAndResume}
              >
                <Play size={16} />
                <span>End Break & Resume Study Now</span>
              </button>
              <button
                type="button"
                className="extend-break-btn"
                onClick={() => onExtendBreak(5)}
              >
                +5 Min
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
