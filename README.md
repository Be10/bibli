# Bibli — Biblioteca Bíblica

Bibli es una Biblioteca Bíblica digital construida con Astro, SQLite, better-sqlite3 y TypeScript.

El proyecto combina contenido editorial estructurado, estudio bíblico, navegación por libros y pasajes, lecciones, personajes, lugares, eventos, temas, recursos visuales, mapas y búsqueda.

## Stack

* Astro
* TypeScript
* SQLite
* better-sqlite3
* Leaflet
* MapLibre GL
* GitHub Pages

## Desarrollo

Instalar dependencias:

```bash
npm ci
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Generar la versión de producción:

```bash
npm run build
```

Previsualizar la compilación:

```bash
npm run preview
```

## Estructura editorial

La estructura principal de datos se divide en:

```text
data/schema.sql
data/seed.sql
data/content/*.sql
```

* `schema.sql`: estructura de la base de datos.
* `seed.sql`: datos base globales.
* `data/content/*.sql`: contenido editorial específico de las lecciones.

La base generada se encuentra en:

```text
data/bibli.sqlite
```

## Reconstrucción de la base

```bash
npm run db:reset
```

Este comando reconstruye SQLite desde `schema.sql`, `seed.sql` y los archivos de `data/content`.

Después de un reset deben volver a importarse los textos bíblicos.

## Versiones bíblicas

Actualmente Bibli contiene:

* RVR1960 — español
* KJV 1769 — inglés

### RVR1960

La fuente local se encuentra en:

```text
data/import/rvr1960.csv
```

Este archivo no debe incluirse en Git ni en archivos compartidos.

Importación:

```bash
npm run bible:import:rvr1960
```

### KJV 1769

La fuente utilizada por Bibli es:

```text
data/import/kjv-study/json/verses-1769.json
```

Validación:

```bash
npm run bible:validate:kjv
```

Importación:

```bash
npm run bible:import:kjv
```

Auditorías:

```bash
npm run bible:audit:kjv
npm run bible:audit:kjv:spacing
```

La KJV contiene 31.102 versículos.

Las diferencias legítimas de versificación respecto a RVR1960 son:

* Salmos 47:10
* 3 Juan 1:15

No deben crearse versículos KJV artificiales para esas posiciones.

## Convenciones editoriales importantes

Las tablas:

```text
lesson_bible_refs
lesson_points
lesson_questions
```

utilizan:

```text
position
```

para determinar el orden.

La tabla `lessons` incluye, entre otros:

```text
eyebrow
main_idea
summary
explanation
remember
application
estimated_time
status
```

No deben inventarse IDs, columnas ni relaciones sin verificar previamente `schema.sql`, `seed.sql` y `data/content`.

## Despliegue

El proyecto se publica de forma estática mediante GitHub Actions y GitHub Pages.

Workflow:

```text
.github/workflows/deploy.yml
```

## Validación

Antes de guardar cambios:

```bash
npm run repo:validate
npm run db:validate
npm run build
git status
git diff --check
```

`repo:validate` impide versionar dependencias, artefactos generados, archivos privados de RVR1960 y snapshots ZIP obsoletos. `db:validate` verifica integridad, conteos, esquema editorial y sincronía entre SQL y `data/bibli.sqlite`.

## Idiomas y preferencias

Bibli utiliza una sola app con rutas `/es/` y `/en/`. El lector bíblico conserva entidades canónicas y códigos USFM, mientras la interfaz se localiza por idioma.

Preferencias locales:

- `bibli-theme`: `auto`, `light` o `dark`;
- `bibli-language`: última selección explícita ES/EN.

La preferencia de idioma no provoca redirecciones automáticas hacia secciones que todavía no tengan equivalente traducido.

## Despliegue seguro

El workflow de GitHub Pages ejecuta, en este orden:

```text
npm ci
→ npm run repo:validate
→ npm run db:validate
→ npm run build
→ deploy
```
