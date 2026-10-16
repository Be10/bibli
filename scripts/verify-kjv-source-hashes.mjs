import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const sourceRoot = path.join(
  process.cwd(),
  "data",
  "import",
  "kjv-source"
);

const sumsPath = path.join(
  sourceRoot,
  "SHA512SUMS"
);

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(sumsPath)) {
  fail("No existe data/import/kjv-source/SHA512SUMS.");
}

const lines = fs
  .readFileSync(sumsPath, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

console.log("");
console.log("========================================");
console.log(" Verificación SHA-512 fuente KJV");
console.log("========================================");
console.log("");

let checked = 0;
let mismatches = 0;
let missing = 0;

for (const line of lines) {
  const match = line.match(/^([0-9a-fA-F]{128})\s+\*?(.+)$/);

  if (!match) {
    console.log(`⚠ Línea no reconocida: ${line}`);
    continue;
  }

  const [, expectedHash, relativePath] = match;

  const filePath = path.join(
    sourceRoot,
    relativePath
  );

  if (!fs.existsSync(filePath)) {
    console.error(
      `❌ Falta archivo: ${relativePath}`
    );
    missing += 1;
    continue;
  }

  const data = fs.readFileSync(filePath);

  const actualHash = crypto
    .createHash("sha512")
    .update(data)
    .digest("hex");

  checked += 1;

  if (
    actualHash.toLowerCase() !==
    expectedHash.toLowerCase()
  ) {
    console.error(
      `❌ Hash incorrecto: ${relativePath}`
    );
    mismatches += 1;
  }
}

console.log(`Archivos comprobados: ${checked}`);
console.log(`Archivos faltantes:   ${missing}`);
console.log(`Hashes incorrectos:   ${mismatches}`);
console.log("");

if (missing > 0 || mismatches > 0) {
  console.error(
    "❌ RESULTADO: la fuente no coincide con SHA512SUMS."
  );
  process.exit(1);
}

console.log(
  "✓ RESULTADO: todos los hashes comprobados son correctos."
);
console.log("");