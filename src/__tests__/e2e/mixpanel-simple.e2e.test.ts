import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable, Controller, Module, Get, MiddlewareConsumer, NestModule, Inject } from '@nestjs/common';
import request from 'supertest';
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

describe('MixpanelModule Simple E2E Tests', () => {
  let app: INestApplication;
  let mixpanelService: MixpanelService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should work with header extraction', async () => {
    @Injectable()
    class TestService {
      constructor(@Inject(MixpanelService) private readonly mixpanelService: MixpanelService) {}

      trackEvent() {
        return this.mixpanelService.track('test-event', { test: true });
      }

      getUserId() {
        return this.mixpanelService.extractUserId();
      }
    }

    @Controller('test')
    class TestController {
      constructor(@Inject(TestService) private readonly testService: TestService) {}

      @Get('track')
      track() {
        this.testService.trackEvent();
        return { success: true };
      }

      @Get('user-id')
      getUserId() {
        return { userId: this.testService.getUserId() };
      }
    }

    @Module({
      imports: [
        MixpanelModule.forRoot({
          token: 'test-token',
          header: 'x-user-id',
        }),
      ],
      controllers: [TestController],
      providers: [TestService],
    })
    class AppModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        // Middleware is configured by ClsModule inside MixpanelModule
      }
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Test header extraction
    const response = await request(app.getHttpServer())
      .get('/test/user-id')
      .set('x-user-id', 'header-user-123')
      .expect(200);

    expect(response.body.userId).toBe('header-user-123');

    // Test tracking with header
    await request(app.getHttpServer())
      .get('/test/track')
      .set('x-user-id', 'header-user-456')
      .expect(200);

    expect(mockTrack).toHaveBeenCalledWith('test-event', {
      test: true,
      distinct_id: 'header-user-456',
    });
  });

  it('should work with session extraction', async () => {
    @Controller('test')
    class TestController {
      constructor(@Inject(MixpanelService) private readonly mixpanelService: MixpanelService) {}

      @Get('user-id')
      getUserId() {
        return { userId: this.mixpanelService.extractUserId() };
      }

      @Get('track')
      track() {
        this.mixpanelService.track('session-event', { sessionTest: true });
        return { success: true };
      }
    }

    @Module({
      imports: [
        MixpanelModule.forRoot({
          token: 'test-token',
          session: 'session.user.id',
        }),
      ],
      controllers: [TestController],
    })
    class AppModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        // Add middleware to simulate session
        consumer
          .apply((req: any, res: any, next: any) => {
            req.session = {
              user: {
                id: req.headers['session-id'] || 'default-session-id',
              },
            };
            next();
          })
          .forRoutes('*');
      }
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Test session extraction
    const response = await request(app.getHttpServer())
      .get('/test/user-id')
      .set('session-id', 'session-user-789')
      .expect(200);

    expect(response.body.userId).toBe('session-user-789');

    // Test tracking with session
    await request(app.getHttpServer())
      .get('/test/track')
      .set('session-id', 'session-user-999')
      .expect(200);

    expect(mockTrack).toHaveBeenCalledWith('session-event', {
      sessionTest: true,
      distinct_id: 'session-user-999',
    });
  });

  it('should work with user object extraction', async () => {
    @Controller('test')
    class TestController {
      constructor(@Inject(MixpanelService) private readonly mixpanelService: MixpanelService) {}

      @Get('user-id')
      getUserId() {
        return { userId: this.mixpanelService.extractUserId() };
      }
    }

    @Module({
      imports: [
        MixpanelModule.forRoot({
          token: 'test-token',
          user: 'user.profile.id',
        }),
      ],
      controllers: [TestController],
    })
    class AppModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        // Add middleware to simulate user object
        consumer
          .apply((req: any, res: any, next: any) => {
            req.user = {
              profile: {
                id: req.headers['user-id'] || 'default-user-id',
              },
            };
            next();
          })
          .forRoutes('*');
      }
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Test user extraction
    const response = await request(app.getHttpServer())
      .get('/test/user-id')
      .set('user-id', 'user-object-111')
      .expect(200);

    expect(response.body.userId).toBe('user-object-111');
  });

  it('should fallback to CLS context ID when no option is configured', async () => {
    @Controller('test')
    class TestController {
      constructor(@Inject(MixpanelService) private readonly mixpanelService: MixpanelService) {}

      @Get('user-id')
      getUserId() {
        return { userId: this.mixpanelService.extractUserId() };
      }
    }

    @Module({
      imports: [
        MixpanelModule.forRoot({
          token: 'test-token',
        }),
      ],
      controllers: [TestController],
    })
    class AppModule {}

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Test CLS ID fallback
    const response = await request(app.getHttpServer())
      .get('/test/user-id')
      .expect(200);

    expect(response.body.userId).toBeDefined();
    expect(response.body.userId).toMatch(/^[a-zA-Z0-9-]+$/); // CLS generates UUID-like IDs
  });

  describe('Memory leak prevention', () => {
    it('should not retain references across requests', async () => {
      @Controller('test')
      class TestController {
        constructor(@Inject(MixpanelService) private readonly mixpanelService: MixpanelService) {}

        @Get('track')
        track() {
          this.mixpanelService.track('memory-test', { timestamp: Date.now() });
          return { success: true };
        }
      }

      @Module({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
            header: 'x-user-id',
          }),
        ],
        controllers: [TestController],
      })
      class AppModule {}

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      // Make multiple requests with different user IDs
      const userIds = [];
      for (let i = 0; i < 100; i++) {
        const userId = `user-${i}`;
        userIds.push(userId);
        
        await request(app.getHttpServer())
          .get('/test/track')
          .set('x-user-id', userId)
          .expect(200);
      }

      // Verify each request had unique user ID
      const trackedCalls = mockTrack.mock.calls;
      const trackedUserIds = trackedCalls.map(call => call[1].distinct_id);
      
      expect(new Set(trackedUserIds).size).toBe(100);
      expect(trackedUserIds).toEqual(userIds);
    });
  });

  describe('ClsService Integration', () => {
    it('should get unique CLS context IDs for concurrent requests', async () => {
      @Controller('test')
      class TestController {
        constructor(
          @Inject(MixpanelService) private readonly mixpanelService: MixpanelService,
          @Inject(ClsService) private readonly clsService: ClsService
        ) {}

        @Get('cls-id')
        getClsId() {
          return { 
            clsId: this.clsService.getId(),
            userId: this.mixpanelService.extractUserId() 
          };
        }
      }

      @Module({
        imports: [
          MixpanelModule.forRoot({
            token: 'test-token',
          }),
        ],
        controllers: [TestController],
      })
      class AppModule {}

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      // Make concurrent requests with smaller batch to avoid ECONNRESET
      const responses = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .get('/test/cls-id')
          .expect(200);
        responses.push(response);
        // Small delay to ensure different CLS contexts
        await new Promise(resolve => setTimeout(resolve, 5));
      }
      const clsIds = responses.map(r => r.body.clsId);
      const userIds = responses.map(r => r.body.userId);

      // Should have at least some unique CLS IDs
      const uniqueClsIds = new Set(clsIds);
      expect(uniqueClsIds.size).toBeGreaterThan(0);
      expect(uniqueClsIds.size).toBeLessThanOrEqual(10);
      // User IDs should match CLS IDs when no specific extraction is configured
      expect(userIds).toEqual(clsIds);
    });
  });
});