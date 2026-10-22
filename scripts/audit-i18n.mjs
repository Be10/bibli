import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const problems = [];
const notices = [];

const pairs = [
  ['src/pages/index.astro', 'src/pages/en/index.astro', ['HomeStudyVisual']],
  ['src/pages/buscar/index.astro', 'src/pages/en/search/index.astro', ['data-utility-root', 'data-utility-kind="search"']],
  ['src/pages/descargar/index.astro', 'src/pages/en/download/index.astro', ['OfflinePackages']],
  ['src/pages/es/biblia/index.astro', 'src/pages/en/bible/index.astro', []],
  ['src/pages/es/biblia/[versionId]/index.astro', 'src/pages/en/bible/[versionId]/index.astro', []],
  ['src/pages/es/biblia/[versionId]/[bookCode]/index.astro', 'src/pages/en/bible/[versionId]/[bookCode]/index.astro', []],
  ['src/pages/es/biblia/[versionId]/[bookCode]/[chapter].astro', 'src/pages/en/bible/[versionId]/[bookCode]/[chapter].astro', ['ReaderPreferences']],
];

for (const [esRel, enRel, sharedTokens] of pairs) {
  const es = path.join(root, esRel);
  const en = path.join(root, enRel);
  if (!fs.existsSync(es)) problems.push(`falta ${esRel}`);
  if (!fs.existsSync(en)) problems.push(`falta ${enRel}`);
  if (!fs.existsSync(es) || !fs.existsSync(en)) continue;
  const esText = fs.readFileSync(es, 'utf8');
  const enText = fs.readFileSync(en, 'utf8');
  for (const token of sharedTokens) {
    if (!esText.includes(token)) problems.push(`${esRel}: falta contrato compartido ${token}`);
    if (!enText.includes(token)) problems.push(`${enRel}: falta contrato compartido ${token}`);
  }
}

const plannedCatalogs = ['libros','pasajes','personajes','lugares','temas','eventos','recursos','glosario','rutas','lecciones'];
for (const name of plannedCatalogs) {
  if (fs.existsSync(path.join(root, 'src/pages', name, 'index.astro')) && !fs.existsSync(path.join(root, 'src/pages/en', name, 'index.astro'))) {
    notices.push(`cobertura EN pendiente: ${name}`);
  }
}

if (notices.length) {
  console.log('Paridad ES/EN: cobertura informativa');
  for (const n of notices) console.log(`- ${n}`);
}
if (problems.length) {
  console.error('Paridad ES/EN: FAIL');
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}
console.log('Paridad ES/EN: PASS (shell y lector bíblico)');
