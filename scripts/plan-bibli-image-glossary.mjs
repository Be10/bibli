import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import Database from "better-sqlite3";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const dbPath = path.join(repoRoot, "data", "bibli.sqlite");
const mappingPath = path.join(repoRoot, "content", "bibli-images-integration-map.json");
const routingPath = path.join(repoRoot, "content", "glossary-route-map.json");
const routePolicyPath = path.join(repoRoot, "content", "bibli-images-glossary-route-policy.json");
const outputPath = path.join(repoRoot, "content", "bibli-images-glossary-plan.json");
const sourceFolderName = "bibli_images_OneDrive_Only";
const repoOneDriveRoot = path.resolve(repoRoot, "..", "..", "..");
const defaultSourceRoot = path.join(repoOneDriveRoot, sourceFolderName);

function parseArgs(argv) {
  const options = { source: null, check: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") options.check = true;
    else if (arg === "--source" && argv[i + 1]) options.source = argv[++i];
    else if (arg.startsWith("--source=")) options.source = arg.slice("--source=".length);
    else throw new Error(`Argumento no reconocido: ${arg}`);
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[’'"“”()\[\]{}.,;:!?/\\|_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniquePaths(values) {
  return [...new Set(values.filter(Boolean).map((value) => path.resolve(value)))];
}

function hasEntriesFolder(candidate) {
  try {
    return fs.statSync(path.join(candidate, "entries")).isDirectory();
  } catch {
    return false;
  }
}

function findNamedFolder(root, targetName, maxDepth = 4) {
  if (!root || !fs.existsSync(root)) return null;
  const queue = [{ dir: path.resolve(root), depth: 0 }];
  const ignored = new Set([".git", ".astro", "dist", "node_modules", "playwright-report", "test-results"]);

  while (queue.length) {
    const { dir, depth } = queue.shift();
    let children;
    try {
      children = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const child of children) {
      if (!child.isDirectory() || ignored.has(child.name)) continue;
      const childPath = path.join(dir, child.name);
      if (child.name === targetName && hasEntriesFolder(childPath)) return childPath;
      if (depth < maxDepth) queue.push({ dir: childPath, depth: depth + 1 });
    }
  }
  return null;
}

function resolveSourceRoot() {
  const explicit = options.source || process.env.BIBLI_IMAGES_ROOT;
  if (explicit) return path.resolve(explicit);

  const oneDriveRoots = uniquePaths([
    process.env.OneDriveCommercial,
    process.env.OneDrive,
    process.env.OneDriveConsumer,
    repoOneDriveRoot,
  ]);

  const candidates = uniquePaths([
    defaultSourceRoot,
    ...oneDriveRoots.flatMap((root) => [
      path.join(root, sourceFolderName),
      path.join(root, "Documentos", sourceFolderName),
      path.join(root, "Documents", sourceFolderName),
      path.join(root, "Projects", sourceFolderName),
      path.join(root, "Documentos", "Projects", sourceFolderName),
    ]),
  ]);

  const exact = candidates.find(hasEntriesFolder);
  if (exact) return exact;
  for (const root of oneDriveRoots) {
    const discovered = findNamedFolder(root, sourceFolderName, 4);
    if (discovered) return discovered;
  }

  throw new Error(
    `No existe una copia local de ${sourceFolderName}. Sincroniza la carpeta o usa --source/BIBLI_IMAGES_ROOT.`,
  );
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function listApprovedPackages(sourceRoot) {
  const entriesRoot = path.join(sourceRoot, "entries");
  assert(fs.existsSync(entriesRoot), `No existe ${entriesRoot}`);
  const packages = [];

  for (const groupDir of fs.readdirSync(entriesRoot, { withFileTypes: true }).filter((item) => item.isDirectory())) {
    const groupPath = path.join(entriesRoot, groupDir.name);
    for (const subjectDir of fs.readdirSync(groupPath, { withFileTypes: true }).filter((item) => item.isDirectory())) {
      const entryPath = path.join(groupPath, subjectDir.name, "entry.yaml");
      if (!fs.existsSync(entryPath)) continue;
      const doc = yaml.load(fs.readFileSync(entryPath, "utf8"), { schema: yaml.JSON_SCHEMA });
      if (doc?.status !== "approved") continue;
      assert(doc.schema_version === 2, `${subjectDir.name}: schema_version debe ser 2`);
      assert(typeof doc.entity_key === "string" && doc.entity_key.trim(), `${subjectDir.name}: falta entity_key`);
      assert(typeof doc.canonical_name === "string" && doc.canonical_name.trim(), `${subjectDir.name}: falta canonical_name`);
      for (const locale of ["es-419", "en-US"]) {
        const content = doc.content?.[locale];
        assert(content?.display_name?.trim(), `${subjectDir.name}: falta ${locale}.display_name`);
        assert(content?.definition?.trim(), `${subjectDir.name}: falta ${locale}.definition`);
      }
      packages.push({
        sourceSlug: subjectDir.name,
        groupFolder: groupDir.name,
        entryPath,
        sourcePath: path.relative(sourceRoot, entryPath).split(path.sep).join("/"),
        doc,
      });
    }
  }

  return packages.sort((a, b) => a.sourceSlug.localeCompare(b.sourceSlug, "es"));
}

const sourceRoot = resolveSourceRoot();
const mapping = readJson(mappingPath, { schemaVersion: 1, overrides: {} });
assert(mapping.schemaVersion === 1, "bibli-images-integration-map.json: schemaVersion debe ser 1");
assert(mapping.overrides && typeof mapping.overrides === "object", "bibli-images-integration-map.json: overrides debe ser objeto");

const routing = readJson(routingPath, null);

assert(
  routing?.schemaVersion === 1,
  "glossary-route-map.json: schemaVersion debe ser 1"
);

assert(
  routing.categories &&
  typeof routing.categories === "object" &&
  !Array.isArray(routing.categories),
  "glossary-route-map.json: categories debe ser objeto"
);

assert(
  routing.routes &&
  typeof routing.routes === "object" &&
  !Array.isArray(routing.routes),
  "glossary-route-map.json: routes debe ser objeto"
);

const routePolicy =
  readJson(
    routePolicyPath,
    {
      schemaVersion: 1,
      groupDefaults: {},
      overrides: {}
    }
  );

assert(
  routePolicy.schemaVersion === 1,
  "bibli-images-glossary-route-policy.json: schemaVersion debe ser 1"
);

assert(
  routePolicy.groupDefaults &&
  typeof routePolicy.groupDefaults === "object" &&
  !Array.isArray(routePolicy.groupDefaults),
  "bibli-images-glossary-route-policy.json: groupDefaults debe ser objeto"
);

assert(
  routePolicy.overrides &&
  typeof routePolicy.overrides === "object" &&
  !Array.isArray(routePolicy.overrides),
  "bibli-images-glossary-route-policy.json: overrides debe ser objeto"
);

const publicCategories =
  new Set(
    Object.keys(
      routing.categories
    )
  );

function assertPublicCategory(
  category,
  label
) {
  assert(
    typeof category === "string" &&
    publicCategories.has(category),
    `${label}: categoria publica invalida: ${category}`
  );

  return category;
}

function resolvePublicRouting({
  sourceSlug,
  group,
  proposedSlug
}) {
  const existingCategory =
    routing.routes[proposedSlug];

  if (existingCategory) {
    return {
      category:
        assertPublicCategory(
          existingCategory,
          `${sourceSlug} route existente`
        ),
      source: "existing-route"
    };
  }

  const override =
    routePolicy.overrides[sourceSlug];

  if (override) {
    return {
      category:
        assertPublicCategory(
          override,
          `${sourceSlug} override`
        ),
      source: "override"
    };
  }

  const groupDefault =
    routePolicy.groupDefaults[group];

  if (groupDefault) {
    return {
      category:
        assertPublicCategory(
          groupDefault,
          `grupo ${group}`
        ),
      source: "group-default"
    };
  }

  return {
    category: null,
    source: "unresolved"
  };
}

assert(
  fs.existsSync(dbPath),
  `No existe SQLite: ${dbPath}`
);

const db = new Database(dbPath, { readonly: true });
const glossaryRows = db.prepare("SELECT id, term, slug, definition, status FROM glossary_terms ORDER BY slug").all();
const glossaryBySlug = new Map(glossaryRows.map((row) => [row.slug, row]));
const glossaryByNormalizedTerm = new Map();
for (const row of glossaryRows) {
  const key = normalizeIdentity(row.term);
  if (!glossaryByNormalizedTerm.has(key)) glossaryByNormalizedTerm.set(key, []);
  glossaryByNormalizedTerm.get(key).push(row);
}

const packages = listApprovedPackages(sourceRoot);
const aliasOwners = new Map();
for (const item of packages) {
  for (const alias of item.doc.aliases ?? []) {
    const key = normalizeIdentity(alias);
    if (!key) continue;
    if (!aliasOwners.has(key)) aliasOwners.set(key, new Set());
    aliasOwners.get(key).add(item.sourceSlug);
  }
}

const proposedSlugOwners = new Map();
const proposedTermOwners = new Map();
for (const item of packages) {
  const proposedSlug = mapping.overrides[item.sourceSlug] ?? item.sourceSlug;
  const termKey = normalizeIdentity(item.doc.content["es-419"].display_name);
  if (!proposedSlugOwners.has(proposedSlug)) proposedSlugOwners.set(proposedSlug, []);
  proposedSlugOwners.get(proposedSlug).push(item.sourceSlug);
  if (!proposedTermOwners.has(termKey)) proposedTermOwners.set(termKey, []);
  proposedTermOwners.get(termKey).push(item.sourceSlug);
}

const entries = [];
for (const item of packages) {
  const doc = item.doc;
  const proposedSlug = mapping.overrides[item.sourceSlug] ?? item.sourceSlug;
  const proposedTerm = doc.content["es-419"].display_name.trim();
  const proposedDefinition = doc.content["es-419"].definition.trim();
  const proposedId = `glo-${proposedSlug}`;

  const publicRouting =
    resolvePublicRouting({
      sourceSlug: item.sourceSlug,
      group: doc.group,
      proposedSlug
    });

  const termKey =
    normalizeIdentity(
      proposedTerm
    );
  const existingBySlug = glossaryBySlug.get(proposedSlug) ?? null;
  const existingTermCollisions = (glossaryByNormalizedTerm.get(termKey) ?? []).filter((row) => row.slug !== proposedSlug);
  const slugOwners = proposedSlugOwners.get(proposedSlug) ?? [];
  const termOwners = proposedTermOwners.get(termKey) ?? [];
  const sharedAliases = [...new Set((doc.aliases ?? [])
    .map((alias) => ({ alias, owners: [...(aliasOwners.get(normalizeIdentity(alias)) ?? [])] }))
    .filter((itemAlias) => itemAlias.owners.length > 1)
    .map((itemAlias) => itemAlias.alias))]
    .sort((a, b) => a.localeCompare(b, "es"));

  const reasons = [];
  let action;
  if (!publicRouting.category) {
    action = "blocked";

    reasons.push(
      `Falta categoria publica para group=${doc.group}; agrega groupDefaults u overrides en bibli-images-glossary-route-policy.json`
    );
  } else if (existingBySlug) {
    action = "existing";
    reasons.push(
      `Ya existe glossary_terms.slug=${proposedSlug}`
    );
  } else if (slugOwners.length > 1) {
    action = "blocked";
    reasons.push(`Más de un paquete propone el slug ${proposedSlug}: ${slugOwners.join(", ")}`);
  } else if (termOwners.length > 1) {
    action = "blocked";
    reasons.push(`Más de un paquete propone el mismo display_name: ${termOwners.join(", ")}`);
  } else if (existingTermCollisions.length) {
    action = "blocked";
    reasons.push(`El display_name colisiona con término(s) existentes: ${existingTermCollisions.map((row) => `${row.term} [${row.slug}]`).join(", ")}`);
  } else if (!/^[a-z0-9-]+$/.test(proposedSlug)) {
    action = "blocked";
    reasons.push(`Slug propuesto inválido: ${proposedSlug}`);
  } else {
    action = "ready_to_create";
    reasons.push("Paquete approved, identidad calificada y sin colisiones en Glosario");
  }

  if (sharedAliases.length) {
    reasons.push(`Alias compartido; conservar nombre canónico calificado: ${sharedAliases.join(", ")}`);
  }

  entries.push({
    sourceSlug: item.sourceSlug,
    entityKey: doc.entity_key,
    group: doc.group,
    sourcePath: item.sourcePath,
    canonicalName: doc.canonical_name,
    sense: doc.sense ?? null,

    routing: {
      category:
        publicRouting.category,

      path:
        publicRouting.category
          ? `/glosario/${publicRouting.category}/${proposedSlug}/`
          : null,

      source:
        publicRouting.source
    },

    proposed: {
      id: proposedId,
      slug: proposedSlug,
      term: proposedTerm,
      definition: proposedDefinition,
      status: "Publicado básico",
    },
    action,
    sharedAliases,
    reasons,
  });
}

db.close();

const counts = entries.reduce((acc, entry) => {
  acc[entry.action] = (acc[entry.action] ?? 0) + 1;
  return acc;
}, {});

const plan = {
  schemaVersion: 1,
  sourceRoot: path.basename(sourceRoot),
  generatedFrom: {
    approvedPackages: packages.length,
    glossaryTerms: glossaryRows.length,
  },
  policy: {
    automaticPublication: false,
    preserveQualifiedCanonicalNames: true,
    sharedAliasesDoNotCollapseIdentity: true,
    sqliteMutation: false,
    automaticCanonicalRouting: true,
    failClosedOnUnmappedCategory: true,
  },
  counts: {
    existing: counts.existing ?? 0,
    ready_to_create: counts.ready_to_create ?? 0,
    blocked: counts.blocked ?? 0,
  },
  entries,
};

const desired = stableJson(plan);
if (options.check) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== desired) {
    console.error("BibliImg glossary plan: DRIFT");
    console.error("Ejecuta: npm run bibliimg:plan");
    process.exit(1);
  }
  console.log("BibliImg glossary plan: PASS");
} else {
  fs.writeFileSync(outputPath, desired, "utf8");
  console.log("BibliImg glossary plan: PASS");
}

console.log(`Fuente: ${sourceRoot}`);
console.log(`Approved escaneados: ${packages.length}`);
console.log(`Glosario actual: ${glossaryRows.length} términos`);
console.log(`Existentes: ${plan.counts.existing} · listos para crear: ${plan.counts.ready_to_create} · bloqueados: ${plan.counts.blocked}`);
const guarded = entries.filter((entry) => entry.sharedAliases.length);
const unrouted =
  entries.filter(
    (entry) =>
      !entry.routing.category
  );

console.log(
  `Sin categoria publica: ${unrouted.length}`
);

console.log(
  `Con alias compartidos protegidos: ${guarded.length}`
);
if (guarded.length) console.log(`  ${guarded.map((entry) => entry.sourceSlug).join(", ")}`);
console.log("SQLite editorial: sin modificaciones");
