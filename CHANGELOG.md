# nestjs-mixpanel

## 2.1.0

### Minor Changes

- c31a12a: Expose the underlying mixpanel-node instance via the `client` getter, so APIs this module does not wrap (batch tracking, groups, `people.increment`, imports, ...) are accessible without dropping the module. Calls made directly on the client bypass automatic user identification and IP resolution.
- d458d7f: Add Simplified ID Merge support via the `idMerge` option. The middleware maintains a device ID cookie (minting a UUID and setting the cookie when absent — no `cookie-parser` required), attaches `$device_id` to every event, and adds `$user_id` when the identification strategy resolves a user, so Mixpanel merges anonymous pre-login events and identified post-login events into a single user. Device-only events use the `$device:<uuid>` distinct_id Mixpanel derives; cookie attributes (name, Max-Age, SameSite, Secure, HttpOnly, Domain, Path) are configurable, and `SameSite=None` automatically adds `Secure`. When `idMerge` is enabled the `fallback` option is ignored, and profile updates are still never written to a device identity. Exports the new `IdMergeCookieOptions` type.

## 2.0.0

### Major Changes

- 28a9e32: Replace the per-request UUID identity fallback with a safe anonymous default, move NestJS packages to peerDependencies, and upgrade the Mixpanel SDK to ^0.23

  **Breaking changes**
  - **Anonymous identity by default.** When no identification strategy is configured, or the configured strategy fails to extract an ID, events are now sent with an empty `distinct_id` (Mixpanel's documented "not associated with any user" value) instead of a random UUID generated per request. The old behavior made every request look like a different user, corrupting unique-user counts, funnels, and retention. Opt back into it with `fallback: 'request-context'`, or provide a custom resolver: `fallback: (request) => request?.sessionID`. A warning is logged once when a configured strategy fails to extract an ID.
  - **`people.set()` / `people.setOnce()` without an explicit distinct ID are skipped** (with a warning) when no user identity can be resolved, instead of writing a profile to a throwaway identity.
  - **`@nestjs/common`, `@nestjs/core`, `reflect-metadata`, and `rxjs` are now peerDependencies** provided by your application, so the module always shares your app's Nest instance.
  - **`mixpanel` upgraded from `^0.18.1` to `^0.23.0`.** Known upstream issue: mixpanel 0.23.0 crashes on `init` when `HTTPS_PROXY`/`HTTP_PROXY` is set in the environment (it constructs the `https-proxy-agent` v7 module namespace instead of its named export).

  **Added**
  - `fallback` module option (`'anonymous' | 'request-context' | (request) => string | undefined`) and the exported `FallbackIdStrategy` type.

## 1.5.1

### Patch Changes

- 86c4a66: Fix cookie-based user identification, `people` API runtime error, and `track` typings
  - The `cookie` strategy now uses the cookie value directly as the user ID. Previously the cookie name was also applied as an object path on the cookie value, so a plain string cookie always resolved to `undefined` and silently fell back to the request context ID.
  - `people.set` and `people.setOnce` no longer throw `TypeError: this.getIp is not a function`. The functions returned by the `people` getter are now bound to the service instance.
  - `properties` is now optional in `track`, matching the documented API (`track('event')` compiles).
  - `people.set` / `people.setOnce` are now properly typed in the published type declarations. Previously they resolved to `any` because the declaration referenced untyped private members.
  - `track` no longer passes a trailing `undefined` callback to the underlying Mixpanel SDK.

## 1.5.0

### Minor Changes

- d3de3b3: Add automatic IP address tracking for geolocation
  - Add `ipHeader` configuration option to specify which HTTP header to extract IP from
  - Support for `X-Forwarded-For`, `X-Real-IP`, and `Forwarded` headers
  - Automatically include IP in all track events for geolocation data
  - Automatically include IP in people.set/setOnce operations using `$ip` modifier

  Enhance People API with modifiers support
  - Add optional `modifiers` parameter to `people.set()` and `people.setOnce()` methods

## 1.4.0

### Minor Changes

- 91a2e7d: Add cookie-based user identification strategy
  - Add support for extracting user ID from cookies via new `cookie` option

## 1.3.0

### Minor Changes

- 0a96b2a: Add Mixpanel People API support
  - Add `people.set()` method to set user profile properties
  - Add `people.setOnce()` method to set properties only if not already set
  - Add callback support for asynchronous operations
