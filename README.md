# NestJS Mixpanel

A powerful NestJS module for seamless Mixpanel analytics integration with automatic user identification and request context management.

## Features

- **Easy Integration** - Simple setup with NestJS dependency injection
- **Flexible User Identification** - Multiple strategies for automatic user tracking
- **Request Context Management** - Built-in CLS (Continuation-Local Storage) support
- **Full Mixpanel API** - Access to complete Mixpanel functionality
- **TypeScript Support** - Fully typed with TypeScript definitions
- **Well Tested** - Comprehensive test suite with unit, integration, and e2e tests

## Installation

```bash
npm install nestjs-mixpanel nestjs-cls
# or
yarn add nestjs-mixpanel nestjs-cls
# or
pnpm add nestjs-mixpanel nestjs-cls
```

**Note**: `nestjs-cls` is a peer dependency and must be installed separately.

## Quick Start

### Basic Setup

```typescript
import { Module } from '@nestjs/common';
import { MixpanelModule } from 'nestjs-mixpanel';
import { ClsModule } from 'nestjs-cls';

@Module({
  imports: [
    // ClsModule must be configured with middleware for request context
    ClsModule.forRoot({
      middleware: {
        mount: true,
        generateId: true,
        setup: (cls, req) => {
          cls.set('req', req);
        },
      },
    }),
    MixpanelModule.forRoot({
      token: 'YOUR_MIXPANEL_TOKEN',
    }),
  ],
})
export class AppModule {}
```

### Using the Service

```typescript
import { Injectable } from '@nestjs/common';
import { MixpanelService } from 'nestjs-mixpanel';

@Injectable()
export class AnalyticsService {
  constructor(private readonly mixpanel: MixpanelService) {}

  async trackUserAction(action: string, properties?: any) {
    await this.mixpanel.track(action, properties);
  }
}
```

## Configuration Options

### User Identification Strategies

The module provides multiple strategies to automatically identify users:

#### 1. Header-based Identification

Extract user ID from HTTP headers:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  header: 'x-user-id', // Will look for user ID in this header
})
```

#### 2. Session-based Identification

Extract user ID from session object using dot notation:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  session: 'user.id', // Will extract from req.session.user.id
})
```

#### 3. User Object-based Identification

Extract user ID from user object using dot notation:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  user: 'profile.userId', // Will extract from req.user.profile.userId
})
```

#### 4. CLS Context ID (Default)

If no identification strategy is specified, the module will use a unique ID from the CLS context:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  // Will use CLS context ID as distinct_id
})
```

### Async Configuration

For dynamic configuration, use `forRootAsync`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MixpanelModule } from 'nestjs-mixpanel';
import { ClsModule } from 'nestjs-cls';

@Module({
  imports: [
    ConfigModule.forRoot(),
    // ClsModule must be configured separately when using forRootAsync
    ClsModule.forRoot({
      middleware: {
        mount: true,
        generateId: true,
        setup: (cls, req) => {
          cls.set('req', req);
        },
      },
    }),
    MixpanelModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        token: config.get('MIXPANEL_TOKEN'),
        header: 'x-user-id',
        initConfig: {
          // Additional Mixpanel configuration
          api_host: config.get('MIXPANEL_API_HOST'),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## API Reference

### MixpanelService

#### `track(event: string, properties?: any): Promise<void>`

Tracks an event in Mixpanel with automatic user identification.

```typescript
// Basic event tracking
await this.mixpanel.track('page_viewed');

// With custom properties
await this.mixpanel.track('purchase_completed', {
  amount: 99.99,
  currency: 'USD',
  items: ['item1', 'item2'],
});
```

The `distinct_id` is automatically set based on your configured identification strategy.

## Advanced Usage

### Custom User Identification

You can override the automatic user identification by providing a `distinct_id` in the properties:

```typescript
await this.mixpanel.track('custom_event', {
  distinct_id: 'custom-user-123',
  customProp: 'value',
});
```

### Request Context

The module uses CLS (Continuation-Local Storage) to maintain request context. You must configure `ClsModule` with middleware in your application module to ensure that user identification works correctly across async operations within the same request.

**Important**: When using `MixpanelModule.forRootAsync()`, you must configure `ClsModule` separately in your application module due to NestJS dependency injection constraints.

## Development

### Building

```bash
pnpm build        # Build the project
pnpm dev          # Build in watch mode
```

### Testing

```bash
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Run tests with coverage
pnpm test:ui      # Open test UI
```

### Requirements

- Node.js >= 20.0.0
- NestJS >= 11.0.0
