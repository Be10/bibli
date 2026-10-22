# Compuertas de calidad de Bibli — v1

## Objetivo

Congelar como contrato el estado funcional y visual aprobado y detectar regresiones antes de publicar.

## Capas

### 1. Repositorio

`repo:validate` protege higiene, fuentes privadas/generadas y artefactos retirados. Revisa únicamente archivos versionados y bloquea reapariciones de superficies obsoletas.

### 2. UI estática

`ui:validate` protege los componentes y tokens compartidos, iconografía, dock, buscador, TTS y decisiones de diseño que no requieren un navegador real.

### 3. Paridad ES/EN

`i18n:audit` exige paridad estructural de las superficies bilingües ya publicadas: Home, búsqueda, descarga y lector bíblico. Los catálogos editoriales sin corpus inglés se reportan como cobertura pendiente, no como error.

### 4. Contenido y datos

`studies:validate`, `studies:import` y `db:validate` siguen siendo la compuerta editorial. No deben reemplazarse por tests de UI.

### 5. Sitio generado

`site:audit` corre como `postbuild` sobre `dist/` y valida:

- destinos de enlaces internos;
- anclas locales;
- IDs duplicados;
- `lang`, viewport y estructura básica;
- nombres accesibles de botones/inputs e imágenes con `alt`;
- manifest, service worker, offline e iconos PWA;
- rutas bilingües críticas;
- presupuestos conservadores de tamaño JS/CSS.

### 6. Navegador real

Playwright ejecuta Chromium en proyectos desktop, tablet y mobile contra `astro preview`:

- Inicio y dock;
- apertura/foco/cierre del buscador;
- Estudio/Lectura y disponibilidad del TTS;
- índice del Glosario;
- UI dinámica de Descargas;
- overflow horizontal;
- skip link, nombres accesibles y reduced motion;
- jerarquía visible de encabezados: las superficies críticas exponen exactamente un `h1` visible, y las Lecciones lo validan por separado en Estudio y Lectura;
- landmarks estructurales únicos y navegaciones con nombre accesible;
- tabs Estudio/Lectura vinculados a sus paneles y operables con flechas/Home/End;
- foco visible verificable y respeto efectivo de `prefers-reduced-motion`;
- controles deshabilitados fuera del orden de tabulación y estados `aria-busy` que se resuelven correctamente.

La matriz funcional base de FASE 1 queda congelada en 45 pruebas E2E sobre desktop, tablet y mobile. FASE 2 añade pruebas bloqueantes de accesibilidad sobre esa base (teclado, retorno de foco, contención modal y objetivos táctiles), por lo que el total puede crecer sin alterar el baseline funcional. La suite de navegador es una compuerta bloqueante de GitHub Pages. El workflow ejecuta `npm ci`, `npm run build`, instala Chromium con Playwright y ejecuta `npm run qa:ci` antes de `actions/upload-pages-artifact`. Si el QA funcional falla, no se genera el artefacto de Pages y no se despliega.

## Política de rendimiento

La prioridad es mantener HTML estático y JavaScript progresivo. Los mapas y módulos pesados deben permanecer aislados y cargarse de forma diferida cuando no sean necesarios para el primer render. `site:audit` distingue entre JavaScript inicial referenciado directamente por el HTML y chunks diferidos alcanzados mediante `import()`.

Presupuestos v1:

- asset JS inicial: aviso > 500 KB; bloqueo > 1.5 MB;
- JS inicial total por ruta: aviso > 700 KB; bloqueo > 1.5 MB;
- chunk JS diferido: aviso > 1.2 MB; bloqueo > 2.5 MB;
- CSS: aviso > 180 KB; bloqueo > 300 KB.

Los mapas deben mantener sus motores cartográficos fuera del JS inicial: MapLibre en `/mapa-3d/` y Leaflet en `/mapa/` se cargan por proximidad/interacción mediante `import()`. El tamaño bruto de una dependencia pesada no se evalúa igual que el JavaScript que bloquea o acompaña el primer render.

## Política PWA

- Service worker versionado y actualización explícita.
- Paquetes offline del usuario no se purgan como parte del cache de runtime.
- Manifest e iconos son obligatorios.
- La notificación de actualización nunca puede quedar detrás de la navegación fija.

## Accesibilidad

- teclado completo;
- foco visible;
- no depender de hover;
- reduced motion;
- semántica y nombres accesibles;
- exactamente un `h1` visible por superficie activa; en interfaces por modos mutuamente excluyentes, validar el árbol visible de cada modo en navegador real en vez de contar encabezados ocultos del HTML bruto;
- evitar cambios de tamaño/posición al activar controles;
- las superficies primarias deben mantener objetivos táctiles de al menos 44 × 44 px;
- los diálogos modales compactos deben contener el foco con `Tab`/`Shift+Tab` y devolverlo al disparador al cerrar;
- búsqueda, menú global y herramientas de Lección deben poder abrirse y cerrarse completamente por teclado;
- los cambios dinámicos deben anunciarse mediante regiones vivas breves y atómicas, sin convertir listas completas de resultados en `aria-live`;
- los avisos interactivos con acciones deben separar el anuncio vivo (`role="status"`) de la región que contiene botones o enlaces;
- los patrones `tablist`/`tab` deben enlazar cada tab con su `tabpanel`, mantener roving `tabindex` y soportar navegación estándar por teclado;
- los controles visualmente deshabilitados no deben seguir siendo enlaces focusables o navegables.

## Próximas ampliaciones

La infraestructura queda preparada para añadir snapshots visuales estables una vez se congelen viewport, fuentes y entorno de render en CI. No se deben introducir baselines frágiles antes de esa estabilización.
