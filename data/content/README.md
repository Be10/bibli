# Contenido editorial

Esta carpeta contiene archivos SQL modulares usados por el flujo actual de reconstrucción de la base.

## Estado de las 20 lecciones actuales

Los archivos `010-...sql` a `200-...sql` corresponden a la ruta histórica **Panorama Visual de la Biblia**. En Bibli deben considerarse **contenido legacy/test**, no la fuente editorial canónica de los nuevos estudios bíblicos.

No deben eliminarse todavía: `scripts/reset-db.mjs` los ejecuta y la aplicación actual consulta esas lecciones desde `data/enciclopedia.sqlite`. Se retirarán únicamente cuando exista un importador canónico de los Markdown de Estudio Bíblico y se haya verificado que ninguna ruta, consulta, seed o build depende de estos SQL.

## Convención actual

- `010-leccion-01-*.sql`
- `020-leccion-02-*.sql`
- `030-leccion-03-*.sql`
- …
- `200-leccion-20-*.sql`

Cada archivo puede:

- actualizar una lección existente;
- agregar puntos;
- agregar preguntas;
- conectar libros;
- conectar pasajes;
- conectar eventos;
- conectar temas;
- conectar personajes;
- conectar lugares;
- conectar glosario;
- conectar recursos visuales.

## Fuentes de verdad

- `data/schema.sql`: estructura relacional.
- `data/seed.sql`: datos base globales.
- `data/content/*.sql`: capa legacy/test de lecciones todavía requerida por el reset actual.
- Markdown canónico de Estudio Bíblico: futura fuente editorial para las nuevas lecciones, mediante un importador explícito y validado.
