import { expect, test } from "@playwright/test";

const BASE = "/bibli";
const LESSON = `${BASE}/lecciones/pentateuco-leccion-001-genesis-1-1-a-2-3/`;

async function installSpeechMock(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    class MockUtterance {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      volume = 1;
      voice = null;
      onstart: null | (() => void) = null;
      onend: null | (() => void) = null;
      onerror: null | ((event: { error: string }) => void) = null;
      constructor(text: string) { this.text = text; }
    }
    let current: MockUtterance | null = null;
    const spoken: string[] = [];
    const engine = {
      paused: false,
      speaking: false,
      pending: false,
      getVoices: () => [],
      cancel: () => {
        current = null;
        engine.paused = false;
        engine.speaking = false;
        engine.pending = false;
      },
      pause: () => { engine.paused = true; },
      resume: () => { engine.paused = false; },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      speak: (utterance: MockUtterance) => {
        current = utterance;
        spoken.push(utterance.text);
        engine.speaking = true;
        engine.pending = false;
        queueMicrotask(() => utterance.onstart?.());
      },
    };
    (window as any).__bibliSpeechMock = {
      spoken,
      endCurrent: () => {
        const utterance = current;
        current = null;
        engine.speaking = false;
        utterance?.onend?.();
      },
    };
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: MockUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: engine });
  });
}

test.beforeEach(async ({ page }) => {
  await installSpeechMock(page);
});

test("TTS exposes provider-neutral versioned runtime metadata and bilingual lexicon", async ({ page }) => {
  await page.goto(LESSON);
  const tts = page.locator("[data-global-tts]");
  await expect(tts).toHaveAttribute("data-tts-provider-default", "browser-web-speech");
  await expect(tts).toHaveAttribute("data-tts-rules-version", "1.1.0");
  await expect(tts).toHaveAttribute("data-tts-cache-version", "1");

  const metadata = await tts.evaluate((element) => {
    const root = element as HTMLElement;
    const lexicon = JSON.parse(root.dataset.ttsLexicon || "{}");
    return {
      provider: root.dataset.ttsProvider,
      speechEs: lexicon.locales?.es?.speech_locale,
      speechEn: lexicon.locales?.en?.speech_locale,
      glossarySource: lexicon.terms?.find((entry: any) => entry.term_id === "glossary-christ")?.source_glossary_id,
      semanticRoles: Object.keys(lexicon.semantic_roles ?? {}).length,
    };
  });
  expect(metadata.provider).toBe("browser-web-speech");
  expect(metadata.speechEs).toBe("es-PE");
  expect(metadata.speechEn).toBe("en-US");
  expect(metadata.glossarySource).toBe("glo-cristo");
  expect(metadata.semanticRoles).toBeGreaterThanOrEqual(8);
});

test("TTS keeps existing lesson controls while using the provider layer", async ({ page }) => {
  await page.goto(LESSON);
  const dockButton = page.locator('[data-dock-action="tts"]');
  await expect(dockButton).toBeVisible();
  await dockButton.click();

  const tts = page.locator("[data-global-tts]");
  await expect(tts.locator("[data-tts-player]")).toBeVisible();
  await expect(tts.locator("[data-tts-rate]")).toBeVisible();
  await expect(tts.locator("[data-tts-voice]")).toBeVisible();
  await expect(tts).toHaveAttribute("data-tts-provider", "browser-web-speech");
});

test("Dynamic TTS binds playback to the active block and follows manual navigation", async ({ page }) => {
  await page.goto(LESSON);
  await page.locator('[data-presentation-button="dynamic"]').click();

  const dynamic = page.locator("[data-dynamic-lesson]");
  const tts = page.locator("[data-global-tts]");
  await expect(dynamic).toBeVisible();
  await page.locator('[data-dock-action="tts"]').click();

  await expect(tts).toHaveAttribute("data-tts-dynamic-sync", "block-v1");
  const firstBlockKey = await dynamic.getAttribute("data-active-block");
  expect(firstBlockKey).toBeTruthy();
  await expect(tts).toHaveAttribute("data-tts-dynamic-block-key", firstBlockKey!);
  await expect(dynamic.locator("[data-dynamic-block]:not([hidden])")).toHaveClass(/tts-active-block/);

  const spokenBefore = await page.evaluate(() => (window as any).__bibliSpeechMock.spoken.length);
  await dynamic.locator("[data-dynamic-next]").click();
  await expect(dynamic.locator("[data-dynamic-current]")).toHaveText("2");
  const secondBlockKey = await dynamic.getAttribute("data-active-block");
  expect(secondBlockKey).toBeTruthy();
  expect(secondBlockKey).not.toBe(firstBlockKey);
  await expect(tts).toHaveAttribute("data-tts-dynamic-block-key", secondBlockKey!);
  await expect(tts).toHaveAttribute("data-tts-dynamic-playing-block", secondBlockKey!);
  await expect(dynamic.locator("[data-dynamic-block]:not([hidden])")).toHaveClass(/tts-active-block/);

  const spokenAfter = await page.evaluate(() => (window as any).__bibliSpeechMock.spoken.length);
  expect(spokenAfter).toBeGreaterThan(spokenBefore);
});

test("Dynamic TTS advances the renderer when the active block finishes", async ({ page }) => {
  await page.goto(LESSON);
  await page.locator('[data-presentation-button="dynamic"]').click();

  const dynamic = page.locator("[data-dynamic-lesson]");
  const tts = page.locator("[data-global-tts]");
  await page.locator('[data-dock-action="tts"]').click();
  await expect(dynamic.locator("[data-dynamic-current]")).toHaveText("1");

  await page.evaluate(() => (window as any).__bibliSpeechMock.endCurrent());
  await expect(dynamic.locator("[data-dynamic-current]")).toHaveText("2", { timeout: 2500 });
  await expect(tts).toHaveAttribute("data-tts-dynamic-block-position", "2");
  const activeKey = await dynamic.getAttribute("data-active-block");
  expect(activeKey).toBeTruthy();
  await expect(tts).toHaveAttribute("data-tts-dynamic-playing-block", activeKey!);
});
