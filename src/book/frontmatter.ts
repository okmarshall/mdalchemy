export interface BookFrontmatter {
  include?: boolean | undefined;
  title?: string | undefined;
}

export function readBookFrontmatter(markdown: string): BookFrontmatter {
  const block = readLeadingFrontmatter(markdown);
  if (!block) return {};

  const metadata: BookFrontmatter = {};
  const lines = block.split(/\r?\n/);
  let inMdalchemySection = false;
  let mdalchemyIndent = 0;

  for (const rawLine of lines) {
    const withoutComment = rawLine.replace(/\s+#.*$/, "");
    if (!withoutComment.trim()) continue;

    const indent = withoutComment.match(/^\s*/)?.[0].length ?? 0;
    const line = withoutComment.trim();
    const dottedInclude = /^mdalchemy\.include\s*:\s*(true|false)\s*$/i.exec(line);
    if (dottedInclude) {
      metadata.include = dottedInclude[1]?.toLowerCase() === "true";
      inMdalchemySection = false;
      continue;
    }

    const title = /^title\s*:\s*(.+?)\s*$/.exec(line);
    if (title && indent === 0) {
      metadata.title = unquoteYamlScalar(title[1] ?? "");
      inMdalchemySection = false;
      continue;
    }

    const mdalchemyScalar = /^mdalchemy\s*:\s*(true|false)\s*$/i.exec(line);
    if (mdalchemyScalar && indent === 0) {
      metadata.include = mdalchemyScalar[1]?.toLowerCase() === "true";
      inMdalchemySection = false;
      continue;
    }

    if (/^mdalchemy\s*:\s*$/.test(line) && indent === 0) {
      inMdalchemySection = true;
      mdalchemyIndent = indent;
      continue;
    }

    if (inMdalchemySection) {
      if (indent <= mdalchemyIndent) {
        inMdalchemySection = false;
        continue;
      }
      const nestedInclude = /^include\s*:\s*(true|false)\s*$/i.exec(line);
      if (nestedInclude) {
        metadata.include = nestedInclude[1]?.toLowerCase() === "true";
      }
    }
  }

  return metadata;
}

function readLeadingFrontmatter(markdown: string): string | undefined {
  const normalized = markdown.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---\n") && !normalized.startsWith("---\r\n")) return undefined;

  const lines = normalized.split(/\r?\n/);
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === "---") {
      return lines.slice(1, index).join("\n");
    }
  }

  return undefined;
}

function unquoteYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
