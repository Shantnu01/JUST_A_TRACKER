// Daymark Circadian & Elastic Scheduling Intelligence

// Cognitive Tier Classification
export function getCognitiveTier(item) {
  const title = (item.title || '').toLowerCase();
  const kind = item.kind;

  if (kind === 'break' || title.includes('break') || title.includes('lunch') || title.includes('breakfast')) {
    return { tier: 'recovery', label: 'Recovery / Rest', color: '#859086' };
  }
  if (title.includes('revision') || title.includes('reading') || title.includes('review') || title.includes('retrospective')) {
    return { tier: 'low', label: 'Low / Synthesis', color: '#7c3aed' };
  }
  if (title.includes('project') || title.includes('dev') || title.includes('build') || title.includes('shipping')) {
    return { tier: 'medium', label: 'Medium / Execution', color: '#2563eb' };
  }
  // Deep analytical work
  return { tier: 'high', label: 'High / Deep Focus', color: '#15803d' };
}

// Biological Circadian Energy Efficiency (0.0 to 1.0) by hour of the day
export function getCircadianEnergyLevel(hour) {
  if (hour >= 6 && hour < 8) return { level: 0.75, zone: 'Early Ascent', ideal: 'Light review / Warm-up' };
  if (hour >= 8 && hour < 12) return { level: 0.95, zone: 'Morning Cognitive Peak', ideal: 'High / Deep Analytical (DSA, Math)' };
  if (hour >= 12 && hour < 15.5) return { level: 0.50, zone: 'Circadian Trough (Post-Lunch)', ideal: 'Recovery / Break / Movement' };
  if (hour >= 15.5 && hour < 19.5) return { level: 0.85, zone: 'Afternoon Second Wind', ideal: 'Medium / Execution (Project Dev)' };
  if (hour >= 19.5 && hour < 22) return { level: 0.65, zone: 'Evening Synthesis', ideal: 'Low / Revision & Reading' };
  return { level: 0.35, zone: 'Melatonin Window (Rest)', ideal: 'Sleep Gate / Wind Down' };
}

// Compute daily circadian alignment score (%)
export function calculateCircadianScore(schedule = []) {
  if (!schedule || schedule.length === 0) return 100;
  let totalWeight = 0;
  let scoreSum = 0;

  schedule.forEach(item => {
    if (!item.start) return;
    const [h, m] = item.start.split(':').map(Number);
    const hourFloat = h + m / 60;
    const energy = getCircadianEnergyLevel(hourFloat);
    const { tier } = getCognitiveTier(item);

    if (tier === 'high') {
      totalWeight += 3;
      // High cognitive in peak yields full points, in trough yields low points
      scoreSum += energy.level * 3;
    } else if (tier === 'medium') {
      totalWeight += 2;
      scoreSum += (energy.level >= 0.6 ? 1.0 : 0.7) * 2;
    } else {
      totalWeight += 1;
      // Recovery in trough is actually perfect
      scoreSum += (energy.level <= 0.65 ? 1.0 : 0.85) * 1;
    }
  });

  if (totalWeight === 0) return 100;
  return Math.min(100, Math.round((scoreSum / totalWeight) * 100));
}

// Parse HH:MM into minutes from midnight
function toMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Format minutes from midnight to HH:MM
function toTimeStr(mins) {
  let m = Math.round(mins) % (24 * 60);
  if (m < 0) m += 24 * 60;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

// Adaptive Elastic Schedule Shift Engine
export function calculateAutoShift(schedule, { shiftMinutes = 30, fromNow = false, compressBreaks = false }) {
  if (!schedule || schedule.length === 0) return schedule;

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  let nextStartMins = null;
  let hasShifted = false;

  return schedule.map((item, idx) => {
    const origStartMins = toMinutes(item.start);
    const origEndMins = toMinutes(item.end);
    let durationMins = origEndMins - origStartMins;
    if (durationMins <= 0) durationMins += 24 * 60;

    const isBreak = item.kind === 'break' || (item.title || '').toLowerCase().includes('break');

    // Optionally compress breaks if user is running behind
    if (compressBreaks && isBreak && durationMins > 30) {
      durationMins = 30; // Trim long 60m break to 30m to regain time
    }

    if (fromNow) {
      // Find the first block that starts after now, or the currently ongoing block
      if (!hasShifted) {
        if (origEndMins > currentMins) {
          nextStartMins = currentMins + 2; // Start from now + 2m buffer
          hasShifted = true;
        } else {
          return item; // Past block, leave untouched
        }
      }
    } else {
      // Standard slide all blocks forward
      if (idx === 0) {
        nextStartMins = origStartMins + shiftMinutes;
      }
    }

    if (nextStartMins !== null) {
      const newStart = toTimeStr(nextStartMins);
      const newEnd = toTimeStr(nextStartMins + durationMins);
      // Next block starts with a small 5m breathing buffer or right away
      nextStartMins = nextStartMins + durationMins;

      return {
        ...item,
        start: newStart,
        end: newEnd,
        hours: Math.round((durationMins / 60) * 10) / 10
      };
    }

    return item;
  });
}
