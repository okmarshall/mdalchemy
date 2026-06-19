# AGENTS.md

These instructions apply to the whole repository. They are for coding agents
working on mdalchemy; keep them short, practical, and subordinate to the
project docs linked below.

## Project Shape

mdalchemy is a TypeScript Markdown-to-HTML project with a custom parser, a
renderer-neutral AST, semantic HTML rendering, themes, CLI commands, project
book generation, and a VS Code extension. The project is intentionally
learning-focused: prefer explicit, understandable modules over clever shortcuts
or broad utility layers.

Start with these docs when the task touches their area:

- `README.md`: user-facing features, usage, examples, and current limits.
- `CONTRIBUTING.md`: setup, daily checks, documentation expectations.
- `docs/architecture.md`: module boundaries, dependency policy, pipeline.
- `docs/parser-design.md`: parser design and CommonMark edge cases.
- `docs/rendering-and-theming.md`: HTML output, shell, themes, Mermaid.
- `docs/cli-and-configuration.md`: CLI behavior, config, exit codes.
- `docs/testing-pipeline.md`: which checks to run for each type of change.
- `docs/implementation-roadmap.md`: feature status; update for user-visible behavior.
- `docs/vscode-extension.md`: VS Code command and webview behavior.
- `docs/release.md`: release gates and packaging.

## Working Principles

- Keep parser, document analysis, rendering, theming, CLI, VS Code, and IO
  concerns separated. Lower layers must not import CLI or VS Code code.
- Keep the parser renderer-neutral. Add syntax to `src/markdown` and rendering
  support separately.
- Preserve CommonMark 0.31.2 core behavior. Parser changes should keep
  `npm run test:commonmark:strict` green.
- Treat GFM and frontmatter as opt-in extensions for single-file rendering.
  Project books intentionally enable supported GFM/frontmatter behavior by
  default.
- Keep generated HTML deterministic and readable. Do not weaken snapshot or
  conformance checks to hide noisy output.
- Prefer focused modules with clear types. Avoid unrelated refactors while
  fixing behavior.
- Dependencies should be rare and justified in `docs/architecture.md`.

## Common Commands

Use Node.js 24 and npm 11 or newer.

```sh
npm install
npm run build
npm run typecheck
npm test
npm run verify
```

Focused checks:

```sh
npm run test:unit
npm run test:fixtures
npm run test:conformance
npm run test:commonmark:strict
npm run test:gfm:strict
npm run test:install
npm run pack:dry-run
```

Run `npm run verify` before handing off substantial code changes. Also run
`npm run pack:dry-run` for packaging, dependency, CLI binary, VS Code extension,
or Mermaid runtime changes.

## Fixtures And Generated Output

- `dist/` is build output and is ignored. Do not edit it directly.
- `examples/complex-spec.md` is the broad Markdown smoke fixture.
- `examples/complex-spec.html` is a checked generated artifact. Regenerate it
  with `npm run render:example` when intentional renderer/theme output changes.
- `examples/mermaid.md` is the Mermaid diagram fixture. Generated Mermaid HTML
  should use `*.generated.html` and stay untracked.
- Keep fixtures synthetic. Do not add private code, customer text, credentials,
  or environment-specific paths.

## Change-Specific Notes

- CLI/config changes: update `src/cli/options.ts`, `src/cli/help.ts`,
  `src/config/config-options.ts`, tests, and `docs/cli-and-configuration.md`
  together.
- Parser changes: add focused parser tests and conformance fixtures where useful;
  run strict CommonMark and relevant GFM checks.
- Renderer/theme changes: update renderer tests, theme tests, docs, and the
  checked complex HTML artifact when output changes intentionally.
- Project book changes: cover discovery, frontmatter opt-out, TOC shape,
  cross-file links, image paths, and packed install behavior.
- VS Code changes: cover command/webview behavior with tests and update
  `docs/vscode-extension.md`.
- User-visible behavior: update `README.md`, the relevant docs file, and
  `docs/implementation-roadmap.md`.

## Git Hygiene

Work on a topic branch from current `main`. Keep commits scoped to the request.
Before committing, check `git status -sb`, review the diff, and avoid staging
unrelated user changes.
