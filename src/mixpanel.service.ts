import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import Mixpanel from 'mixpanel';
import type { MixpanelModuleOptions } from './interface.js';

@Injectable()
export class MixpanelService {
  private readonly mixpanel: Mixpanel.Mixpanel;

  constructor(
    @Inject('MIXPANEL_OPTIONS') private readonly options: MixpanelModuleOptions,
    @Inject(ClsService) private readonly cls: ClsService
  ) {
    this.mixpanel = Mixpanel.init(this.options.token, this.options.initConfig);
  }

  track(event: string, properties?: Record<string, any>): void {
    const userId = this.extractUserId();
    const finalProperties = {
      ...properties,
      ...(userId && { distinct_id: userId })
    };
    
    this.mixpanel.track(event, finalProperties);
  }

  extractUserId(): string | undefined {
    try {
      let userId: string | undefined;
      
      if ('header' in this.options) {
        const request = this.cls.get('req');
        userId = request?.headers?.[this.options.header.toLowerCase()];
      } else if ('session' in this.options) {
        const request = this.cls.get('req');
        userId = this.extractValue(this.options.session, request);
      } else if ('user' in this.options) {
        const request = this.cls.get('req');
        userId = this.extractValue(this.options.user, request);
      }
      
      // Fallback to CLS context ID if no specific field is configured or extraction failed
      return userId || this.cls.getId();
    } catch (error) {
      console.warn('Failed to extract user ID from request:', error);
    }
    
    return undefined;
  }

  private extractValue(path: string, obj: any): string | undefined {
    const pathParts = path.split('.');
    let value = obj;
    for (const key of pathParts) {
      value = value?.[key];
    }
    return value;
  }
}