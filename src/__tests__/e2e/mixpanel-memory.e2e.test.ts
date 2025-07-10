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
  constructor(@Inject(MixpanelService) private readonly mixpanelService: MixpanelService) {}

  @Post('track')
  track() {
    this.mixpanelService.track('test-event', { action: 'memory-test' });
    return { success: true };
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

describe('MixpanelModule Memory Leak Detection', () => {
  let app: INestApplication;

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should not leak memory over multiple request batches', async () => {
    const measurements = [];
    const batchSize = 100;
    const numberOfBatches = 5;

    // Initial GC and warmup
    if (global.gc) {
      global.gc();
    }

    // Warmup requests
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/test/track')
        .set('x-user-id', `warmup-${i}`)
        .set('Connection', 'close')
        .expect(201);
    }

    // Wait and GC
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (global.gc) {
      global.gc();
      await new Promise((resolve) => setTimeout(resolve, 500));
      global.gc();
    }

    // Measure memory after each batch
    for (let batch = 0; batch < numberOfBatches; batch++) {
      const beforeBatch = process.memoryUsage().heapUsed;

      for (let i = 0; i < batchSize; i++) {
        await request(app.getHttpServer())
          .post('/test/track')
          .set('x-user-id', `user-${batch}-${i}`)
          .set('Connection', 'close')
          .expect(201);
      }

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Force GC
      if (global.gc) {
        global.gc();
        await new Promise((resolve) => setTimeout(resolve, 500));
        global.gc();
      }

      const afterBatch = process.memoryUsage().heapUsed;
      const increase = afterBatch - beforeBatch;

      measurements.push({
        batch: batch + 1,
        increase: increase / 1024 / 1024, // MB
        increasePerRequest: increase / batchSize / 1024, // KB
      });

      console.log(
        `Batch ${batch + 1}: ${(increase / 1024 / 1024).toFixed(2)}MB increase, ${(increase / batchSize / 1024).toFixed(2)}KB per request`,
      );
    }

    // Check if memory increase is stabilizing
    const lastThreeBatches = measurements.slice(-3);
    const avgIncreasePerRequest =
      lastThreeBatches.reduce((sum, m) => sum + m.increasePerRequest, 0) / 3;

    console.log(
      `\nAverage increase per request (last 3 batches): ${avgIncreasePerRequest.toFixed(2)}KB`,
    );

    // Memory increase should stabilize (not grow linearly)
    expect(avgIncreasePerRequest).toBeLessThan(50); // 50KB per request after stabilization
  }, 120000); // 2 minute timeout
});
