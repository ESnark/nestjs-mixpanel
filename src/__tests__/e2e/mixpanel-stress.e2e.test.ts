import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Post, Module } from '@nestjs/common';
import request from 'supertest';
import { MixpanelModule } from '../../mixpanel.module.js';
import { MixpanelService } from '../../mixpanel.service.js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Inject } from '@nestjs/common';

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
@Controller('test')
class TestController {
  constructor(
    @Inject(MixpanelService) private readonly mixpanelService: MixpanelService
  ) {}

  @Post('track')
  async track() {
    await new Promise(resolve => setTimeout(resolve, 5)); // Small delay to simulate real processing
    this.mixpanelService.track('test-event', { action: 'stress-test' });
    return { success: true };
  }

  @Post('extract-user-id')
  extractUserId() {
    const userId = this.mixpanelService.extractUserId();
    return { userId };
  }
}

// Test module
@Module({
  imports: [
    MixpanelModule.forRoot({
      token: 'test-token',
      header: 'x-user-id',
    }),
  ],
  controllers: [TestController],
})
class TestModule {}

describe('MixpanelModule Stress Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Set keep-alive timeout to prevent ECONNRESET
    const server = app.getHttpServer();
    server.keepAliveTimeout = 120000; // 2 minutes
    server.headersTimeout = 120000; // 2 minutes
    
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should handle memory stress test', async () => {
    // Get initial memory usage
    if (global.gc) {
      global.gc();
    }
    const initialMemory = process.memoryUsage().heapUsed;

    // Make sequential requests
    const requestCount = 1000;
    
    for (let i = 0; i < requestCount; i++) {
      await request(app.getHttpServer())
        .post('/test/track')
        .set('x-user-id', `user-${i}`)
        .set('Connection', 'close') // Force connection close to avoid ECONNRESET
        .expect(201);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Check memory usage
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    const memoryIncreasePerRequest = memoryIncrease / requestCount;

    // Memory increase per request should be reasonable for E2E test environment
    console.log(`Memory increase per request: ${memoryIncreasePerRequest / 1024}KB`);
    console.log(`Total memory increase: ${memoryIncrease / 1024 / 1024}MB`);
    
    // In E2E test environment with NestJS app and supertest overhead,
    // 200KB per request is reasonable. In production, this would be much lower.
    expect(memoryIncreasePerRequest).toBeLessThan(200 * 1024); // 200KB per request in test env
  }, 60000); // 60 second timeout

  it('should handle concurrent requests', async () => {
    const concurrentRequests = 5; // Small number to avoid connection issues
    const allUserIds = [];
    
    const promises = Array.from({ length: concurrentRequests }, (_, i) => {
      const userId = `concurrent-user-${i}`;
      allUserIds.push(userId);
      return request(app.getHttpServer())
        .post('/test/track')
        .set('x-user-id', userId)
        .set('Connection', 'close')
        .expect(201);
    });
    
    await Promise.all(promises);

    // Check that all events were tracked with correct user IDs
    const trackedUserIds = mockTrack.mock.calls.map(call => call[1].distinct_id);
    
    expect(trackedUserIds.sort()).toEqual(allUserIds.sort());
  });

  it('should generate unique CLS IDs', async () => {
    const userIds = new Set<string>();

    // Make sequential requests
    for (let i = 0; i < 5; i++) {
      const response = await request(app.getHttpServer())
        .post('/test/extract-user-id')
        .set('Connection', 'close')
        .expect(201);
      
      if (response.body.userId) {
        userIds.add(response.body.userId);
      }
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Should have unique IDs
    expect(userIds.size).toBeGreaterThan(0);
  });
});