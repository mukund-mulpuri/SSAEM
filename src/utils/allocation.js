// src/utils/allocation.js
import { Store } from './store.js';

/**
 * CGPA-desc merit -> try pref1, then pref2,... subject capacity only.
 * No minCgpa / no branch eligibility checks.
 */
export function runAllocation() {
  const { students, subjects } = Store.get();

  // Track capacity per subject
  const caps = new Map(
    (subjects || []).map(s => [
      s.code,
      {
        cap: Number(s.capacity) || 0,
        used: 0,
      },
    ])
  );

  const results = [];

  // 1) Sort students by CGPA desc (tie -> roll asc)
  const ordered = [...(students || [])].sort((a, b) => {
    const ca = Number(a.cgpa) || 0;
    const cb = Number(b.cgpa) || 0;
    if (cb !== ca) return cb - ca;
    return String(a.roll || '').localeCompare(String(b.roll || ''));
  });

  // 2) Walk preferences for each student
  for (const stu of ordered) {
    const prefs = (stu.preferences || []).filter(Boolean);
    let placed = false;

    for (let i = 0; i < prefs.length; i++) {
      const code = prefs[i];
      const seat = caps.get(code);
      if (!seat) continue; // subject not configured

      if (seat.used < seat.cap) {
        seat.used++;
        results.push({
          roll: stu.roll,
          subjectCode: code,
          status: 'ALLOCATED',
          rankGiven: i + 1,
          reason: 'Allocated by CGPA preference order',
          updatedAt: new Date().toISOString(),
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      results.push({
        roll: stu.roll,
        subjectCode: '',
        status: 'UNASSIGNED',
        rankGiven: '',
        reason: 'No capacity in given preferences',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  Store.set({ allotments: results });
  return results;
}

/** Manual reassignment (capacity-only) */
export function reassign(roll, toSubjectCode, reason = '') {
  const { subjects, allotments } = Store.get();
  const target = (subjects || []).find(s => s.code === toSubjectCode);
  if (!target) throw new Error('Target subject not found');

  const used = (allotments || []).filter(a => a.subjectCode === toSubjectCode).length;
  const targetCap = Number(target.capacity) || 0;
  if (used >= targetCap) throw new Error('Target subject full');

  const idx = (allotments || []).findIndex(a => a.roll === roll);
  if (idx === -1) throw new Error('Allotment not found');

  allotments[idx] = {
    ...allotments[idx],
    subjectCode: toSubjectCode,
    status: 'ALLOCATED',
    reason: `Manual reassignment: ${reason}`,
    updatedAt: new Date().toISOString(),
  };

  Store.set({ allotments });
}
