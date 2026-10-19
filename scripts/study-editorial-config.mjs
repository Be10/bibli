import fs from "node:fs";
import path from "node:path";

export const EDITORIAL_STRUCTURE_FILE = "editorial-structure.yaml";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function parseEditorialConfigText(text, fileLabel = EDITORIAL_STRUCTURE_FILE) {
  let config;
  try {
    // JSON is a strict subset of YAML 1.2. Keeping the canonical .yaml file in
    // JSON-compatible syntax avoids a runtime YAML dependency in the static build.
    config = JSON.parse(String(text).replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(
      `${fileLabel}: formato inválido. Usa YAML 1.2 compatible con JSON para conservar una lectura determinista sin dependencias externas (${error.message})`,
    );
  }
  validateEditorialConfig(config, fileLabel);
  return config;
}

export function loadEditorialConfig(rootDir = process.cwd()) {
  const filePath = path.join(rootDir, "content", EDITORIAL_STRUCTURE_FILE);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Falta content/${EDITORIAL_STRUCTURE_FILE}. Ejecuta npm run studies:sync.`);
  }
  return parseEditorialConfigText(fs.readFileSync(filePath, "utf8"), `content/${EDITORIAL_STRUCTURE_FILE}`);
}

export function compatibilityRoutesConfig(config) {
  return {
    schema_version: config.schema_version,
    routes: config.routes,
  };
}

export function sectionIdRequiredFromLesson(config, routeId) {
  const policy = config?.metadata_policy || {};
  const overrides = policy.section_id_required_from_lesson || {};
  const value = overrides[routeId] ?? policy.default_section_id_required_from_lesson ?? 1;
  return Number.isInteger(value) && value > 0 ? value : 1;
}

export function resolveEditorialModule(route, frontmatter) {
  const modules = route?.modules || [];
  const sectionId = frontmatter?.section_id;
  if (typeof sectionId === "string" && sectionId.trim()) {
    return modules.find((module) => module.id === sectionId.trim()) || null;
  }

  const lessonId = frontmatter?.lesson_id;
  const lessonNumber = frontmatter?.route_lesson_number;
  return modules.find((module) => {
    if (Array.isArray(module.lesson_ids) && module.lesson_ids.includes(lessonId)) return true;
    const range = module.lesson_number_range;
    return Array.isArray(range)
      && range.length === 2
      && Number.isInteger(lessonNumber)
      && lessonNumber >= range[0]
      && lessonNumber <= range[1];
  }) || null;
}

export function validateEditorialConfig(config, fileLabel = EDITORIAL_STRUCTURE_FILE) {
  assert(config && typeof config === "object" && !Array.isArray(config), `${fileLabel}: raíz inválida`);
  assert(typeof config.schema_version === "string" && config.schema_version.trim(), `${fileLabel}: falta schema_version`);
  assert(Array.isArray(config.routes) && config.routes.length > 0, `${fileLabel}: routes debe ser una lista no vacía`);

  const policy = config.metadata_policy || {};
  assert(
    policy.unresolved_lesson_policy === "fail",
    `${fileLabel}: metadata_policy.unresolved_lesson_policy debe ser "fail"`,
  );

  const routeIds = new Set();
  const routeSlugs = new Set();
  const globalModuleIds = new Set();

  for (const route of config.routes) {
    assert(route && typeof route === "object", `${fileLabel}: ruta inválida`);
    for (const key of ["id", "title", "slug"]) {
      assert(typeof route[key] === "string" && route[key].trim(), `${fileLabel}: ruta sin ${key}`);
    }
    assert(!routeIds.has(route.id), `${fileLabel}: route_id duplicado ${route.id}`);
    assert(!routeSlugs.has(route.slug), `${fileLabel}: route slug duplicado ${route.slug}`);
    routeIds.add(route.id);
    routeSlugs.add(route.slug);

    assert(Array.isArray(route.modules) && route.modules.length > 0, `${fileLabel}: ${route.id} no contiene módulos`);
    const positions = new Set();
    const slugs = new Set();
    const legacyRanges = [];

    for (const module of route.modules) {
      for (const key of ["id", "title", "slug"]) {
        assert(typeof module[key] === "string" && module[key].trim(), `${fileLabel}: módulo de ${route.id} sin ${key}`);
      }
      assert(Number.isInteger(module.position) && module.position > 0, `${fileLabel}: ${module.id} tiene position inválida`);
      assert(!globalModuleIds.has(module.id), `${fileLabel}: module_id duplicado ${module.id}`);
      assert(!positions.has(module.position), `${fileLabel}: posición de módulo duplicada en ${route.id}: ${module.position}`);
      assert(!slugs.has(module.slug), `${fileLabel}: slug de módulo duplicado en ${route.id}: ${module.slug}`);
      globalModuleIds.add(module.id);
      positions.add(module.position);
      slugs.add(module.slug);

      if (module.lesson_number_range !== undefined) {
        const range = module.lesson_number_range;
        assert(
          Array.isArray(range)
            && range.length === 2
            && Number.isInteger(range[0])
            && Number.isInteger(range[1])
            && range[0] > 0
            && range[1] >= range[0],
          `${fileLabel}: ${module.id} tiene lesson_number_range inválido`,
        );
        legacyRanges.push({ id: module.id, start: range[0], end: range[1] });
      }
    }

    legacyRanges.sort((a, b) => a.start - b.start);
    for (let index = 1; index < legacyRanges.length; index += 1) {
      const previous = legacyRanges[index - 1];
      const current = legacyRanges[index];
      assert(
        current.start > previous.end,
        `${fileLabel}: rangos heredados solapados en ${route.id}: ${previous.id} y ${current.id}`,
      );
    }

    const requiredFrom = sectionIdRequiredFromLesson(config, route.id);
    assert(Number.isInteger(requiredFrom) && requiredFrom > 0, `${fileLabel}: umbral section_id inválido para ${route.id}`);
  }

  return true;
}
