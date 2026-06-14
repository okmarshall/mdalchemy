import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export async function readMarkdownFile(filePath: string): Promise<string> {
  const stats = await stat(filePath);
  if (!stats.isFile()) {
    throw new Error(`Input path is not a file: ${filePath}`);
  }

  const buffer = await readFile(filePath);
  if (buffer.includes(0)) {
    throw new Error(`Input appears to be binary: ${filePath}`);
  }

  return buffer.toString("utf8");
}

export async function writeOutputFile(filePath: string, content: string, createDirs: boolean): Promise<void> {
  if (createDirs) {
    await mkdir(path.dirname(filePath), { recursive: true });
  }
  await writeFile(filePath, content, "utf8");
}

export function defaultOutputPath(inputPath: string): string {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.html`);
}

export function inferFormat(outputPath?: string): "html" {
  if (!outputPath) return "html";
  const extension = path.extname(outputPath).toLocaleLowerCase();
  if (extension && extension !== ".html" && extension !== ".htm") {
    throw new Error(`Unsupported output extension "${extension}". Only HTML output is implemented.`);
  }
  return "html";
}

