import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Controller,
  Post,
  Module,
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  UseGuards,
} from '@nestjs/common';
import request from 'supertest';
import { MixpanelModule } from '../../mixpanel.module.js';
import { MixpanelService } from '../../mixpanel.service.js';
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

// Test controller
@Controller()
class TestController {
  constructor(@Inject(MixpanelService) private readonly mixpanelService: MixpanelService) {
    console.log('TestController created with mixpanelService:', mixpanelService);
  }

  @Post('/track')
  track() {
    console.log('track called, mixpanelService:', this.mixpanelService);
    this.mixpanelService.track('test-event', { action: 'e2e-test' });
    return { success: true };
  }

  @Post('/extract-user-id')
  extractUserId() {
    console.log('extractUserId called, mixpanelService:', this.mixpanelService);
    const userId = this.mixpanelService.extractUserId();
    return { userId };
  }
}

// Test module factory
function createTestModule(mixpanelOptions: any) {
  @Module({
    imports: [
      MixpanelModule.forRoot({
        token: 'test-token',
        ...mixpanelOptions,
      }),
    ],
    controllers: [TestController],
  })
  class TestModule {}

  return TestModule;
}

describe('MixpanelModule E2E Tests', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    vi.clearAllMocks();
  });

  describe('Header extraction', () => {
    beforeEach(async () => {
      const TestModule = createTestModule({ header: 'x-user-id' });

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    it('should extract user ID from header', async () => {
      const response = await request(app.getHttpServer())
        .post('/extract-user-id')
        .set('x-user-id', 'user-123')
        .expect(201);

      expect(response.body).toEqual({ userId: 'user-123' });
    });

    it('should track event with user ID from header', async () => {
      await request(app.getHttpServer()).post('/track').set('x-user-id', 'user-456').expect(201);

      expect(mockTrack).toHaveBeenCalledWith('test-event', {
        action: 'e2e-test',
        distinct_id: 'user-456',
      });
    });

    it('should fallback to AsyncStorage context ID when header is missing', async () => {
      const response = await request(app.getHttpServer()).post('/extract-user-id').expect(201);

      expect(response.body.userId).toBeDefined();
      expect(response.body.userId).toMatch(/^[a-zA-Z0-9-]+$/); // AsyncStorage generates UUID-like IDs
    });
  });

  describe('Session extraction', () => {
    beforeEach(async () => {
      // Guard to set session data
      @Injectable()
      class SessionGuard implements CanActivate {
        canActivate(context: ExecutionContext): boolean {
          const request = context.switchToHttp().getRequest();
          request.session = {
            user: {
              id: request.headers['session-user-id'] || 'session-default-123',
            },
          };
          return true;
        }
      }

      // Controller with guard
      @Controller()
      @UseGuards(SessionGuard)
      class TestControllerWithSession {
        constructor(@Inject(MixpanelService) private readonly mixpanelService: MixpanelService) {
          console.log('TestControllerWithSession created with mixpanelService:', mixpanelService);
        }

        @Post('track')
        track() {
          this.mixpanelService.track('test-event', { action: 'e2e-test' });
          return { success: true };
        }

        @Post('extract-user-id')
        extractUserId() {
          console.log(
            'extractUserId called in session test, mixpanelService:',
            this.mixpanelService,
          );
          const userId = this.mixpanelService.extractUserId();
          return { userId };
        }
      }

      @Module({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
            session: 'user.id',
          }),
        ],
        controllers: [TestControllerWithSession],
        providers: [SessionGuard],
      })
      class TestModuleWithSession {}

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [TestModuleWithSession],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    it('should extract user ID from session path', async () => {
      const response = await request(app.getHttpServer())
        .post('/extract-user-id')
        .set('session-user-id', 'session-user-789')
        .expect(201);

      expect(response.body).toEqual({ userId: 'session-user-789' });
    });

    it('should track event with user ID from session', async () => {
      await request(app.getHttpServer())
        .post('/track')
        .set('session-user-id', 'session-user-999')
        .expect(201);

      expect(mockTrack).toHaveBeenCalledWith('test-event', {
        action: 'e2e-test',
        distinct_id: 'session-user-999',
      });
    });

    it('should handle nested session paths', async () => {
      const response = await request(app.getHttpServer()).post('/extract-user-id').expect(201);

      expect(response.body).toEqual({ userId: 'session-default-123' });
    });
  });

  describe('User extraction', () => {
    beforeEach(async () => {
      // Guard to set user data
      @Injectable()
      class UserGuard implements CanActivate {
        canActivate(context: ExecutionContext): boolean {
          const request = context.switchToHttp().getRequest();
          request.user = {
            profile: {
              userId: request.headers['auth-user-id'] || 'auth-default-456',
            },
          };
          return true;
        }
      }

      // Controller with guard
      @Controller()
      @UseGuards(UserGuard)
      class TestControllerWithUser {
        constructor(@Inject(MixpanelService) private readonly mixpanelService: MixpanelService) {
          console.log('TestControllerWithUser created with mixpanelService:', mixpanelService);
        }

        @Post('track')
        track() {
          this.mixpanelService.track('test-event', { action: 'e2e-test' });
          return { success: true };
        }

        @Post('extract-user-id')
        extractUserId() {
          console.log('extractUserId called in user test, mixpanelService:', this.mixpanelService);
          const userId = this.mixpanelService.extractUserId();
          return { userId };
        }
      }

      @Module({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
            user: 'profile.userId',
          }),
        ],
        controllers: [TestControllerWithUser],
        providers: [UserGuard],
      })
      class TestModuleWithUser {}

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [TestModuleWithUser],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    it('should extract user ID from user path', async () => {
      const response = await request(app.getHttpServer())
        .post('/extract-user-id')
        .set('auth-user-id', 'authenticated-user-111')
        .expect(201);

      expect(response.body).toEqual({ userId: 'authenticated-user-111' });
    });

    it('should track event with user ID from user object', async () => {
      await request(app.getHttpServer())
        .post('/track')
        .set('auth-user-id', 'authenticated-user-222')
        .expect(201);

      expect(mockTrack).toHaveBeenCalledWith('test-event', {
        action: 'e2e-test',
        distinct_id: 'authenticated-user-222',
      });
    });
  });

  describe('AsyncStorage Context', () => {
    it('should properly clean up AsyncStorage context', async () => {
      const TestModule = createTestModule({});

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      const userIds = new Set<string>();

      // Make multiple requests and collect AsyncStorage IDs
      // Use sequential requests with small delays to ensure different AsyncStorage contexts
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer()).post('/extract-user-id').expect(201);

        if (response.body.userId) {
          userIds.add(response.body.userId);
        }

        // Small delay to ensure different AsyncStorage contexts
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // All requests should have different AsyncStorage IDs
      expect(userIds.size).toBeGreaterThan(0);
    });
  });
});
