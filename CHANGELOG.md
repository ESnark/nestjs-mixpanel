# nestjs-mixpanel

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
