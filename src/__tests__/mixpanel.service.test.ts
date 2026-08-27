import { Test, TestingModule } from '@nestjs/testing';
import { MixpanelService } from '../mixpanel.service.js';
import { MixpanelModuleOptions } from '../interface.js';
import { AsyncStorageService } from '../async-storage.service.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock mixpanel at the module level
const mockTrack = vi.fn();
const mockPeopleSet = vi.fn();
const mockPeopleSetOnce = vi.fn();
vi.mock('mixpanel', () => ({
  default: {
    init: vi.fn(() => ({
      track: mockTrack,
      people: {
        set: mockPeopleSet,
        set_once: mockPeopleSetOnce,
      },
    })),
  },
}));

describe('MixpanelService', () => {
  let service: MixpanelService;
  let asyncStorageService: any;

  const mockOptions: MixpanelModuleOptions = {
    token: 'test-token',
    header: 'x-user-id',
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
        distinct_id: 'default-cls-id', // Fallback to AsyncStorage ID when header is missing
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
        distinct_id: 'default-cls-id', // Fallback to AsyncStorage ID when header is missing
      });
    });

    it('should extract user ID from header and add to properties', () => {
      const mockRequest = {
        headers: { 'x-user-id': '123' },
      };
      asyncStorageService.getRequest.mockReturnValue(mockRequest);

      const event = 'test-event';
      const properties = { action: 'click' };

      service.track(event, properties);

      expect(mockTrack).toHaveBeenCalledWith(event, {
        action: 'click',
        distinct_id: '123',
      });
    });

    it('should handle missing request gracefully', () => {
      asyncStorageService.getRequest.mockReturnValue(undefined);

      const event = 'test-event';

      service.track(event);

      expect(mockTrack).toHaveBeenCalledWith(event, {
        distinct_id: 'default-cls-id', // Should fallback to AsyncStorage ID
      });
    });
  });

  describe('extractUserId', () => {
    it('should extract from header directly', () => {
      const mockRequest = {
        headers: { 'x-user-id': '123' },
      };
      asyncStorageService.getRequest.mockReturnValue(mockRequest);

      const userId = service.extractUserId();
      expect(userId).toBe('123');
    });

    it('should extract from session path', async () => {
      const sessionOptions: MixpanelModuleOptions = {
        token: 'test-token',
        session: 'user.id',
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
        user: 'auth.userId',
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
        token: 'test-token',
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
        token: 'test-token',
      };

      const fallbackAsyncStorageService = {
        getId: vi.fn().mockReturnValue('cls-context-456'),
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

      fallbackService.track('test-event', { action: 'click' });

      expect(mockTrack).toHaveBeenCalledWith('test-event', {
        action: 'click',
        distinct_id: 'cls-context-456',
      });
    });
  });

  describe('cookie extraction', () => {
    const createCookieService = async (cookieValue: string | undefined) => {
      const cookieOptions: MixpanelModuleOptions = {
        token: 'test-token',
        cookie: 'userId',
      };

      const cookieAsyncStorageService = {
        get: vi.fn(),
        getId: vi.fn().mockReturnValue('default-cls-id'),
        getRequest: vi.fn(),
        getUser: vi.fn(),
        getSession: vi.fn(),
        getCookie: vi.fn().mockReturnValue(cookieValue),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MixpanelService,
          {
            provide: 'MIXPANEL_OPTIONS',
            useValue: cookieOptions,
          },
          AsyncStorageService,
        ],
      })
        .overrideProvider(AsyncStorageService)
        .useValue(cookieAsyncStorageService)
        .compile();

      return {
        cookieService: module.get<MixpanelService>(MixpanelService),
        cookieAsyncStorageService,
      };
    };

    it('should use the cookie value as the user ID', async () => {
      const { cookieService, cookieAsyncStorageService } = await createCookieService('abc123');

      expect(cookieService.extractUserId()).toBe('abc123');
      expect(cookieAsyncStorageService.getCookie).toHaveBeenCalledWith('userId');
    });

    it('should fallback to AsyncStorage context ID when the cookie is missing', async () => {
      const { cookieService } = await createCookieService(undefined);

      expect(cookieService.extractUserId()).toBe('default-cls-id');
    });
  });

  describe('people', () => {
    beforeEach(() => {
      asyncStorageService.getRequest.mockReturnValue({
        headers: { 'x-user-id': 'user-123' },
      });
    });

    it('should set profile properties with an explicit distinct ID', () => {
      service.people.set('explicit-id', { name: 'John' });

      expect(mockPeopleSet).toHaveBeenCalledWith('explicit-id', { name: 'John' }, {}, undefined);
    });

    it('should set profile properties using the extracted user ID', () => {
      service.people.set({ name: 'John' });

      expect(mockPeopleSet).toHaveBeenCalledWith('user-123', { name: 'John' }, {}, undefined);
    });

    it('should set profile properties once with an explicit distinct ID', () => {
      service.people.setOnce('explicit-id', { created_at: '2025-01-01' });

      expect(mockPeopleSetOnce).toHaveBeenCalledWith(
        'explicit-id',
        { created_at: '2025-01-01' },
        {},
        undefined,
      );
    });

    it('should set profile properties once using the extracted user ID', () => {
      service.people.setOnce({ created_at: '2025-01-01' });

      expect(mockPeopleSetOnce).toHaveBeenCalledWith(
        'user-123',
        { created_at: '2025-01-01' },
        {},
        undefined,
      );
    });
  });
});
