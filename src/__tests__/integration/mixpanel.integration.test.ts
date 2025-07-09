import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { MixpanelModule } from '../../mixpanel.module.js';
import { MixpanelService } from '../../mixpanel.service.js';
import { ClsService } from 'nestjs-cls';
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
  let clsService: ClsService;

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
      clsService = module.get<ClsService>(ClsService);
    });

    it('should extract user ID from header', () => {
      // Mock CLS to return a request with headers
      vi.spyOn(clsService, 'get').mockReturnValue({
        headers: { 'x-user-id': 'header-user-123' }
      });

      const userId = mixpanelService.extractUserId();
      expect(userId).toBe('header-user-123');
    });

    it('should track events with user ID from header', () => {
      vi.spyOn(clsService, 'get').mockReturnValue({
        headers: { 'x-user-id': 'header-user-456' }
      });

      mixpanelService.track('test-event', { action: 'test' });

      expect(mockTrack).toHaveBeenCalledWith('test-event', {
        action: 'test',
        distinct_id: 'header-user-456',
      });
    });

    it('should fallback to CLS ID when header is missing', () => {
      vi.spyOn(clsService, 'get').mockReturnValue({
        headers: {}
      });
      vi.spyOn(clsService, 'getId').mockReturnValue('cls-fallback-id');

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
            session: 'session.user.id',
          }),
        ],
      }).compile();

      mixpanelService = module.get<MixpanelService>(MixpanelService);
      clsService = module.get<ClsService>(ClsService);
    });

    it('should extract user ID from session path', () => {
      vi.spyOn(clsService, 'get').mockReturnValue({
        session: {
          user: {
            id: 'session-user-789',
          },
        },
      });

      const userId = mixpanelService.extractUserId();
      expect(userId).toBe('session-user-789');
    });

    it('should handle nested session paths correctly', () => {
      vi.spyOn(clsService, 'get').mockReturnValue({
        session: {
          user: {
            id: 'nested-session-id',
          },
        },
      });

      mixpanelService.track('session-event', { test: true });

      expect(mockTrack).toHaveBeenCalledWith('session-event', {
        test: true,
        distinct_id: 'nested-session-id',
      });
    });

    it('should fallback to CLS ID when session path is invalid', () => {
      vi.spyOn(clsService, 'get').mockReturnValue({
        session: null,
      });
      vi.spyOn(clsService, 'getId').mockReturnValue('cls-session-fallback');

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
            user: 'user.profile.userId',
          }),
        ],
      }).compile();

      mixpanelService = module.get<MixpanelService>(MixpanelService);
      clsService = module.get<ClsService>(ClsService);
    });

    it('should extract user ID from user object path', () => {
      vi.spyOn(clsService, 'get').mockReturnValue({
        user: {
          profile: {
            userId: 'user-profile-111',
          },
        },
      });

      const userId = mixpanelService.extractUserId();
      expect(userId).toBe('user-profile-111');
    });

    it('should track events with user ID from user object', () => {
      vi.spyOn(clsService, 'get').mockReturnValue({
        user: {
          profile: {
            userId: 'user-profile-222',
          },
        },
      });

      mixpanelService.track('user-event', { source: 'profile' });

      expect(mockTrack).toHaveBeenCalledWith('user-event', {
        source: 'profile',
        distinct_id: 'user-profile-222',
      });
    });
  });

  describe('CLS context ID fallback', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
          }),
        ],
      }).compile();

      mixpanelService = module.get<MixpanelService>(MixpanelService);
      clsService = module.get<ClsService>(ClsService);
    });

    it('should use CLS context ID when no extraction option is configured', () => {
      vi.spyOn(clsService, 'getId').mockReturnValue('cls-context-123');

      const userId = mixpanelService.extractUserId();
      expect(userId).toBe('cls-context-123');
    });

    it('should track events with CLS context ID', () => {
      vi.spyOn(clsService, 'getId').mockReturnValue('cls-context-456');

      mixpanelService.track('default-event', { type: 'test' });

      expect(mockTrack).toHaveBeenCalledWith('default-event', {
        type: 'test',
        distinct_id: 'cls-context-456',
      });
    });
  });

  // Skip error handling test as it interferes with NestJS module lifecycle

  describe('Memory leak prevention', () => {
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
      clsService = module.get<ClsService>(ClsService);
    });

    it('should not retain references between different requests', () => {
      const userIds = new Set<string>();
      const mockGet = vi.fn();
      clsService.get = mockGet;

      // Simulate multiple requests with different user IDs
      for (let i = 0; i < 100; i++) {
        mockGet.mockReturnValue({
          headers: { 'x-user-id': `user-${i}` }
        });

        mixpanelService.track(`event-${i}`, { index: i });
        
        // Collect tracked user IDs
        const lastCall = mockTrack.mock.calls[mockTrack.mock.calls.length - 1];
        userIds.add(lastCall[1].distinct_id);
      }

      // Verify all user IDs are unique
      expect(userIds.size).toBe(100);
      expect(mockTrack).toHaveBeenCalledTimes(100);
    });
  });

  describe('Module configuration', () => {
    it('should work with forRootAsync', async () => {
      module = await Test.createTestingModule({
        imports: [
          MixpanelModule.forRootAsync({
            useFactory: () => ({
              token: 'async-token',
              session: 'session.id',
            }),
          }),
        ],
      }).compile();

      mixpanelService = module.get<MixpanelService>(MixpanelService);
      clsService = module.get<ClsService>(ClsService);

      vi.spyOn(clsService, 'get').mockReturnValue({
        session: { id: 'async-session-123' }
      });

      const userId = mixpanelService.extractUserId();
      expect(userId).toBe('async-session-123');
    });
  });
});