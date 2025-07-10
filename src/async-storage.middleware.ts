import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { AsyncStorageService } from './async-storage.service.js';
import { REQUEST_CTX_KEY } from './constant.js';

@Injectable()
export class AsyncStorageMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const asyncLocalStorage = AsyncStorageService.getAsyncLocalStorage();

    const context = {
      id: randomUUID(),
      [REQUEST_CTX_KEY]: req,
    };

    asyncLocalStorage.run(context, () => {
      next();
    });
  }
}
