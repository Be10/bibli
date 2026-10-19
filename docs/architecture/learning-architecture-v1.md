# Arquitectura de aprendizaje — Bibli v1

## Objetivo

Convertir las lecciones bíblicas canónicas en una experiencia de aprendizaje guiada, dinámica y usable en escritorio/móvil sin alterar ni resumir el contenido teológico del Markdown.

## Modelo

```text
study_lesson (contenido canónico único)
     ↕ N:M
route_lesson
     ↕
route_module
     ↕
route
```

Una misma Lección puede aparecer en distintas rutas. `lesson_id` sigue siendo su identidad estable; la posición pertenece a la ruta.

## Responsabilidades

### Markdown

Conserva:

- H1/título editorial;
- contexto;
- exposición completa;
- secciones reservadas;
- resumen;
- oración;
- formato literario propio del género.

### SQLite

Conserva/deriva:

- identidad;
- slug;
- libro y referencia principal;
- ruta/módulo/posición;
- duración estimada;
- búsqueda;
- relaciones editoriales aprobadas;
- catálogo bíblico y entidades.

No duplica el cuerpo Markdown.

## Experiencia de una Lección

### Modo Estudio

- índice de secciones;
- tarjetas/secciones visualmente diferenciadas;
- ayudas de estudio ocultables;
- mapa contextual cuando existen lugares con coordenadas;
- fichas de glosario/personajes/lugares/temas/eventos;
- navegación anterior/siguiente;
- acción de completar Lección.

### Modo Lectura bíblica

- referencia principal;
- texto real de la versión seleccionada/local;
- agrupación por capítulo;
- enlace al lector bíblico completo.

El usuario puede alternar ambos modos sin salir de la Lección.

## Progreso

La posición curricular no representa progreso personal.

v1 local:

```text
bibli-learning-progress-v1
```

Guarda:

- `completed[]` por `lesson_id`;
- `lastLessonByRoute`.

Futuro: sincronización opcional en D1 sin mezclar datos del usuario con el contenido editorial estático.

## Ayudas contextuales

El panel de ayudas es progresivo y puede ocultarse. Las relaciones se publican únicamente cuando han sido aprobadas en `content/study-enrichments.json` o llegan como metadata explícita futura.

Tipos soportados:

- Glosario;
- Personajes;
- Lugares;
- mapa Leaflet;
- Temas;
- Eventos;
- Recursos visuales.

No se generan relaciones semánticas automáticamente a partir de coincidencias de palabras.

## Diseño responsive

- desktop: índice lateral + contenido + ayudas;
- tablet: contenido principal con ayudas reubicadas;
- móvil: una sola columna, controles táctiles y ayudas desplegables;
- no depender de `hover` para contenido esencial;
- mapas se inicializan de forma diferida con `IntersectionObserver`.

## Render y rendimiento

Astro genera HTML estático para el cuerpo de la Lección. Solo se hidratan/interactúan los elementos necesarios: progreso, selector de modo, panel de ayudas y mapa. La experiencia no debe convertirse en una SPA pesada.

## Fuentes de configuración

```text
content/editorial-structure.yaml
content/routes.json              # derivado para compatibilidad
content/study-enrichments.json
content/studies/**/*.md
```

La fuente canónica de rutas/módulos es `Estudios Biblicos/Sistema/Estructura-Editorial.yaml`; `content/editorial-structure.yaml` es su snapshot y `content/routes.json` se regenera para compatibilidad.

La pertenencia nueva se expresa mediante `section_id` en el frontmatter. Los rangos numéricos quedan como compatibilidad heredada para Lecciones anteriores a la política de migración. Una Lección oficial sin sección resoluble bloquea la importación antes de llegar a SQLite. Las rutas y módulos pueden evolucionar sin mover o duplicar los Markdown.
