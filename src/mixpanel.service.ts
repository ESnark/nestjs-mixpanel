import { Injectable, Inject, Logger } from '@nestjs/common';
import { AsyncStorageService } from './async-storage.service.js';
import Mixpanel from 'mixpanel';
import type { MixpanelModuleOptions } from './interface.js';
import { MIXPANEL_OPTIONS } from './constant.js';

type TrackFunction = (
  event: string,
  properties?: Mixpanel.PropertyDict,
  callback?: Mixpanel.Callback,
) => void;

type PeopleFunction = {
  (
    distinctId: string,
    properties: Mixpanel.PropertyDict,
    modifiers?: Mixpanel.Modifiers,
    callback?: Mixpanel.Callback,
  ): void;
  (distinctId: string, properties: Mixpanel.PropertyDict, callback: Mixpanel.Callback): void;
  (
    properties: Mixpanel.PropertyDict,
    modifiers?: Mixpanel.Modifiers,
    callback?: Mixpanel.Callback,
  ): void;
  (properties: Mixpanel.PropertyDict, callback: Mixpanel.Callback): void;
};

@Injectable()
export class MixpanelService {
  private readonly logger = new Logger(MixpanelService.name);
  private readonly mixpanel: Mixpanel.Mixpanel;
  private warnedExtractionFailure = false;

  constructor(
    @Inject(MIXPANEL_OPTIONS) private readonly options: MixpanelModuleOptions,
    @Inject(AsyncStorageService) private readonly asyncStorage: AsyncStorageService,
  ) {
    this.mixpanel = Mixpanel.init(this.options.token, this.options.initConfig);
  }

  track: TrackFunction = (event, properties, callback) => {
    const userId = this.extractUserId();
    const ip = this.getIp();
    const finalProperties = {
      // An empty distinct_id is Mixpanel's documented way to send an event
      // that is not associated with any user, so unresolved identities do
      // not pollute unique-user counts.
      distinct_id: userId ?? '',
      ...(ip && { ip }),
      ...properties,
    };

    if (callback) {
      this.mixpanel.track(event, finalProperties, callback);
    } else {
      this.mixpanel.track(event, finalProperties);
    }
  };

  private peopleSet(
    distinctId: string,
    properties: Mixpanel.PropertyDict,
    modifiers?: Mixpanel.Modifiers,
    callback?: Mixpanel.Callback,
  ): void;
  private peopleSet(
    properties: Mixpanel.PropertyDict,
    modifiers?: Mixpanel.Modifiers,
    callback?: Mixpanel.Callback,
  ): void;
  private peopleSet(
    arg1: string | Mixpanel.PropertyDict,
    arg2?: Mixpanel.PropertyDict | Mixpanel.Modifiers | Mixpanel.Callback,
    arg3?: Mixpanel.Modifiers | Mixpanel.Callback,
    arg4?: Mixpanel.Callback,
  ): void {
    const ip = this.getIp();
    const defaultModifiers: Mixpanel.Modifiers = ip ? { $ip: ip } : {};

    if (typeof arg1 === 'string') {
      // distinctId, properties, modifiers?, callback?
      const properties = arg2 as Mixpanel.PropertyDict;
      let modifiers: Mixpanel.Modifiers;
      let callback: Mixpanel.Callback | undefined;

      if (typeof arg3 === 'function') {
        // No modifiers provided, arg3 is callback
        modifiers = defaultModifiers;
        callback = arg3 as Mixpanel.Callback;
      } else {
        // arg3 is modifiers
        modifiers = { ...defaultModifiers, ...(arg3 as Mixpanel.Modifiers) };
        callback = arg4;
      }

      this.mixpanel.people.set(arg1, properties, modifiers, callback);
    } else {
      // properties, modifiers?, callback?
      const userId = this.extractUserId();
      if (!userId) {
        this.logger.warn(
          'Skipping people.set: no user identity could be resolved for the current context. Pass an explicit distinct ID or configure an identification strategy.',
        );
        return;
      }
      const properties = arg1;
      let modifiers: Mixpanel.Modifiers;
      let callback: Mixpanel.Callback | undefined;

      if (typeof arg2 === 'function') {
        // No modifiers provided, arg2 is callback
        modifiers = defaultModifiers;
        callback = arg2 as Mixpanel.Callback;
      } else {
        // arg2 is modifiers
        modifiers = { ...defaultModifiers, ...(arg2 as Mixpanel.Modifiers) };
        callback = arg3 as Mixpanel.Callback;
      }

      this.mixpanel.people.set(userId, properties, modifiers, callback);
    }
  }

  private peopleSetOnce(
    distinctId: string,
    properties: Mixpanel.PropertyDict,
    modifiers?: Mixpanel.Modifiers,
    callback?: Mixpanel.Callback,
  ): void;
  private peopleSetOnce(
    properties: Mixpanel.PropertyDict,
    modifiers?: Mixpanel.Modifiers,
    callback?: Mixpanel.Callback,
  ): void;
  private peopleSetOnce(
    arg1: string | Mixpanel.PropertyDict,
    arg2?: Mixpanel.PropertyDict | Mixpanel.Modifiers | Mixpanel.Callback,
    arg3?: Mixpanel.Modifiers | Mixpanel.Callback,
    arg4?: Mixpanel.Callback,
  ): void {
    const ip = this.getIp();
    const defaultModifiers: Mixpanel.Modifiers = ip ? { $ip: ip } : {};

    if (typeof arg1 === 'string') {
      // distinctId, properties, modifiers?, callback?
      const properties = arg2 as Mixpanel.PropertyDict;
      let modifiers: Mixpanel.Modifiers;
      let callback: Mixpanel.Callback | undefined;

      if (typeof arg3 === 'function') {
        // No modifiers provided, arg3 is callback
        modifiers = defaultModifiers;
        callback = arg3 as Mixpanel.Callback;
      } else {
        // arg3 is modifiers
        modifiers = { ...defaultModifiers, ...(arg3 as Mixpanel.Modifiers) };
        callback = arg4;
      }

      this.mixpanel.people.set_once(arg1, properties, modifiers, callback);
    } else {
      // properties, modifiers?, callback?
      const userId = this.extractUserId();
      if (!userId) {
        this.logger.warn(
          'Skipping people.setOnce: no user identity could be resolved for the current context. Pass an explicit distinct ID or configure an identification strategy.',
        );
        return;
      }
      const properties = arg1;
      let modifiers: Mixpanel.Modifiers;
      let callback: Mixpanel.Callback | undefined;

      if (typeof arg2 === 'function') {
        // No modifiers provided, arg2 is callback
        modifiers = defaultModifiers;
        callback = arg2 as Mixpanel.Callback;
      } else {
        // arg2 is modifiers
        modifiers = { ...defaultModifiers, ...(arg2 as Mixpanel.Modifiers) };
        callback = arg3 as Mixpanel.Callback | undefined;
      }

      this.mixpanel.people.set_once(userId, properties, modifiers, callback);
    }
  }

  /**
   * The underlying mixpanel-node instance, for APIs this module does not
   * wrap (batch tracking, groups, `people.increment`, imports, ...).
   * Calls made directly on the client bypass this module's automatic user
   * identification and IP resolution.
   */
  get client(): Mixpanel.Mixpanel {
    return this.mixpanel;
  }

  get people(): { set: PeopleFunction; setOnce: PeopleFunction } {
    return {
      set: this.peopleSet.bind(this) as PeopleFunction,
      setOnce: this.peopleSetOnce.bind(this) as PeopleFunction,
    };
  }

  private getIp(): string | undefined {
    const ipOption = this.options.ipHeader || 'X-Forwarded-For';

    const request = this.asyncStorage.getRequest();
    const headers = request?.headers;

    if (!headers) {
      return undefined;
    }

    switch (ipOption) {
      case 'X-Forwarded-For': {
        const xForwardedFor = headers['x-forwarded-for'];
        return xForwardedFor?.split(',')?.[0]?.trim();
      }
      case 'X-Real-IP':
        return headers['x-real-ip'];
      case 'Forwarded': {
        const forwarded = headers['forwarded'];
        if (!forwarded) return undefined;

        const match = forwarded.match(/for="?\[?(?<ip>(?:\d{1,3}\.){3}\d{1,3}|[A-Fa-f0-9:]+)\]?"?/);
        return match?.groups?.ip;
      }
      default:
        return undefined;
    }
  }

  extractUserId(): string | undefined {
    try {
      let userId: string | undefined;
      let strategyConfigured = true;

      if ('header' in this.options) {
        const request = this.asyncStorage.getRequest();
        userId = request?.headers?.[this.options.header.toLowerCase()];
      } else if ('session' in this.options) {
        const session = this.asyncStorage.getSession();
        userId = this.extractValue(this.options.session, session);
      } else if ('user' in this.options) {
        const user = this.asyncStorage.getUser();
        userId = this.extractValue(this.options.user, user);
      } else if ('cookie' in this.options) {
        userId = this.asyncStorage.getCookie(this.options.cookie);
      } else {
        strategyConfigured = false;
      }

      if (userId) {
        return userId;
      }

      if (strategyConfigured && !this.warnedExtractionFailure) {
        this.warnedExtractionFailure = true;
        this.logger.warn(
          'Could not extract a user ID with the configured identification strategy; the fallback identity will be used. This is logged only once.',
        );
      }

      return this.resolveFallbackId();
    } catch (error) {
      this.logger.warn(`Failed to extract user ID from request: ${error}`);
    }

    return undefined;
  }

  private resolveFallbackId(): string | undefined {
    const fallback = this.options.fallback ?? 'anonymous';

    if (fallback === 'request-context') {
      return this.asyncStorage.getId();
    }
    if (typeof fallback === 'function') {
      return fallback(this.asyncStorage.getRequest()) || undefined;
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
