# QA E2E de Bibli

La suite cubre regresiones funcionales, responsive y accesibilidad en Chromium de escritorio, tablet y móvil (incluyendo 375 px). La base funcional de FASE 1 conserva 45 pruebas; FASE 2 añade casos bloqueantes de teclado, foco modal, objetivos táctiles, anuncios dinámicos, landmarks, tabs ARIA, estados deshabilitados/busy y reduced motion.

## Local

1. `npm install` (o `npm ci` en un checkout limpio)
2. `npm run build`
3. `npm run qa:e2e:setup` (solo la primera vez o cuando cambie la versión fijada)
4. `npm run qa:e2e`

La configuración levanta `astro preview` automáticamente sobre el build de `dist/`. En Windows local, Bibli usa Edge/Chrome instalado cuando está disponible y desactiva la grabación de vídeo para no depender del FFmpeg empaquetado de Playwright; trazas y screenshots de fallo permanecen activas. En CI se mantiene `video: retain-on-failure`.

## CI

GitHub Actions instala Chromium y ejecuta la suite antes de publicar GitHub Pages. Un fallo bloquea el deploy.

## Alcance

Las pruebas E2E no sustituyen la revisión editorial ni `studies:validate`; comprueban el contrato de interacción que ya fue aprobado: navegación, buscador, Lecciones, TTS, Glosario, Offline y responsive. La cobertura accesible añade operación completa por teclado, retorno de foco, contención del foco en diálogos modales compactos, nombres/semántica, objetivos táctiles mínimos de 44 × 44 px, anuncios `aria-live` concisos, landmarks únicos, navegación nombrada, tabs ARIA con roving `tabindex`, controles deshabilitados fuera del orden de tabulación y reducción efectiva de movimiento.
