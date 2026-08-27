import { Inject, Injectable, NestMiddleware, Optional } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { AsyncStorageService, AsyncStorageContext } from './async-storage.service.js';
import { MIXPANEL_OPTIONS, REQUEST_CTX_KEY } from './constant.js';
import type { IdMergeCookieOptions, MixpanelModuleOptions } from './interface.js';

type ResolvedCookieOptions = Required<Omit<IdMergeCookieOptions, 'domain'>> & {
  domain?: string;
};

const DEFAULT_DEVICE_COOKIE: ResolvedCookieOptions = {
  name: 'mp_device_id',
  maxAge: 60 * 60 * 24 * 365,
  path: '/',
  sameSite: 'Lax',
  secure: false,
  httpOnly: true,
};

@Injectable()
export class AsyncStorageMiddleware implements NestMiddleware {
  constructor(
    @Optional() @Inject(MIXPANEL_OPTIONS) private readonly options?: MixpanelModuleOptions,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const asyncLocalStorage = AsyncStorageService.getAsyncLocalStorage();

    const context: AsyncStorageContext = {
      id: randomUUID(),
      [REQUEST_CTX_KEY]: req,
    };

    if (this.options?.idMerge) {
      context.deviceId = this.resolveDeviceId(req, res);
    }

    asyncLocalStorage.run(context, () => {
      next();
    });
  }

  private resolveDeviceId(req: Request, res: Response): string {
    const config: ResolvedCookieOptions = {
      ...DEFAULT_DEVICE_COOKIE,
      ...(typeof this.options?.idMerge === 'object' ? this.options.idMerge : {}),
    };

    const existing = this.readCookie(req, config.name);
    if (existing) {
      return existing;
    }

    const deviceId = randomUUID();
    this.appendSetCookie(res, deviceId, config);
    return deviceId;
  }

  private readCookie(req: Request, name: string): string | undefined {
    // Prefer cookie-parser output when the application uses it
    const parsed = (req as { cookies?: Record<string, string> }).cookies?.[name];
    if (parsed) {
      return parsed;
    }

    const header = req.headers?.cookie;
    if (!header) {
      return undefined;
    }
    for (const part of header.split(';')) {
      const separator = part.indexOf('=');
      if (separator === -1) continue;
      if (part.slice(0, separator).trim() === name) {
        return decodeURIComponent(part.slice(separator + 1).trim());
      }
    }
    return undefined;
  }

  private appendSetCookie(res: Response, value: string, config: ResolvedCookieOptions): void {
    const parts = [
      `${config.name}=${value}`,
      `Path=${config.path}`,
      `Max-Age=${config.maxAge}`,
      `SameSite=${config.sameSite}`,
    ];
    if (config.domain) parts.push(`Domain=${config.domain}`);
    if (config.httpOnly) parts.push('HttpOnly');
    // Browsers require Secure for SameSite=None
    if (config.secure || config.sameSite === 'None') parts.push('Secure');

    const cookie = parts.join('; ');
    const previous = res.getHeader('Set-Cookie');
    if (previous === undefined) {
      res.setHeader('Set-Cookie', cookie);
    } else if (Array.isArray(previous)) {
      res.setHeader('Set-Cookie', [...previous.map(String), cookie]);
    } else {
      res.setHeader('Set-Cookie', [String(previous), cookie]);
    }
  }
}
