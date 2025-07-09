import { Test, TestingModule } from '@nestjs/testing';
import { MixpanelService } from '../mixpanel.service.js';
import { MixpanelModuleOptions } from '../interface.js';
import { AsyncStorageService } from '../async-storage.service.js';
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
  let asyncStorageService: any;

  const mockOptions: MixpanelModuleOptions = {
    token: 'test-token',
    header: 'x-user-id'
  };

  beforeEach(async () => {
    asyncStorageService = {
      get: vi.fn(),
      getId: vi.fn().mockReturnValue('default-cls-id'),
      getRequest: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MixpanelService,
        {
          provide: 'MIXPANEL_OPTIONS',
          useValue: mockOptions,
        },
        AsyncStorageService,
      ],
    })
    .overrideProvider(AsyncStorageService)
    .useValue(asyncStorageService)
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
      asyncStorageService.getRequest.mockReturnValue({ headers: {} });
      
      const event = 'test-event';
      
      service.track(event);
      
      expect(mockTrack).toHaveBeenCalledWith(event, {
        distinct_id: 'default-cls-id' // Fallback to AsyncStorage ID when header is missing
      });
    });

    it('should track an event with properties', () => {
      // Mock empty request for header extraction
      asyncStorageService.getRequest.mockReturnValue({ headers: {} });
      
      const event = 'test-event';
      const properties = { action: 'click' };
      
      service.track(event, properties);
      
      expect(mockTrack).toHaveBeenCalledWith(event, {
        action: 'click',
        distinct_id: 'default-cls-id' // Fallback to AsyncStorage ID when header is missing
      });
    });

    it('should extract user ID from header and add to properties', () => {
      const mockRequest = {
        headers: { 'x-user-id': '123' }
      };
      asyncStorageService.getRequest.mockReturnValue(mockRequest);
      
      const event = 'test-event';
      const properties = { action: 'click' };
      
      service.track(event, properties);
      
      expect(mockTrack).toHaveBeenCalledWith(event, {
        action: 'click',
        distinct_id: '123'
      });
    });

    it('should handle missing request gracefully', () => {
      asyncStorageService.getRequest.mockReturnValue(undefined);
      
      const event = 'test-event';
      
      service.track(event);
      
      expect(mockTrack).toHaveBeenCalledWith(event, {
        distinct_id: 'default-cls-id'  // Should fallback to AsyncStorage ID
      });
    });
  });

  describe('extractUserId', () => {
    it('should extract from header directly', () => {
      const mockRequest = {
        headers: { 'x-user-id': '123' }
      };
      asyncStorageService.getRequest.mockReturnValue(mockRequest);
      
      const userId = service.extractUserId();
      expect(userId).toBe('123');
    });

    it('should extract from session path', async () => {
      const sessionOptions: MixpanelModuleOptions = {
        token: 'test-token',
        session: 'user.id'
      };

      const sessionAsyncStorageService = {
        get: vi.fn(),
        getId: vi.fn().mockReturnValue('default-cls-id'),
        getRequest: vi.fn(),
        getUser: vi.fn(),
        getSession: vi.fn().mockReturnValue({ user: { id: 'session-123' } }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MixpanelService,
          {
            provide: 'MIXPANEL_OPTIONS',
            useValue: sessionOptions,
          },
          AsyncStorageService,
        ],
      })
      .overrideProvider(AsyncStorageService)
      .useValue(sessionAsyncStorageService)
      .compile();

      const sessionService = module.get<MixpanelService>(MixpanelService);

      // Session is already mocked in the service creation above

      const userId = sessionService.extractUserId();
      expect(userId).toBe('session-123');
    });

    it('should extract from user path', async () => {
      const userOptions: MixpanelModuleOptions = {
        token: 'test-token',
        user: 'auth.userId'
      };

      const userAsyncStorageService = {
        get: vi.fn(),
        getId: vi.fn().mockReturnValue('default-cls-id'),
        getRequest: vi.fn(),
        getUser: vi.fn().mockReturnValue({ auth: { userId: 'user-456' } }),
        getSession: vi.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MixpanelService,
          {
            provide: 'MIXPANEL_OPTIONS',
            useValue: userOptions,
          },
          AsyncStorageService,
        ],
      })
      .overrideProvider(AsyncStorageService)
      .useValue(userAsyncStorageService)
      .compile();

      const userService = module.get<MixpanelService>(MixpanelService);

      // User is already mocked in the service creation above

      const userId = userService.extractUserId();
      expect(userId).toBe('user-456');
    });

    it('should fallback to AsyncStorage context ID when no specific field is configured', async () => {
      const fallbackOptions: MixpanelModuleOptions = {
        token: 'test-token'
      };

      const fallbackAsyncStorageService = {
        getId: vi.fn().mockReturnValue('cls-context-123'),
        get: vi.fn(),
        getRequest: vi.fn(),
        getUser: vi.fn(),
        getSession: vi.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MixpanelService,
          {
            provide: 'MIXPANEL_OPTIONS',
            useValue: fallbackOptions,
          },
          AsyncStorageService,
        ],
      })
      .overrideProvider(AsyncStorageService)
      .useValue(fallbackAsyncStorageService)
      .compile();

      const fallbackService = module.get<MixpanelService>(MixpanelService);

      const userId = fallbackService.extractUserId();
      expect(userId).toBe('cls-context-123');
      expect(fallbackAsyncStorageService.getId).toHaveBeenCalled();
    });

    it('should use AsyncStorage context ID in tracking when no specific field is configured', async () => {
      const fallbackOptions: MixpanelModuleOptions = {
        token: 'test-token'
      };

      const fallbackAsyncStorageService = {
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
          AsyncStorageService,
        ],
      })
      .overrideProvider(AsyncStorageService)
      .useValue(fallbackAsyncStorageService)
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