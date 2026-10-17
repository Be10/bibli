import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const STUDY_CONTRACT_VERSION = "1.0.0";

export const IMPORTABLE_ARTIFACT_TYPE = "bible_study_lesson";
export const IMPORTABLE_MODE = "official";

export const SUPPORTED_CONTENT_TYPES = new Set([
  "lesson",
]);

export const KNOWN_CONTENT_TYPES = new Set([
  "lesson",
  "synthesis_lesson",
  "book_intro",
  "section_intro",
  "book_synthesis",
  "route_synthesis",
]);

export const REQUIRED_LESSON_FIELDS = [
  "artifact_type",
  "content_type",
  "mode",
  "route_id",
  "route_name",
  "route_lesson_number",
  "book_id",
  "book_name",
  "primary_reference",
  "coverage",
  "translation",
  "lesson_id",
  "content_version",
];

export const RESERVED_H2 = [
  "🧭 Dónde estamos",
  "🕊️ Qué revela acerca de Dios",
  "🪞 Qué revela acerca de nosotros",
  "✝️ Encontrando a Jesús",
  "🧵 Hilo Invisible",
  "🎯 Aplicación",
  "💭 Para meditar",
  "📝 Resumen",
  "🙏 Oración",
];

function stripQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function parseScalar(raw) {
  const value = stripQuotes(raw.trim());
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~") return null;
  return value;
}

export function parseFrontmatter(text, fileLabel = "Markdown") {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---\n") && !normalized.startsWith("---\r\n")) {
    throw new Error(`${fileLabel}: falta frontmatter YAML inicial`);
  }

  const lines = normalized.split(/\r?\n/);
  if (lines[0] !== "---") {
    throw new Error(`${fileLabel}: frontmatter inválido`);
  }

  let closingIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === "---") {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex === -1) {
    throw new Error(`${fileLabel}: frontmatter sin cierre ---`);
  }

  const data = {};
  let listKey = null;

  for (const line of lines.slice(1, closingIndex)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch) {
      if (!listKey || !Array.isArray(data[listKey])) {
        throw new Error(`${fileLabel}: elemento de lista YAML sin clave contenedora`);
      }
      data[listKey].push(parseScalar(listMatch[1]));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_]+):(?:\s*(.*))?$/);
    if (!keyMatch) {
      throw new Error(`${fileLabel}: YAML v1 no soportado: ${line}`);
    }

    const [, key, rawValue = ""] = keyMatch;
    if (!rawValue.trim()) {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = parseScalar(rawValue);
      listKey = null;
    }
  }

  const body = lines.slice(closingIndex + 1).join("\n").replace(/^\n+/, "");
  return { data, body };
}

export function parseStudyDocument(text, fileLabel = "Markdown") {
  const { data, body } = parseFrontmatter(text, fileLabel);
  const h1 = [...body.matchAll(/^# (.+)$/gm)].map((match) => match[1].trim());
  const h2Matches = [...body.matchAll(/^## (.+)$/gm)].map((match) => ({
    title: match[1].trim(),
    index: match.index,
    contentStart: match.index + match[0].length,
  }));
  const readingLines = [...body.matchAll(/^\*\*📖 Lectura:\*\*\s*(.+)$/gm)].map((match) => match[1].trim());

  const sections = new Map();
  for (let index = 0; index < h2Matches.length; index += 1) {
    const current = h2Matches[index];
    const next = h2Matches[index + 1];
    const content = body.slice(current.contentStart, next?.index ?? body.length).trim();
    if (!sections.has(current.title)) sections.set(current.title, []);
    sections.get(current.title).push(content);
  }

  return {
    frontmatter: data,
    body,
    h1,
    h2: h2Matches.map((entry) => entry.title),
    readingLines,
    sections,
  };
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}


export function normalizeBibleReference(value) {
  return normalizeText(value)
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s*([:;,\-])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function splitReadingLine(value) {
  const lastComma = value.lastIndexOf(",");
  if (lastComma === -1) return { reference: value.trim(), translation: null };
  return {
    reference: value.slice(0, lastComma).trim(),
    translation: value.slice(lastComma + 1).trim(),
  };
}

export function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

export function walkFiles(rootDir, predicate = () => true) {
  const output = [];
  if (!fs.existsSync(rootDir)) return output;

  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile() && predicate(fullPath)) output.push(fullPath);
    }
  }

  return output.sort((a, b) => a.localeCompare(b));
}

export function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

export function safeRemoveDirectoryContents(directory) {
  fs.mkdirSync(directory, { recursive: true });
  for (const entry of fs.readdirSync(directory)) {
    fs.rmSync(path.join(directory, entry), { recursive: true, force: true });
  }
}

export function canonicalBookId(sourceBookId) {
  return `book-${sourceBookId}`;
}
