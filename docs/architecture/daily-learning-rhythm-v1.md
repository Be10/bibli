# Bibli — Ritmo diario de aprendizaje y calendario adaptativo v1

## Estado
Aprobado como línea de diseño para implementación futura en Bibli.

## Objetivo
Extender una lección más allá del momento de lectura para favorecer recuerdo, comprensión e interiorización durante el mismo día, sin imponer una rutina rígida ni introducir gamificación extrínseca.

## Principio general
El usuario puede estudiar una o varias lecciones cuando lo desee. La experiencia puede recomendar la mañana como momento principal de estudio (por ejemplo, 6–7 AM según preferencia local), pero nunca debe exigirlo. El usuario decide cuándo ha terminado su sesión principal del día.

## Ritmo diario sugerido

### Mañana — Estudio principal
- Una lección por día como cadencia recomendada, no obligatoria.
- Permitir completar más de una lección en el mismo día.
- Mostrar objetivos, modo clásico o dinámico, TTS, recursos interactivos y evaluación de cierre.
- Generar desde ese momento un versículo o idea relevante de la lección que pueda mostrarse y compartirse con diseño visual/imagen cuando corresponda.

### Mediodía / tarde — Recuperación breve
Contenido breve derivado de las lecciones realmente estudiadas ese día. No debe sentirse como una segunda lección completa.

Tipos posibles:
- microquiz de recuperación con pocas preguntas;
- recordar un concepto sin releer toda la explicación;
- una comparación visual o relación clave;
- una pregunta objetiva con feedback y enlace al bloque de origen;
- una tarjeta “¿Recuerdas esto?” basada en un concepto importante;
- una breve reflexión no calificada cuando el contenido lo amerite.

Debe existir un presupuesto diario de preguntas para evitar sobrecarga. El sistema selecciona solo los conceptos con mayor valor pedagógico o menor evidencia de comprensión.

### Noche — Cierre / interiorización
Contenido aún más breve y calmado. Puede incluir:
- un versículo relevante con imagen o composición visual;
- una idea clave de la lección;
- “Lo esencial de hoy”;
- una oración breve derivada de la lección;
- recordar un concepto débil de forma no invasiva;
- una pregunta de reflexión de `Para meditar`, sin calificación.

La noche no debe convertirse en otra evaluación extensa.

## Relación con el repaso espaciado
El contenido de tarde/noche pertenece al refuerzo del mismo día. El sistema de “Repaso de hoy” sigue existiendo como mecanismo de repetición espaciada para conceptos aprendidos en días anteriores.

No mezclar de forma ilimitada ambos sistemas. Deben existir límites diarios y una política de selección para evitar acumulación de preguntas.

## Contenido compartible
Desde que se completa una lección, Bibli puede preparar una tarjeta compartible basada en un versículo o idea central de la Escritura estudiada.

Reglas:
- la referencia bíblica debe ser clara;
- el diseño puede usar imágenes o fondos coherentes con la lección;
- no debe sacar el versículo de contexto ni presentarlo de forma engañosa;
- la tarjeta compartible es opcional y no forma parte de la evaluación.

## Inicio de una ruta / curso / módulo
Al iniciar una ruta, Bibli debe crear una planificación inicial de estudio.

La planificación debe considerar:
- fecha de inicio;
- cadencia recomendada (por defecto, una lección por día cuando corresponda);
- número de lecciones conocidas;
- prerrequisitos reales;
- días preferidos de estudio, si el usuario los configura;
- horario preferido, si el usuario lo configura;
- flexibilidad para estudiar más o menos en cualquier día.

## Calendario adaptativo
El calendario no es un contrato rígido. Es una proyección dinámica.

Ejemplos de comportamiento:
- si el usuario completa una lección, la siguiente pasa a ocupar el próximo espacio recomendado;
- si completa dos o más lecciones el mismo día, el calendario se adelanta automáticamente;
- si no estudia un día, las lecciones pendientes se desplazan sin penalización;
- si una lección requiere prerrequisitos, estos se respetan;
- si el usuario pausa una ruta, el calendario deja de empujar nuevas lecciones hasta reanudarla;
- si el usuario cambia su cadencia preferida, se recalcula la proyección futura, no el historial.

## Estados del calendario
Evitar estados con lógica de videojuego. Preferir estados editoriales y pedagógicos como:
- completada;
- actual / recomendada;
- próxima;
- disponible;
- pendiente;
- pausada;
- requiere prerrequisito (solo cuando sea real).

## Integración con conceptos
El sistema diario debe trabajar sobre `concept_id` estables. Los contenidos de tarde y noche se generan a partir de:
- conceptos vistos ese día;
- evidencia de comprensión;
- errores recientes;
- importancia del concepto dentro de la lección;
- conexiones bíblicas relevantes;
- necesidad de repaso posterior.

No generar preguntas únicamente porque una lección tenga muchos conceptos.

## Separación de sistemas
Distinguir claramente:
1. contenido editorial de la lección (Markdown canónico);
2. modelo educativo estructurado de la lección;
3. progreso del usuario en la ruta;
4. comprensión estimada por concepto;
5. calendario/proyección de estudio;
6. cola de repaso espaciado;
7. contenido de refuerzo del mismo día.

Esto permite recalcular calendarios o repaso sin alterar el contenido editorial ni el historial de estudio.

## Principios UX
- recomendar, no imponer;
- respetar que el usuario decida cuándo terminó de estudiar;
- evitar exceso de notificaciones;
- permitir desactivar o cambiar horarios de recordatorio;
- mostrar contenido breve y útil, no “relleno”;
- no penalizar días sin estudio;
- no usar rachas, XP, monedas, cofres ni recompensas artificiales;
- priorizar motivación intrínseca y deseo real de comprender la Biblia.

## Idiomas
Toda la experiencia debe implementarse al menos en español e inglés, incluyendo textos, preguntas, feedback, conceptos, calendario, notificaciones y contenido diario.

## Identidad visual mientras no existan ilustraciones
Las rutas, cursos, módulos, lecciones, tarjetas de versículos y otros contenidos pueden usar colores representativos, gradientes suaves, patrones, iconografía y tipografía como identidad visual temporal o permanente.

Reglas:
- usar paletas controladas, sobrias y accesibles;
- mantener independencia entre color semántico del contenido y color de énfasis elegido por el usuario;
- permitir que una futura ilustración reemplace o complemente el fondo sin cambiar la estructura del componente;
- no depender exclusivamente del color para comunicar estado o significado;
- soportar modo claro y oscuro;
- mantener la misma semántica visual en español e inglés.

## Convivencia de múltiples rutas y exploración libre
Abrir, explorar o previsualizar una ruta, curso o lección no debe alterar automáticamente el calendario ni el plan de estudio.

Distinguir al menos estos estados:
- `exploring`: navegación libre, sin efecto sobre planificación;
- `saved_for_later`: guardado, sin efecto sobre planificación;
- `active_primary`: ruta principal que alimenta normalmente el estudio diario;
- `active_secondary`: ruta iniciada con progreso conservado, pero sin generar obligaciones diarias por defecto;
- `paused`: progreso conservado, sin planificación activa;
- `completed`: recorrido completado.

Completar una lección aislada fuera de la ruta principal debe registrarse como progreso real, pero no debe activar automáticamente la ruta ni programar la siguiente lección.

## Una ruta principal gobierna normalmente el día
Por defecto, solo una ruta `active_primary` debe alimentar la propuesta principal de estudio diario. Las rutas secundarias pueden continuarse cuando el usuario lo desee o según una cadencia específica configurada explícitamente.

Si el usuario inicia otra ruta, Bibli debe permitir:
- convertirla en principal;
- mantenerla como secundaria;
- pausarla;
- definir días o cadencia específicos de forma opcional.

Iniciar una ruta no debe implicar que todas las rutas activas generen una lección diaria simultáneamente.

## Presupuesto diario de aprendizaje
El número de actividades diarias debe depender del valor pedagógico y del tiempo deseado, no del número de rutas iniciadas.

Configuración recomendada por defecto:
1. un estudio principal;
2. un repaso breve;
3. un contenido corto de interiorización.

Si el usuario estudia varias lecciones o rutas en un día, el sistema debe condensar y priorizar conceptos, no multiplicar proporcionalmente quizzes, repasos o notificaciones.

Principio: `más estudio != más obligaciones`.

## Recalculo del calendario
El calendario debe representar la siguiente acción real del usuario, no una deuda acumulada.

- Si el usuario adelanta varias lecciones, recalcular desde la siguiente no completada.
- Si omite días, desplazar la proyección futura sin crear una pila de lecciones atrasadas.
- Si estudia una lección ad hoc, no modificar la ruta principal salvo que exista una relación explícita con su plan.
- Si cambia de ruta principal, conservar el progreso y recalcular únicamente la proyección futura.
- Si pausa una ruta, retirar sus propuestas del día sin perder historial.

## Refuerzo del mismo día con múltiples estudios
El contenido de tarde/noche debe priorizar la sesión principal real del día y los conceptos más importantes o débiles. Si hubo estudios adicionales, incluirlos solo cuando aporten valor y sin exceder el presupuesto diario.

El sistema no debe generar un bloque de refuerzo por cada lección completada.

## Principio rector de planificación
El usuario puede explorar libremente. El calendario organiza, nunca castiga. La planificación se adapta a la persona, no al número de contenidos que haya abierto o iniciado.
