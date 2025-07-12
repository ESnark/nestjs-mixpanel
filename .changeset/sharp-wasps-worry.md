---
'nestjs-mixpanel': minor
---

Add automatic IP address tracking for geolocation

- Add `ipHeader` configuration option to specify which HTTP header to extract IP from
- Support for `X-Forwarded-For`, `X-Real-IP`, and `Forwarded` headers
- Automatically include IP in all track events for geolocation data
- Automatically include IP in people.set/setOnce operations using `$ip` modifier

Enhance People API with modifiers support

- Add optional `modifiers` parameter to `people.set()` and `people.setOnce()` methods
