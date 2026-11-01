import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const root = process.cwd();
const dbPath = path.join(root, "data", "bibli.sqlite");
const queriesPath = path.join(root, "src", "lib", "queries.ts");
const lessonPath = path.join(root, "src", "pages", "lecciones", "[slug].astro");
const studyAidsPath = path.join(root, "src", "components", "learning", "StudyAids.astro");
const glossaryPath = path.join(root, "src", "pages", "glosario", "[category]", "[slug].astro");
const topicPath = path.join(root, "src", "pages", "temas", "[slug].astro");
const personPath = path.join(root, "src", "pages", "personajes", "[slug].astro");
const placePath = path.join(root, "src", "pages", "lugares", "[slug].astro");
const eventPath = path.join(root, "src", "pages", "eventos", "[slug].astro");
const bookPath = path.join(root, "src", "pages", "libros", "[slug].astro");
const passagePath = path.join(root, "src", "pages", "pasajes", "[slug].astro");
const resourcePath = path.join(root, "src", "pages", "recursos", "[slug].astro");

const errors = [];
const fail = (message) => errors.push(message);
const requiredPaths = [
  dbPath,
  queriesPath,
  lessonPath,
  studyAidsPath,
  glossaryPath,
  topicPath,
  personPath,
  placePath,
  eventPath,
  bookPath,
  passagePath,
  resourcePath,
];

for (const required of requiredPaths) {
  if (!fs.existsSync(required)) fail(`falta archivo requerido: ${path.relative(root, required)}`);
}

if (errors.length) {
  console.error("Conexiones editoriales: FAIL");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const read = (filePath) => fs.readFileSync(filePath, "utf8");
const queriesSource = read(queriesPath);
const lessonSource = read(lessonPath);
const studyAidsSource = read(studyAidsPath);
const glossarySource = read(glossaryPath);
const topicSource = read(topicPath);
const personSource = read(personPath);
const placeSource = read(placePath);
const eventSource = read(eventPath);
const bookSource = read(bookPath);
const passageSource = read(passagePath);
const resourceSource = read(resourcePath);
const db = new Database(dbPath, { readonly: true });

const relationSpecs = [
  ["lesson_topics", "lesson_id", "topic_id", "getTopicsByLessonId", "getLessonsByTopicId"],
  ["lesson_people", "lesson_id", "person_id", "getPeopleByLessonId", "getLessonsByPersonId"],
  ["lesson_places", "lesson_id", "place_id", "getPlacesByLessonId", "getLessonsByPlaceId"],
  ["lesson_glossary", "lesson_id", "glossary_id", "getGlossaryByLessonId", "getLessonsByGlossaryId"],
  ["lesson_events", "lesson_id", "event_id", "getEventsByLessonId", "getLessonsByEventId"],
  ["lesson_books", "lesson_id", "book_id", "getBooksByLessonId", "getLessonsByBookId"],
  ["lesson_passages", "lesson_id", "passage_id", "getPassagesByLessonId", "getLessonsByPassageId"],
  ["lesson_visual_resources", "lesson_id", "visual_resource_id", "getVisualResourcesByLessonId", "getLessonsByVisualResourceId"],
  ["event_topics", "event_id", "topic_id", "getTopicsByEventId", "getEventsByTopicId"],
  ["event_people", "event_id", "person_id", "getPeopleByEventId", "getEventsByPersonId"],
  ["event_places", "event_id", "place_id", "getPlacesByEventId", "getEventsByPlaceId"],
  ["event_books", "event_id", "book_id", "getBooksByEventId", "getEventsByBookId"],
  ["event_passages", "event_id", "passage_id", "getPassagesByEventId", "getEventsByPassageId"],
];

const classifiedMultiFkTables = new Map([
  ...relationSpecs.map(([table]) => [table, "editorial"]),
  ["route_lessons", "structural"],
  ["bible_verses", "bible-content"],
]);

const allTableNames = db
  .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
  .all()
  .map((row) => row.name);
const multiFkTables = allTableNames.filter((table) => {
  const quoted = table.replaceAll('"', '""');
  return db.prepare(`PRAGMA foreign_key_list("${quoted}")`).all().length >= 2;
});
const unclassifiedMultiFkTables = multiFkTables.filter((table) => !classifiedMultiFkTables.has(table));
const staleMultiFkClassifications = [...classifiedMultiFkTables.keys()].filter((table) => !multiFkTables.includes(table));
if (unclassifiedMultiFkTables.length > 0) {
  fail(`inventario relacional: tablas multi-FK sin clasificar: ${unclassifiedMultiFkTables.join(", ")}`);
}
if (staleMultiFkClassifications.length > 0) {
  fail(`inventario relacional: clasificaciones obsoletas o esquema alterado: ${staleMultiFkClassifications.join(", ")}`);
}

let edgeCount = 0;
for (const [table, sourceColumn, targetColumn, forward, reverse] of relationSpecs) {
  const duplicate = db.prepare(`
    SELECT COUNT(*) AS n
    FROM (
      SELECT ${sourceColumn}, ${targetColumn}
      FROM ${table}
      GROUP BY ${sourceColumn}, ${targetColumn}
      HAVING COUNT(*) > 1
    )
  `).get().n;
  if (duplicate > 0) fail(`${table}: ${duplicate} pares duplicados`);
  edgeCount += db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  if (!queriesSource.includes(`function ${forward}(`)) fail(`${table}: falta consulta ${forward}`);
  if (!queriesSource.includes(`function ${reverse}(`)) fail(`${table}: falta consulta recíproca ${reverse}`);
}

const uiSpecs = [
  ["lesson_topics", "lesson-topics", studyAidsSource, topicSource, "lección", "tema"],
  ["lesson_people", "lesson-people", studyAidsSource, personSource, "lección", "personaje"],
  ["lesson_places", "lesson-places", studyAidsSource, placeSource, "lección", "lugar"],
  ["lesson_glossary", "lesson-glossary", studyAidsSource, glossarySource, "lección", "glosario"],
  ["lesson_events", "lesson-events", studyAidsSource, eventSource, "lección", "evento"],
  ["lesson_books", "lesson-books", studyAidsSource, bookSource, "lección", "libro"],
  ["lesson_passages", "lesson-passages", studyAidsSource, passageSource, "lección", "pasaje"],
  ["lesson_visual_resources", "lesson-visual-resources", studyAidsSource, resourceSource, "lección", "recurso"],
  ["event_topics", "event-topics", eventSource, topicSource, "evento", "tema"],
  ["event_people", "event-people", eventSource, personSource, "evento", "personaje"],
  ["event_places", "event-places", eventSource, placeSource, "evento", "lugar"],
  ["event_books", "event-books", eventSource, bookSource, "evento", "libro"],
  ["event_passages", "event-passages", eventSource, passageSource, "evento", "pasaje"],
];

for (const [table, marker, forwardSource, reverseSource, forwardLabel, reverseLabel] of uiSpecs) {
  const contract = `data-explicit-connection="${marker}"`;
  if (!forwardSource.includes(contract)) fail(`${table}: falta superficie explícita desde ${forwardLabel}`);
  if (!reverseSource.includes(contract)) fail(`${table}: falta superficie explícita desde ${reverseLabel}`);
}

if (!glossarySource.includes('getLessonsByGlossaryId')) fail('glosario: falta consulta inversa de lecciones');
if (!glossarySource.includes('data-explicit-connections="lesson-glossary"')) fail('glosario: falta grupo de conexiones explícitas');
if (!lessonSource.includes('getBooksByLessonId')) fail('lección: falta cargar relación explícita con libro');
if (!lessonSource.includes('getPassagesByLessonId')) fail('lección: falta cargar relación explícita con pasaje');
if (!lessonSource.includes('books={relatedBooks}')) fail('lección: falta entregar libros explícitos a Ayudas de estudio');
if (!lessonSource.includes('passages={relatedPassages}')) fail('lección: falta entregar pasajes explícitos a Ayudas de estudio');
if (!studyAidsSource.includes('Base bíblica')) fail('Ayudas de estudio: falta superficie Base bíblica');
if (!studyAidsSource.includes('visual-placeholder')) fail('Ayudas de estudio: falta estado navegable para recurso visual sin imagen');
if (studyAidsSource.includes('filter((resource) => Boolean(resource.url))')) fail('Ayudas de estudio: no debe ocultar una relación editorial solo porque el recurso visual aún no tenga imagen');

const eventPassageRoleStats = db.prepare(`
  SELECT
    COUNT(*) AS total,
    COUNT(DISTINCT TRIM(relation_type)) AS distinct_roles,
    SUM(CASE WHEN relation_type IS NULL OR TRIM(relation_type) = '' THEN 1 ELSE 0 END) AS missing_roles
  FROM event_passages
`).get();
if (eventPassageRoleStats.missing_roles > 0) fail(`event_passages: ${eventPassageRoleStats.missing_roles} vínculos sin relation_type editorial`);
if (!queriesSource.includes('event_passages.relation_type AS relation_type')) fail('event_passages: las consultas no preservan relation_type');
if (!eventSource.includes('data-connection-relation-type={passage.relation_type}')) fail('evento: falta exponer relation_type de event_passages');
if (!passageSource.includes('data-connection-relation-type={event.relation_type}')) fail('pasaje: falta exponer relation_type recíproco de event_passages');
if (!eventSource.includes('Relación: {passage.relation_type}')) fail('evento: falta etiqueta visible de relation_type');
if (!passageSource.includes('Relación: {event.relation_type}')) fail('pasaje: falta etiqueta visible recíproca de relation_type');

const derivedMarker = 'person-places-via-events';
if (!queriesSource.includes('function getPlacesByPersonIdViaEvents(')) fail('conexión derivada Personaje→Lugar: falta consulta explícitamente nombrada vía eventos');
if (!queriesSource.includes('function getPeopleByPlaceIdViaEvents(')) fail('conexión derivada Lugar→Personaje: falta consulta recíproca vía eventos');
if (!queriesSource.includes('COUNT(DISTINCT event_people.event_id) AS via_event_count')) fail('conexión derivada Personaje→Lugar: falta conteo de evidencia por evento');
if (!queriesSource.includes('COUNT(DISTINCT event_places.event_id) AS via_event_count')) fail('conexión derivada Lugar→Personaje: falta conteo recíproco de evidencia por evento');
if (!queriesSource.includes('function getEventsByPersonAndPlaceIds(')) fail('evidencia derivada Personaje↔Lugar: falta consulta de eventos compartidos por ambos IDs');
if (!queriesSource.includes('evidence_events: getEventsByPersonAndPlaceIds(personId, place.id)')) fail('evidencia derivada Personaje→Lugar: falta adjuntar eventos sustentadores');
if (!queriesSource.includes('evidence_events: getEventsByPersonAndPlaceIds(person.id, placeId)')) fail('evidencia derivada Lugar→Personaje: falta adjuntar eventos sustentadores');
if (!personSource.includes(`data-derived-connections="${derivedMarker}"`)) fail('personaje: falta grupo de conexiones derivadas a lugares');
if (!placeSource.includes(`data-derived-connections="${derivedMarker}"`)) fail('lugar: falta grupo recíproco de conexiones derivadas a personajes');
if (!personSource.includes(`data-derived-connection="${derivedMarker}"`)) fail('personaje: falta enlace derivado Personaje→Lugar');
if (!placeSource.includes(`data-derived-connection="${derivedMarker}"`)) fail('lugar: falta enlace derivado Lugar→Personaje');
if (personSource.includes('getPlacesByPersonId(')) fail('personaje: no debe consumir el getter ambiguo getPlacesByPersonId; usar getPlacesByPersonIdViaEvents');
if (!personSource.includes('data-derived-via="event-people,event-places"')) fail('personaje: falta procedencia event_people + event_places');
if (!placeSource.includes('data-derived-via="event-people,event-places"')) fail('lugar: falta procedencia event_people + event_places');
if (!personSource.includes('data-derived-evidence-count={place.via_event_count}')) fail('personaje: falta conteo visible de evidencia derivada');
if (!placeSource.includes('data-derived-evidence-count={person.via_event_count}')) fail('lugar: falta conteo visible de evidencia derivada');
if (!personSource.includes(`data-derived-evidence-events="${derivedMarker}"`)) fail('personaje: falta contenedor de eventos de evidencia derivada');
if (!placeSource.includes(`data-derived-evidence-events="${derivedMarker}"`)) fail('lugar: falta contenedor recíproco de eventos de evidencia derivada');
if (!personSource.includes(`data-derived-evidence-event="${derivedMarker}"`)) fail('personaje: falta navegación a eventos sustentadores');
if (!placeSource.includes(`data-derived-evidence-event="${derivedMarker}"`)) fail('lugar: falta navegación recíproca a eventos sustentadores');
if (!personSource.includes('data-derived-evidence-via="event-people,event-places"')) fail('personaje: eventos de evidencia sin procedencia declarada');
if (!placeSource.includes('data-derived-evidence-via="event-people,event-places"')) fail('lugar: eventos de evidencia sin procedencia declarada');
if (!personSource.includes('place.evidence_events.map')) fail('personaje: no renderiza la lista exacta de eventos sustentadores');
if (!placeSource.includes('person.evidence_events.map')) fail('lugar: no renderiza la lista exacta de eventos sustentadores');
if (personSource.includes('data-explicit-connection="person-places"') || placeSource.includes('data-explicit-connection="person-places"')) {
  fail('Personaje↔Lugar: una relación derivada no debe etiquetarse como explícita');
}

const publishedLessons = db.prepare(`SELECT COUNT(*) AS n FROM lessons WHERE status != 'Borrador'`).get().n;
const lessonBookCoverage = db.prepare(`
  SELECT COUNT(DISTINCT lb.lesson_id) AS n
  FROM lesson_books lb
  JOIN lessons l ON l.id = lb.lesson_id
  WHERE l.status != 'Borrador'
`).get().n;
const lessonPassageCoverage = db.prepare(`
  SELECT COUNT(DISTINCT lp.lesson_id) AS n
  FROM lesson_passages lp
  JOIN lessons l ON l.id = lp.lesson_id
  WHERE l.status != 'Borrador'
`).get().n;
const invalidLessonBookMultiplicity = db.prepare(`
  SELECT COUNT(*) AS n FROM (
    SELECT l.id
    FROM lessons l
    LEFT JOIN lesson_books lb ON lb.lesson_id = l.id
    WHERE l.status != 'Borrador'
    GROUP BY l.id
    HAVING COUNT(lb.book_id) != 1
  )
`).get().n;
const invalidLessonPassageMultiplicity = db.prepare(`
  SELECT COUNT(*) AS n FROM (
    SELECT l.id
    FROM lessons l
    LEFT JOIN lesson_passages lp ON lp.lesson_id = l.id
    WHERE l.status != 'Borrador'
    GROUP BY l.id
    HAVING COUNT(lp.passage_id) != 1
  )
`).get().n;
const lessonBookMismatch = db.prepare(`
  SELECT COUNT(*) AS n
  FROM lesson_books lb
  JOIN lessons l ON l.id = lb.lesson_id
  WHERE l.status != 'Borrador' AND lb.book_id != l.book_id
`).get().n;

if (lessonBookCoverage !== publishedLessons) fail(`lesson_books: cobertura ${lessonBookCoverage}/${publishedLessons} lecciones publicadas`);
if (lessonPassageCoverage !== publishedLessons) fail(`lesson_passages: cobertura ${lessonPassageCoverage}/${publishedLessons} lecciones publicadas`);
if (invalidLessonBookMultiplicity > 0) fail(`lesson_books: ${invalidLessonBookMultiplicity} lecciones publicadas no tienen exactamente un libro explícito`);
if (invalidLessonPassageMultiplicity > 0) fail(`lesson_passages: ${invalidLessonPassageMultiplicity} lecciones publicadas no tienen exactamente un pasaje explícito`);
if (lessonBookMismatch > 0) fail(`lesson_books: ${lessonBookMismatch} vínculos no coinciden con el libro canónico de la lección`);

const glossaryEdges = db.prepare(`
  SELECT COUNT(*) AS n
  FROM lesson_glossary lg
  JOIN lessons l ON l.id = lg.lesson_id
  JOIN glossary_terms g ON g.id = lg.glossary_id
  WHERE l.status != 'Borrador' AND g.status != 'Borrador'
`).get().n;
const visualEdges = db.prepare(`
  SELECT COUNT(*) AS n
  FROM lesson_visual_resources lvr
  JOIN lessons l ON l.id = lvr.lesson_id
  JOIN visual_resources vr ON vr.id = lvr.visual_resource_id
  WHERE l.status != 'Borrador' AND vr.status != 'Borrador'
`).get().n;

const directPersonPlaceTable = db.prepare(`
  SELECT COUNT(*) AS n
  FROM sqlite_master
  WHERE type = 'table' AND name = 'person_places'
`).get().n;
const derivedPersonPlacePairs = db.prepare(`
  SELECT COUNT(*) AS n FROM (
    SELECT ep.person_id, epl.place_id
    FROM event_people ep
    JOIN event_places epl ON epl.event_id = ep.event_id
    JOIN events e ON e.id = ep.event_id
    JOIN people p ON p.id = ep.person_id
    JOIN places pl ON pl.id = epl.place_id
    WHERE e.status != 'Borrador' AND p.status != 'Borrador' AND pl.status != 'Borrador'
    GROUP BY ep.person_id, epl.place_id
  )
`).get().n;
const derivedPeople = db.prepare(`
  SELECT COUNT(DISTINCT ep.person_id) AS n
  FROM event_people ep
  JOIN event_places epl ON epl.event_id = ep.event_id
  JOIN events e ON e.id = ep.event_id
  JOIN people p ON p.id = ep.person_id
  JOIN places pl ON pl.id = epl.place_id
  WHERE e.status != 'Borrador' AND p.status != 'Borrador' AND pl.status != 'Borrador'
`).get().n;
const derivedPlaces = db.prepare(`
  SELECT COUNT(DISTINCT epl.place_id) AS n
  FROM event_people ep
  JOIN event_places epl ON epl.event_id = ep.event_id
  JOIN events e ON e.id = ep.event_id
  JOIN people p ON p.id = ep.person_id
  JOIN places pl ON pl.id = epl.place_id
  WHERE e.status != 'Borrador' AND p.status != 'Borrador' AND pl.status != 'Borrador'
`).get().n;
const multiEventDerivedPairs = db.prepare(`
  SELECT COUNT(*) AS n FROM (
    SELECT ep.person_id, epl.place_id, COUNT(DISTINCT ep.event_id) AS evidence_count
    FROM event_people ep
    JOIN event_places epl ON epl.event_id = ep.event_id
    JOIN events e ON e.id = ep.event_id
    JOIN people p ON p.id = ep.person_id
    JOIN places pl ON pl.id = epl.place_id
    WHERE e.status != 'Borrador' AND p.status != 'Borrador' AND pl.status != 'Borrador'
    GROUP BY ep.person_id, epl.place_id
    HAVING evidence_count > 1
  )
`).get().n;
const derivedEvidenceEdges = db.prepare(`
  SELECT COUNT(*) AS n FROM (
    SELECT DISTINCT ep.person_id, epl.place_id, e.id AS event_id
    FROM event_people ep
    JOIN event_places epl ON epl.event_id = ep.event_id
    JOIN events e ON e.id = ep.event_id
    JOIN people p ON p.id = ep.person_id
    JOIN places pl ON pl.id = epl.place_id
    WHERE e.status != 'Borrador' AND p.status != 'Borrador' AND pl.status != 'Borrador'
  )
`).get().n;
const maxDerivedEvidence = db.prepare(`
  SELECT MAX(evidence_count) AS n FROM (
    SELECT ep.person_id, epl.place_id, COUNT(DISTINCT e.id) AS evidence_count
    FROM event_people ep
    JOIN event_places epl ON epl.event_id = ep.event_id
    JOIN events e ON e.id = ep.event_id
    JOIN people p ON p.id = ep.person_id
    JOIN places pl ON pl.id = epl.place_id
    WHERE e.status != 'Borrador' AND p.status != 'Borrador' AND pl.status != 'Borrador'
    GROUP BY ep.person_id, epl.place_id
  )
`).get().n ?? 0;

if (directPersonPlaceTable > 0) fail('Personaje↔Lugar: apareció una tabla directa person_places; revisar la clasificación derivada antes de publicar');
if (derivedPersonPlacePairs === 0) fail('Personaje↔Lugar: no se encontraron conexiones derivadas publicadas vía eventos');
if (derivedEvidenceEdges < derivedPersonPlacePairs) fail(`Personaje↔Lugar: evidencia insuficiente ${derivedEvidenceEdges} eventos para ${derivedPersonPlacePairs} pares derivados`);
if (maxDerivedEvidence < 1) fail('Personaje↔Lugar: ninguna conexión derivada tiene evento sustentador');

if (errors.length) {
  console.error("Conexiones editoriales: FAIL");
  errors.forEach((error) => console.error(`- ${error}`));
  db.close();
  process.exit(1);
}

console.log("Conexiones editoriales: PASS");
console.log(`Relaciones explícitas: ${relationSpecs.length} tablas · ${edgeCount} vínculos registrados`);
console.log(`Reciprocidad de consultas: ${relationSpecs.length}/${relationSpecs.length} tipos`);
console.log(`Reciprocidad UI explícita: ${uiSpecs.length}/${uiSpecs.length} tipos`);
console.log(`Inventario relacional exhaustivo: ${multiFkTables.length}/${multiFkTables.length} tablas multi-FK clasificadas · ${relationSpecs.length} editoriales · 1 estructural · 1 contenido bíblico`);
console.log(`Roles Evento↔Pasaje: ${eventPassageRoleStats.total} vínculos · ${eventPassageRoleStats.distinct_roles} relation_type editoriales · 0 vacíos`);
console.log(`Base bíblica de lecciones: ${lessonBookCoverage}/${publishedLessons} libro · ${lessonPassageCoverage}/${publishedLessons} pasaje`);
console.log(`Glosario↔Lecciones: ${glossaryEdges} vínculos publicados navegables`);
console.log(`Recursos visuales↔Lecciones: ${visualEdges} vínculos publicados navegables, incluso sin imagen final`);
console.log(`Conexiones derivadas: Personaje↔Lugar vía eventos · ${derivedPersonPlacePairs} pares · ${derivedPeople} personajes · ${derivedPlaces} lugares · ${multiEventDerivedPairs} pares con evidencia múltiple`);
console.log(`Evidencia derivada navegable: ${derivedEvidenceEdges} vínculos par→evento · máximo ${maxDerivedEvidence} eventos por par`);
db.close();
