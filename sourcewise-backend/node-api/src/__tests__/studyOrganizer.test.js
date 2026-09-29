/**
 * Study Organizer Tests — mood inference, planner priority, encryption, calendar.
 */
jest.mock('../utils/supabase', () => ({
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

const moodService = require('../services/moodService');
const planner = require('../services/multiSubjectPlanner');
const calendarService = require('../services/calendarService');
const encryption = require('../utils/encryption');

describe('moodService.inferMoodFromBehavior', () => {
  it('infers stressed from low quiz scores', () => {
    const r = moodService.inferMoodFromBehavior({ avgQuizScore: 30 });
    expect(['stressed', 'anxious']).toContain(r.mood);
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('infers energized from high scores', () => {
    const r = moodService.inferMoodFromBehavior({ avgQuizScore: 95, sessionCompletionRatio: 1 });
    expect(['energized', 'focused']).toContain(r.mood);
  });

  it('infers tired from late-night short sessions', () => {
    const r = moodService.inferMoodFromBehavior({ sessionCompletionRatio: 0.3, hourOfDay: 2 });
    expect(r.mood).toBe('tired');
  });

  it('returns neutral with empty signals', () => {
    const r = moodService.inferMoodFromBehavior({});
    expect(r.mood).toBe('neutral');
  });
});

describe('moodService defaults', () => {
  it('tired reduces load multiplier', () => {
    expect(moodService.defaultAdjustments('tired').loadMultiplier).toBeLessThan(1);
  });
  it('energized increases load', () => {
    expect(moodService.defaultAdjustments('energized').loadMultiplier).toBeGreaterThanOrEqual(1);
  });
  it('rejects invalid mood on record', async () => {
    await expect(moodService.recordCheckin('u1', { mood: 'ecstatic' })).rejects.toThrow('Invalid mood');
  });
});

describe('multiSubjectPlanner.computePriority', () => {
  it('urgent low-mastery weighted subject scores highest', () => {
    const urgent = planner.computePriority({
      exam_date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      current_mastery: 20, target_mastery: 80, exam_weight: 2, difficulty_estimate: 'hard',
    });
    const chill = planner.computePriority({
      exam_date: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      current_mastery: 75, target_mastery: 80, exam_weight: 1, difficulty_estimate: 'easy',
    });
    expect(urgent).toBeGreaterThan(chill);
  });
});

describe('multiSubjectPlanner.generateSchedule', () => {
  it('generates interleaved slots for N subjects within budget', async () => {
    const { slots, subjects } = await planner.generateSchedule({
      subjects: [
        { subject_name: 'Biology', exam_date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10), current_mastery: 40 },
        { subject_name: 'Chemistry', exam_date: new Date(Date.now() + 12 * 24 * 3600 * 1000).toISOString().slice(0, 10), current_mastery: 70 },
        { subject_name: 'Math', exam_date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10), current_mastery: 30 },
      ],
      exam_period_start: new Date().toISOString().slice(0, 10),
      exam_period_end: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      daily_budget_minutes: 120,
      calendarEvents: [],
      moodAdjustments: { loadMultiplier: 1, preferDifficulty: 'medium', breakMinutes: 10 },
    });
    expect(subjects).toHaveLength(3);
    expect(slots.length).toBeGreaterThan(0);
    const names = new Set(slots.filter((s) => s.slot_type !== 'break').map((s) => s._subject_name));
    expect(names.size).toBeGreaterThanOrEqual(2); // interleaved
    // No slot exceeds 90 min
    for (const s of slots) expect(s.duration_minutes).toBeLessThanOrEqual(90);
  });

  it('tired mood reduces total scheduled minutes', async () => {
    const base = {
      subjects: [{ subject_name: 'Physics', exam_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10), current_mastery: 50 }],
      exam_period_start: new Date().toISOString().slice(0, 10),
      exam_period_end: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      daily_budget_minutes: 180, calendarEvents: [],
    };
    const normal = await planner.generateSchedule({ ...base, moodAdjustments: { loadMultiplier: 1, breakMinutes: 10 } });
    const tired = await planner.generateSchedule({ ...base, moodAdjustments: { loadMultiplier: 0.5, preferDifficulty: 'easy', breakMinutes: 15 } });
    const sum = (r) => r.slots.filter((s) => s.slot_type !== 'break').reduce((a, s) => a + s.duration_minutes, 0);
    expect(sum(tired)).toBeLessThan(sum(normal));
  });

  it('requires at least one subject', async () => {
    await expect(planner.generateSchedule({ subjects: [] })).rejects.toThrow('At least one subject');
  });
});

describe('calendarService', () => {
  it('classifies exam/class/work events', () => {
    expect(calendarService.classifyEventType('Final Exam Biology')).toBe('exam');
    expect(calendarService.classifyEventType('Lecture: Organic Chemistry')).toBe('class');
    expect(calendarService.classifyEventType('Work shift')).toBe('work');
    expect(calendarService.classifyEventType('Dentist appointment')).toBe('appointment');
    expect(calendarService.classifyEventType('Birthday party')).toBe('personal');
  });

  it('finds free windows around busy events', () => {
    const windows = calendarService.getAvailableWindows(
      [{ start_time: '2025-01-01T10:00:00Z', end_time: '2025-01-01T12:00:00Z' }],
      '2025-01-01', { dayStart: '09:00', dayEnd: '17:00', minSlotMinutes: 30 }
    );
    expect(windows.length).toBeGreaterThanOrEqual(2);
    expect(windows[0]).toEqual({ start: '09:00', end: '10:00' });
  });

  it('detects slot conflicts', async () => {
    // supabase mocked empty → no conflicts
    const conflicts = await calendarService.getConflicts('u1', [{ date: '2025-01-01', start_time: '09:00', end_time: '10:00' }]);
    expect(Array.isArray(conflicts)).toBe(true);
  });
});

describe('encryption utils', () => {
  it('round-trips when ENCRYPTION_KEY set', () => {
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    const enc = encryption.encrypt('hello');
    expect(encryption.decrypt(enc)).toBe('hello');
    expect(encryption.isConfigured()).toBe(true);
    delete process.env.ENCRYPTION_KEY;
  });

  it('falls back to plain: prefix without key', () => {
    delete process.env.ENCRYPTION_KEY;
    const enc = encryption.encrypt('abc');
    expect(enc.startsWith('plain:')).toBe(true);
    expect(encryption.decrypt(enc)).toBe('abc');
  });
});
