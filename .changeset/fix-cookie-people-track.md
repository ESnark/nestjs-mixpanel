---
"nestjs-mixpanel": patch
---

Fix cookie-based user identification, `people` API runtime error, and `track` typings

- The `cookie` strategy now uses the cookie value directly as the user ID. Previously the cookie name was also applied as an object path on the cookie value, so a plain string cookie always resolved to `undefined` and silently fell back to the request context ID.
- `people.set` and `people.setOnce` no longer throw `TypeError: this.getIp is not a function`. The functions returned by the `people` getter are now bound to the service instance.
- `properties` is now optional in `track`, matching the documented API (`track('event')` compiles).
- `people.set` / `people.setOnce` are now properly typed in the published type declarations. Previously they resolved to `any` because the declaration referenced untyped private members.
- `track` no longer passes a trailing `undefined` callback to the underlying Mixpanel SDK.
