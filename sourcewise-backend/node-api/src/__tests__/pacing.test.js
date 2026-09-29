const pacing = require('../services/pacingService');

const S = (date, status, type = 'study', mins = 60) => ({
  id: `${date}-${status}-${type}`, date, status, slot_type: type, duration_minutes: mins,
  start_time: '09:00:00', end_time: '10:00:00', is_fixed: false, mood_context: {},
});

describe('computePacing', () => {
  it('reports 100% when everything expected is done', () => {
    const r = pacing.computePacing(
      [S('2026-09-20', 'completed'), S('2026-09-21', 'completed'), S('2026-09-25', 'completed')],
      [], '2026-09-26'
    );
    expect(r.expectedSlots).toBe(3);
    expect(r.pacePct).toBe(100);
    expect(r.deviationDays).toBe(0);
    expect(r.onTrack).toBe(true);
  });

  it('reports behind pace with negative deviation days', () => {
    const r = pacing.computePacing(
      [S('2026-09-20', 'completed'), S('2026-09-21', 'pending'), S('2026-09-22', 'pending'), S('2026-09-23', 'pending')],
      [], '2026-09-26'
    );
    expect(r.pacePct).toBe(25);
    expect(r.deviationDays).toBeLessThan(0);
    expect(r.onTrack).toBe(false);
  });

  it('ignores break slots and maps exam milestones', () => {
    const r = pacing.computePacing(
      [S('2026-09-20', 'completed'), S('2026-09-20', 'pending', 'break', 10)],
      [{ subject_name: 'Bio', exam_date: '2026-09-20' }, { subject_name: 'Chem', exam_date: '2026-10-05' }],
      '2026-09-26'
    );
    expect(r.totalSlots).toBe(1);
    expect(r.milestones).toHaveLength(2);
    expect(r.milestones[0]).toMatchObject({ label: 'Bio exam', reached: true });
    expect(r.milestones[1].reached).toBe(false);
  });
});

describe('computeTrend', () => {
  it('builds cumulative completion curve per date', () => {
    const r = pacing.computeTrend(
      [S('2026-09-20', 'completed'), S('2026-09-21', 'pending'), S('2026-09-22', 'completed')],
      { id: 's1', subject_name: 'Bio', current_mastery: 60, target_mastery: 80 }
    );
    expect(r.points).toEqual([
      { date: '2026-09-20', pct: 33 },
      { date: '2026-09-21', pct: 33 },
      { date: '2026-09-22', pct: 67 },
    ]);
    expect(r.currentMastery).toBe(60);
  });
});

describe('adaptive helpers', () => {
  it('clamps multiplier to ±30%', () => {
    expect(pacing.clampMultiplier(0.5)).toBe(0.7);
    expect(pacing.clampMultiplier(1.5)).toBe(1.3);
    expect(pacing.clampMultiplier(1.0)).toBe(1.0);
    expect(pacing.clampMultiplier(NaN)).toBe(1.0);
  });

  it('detects imminent exams within the window', () => {
    expect(pacing.examImminent([{ exam_date: '2026-09-28' }], '2026-09-26', 3)).toBe(true);
    expect(pacing.examImminent([{ exam_date: '2026-10-10' }], '2026-09-26', 3)).toBe(false);
    expect(pacing.examImminent([{ exam_date: '2026-09-20' }], '2026-09-26', 3)).toBe(false);
  });

  it('scales future pending slots, skips the rest', () => {
    const slots = [
      S('2026-09-27', 'pending'),
      S('2026-09-20', 'pending'), // past
      S('2026-09-27', 'completed'), // done
      S('2026-09-27', 'pending', 'break', 10), // break
      { ...S('2026-09-28', 'pending'), is_fixed: true }, // fixed
    ];
    const { scaled, skipped } = pacing.scaleSlotsForMood(slots, 0.7, '2026-09-26', 'tok1');
    expect(scaled).toHaveLength(1);
    expect(scaled[0].duration_minutes).toBe(40); // 60*0.7=42 → round to 40
    expect(scaled[0].end_time).toBe('09:40:00');
    expect(scaled[0].mood_context).toMatchObject({ adaptive: true, undoToken: 'tok1' });
    expect(skipped).toBe(4);
  });

  it('addMinutesToTime wraps correctly', () => {
    expect(pacing.addMinutesToTime('09:00:00', 90)).toBe('10:30:00');
  });
});
