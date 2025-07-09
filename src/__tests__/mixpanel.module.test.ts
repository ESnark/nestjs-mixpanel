import { Test, TestingModule } from '@nestjs/testing';
import { MixpanelModule } from '../mixpanel.module.js';
import { MixpanelService } from '../mixpanel.service.js';
import { AsyncStorageService } from '../async-storage.service.js';
import { MixpanelModuleOptions, MixpanelModuleAsyncOptions } from '../interface.js';
import { describe, it, expect } from 'vitest';

describe('MixpanelModule', () => {
  describe('forRoot', () => {
    it('should create module with header option', async () => {
      const options: MixpanelModuleOptions = { token: 'test', header: 'X-User-ID' };
      
      const moduleRef = MixpanelModule.forRoot(options);
      
      expect(moduleRef.module).toBe(MixpanelModule);
      expect(moduleRef.global).toBe(true);
      expect(moduleRef.providers).toHaveLength(3);
      expect(moduleRef.providers).toContainEqual({
        provide: 'MIXPANEL_OPTIONS',
        useValue: options,
      });
      expect(moduleRef.providers).toContain(MixpanelService);
      expect(moduleRef.providers).toContain(AsyncStorageService);
    });

    it('should create module with session option', async () => {
      const options: MixpanelModuleOptions = { token: 'test', session: 'user.session' };
      
      const moduleRef = MixpanelModule.forRoot(options);
      
      expect(moduleRef.providers?.[0]).toEqual({
        provide: 'MIXPANEL_OPTIONS',
        useValue: options,
      });
    });

    it('should create module with user option', async () => {
      const options: MixpanelModuleOptions = { token: 'test', user: 'user.id' };
      
      const moduleRef = MixpanelModule.forRoot(options);
      
      expect(moduleRef.providers?.[0]).toEqual({
        provide: 'MIXPANEL_OPTIONS',
        useValue: options,
      });
    });

    it('should make module available in the application', async () => {
      const options: MixpanelModuleOptions = { token: 'test-token', header: 'X-User-ID' };
      const dynamicModule = MixpanelModule.forRoot(options);
      
      const module: TestingModule = await Test.createTestingModule({
        imports: [dynamicModule],
      }).compile();
      
      const service = module.get<MixpanelService>(MixpanelService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MixpanelService);
    });
  });

  describe('forRootAsync', () => {
    it('should create module with useFactory', async () => {
      const mockOptions: MixpanelModuleOptions = { token: 'test', header: 'X-User-ID' };
      const options: MixpanelModuleAsyncOptions = {
        useFactory: () => mockOptions,
        inject: [],
      };
      
      const moduleRef = MixpanelModule.forRootAsync(options);
      
      expect(moduleRef.module).toBe(MixpanelModule);
      expect(moduleRef.global).toBe(true);
      expect(moduleRef.providers).toHaveLength(3);
      expect(moduleRef.providers).toContainEqual({
        provide: 'MIXPANEL_OPTIONS',
        useFactory: options.useFactory,
        inject: options.inject,
      });
      expect(moduleRef.providers).toContain(MixpanelService);
      expect(moduleRef.providers).toContain(AsyncStorageService);
    });

    it('should create module with useFactory and inject dependencies', async () => {
      const mockOptions: MixpanelModuleOptions = { token: 'test', user: 'user.id' };
      const options: MixpanelModuleAsyncOptions = {
        useFactory: (configService: any) => mockOptions,
        inject: ['ConfigService'],
      };
      
      const moduleRef = MixpanelModule.forRootAsync(options);
      
      expect(moduleRef.providers?.[0]).toEqual({
        provide: 'MIXPANEL_OPTIONS',
        useFactory: options.useFactory,
        inject: options.inject,
      });
    });

    it('should make async module available in the application', async () => {
      const mockOptions: MixpanelModuleOptions = { token: 'test', session: 'user.session' };
      const dynamicModule = MixpanelModule.forRootAsync({
        useFactory: () => mockOptions,
      });
      
      const module: TestingModule = await Test.createTestingModule({
        imports: [dynamicModule],
      }).compile();
      
      const service = module.get<MixpanelService>(MixpanelService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MixpanelService);
    });
  });
});