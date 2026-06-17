import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function runCli(args) {
  try {
    const result = await execFileAsync("node", ["dist/cli/main.js", ...args]);
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      exitCode: typeof error.code === "number" ? error.code : 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? ""
    };
  }
}

export async function execCli(args) {
  return execFileAsync("node", ["dist/cli/main.js", ...args]);
}
