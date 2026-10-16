INSERT INTO routes (
  id, title, slug, subtitle, description, level, estimated_duration, status
) VALUES (
  'rut-panorama-visual',
  'Panorama Visual de la Biblia',
  'panorama-visual-de-la-biblia',
  'La historia de Dios desde la creación hasta la nueva creación.',
  'Una ruta guiada para entender la Biblia como una sola historia centrada en Dios, la redención y el cumplimiento en Jesús.',
  'Básico',
  '20 lecciones de 7 a 10 minutos',
  'Publicado básico'
);

INSERT INTO books (
  id, name, slug, abbreviation, testament, order_number, category, genre, summary, status
) VALUES
('book-genesis', 'Génesis', 'genesis', 'Gn', 'Antiguo Testamento', 1, 'Pentateuco', 'Narrativa / Ley', 'Presenta el origen de la creación, el pecado, las naciones y la promesa de Dios.', 'Publicado básico'),
('book-exodo', 'Éxodo', 'exodo', 'Ex', 'Antiguo Testamento', 2, 'Pentateuco', 'Narrativa / Ley', 'Relata la liberación de Israel de Egipto y el pacto en Sinaí.', 'Publicado básico'),
('book-levitico', 'Levítico', 'levitico', 'Lv', 'Antiguo Testamento', 3, 'Pentateuco', 'Ley', 'Explica la santidad, los sacrificios y el sacerdocio en Israel.', 'Publicado básico'),
('book-numeros', 'Números', 'numeros', 'Nm', 'Antiguo Testamento', 4, 'Pentateuco', 'Narrativa / Ley', 'Describe el peregrinaje de Israel por el desierto.', 'Publicado básico'),
('book-deuteronomio', 'Deuteronomio', 'deuteronomio', 'Dt', 'Antiguo Testamento', 5, 'Pentateuco', 'Ley / Discurso', 'Moisés recuerda la Ley y llama a Israel a obedecer a Dios.', 'Publicado básico'),

('book-josue', 'Josué', 'josue', 'Jos', 'Antiguo Testamento', 6, 'Históricos', 'Narrativa histórica', 'Relata la entrada de Israel en la tierra prometida.', 'Publicado básico'),
('book-jueces', 'Jueces', 'jueces', 'Jue', 'Antiguo Testamento', 7, 'Históricos', 'Narrativa histórica', 'Muestra el ciclo de pecado, opresión, clamor y liberación en Israel.', 'Publicado básico'),
('book-rut', 'Rut', 'rut', 'Rt', 'Antiguo Testamento', 8, 'Históricos', 'Narrativa', 'Historia de fidelidad, redención familiar y la línea de David.', 'Publicado básico'),
('book-1-samuel', '1 Samuel', '1-samuel', '1 S', 'Antiguo Testamento', 9, 'Históricos', 'Narrativa histórica', 'Presenta a Samuel, Saúl y el comienzo del reinado de David.', 'Publicado básico'),
('book-2-samuel', '2 Samuel', '2-samuel', '2 S', 'Antiguo Testamento', 10, 'Históricos', 'Narrativa histórica', 'Relata el reinado de David y el pacto davídico.', 'Publicado básico'),
('book-1-reyes', '1 Reyes', '1-reyes', '1 R', 'Antiguo Testamento', 11, 'Históricos', 'Narrativa histórica', 'Describe el reinado de Salomón, el templo y la división del reino.', 'Publicado básico'),
('book-2-reyes', '2 Reyes', '2-reyes', '2 R', 'Antiguo Testamento', 12, 'Históricos', 'Narrativa histórica', 'Relata la caída de Israel y Judá y el camino al exilio.', 'Publicado básico'),
('book-1-cronicas', '1 Crónicas', '1-cronicas', '1 Cr', 'Antiguo Testamento', 13, 'Históricos', 'Narrativa histórica / genealogía', 'Repasa la historia de Israel con énfasis en David, el templo y la adoración.', 'Publicado básico'),
('book-2-cronicas', '2 Crónicas', '2-cronicas', '2 Cr', 'Antiguo Testamento', 14, 'Históricos', 'Narrativa histórica', 'Presenta la historia de los reyes de Judá con énfasis en el templo.', 'Publicado básico'),
('book-esdras', 'Esdras', 'esdras', 'Esd', 'Antiguo Testamento', 15, 'Históricos', 'Narrativa histórica', 'Relata el regreso del exilio y la restauración del templo y la Ley.', 'Publicado básico'),
('book-nehemias', 'Nehemías', 'nehemias', 'Neh', 'Antiguo Testamento', 16, 'Históricos', 'Narrativa histórica', 'Relata la reconstrucción de los muros de Jerusalén.', 'Publicado básico'),
('book-ester', 'Ester', 'ester', 'Est', 'Antiguo Testamento', 17, 'Históricos', 'Narrativa', 'Muestra la providencia de Dios al preservar a su pueblo.', 'Publicado básico'),

('book-job', 'Job', 'job', 'Job', 'Antiguo Testamento', 18, 'Poéticos', 'Sabiduría / poesía', 'Explora el sufrimiento, la justicia de Dios y la fidelidad en la prueba.', 'Publicado básico'),
('book-salmos', 'Salmos', 'salmos', 'Sal', 'Antiguo Testamento', 19, 'Poéticos', 'Poesía / oración / alabanza', 'Colección de cantos y oraciones para adorar, lamentar y confiar en Dios.', 'Publicado básico'),
('book-proverbios', 'Proverbios', 'proverbios', 'Pr', 'Antiguo Testamento', 20, 'Poéticos', 'Sabiduría', 'Enseña sabiduría práctica para vivir delante de Dios.', 'Publicado básico'),
('book-eclesiastes', 'Eclesiastés', 'eclesiastes', 'Ec', 'Antiguo Testamento', 21, 'Poéticos', 'Sabiduría', 'Reflexiona sobre la vida, la vanidad y el temor de Dios.', 'Publicado básico'),
('book-cantares', 'Cantares', 'cantares', 'Cnt', 'Antiguo Testamento', 22, 'Poéticos', 'Poesía', 'Celebra el amor dentro del marco del diseño de Dios.', 'Publicado básico'),

('book-isaias', 'Isaías', 'isaias', 'Is', 'Antiguo Testamento', 23, 'Profetas mayores', 'Profecía', 'Anuncia juicio, esperanza y la venida del Siervo del Señor.', 'Publicado básico'),
('book-jeremias', 'Jeremías', 'jeremias', 'Jer', 'Antiguo Testamento', 24, 'Profetas mayores', 'Profecía', 'Llama al arrepentimiento y anuncia el nuevo pacto.', 'Publicado básico'),
('book-lamentaciones', 'Lamentaciones', 'lamentaciones', 'Lm', 'Antiguo Testamento', 25, 'Profetas mayores', 'Lamento / poesía', 'Lamenta la destrucción de Jerusalén y reconoce la fidelidad de Dios.', 'Publicado básico'),
('book-ezequiel', 'Ezequiel', 'ezequiel', 'Ez', 'Antiguo Testamento', 26, 'Profetas mayores', 'Profecía', 'Habla del juicio, la gloria de Dios y la restauración futura.', 'Publicado básico'),
('book-daniel', 'Daniel', 'daniel', 'Dn', 'Antiguo Testamento', 27, 'Profetas mayores', 'Narrativa / profecía apocalíptica', 'Muestra la fidelidad de Dios sobre los reinos humanos.', 'Publicado básico'),

('book-oseas', 'Oseas', 'oseas', 'Os', 'Antiguo Testamento', 28, 'Profetas menores', 'Profecía', 'Muestra el amor fiel de Dios hacia un pueblo infiel.', 'Publicado básico'),
('book-joel', 'Joel', 'joel', 'Jl', 'Antiguo Testamento', 29, 'Profetas menores', 'Profecía', 'Anuncia el día del Señor y la promesa del Espíritu.', 'Publicado básico'),
('book-amos', 'Amós', 'amos', 'Am', 'Antiguo Testamento', 30, 'Profetas menores', 'Profecía', 'Denuncia la injusticia y llama a la rectitud.', 'Publicado básico'),
('book-abdias', 'Abdías', 'abdias', 'Abd', 'Antiguo Testamento', 31, 'Profetas menores', 'Profecía', 'Anuncia juicio contra Edom y esperanza para el pueblo de Dios.', 'Publicado básico'),
('book-jonas', 'Jonás', 'jonas', 'Jon', 'Antiguo Testamento', 32, 'Profetas menores', 'Narrativa profética', 'Muestra la misericordia de Dios hacia las naciones.', 'Publicado básico'),
('book-miqueas', 'Miqueas', 'miqueas', 'Mi', 'Antiguo Testamento', 33, 'Profetas menores', 'Profecía', 'Anuncia juicio, justicia y esperanza mesiánica.', 'Publicado básico'),
('book-nahum', 'Nahúm', 'nahum', 'Nah', 'Antiguo Testamento', 34, 'Profetas menores', 'Profecía', 'Anuncia juicio sobre Nínive.', 'Publicado básico'),
('book-habacuc', 'Habacuc', 'habacuc', 'Hab', 'Antiguo Testamento', 35, 'Profetas menores', 'Profecía / diálogo', 'Reflexiona sobre la justicia de Dios y la fe.', 'Publicado básico'),
('book-sofonias', 'Sofonías', 'sofonias', 'Sof', 'Antiguo Testamento', 36, 'Profetas menores', 'Profecía', 'Anuncia el día del Señor y la restauración.', 'Publicado básico'),
('book-hageo', 'Hageo', 'hageo', 'Hag', 'Antiguo Testamento', 37, 'Profetas menores', 'Profecía', 'Llama a reconstruir el templo después del exilio.', 'Publicado básico'),
('book-zacarias', 'Zacarías', 'zacarias', 'Zac', 'Antiguo Testamento', 38, 'Profetas menores', 'Profecía / visiones', 'Anuncia restauración y esperanza mesiánica.', 'Publicado básico'),
('book-malaquias', 'Malaquías', 'malaquias', 'Mal', 'Antiguo Testamento', 39, 'Profetas menores', 'Profecía', 'Llama al pueblo a volver a Dios y anuncia la venida del mensajero.', 'Publicado básico'),

('book-mateo', 'Mateo', 'mateo', 'Mt', 'Nuevo Testamento', 40, 'Evangelios', 'Evangelio', 'Presenta a Jesús como el Mesías y Rey prometido.', 'Publicado básico'),
('book-marcos', 'Marcos', 'marcos', 'Mr', 'Nuevo Testamento', 41, 'Evangelios', 'Evangelio', 'Presenta a Jesús como el Siervo poderoso que anuncia el reino.', 'Publicado básico'),
('book-lucas', 'Lucas', 'lucas', 'Lc', 'Nuevo Testamento', 42, 'Evangelios', 'Evangelio', 'Presenta la vida y obra de Jesús con énfasis en la salvación.', 'Publicado básico'),
('book-juan', 'Juan', 'juan', 'Jn', 'Nuevo Testamento', 43, 'Evangelios', 'Evangelio', 'Presenta a Jesús como el Hijo de Dios para que creamos en Él.', 'Publicado básico'),
('book-hechos', 'Hechos', 'hechos', 'Hch', 'Nuevo Testamento', 44, 'Historia de la iglesia', 'Narrativa histórica', 'Relata la expansión del evangelio por medio de la iglesia primitiva.', 'Publicado básico'),

('book-romanos', 'Romanos', 'romanos', 'Ro', 'Nuevo Testamento', 45, 'Cartas paulinas', 'Carta doctrinal', 'Expone el evangelio, la justicia de Dios y la vida en Cristo.', 'Publicado básico'),
('book-1-corintios', '1 Corintios', '1-corintios', '1 Co', 'Nuevo Testamento', 46, 'Cartas paulinas', 'Carta', 'Corrige problemas de la iglesia y enseña sobre la vida cristiana.', 'Publicado básico'),
('book-2-corintios', '2 Corintios', '2-corintios', '2 Co', 'Nuevo Testamento', 47, 'Cartas paulinas', 'Carta', 'Defiende el ministerio apostólico y muestra la gracia de Dios en la debilidad.', 'Publicado básico'),
('book-galatas', 'Gálatas', 'galatas', 'Gá', 'Nuevo Testamento', 48, 'Cartas paulinas', 'Carta doctrinal', 'Defiende la justificación por la fe y la libertad en Cristo.', 'Publicado básico'),
('book-efesios', 'Efesios', 'efesios', 'Ef', 'Nuevo Testamento', 49, 'Cartas paulinas', 'Carta doctrinal', 'Explica la identidad de la iglesia en Cristo.', 'Publicado básico'),
('book-filipenses', 'Filipenses', 'filipenses', 'Fil', 'Nuevo Testamento', 50, 'Cartas paulinas', 'Carta', 'Llama al gozo, la humildad y la perseverancia en Cristo.', 'Publicado básico'),
('book-colosenses', 'Colosenses', 'colosenses', 'Col', 'Nuevo Testamento', 51, 'Cartas paulinas', 'Carta doctrinal', 'Presenta la supremacía de Cristo sobre todas las cosas.', 'Publicado básico'),
('book-1-tesalonicenses', '1 Tesalonicenses', '1-tesalonicenses', '1 Ts', 'Nuevo Testamento', 52, 'Cartas paulinas', 'Carta', 'Anima a la iglesia a vivir en santidad y esperanza.', 'Publicado básico'),
('book-2-tesalonicenses', '2 Tesalonicenses', '2-tesalonicenses', '2 Ts', 'Nuevo Testamento', 53, 'Cartas paulinas', 'Carta', 'Aclara enseñanzas sobre la venida del Señor y la perseverancia.', 'Publicado básico'),
('book-1-timoteo', '1 Timoteo', '1-timoteo', '1 Ti', 'Nuevo Testamento', 54, 'Cartas pastorales', 'Carta pastoral', 'Instruye sobre la vida y el orden de la iglesia.', 'Publicado básico'),
('book-2-timoteo', '2 Timoteo', '2-timoteo', '2 Ti', 'Nuevo Testamento', 55, 'Cartas pastorales', 'Carta pastoral', 'Anima a perseverar fielmente en la Palabra y el ministerio.', 'Publicado básico'),
('book-tito', 'Tito', 'tito', 'Tit', 'Nuevo Testamento', 56, 'Cartas pastorales', 'Carta pastoral', 'Instruye sobre liderazgo, doctrina sana y buenas obras.', 'Publicado básico'),
('book-filemon', 'Filemón', 'filemon', 'Flm', 'Nuevo Testamento', 57, 'Cartas paulinas', 'Carta personal', 'Muestra el perdón y la reconciliación en Cristo.', 'Publicado básico'),

('book-hebreos', 'Hebreos', 'hebreos', 'He', 'Nuevo Testamento', 58, 'Cartas generales', 'Exhortación / carta', 'Presenta a Cristo como superior y cumplimiento del sacerdocio y los sacrificios.', 'Publicado básico'),
('book-santiago', 'Santiago', 'santiago', 'Stg', 'Nuevo Testamento', 59, 'Cartas generales', 'Carta práctica', 'Enseña una fe viva que se expresa en obras.', 'Publicado básico'),
('book-1-pedro', '1 Pedro', '1-pedro', '1 P', 'Nuevo Testamento', 60, 'Cartas generales', 'Carta', 'Anima a sufrir fielmente con esperanza en Cristo.', 'Publicado básico'),
('book-2-pedro', '2 Pedro', '2-pedro', '2 P', 'Nuevo Testamento', 61, 'Cartas generales', 'Carta', 'Advierte contra falsos maestros y llama a crecer en la gracia.', 'Publicado básico'),
('book-1-juan', '1 Juan', '1-juan', '1 Jn', 'Nuevo Testamento', 62, 'Cartas generales', 'Carta', 'Enseña sobre la vida eterna, el amor y la verdad en Cristo.', 'Publicado básico'),
('book-2-juan', '2 Juan', '2-juan', '2 Jn', 'Nuevo Testamento', 63, 'Cartas generales', 'Carta', 'Llama a permanecer en la verdad y el amor.', 'Publicado básico'),
('book-3-juan', '3 Juan', '3-juan', '3 Jn', 'Nuevo Testamento', 64, 'Cartas generales', 'Carta', 'Anima la hospitalidad y la fidelidad en la verdad.', 'Publicado básico'),
('book-judas', 'Judas', 'judas', 'Jud', 'Nuevo Testamento', 65, 'Cartas generales', 'Carta', 'Exhorta a contender por la fe y resistir el error.', 'Publicado básico'),
('book-apocalipsis', 'Apocalipsis', 'apocalipsis', 'Ap', 'Nuevo Testamento', 66, 'Profecía / Apocalíptico', 'Apocalíptico / profecía', 'Muestra la victoria final de Cristo y la nueva creación.', 'Publicado básico'
);

UPDATE books
SET usfm_code = CASE id
  WHEN 'book-genesis' THEN 'GEN'
  WHEN 'book-exodo' THEN 'EXO'
  WHEN 'book-levitico' THEN 'LEV'
  WHEN 'book-numeros' THEN 'NUM'
  WHEN 'book-deuteronomio' THEN 'DEU'
  WHEN 'book-josue' THEN 'JOS'
  WHEN 'book-jueces' THEN 'JDG'
  WHEN 'book-rut' THEN 'RUT'
  WHEN 'book-1-samuel' THEN '1SA'
  WHEN 'book-2-samuel' THEN '2SA'
  WHEN 'book-1-reyes' THEN '1KI'
  WHEN 'book-2-reyes' THEN '2KI'
  WHEN 'book-1-cronicas' THEN '1CH'
  WHEN 'book-2-cronicas' THEN '2CH'
  WHEN 'book-esdras' THEN 'EZR'
  WHEN 'book-nehemias' THEN 'NEH'
  WHEN 'book-ester' THEN 'EST'
  WHEN 'book-job' THEN 'JOB'
  WHEN 'book-salmos' THEN 'PSA'
  WHEN 'book-proverbios' THEN 'PRO'
  WHEN 'book-eclesiastes' THEN 'ECC'
  WHEN 'book-cantares' THEN 'SNG'
  WHEN 'book-isaias' THEN 'ISA'
  WHEN 'book-jeremias' THEN 'JER'
  WHEN 'book-lamentaciones' THEN 'LAM'
  WHEN 'book-ezequiel' THEN 'EZK'
  WHEN 'book-daniel' THEN 'DAN'
  WHEN 'book-oseas' THEN 'HOS'
  WHEN 'book-joel' THEN 'JOL'
  WHEN 'book-amos' THEN 'AMO'
  WHEN 'book-abdias' THEN 'OBA'
  WHEN 'book-jonas' THEN 'JON'
  WHEN 'book-miqueas' THEN 'MIC'
  WHEN 'book-nahum' THEN 'NAM'
  WHEN 'book-habacuc' THEN 'HAB'
  WHEN 'book-sofonias' THEN 'ZEP'
  WHEN 'book-hageo' THEN 'HAG'
  WHEN 'book-zacarias' THEN 'ZEC'
  WHEN 'book-malaquias' THEN 'MAL'
  WHEN 'book-mateo' THEN 'MAT'
  WHEN 'book-marcos' THEN 'MRK'
  WHEN 'book-lucas' THEN 'LUK'
  WHEN 'book-juan' THEN 'JHN'
  WHEN 'book-hechos' THEN 'ACT'
  WHEN 'book-romanos' THEN 'ROM'
  WHEN 'book-1-corintios' THEN '1CO'
  WHEN 'book-2-corintios' THEN '2CO'
  WHEN 'book-galatas' THEN 'GAL'
  WHEN 'book-efesios' THEN 'EPH'
  WHEN 'book-filipenses' THEN 'PHP'
  WHEN 'book-colosenses' THEN 'COL'
  WHEN 'book-1-tesalonicenses' THEN '1TH'
  WHEN 'book-2-tesalonicenses' THEN '2TH'
  WHEN 'book-1-timoteo' THEN '1TI'
  WHEN 'book-2-timoteo' THEN '2TI'
  WHEN 'book-tito' THEN 'TIT'
  WHEN 'book-filemon' THEN 'PHM'
  WHEN 'book-hebreos' THEN 'HEB'
  WHEN 'book-santiago' THEN 'JAS'
  WHEN 'book-1-pedro' THEN '1PE'
  WHEN 'book-2-pedro' THEN '2PE'
  WHEN 'book-1-juan' THEN '1JN'
  WHEN 'book-2-juan' THEN '2JN'
  WHEN 'book-3-juan' THEN '3JN'
  WHEN 'book-judas' THEN 'JUD'
  WHEN 'book-apocalipsis' THEN 'REV'
END;

INSERT INTO book_translations (
  book_id,
  language,
  name,
  slug,
  abbreviation,
  testament,
  category,
  genre,
  summary
)
SELECT
  id,
  'es',
  name,
  slug,
  abbreviation,
  testament,
  category,
  genre,
  summary
FROM books;

INSERT INTO book_translations (
  book_id,
  language,
  name,
  slug,
  abbreviation,
  testament,
  category,
  genre,
  summary
) VALUES
('book-genesis', 'en', 'Genesis', 'genesis', 'Gen', 'Old Testament', NULL, NULL, NULL),
('book-exodo', 'en', 'Exodus', 'exodus', 'Exod', 'Old Testament', NULL, NULL, NULL),
('book-levitico', 'en', 'Leviticus', 'leviticus', 'Lev', 'Old Testament', NULL, NULL, NULL),
('book-numeros', 'en', 'Numbers', 'numbers', 'Num', 'Old Testament', NULL, NULL, NULL),
('book-deuteronomio', 'en', 'Deuteronomy', 'deuteronomy', 'Deut', 'Old Testament', NULL, NULL, NULL),

('book-josue', 'en', 'Joshua', 'joshua', 'Josh', 'Old Testament', NULL, NULL, NULL),
('book-jueces', 'en', 'Judges', 'judges', 'Judg', 'Old Testament', NULL, NULL, NULL),
('book-rut', 'en', 'Ruth', 'ruth', 'Ruth', 'Old Testament', NULL, NULL, NULL),
('book-1-samuel', 'en', '1 Samuel', '1-samuel', '1 Sam', 'Old Testament', NULL, NULL, NULL),
('book-2-samuel', 'en', '2 Samuel', '2-samuel', '2 Sam', 'Old Testament', NULL, NULL, NULL),
('book-1-reyes', 'en', '1 Kings', '1-kings', '1 Kgs', 'Old Testament', NULL, NULL, NULL),
('book-2-reyes', 'en', '2 Kings', '2-kings', '2 Kgs', 'Old Testament', NULL, NULL, NULL),
('book-1-cronicas', 'en', '1 Chronicles', '1-chronicles', '1 Chr', 'Old Testament', NULL, NULL, NULL),
('book-2-cronicas', 'en', '2 Chronicles', '2-chronicles', '2 Chr', 'Old Testament', NULL, NULL, NULL),
('book-esdras', 'en', 'Ezra', 'ezra', 'Ezra', 'Old Testament', NULL, NULL, NULL),
('book-nehemias', 'en', 'Nehemiah', 'nehemiah', 'Neh', 'Old Testament', NULL, NULL, NULL),
('book-ester', 'en', 'Esther', 'esther', 'Esth', 'Old Testament', NULL, NULL, NULL),

('book-job', 'en', 'Job', 'job', 'Job', 'Old Testament', NULL, NULL, NULL),
('book-salmos', 'en', 'Psalms', 'psalms', 'Ps', 'Old Testament', NULL, NULL, NULL),
('book-proverbios', 'en', 'Proverbs', 'proverbs', 'Prov', 'Old Testament', NULL, NULL, NULL),
('book-eclesiastes', 'en', 'Ecclesiastes', 'ecclesiastes', 'Eccl', 'Old Testament', NULL, NULL, NULL),
('book-cantares', 'en', 'Solomon''s Song', 'solomons-song', 'Song', 'Old Testament', NULL, NULL, NULL),

('book-isaias', 'en', 'Isaiah', 'isaiah', 'Isa', 'Old Testament', NULL, NULL, NULL),
('book-jeremias', 'en', 'Jeremiah', 'jeremiah', 'Jer', 'Old Testament', NULL, NULL, NULL),
('book-lamentaciones', 'en', 'Lamentations', 'lamentations', 'Lam', 'Old Testament', NULL, NULL, NULL),
('book-ezequiel', 'en', 'Ezekiel', 'ezekiel', 'Ezek', 'Old Testament', NULL, NULL, NULL),
('book-daniel', 'en', 'Daniel', 'daniel', 'Dan', 'Old Testament', NULL, NULL, NULL),

('book-oseas', 'en', 'Hosea', 'hosea', 'Hos', 'Old Testament', NULL, NULL, NULL),
('book-joel', 'en', 'Joel', 'joel', 'Joel', 'Old Testament', NULL, NULL, NULL),
('book-amos', 'en', 'Amos', 'amos', 'Amos', 'Old Testament', NULL, NULL, NULL),
('book-abdias', 'en', 'Obadiah', 'obadiah', 'Obad', 'Old Testament', NULL, NULL, NULL),
('book-jonas', 'en', 'Jonah', 'jonah', 'Jonah', 'Old Testament', NULL, NULL, NULL),
('book-miqueas', 'en', 'Micah', 'micah', 'Mic', 'Old Testament', NULL, NULL, NULL),
('book-nahum', 'en', 'Nahum', 'nahum', 'Nah', 'Old Testament', NULL, NULL, NULL),
('book-habacuc', 'en', 'Habakkuk', 'habakkuk', 'Hab', 'Old Testament', NULL, NULL, NULL),
('book-sofonias', 'en', 'Zephaniah', 'zephaniah', 'Zeph', 'Old Testament', NULL, NULL, NULL),
('book-hageo', 'en', 'Haggai', 'haggai', 'Hag', 'Old Testament', NULL, NULL, NULL),
('book-zacarias', 'en', 'Zechariah', 'zechariah', 'Zech', 'Old Testament', NULL, NULL, NULL),
('book-malaquias', 'en', 'Malachi', 'malachi', 'Mal', 'Old Testament', NULL, NULL, NULL),

('book-mateo', 'en', 'Matthew', 'matthew', 'Matt', 'New Testament', NULL, NULL, NULL),
('book-marcos', 'en', 'Mark', 'mark', 'Mark', 'New Testament', NULL, NULL, NULL),
('book-lucas', 'en', 'Luke', 'luke', 'Luke', 'New Testament', NULL, NULL, NULL),
('book-juan', 'en', 'John', 'john', 'John', 'New Testament', NULL, NULL, NULL),
('book-hechos', 'en', 'Acts', 'acts', 'Acts', 'New Testament', NULL, NULL, NULL),

('book-romanos', 'en', 'Romans', 'romans', 'Rom', 'New Testament', NULL, NULL, NULL),
('book-1-corintios', 'en', '1 Corinthians', '1-corinthians', '1 Cor', 'New Testament', NULL, NULL, NULL),
('book-2-corintios', 'en', '2 Corinthians', '2-corinthians', '2 Cor', 'New Testament', NULL, NULL, NULL),
('book-galatas', 'en', 'Galatians', 'galatians', 'Gal', 'New Testament', NULL, NULL, NULL),
('book-efesios', 'en', 'Ephesians', 'ephesians', 'Eph', 'New Testament', NULL, NULL, NULL),
('book-filipenses', 'en', 'Philippians', 'philippians', 'Phil', 'New Testament', NULL, NULL, NULL),
('book-colosenses', 'en', 'Colossians', 'colossians', 'Col', 'New Testament', NULL, NULL, NULL),
('book-1-tesalonicenses', 'en', '1 Thessalonians', '1-thessalonians', '1 Thess', 'New Testament', NULL, NULL, NULL),
('book-2-tesalonicenses', 'en', '2 Thessalonians', '2-thessalonians', '2 Thess', 'New Testament', NULL, NULL, NULL),
('book-1-timoteo', 'en', '1 Timothy', '1-timothy', '1 Tim', 'New Testament', NULL, NULL, NULL),
('book-2-timoteo', 'en', '2 Timothy', '2-timothy', '2 Tim', 'New Testament', NULL, NULL, NULL),
('book-tito', 'en', 'Titus', 'titus', 'Titus', 'New Testament', NULL, NULL, NULL),
('book-filemon', 'en', 'Philemon', 'philemon', 'Phlm', 'New Testament', NULL, NULL, NULL),

('book-hebreos', 'en', 'Hebrews', 'hebrews', 'Heb', 'New Testament', NULL, NULL, NULL),
('book-santiago', 'en', 'James', 'james', 'Jas', 'New Testament', NULL, NULL, NULL),
('book-1-pedro', 'en', '1 Peter', '1-peter', '1 Pet', 'New Testament', NULL, NULL, NULL),
('book-2-pedro', 'en', '2 Peter', '2-peter', '2 Pet', 'New Testament', NULL, NULL, NULL),
('book-1-juan', 'en', '1 John', '1-john', '1 John', 'New Testament', NULL, NULL, NULL),
('book-2-juan', 'en', '2 John', '2-john', '2 John', 'New Testament', NULL, NULL, NULL),
('book-3-juan', 'en', '3 John', '3-john', '3 John', 'New Testament', NULL, NULL, NULL),
('book-judas', 'en', 'Jude', 'jude', 'Jude', 'New Testament', NULL, NULL, NULL),
('book-apocalipsis', 'en', 'Revelation', 'revelation', 'Rev', 'New Testament', NULL, NULL, NULL);

INSERT INTO bible_versions (
  id,
  name,
  abbreviation,
  language,
  copyright_status,
  copyright_notice,
  license_notes,
  permission_scope,
  source_notes,
  status
) VALUES
(
  'rvr1960',
  'Reina-Valera 1960',
  'RVR1960',
  'es',
  'Copyright / uso bajo licencia',
  'Texto bíblico: Reina-Valera 1960® © Sociedades Bíblicas en América Latina, 1960. Derechos renovados © Sociedades Bíblicas Unidas, 1988. Usado con permiso.',
  'La versión Reina-Valera 1960® es una marca registrada y su uso debe ajustarse a la licencia/permiso obtenido.',
  'Uso autorizado en Bibli conforme al permiso aplicable.',
  'Fuente local de importación no distribuida con el repositorio.',
  'Publicado básico'
);

INSERT INTO bible_versions (
  id,
  name,
  abbreviation,
  language,
  copyright_status,
  copyright_notice,
  license_notes,
  permission_scope,
  source_notes,
  status
) VALUES
(
  'kjv',
  'King James Version',
  'KJV',
  'en',
  'Public Domain',
  'King James Version, edición de 1769.',
  'La fuente digital utilizada declara el texto como Public Domain.',
  'Uso como texto bíblico en Bibli.',
  'Fuente de importación: farskipper/kjv, archivo json/verses-1769.json (KJV 1769).',
  'Publicado básico'
);

INSERT INTO bible_chapters (id, book_id, chapter_number) VALUES
('chap-genesis-1', 'book-genesis', 1),
('chap-genesis-2', 'book-genesis', 2),
('chap-genesis-3', 'book-genesis', 3),
('chap-mateo-1', 'book-mateo', 1),
('chap-lucas-2', 'book-lucas', 2),
('chap-lucas-24', 'book-lucas', 24),
('chap-juan-1', 'book-juan', 1),
('chap-juan-5', 'book-juan', 5),
('chap-2-timoteo-3', 'book-2-timoteo', 3),
('chap-salmos-19', 'book-salmos', 19),
('chap-apocalipsis-21', 'book-apocalipsis', 21),
('chap-apocalipsis-22', 'book-apocalipsis', 22);

INSERT INTO passages (
  id, display_reference, slug, book_id, start_chapter, start_verse,
  end_chapter, end_verse, summary, status
) VALUES
(
  'pas-lucas-24-27',
  'Lucas 24:27',
  'lucas-24-27',
  'book-lucas',
  24,
  27,
  24,
  27,
  'Jesús explicó cómo las Escrituras apuntaban hacia Él.',
  'Publicado básico'
),
(
  'pas-lucas-24-44',
  'Lucas 24:44',
  'lucas-24-44',
  'book-lucas',
  24,
  44,
  24,
  44,
  'Jesús habló de lo escrito acerca de Él en la Ley, los Profetas y los Salmos.',
  'Publicado básico'
),
(
  'pas-juan-5-39',
  'Juan 5:39',
  'juan-5-39',
  'book-juan',
  5,
  39,
  5,
  39,
  'Las Escrituras dan testimonio de Jesús.',
  'Publicado básico'
),
(
  'pas-2-timoteo-3-16-17',
  '2 Timoteo 3:16-17',
  '2-timoteo-3-16-17',
  'book-2-timoteo',
  3,
  16,
  3,
  17,
  'La Escritura es útil para enseñar, corregir e instruir.',
  'Publicado básico'
),
(
  'pas-genesis-1-2',
  'Génesis 1–2',
  'genesis-1-2',
  'book-genesis',
  1,
  NULL,
  2,
  NULL,
  'Dios crea todas las cosas y establece el orden de la creación.',
  'Publicado básico'
),
(
  'pas-genesis-3',
  'Génesis 3',
  'genesis-3',
  'book-genesis',
  3,
  NULL,
  3,
  NULL,
  'Relata la caída, la entrada del pecado y la primera promesa de redención.',
  'Publicado básico'
),
(
  'pas-genesis-3-15',
  'Génesis 3:15',
  'genesis-3-15',
  'book-genesis',
  3,
  15,
  3,
  15,
  'Primera promesa de victoria sobre el mal.',
  'Publicado básico'
),
(
  'pas-mateo-1-18-25',
  'Mateo 1:18-25',
  'mateo-1-18-25',
  'book-mateo',
  1,
  18,
  1,
  25,
  'Anuncio y nacimiento de Jesús como cumplimiento de la promesa.',
  'Publicado básico'
),
(
  'pas-lucas-2-1-20',
  'Lucas 2:1-20',
  'lucas-2-1-20',
  'book-lucas',
  2,
  1,
  2,
  20,
  'Nacimiento de Jesús y anuncio a los pastores.',
  'Publicado básico'
),
(
  'pas-juan-1-1-18',
  'Juan 1:1-18',
  'juan-1-1-18',
  'book-juan',
  1,
  1,
  1,
  18,
  'Jesús es presentado como el Verbo hecho carne.',
  'Publicado básico'
),
(
  'pas-apocalipsis-21-22',
  'Apocalipsis 21–22',
  'apocalipsis-21-22',
  'book-apocalipsis',
  21,
  NULL,
  22,
  NULL,
  'Esperanza final de la nueva creación.',
  'Publicado básico'
),
(
  'pas-salmo-19-1',
  'Salmo 19:1',
  'salmo-19-1',
  'book-salmos',
  19,
  1,
  19,
  1,
  'Los cielos cuentan la gloria de Dios.',
  'Publicado básico'
),
(
  'pas-juan-1-3',
  'Juan 1:3',
  'juan-1-3',
  'book-juan',
  1,
  3,
  1,
  3,
  'Todas las cosas fueron hechas por medio de Cristo.',
  'Publicado básico'
);

INSERT INTO lessons (id, route_id, lesson_number, title, slug, status) VALUES
('lec-biblia-una-sola-historia', 'rut-panorama-visual', 1, 'La Biblia como una sola historia', 'la-biblia-como-una-sola-historia', 'Borrador'),
('lec-dios-crea-todas-las-cosas', 'rut-panorama-visual', 2, 'Dios crea todas las cosas', 'dios-crea-todas-las-cosas', 'Borrador'),
('lec-caida-y-pecado', 'rut-panorama-visual', 3, 'La caída y el pecado', 'la-caida-y-el-pecado', 'Borrador'),
('lec-primera-promesa-redencion', 'rut-panorama-visual', 4, 'La primera promesa de redención', 'la-primera-promesa-de-redencion', 'Borrador'),
('lec-noe-juicio-misericordia', 'rut-panorama-visual', 5, 'Noé, el juicio y la misericordia', 'noe-el-juicio-y-la-misericordia', 'Borrador'),
('lec-babel-y-naciones', 'rut-panorama-visual', 6, 'Babel y las naciones', 'babel-y-las-naciones', 'Borrador'),
('lec-abraham-y-promesa', 'rut-panorama-visual', 7, 'Abraham y la promesa', 'abraham-y-la-promesa', 'Borrador'),
('lec-pacto-con-abraham', 'rut-panorama-visual', 8, 'El pacto con Abraham', 'el-pacto-con-abraham', 'Borrador'),
('lec-isaac-jacob-tribus', 'rut-panorama-visual', 9, 'Isaac, Jacob y las doce tribus', 'isaac-jacob-y-las-doce-tribus', 'Borrador'),
('lec-jose-y-egipto', 'rut-panorama-visual', 10, 'José y Egipto', 'jose-y-egipto', 'Borrador'),
('lec-moises-y-exodo', 'rut-panorama-visual', 11, 'Moisés y el Éxodo', 'moises-y-el-exodo', 'Borrador'),
('lec-ley-pacto-sinai', 'rut-panorama-visual', 12, 'La ley y el pacto en Sinaí', 'la-ley-y-el-pacto-en-sinai', 'Borrador'),
('lec-tabernaculo-presencia', 'rut-panorama-visual', 13, 'El tabernáculo y la presencia de Dios', 'el-tabernaculo-y-la-presencia-de-dios', 'Borrador'),
('lec-tierra-prometida', 'rut-panorama-visual', 14, 'La tierra prometida', 'la-tierra-prometida', 'Borrador'),
('lec-jueces-necesidad-rey', 'rut-panorama-visual', 15, 'Los jueces y la necesidad de un rey', 'los-jueces-y-la-necesidad-de-un-rey', 'Borrador'),
('lec-david-y-reino', 'rut-panorama-visual', 16, 'David y el reino', 'david-y-el-reino', 'Borrador'),
('lec-templo-y-adoracion', 'rut-panorama-visual', 17, 'El templo y la adoración', 'el-templo-y-la-adoracion', 'Borrador'),
('lec-profetas-exilio-esperanza', 'rut-panorama-visual', 18, 'Profetas, exilio y esperanza', 'profetas-exilio-y-esperanza', 'Borrador'),
('lec-jesus-mesias-prometido', 'rut-panorama-visual', 19, 'Jesús, el Mesías prometido', 'jesus-el-mesias-prometido', 'Borrador'),
('lec-cruz-resurreccion-iglesia-nueva-creacion', 'rut-panorama-visual', 20, 'Cruz, resurrección, iglesia y nueva creación', 'cruz-resurreccion-iglesia-y-nueva-creacion', 'Borrador');

INSERT INTO topics (id, title, slug, definition, status) VALUES
('tem-redencion', 'Redención', 'redencion', 'Dios rescata y libera a su pueblo del pecado, la esclavitud y la muerte.', 'Publicado básico'),
('tem-mesias', 'Mesías', 'mesias', 'El Ungido prometido por Dios, cumplido en Jesús.', 'Publicado básico'),
('tem-evangelio', 'Evangelio', 'evangelio', 'La buena noticia de salvación en Jesús.', 'Publicado básico'),
('tem-creacion', 'Creación', 'creacion', 'Dios hizo todas las cosas con propósito.', 'Publicado básico'),
('tem-nueva-creacion', 'Nueva creación', 'nueva-creacion', 'La restauración final de todas las cosas por Dios.', 'Publicado básico');

INSERT INTO events (id, title, slug, event_type, summary, description, biblical_period,
  approximate_date, chronological_order, temporal_certainty, geographical_certainty,
  appears_on_timeline, appears_on_map, status) VALUES
( 'eve-historia-biblica-general', 'Historia bíblica general', 'historia-biblica-general', 'Panorama', 'La gran historia de la Biblia desde la creación hasta la nueva creación.', 'Este evento panorámico resume el hilo principal de la Biblia: creación, caída, promesa, redención en Jesús, iglesia y nueva creación.', 'Panorama bíblico', 'Desde Génesis hasta Apocalipsis', 1, 'Conceptual', 'No aplica', 1, 0, 'Publicado básico'),
( 'eve-creacion', 'Creación',
  'creacion',
  'Creación',
  'Dios crea todas las cosas con propósito.',
  'La Biblia presenta a Dios como Creador de los cielos, la tierra y todo lo que existe.',
  'Orígenes',
  'Inicio de la historia bíblica',
  2,
  'Conceptual',
  'No aplica',
  1,
  0,
  'Publicado básico'
),
(
  'eve-caida',
  'La caída',
  'la-caida',
  'Pecado / rebelión',
  'El pecado entra en la historia humana y rompe la relación con Dios.',
  'La caída muestra la desobediencia humana y sus consecuencias sobre la humanidad y la creación.',
  'Orígenes',
  'Después de la creación',
  3,
  'Conceptual',
  'No aplica',
  1,
  0,
  'Publicado básico'
),
(
  'eve-promesa-redencion',
  'Primera promesa de redención',
  'primera-promesa-de-redencion',
  'Promesa',
  'Dios anuncia esperanza y victoria sobre el mal.',
  'Desde el inicio, Dios muestra que el pecado no tendrá la última palabra y anuncia una promesa de victoria.',
  'Orígenes',
  'Después de la caída',
  4,
  'Conceptual',
  'No aplica',
  1,
  0,
  'Publicado básico'
),
(
  'eve-venida-de-jesus',
  'Venida de Jesús',
  'venida-de-jesus',
  'Cumplimiento mesiánico',
  'Jesús viene como el Mesías prometido y centro de la historia bíblica.',
  'El Nuevo Testamento presenta a Jesús como el cumplimiento de las promesas, figuras y esperanzas del Antiguo Testamento.',
  'Nuevo Testamento',
  'Siglo I d.C.',
  19,
  'Alta',
  'Alta',
  1,
  1,
  'Publicado básico'
);

INSERT INTO people (id, name, slug, summary, status) VALUES
('per-jesus', 'Jesús', 'jesus', 'El Hijo de Dios, Mesías prometido y centro de la historia bíblica.', 'Publicado básico'),
('per-moises', 'Moisés', 'moises', 'Siervo de Dios usado para liberar a Israel y entregar la Ley.', 'Publicado básico'),
('per-profetas', 'Los profetas', 'profetas', 'Mensajeros de Dios que llamaron al arrepentimiento y anunciaron esperanza.', 'Publicado básico'),
('per-apostoles', 'Los apóstoles', 'apostoles', 'Testigos enviados para anunciar a Jesús y enseñar a la iglesia.', 'Publicado básico');

INSERT INTO places (
  id, name, slug, place_type, summary, latitude, longitude, map_zoom,
  geographical_certainty, status
) VALUES
(
  'lug-jerusalen',
  'Jerusalén',
  'jerusalen',
  'Ciudad',
  'Ciudad central en la historia bíblica, relacionada con el templo, Jesús y la iglesia primitiva.',
  31.7780,
  35.2354,
  10,
  'Alta',
  'Publicado básico'
),
(
  'lug-camino-emaus',
  'Camino a Emaús',
  'camino-a-emaus',
  'Ruta',
  'Lugar asociado con la explicación de Jesús sobre las Escrituras después de su resurrección. La ubicación exacta de Emaús es debatida.',
  31.8340,
  35.0300,
  10,
  'Debatida',
  'Publicado básico'
);

INSERT INTO glossary_terms (id, term, slug, definition, status) VALUES
('glo-biblia', 'Biblia', 'biblia', 'Conjunto de escritos inspirados que revelan quién es Dios, su voluntad y su plan de redención.', 'Publicado básico'),
('glo-redencion', 'Redención', 'redencion', 'Rescate o liberación realizada por Dios.', 'Publicado básico'),
('glo-mesias', 'Mesías', 'mesias', 'El Ungido prometido por Dios.', 'Publicado básico'),
('glo-evangelio', 'Evangelio', 'evangelio', 'La buena noticia de salvación en Jesús.', 'Publicado básico');

INSERT INTO visual_resources (id, title, slug, resource_type, description, alt_text, url, status) VALUES
('vis-biblia-en-una-linea', 'La Biblia en una línea', 'la-biblia-en-una-linea', 'Infografía', 'Secuencia visual de la historia bíblica: creación, caída, promesa, Israel, Jesús, iglesia y nueva creación.', 'Infografía con las grandes etapas de la historia bíblica.', NULL, 'Idea');

INSERT INTO event_topics (event_id, topic_id) VALUES
('eve-historia-biblica-general', 'tem-redencion'),
('eve-historia-biblica-general', 'tem-mesias'),
('eve-historia-biblica-general', 'tem-evangelio'),
('eve-creacion', 'tem-creacion'),
('eve-promesa-redencion', 'tem-redencion'),
('eve-promesa-redencion', 'tem-mesias'),
('eve-venida-de-jesus', 'tem-mesias'),
('eve-venida-de-jesus', 'tem-evangelio'),
('eve-venida-de-jesus', 'tem-redencion');

INSERT INTO event_books (event_id, book_id) VALUES
('eve-historia-biblica-general', 'book-genesis'),
('eve-historia-biblica-general', 'book-lucas'),
('eve-historia-biblica-general', 'book-juan'),
('eve-historia-biblica-general', 'book-apocalipsis'),
('eve-creacion', 'book-genesis'),
('eve-caida', 'book-genesis'),
('eve-promesa-redencion', 'book-genesis'),
('eve-venida-de-jesus', 'book-mateo'),
('eve-venida-de-jesus', 'book-lucas'),
('eve-venida-de-jesus', 'book-juan');

INSERT INTO event_passages (event_id, passage_id, relation_type, position) VALUES
('eve-historia-biblica-general', 'pas-genesis-1-2', 'panorama', 1),
('eve-historia-biblica-general', 'pas-lucas-24-27', 'panorama', 2),
('eve-historia-biblica-general', 'pas-apocalipsis-21-22', 'panorama', 3),
('eve-creacion', 'pas-genesis-1-2', 'principal', 1),
('eve-caida', 'pas-genesis-3', 'principal', 1),
('eve-promesa-redencion', 'pas-genesis-3-15', 'principal', 1),
('eve-venida-de-jesus', 'pas-mateo-1-18-25', 'principal', 1),
('eve-venida-de-jesus', 'pas-lucas-2-1-20', 'principal', 2),
('eve-venida-de-jesus', 'pas-juan-1-1-18', 'principal', 3);

INSERT INTO event_people (event_id, person_id) VALUES
('eve-historia-biblica-general', 'per-jesus'),
('eve-historia-biblica-general', 'per-moises'),
('eve-historia-biblica-general', 'per-profetas'),
('eve-historia-biblica-general', 'per-apostoles'),
('eve-venida-de-jesus', 'per-jesus');

INSERT INTO event_places (event_id, place_id) VALUES
('eve-historia-biblica-general', 'lug-jerusalen'),
('eve-venida-de-jesus', 'lug-jerusalen');