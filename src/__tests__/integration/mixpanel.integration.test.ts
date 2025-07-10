import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { MixpanelModule } from '../../mixpanel.module.js';
import { MixpanelService } from '../../mixpanel.service.js';
import { AsyncStorageService } from '../../async-storage.service.js';
import { REQUEST_CTX_KEY } from '../../constant.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock mixpanel
const mockTrack = vi.fn();
vi.mock('mixpanel', () => ({
  default: {
    init: vi.fn(() => ({
      track: mockTrack,
    })),
  },
}));

describe('MixpanelModule Integration Tests', () => {
  let module: TestingModule;
  let mixpanelService: MixpanelService;
  let asyncStorageService: AsyncStorageService;

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Header extraction', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
            header: 'x-user-id',
          }),
        ],
      }).compile();

      mixpanelService = module.get<MixpanelService>(MixpanelService);
      asyncStorageService = module.get<AsyncStorageService>(AsyncStorageService);
    });

    it('should extract user ID from header', () => {
      const testContext = {
        id: 'test-context-id',
        [REQUEST_CTX_KEY]: {
          headers: { 'x-user-id': 'header-user-123' },
        },
      };

      asyncStorageService.enterWith(testContext);
      const userId = mixpanelService.extractUserId();
      expect(userId).toBe('header-user-123');
    });

    it('should track events with user ID from header', () => {
      const testContext = {
        id: 'test-context-id',
        [REQUEST_CTX_KEY]: {
          headers: { 'x-user-id': 'header-user-456' },
        },
      };

      asyncStorageService.enterWith(testContext);
      mixpanelService.track('test-event', { action: 'test' });

      expect(mockTrack).toHaveBeenCalledWith('test-event', {
        action: 'test',
        distinct_id: 'header-user-456',
      });
    });

    it('should fallback to AsyncStorage ID when header is missing', () => {
      const testContext = {
        id: 'cls-fallback-id',
        [REQUEST_CTX_KEY]: {
          headers: {},
        },
      };

      asyncStorageService.enterWith(testContext);
      const userId = mixpanelService.extractUserId();
      expect(userId).toBe('cls-fallback-id');
    });
  });

  describe('Session extraction', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
            session: 'user.id',
          }),
        ],
      }).compile();

      mixpanelService = module.get<MixpanelService>(MixpanelService);
      asyncStorageService = module.get<AsyncStorageService>(AsyncStorageService);
    });

    it('should extract user ID from session path', () => {
      // Use enterWith to set context
      const testContext = {
        id: 'test-context-id',
        [REQUEST_CTX_KEY]: {
          session: {
            user: {
              id: 'session-user-789',
            },
          },
        },
      };

      asyncStorageService.enterWith(testContext);
      const userId = mixpanelService.extractUserId();
      expect(userId).toBe('session-user-789');
    });

    it('should handle nested session paths correctly', () => {
      // Use enterWith to set context
      const testContext = {
        id: 'test-context-id',
        [REQUEST_CTX_KEY]: {
          session: {
            user: {
              id: 'nested-session-id',
            },
          },
        },
      };

      asyncStorageService.enterWith(testContext);
      mixpanelService.track('session-event', { test: true });

      expect(mockTrack).toHaveBeenCalledWith('session-event', {
        test: true,
        distinct_id: 'nested-session-id',
      });
    });

    it('should fallback to AsyncStorage ID when session path is invalid', () => {
      // Use enterWith to set context
      const testContext = {
        id: 'cls-session-fallback',
        [REQUEST_CTX_KEY]: {
          session: null,
        },
      };

      asyncStorageService.enterWith(testContext);
      const userId = mixpanelService.extractUserId();
      expect(userId).toBe('cls-session-fallback');
    });
  });

  describe('User extraction', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
            user: 'profile.userId',
          }),
        ],
      }).compile();

      mixpanelService = module.get<MixpanelService>(MixpanelService);
      asyncStorageService = module.get<AsyncStorageService>(AsyncStorageService);
    });

    it('should extract user ID from user object path', () => {
      // Use enterWith to set context
      const testContext = {
        id: 'test-context-id',
        [REQUEST_CTX_KEY]: {
          user: {
            profile: {
              userId: 'user-profile-111',
            },
          },
        },
      };

      asyncStorageService.enterWith(testContext);
      const userId = mixpanelService.extractUserId();
      expect(userId).toBe('user-profile-111');
    });

    it('should track events with user ID from user object', () => {
      // Use enterWith to set context
      const testContext = {
        id: 'test-context-id',
        [REQUEST_CTX_KEY]: {
          user: {
            profile: {
              userId: 'user-profile-222',
            },
          },
        },
      };

      asyncStorageService.enterWith(testContext);
      mixpanelService.track('user-event', { source: 'test' });

      expect(mockTrack).toHaveBeenCalledWith('user-event', {
        source: 'test',
        distinct_id: 'user-profile-222',
      });
    });
  });

  describe('Fallback to AsyncStorage context ID', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
          }),
        ],
      }).compile();

      mixpanelService = module.get<MixpanelService>(MixpanelService);
      asyncStorageService = module.get<AsyncStorageService>(AsyncStorageService);
    });

    it('should use AsyncStorage context ID when no extraction option is configured', () => {
      const testContext = {
        id: 'default-context-id',
        [REQUEST_CTX_KEY]: {},
      };

      asyncStorageService.enterWith(testContext);
      const userId = mixpanelService.extractUserId();
      expect(userId).toBe('default-context-id');
    });

    it('should track events with AsyncStorage context ID', () => {
      const testContext = {
        id: 'context-track-id',
        [REQUEST_CTX_KEY]: {},
      };

      asyncStorageService.enterWith(testContext);
      mixpanelService.track('default-event', { type: 'test' });

      expect(mockTrack).toHaveBeenCalledWith('default-event', {
        type: 'test',
        distinct_id: 'context-track-id',
      });
    });
  });

  describe('Error handling', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
            header: 'x-user-id',
          }),
        ],
      }).compile();

      mixpanelService = module.get<MixpanelService>(MixpanelService);
      asyncStorageService = module.get<AsyncStorageService>(AsyncStorageService);
    });

    it('should not retain references between different requests', () => {
      // First request
      const testContext1 = {
        id: 'context-1',
        [REQUEST_CTX_KEY]: {
          headers: { 'x-user-id': 'user-1' },
        },
      };

      asyncStorageService.enterWith(testContext1);
      const userId1 = mixpanelService.extractUserId();
      expect(userId1).toBe('user-1');

      // Second request with different user
      const testContext2 = {
        id: 'context-2',
        [REQUEST_CTX_KEY]: {
          headers: { 'x-user-id': 'user-2' },
        },
      };

      asyncStorageService.enterWith(testContext2);
      const userId2 = mixpanelService.extractUserId();
      expect(userId2).toBe('user-2');
    });
  });
});
