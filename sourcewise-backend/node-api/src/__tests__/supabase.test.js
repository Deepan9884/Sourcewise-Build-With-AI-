/**
 * Supabase client init — service-role enforcement (see fix_rls.sql).
 * RLS denies direct anon-key access, so the server must use the
 * service-role key. These tests assert the fail-fast behaviour.
 */
describe('Supabase client init', () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...OLD_ENV };
    jest.resetModules();
  });

  it('throws in production without SUPABASE_SERVICE_ROLE_KEY', () => {
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => require('../utils/supabase')).toThrow(/SERVICE_ROLE_KEY/);
  });

  it('starts in production with SUPABASE_SERVICE_ROLE_KEY set', () => {
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    expect(() => require('../utils/supabase')).not.toThrow();
  });

  it('retries transient fetch failures then succeeds', async () => {
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    const { resilientFetch } = require('../utils/supabase');

    let calls = 0;
    const realFetch = global.fetch;
    global.fetch = jest.fn(async () => {
      calls += 1;
      if (calls < 3) throw new TypeError('fetch failed');
      return new Response('{}', { status: 200 });
    });
    try {
      const res = await resilientFetch('https://x.supabase.co/rest/v1/users');
      expect(res.status).toBe(200);
      expect(calls).toBe(3);
    } finally {
      global.fetch = realFetch;
    }
  });

  it('throws after exhausting retries', async () => {
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    const { resilientFetch } = require('../utils/supabase');

    const realFetch = global.fetch;
    global.fetch = jest.fn(async () => { throw new TypeError('fetch failed'); });
    try {
      await expect(resilientFetch('https://x.supabase.co/rest/v1/users')).rejects.toThrow('fetch failed');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    } finally {
      global.fetch = realFetch;
    }
  });

  it('warns instead of throwing outside production', () => {
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => require('../utils/supabase')).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('SERVICE_ROLE_KEY'));
    warn.mockRestore();
  });
});
