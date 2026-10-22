import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const cli = path.join(root, "node_modules", "@playwright", "test", "cli.js");

if (!fs.existsSync(cli)) {
  console.error("Browser QA setup: FAIL");
  console.error("Playwright is not installed. Run npm install locally (or npm ci in CI).");
  process.exit(1);
}

function existingWindowsBrowser() {
  if (process.platform !== "win32") return null;

  const candidates = [
    ["Microsoft Edge", process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe")],
    ["Microsoft Edge", process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe")],
    ["Microsoft Edge", process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe")],
    ["Google Chrome", process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe")],
    ["Google Chrome", process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe")],
    ["Google Chrome", process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")],
  ];

  return candidates.find(([, executable]) => executable && fs.existsSync(executable)) || null;
}

if (!process.env.CI && process.platform === "win32" && !process.env.BIBLI_E2E_CHANNEL) {
  const browser = existingWindowsBrowser();
  if (browser) {
    console.log(`Browser QA setup: PASS (${browser[0]} local detectado; no se requiere descargar Chromium).`);
    process.exit(0);
  }
}

if (!process.env.CI && ["msedge", "chrome"].includes(process.env.BIBLI_E2E_CHANNEL || "")) {
  console.log(`Browser QA setup: PASS (se usara el canal ${process.env.BIBLI_E2E_CHANNEL}; no se requiere descargar Chromium).`);
  process.exit(0);
}

const result = spawnSync(process.execPath, [cli, "install", "chromium"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("Browser QA setup: FAIL");
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
