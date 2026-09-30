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
    single: jest.fn().mockResolvedValue({ data: { id: '11111111-2222-3333-4444-555555555555', name: 'Alex' }, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

const personalContextService = require('../services/personalContextService');

describe('PersonalContextService', () => {
  const userId = '11111111-2222-3333-4444-555555555555';

  it('aggregates user personal context without throwing on empty data', async () => {
    const context = await personalContextService.getUserPersonalContext(userId);

    expect(context).toBeDefined();
    expect(context.user).toBeDefined();
    expect(context.today_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(context.tasks_summary).toBeDefined();
    expect(Array.isArray(context.today_tasks)).toBe(true);
    expect(Array.isArray(context.pending_tasks)).toBe(true);
    expect(Array.isArray(context.upcoming_tasks)).toBe(true);
    expect(Array.isArray(context.subjects)).toBe(true);
  });
});
