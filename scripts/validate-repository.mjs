import fs from "node:fs";
import { execFileSync } from "node:child_process";

const tracked = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);

const forbiddenRules = [
  {
    label: "dependencias instaladas",
    match: (file) => file.startsWith("node_modules/"),
  },
  {
    label: "build generado",
    match: (file) => file.startsWith("dist/"),
  },
  {
    label: "cache/tipos generados de Astro",
    match: (file) => file.startsWith(".astro/"),
  },
  {
    label: "fuente privada RVR1960",
    match: (file) => file === "data/import/rvr1960.csv",
  },
  {
    label: "variables de entorno",
    match: (file) => file === ".env" || file.startsWith(".env."),
  },
  {
    label: "snapshot ZIP legado",
    match: (file) => file === "enciclopedia-biblica-visual.zip",
  },
];

const problems = [];

for (const rule of forbiddenRules) {
  const matches = tracked.filter(rule.match);

  if (matches.length > 0) {
    problems.push(`${rule.label}: ${matches.join(", ")}`);
  }
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

if (packageJson.name !== "bibli") {
  problems.push(`package.json.name debe ser \"bibli\" y actualmente es ${JSON.stringify(packageJson.name)}`);
}

if (problems.length > 0) {
  console.error("Validación del repositorio: FAIL");

  for (const problem of problems) {
    console.error(`- ${problem}`);
  }

  process.exit(1);
}

console.log("Validación del repositorio: PASS");
console.log(`Archivos versionados revisados: ${tracked.length}`);
