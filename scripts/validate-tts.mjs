import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSpeechNormalizer } from "../src/lib/tts/normalization.js";
import { buildTtsCacheKey, createTtsCacheMaterial } from "../src/lib/tts/cache.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lexiconPath = path.join(root, "content", "learning", "tts-lexicon.json");
const editorialPath = path.join(root, "data", "editorial.sql");
const bibliImgGlossaryPath = path.join(root, "data", "bibliimg-glossary.sql");
const fail = (message) => { throw new Error(message); };

const lexicon = JSON.parse(fs.readFileSync(lexiconPath, "utf8"));
if (lexicon.schema_version !== "1.0.0") fail("tts-lexicon schema_version must be 1.0.0");
if (!lexicon.rules_version) fail("tts-lexicon rules_version is required");
if (!lexicon.cache_version) fail("tts-lexicon cache_version is required");

for (const locale of ["es", "en"]) {
  const entry = lexicon.locales?.[locale];
  if (!entry?.speech_locale) fail(`Missing speech_locale for ${locale}`);
  if (!Array.isArray(entry.books) || entry.books.length < 66) fail(`Expected at least 66 Bible book names/aliases for ${locale}`);
  if (!entry.reference?.chapter || !entry.reference?.verse || !entry.reference?.verses || !entry.reference?.to) {
    fail(`Incomplete Bible-reference reading vocabulary for ${locale}`);
  }
}

const terms = lexicon.terms ?? [];
const ids = new Set();
for (const term of terms) {
  if (!term.term_id || ids.has(term.term_id)) fail(`Duplicate or missing TTS term id: ${term.term_id}`);
  ids.add(term.term_id);
  for (const locale of ["es", "en"]) {
    if (!Array.isArray(term.match?.[locale]) || !term.match[locale].length) fail(`${term.term_id}: missing ${locale} matches`);
    if (!term.speak?.[locale]) fail(`${term.term_id}: missing ${locale} spoken form`);
  }
}

const sqlCorpus = [editorialPath, bibliImgGlossaryPath]
  .filter(fs.existsSync)
  .map((file) => fs.readFileSync(file, "utf8"))
  .join("\n");
for (const term of terms.filter((entry) => entry.source_glossary_id)) {
  if (!sqlCorpus.includes(`'${term.source_glossary_id}'`)) fail(`Unknown glossary source ${term.source_glossary_id}`);
}

const requiredRoles = ["title", "bible-reading", "heading", "explanation", "application", "reflection", "summary", "prayer", "question"];
for (const role of requiredRoles) {
  const config = lexicon.semantic_roles?.[role];
  if (!config || !(Number(config.rate_multiplier) > 0) || !(Number(config.pause_after_ms) >= 0)) {
    fail(`Invalid semantic TTS role: ${role}`);
  }
}

const es = createSpeechNormalizer(lexicon, "es");
const en = createSpeechNormalizer(lexicon, "en");
const esSample = es.normalize("Génesis 1:1-3, RVR1960");
const esOrdinal = es.normalize("1 Samuel 3:1");
const enSample = en.normalize("Genesis 1:1-3, KJV");
const enOrdinal = en.normalize("1 Samuel 3:1");
if (!esSample.includes("Génesis, capítulo 1, versículos 1 al 3")) fail(`Unexpected ES reference normalization: ${esSample}`);
if (!esSample.includes("Reina Valera mil novecientos sesenta")) fail(`RVR1960 normalization missing: ${esSample}`);
if (!esOrdinal.includes("Primera de Samuel, capítulo 3, versículo 1")) fail(`ES ordinal book normalization missing: ${esOrdinal}`);
if (!enSample.includes("Genesis, chapter 1, verses 1 to 3")) fail(`Unexpected EN reference normalization: ${enSample}`);
if (!enSample.includes("King James Version")) fail(`KJV normalization missing: ${enSample}`);
if (!enOrdinal.includes("First Samuel, chapter 3, verse 1")) fail(`EN ordinal book normalization missing: ${enOrdinal}`);

const cacheInput = {
  text: esSample,
  locale: es.speechLocale,
  voiceId: "voice-a",
  modelId: "model-a",
  rulesVersion: lexicon.rules_version,
  semanticRole: "bible-reading",
};
const material = createTtsCacheMaterial(cacheInput);
if (!material.includes(lexicon.rules_version) || !material.includes("bible-reading")) fail("TTS cache material omits version or semantic role");
const keyA = await buildTtsCacheKey(cacheInput);
const keyB = await buildTtsCacheKey(cacheInput);
const keyDifferent = await buildTtsCacheKey({ ...cacheInput, voiceId: "voice-b" });
if (keyA !== keyB) fail("TTS cache key must be stable");
if (keyA === keyDifferent) fail("TTS cache key must change when synthesis parameters change");

console.log("Validación TTS: PASS");
console.log(`Reglas TTS: ${lexicon.rules_version}`);
console.log(`Alias/libros ES: ${lexicon.locales.es.books.length}`);
console.log(`Alias/libros EN: ${lexicon.locales.en.books.length}`);
console.log(`Términos del lexicón: ${terms.length}`);
console.log(`Roles semánticos: ${requiredRoles.length}`);
console.log(`Cache key estable: ${keyA.slice(0, 20)}…`);
