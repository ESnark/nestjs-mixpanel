import { Test, TestingModule } from '@nestjs/testing';
import { ClsService, ClsModule } from 'nestjs-cls';
import { MixpanelService } from '../mixpanel.service.js';
import { MixpanelModuleOptions } from '../interface.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock mixpanel at the module level
const mockTrack = vi.fn();
vi.mock('mixpanel', () => ({
  default: {
    init: vi.fn(() => ({
      track: mockTrack,
    })),
  },
}));

describe('MixpanelService', () => {
  let service: MixpanelService;
  let clsService: any;

  const mockOptions: MixpanelModuleOptions = {
    token: 'test-token',
    header: 'x-user-id'
  };

  beforeEach(async () => {
    clsService = {
      get: vi.fn(),
      getId: vi.fn().mockReturnValue('default-cls-id'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MixpanelService,
        {
          provide: 'MIXPANEL_OPTIONS',
          useValue: mockOptions,
        },
        ClsService,
      ],
    })
    .overrideProvider(ClsService)
    .useValue(clsService)
    .compile();

    service = module.get<MixpanelService>(MixpanelService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('track', () => {
    it('should track an event with no properties', () => {
      // Mock empty request for header extraction
      clsService.get.mockReturnValue({ headers: {} });
      
      const event = 'test-event';
      
      service.track(event);
      
      expect(mockTrack).toHaveBeenCalledWith(event, {
        distinct_id: 'default-cls-id' // Fallback to CLS ID when header is missing
      });
    });

    it('should track an event with properties', () => {
      // Mock empty request for header extraction
      clsService.get.mockReturnValue({ headers: {} });
      
      const event = 'test-event';
      const properties = { action: 'click' };
      
      service.track(event, properties);
      
      expect(mockTrack).toHaveBeenCalledWith(event, {
        action: 'click',
        distinct_id: 'default-cls-id' // Fallback to CLS ID when header is missing
      });
    });

    it('should extract user ID from header and add to properties', () => {
      const mockRequest = {
        headers: { 'x-user-id': '123' }
      };
      clsService.get.mockReturnValue(mockRequest);
      
      const event = 'test-event';
      const properties = { action: 'click' };
      
      service.track(event, properties);
      
      expect(mockTrack).toHaveBeenCalledWith(event, {
        action: 'click',
        distinct_id: '123'
      });
    });

    it('should handle missing request gracefully', () => {
      clsService.get.mockReturnValue(undefined);
      
      const event = 'test-event';
      
      service.track(event);
      
      expect(mockTrack).toHaveBeenCalledWith(event, {
        distinct_id: 'default-cls-id'  // Should fallback to CLS ID
      });
    });
  });

  describe('extractUserId', () => {
    it('should extract from header directly', () => {
      const mockRequest = {
        headers: { 'x-user-id': '123' }
      };
      clsService.get.mockReturnValue(mockRequest);
      
      const userId = service.extractUserId();
      expect(userId).toBe('123');
    });

    it('should extract from session path', async () => {
      const sessionOptions: MixpanelModuleOptions = {
        token: 'test-token',
        session: 'user.id'
      };

      const sessionClsService = {
        get: vi.fn(),
        getId: vi.fn().mockReturnValue('default-cls-id'),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MixpanelService,
          {
            provide: 'MIXPANEL_OPTIONS',
            useValue: sessionOptions,
          },
          ClsService,
        ],
      })
      .overrideProvider(ClsService)
      .useValue(sessionClsService)
      .compile();

      const sessionService = module.get<MixpanelService>(MixpanelService);

      const mockRequest = {
        user: { id: 'session-123' }
      };
      sessionClsService.get.mockReturnValue(mockRequest);

      const userId = sessionService.extractUserId();
      expect(userId).toBe('session-123');
    });

    it('should extract from user path', async () => {
      const userOptions: MixpanelModuleOptions = {
        token: 'test-token',
        user: 'auth.userId'
      };

      const userClsService = {
        get: vi.fn(),
        getId: vi.fn().mockReturnValue('default-cls-id'),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MixpanelService,
          {
            provide: 'MIXPANEL_OPTIONS',
            useValue: userOptions,
          },
          ClsService,
        ],
      })
      .overrideProvider(ClsService)
      .useValue(userClsService)
      .compile();

      const userService = module.get<MixpanelService>(MixpanelService);

      const mockRequest = {
        auth: { userId: 'user-456' }
      };
      userClsService.get.mockReturnValue(mockRequest);

      const userId = userService.extractUserId();
      expect(userId).toBe('user-456');
    });

    it('should fallback to CLS context ID when no specific field is configured', async () => {
      const fallbackOptions: MixpanelModuleOptions = {
        token: 'test-token'
      };

      const fallbackClsService = {
        getId: vi.fn().mockReturnValue('cls-context-123'),
        get: vi.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MixpanelService,
          {
            provide: 'MIXPANEL_OPTIONS',
            useValue: fallbackOptions,
          },
          ClsService,
        ],
      })
      .overrideProvider(ClsService)
      .useValue(fallbackClsService)
      .compile();

      const fallbackService = module.get<MixpanelService>(MixpanelService);

      const userId = fallbackService.extractUserId();
      expect(userId).toBe('cls-context-123');
      expect(fallbackClsService.getId).toHaveBeenCalled();
    });

    it('should use CLS context ID in tracking when no specific field is configured', async () => {
      const fallbackOptions: MixpanelModuleOptions = {
        token: 'test-token'
      };

      const fallbackClsService = {
        getId: vi.fn().mockReturnValue('cls-context-456'),
        get: vi.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MixpanelService,
          {
            provide: 'MIXPANEL_OPTIONS',
            useValue: fallbackOptions,
          },
          ClsService,
        ],
      })
      .overrideProvider(ClsService)
      .useValue(fallbackClsService)
      .compile();

      const fallbackService = module.get<MixpanelService>(MixpanelService);

      fallbackService.track('test-event', { action: 'click' });

      expect(mockTrack).toHaveBeenCalledWith('test-event', {
        action: 'click',
        distinct_id: 'cls-context-456'
      });
    });
  });
});