import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const source = path.join(repoRoot, "node_modules", "mermaid", "dist", "mermaid.min.js");
const destinationDir = path.join(repoRoot, "dist", "vendor");
const destination = path.join(destinationDir, "mermaid.min.js");

await mkdir(destinationDir, { recursive: true });
await copyFile(source, destination);
