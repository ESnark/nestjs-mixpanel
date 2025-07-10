# nestjs-mixpanel

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
