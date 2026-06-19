# Contributing

Thanks for helping make mdalchemy better. The project is intentionally small and
learning-focused, so changes should keep the parser, renderer, theme system, and
CLI easy to understand.

## Setup

Use Node.js 24 and npm 11 or newer.

```sh
npm install
npm run build
```

## Daily Checks

Run the main verification command before opening or merging a change:

```sh
npm run verify
```

For focused work, these commands are useful:

```sh
npm run typecheck
npm test
npm run test:commonmark:strict
npm run test:gfm:strict
npm run test:install
npm run pack:dry-run
```

## Development Guidelines

- Agent-specific orientation lives in `AGENTS.md`.
- Keep the parser renderer-neutral. Add Markdown syntax to the AST and renderer
  separately.
- Keep CommonMark core behavior green with `npm run test:commonmark:strict`.
- Keep GFM changes covered by seed fixtures and `npm run test:gfm:strict`.
- Update `docs/implementation-roadmap.md` when user-visible behavior changes.
- Keep examples synthetic. Do not add private code, private documentation, or
  customer-specific text to fixtures.
- Prefer small modules with clear types over broad utility files.
- Keep dependency additions rare and justified in `docs/architecture.md`.

## Documentation

Update docs in the same change as the behavior they describe:

- `README.md` for user-facing usage.
- `docs/cli-and-configuration.md` for command and config behavior.
- `docs/testing-pipeline.md` for test and CI changes.
- `docs/conformance-status.md` for CommonMark or GFM conformance changes.
- `CHANGELOG.md` for release-visible changes.

## Releases

The release checklist lives in `docs/release.md`. A release tag must match the
package version, for example `v1.0.0` for package version `1.0.0`.
