import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Guard against the "/api suffix" class of regressions:
 * REST calls need <origin>/api, socket.io needs <origin> (no /api).
 * VITE_API_URL must work whether or not it ends with /api.
 */
async function loadConfig(value?: string) {
  vi.unstubAllEnvs();
  if (value !== undefined) vi.stubEnv('VITE_API_URL', value);
  vi.resetModules();
  return await import('./config');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('backend URL normalization', () => {
  it('uses localhost defaults when VITE_API_URL is not set', async () => {
    const c = await loadConfig();
    expect(c.BACKEND_ORIGIN).toBe('http://localhost:5000');
    expect(c.API_URL).toBe('http://localhost:5000/api');
    expect(c.SOCKET_URL).toBe('http://localhost:5000');
  });

  it('accepts VITE_API_URL WITH /api suffix', async () => {
    const c = await loadConfig('https://api.navigo.ug/api');
    expect(c.BACKEND_ORIGIN).toBe('https://api.navigo.ug');
    expect(c.API_URL).toBe('https://api.navigo.ug/api');
    expect(c.SOCKET_URL).toBe('https://api.navigo.ug');
  });

  it('accepts VITE_API_URL WITHOUT /api suffix', async () => {
    const c = await loadConfig('https://api.navigo.ug');
    expect(c.BACKEND_ORIGIN).toBe('https://api.navigo.ug');
    expect(c.API_URL).toBe('https://api.navigo.ug/api');
    expect(c.SOCKET_URL).toBe('https://api.navigo.ug');
  });

  it('tolerates trailing slashes', async () => {
    const c = await loadConfig('https://api.navigo.ug/api/');
    expect(c.BACKEND_ORIGIN).toBe('https://api.navigo.ug');
    expect(c.API_URL).toBe('https://api.navigo.ug/api');
    expect(c.SOCKET_URL).toBe('https://api.navigo.ug');
  });

  it('never produces a doubled /api', async () => {
    for (const v of ['https://x.com/api', 'https://x.com', 'https://x.com/api/']) {
      const c = await loadConfig(v);
      expect(c.API_URL).toBe(`${c.BACKEND_ORIGIN}/api`);
      expect(c.API_URL).not.toContain('/api/api');
      expect(c.SOCKET_URL).not.toContain('/api');
    }
  });
});
