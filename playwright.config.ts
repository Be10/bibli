import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

function windowsBrowserChannel() {
  if (process.platform !== 'win32' || process.env.CI) return undefined;

  const candidates = [
    ['msedge', process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe')],
    ['msedge', process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe')],
    ['msedge', process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe')],
    ['chrome', process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe')],
    ['chrome', process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe')],
    ['chrome', process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')],
  ];

  return candidates.find(([, executable]) => executable && fs.existsSync(executable))?.[0];
}

const browserChannel = process.env.BIBLI_E2E_CHANNEL || windowsBrowserChannel();
const channelUse = browserChannel ? { channel: browserChannel } : {};
const configuredPort = Number.parseInt(process.env.BIBLI_E2E_PORT || '', 10);
const serverPort = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 4321;
const serverOrigin = `http://127.0.0.1:${serverPort}`;
const localWorkers = Math.max(1, Number.parseInt(process.env.BIBLI_E2E_WORKERS || '2', 10) || 2);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : localWorkers,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 7_500 },
  use: {
    baseURL: serverOrigin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${serverPort}`,
    url: `${serverOrigin}/bibli/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], ...channelUse, viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'tablet-chromium',
      use: { ...devices['Desktop Chrome'], ...channelUse, viewport: { width: 820, height: 1180 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 5'], ...channelUse, viewport: { width: 375, height: 812 } },
    },
  ],
});
