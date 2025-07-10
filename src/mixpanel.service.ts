import { Injectable, Inject } from '@nestjs/common';
import { AsyncStorageService } from './async-storage.service.js';
import Mixpanel from 'mixpanel';
import type { MixpanelModuleOptions } from './interface.js';
import { MIXPANEL_OPTIONS } from './constant.js';

@Injectable()
export class MixpanelService {
  private readonly mixpanel: Mixpanel.Mixpanel;

  constructor(
    @Inject(MIXPANEL_OPTIONS) private readonly options: MixpanelModuleOptions,
    @Inject(AsyncStorageService) private readonly asyncStorage: AsyncStorageService,
  ) {
    this.mixpanel = Mixpanel.init(this.options.token, this.options.initConfig);
  }

  track(event: string, properties?: Record<string, any>): void {
    const userId = this.extractUserId();
    const finalProperties = {
      ...(userId && { distinct_id: userId }),
      ...properties,
    };

    this.mixpanel.track(event, finalProperties);
  }

  extractUserId(): string | undefined {
    try {
      let userId: string | undefined;

      if ('header' in this.options) {
        const request = this.asyncStorage.getRequest();
        userId = request?.headers?.[this.options.header.toLowerCase()];
      } else if ('session' in this.options) {
        const session = this.asyncStorage.getSession();
        userId = this.extractValue(this.options.session, session);
      } else if ('user' in this.options) {
        const user = this.asyncStorage.getUser();
        userId = this.extractValue(this.options.user, user);
      }

      // Fallback to AsyncStorage context ID if no specific field is configured or extraction failed
      return userId || this.asyncStorage.getId();
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
