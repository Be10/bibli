const normalizeWhitespace = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ordinalizeBook = (book, localeConfig) => {
  const match = String(book).match(/^([123])\s+(.+)$/);
  if (!match) return book;
  const prefix = localeConfig?.ordinal_books?.[match[1]];
  return prefix ? `${prefix} ${match[2]}` : book;
};

const buildTermRules = (config, locale) => (config?.terms ?? [])
  .flatMap((entry) => (entry?.match?.[locale] ?? []).map((match) => ({
    termId: entry.term_id,
    match,
    speak: entry?.speak?.[locale] ?? match,
  })))
  .filter((entry) => entry.match && entry.speak)
  .sort((a, b) => b.match.length - a.match.length);

export const createSpeechNormalizer = (config, locale = "es") => {
  const lang = locale === "en" ? "en" : "es";
  const localeConfig = config?.locales?.[lang] ?? {};
  const books = [...(localeConfig.books ?? [])]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const ref = localeConfig.reference ?? {};
  const referencePattern = books
    ? new RegExp(`(^|[^\\p{L}\\p{N}])(${books})\\s+(\\d{1,3})\\s*:\\s*(\\d{1,3})(?:\\s*[–—-]\\s*(?:(\\d{1,3})\\s*:\\s*)?(\\d{1,3}))?(?=$|[^\\p{L}\\p{N}])`, "giu")
    : null;
  const termRules = buildTermRules(config, lang);

  const speakBibleReference = (_match, prefix, book, chapter, verse, endChapter, endVerse) => {
    const spokenBook = ordinalizeBook(book, localeConfig);
    if (endVerse && endChapter) {
      return `${prefix}${spokenBook}, ${ref.chapter ?? "chapter"} ${chapter}, ${ref.verse ?? "verse"} ${verse}, ${ref.to ?? "to"} ${ref.chapter ?? "chapter"} ${endChapter}, ${ref.verse ?? "verse"} ${endVerse}`;
    }
    if (endVerse) {
      return `${prefix}${spokenBook}, ${ref.chapter ?? "chapter"} ${chapter}, ${ref.verses ?? "verses"} ${verse} ${ref.to ?? "to"} ${endVerse}`;
    }
    return `${prefix}${spokenBook}, ${ref.chapter ?? "chapter"} ${chapter}, ${ref.verse ?? "verse"} ${verse}`;
  };

  const normalizeTerms = (value) => {
    let text = value;
    for (const rule of termRules) {
      const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(rule.match)})(?=$|[^\\p{L}\\p{N}])`, "giu");
      text = text.replace(pattern, (_match, prefix) => `${prefix}${rule.speak}`);
    }
    return text;
  };

  const normalize = (value) => {
    let text = String(value ?? "")
      .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D]/gu, " ")
      .replace(/[•▪◦✦✧✝✓◌≡↝⌖◇]/g, ", ");
    text = normalizeTerms(text);
    if (referencePattern) text = text.replace(referencePattern, speakBibleReference);
    text = text.replace(/(\d+)\s*[–—-]\s*(\d+)/g, (_match, start, end) =>
      lang === "en" ? `${start} to ${end}` : `${start} al ${end}`,
    );
    text = text.replace(/(\d+)\s*:\s*(\d+)/g, "$1, $2");
    return normalizeWhitespace(text);
  };

  return {
    locale: lang,
    speechLocale: localeConfig.speech_locale ?? (lang === "en" ? "en-US" : "es-PE"),
    rulesVersion: config?.rules_version ?? "0",
    normalize,
    getProsody(role) {
      return config?.semantic_roles?.[role] ?? config?.semantic_roles?.explanation ?? { rate_multiplier: 1, pause_after_ms: 0 };
    },
  };
};

export const inferTtsSemanticRole = (element) => {
  if (!(element instanceof Element)) return "explanation";
  if (element.matches(".bible-chapter-verse,.verse[id^='reading-v']")) return "bible-reading";
  if (element.matches("[data-tts-lesson-title]")) return "title";
  if (element.matches("[data-tts-lesson-reference]")) return "bible-reading";
  if (element.matches("h1,h2,h3")) return "heading";
  const dynamic = element.closest("[data-dynamic-block]");
  const role = dynamic?.getAttribute("data-semantic-role") ?? "";
  if (role === "title") return "title";
  if (role === "primary-reading") return "bible-reading";
  if (role === "application") return "application";
  if (role === "reflection") return "reflection";
  if (role === "summary") return "summary";
  if (role === "prayer") return "prayer";
  return "explanation";
};

export { normalizeWhitespace };
