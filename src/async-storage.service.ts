import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { REQUEST_CTX_KEY } from './constant.js';

export interface AsyncStorageContext {
  id: string;
  request?: any;
  [key: string]: any;
}

@Injectable()
export class AsyncStorageService {
  private static storage = new AsyncLocalStorage<AsyncStorageContext>();

  static getAsyncLocalStorage(): AsyncLocalStorage<AsyncStorageContext> {
    return this.storage;
  }

  get<T = any>(key: string): T | undefined {
    const store = AsyncStorageService.storage.getStore();
    return store?.[key] as T;
  }

  getStore(): AsyncStorageContext | undefined {
    return AsyncStorageService.storage.getStore();
  }

  set<T = any>(key: string, value: T): void {
    const store = AsyncStorageService.storage.getStore();
    if (store) {
      store[key] = value;
    }
  }

  getId(): string | undefined {
    const store = AsyncStorageService.storage.getStore();
    return store?.id;
  }

  getRequest(): any {
    const store = AsyncStorageService.storage.getStore();
    return store?.[REQUEST_CTX_KEY as any];
  }

  getUser(): any {
    const request = this.getRequest();
    return request?.user;
  }

  getSession(): any {
    const request = this.getRequest();
    return request?.session;
  }

  getCookie(name: string): string | undefined {
    const request = this.getRequest();
    return request?.cookies?.[name];
  }

  run<T>(callback: () => T, contextId?: string): T {
    const context: AsyncStorageContext = {
      id: contextId || randomUUID(),
    };
    return AsyncStorageService.storage.run(context, callback);
  }

  enterWith(context: AsyncStorageContext): void {
    AsyncStorageService.storage.enterWith(context);
  }
}
