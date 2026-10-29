import React, { useState, useEffect } from 'react';

/**
 * Universal Theme-Matched Live Clock Widget
 * Formats time accurately based on theme and optional target timezone.
 * Blends seamlessly alongside Streak Card in .welcome-right-widgets
 */
export default function ThemeClockCard({ theme = 'default', timeZone, locationLabel }) {
  const [timeStr, setTimeStr] = useState('');
  const [secondsStr, setSecondsStr] = useState('');
  const [ampmStr, setAmpmStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const tzOptions = timeZone ? { timeZone } : {};

        // 24-hr format for technical/brutalist/tokyo themes, 12-hr for parchment/sunlit/ghibli
        const is12Hour = ['sunlit-studio', 'warm-parchment', 'ghibli-meadow'].includes(theme);

        const formatter = new Intl.DateTimeFormat('en-US', {
          ...tzOptions,
          hour12: is12Hour,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        const parts = formatter.formatToParts(now);
        const h = parts.find(p => p.type === 'hour')?.value || '12';
        const m = parts.find(p => p.type === 'minute')?.value || '00';
        const s = parts.find(p => p.type === 'second')?.value || '00';
        const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || '';

        setTimeStr(`${h}:${m}`);
        setSecondsStr(s);
        setAmpmStr(dayPeriod.toUpperCase());

        // Short date string
        const dateFmt = new Intl.DateTimeFormat('en-US', {
          ...tzOptions,
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        setDateStr(dateFmt.format(now).toUpperCase());
      } catch (e) {
        const fallback = now.toLocaleTimeString();
        setTimeStr(fallback.slice(0, 5));
        setSecondsStr(fallback.slice(6, 8));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [theme, timeZone]);

  // Determine timezone badge text
  const resolvedLabel = locationLabel || (() => {
    if (theme === 'tokyo-lofi') return 'TOKYO · JST (UTC+9)';
    try {
      const now = new Date();
      const tzOptions = timeZone ? { timeZone } : {};
      const formatter = new Intl.DateTimeFormat('en-US', {
        ...tzOptions,
        timeZoneName: 'short'
      });
      const parts = formatter.formatToParts(now);
      const tzName = parts.find(p => p.type === 'timeZoneName')?.value || 'LOCAL';
      return `${tzName} · LIVE`;
    } catch {
      return 'LOCAL TIME';
    }
  })();

  // Render Tokyo Lofi specific styling
  if (theme === 'tokyo-lofi') {
    return (
      <div className="tokyo-clock-card theme-clock-card tokyo-lofi">
        <div className="tokyo-clock-time">
          {timeStr}<span className="clock-sec-dim">:{secondsStr}</span>
        </div>
        <div className="tokyo-clock-label">
          <span className="tokyo-clock-dot" />
          <span>{resolvedLabel}</span>
        </div>
      </div>
    );
  }

  // Render Neo-Brutalist
  if (theme === 'neo-brutalist') {
    return (
      <div className="theme-clock-card neo-brutalist">
        <div className="nb-clock-badge">
          <span className="nb-clock-lightning">⚡</span>
          <span>{resolvedLabel}</span>
        </div>
        <div className="nb-clock-time">
          {timeStr}<span className="clock-sec-sub">:{secondsStr}</span>
        </div>
        <div className="nb-clock-date">{dateStr}</div>
      </div>
    );
  }

  // Render Zen-Paper
  if (theme === 'zen-paper') {
    return (
      <div className="theme-clock-card zen-paper">
        <div className="zen-clock-time">
          {timeStr}<span className="zen-clock-colon">:</span><span className="zen-clock-sec">{secondsStr}</span>
        </div>
        <div className="zen-clock-label">
          <span className="zen-clock-dot" />
          <span>{resolvedLabel}</span>
        </div>
      </div>
    );
  }

  // Render Ghibli Meadow
  if (theme === 'ghibli-meadow') {
    return (
      <div className="theme-clock-card ghibli-meadow">
        <div className="ghibli-clock-time">
          {timeStr}
          {ampmStr && <span className="ghibli-clock-ampm">{ampmStr}</span>}
          <span className="ghibli-clock-sec">:{secondsStr}</span>
        </div>
        <div className="ghibli-clock-label">
          <span className="ghibli-clock-sprout">🌱</span>
          <span>{resolvedLabel}</span>
        </div>
      </div>
    );
  }

  // Render Acid Runway
  if (theme === 'acid-runway') {
    return (
      <div className="theme-clock-card acid-runway">
        <div className="acid-clock-header">
          <span className="acid-bracket">[</span>
          <span className="acid-clock-sys">TICK.OS</span>
          <span className="acid-bracket">]</span>
          <span className="acid-clock-label-tag">{resolvedLabel}</span>
        </div>
        <div className="acid-clock-time">
          {timeStr}<span className="acid-clock-sec">:{secondsStr}</span>
        </div>
      </div>
    );
  }

  // Render Spider-Verse
  if (theme === 'spider-verse') {
    return (
      <div className="theme-clock-card spider-verse">
        <div className="spider-clock-time">
          <span className="spider-cyan">{timeStr}</span>
          <span className="spider-magenta">:{secondsStr}</span>
        </div>
        <div className="spider-clock-label">
          <span className="spider-clock-glitch">DIMENSION //</span>
          <span>{resolvedLabel}</span>
        </div>
      </div>
    );
  }

  // Render Sunlit Studio
  if (theme === 'sunlit-studio') {
    return (
      <div className="theme-clock-card sunlit-studio">
        <div className="sunlit-clock-time">
          {timeStr}
          {ampmStr && <span className="sunlit-clock-ampm">{ampmStr}</span>}
          <span className="sunlit-clock-sec">:{secondsStr}</span>
        </div>
        <div className="sunlit-clock-label">
          <span className="sunlit-clock-dot" />
          <span>{resolvedLabel}</span>
        </div>
      </div>
    );
  }

  // Render Warm Parchment
  if (theme === 'warm-parchment') {
    return (
      <div className="theme-clock-card warm-parchment">
        <div className="parchment-clock-time">
          {timeStr}
          {ampmStr && <span className="parchment-clock-ampm">{ampmStr}</span>}
          <span className="parchment-clock-sec">:{secondsStr}</span>
        </div>
        <div className="parchment-clock-label">
          <span className="parchment-clock-ink-dot" />
          <span>{resolvedLabel} · {dateStr}</span>
        </div>
      </div>
    );
  }

  // Render Dynamic Video (frosted glass)
  if (theme === 'dynamic-video') {
    return (
      <div className="theme-clock-card dynamic-video">
        <div className="dynamic-clock-time">
          {timeStr}<span className="clock-sec-dim">:{secondsStr}</span>
        </div>
        <div className="dynamic-clock-label">
          <span className="dynamic-clock-glow-dot" />
          <span>{resolvedLabel}</span>
        </div>
      </div>
    );
  }

  // Render Default / Obsidian Slate
  return (
    <div className="theme-clock-card default-theme">
      <div className="default-clock-time">
        {timeStr}<span className="clock-sec-dim">:{secondsStr}</span>
      </div>
      <div className="default-clock-label">
        <span className="default-clock-dot" />
        <span>{resolvedLabel}</span>
      </div>
    </div>
  );
}
