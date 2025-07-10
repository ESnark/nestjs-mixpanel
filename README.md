# NestJS Mixpanel

A powerful NestJS module for seamless Mixpanel analytics integration with automatic user identification and request context management.

## Features

- **Easy Integration** - Simple setup with NestJS dependency injection
- **Flexible User Identification** - Multiple strategies for automatic user tracking
- **Request Context Management** - Built-in AsyncLocalStorage for request isolation
- **Dynamic Data Access** - Real-time access to request, session, and user data
- **Full Mixpanel API** - Access to complete Mixpanel functionality
- **TypeScript Support** - Fully typed with TypeScript definitions
- **Well Tested** - Comprehensive test suite with unit, integration, and e2e tests

## Installation

```bash
npm install nestjs-mixpanel
# or
yarn add nestjs-mixpanel
# or
pnpm add nestjs-mixpanel
```

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { MixpanelModule } from 'nestjs-mixpanel';

@Module({
  imports: [
    MixpanelModule.forRoot({
      token: 'YOUR_MIXPANEL_TOKEN',
    }),
  ],
})
export class AppModule {}
```


```typescript
import { Injectable } from '@nestjs/common';
import { MixpanelService } from 'nestjs-mixpanel';

@Injectable()
export class AnalyticsService {
  constructor(private readonly mixpanel: MixpanelService) {}

  trackUserAction(action: string, properties?: any) {
    this.mixpanel.track(action, properties);
  }
}
```

## Configuration Options

### User Identification Strategies

The module provides multiple strategies to automatically identify users:


#### 1. AsyncStorage Context ID (Default)

If no identification strategy is specified, the module will use a unique ID from the AsyncLocalStorage context:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  // Will use AsyncLocalStorage context ID as distinct_id
})
```

#### 2. Header-based Identification

Extract user ID from HTTP headers:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  header: 'x-user-id', // Will look for user ID in this header
})
```

#### 3. Session-based Identification

Extract user ID from session object using dot notation:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  session: 'user.id', // Will extract from req.session.user.id
})
```

#### 4. User Object-based Identification

Extract user ID from user object using dot notation:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  user: 'profile.userId', // Will extract from req.user.profile.userId
})
```

#### 5. Cookie-based Identification

Extract user ID from cookies (requires cookie-parser):

```typescript
// First, install and configure cookie-parser in your application

// main.ts
import cookieParser from 'cookie-parser';
app.use(cookieParser());

// Then configure MixpanelModule
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  cookie: 'userId', // Will extract from req.cookies.userId
})
```

## API Reference

### MixpanelService

#### `track(event: string, properties?: Mixpanel.PropertyDict, callback?: Mixpanel.Callback): void`

Tracks an event in Mixpanel with automatic user identification.

```typescript
// Basic event tracking
this.mixpanel.track('page_viewed');

// With custom properties
this.mixpanel.track('purchase_completed', {
  amount: 99.99,
  currency: 'USD',
  items: ['item1', 'item2'],
});

// With callback
this.mixpanel.track('purchase_completed', {
  amount: 99.99,
}, (err) => {
  if (err) {
    console.error('Failed to track event:', err);
  }
});
```

The `distinct_id` is automatically set based on your configured identification strategy.

#### `people.set(distinctId: string, properties: Mixpanel.PropertyDict, callback?: Mixpanel.Callback): void`
#### `people.set(properties: Mixpanel.PropertyDict, callback?: Mixpanel.Callback): void`

Sets properties on a user profile. Can be called with or without a specific user ID.

```typescript
// With explicit user ID
this.mixpanel.people.set('user-123', {
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'premium',
});

// With automatic user identification
this.mixpanel.people.set({
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'premium',
});

// With callback
this.mixpanel.people.set({
  name: 'John Doe',
}, (err) => {
  if (err) console.error('Failed to set properties:', err);
});
```

#### `people.setOnce(distinctId: string, properties: Mixpanel.PropertyDict, callback?: Mixpanel.Callback): void`
#### `people.setOnce(properties: Mixpanel.PropertyDict, callback?: Mixpanel.Callback): void`

Sets properties on a user profile only if they are not already set.

```typescript
// With automatic user identification
this.mixpanel.people.setOnce({
  created_at: new Date().toISOString(),
  initial_source: 'organic',
});

// With explicit user ID
this.mixpanel.people.setOnce('user-123', {
  created_at: new Date().toISOString(),
});

// With callback
this.mixpanel.people.setOnce({
  created_at: new Date().toISOString(),
}, (err) => {
  if (err) console.error('Failed to set properties:', err);
});
```

#### `extractUserId(): string | undefined`

Internal method that extracts the user ID based on the configured identification strategy. Returns the extracted user ID or falls back to the AsyncLocalStorage context ID.

## Advanced Usage

### Custom User Identification

You can override the automatic user identification by providing a `distinct_id` in the properties:

```typescript
this.mixpanel.track('custom_event', {
  distinct_id: 'custom-user-123',
  customProp: 'value',
});
```


### Request Context

The module uses AsyncLocalStorage to maintain request context automatically. This ensures that:

- Each request has its own isolated context
- User identification works correctly across async operations
- No memory leaks between requests
- Guards and middleware can dynamically set user/session data

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
