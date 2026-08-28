---
"nestjs-mixpanel": minor
---

Support NestJS 12. The `@nestjs/common` and `@nestjs/core` peer ranges are widened to `^11.0.0 || ^12.0.0` (use NestJS >= 12.0.1 — 12.0.0 shipped with broken peer declarations upstream), the request-context middleware registers with the named wildcard `{*splat}` instead of the legacy `'*'` mapping, and CI now tests against both supported NestJS majors.
