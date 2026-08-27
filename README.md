# NestJS Mixpanel

[![npm version](https://img.shields.io/npm/v/nestjs-mixpanel.svg)](https://www.npmjs.com/package/nestjs-mixpanel)
[![CI](https://github.com/ESnark/nestjs-mixpanel/actions/workflows/ci.yml/badge.svg)](https://github.com/ESnark/nestjs-mixpanel/actions/workflows/ci.yml)

A powerful NestJS module for seamless Mixpanel analytics integration with automatic user identification and request context management.

## Features

- **Easy Integration** - Simple setup with NestJS dependency injection
- **Flexible User Identification** - Multiple strategies for automatic user tracking
- **Request Context Management** - Built-in AsyncLocalStorage for request isolation
- **Dynamic Data Access** - Real-time access to request, session, and user data
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


#### 1. Anonymous (Default)

If no identification strategy is specified — or the configured strategy fails to extract an ID for a request — events are sent with an empty `distinct_id`. This is Mixpanel's documented way to send events that are not associated with any user, so unresolved identities never pollute unique-user counts, funnels, or retention reports:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  // Events without a resolved user ID are sent anonymously (distinct_id: '')
})
```

When a strategy is configured but extraction fails, a warning is logged once so silent misconfigurations are visible.

You can change what happens when no user ID is resolved with the `fallback` option:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  user: 'id',
  // 'anonymous' (default): distinct_id is '' when extraction fails
  // 'request-context':     use a random UUID generated per request (v1 behavior)
  // custom resolver:       derive an ID from the request yourself
  fallback: (request: any) => request?.sessionID,
})
```

> **Warning**: `fallback: 'request-context'` restores the pre-2.0 behavior. Because the ID is regenerated on every request, the same user appears as a different user on each request — unique-user counts, funnels, and retention will be distorted. Prefer the default or a resolver backed by something request-independent (e.g. a session ID).

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

### Merging Anonymous and Identified Users (Simplified ID Merge)

With an identification strategy alone, events sent before login stay anonymous forever. Enabling `idMerge` connects them: the module maintains a **device ID cookie** (minting a UUID and setting the cookie on the first request), attaches `$device_id` to every event, and adds `$user_id` whenever the identification strategy resolves a user. Mixpanel's [Simplified ID Merge](https://docs.mixpanel.com/docs/tracking-methods/id-management) then merges the pre-login anonymous events and post-login identified events into a single user — funnels and retention work across the login boundary.

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  user: 'id',
  idMerge: true,
})
```

Cookie attributes can be customized:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  user: 'id',
  idMerge: {
    name: 'mp_device_id',    // default
    maxAge: 31536000,        // seconds; default 1 year
    path: '/',               // default
    sameSite: 'Lax',         // default; 'None' automatically adds Secure
    secure: true,            // default false — enable in production over HTTPS
    httpOnly: true,          // default
    // domain: '.example.com',
  },
})
```

Notes:

- Your Mixpanel project must use the **Simplified ID Merge API** (the default for new projects — check Project Settings → Identity Merge).
- Reading cookies does **not** require `cookie-parser`; the middleware parses the `Cookie` header itself (and prefers `cookie-parser` output when present).
- When `idMerge` is enabled the `fallback` option is ignored — the device identity is the anonymous identity. Events without a device ID (e.g. background jobs outside a request) are sent anonymously.
- Profile updates (`people.set` / `people.setOnce` without an explicit distinct ID) still require a resolved user ID; they are never written to a device identity.
- The module sets a cookie on your users' browsers. Depending on your jurisdiction (e.g. GDPR/ePrivacy), analytics cookies may require user consent — gating tracking on consent is your application's responsibility.

### Additional Configuration

#### IP Address Tracking

The module can automatically extract client IP addresses from request headers for geolocation:

```typescript
MixpanelModule.forRoot({
  token: 'YOUR_MIXPANEL_TOKEN',
  ipHeader: 'X-Forwarded-For', // Default, can also use 'X-Real-IP' or 'Forwarded'
})
```

Supported headers:
- `X-Forwarded-For` (default) - Standard proxy header, uses the first IP if multiple
- `X-Real-IP` - Common nginx header
- `Forwarded` - RFC 7239 standard header

The IP address is automatically included in all track events and profile updates for geolocation data.

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

#### `people.set(distinctId: string, properties: Mixpanel.PropertyDict, modifiers?: Mixpanel.Modifiers, callback?: Mixpanel.Callback): void`
#### `people.set(properties: Mixpanel.PropertyDict, modifiers?: Mixpanel.Modifiers, callback?: Mixpanel.Callback): void`

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

// With modifiers (e.g., custom IP or location)
this.mixpanel.people.set({
  name: 'John Doe',
}, {
  $ip: '192.168.1.1',
  $latitude: 40.7128,
  $longitude: -74.0060,
});
```

#### `people.setOnce(distinctId: string, properties: Mixpanel.PropertyDict, modifiers?: Mixpanel.Modifiers, callback?: Mixpanel.Callback): void`
#### `people.setOnce(properties: Mixpanel.PropertyDict, modifiers?: Mixpanel.Modifiers, callback?: Mixpanel.Callback): void`

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

// With modifiers
this.mixpanel.people.setOnce({
  created_at: new Date().toISOString(),
}, {
  $ignore_time: true,
});
```

#### `client: Mixpanel.Mixpanel`

The underlying [mixpanel-node](https://github.com/mixpanel/mixpanel-node) instance, for APIs this module does not wrap (batch tracking, groups, `people.increment`, imports, ...). Calls made directly on the client bypass automatic user identification and IP resolution — pass `distinct_id` and modifiers yourself:

```typescript
this.mixpanel.client.track_batch([
  { event: 'signup', properties: { distinct_id: 'user-123' } },
  { event: 'first_login', properties: { distinct_id: 'user-123' } },
]);

this.mixpanel.client.people.increment('user-123', 'login_count');
```

#### `extractUserId(): string | undefined`

Internal method that extracts the user ID based on the configured identification strategy. Returns the extracted user ID, the result of the configured `fallback` strategy, or `undefined` when the identity stays anonymous.

Note: `people.set()` / `people.setOnce()` calls without an explicit distinct ID are skipped (with a warning) when no user identity can be resolved — profile updates are never written to an anonymous or per-request identity.

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
- NestJS >= 11.0.0 (peer dependency — provided by your application)

## Migrating from 1.x

Version 2.0.0 contains the following breaking changes:

1. **The per-request UUID fallback is no longer the default.** In 1.x, when no identification strategy was configured or extraction failed, `distinct_id` was set to a random UUID generated per request — which made every request look like a different user and corrupted unique-user counts, funnels, and retention. In 2.x the default is anonymous (`distinct_id: ''`). If you depended on the old behavior, opt back in with `fallback: 'request-context'`.
2. **`people.set()` / `people.setOnce()` without an explicit distinct ID are skipped** (with a warning) when no user identity can be resolved, instead of creating a throwaway profile.
3. **`@nestjs/common`, `@nestjs/core`, `reflect-metadata`, and `rxjs` are now peer dependencies.** Your application provides them (it already does in any NestJS project), so the module always uses your app's Nest instance.
4. **The bundled Mixpanel SDK is upgraded from `mixpanel@^0.18` to `mixpanel@^0.23`.** Note: mixpanel 0.23.0 has an upstream bug that crashes `init` when an `HTTPS_PROXY`/`HTTP_PROXY` environment variable is set (it constructs the `https-proxy-agent` v7 module namespace instead of its named export). If your servers sit behind an HTTP proxy, unset those variables for the process or wait for an upstream fix.
