import { DynamicModule, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { MixpanelService } from './mixpanel.service.js';
import { MixpanelModuleOptions, MixpanelModuleAsyncOptions } from './interface.js';

@Module({
  providers: [MixpanelService],
  exports: [MixpanelService],
})
export class MixpanelModule {
  static forRoot(options: MixpanelModuleOptions): DynamicModule {
    return {
      global: true,
      module: MixpanelModule,
      imports: [ClsModule],
      providers: [
        {
          provide: 'MIXPANEL_OPTIONS',
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
      imports: [ClsModule],
      providers: [
        {
          provide: 'MIXPANEL_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject,
        },
        MixpanelService,
      ],
      exports: [MixpanelService],
    };
  }
}