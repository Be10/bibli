import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const cli = path.join(root, "node_modules", "@playwright", "test", "cli.js");

if (!fs.existsSync(cli)) {
  console.error("Browser QA: FAIL");
  console.error("Playwright is not installed. Run npm install locally (or npm ci in CI).");
  process.exit(1);
}

const passthroughArgs = process.argv.slice(2);
const result = spawnSync(process.execPath, [cli, "test", ...passthroughArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("Browser QA: FAIL");
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
