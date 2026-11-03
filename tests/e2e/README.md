# QA E2E de Bibli

La suite cubre regresiones funcionales, responsive y accesibilidad en Chromium de escritorio, tablet y móvil (incluyendo 375 px). Las rutas rápidas no sustituyen la certificación completa: reducen el ciclo de desarrollo, mientras `qa:certify` conserva build, validadores y la matriz completa de Playwright.

## Estrategia de QA

Bibli usa tres niveles deliberadamente separados:

1. `npm run qa:search`
   - Ejecuta un **quick build de Astro** sin los validadores `prebuild`/`postbuild` de npm.
   - Prueba búsqueda y ranking únicamente en `desktop-chromium`.
   - Se usa durante cambios pequeños del buscador.

2. `npm run qa:fast`
   - Ejecuta el mismo quick build de producción y una regresión crítica en desktop.
   - Incluye accesibilidad, referencias bíblicas, estado personal, responsive, ranking y smoke.
   - Se usa periódicamente durante un bloque de desarrollo.

3. `npm run qa:certify`
   - Ejecuta `npm run build`, incluidos todos los validadores de `prebuild` y `postbuild`.
   - Después ejecuta `qa:ci`, es decir, **toda** la suite E2E en desktop, tablet y mobile.
   - Es obligatorio al cerrar un bloque importante, antes de mergear o antes de publicar.

`qa:ci` no fue reducido y continúa siendo la suite Playwright completa.

## Por qué Fast QA usa `astro preview`

Las páginas de búsqueda avanzada consumen índices JSON generados por Astro. En `astro dev`, esos índices grandes se construyen dinámicamente al solicitarlos y no representan el comportamiento ni el coste de acceso del artefacto estático publicado. Por eso Fast QA genera primero un quick build y prueba con `astro preview`, igual que la certificación.

El quick build omite únicamente las auditorías redundantes durante la iteración; **no recorta páginas, lecciones, imágenes, índices ni rutas del sitio**.

Las matrices de referencias bíblicas están divididas en tests independientes. Así cada caso conserva su propio timeout y un escenario lento no consume el presupuesto temporal de todos los demás; esto mejora la señal de fallo sin relajar límites ni ocultar regresiones.

## Workers

- `qa:search` y `qa:fast`: 3 workers explícitos para acelerar iteración sin saturar el equipo.
- `qa:e2e`, `qa:ci` y `qa:certify`: 2 workers por defecto, priorizando estabilidad y reproducibilidad.
- CI: 2 workers.
- Se puede ajustar la suite completa localmente con `BIBLI_E2E_WORKERS=<n>`.

## Local

1. `npm install` (o `npm ci` en un checkout limpio)
2. `npm run qa:e2e:setup` solo la primera vez o cuando cambie la versión fijada de Playwright
3. Durante desarrollo, elegir `qa:search` o `qa:fast` según el alcance
4. Al cerrar el bloque, ejecutar `npm run qa:certify`

`npm run qa:e2e` y `npm run qa:ci` levantan `astro preview` automáticamente sobre el `dist/` existente. Por esa razón deben usarse solo cuando `dist/` corresponde al código que se quiere validar; `qa:search`, `qa:fast` y `qa:certify` generan su propio build antes de probar.

En Windows local, Bibli usa Edge/Chrome instalado cuando está disponible y desactiva la grabación de vídeo para no depender del FFmpeg empaquetado de Playwright; trazas y screenshots de fallo permanecen activas. En CI se mantiene `video: retain-on-failure`.

## CI

GitHub Actions instala Chromium y ejecuta la suite antes de publicar GitHub Pages. Un fallo bloquea el deploy.

## Alcance

Las pruebas E2E no sustituyen la revisión editorial ni `studies:validate`; comprueban el contrato de interacción aprobado: navegación, buscador, Lecciones, TTS, Glosario, Offline y responsive. La cobertura accesible añade operación completa por teclado, retorno de foco, contención del foco en diálogos modales compactos, nombres/semántica, objetivos táctiles mínimos de 44 × 44 px, anuncios `aria-live` concisos, landmarks únicos, navegación nombrada, tabs ARIA con roving `tabindex`, controles deshabilitados fuera del orden de tabulación y reducción efectiva de movimiento.
