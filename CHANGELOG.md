# nestjs-mixpanel

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
