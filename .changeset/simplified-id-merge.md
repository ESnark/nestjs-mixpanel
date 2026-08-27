---
"nestjs-mixpanel": minor
---

Add Simplified ID Merge support via the `idMerge` option. The middleware maintains a device ID cookie (minting a UUID and setting the cookie when absent — no `cookie-parser` required), attaches `$device_id` to every event, and adds `$user_id` when the identification strategy resolves a user, so Mixpanel merges anonymous pre-login events and identified post-login events into a single user. Device-only events use the `$device:<uuid>` distinct_id Mixpanel derives; cookie attributes (name, Max-Age, SameSite, Secure, HttpOnly, Domain, Path) are configurable, and `SameSite=None` automatically adds `Secure`. When `idMerge` is enabled the `fallback` option is ignored, and profile updates are still never written to a device identity. Exports the new `IdMergeCookieOptions` type.
