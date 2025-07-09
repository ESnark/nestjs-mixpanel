import { DynamicModule, Module } from '@nestjs/common';
import { MixpanelService } from './mixpanel.service.js';
import { MixpanelModuleOptions, MixpanelModuleAsyncOptions } from './interface.js';
import { MIXPANEL_OPTIONS } from './constant.js';

@Module({
  providers: [MixpanelService],
  exports: [MixpanelService],
})
export class MixpanelModule {
  static forRoot(options: MixpanelModuleOptions): DynamicModule {
    return {
      global: true,
      module: MixpanelModule,
      providers: [
        {
          provide: MIXPANEL_OPTIONS,
          useValue: options,
        },
        MixpanelService,
      ],
      exports: [MixpanelService],
    };
  }

  static forRootAsync(options: MixpanelModuleAsyncOptions): DynamicModule {
    return {
      global: true,
      module: MixpanelModule,
      providers: [
        {
          provide: MIXPANEL_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
        MixpanelService,
      ],
      exports: [MixpanelService],
    };
  }
}