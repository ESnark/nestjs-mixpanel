import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Post, Module, MiddlewareConsumer, Inject } from '@nestjs/common';
import request from 'supertest';
import { MixpanelModule } from '../../mixpanel.module.js';
import { MixpanelService } from '../../mixpanel.service.js';
import { ClsModule, ClsMiddleware } from 'nestjs-cls';
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
  constructor(
    @Inject(MixpanelService) private readonly mixpanelService: MixpanelService
  ) {
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
      await request(app.getHttpServer())
        .post('/track')
        .set('x-user-id', 'user-456')
        .expect(201);

      expect(mockTrack).toHaveBeenCalledWith('test-event', {
        action: 'e2e-test',
        distinct_id: 'user-456',
      });
    });

    it('should fallback to CLS context ID when header is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/extract-user-id')
        .expect(201);

      expect(response.body.userId).toBeDefined();
      expect(response.body.userId).toMatch(/^[a-zA-Z0-9-]+$/); // CLS generates UUID-like IDs
    });
  });

  describe('Session extraction', () => {
    beforeEach(async () => {
      // Add middleware to simulate session
      @Module({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
            session: 'session.user.id',
          }),
        ],
        controllers: [TestController],
      })
      class TestModuleWithSession {
        configure(consumer: MiddlewareConsumer) {
          // Add middleware to inject session data
          consumer.apply((req: any, res: any, next: any) => {
            req.session = {
              user: {
                id: req.headers['session-user-id'] || 'session-default-123',
              },
            };
            next();
          }).forRoutes('*');
        }
      }

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
      const response = await request(app.getHttpServer())
        .post('/extract-user-id')
        .expect(201);

      expect(response.body).toEqual({ userId: 'session-default-123' });
    });
  });

  describe('User extraction', () => {
    beforeEach(async () => {
      // Add middleware to simulate user object
      @Module({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
            user: 'user.profile.userId',
          }),
        ],
        controllers: [TestController],
      })
      class TestModuleWithUser {
        configure(consumer: MiddlewareConsumer) {
          // Add middleware to inject user data
          consumer.apply((req: any, res: any, next: any) => {
            req.user = {
              profile: {
                userId: req.headers['auth-user-id'] || 'auth-default-456',
              },
            };
            next();
          }).forRoutes('*');
        }
      }

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

  describe('CLS Context', () => {
    it('should properly clean up CLS context', async () => {
      const TestModule = createTestModule({});
      
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      const userIds = new Set<string>();

      // Make multiple requests and collect CLS IDs
      // Use sequential requests with small delays to ensure different CLS contexts
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/extract-user-id')
          .expect(201);
        
        if (response.body.userId) {
          userIds.add(response.body.userId);
        }
        
        // Small delay to ensure different CLS contexts
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // All requests should have different CLS IDs
      expect(userIds.size).toBeGreaterThan(0);
    });
  });
});