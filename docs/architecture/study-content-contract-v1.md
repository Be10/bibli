# Contrato de contenido de estudios — Bibli v1

## Estado

**Versión:** 1.0.0  
**Propósito:** definir cómo Bibli recibe, valida y publica estudios bíblicos producidos por el flujo de Estudio Bíblico sin acoplar la aplicación al progreso personal ni a una plantilla rígida por género.

## 1. Corpus usado para diseñar el contrato

El contrato se diseñó contra dos conjuntos reales en SharePoint:

- **50 Lecciones oficiales canónicas de Génesis**, desde Génesis 1:1-2:3 hasta Génesis 33:1-20.
- **17 archivos de Modo Prueba**, que contienen **39 unidades de estudio**.

Las pruebas no son contenido publicable ni progreso oficial. Se usan únicamente como corpus de compatibilidad estructural y metodológica.

### Cobertura metodológica observada en las pruebas

| Prueba | Metodología principal esperable | Lentes/casos relevantes |
|---|---|---|
| Génesis 22 | Narrativa histórico-teológica | pacto, tipología sustentada |
| Éxodo 15 | Poesía/oración + narrativa por unidad | cántico, pacto |
| Levítico 16 | Ley y pacto | culto, expiación, tipología |
| Números 1 | Ley/pacto o narrativa contextual | censo/lista |
| Salmo 51 | Poesía y oración | lamento, confesión |
| Proverbios 8 | Sabiduría | personificación, desarrollo canónico prudente |
| Cantares 2 | Poesía | amor, imágenes poéticas |
| Isaías 6 | Profecía | visión/teofanía |
| Daniel 7 | Apocalíptica | profecía, visión simbólica |
| Mateo 1 | Evangelios | genealogía, narrativa de nacimiento |
| Mateo 13 | Evangelios | parábolas |
| Mateo 21 | Evangelios | entrada real, templo, acción simbólica, controversia, parábolas |
| Juan 2 | Evangelios | señal/milagro, templo, controversia |
| Hechos 2 | Narrativa histórico-apostólica | discurso apostólico, cita del AT, práctica narrada |
| Romanos 8 | Epístolas/discurso argumentativo | argumento doctrinal y exhortativo |
| Hebreos 9 | Epístolas/discurso argumentativo | culto, pacto, tipología, uso del AT |
| Apocalipsis 12 | Apocalíptica | profecía, simbolismo, conflicto escatológico |

## 2. Fuentes de verdad

### 2.1 Fuente editorial canónica

Los Markdown oficiales archivados bajo `Estudios Biblicos/...` en SharePoint son la fuente editorial canónica del estudio.

### 2.2 Bitácora

`Estudios Biblicos/Sistema/Bitacora-Estudio-Biblico.txt` es fuente de verdad para **progreso personal, cobertura estudiada, continuidad y estado de artefactos**.

La Bitácora **no** debe ser una dependencia del build público de Bibli ni la fuente del cuerpo editorial de una Lección.

Esto evita publicar o mezclar datos personales de progreso con contenido editorial.

### 2.3 Snapshot de publicación en el repositorio

Como GitHub Actions no puede depender del SharePoint corporativo, Bibli mantendrá un snapshot versionado de los Markdown oficiales aprobado para publicación.

Ruta propuesta:

```text
content/studies/
```

El snapshot es una copia de publicación reproducible; no reemplaza al Markdown canónico de SharePoint.

`Estudios Biblicos/Pruebas` nunca se sincroniza hacia `content/studies/`.

## 3. Tipos de artefacto

### Importable

```yaml
artifact_type: bible_study_lesson
mode: official
```

### No importable

```yaml
artifact_type: bible_study_test
mode: test
```

Todo artefacto `test` debe ser rechazado explícitamente por el importador de producción, incluso si se copiara por error al snapshot.

## 4. Frontmatter oficial v1

Los Markdown canónicos oficiales comparten estos campos base:

```yaml
artifact_type: bible_study_lesson
content_type: lesson
mode: official
route_id: pentateuco-principal
route_name: De la Creacion al Pacto
route_lesson_number: 1
book_id: genesis
book_name: Genesis
primary_reference: Genesis 1:1-2:3
coverage:
  - Genesis 1:1-31
  - Genesis 2:1-3
translation: RVR1960
lesson_id: pentateuco-principal--genesis--01-01-02-03--l001
content_version: '1.0.0'
```

Para `lesson` y `synthesis_lesson` estos campos son obligatorios en v1, salvo los que el perfil de contenido declare expresamente no aplicables.

### Identidad estable

- `lesson_id` es la identidad estable de una Lección.
- `route_lesson_number` es orden visible dentro de la ruta, no identidad primaria.
- El título visible se obtiene del primer `# H1` del cuerpo, no de la Bitácora.
- `content_version` versiona el contenido editorial con SemVer estricto `MAJOR.MINOR.PATCH`.
- El nombre físico debe terminar en `-v<content_version>.md`; por ejemplo, `pentateuco-leccion-248-levitico-19-29-a-37-v1.0.1.md`.
- Varias revisiones del mismo `lesson_id` pueden coexistir en SharePoint. El snapshot publicable conserva solo la revisión de SemVer más alta.
- El sufijo `-vX.Y.Z` nunca forma parte del slug público, de modo que actualizar contenido no cambia la URL estable de la Lección.

## 5. Tipos de contenido preparados

Bibli debe reconocer desde el diseño estos valores definidos por Estudio Bíblico:

```text
lesson
synthesis_lesson
book_intro
section_intro
book_synthesis
route_synthesis
```

La primera implementación importará `lesson`. Los demás tipos deben ser rechazados como `unsupported_content_type` mientras no exista un perfil específico, no tratados como archivos corruptos.

## 6. Contrato del cuerpo Markdown

### 6.1 Regla principal

Bibli conserva el **cuerpo Markdown completo**. No intenta reconstruir el estudio a partir de columnas como `main_idea`, `explanation`, `remember` o `lesson_points`.

La estructura literaria y metodológica debe seguir viviendo en el documento.

### 6.2 Estructura mínima de una Lección ordinaria

1. Un único título principal `# ...`.
2. Una línea `**📖 Lectura:** ...`.
3. `## 🧭 Dónde estamos`.
4. Desarrollo libre mediante subtítulos temáticos naturales.
5. `## 📝 Resumen`.
6. `## 🙏 Oración` como cierre editorial.

### 6.3 Secciones reservadas

Bibli reconoce estas secciones por su encabezado exacto cuando aparezcan:

```text
🧭 Dónde estamos
🕊️ Qué revela acerca de Dios
🪞 Qué revela acerca de nosotros
✝️ Encontrando a Jesús
🧵 Hilo Invisible
🎯 Aplicación
💭 Para meditar
📝 Resumen
🙏 Oración
```

`Resumen` y `Oración` son obligatorios para una Lección ordinaria.

`Hilo Invisible` es **condicional**. El corpus de prueba contiene una unidad válida sin esta sección, por lo que Bibli no debe exigirla.

Las demás secciones editoriales deben seguir la semántica definida por Estudio Bíblico y no utilizarse para forzar contenido vacío.

### 6.4 Subtítulos temáticos

Los subtítulos expositivos no forman parte de un esquema fijo.

En el corpus real aparecen como `##` y como `###` según el tipo de artefacto y la organización del estudio. Bibli debe conservarlos, no convertirlos automáticamente a `lesson_points`.

## 7. Archivos con varias unidades

Los 17 archivos de prueba contienen 39 unidades; un solo Markdown de prueba puede contener varias cabeceras `#` y varios ciclos `Resumen → Oración`.

Esto demuestra que el parser general debe poder identificar unidades internas para QA, pero el importador de producción v1 exige:

```text
1 archivo oficial = 1 Lección oficial
```

Si un artefacto oficial `content_type: lesson` contiene más de un H1 principal, `studies:validate` debe fallar.

Las futuras piezas de síntesis tendrán su propio perfil.

## 8. Referencias y cobertura

`primary_reference` es la referencia editorial principal.

`coverage` es una lista ordenada y explícita de los rangos realmente cubiertos.

No reducir `coverage` a un único `start/end`: las Lecciones reales pueden cruzar capítulos y usar varios rangos.

Ejemplos reales incluyen:

```text
Genesis 1:1-2:3
Genesis 8:20-9:17
Genesis 26:34-27:45
Genesis 27:46-28:9
Genesis 29:31-30:24
```

Una síntesis futura podrá cubrir más de un libro; una Lección exegética ordinaria no debe hacerlo salvo contrato explícito.

## 9. Normalización hacia Bibli

### 9.1 Libro

El `book_id` del artefacto pertenece al dominio de Estudio Bíblico (`genesis`, `mateo`, etc.). Bibli conserva sus IDs canónicos propios (`book-genesis`, etc.).

El importador usa una tabla/mapeo explícito y validado; no crea nuevos libros silenciosamente.

### 9.2 Traducción

`translation: RVR1960` se resuelve contra `bible_versions` y se normaliza a `version_id = rvr1960`.

No inferir el idioma únicamente desde el texto del estudio; se deriva de la versión bíblica configurada.

### 9.3 Título

Fuente: primer `# H1` del Markdown.

No usar como fuente editorial el título guardado en la Bitácora. En el corpus actual existen diferencias ortográficas de acentos entre algunos títulos históricos de la Bitácora y el H1 del Markdown, mientras identidad, referencia y cobertura sí coinciden.

### 9.4 Secciones derivables

Bibli puede extraer para vistas auxiliares, sin reemplazar el documento completo:

- resumen;
- aplicación;
- preguntas para meditar;
- oración;
- sección cristológica;
- Hilo Invisible.

La extracción debe conservar Markdown interno.

## 10. Datos que no deben inferirse automáticamente de la prosa

No crear automáticamente relaciones estructuradas de:

- personas;
- lugares;
- temas;
- eventos;
- glosario;
- Hilos Invisibles con IDs;
- tipologías;
- referencias cruzadas canónicas;

solo porque una palabra o referencia aparezca en el texto.

Estas relaciones requieren metadata explícita o revisión editorial posterior.

## 11. Metadata futura compatible

El contrato admite como campos opcionales futuros, cuando Estudio Bíblico los exponga explícitamente:

```text
language
genre_primary
genre_secondary
subgenres
method_primary
method_auxiliary
active_lenses
section_id
section_name
parent_unit_id
parent_unit_name
themes
key_verses
cross_references
gospel_parallels
named_people
places
publication_status
```

Para contenido histórico se permite compatibilidad por rango según `metadata_policy`. Para Lecciones nuevas, `section_id` pasa a ser obligatorio desde el umbral definido por ruta en `Estructura-Editorial.yaml` (en `pentateuco-principal`, desde la Lección 201).

No inferir `section_id` desde la prosa ni desde el número de capítulo. Debe venir de decisión editorial explícita; el importador solo usa rangos para el legado anterior al umbral.

## 12. Modelo de persistencia implementado en Bibli

El cuerpo completo permanece en Markdown. SQLite conserva únicamente identidad, navegación, proyecciones derivadas y relaciones editoriales.

### `study_lessons`

```text
id
title
slug
book_id
primary_reference
translation
content_version
source_path
estimated_minutes
search_text
status
```

No contiene `main_idea`, `explanation`, `remember`, `application` ni el cuerpo completo.

### `route_modules`

Agrupa pedagógicamente las Lecciones de una Ruta. El módulo pertenece a la experiencia de aprendizaje, no a la identidad canónica de la Lección.

### `route_lessons`

Relación N:M entre rutas y Lecciones:

```text
route_id
module_id
lesson_id
position
is_primary
```

Esto permite reutilizar una Lección en varias rutas sin duplicar Markdown.

### `lesson_passages` y relaciones editoriales

La referencia principal se proyecta a `passages`/`lesson_passages`. Las relaciones con temas, eventos, personas, lugares, glosario y recursos visuales se mantienen en las tablas `lesson_*`, pero deben llegar desde metadata explícita o `content/study-enrichments.json`.

### Compatibilidad temporal

Existe una vista SQL `lessons` para que páginas históricas de entidades puedan seguir resolviendo relaciones mientras se completa su migración. No es fuente de contenido.

Las tablas antiguas `lesson_bible_refs`, `lesson_points` y `lesson_questions` fueron retiradas.

## 13. Snapshot y sincronización

Flujo local implementado:

```text
SharePoint / OneDrive
Estudios Biblicos/**.md
Estudios Biblicos/Sistema/Estructura-Editorial.yaml
        ↓
npm run studies:sync
        ↓
content/studies/**.md + manifest.json
content/editorial-structure.yaml + content/routes.json (derivado)
        ↓
npm run studies:validate
        ↓
npm run studies:import
        ↓
SQLite (índice derivado)
        ↓
npm run build
```

`studies:sync`:

1. lee la raíz local sincronizada de `Estudios Biblicos`;
2. exige y valida `Sistema/Estructura-Editorial.yaml`;
3. excluye `Sistema` y `Pruebas` del snapshot de Lecciones;
4. acepta solo `artifact_type: bible_study_lesson` + `mode: official`;
5. exige `content_version` SemVer y un nombre físico terminado en `-v<content_version>.md`;
6. agrupa revisiones por `lesson_id`, rechaza una versión duplicada dentro del mismo `lesson_id` y selecciona la revisión SemVer más alta;
7. copia de forma determinista solo las revisiones vigentes;
8. copia la estructura a `content/editorial-structure.yaml` y regenera `content/routes.json` como compatibilidad;
9. genera hashes SHA-256 y `manifest.json`, incluyendo `section_id`, `available_versions`, conteo de archivos fuente y revisiones históricas omitidas;
10. elimina del snapshot solo archivos obsoletos dentro de la carpeta que administra;
11. no modifica la fuente de SharePoint.

## 14. `studies:validate` — compuerta obligatoria

El validador comprueba, entre otros:

- snapshot no vacío;
- ningún artefacto `test`;
- ausencia de `Pruebas`/`Sistema`;
- frontmatter obligatorio;
- `content_version` SemVer válido;
- nombre físico `-v<content_version>.md` coherente con el frontmatter;
- `lesson_id` único en el snapshot vigente;
- `(route_id, route_lesson_number)` único;
- ruta y módulo resolubles contra `content/editorial-structure.yaml`;
- `section_id` obligatorio desde el umbral editorial configurado;
- ningún módulo provisional generado automáticamente;
- libro y traducción resolubles contra Bibli;
- `coverage` no vacía;
- un único H1;
- línea `📖 Lectura`;
- `Dónde estamos`;
- un único `Resumen`;
- una única `Oración`;
- orden `Resumen → Oración`;
- ausencia de secciones operativas;
- hashes coincidentes con el manifiesto.

Las referencias se comparan de forma canónica: diferencias tipográficas como `Génesis`/`Genesis` o `–`/`-` no producen falsos errores.

## 15. Enriquecimiento de la experiencia

Bibli puede mostrar Glosario, Personajes, Lugares, mapas, Temas, Eventos y Recursos visuales junto a una Lección.

Estas relaciones **no se infieren automáticamente de coincidencias en la prosa**. Se aprueban explícitamente en:

```text
content/study-enrichments.json
```

o mediante metadata explícita futura, por ejemplo marcadores `[[glossary:...]]`.

El cuerpo del estudio permanece válido aunque una Lección todavía no tenga ayudas adicionales.

## 16. Regla de seguridad de producción

El importador nunca lee `Estudios Biblicos/Pruebas` como fuente publicable. Un archivo con:

```yaml
artifact_type: bible_study_test
mode: test
```

debe provocar un error antes del build.

## 17. Estado de implementación v1

Implementado:

1. contrato de contenido;
2. `studies:sync`;
3. `studies:validate`;
4. snapshot de las Lecciones oficiales vigentes;
5. modelo `study_lessons` + módulos + relación N:M de rutas;
6. importador idempotente Markdown → SQLite;
7. Astro Content Collection para renderizar el Markdown canónico;
8. página de Lección con modo Estudio/Lectura;
9. progreso local real;
10. ayudas editoriales ocultables y mapa contextual;
11. rutas agrupadas por módulos;
12. búsqueda basada en el contenido canónico;
13. retiro de las 20 Lecciones SQL legacy y del esquema rígido anterior.

## 18. Principio final

**Markdown conserva el estudio; SQLite conserva identidad, navegación, relaciones aprobadas y proyecciones derivadas.**

Bibli no reduce una Lección rica a una plantilla rígida ni convierte la Bitácora de progreso en contenido editorial. La experiencia de aprendizaje se construye alrededor del contenido canónico, no en sustitución de él.
