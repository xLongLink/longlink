# Anti-slop provenance

- Source: https://github.com/dmmulroy/anti-slop
- Commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`
- Copied from: `skills/install-anti-slop/assets/anti-slop/` (matches upstream
  `src/` with upstream test files omitted).
- Installed at: `web/tools/oxlint/anti-slop/`.
- Local source changes: none; this provenance file is added locally, and the
  upstream repository's root MIT license is included as `LICENSE`.
- Configuration: all generic rules and `oxc/no-accumulating-spread` enabled as errors
  in `web/vite.config.ts`. Effect rules are not enabled because the Web package
  does not depend directly on Effect.
- Dependency: `@oxlint/plugins` pinned to `1.81.0`, matching Oxlint supplied by
  Vite Plus `0.3.1`.

Preserve the nested ESLint Stylistic license and provenance when updating.
Review upstream changes against this commit rather than overwriting local rules.
