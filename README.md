# Bibli — Biblioteca Bíblica

Bibli es una plataforma bíblica web construida con Astro, TypeScript, SQLite y `better-sqlite3`. Su objetivo es ofrecer lectura bíblica, rutas de aprendizaje, lecciones canónicas, búsqueda, glosario, personajes, lugares, eventos, mapas y recursos visuales sin convertir el estudio en una página plana de texto.

### Estructura editorial de estudios

La fuente canónica de rutas y módulos vive en `Estudios Biblicos/Sistema/Estructura-Editorial.yaml`. `npm run studies:sync` la copia a `content/editorial-structure.yaml` y regenera `content/routes.json` para compatibilidad. Desde la Lección 201 de `pentateuco-principal`, cada Markdown oficial debe incluir `section_id`; una lección sin sección válida bloquea `studies:validate` y el build en lugar de publicarse en un módulo provisional.


## Arquitectura actual

### Fuente canónica de las lecciones

Las lecciones oficiales viven editorialmente en SharePoint (`Estudios Biblicos/**.md`). Cada archivo oficial usa un nombre versionado con el mismo SemVer de su `content_version`, por ejemplo `pentateuco-leccion-248-levitico-19-29-a-37-v1.0.1.md`. Varias revisiones de un mismo `lesson_id` pueden coexistir en la fuente canónica; `studies:sync` publica únicamente la revisión con el `content_version` más alto.

El repositorio contiene un snapshot publicable y reproducible en:

```text
content/studies/
```

Flujo:

```text
Estudios Biblicos (SharePoint / OneDrive)
        ↓ npm run studies:sync
content/studies/**/*.md
        ↓ npm run studies:validate
        ↓ npm run studies:import
SQLite: identidad, rutas, módulos, relaciones y búsqueda
        ↓
Astro Content Collections: cuerpo Markdown completo
        ↓
HTML estático + interactividad puntual
```

`Estudios Biblicos/Pruebas` y `Sistema` nunca se publican.

### Modelo de aprendizaje

```text
Lección canónica
      ↕ route_lessons
Módulo
      ↕
Ruta
```

- Una Lección existe una sola vez (`study_lessons`).
- Una Lección puede participar en varias rutas mediante `route_lessons`.
- `route_modules` agrupa pedagógicamente las lecciones.
- El Markdown conserva el estudio completo.
- SQLite conserva identidad, navegación, relaciones editoriales e índices derivados.
- El progreso personal no forma parte del contenido editorial; por ahora se guarda en `localStorage` y más adelante podrá sincronizarse mediante D1.

### Datos editoriales

```text
data/schema.sql       # esquema relacional
data/seed.sql         # libros, traducciones y versiones bíblicas
data/editorial.sql    # temas, eventos, personas, lugares, glosario y recursos
content/editorial-structure.yaml # snapshot canónico de rutas/módulos
content/routes.json              # snapshot derivado de compatibilidad
content/study-enrichments.json # relaciones editoriales explícitas por lección
content/studies/      # Markdown canónico publicado
```

`data/bibli.sqlite` es el snapshot de build. Las 20 lecciones SQL históricas de `data/content/` fueron retiradas: ya no son fuente ni dependencia técnica.

## Experiencia de lección

La página de Lección ofrece dos modos:

- **🎓 Estudio**: Markdown canónico, índice, secciones pedagógicas y ayudas contextuales.
- **📖 Lectura bíblica**: texto de la versión bíblica local correspondiente a la referencia principal.

Las ayudas pueden ocultarse y admiten Glosario, Personajes, Lugares, mapas, Temas, Eventos y Recursos visuales. Las relaciones semánticas no se infieren automáticamente de la prosa: se aprueban en `content/study-enrichments.json` o mediante metadata editorial futura.

La interfaz es responsive y está diseñada para escritorio y móvil. El progreso se calcula a partir de lecciones realmente marcadas como completadas, no por la posición editorial de una lección.

## PWA y uso sin conexión

Bibli incluye una base PWA instalable: `manifest.webmanifest`, iconos propios, `service worker` y una página de contingencia offline. El service worker usa una estrategia conservadora: las navegaciones intentan primero la red y guardan las páginas visitadas; los assets locales se reutilizan desde caché cuando están disponibles.

Esta capa permite instalar Bibli y volver a abrir contenido ya visitado sin conexión. Además, el gestor de paquetes de `/descargar/` y `/en/download/` permite guardar explícitamente la aplicación, las lecciones/rutas y cada versión bíblica disponible; la caché automática de páginas visitadas y los paquetes descargados se administran por separado.

## Comandos principales

Instalar dependencias:

```bash
npm ci
```

Sincronizar las lecciones oficiales desde la carpeta local de OneDrive. Si existen varias revisiones del mismo `lesson_id`, se selecciona automáticamente la versión SemVer más alta:

```bash
npm run studies:sync
```

Validar el snapshot:

```bash
npm run studies:validate
```

Importar/reindexar rutas y lecciones en SQLite:

```bash
npm run studies:import
```

Sincronizar + validar + importar + mostrar estado editorial:

```bash
npm run studies:refresh
```

Consultar el estado editorial de las lecciones y detectar módulos provisionales:

```bash
npm run studies:status
```

Validar guardrails de UI (iconos, búsqueda, referencias eliminadas y paleta legacy):

```bash
npm run ui:validate
```

Compilar producción:

```bash
npm run build
```

`npm run build` ejecuta automáticamente la compuerta completa mediante `prebuild` y `postbuild`:

```text
prebuild
repo:validate
→ ui:validate
→ i18n:audit
→ personal:validate
→ studies:validate
→ studies:import
→ content:validate
→ bibliimg:validate
→ connections:validate
→ db:validate

astro build

postbuild
site:audit
→ derived:validate
```

Validar el snapshot BibliImg ya integrado y sus derivados web:

```bash
npm run bibliimg:validate
```

Sincronizar localmente paquetes BibliImg `approved` desde la raíz canónica de OneDrive hacia el snapshot de Bibli:

```bash
npm run bibliimg:sync
```

El comando detecta `bibli_images_OneDrive_Only` en la raíz local de OneDrive y ubicaciones compatibles; puede sobreescribirse con `BIBLI_IMAGES_ROOT` o `--source`. Solo integra coincidencias seguras de `slug`, overrides explícitos en `content/bibli-images-integration-map.json` o identidades confirmadas por `content/bibli-images-glossary-published.json`; no crea términos ni relaciones editoriales por similitud de nombres. Los masters permanecen fuera de Git y solo se generan derivados WebP versionados.

Comprobar si la fuente editorial local y el snapshot versionado están sincronizados, sin escribir:

```bash
npm run bibliimg:sync:check
```

Generar una cola de revisión para paquetes `approved` que todavía no tienen término de Glosario. Este comando **no modifica SQLite**: detecta términos existentes, candidatos seguros para creación y colisiones bloqueantes, y conserva nombres canónicos calificados cuando existen homónimos:

```bash
npm run bibliimg:plan
```

Comprobar que la cola versionada sigue alineada con los paquetes locales y el Glosario actual:

```bash
npm run bibliimg:plan:check
```

Previsualizar la publicación de términos `ready_to_create` sin modificar archivos ni SQLite:

```bash
npm run bibliimg:publish:preview
```

Publicar de forma explícita los términos aprobados por el plan. Este comando revalida colisiones, inserta solo términos nuevos en `glossary_terms` y mantiene dos fuentes reproducibles: `content/bibli-images-glossary-published.json` y `data/bibliimg-glossary.sql`:

```bash
npm run bibliimg:publish
```

Comprobar que el manifest de publicación, el SQL canónico y la SQLite actual siguen siendo equivalentes:

```bash
npm run bibliimg:publish:check
```

La publicación **nunca ocurre durante `build`**. El `prebuild` ejecuta únicamente `bibliimg:publish:check` para impedir drift. Después de publicar términos nuevos, vuelve a ejecutar `bibliimg:plan` y `bibliimg:sync` para que los paquetes recién habilitados se integren con sus derivados WebP.

Validar únicamente las conexiones editoriales y sus guardrails de reciprocidad/procedencia:

```bash
npm run connections:validate
```

Ejecutar la matriz E2E de Playwright (desktop, tablet y móvil):

```bash
npm run qa:e2e
```

Ejecutar build completo seguido de la matriz E2E:

```bash
npm run qa:all
```

## Reconstrucción de SQLite

```bash
npm run db:reset
```

Reconstruye la capa editorial desde `schema.sql`, `seed.sql`, `editorial.sql`, `bibliimg-glossary.sql` y los Markdown canónicos. Después deben reimportarse los textos bíblicos:

```bash
npm run bible:import:rvr1960
npm run bible:validate:kjv
npm run bible:import:kjv
npm run bible:audit:kjv
npm run bible:audit:kjv:spacing
npm run db:validate
```

## Versiones bíblicas

- RVR1960: 31.104 versículos.
- KJV 1769: 31.102 versículos.

Fuente local RVR1960:

```text
data/import/rvr1960.csv
```

Es una fuente local licenciada y no debe versionarse ni distribuirse.

Fuente KJV canónica:

```text
data/import/kjv-study/json/verses-1769.json
```

No crear versículos artificiales para diferencias legítimas de versificación. En KJV faltan respecto de RVR1960:

```text
Salmos 47:10
3 Juan 1:15
```

## Archivos que NO son fuente

No persistir como parte del proyecto sincronizado ni versionar:

```text
node_modules/
dist/
.astro/
exports/
data/content/               # legado retirado
data/import/kjv-source/     # checkout redundante retirado
```

Conservar `.git/`, `.github/`, código fuente, `data/bibli.sqlite` y las fuentes de importación bíblica necesarias.

## Idiomas y preferencias

La estrategia global es una sola aplicación con `/es/` y `/en/`. El lector bíblico ya usa rutas localizadas y códigos USFM.

Preferencias locales:

```text
bibli-theme               auto | light | dark
bibli-language            selección explícita de idioma
bibli-learning-progress-v1 progreso local de aprendizaje
bibli-lesson-mode-v1      study | reading
bibli-study-aids-v1       visible | hidden
bibli-reader-size-v1       default | small | large
bibli-reader-font-v1       default | sans | serif
bibli-reader-align-v1      default | left | justify
bibli-tts-rate-v1          0.75 | 1 | 1.25 | 1.5
bibli-tts-voice-es-v1      voz preferida del navegador para español
bibli-tts-voice-en-v1      voz preferida del navegador para inglés
```

## Lectura y texto a voz

Las lecciones y los capítulos bíblicos comparten preferencias de lectura por dispositivo. El valor `default` conserva la presentación editorial original; tamaño, tipografía y alineación solo cambian cuando el usuario los selecciona explícitamente.

Bibli incluye además un reproductor global de texto a voz basado en `SpeechSynthesis`: lee la Biblia por versículo y las lecciones por fragmentos/párrafos, permite pausar, avanzar, retroceder, ajustar velocidad y conservar una voz preferida por idioma. No genera ni almacena archivos de audio. La disponibilidad offline de voces depende de las voces instaladas por el navegador o sistema operativo.

## Paquetes sin conexión

La PWA dispone de una base offline automática para páginas visitadas y de un gestor explícito de paquetes en `/descargar/` y `/en/download/`. Los paquetes se almacenan con Cache Storage únicamente en el dispositivo actual:

- `Aplicación Bibli`: shell y páginas principales.
- `Lecciones y rutas`: todas las lecciones oficiales y sus rutas publicadas.
- `Biblia`: un paquete independiente por versión bíblica disponible.

Cada paquete puede descargarse, actualizarse o eliminarse de forma independiente. Durante la descarga también se guardan los recursos locales enlazados por las páginas (CSS, JavaScript, fuentes e imágenes locales). El service worker conserva estos caches durante sus propias actualizaciones. Los caches internos de shell/runtime reciben una versión nueva en cada build para que una instalación existente no conserve indefinidamente páginas básicas antiguas; los caches `bibli-package-*` del usuario no se eliminan por ese proceso.

El navegador puede liberar almacenamiento local bajo presión de espacio; por eso la interfaz muestra el consumo estimado y no debe considerarse Cache Storage como copia de respaldo editorial.

## Despliegue

GitHub Pages usa `.github/workflows/deploy.yml`. El workflow instala dependencias y ejecuta `npm run build`; la validación e importación idempotente de los estudios sucede dentro de `prebuild`.

Para retirar artefactos generados locales después de una prueba de build:

```bash
npm run clean:generated
```

Esto elimina `dist/`, `.astro/` y `exports/`; nunca toca el código fuente ni `node_modules/`.

Antes de guardar cambios o preparar un despliegue:

```bash
npm run qa:all
git diff --check
git status
```

`git diff --check` puede mostrar avisos de conversión LF→CRLF en Windows; esos avisos no son fallos mientras el comando no reporte errores de whitespace. Los artefactos de ejecución de Playwright (`test-results/`, `playwright-report/` y `blob-report/`) no forman parte del código fuente y deben permanecer fuera del control de versiones.
