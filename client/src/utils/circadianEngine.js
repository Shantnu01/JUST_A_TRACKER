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


// Chief of Staff: Schedule Healer Plan Generator
export function generateChiefOfStaffPlan(schedule = [], completedItemIds = [], currentMinsOverride = null) {
  if (!schedule || schedule.length === 0) return { proposedSchedule: [], savingsMinutes: 0, narrative: '', shiftedCount: 0 };

  const now = new Date();
  const currentMins = currentMinsOverride !== null ? currentMinsOverride : (now.getHours() * 60 + now.getMinutes());

  let nextStartMins = null;
  let totalBreakSavings = 0;
  let shiftedCount = 0;
  let originalEndMins = 0;
  let newEndMins = 0;

  const proposedSchedule = schedule.map(item => {
    const origStart = toMinutes(item.start);
    const origEnd = toMinutes(item.end);
    let duration = origEnd - origStart;
    if (duration <= 0) duration += 24 * 60;

    originalEndMins = Math.max(originalEndMins, origEnd);

    // If item is already completed, keep untouched
    if (completedItemIds.includes(item.id)) {
      return item;
    }

    const isBreak = item.kind === 'break' || (item.title || '').toLowerCase().includes('break');

    // Start sequence from current time + 2 min buffer if it's in the past
    if (nextStartMins === null) {
      if (origStart < currentMins) {
        nextStartMins = currentMins + 2;
      } else {
        nextStartMins = origStart;
      }
    }

    // Break compaction heuristic: Compress breaks longer than 20m by 35-45% to absorb drift
    if (isBreak && duration > 20) {
      const compressedDuration = Math.max(15, Math.round(duration * 0.6));
      totalBreakSavings += (duration - compressedDuration);
      duration = compressedDuration;
    }

    const newStart = toTimeStr(nextStartMins);
    const newEnd = toTimeStr(nextStartMins + duration);
    newEndMins = Math.max(newEndMins, nextStartMins + duration);
    nextStartMins = nextStartMins + duration;
    shiftedCount++;

    return {
      ...item,
      start: newStart,
      end: newEnd,
      hours: Math.round((duration / 60) * 10) / 10
    };
  });

  const deltaEnd = newEndMins - originalEndMins;
  let narrative = `Realigned ${shiftedCount} remaining blocks starting from ${toTimeStr(currentMins + 2)}.`;
  if (totalBreakSavings > 0) {
    narrative += ` Compacted breaks by ${totalBreakSavings}m to absorb schedule drift.`;
  }
  if (deltaEnd <= 0) {
    narrative += ` Your day cutoff remains on time!`;
  } else {
    narrative += ` Day end adjusted by +${deltaEnd}m to ${toTimeStr(newEndMins)}.`;
  }

  return {
    proposedSchedule,
    savingsMinutes: totalBreakSavings,
    shiftedCount,
    originalEnd: toTimeStr(originalEndMins),
    healedEnd: toTimeStr(newEndMins),
    narrative
  };
}

// Chief of Staff: Proactive Schedule Slip & Collision Detector
export function detectScheduleDrift(schedule = [], completedItemIds = [], activeItemId = null) {
  if (!schedule || schedule.length === 0) return { hasDrift: false, driftMinutes: 0 };

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  // Find incomplete items
  const incompleteItems = schedule.filter(item => !completedItemIds.includes(item.id));
  if (incompleteItems.length === 0) return { hasDrift: false, driftMinutes: 0 };

  let maxDriftMinutes = 0;
  let slippingItem = null;
  let overdueType = 'start'; // 'start' or 'finish'

  for (const item of incompleteItems) {
    const startMins = toMinutes(item.start);
    const endMins = toMinutes(item.end);

    // If item is actively running
    if (activeItemId === item.id) {
      if (currentMins > endMins) {
        const drift = currentMins - endMins;
        if (drift > maxDriftMinutes) {
          maxDriftMinutes = drift;
          slippingItem = item;
          overdueType = 'finish';
        }
      }
    } else {
      // Item not active, but start time is in the past by > 12 minutes
      if (currentMins > startMins + 12) {
        const drift = currentMins - startMins;
        if (drift > maxDriftMinutes) {
          maxDriftMinutes = drift;
          slippingItem = item;
          overdueType = 'start';
        }
      }
    }
  }

  if (maxDriftMinutes < 15 || !slippingItem) {
    return { hasDrift: false, driftMinutes: maxDriftMinutes };
  }

  // Generate the proposed healed schedule
  const healResult = generateChiefOfStaffPlan(schedule, completedItemIds, currentMins);

  return {
    hasDrift: true,
    driftMinutes: maxDriftMinutes,
    slippingItem,
    overdueType,
    ...healResult
  };
}


// Pre-Flight Dispatcher: Intelligent Circadian Slotter
export function slotScheduleToCircadian(schedule = [], priorityTitle = '') {
  if (!schedule || schedule.length === 0) {
    return { alignedSchedule: schedule, scoreBefore: 100, scoreAfter: 100, summary: 'No schedule items to slot.' };
  }

  const scoreBefore = calculateCircadianScore(schedule);
  const priorityLower = (priorityTitle || '').toLowerCase().trim();
  const highTier = [];
  const mediumTier = [];
  const lowTier = [];
  const recoveryTier = [];

  schedule.forEach(item => {
    const titleLower = (item.title || '').toLowerCase();
    const isPriority = priorityLower && (titleLower.includes(priorityLower) || priorityLower.includes(titleLower));

    if (isPriority) {
      highTier.unshift(item);
      return;
    }

    const { tier } = getCognitiveTier(item);
    if (tier === 'high') highTier.push(item);
    else if (tier === 'medium') mediumTier.push(item);
    else if (tier === 'low') lowTier.push(item);
    else recoveryTier.push(item);
  });

  const ordered = [];
  if (highTier.length > 0) ordered.push(...highTier);
  if (recoveryTier.length > 0) ordered.push(recoveryTier.shift());
  if (lowTier.length > 0) ordered.push(lowTier.shift());
  if (mediumTier.length > 0) ordered.push(...mediumTier);
  if (recoveryTier.length > 0) ordered.push(...recoveryTier);
  if (lowTier.length > 0) ordered.push(...lowTier);

  let currentStart = toMinutes(schedule[0]?.start || '09:00');

  const alignedSchedule = ordered.map((item) => {
    const origStart = toMinutes(item.start);
    const origEnd = toMinutes(item.end);
    let duration = origEnd - origStart;
    if (duration <= 0) duration = 60;

    const newStart = toTimeStr(currentStart);
    const newEnd = toTimeStr(currentStart + duration);
    currentStart += duration;

    return {
      ...item,
      start: newStart,
      end: newEnd,
      hours: Math.round((duration / 60) * 10) / 10
    };
  });

  const scoreAfter = calculateCircadianScore(alignedSchedule);
  const summary = `Aligned ${alignedSchedule.length} blocks to circadian windows. Alignment improved from ${scoreBefore}% to ${scoreAfter}%.`;

  return {
    alignedSchedule,
    scoreBefore,
    scoreAfter,
    summary
  };
}
