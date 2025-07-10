import { DynamicModule, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MixpanelService } from './mixpanel.service.js';
import { MixpanelModuleOptions, MixpanelModuleAsyncOptions } from './interface.js';
import { MIXPANEL_OPTIONS } from './constant.js';
import { AsyncStorageService } from './async-storage.service.js';
import { AsyncStorageMiddleware } from './async-storage.middleware.js';

@Module({})
export class MixpanelModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AsyncStorageMiddleware).forRoutes('*');
  }
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
        AsyncStorageService,
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
        AsyncStorageService,
      ],
      exports: [MixpanelService],
    };
  }
}
