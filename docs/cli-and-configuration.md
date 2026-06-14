# CLI And Configuration

## CLI Goal

The CLI should feel small, predictable, and scriptable. The common case should be simple:

```text
mdalchemy notes.md -o notes.html
```

The advanced case should be explicit:

```text
mdalchemy notes.md \
  --output dist/notes.html \
  --theme ./themes/report.json \
  --config ./mdalchemy.config.json \
  --strict
```

## Command Shape

Initial command:

```text
mdalchemy <input> [options]
```

Options:

```text
-o, --output <path>       Output file path.
--format <format>         Output format. Defaults to html.
--theme <name-or-path>    Built-in theme name or theme config path.
--config <path>           Config file path.
--stdout                  Write rendered output to stdout.
--strict                  Treat warnings as errors.
--safe                    Enable safe rendering preset.
--fragment                Render HTML fragment instead of standalone document.
--title <title>           Override document title.
--toc                     Force table of contents on.
--no-toc                  Disable table of contents.
--debug                   Show stack traces and extra diagnostics.
-h, --help                Show help.
-v, --version             Show version.
```

Future commands:

```text
mdalchemy init
mdalchemy theme list
mdalchemy theme inspect <name-or-path>
mdalchemy debug ast <input>
mdalchemy debug outline <input>
mdalchemy check <input>
```

Do not build future commands before the core render path is useful.

## Exit Codes

```text
0   Success.
1   General failure.
2   Invalid CLI usage.
3   Input read failure.
4   Config failure.
5   Theme failure.
6   Parse/render failure.
7   Output write failure.
```

CommonMark parsing rarely fails because most text is valid Markdown. Most parser-related failures should be internal errors or strict-mode diagnostics.

## Output Path Behavior

If `--output` is provided:

- Use that exact path.
- Create parent directories only if an explicit `--create-dirs` flag is later added.
- Fail clearly when parent directory does not exist.

If `--stdout` is provided:

- Write rendered output to stdout.
- Write diagnostics to stderr.
- Do not write an output file.

If neither `--output` nor `--stdout` is provided:

- For v1, default to input basename with `.html` next to input.
- Example: `notes.md` -> `notes.html`.
- Print the output path on success.

If output path equals input path:

- Fail unless a future explicit overwrite flag exists.

## Format Inference

Format is determined by:

1. Explicit `--format`.
2. Output file extension.
3. Config default.
4. Version default: `html`.

Supported v1 formats:

```text
html
```

Internal test/API format:

```text
html-fragment
```

Future formats:

```text
pdf
plain
json
```

If a user asks for `.pdf` before PDF support exists, show:

```text
mdalchemy: unsupported output format "pdf"
PDF export is planned but not implemented yet. Use --format html or write to a .html file.
```

## Config Discovery

Config should be discovered from:

1. Explicit `--config <path>`.
2. `mdalchemy.config.json` in the current working directory.
3. `.mdalchemyrc.json` in the current working directory.
4. Walk parent directories until filesystem root or project boundary.
5. No config file, use defaults.

For v1, keep this simpler if needed:

- Explicit `--config`.
- Current directory `mdalchemy.config.json`.
- Defaults.

Avoid surprising global config in v1.

## Config Precedence

Highest wins:

1. CLI flags.
2. Explicit config file.
3. Discovered project config.
4. Built-in defaults.

Theme inheritance is resolved after config merge.

## Config Schema

Versioned config:

```json
{
  "$schema": "https://example.invalid/mdalchemy.schema.json",
  "version": 1,
  "output": {
    "format": "html",
    "standalone": true,
    "createDirs": false
  },
  "markdown": {
    "profile": "commonmark",
    "extensions": []
  },
  "html": {
    "lang": "en",
    "rawHtml": "allow",
    "safeUrls": true,
    "headingAnchors": true,
    "sections": false,
    "tableOfContents": "auto",
    "tocDepth": 3,
    "softBreak": "newline"
  },
  "theme": "serif"
}
```

### `output`

```ts
interface OutputConfig {
  format: "html";
  standalone: boolean;
  createDirs: boolean;
}
```

### `markdown`

```ts
interface MarkdownConfig {
  profile: "commonmark";
  extensions: MarkdownExtension[];
}
```

For v1, `extensions` should default to an empty list. Unsupported extension names should fail config validation.

### `html`

```ts
interface HtmlConfig {
  lang: string;
  rawHtml: "allow" | "escape" | "strip";
  safeUrls: boolean;
  headingAnchors: boolean;
  sections: boolean;
  tableOfContents: boolean | "auto";
  tocDepth: number;
  softBreak: "newline" | "space" | "br";
}
```

### `theme`

```ts
type ThemeConfig = string | ThemeDefinition;
```

A string can be a built-in theme name or a path.

## Safe Preset

`--safe` should apply these overrides:

```json
{
  "html": {
    "rawHtml": "escape",
    "safeUrls": true
  }
}
```

It should not disable ordinary Markdown features.

## Diagnostics Format

Default terminal output:

```text
warning MDA_HTML_UNSAFE_URL at notes.md:42:12
  Link destination uses an unsafe protocol and was omitted.
```

Strict mode:

```text
error MDA_STRICT_WARNING at notes.md:42:12
  Strict mode treats warnings as errors.
```

Debug mode can include stack traces for internal errors.

## Help Text

Short help:

```text
Usage:
  mdalchemy <input> [options]

Options:
  -o, --output <path>       Output file path
      --theme <name|path>   Theme name or theme file
      --config <path>       Config file
      --stdout              Write to stdout
      --safe                Escape raw HTML and reject unsafe URLs
      --strict              Treat warnings as errors
  -h, --help                Show help
  -v, --version             Show version
```

Keep help concise. Full docs can live in Markdown.

## CLI Implementation Options

### No dependency

Use `node:util.parseArgs`.

Pros:

- No runtime dependency.
- Good enough for v1.
- Teaches CLI basics.

Cons:

- More manual help formatting.
- Subcommands are more manual.

### Small dependency

Use a focused CLI parser.

Pros:

- Better help.
- Easier subcommands.

Cons:

- Adds dependency.
- Less learning in CLI parsing.

Recommendation:

- Start with `node:util.parseArgs`.
- Add a small parser later only if subcommands become tedious.

## File IO

Input:

- Read with `fs.promises.readFile(path, "utf8")`.
- Check path exists.
- Check it is a file.
- Optionally reject very large files with a friendly warning after v1.

Output:

- Write with `fs.promises.writeFile`.
- Avoid partial writes in future with temp file plus rename.
- Do not overwrite input.
- Respect stdout mode.

Path handling:

- Use `node:path`.
- Preserve platform separators in diagnostics.
- Normalize only where needed.

## Watch Mode Future

Watch mode should be deferred until normal rendering is stable.

Future command:

```text
mdalchemy notes.md -o notes.html --watch
```

Behavior:

- Watch input file.
- Watch config file.
- Watch theme file.
- Debounce changes.
- Re-render on save.
- Keep process alive.
- Print concise status.

Watch mode should not be required for the core architecture.

## Config Validation

Validation should produce all useful errors at once where possible.

Example:

```text
error MDA_CONFIG_INVALID at mdalchemy.config.json
  html.rawHtml must be one of "allow", "escape", or "strip".

error MDA_CONFIG_INVALID at mdalchemy.config.json
  html.tocDepth must be an integer from 1 to 6.
```

Do not silently ignore unknown config keys in strict mode. In normal mode, unknown top-level keys should warn.

## Theme Validation

Theme config errors:

- Missing name.
- Unknown parent theme.
- Extends cycle.
- Unknown token.
- Invalid color value.
- Invalid length value.
- Invalid font stack value.
- Unsupported asset reference.

Themes are user-facing. Error messages should say which token is wrong and what shape is expected.

## Examples

### Basic HTML

```text
mdalchemy README.md -o README.html
```

### Built-In Theme

```text
mdalchemy report.md -o report.html --theme serif
```

### Custom Theme

```text
mdalchemy report.md -o report.html --theme ./themes/report.json
```

### Safe Mode

```text
mdalchemy generated.md -o generated.html --safe
```

### Stdout

```text
mdalchemy notes.md --stdout > notes.html
```

### Fragment For Embedding

```text
mdalchemy notes.md --stdout --fragment
```

## CLI Tests

Test cases:

- Missing input.
- Unknown option.
- Help.
- Version.
- Input file does not exist.
- Input path is directory.
- Output parent missing.
- Output equals input.
- Stdout mode.
- Config path missing.
- Invalid config.
- Built-in theme.
- Theme path missing.
- Invalid theme.
- Strict mode warning failure.
- Safe mode raw HTML behavior.

Use temporary directories for integration tests.

