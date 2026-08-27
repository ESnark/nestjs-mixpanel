---
"nestjs-mixpanel": major
---

Replace the per-request UUID identity fallback with a safe anonymous default, move NestJS packages to peerDependencies, and upgrade the Mixpanel SDK to ^0.23

**Breaking changes**

- **Anonymous identity by default.** When no identification strategy is configured, or the configured strategy fails to extract an ID, events are now sent with an empty `distinct_id` (Mixpanel's documented "not associated with any user" value) instead of a random UUID generated per request. The old behavior made every request look like a different user, corrupting unique-user counts, funnels, and retention. Opt back into it with `fallback: 'request-context'`, or provide a custom resolver: `fallback: (request) => request?.sessionID`. A warning is logged once when a configured strategy fails to extract an ID.
- **`people.set()` / `people.setOnce()` without an explicit distinct ID are skipped** (with a warning) when no user identity can be resolved, instead of writing a profile to a throwaway identity.
- **`@nestjs/common`, `@nestjs/core`, `reflect-metadata`, and `rxjs` are now peerDependencies** provided by your application, so the module always shares your app's Nest instance.
- **`mixpanel` upgraded from `^0.18.1` to `^0.23.0`.** Known upstream issue: mixpanel 0.23.0 crashes on `init` when `HTTPS_PROXY`/`HTTP_PROXY` is set in the environment (it constructs the `https-proxy-agent` v7 module namespace instead of its named export).

**Added**

- `fallback` module option (`'anonymous' | 'request-context' | (request) => string | undefined`) and the exported `FallbackIdStrategy` type.
