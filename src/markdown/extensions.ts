export const gfmMarkdownExtensions = [
  "gfm-table",
  "gfm-task-list",
  "gfm-strikethrough",
  "gfm-footnote",
  "gfm-literal-autolink"
] as const;

export const supportedMarkdownExtensions = [
  ...gfmMarkdownExtensions,
  "frontmatter"
] as const;

export type MarkdownExtension = typeof supportedMarkdownExtensions[number];

const supportedMarkdownExtensionSet = new Set<string>(supportedMarkdownExtensions);

export function isSupportedMarkdownExtension(value: string): value is MarkdownExtension {
  return supportedMarkdownExtensionSet.has(value);
}

export function hasMarkdownExtension(
  extensions: readonly string[] | undefined,
  extension: MarkdownExtension
): boolean {
  return extensions?.includes(extension) ?? false;
}
