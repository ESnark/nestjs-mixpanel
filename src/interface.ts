import type { InitConfig } from 'mixpanel';
/**
 * Mixpanel project token
 * @see https://docs.mixpanel.com/docs/project-tokens
 */
type MixpanelProjectToken = string;

export type MixpanelModuleOptions = 
  | { token: MixpanelProjectToken; initConfig?: InitConfig; header: string; }
  | { token: MixpanelProjectToken; initConfig?: InitConfig; session: string; }
  | { token: MixpanelProjectToken; initConfig?: InitConfig; user: string }
  | { token: MixpanelProjectToken; initConfig?: InitConfig; };

export type MixpanelModuleAsyncOptions = {
  useFactory: (...args: any[]) => MixpanelModuleOptions | Promise<MixpanelModuleOptions>;
  inject?: any[];
};
