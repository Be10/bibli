# Bibli — reglas de desarrollo

## Proyecto

Bibli es una Biblioteca Bíblica digital construida con:

* Astro
* TypeScript
* SQLite
* better-sqlite3

La publicación pública es estática mediante GitHub Pages.

## Antes de realizar cambios

Revisar siempre:

```text
data/schema.sql
data/seed.sql
data/content/*.sql
```

No inventar nombres de columnas, IDs, relaciones ni rutas.

## Estructura editorial

La arquitectura editorial es modular:

```text
data/schema.sql
data/seed.sql
data/content/*.sql
```

No centralizar contenido específico de lecciones dentro de `seed.sql`.

## Lecciones

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

No utilizar `sort_order`.

La tabla `lessons` incluye campos como:

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

## Biblia

Las versiones bíblicas se identifican mediante `bible_versions` y `bible_verses.version_id`.

Versiones actualmente cargadas:

```text
rvr1960
kjv
```

No crear versículos artificiales para compensar diferencias de versificación entre versiones.

La KJV tiene dos posiciones legítimamente ausentes respecto a RVR1960:

```text
Salmos 47:10
3 Juan 1:15
```

La fuente KJV actual es:

```text
data/import/kjv-study/json/verses-1769.json
```

## RVR1960

El archivo local:

```text
data/import/rvr1960.csv
```

no debe incluirse en Git ni en ZIP u otros archivos compartidos.

## Validación

Antes de guardar cambios importantes:

```bash
npm run repo:validate
npm run db:validate
npm run build
git status
git diff --check
```

No tratar `node_modules/`, `dist/`, `.astro/` ni snapshots ZIP como código fuente. No borrar `.git/`, `data/enciclopedia.sqlite` ni fuentes privadas de importación necesarias para reconstrucciones locales.

Para cambios relacionados con KJV:

```bash
npm run bible:validate:kjv
npm run bible:audit:kjv
npm run bible:audit:kjv:spacing
```

## Continuidad y legado

Las 20 lecciones SQL de `data/content/` pertenecen a la ruta histórica Panorama Visual y se consideran `legacy/test`, pero siguen siendo una dependencia técnica de `db:reset`. No eliminarlas hasta que el importador de Markdown canónico esté implementado y validado.

La interfaz usa `Bibli` como marca corta, `BIBLIOTECA BÍBLICA` en español y `BIBLICAL LIBRARY` en inglés. Las preferencias de dispositivo usan claves `bibli-*`; solo se mantienen claves `ebv-*` cuando sean necesarias para migración retrocompatible.
