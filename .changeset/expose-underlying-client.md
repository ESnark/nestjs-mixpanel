---
"nestjs-mixpanel": minor
---

Expose the underlying mixpanel-node instance via the `client` getter, so APIs this module does not wrap (batch tracking, groups, `people.increment`, imports, ...) are accessible without dropping the module. Calls made directly on the client bypass automatic user identification and IP resolution.
