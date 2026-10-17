import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = ["dist", ".astro", "exports"];

for (const target of targets) {
  const fullPath = path.join(root, target);
  if (!fs.existsSync(fullPath)) continue;
  fs.rmSync(fullPath, { recursive: true, force: true });
  console.log(`Eliminado: ${target}`);
}

console.log("Limpieza de artefactos generados: PASS");
