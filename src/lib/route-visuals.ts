import visualConfig from "../../content/learning/route-visuals.json";

type ThemeTone = {
  accent: string;
  soft: string;
  subtle: string;
};

type Palette = {
  light: ThemeTone;
  dark: ThemeTone;
};

type RouteVisualEntry = {
  palette: string;
  module_palette?: string[];
};

type VisualConfig = {
  schema_version: string;
  fallback_palette: string;
  palettes: Record<string, Palette>;
  routes: Record<string, RouteVisualEntry>;
};

const config = visualConfig as VisualConfig;

export const ROUTE_VISUAL_SCHEMA_VERSION = config.schema_version;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function paletteByKey(key: string | undefined): Palette {
  return config.palettes[key ?? ""] ?? config.palettes[config.fallback_palette];
}

function routeEntry(routeId: string | null | undefined): RouteVisualEntry | undefined {
  return routeId ? config.routes[routeId] : undefined;
}

export function getRouteVisualPaletteKey(routeId: string | null | undefined): string {
  const requested = routeEntry(routeId)?.palette;
  return requested && config.palettes[requested] ? requested : config.fallback_palette;
}

export function getModuleVisualPaletteKey(
  routeId: string | null | undefined,
  moduleId: string | null | undefined,
): string {
  if (!moduleId) return config.fallback_palette;
  const candidates = routeEntry(routeId)?.module_palette?.filter((key) => Boolean(config.palettes[key])) ?? [];
  if (candidates.length === 0) return getRouteVisualPaletteKey(routeId);
  return candidates[stableHash(moduleId) % candidates.length];
}

function variables(prefix: "route" | "module", palette: Palette): string {
  return [
    `--${prefix}-accent-light:${palette.light.accent}`,
    `--${prefix}-soft-light:${palette.light.soft}`,
    `--${prefix}-subtle-light:${palette.light.subtle}`,
    `--${prefix}-accent-dark:${palette.dark.accent}`,
    `--${prefix}-soft-dark:${palette.dark.soft}`,
    `--${prefix}-subtle-dark:${palette.dark.subtle}`,
  ].join(";");
}

export function getRouteVisualStyle(routeId: string | null | undefined): string {
  return variables("route", paletteByKey(getRouteVisualPaletteKey(routeId)));
}

export function getModuleVisualStyle(
  routeId: string | null | undefined,
  moduleId: string | null | undefined,
): string {
  return variables("module", paletteByKey(getModuleVisualPaletteKey(routeId, moduleId)));
}

export function getRouteModuleVisualStyle(
  routeId: string | null | undefined,
  moduleId: string | null | undefined,
): string {
  return `${getRouteVisualStyle(routeId)};${getModuleVisualStyle(routeId, moduleId)}`;
}
