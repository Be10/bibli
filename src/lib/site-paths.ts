type AstroImportMeta = ImportMeta & {
  env?: {
    BASE_URL?: string;
  };
};

export function sitePath(path: string): string {
  const base = (import.meta as AstroImportMeta).env?.BASE_URL ?? "/";

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return `${base.replace(/\/$/, "")}${path}`;
}
