import { describe, it, expect } from 'vitest';
import { AsyncStorageMiddleware } from '../async-storage.middleware.js';
import { AsyncStorageService, AsyncStorageContext } from '../async-storage.service.js';
import type { MixpanelModuleOptions } from '../interface.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const createRes = () => {
  const headers: Record<string, unknown> = {};
  return {
    headers,
    getHeader: (name: string) => headers[name],
    setHeader: (name: string, value: unknown) => {
      headers[name] = value;
    },
  };
};

const runMiddleware = (options: MixpanelModuleOptions | undefined, req: unknown, res: unknown) => {
  const middleware = new AsyncStorageMiddleware(options);
  let store: AsyncStorageContext | undefined;
  middleware.use(req as any, res as any, () => {
    store = AsyncStorageService.getAsyncLocalStorage().getStore();
  });
  return store!;
};

describe('AsyncStorageMiddleware', () => {
  it('should store the request with a per-request ID and no device ID by default', () => {
    const res = createRes();
    const store = runMiddleware({ token: 't' }, { headers: {} }, res);

    expect(store.id).toMatch(UUID_PATTERN);
    expect(store.deviceId).toBeUndefined();
    expect(res.headers['Set-Cookie']).toBeUndefined();
  });

  it('should work without options (bare module import)', () => {
    const res = createRes();
    const store = runMiddleware(undefined, { headers: {} }, res);

    expect(store.id).toMatch(UUID_PATTERN);
    expect(store.deviceId).toBeUndefined();
  });

  describe('ID merge', () => {
    it('should mint a device ID and set the cookie when none is present', () => {
      const res = createRes();
      const store = runMiddleware({ token: 't', idMerge: true }, { headers: {} }, res);

      expect(store.deviceId).toMatch(UUID_PATTERN);
      expect(res.headers['Set-Cookie']).toBe(
        `mp_device_id=${store.deviceId}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`,
      );
    });

    it('should reuse an existing device ID cookie without setting a new one', () => {
      const res = createRes();
      const store = runMiddleware(
        { token: 't', idMerge: true },
        { headers: { cookie: 'foo=bar; mp_device_id=abc-123; baz=1' } },
        res,
      );

      expect(store.deviceId).toBe('abc-123');
      expect(res.headers['Set-Cookie']).toBeUndefined();
    });

    it('should prefer cookie-parser output when available', () => {
      const res = createRes();
      const store = runMiddleware(
        { token: 't', idMerge: true },
        { headers: {}, cookies: { mp_device_id: 'parsed-1' } },
        res,
      );

      expect(store.deviceId).toBe('parsed-1');
      expect(res.headers['Set-Cookie']).toBeUndefined();
    });

    it('should apply custom cookie options and force Secure for SameSite=None', () => {
      const res = createRes();
      const store = runMiddleware(
        {
          token: 't',
          idMerge: {
            name: 'did',
            maxAge: 60,
            sameSite: 'None',
            domain: 'example.com',
            httpOnly: false,
          },
        },
        { headers: {} },
        res,
      );

      expect(res.headers['Set-Cookie']).toBe(
        `did=${store.deviceId}; Path=/; Max-Age=60; SameSite=None; Domain=example.com; Secure`,
      );
    });

    it('should append to an existing Set-Cookie header', () => {
      const res = createRes();
      res.headers['Set-Cookie'] = 'session=xyz';

      const store = runMiddleware({ token: 't', idMerge: true }, { headers: {} }, res);

      expect(res.headers['Set-Cookie']).toEqual([
        'session=xyz',
        `mp_device_id=${store.deviceId}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`,
      ]);
    });
  });
});
