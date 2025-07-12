import type { InitConfig } from 'mixpanel';
/**
 * Mixpanel project token
 * @see https://docs.mixpanel.com/docs/project-tokens
 */
type MixpanelProjectToken = string;

type IpHeaderOption = 'X-Forwarded-For' | 'X-Real-IP' | 'Forwarded';

type CommonModuleOptions = {
  token: MixpanelProjectToken;
  initConfig?: InitConfig;
  ipHeader?: IpHeaderOption;
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
