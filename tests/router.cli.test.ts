import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const execute = promisify(execFile);

it("runs pnpm start against the supplied files and prints all 26 independently expected routes", async () => {
  const expected = readFileSync(new URL("./fixtures/assessment/expected.txt", import.meta.url), "utf8");
  const { stdout, stderr } = await execute("pnpm", ["--silent", "start"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    encoding: "utf8", timeout: 10_000,
  });
  expect(stderr).toBe("");
  expect(stdout).toBe(expected);
}, 15_000);

it("rejects a closed stdout pipe through publication instead of resolving or crashing unhandled", async () => {
  const script = `
    import { writeRoutes } from "./src/repositories/routes.repository.ts";
    await Bun.stdin.text();
    try {
      await writeRoutes([{ orderNumber: "#1", kind: "partner", reason: "missing-zip" }]);
      console.error("unexpected success");
      process.exitCode = 1;
    } catch (error) {
      console.error("caught:" + error.code);
    }
  `;
  const child = spawn("bun", ["--eval", script], {
    cwd: fileURLToPath(new URL("../", import.meta.url)), stdio: "pipe", timeout: 5_000,
  });
  const closed = once(child, "close");
  let stderr = "";
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
  try {
    // Close the read end before allowing the subprocess to attempt its write.
    const stdoutClosed = once(child.stdout, "close");
    child.stdout.destroy();
    await stdoutClosed;
    child.stdin.end();
    const [code, signal] = await closed;
    expect({ code, signal, stderr }).toEqual({ code: 0, signal: null, stderr: "caught:EPIPE\n" });
  } finally {
    if (child.exitCode === null) child.kill();
  }
}, 10_000);
