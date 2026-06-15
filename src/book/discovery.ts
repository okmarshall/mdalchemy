import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export interface BookDiscoveryOptions {
  include: readonly string[];
  exclude: readonly string[];
}

export interface BookFileCandidate {
  absolutePath: string;
  relativePath: string;
}

export async function discoverMarkdownFiles(
  rootPath: string,
  options: BookDiscoveryOptions
): Promise<BookFileCandidate[]> {
  const stats = await stat(rootPath);
  if (!stats.isDirectory()) {
    throw new Error(`Book root is not a directory: ${rootPath}`);
  }

  const includeMatchers = compilePatterns(options.include);
  const excludeMatchers = compilePatterns(options.exclude);
  const files: BookFileCandidate[] = [];

  await visitDirectory(rootPath, "", includeMatchers, excludeMatchers, files);
  return files.sort(compareBookFiles);
}

function compilePatterns(patterns: readonly string[]): RegExp[] {
  return patterns.map((pattern) => globToRegExp(normalizePattern(pattern)));
}

async function visitDirectory(
  rootPath: string,
  relativeDir: string,
  includeMatchers: readonly RegExp[],
  excludeMatchers: readonly RegExp[],
  files: BookFileCandidate[]
): Promise<void> {
  const absoluteDir = path.join(rootPath, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const sortedEntries = [...entries].sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of sortedEntries) {
    const relativePath = normalizeProjectPath(path.join(relativeDir, entry.name));
    if (entry.isDirectory()) {
      if (matchesAny(`${relativePath}/`, excludeMatchers) || matchesAny(relativePath, excludeMatchers)) {
        continue;
      }
      await visitDirectory(rootPath, relativePath, includeMatchers, excludeMatchers, files);
      continue;
    }

    if (!entry.isFile()) continue;
    if (matchesAny(relativePath, excludeMatchers)) continue;
    if (!matchesAny(relativePath, includeMatchers)) continue;
    files.push({
      absolutePath: path.join(rootPath, relativePath),
      relativePath
    });
  }
}

function compareBookFiles(left: BookFileCandidate, right: BookFileCandidate): number {
  const leftDir = path.posix.dirname(left.relativePath);
  const rightDir = path.posix.dirname(right.relativePath);
  const normalizedLeftDir = leftDir === "." ? "" : leftDir;
  const normalizedRightDir = rightDir === "." ? "" : rightDir;
  if (normalizedLeftDir !== normalizedRightDir) {
    return normalizedLeftDir.localeCompare(normalizedRightDir);
  }

  const leftRank = isReadmePath(left.relativePath) ? 0 : 1;
  const rightRank = isReadmePath(right.relativePath) ? 0 : 1;
  if (leftRank !== rightRank) return leftRank - rightRank;
  return left.relativePath.localeCompare(right.relativePath);
}

function isReadmePath(value: string): boolean {
  const basename = path.posix.basename(value).toLocaleLowerCase();
  return basename === "readme.md" || basename === "readme.markdown";
}

function matchesAny(value: string, matchers: readonly RegExp[]): boolean {
  return matchers.some((matcher) => matcher.test(value));
}

function normalizePattern(pattern: string): string {
  return normalizeProjectPath(pattern).replace(/^\/+/, "").replace(/\/+$/, "");
}

function normalizeProjectPath(value: string): string {
  return value.replace(/\\/g, "/").replaceAll(path.sep, "/").replace(/^\.\//, "");
}

function globToRegExp(pattern: string): RegExp {
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];

    if (char === "*" && next === "*") {
      const afterNext = pattern[index + 2];
      if (afterNext === "/") {
        source += "(?:.*/)?";
        index += 2;
      } else {
        source += ".*";
        index += 1;
      }
      continue;
    }

    if (char === "*") {
      source += "[^/]*";
      continue;
    }

    if (char === "?") {
      source += "[^/]";
      continue;
    }

    source += escapeRegExp(char ?? "");
  }

  return new RegExp(`${source}$`, "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
