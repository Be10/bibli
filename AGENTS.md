# Bibli — reglas de desarrollo

## Fuentes de verdad

Bibli usa Astro + TypeScript + SQLite + `better-sqlite3` y se publica estáticamente.

Para lecciones:

```text
Estudios Biblicos/**.md (SharePoint) = fuente editorial canónica
content/studies/**/*.md             = snapshot publicable del repositorio
Markdown                            = cuerpo completo de la lección
data/bibli.sqlite                   = índice/navegación/relaciones para build
```

Nunca reconstruir el estudio desde columnas rígidas de SQLite.

## Antes de modificar aprendizaje o datos

Revisar:

```text
data/schema.sql
data/seed.sql
data/editorial.sql
content/routes.json
content/study-enrichments.json
content/studies/manifest.json
docs/architecture/study-content-contract-v1.md
docs/architecture/learning-architecture-v1.md
```

No inventar IDs, tablas, slugs, rutas ni relaciones.

## Modelo de aprendizaje

- `study_lessons`: identidad y metadatos derivados del Markdown.
- `route_modules`: agrupaciones pedagógicas.
- `route_lessons`: relación N:M entre rutas y lecciones; una Lección puede reutilizarse sin duplicarse.
- `lessons`: vista de compatibilidad para módulos históricos todavía no migrados.
- `lesson_*`: relaciones aprobadas con entidades editoriales.

No reintroducir `lesson_bible_refs`, `lesson_points` ni `lesson_questions`.

No usar posición en una ruta como progreso del usuario. El progreso es estado personal independiente.

## Enriquecimiento editorial

No inferir automáticamente personas, lugares, temas, eventos, glosario, tipologías ni recursos visuales simplemente porque una palabra aparezca en la prosa.

Las relaciones deben venir de:

```text
content/study-enrichments.json
```

o de metadata explícita futura (`[[glossary:...]]`, `places`, etc.) aprobada editorialmente.

## UX de Lección

Preservar:

- modo `Estudio` y modo `Lectura bíblica`;
- navegación anterior/siguiente;
- módulos y rutas;
- progreso real por dispositivo;
- ayudas de estudio ocultables;
- experiencia responsive/mobile-first;
- HTML estático como base y JavaScript solo donde aporta interacción.

No convertir cada párrafo en un componente ni sobrecargar la lección con elementos visuales abiertos por defecto.

## Biblia

Versiones actuales:

```text
rvr1960
kjv
```

KJV canónica:

```text
data/import/kjv-study/json/verses-1769.json
```

RVR1960 local:

```text
data/import/rvr1960.csv
```

No distribuir ni versionar el CSV RVR1960. No crear versículos artificiales para compensar diferencias de versificación.

## Limpieza

Nunca tratar como fuente:

```text
node_modules/
dist/
.astro/
exports/
data/content/
data/import/kjv-source/
```

Las dos últimas rutas corresponden a legado/redundancia ya retirados y no deben reaparecer.

No borrar `.git/`, `.github/`, `data/bibli.sqlite`, `data/import/kjv-study/` ni fuentes locales privadas necesarias para reconstrucción.

## Validación

Antes de guardar cambios importantes:

```bash
npm run build
git status
git diff --check
```

Para cambios solo de estudios puede usarse:

```bash
npm run studies:refresh
npm run db:validate
```

Para reconstruir desde cero:

```bash
npm run db:reset
npm run bible:import:rvr1960
npm run bible:validate:kjv
npm run bible:import:kjv
npm run bible:audit:kjv
npm run bible:audit:kjv:spacing
npm run db:validate
npm run build
```
