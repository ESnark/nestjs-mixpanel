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
  'anonymous' | 'request-context' | ((request: unknown) => string | undefined);

/**
 * Device ID cookie attributes for Simplified ID Merge.
 */
export type IdMergeCookieOptions = {
  /** Cookie name. Default: `'mp_device_id'` */
  name?: string;
  /** Max-Age in seconds. Default: `31536000` (1 year) */
  maxAge?: number;
  /** Default: `'/'` */
  path?: string;
  domain?: string;
  /**
   * Default: `'Lax'`. `'None'` automatically adds the `Secure` attribute,
   * as required by browsers.
   */
  sameSite?: 'Strict' | 'Lax' | 'None';
  /** Default: `false`. Enable in production when serving over HTTPS. */
  secure?: boolean;
  /** Default: `true` — the cookie only exists for server-side analytics. */
  httpOnly?: boolean;
};

type CommonModuleOptions = {
  token: MixpanelProjectToken;
  initConfig?: InitConfig;
  ipHeader?: IpHeaderOption;
  fallback?: FallbackIdStrategy;
  /**
   * Enables Mixpanel Simplified ID Merge support. The middleware maintains a
   * device ID cookie (minting a UUID and setting the cookie when absent), and
   * every event carries `$device_id` — plus `$user_id` when the identification
   * strategy resolves one — so anonymous pre-login events and identified
   * post-login events are merged into a single user by Mixpanel.
   *
   * Requires the Mixpanel project to use the Simplified ID Merge API. When
   * enabled, the `fallback` option is ignored: the device identity IS the
   * anonymous identity.
   */
  idMerge?: boolean | IdMergeCookieOptions;
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
