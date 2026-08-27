import type { InitConfig } from 'mixpanel';
/**
 * Mixpanel project token
 * @see https://docs.mixpanel.com/docs/project-tokens
 */
type MixpanelProjectToken = string;

type IpHeaderOption = 'X-Forwarded-For' | 'X-Real-IP' | 'Forwarded';

/**
 * Determines the identity used when no user ID could be extracted:
 * - `'anonymous'` (default): events are sent with an empty `distinct_id`,
 *   so they are not associated with any user in Mixpanel
 * - `'request-context'`: events use a random UUID generated per request
 *   (the pre-2.0 behavior; every request looks like a different user)
 * - custom resolver: receives the current request object (`undefined`
 *   outside of a request context) and returns a `distinct_id`, or
 *   `undefined` to fall back to anonymous
 */
export type FallbackIdStrategy =
  | 'anonymous'
  | 'request-context'
  | ((request: unknown) => string | undefined);

type CommonModuleOptions = {
  token: MixpanelProjectToken;
  initConfig?: InitConfig;
  ipHeader?: IpHeaderOption;
  fallback?: FallbackIdStrategy;
};

export type MixpanelModuleOptions =
  | (CommonModuleOptions & { header: string })
  | (CommonModuleOptions & { session: string })
  | (CommonModuleOptions & { user: string })
  | (CommonModuleOptions & { cookie: string })
  | CommonModuleOptions;

export type MixpanelModuleAsyncOptions = {
  useFactory: (...args: any[]) => MixpanelModuleOptions | Promise<MixpanelModuleOptions>;
  inject?: any[];
};
