import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "content", "learning", "route-visuals.json");
const config = JSON.parse(fs.readFileSync(file, "utf8"));
const errors = [];

const requiredSchema = "1.0.0";
if (config.schema_version !== requiredSchema) errors.push(`schema_version debe ser ${requiredSchema}`);
if (!config.palettes || typeof config.palettes !== "object") errors.push("palettes es obligatorio");
if (!config.routes || typeof config.routes !== "object") errors.push("routes es obligatorio");
if (!config.palettes?.[config.fallback_palette]) errors.push("fallback_palette debe existir en palettes");

const hex = /^#[0-9A-F]{6}$/i;
function luminance(color) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

for (const [key, palette] of Object.entries(config.palettes ?? {})) {
  for (const theme of ["light", "dark"]) {
    const tone = palette?.[theme];
    for (const field of ["accent", "soft", "subtle"]) {
      if (!hex.test(tone?.[field] ?? "")) errors.push(`${key}.${theme}.${field} debe ser HEX de 6 dígitos`);
    }
  }
  if (hex.test(palette?.light?.accent ?? "") && contrast(palette.light.accent, "#F7F8FA") < 4.5) {
    errors.push(`${key}.light.accent no alcanza contraste 4.5:1 sobre fondo claro`);
  }
  if (hex.test(palette?.dark?.accent ?? "") && contrast(palette.dark.accent, "#0F1115") < 4.5) {
    errors.push(`${key}.dark.accent no alcanza contraste 4.5:1 sobre fondo oscuro`);
  }
}

for (const [routeId, route] of Object.entries(config.routes ?? {})) {
  if (!config.palettes?.[route.palette]) errors.push(`${routeId}.palette referencia una paleta inexistente`);
  if (!Array.isArray(route.module_palette) || route.module_palette.length === 0) {
    errors.push(`${routeId}.module_palette debe contener al menos una paleta`);
    continue;
  }
  const unique = new Set(route.module_palette);
  if (unique.size !== route.module_palette.length) errors.push(`${routeId}.module_palette contiene duplicados`);
  for (const key of route.module_palette) {
    if (!config.palettes?.[key]) errors.push(`${routeId}.module_palette referencia ${key}, que no existe`);
  }
}

if (errors.length) {
  console.error("Validación de identidad visual: FAIL");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Validación de identidad visual: PASS");
console.log(`Schema: ${config.schema_version}`);
console.log(`Paletas controladas: ${Object.keys(config.palettes).length}`);
console.log(`Rutas configuradas: ${Object.keys(config.routes).length}`);
console.log("Contraste mínimo de acentos: PASS (>= 4.5:1)");
