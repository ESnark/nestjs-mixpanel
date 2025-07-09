import { MixpanelModuleOptions, MixpanelModuleAsyncOptions } from '../interface.js';
import { describe, it, expect } from 'vitest';

const token = 'test-token';

describe('MixpanelModuleOptions Type Tests', () => {
  describe('MixpanelModuleOptions', () => {
    it('should accept header option only', () => {
      const validOptions: MixpanelModuleOptions = { token, header: 'X-User-ID' };
      expect(validOptions.header).toBe('X-User-ID');
    });

    it('should accept session option only', () => {
      const validOptions: MixpanelModuleOptions = { token, session: 'user.session' };
      expect(validOptions.session).toBe('user.session');
    });

    it('should accept user option only', () => {
      const validOptions: MixpanelModuleOptions = { token, user: 'user.id' };
      expect(validOptions.user).toBe('user.id');
    });

    // TypeScript compilation tests - these will fail at compile time if types are wrong
    it('should compile with correct single option types', () => {
      const headerOption: MixpanelModuleOptions = { token, header: 'test' };
      const sessionOption: MixpanelModuleOptions = { token, session: 'test' };
      const userOption: MixpanelModuleOptions = { token, user: 'test' };
      
      expect(headerOption).toBeDefined();
      expect(sessionOption).toBeDefined();
      expect(userOption).toBeDefined();
    });

    // These tests verify that the union type works correctly
    it('should allow switching between option types', () => {
      let options: MixpanelModuleOptions;
      
      options = { token, header: 'X-User-ID' };
      expect(options.header).toBe('X-User-ID');
      
      options = { token, session: 'user.session' };
      expect(options.session).toBe('user.session');
      
      options = { token, user: 'user.id' };
      expect(options.user).toBe('user.id');
    });
  });

  describe('MixpanelModuleAsyncOptions', () => {
    it('should accept useFactory that returns MixpanelModuleOptions', () => {
      const asyncOptions: MixpanelModuleAsyncOptions = {
        useFactory: () => ({ token, header: 'X-User-ID' }),
      };
      
      const result = asyncOptions.useFactory();
      expect(result).toEqual({ token, header: 'X-User-ID' });
    });

    it('should accept useFactory that returns Promise<MixpanelModuleOptions>', async () => {
      const asyncOptions: MixpanelModuleAsyncOptions = {
        useFactory: async () => ({ token, session: 'user.session' }),
      };
      
      const result = await asyncOptions.useFactory();
      expect(result).toEqual({ token, session: 'user.session' });
    });

    it('should accept inject array', () => {
      const asyncOptions: MixpanelModuleAsyncOptions = {
        useFactory: (configService: any) => ({ token, user: 'user.id' }),
        inject: ['ConfigService'],
      };
      
      expect(asyncOptions.inject).toEqual(['ConfigService']);
    });

    it('should work without inject array', () => {
      const asyncOptions: MixpanelModuleAsyncOptions = {
        useFactory: () => ({ token, header: 'X-User-ID' }),
      };
      
      expect(asyncOptions.inject).toBeUndefined();
    });
  });

  describe('Type Safety Verification', () => {
    it('should demonstrate exclusive option behavior', () => {
      // This test demonstrates that only one option can be set at a time
      const options1: MixpanelModuleOptions = { token, header: 'test' };
      const options2: MixpanelModuleOptions = { token, session: 'test' };
      const options3: MixpanelModuleOptions = { token, user: 'test' };
      
      // These should have the expected properties
      expect('header' in options1).toBe(true);
      expect('header' in options2).toBe(false);
      expect('header' in options3).toBe(false);
      
      expect('session' in options1).toBe(false);
      expect('session' in options2).toBe(true);
      expect('session' in options3).toBe(false);
      
      expect('user' in options1).toBe(false);
      expect('user' in options2).toBe(false);
      expect('user' in options3).toBe(true);
    });
  });
});