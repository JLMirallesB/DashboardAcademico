/* El informe entero, generado de verdad — pruebas/informe-completo.mjs
 *
 *   node pruebas/informe-completo.mjs
 *
 * Las demás pruebas del informe miran lo que DICE cada pieza. Esta ejecuta el
 * generador completo, las quince secciones seguidas, y lee el PDF que sale.
 *
 * Existe por un agujero concreto: `generarInformePDF` está envuelto en un
 * `try/catch` que manda cualquier error a `onError`, y la aplicación lo enseña
 * como «error al generar el informe». Así que **una sección que reviente con
 * ciertos datos no deja rastro**: ni en la consola de quien lo sufre, ni en
 * ninguna prueba. Y las secciones son quince, cada una con sus condiciones —
 * hay ramas que solo se ejecutan en modo TODOS, o con filtro de agrupación, o
 * con un solo trimestre cargado—.
 *
 * jsPDF corre en Node sin navegador. Lo único que no se puede es `save()`, y
 * por eso el generador acepta `guardar`.
 */
import { generarInformePDF } from '../src/services/pdfGenerator.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { calcularKPIsGlobales } from '../src/nucleo/kpi.js';
import { analizarDificultad } from '../src/nucleo/dificultad.js';
import { csv, fila } from './fixtures.mjs';
import { comprobar, seccion, terminar, UMBRALES } from './ayuda.mjs';

/* ---------------------------------------------------------------- */
/* Un centro de mentira con las dos etapas y dos evaluaciones         */

const asignaturas = (nivel, sesgo) => [
  fila({ tipo: 'CURSO_TOTAL', nivel, asignatura: 'Total', registros: 40, media: 7 + sesgo }),
  fila({ tipo: 'CURSO_ESP', nivel, asignatura: 'Total Especialidad', registros: 20, media: 7.4 + sesgo }),
  fila({ tipo: 'CURSO_NOESP', nivel, asignatura: 'Total no Especialidad', registros: 20, media: 6.6 + sesgo }),
  fila({ tipo: 'CURSO_ASIG', nivel, asignatura: 'Piano', registros: 12, media: 8.1 + sesgo, aprobados: 0.98, suspendidos: 0.02 }),
  fila({ tipo: 'CURSO_ASIG', nivel, asignatura: 'Lenguaje Musical', registros: 20, media: 5.9 + sesgo, aprobados: 0.62, suspendidos: 0.38 }),
  fila({ tipo: 'CURSO_ASIG', nivel, asignatura: 'Violín', registros: 8, media: 7.2 + sesgo }),
  /* Una asignatura sin nota media: es el caso que el informe convertía en
     «0,00 (-100,0 %)», y aquí sirve además para que la generación pase por
     todas las ramas de «no hay dato». */
  fila({ tipo: 'CURSO_ASIG', nivel, asignatura: 'Optativa', registros: 6, media: null, aprobados: null, suspendidos: null })
];

const ficheroEEM = (base, curso, sesgo = 0) => csv({
  trimestre: base, curso, centro: 'Centro de prueba',
  filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 80, media: 7 + sesgo, desviacion: 1.4 }),
    fila({ tipo: 'GLOBAL_ESP', nivel: 'GLOBAL', asignatura: 'Total Especialidad', registros: 40, media: 7.4 + sesgo }),
    fila({ tipo: 'GLOBAL_NOESP', nivel: 'GLOBAL', asignatura: 'Total no Especialidad', registros: 40, media: 6.6 + sesgo }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Lenguaje Musical', registros: 40, media: 5.9 + sesgo, aprobados: 0.62, suspendidos: 0.38 }),
    ...asignaturas('1EEM', sesgo), ...asignaturas('2EEM', sesgo)
  ]
});

const ficheroEPM = (base, curso, sesgo = 0) => csv({
  trimestre: base, curso, centro: 'Centro de prueba',
  filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 120, media: 6.8 + sesgo, desviacion: 1.5 }),
    fila({ tipo: 'GLOBAL_ESP', nivel: 'GLOBAL', asignatura: 'Total Especialidad', registros: 60, media: 7.1 + sesgo }),
    fila({ tipo: 'GLOBAL_NOESP', nivel: 'GLOBAL', asignatura: 'Total no Especialidad', registros: 60, media: 6.5 + sesgo }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Teórica Troncal', registros: 60, media: 6.4 + sesgo }),
    ...asignaturas('1EPM', sesgo), ...asignaturas('2EPM', sesgo)
  ]
});

const cargar = (textos) => {
  const datosCompletos = {}, trimestresDisponibles = [], correlacionesCompletas = {},
        agrupacionesCompletas = {}, metadata = {};
  textos.forEach((texto) => {
    const p = procesarDatos(parseCSV(texto));
    datosCompletos[p.trimestre] = p.datos;
    trimestresDisponibles.push(p.trimestre);
    correlacionesCompletas[p.trimestre] = p.correlaciones || [];
    metadata[p.trimestre] = p.metadata || {};
    Object.assign(agrupacionesCompletas, p.agrupaciones || {});
  });
  return { datosCompletos, trimestresDisponibles, correlacionesCompletas, agrupacionesCompletas, metadata };
};

const MUNDO = cargar([
  ficheroEEM('1EV', '26/27'), ficheroEEM('2EV', '26/27', 0.3),
  ficheroEPM('1EV', '26/27'), ficheroEPM('2EV', '26/27', -0.2)
]);

/* Los rótulos: la clave tal cual, como hace `t()` cuando no encuentra nada.
   Así la prueba no depende de la tabla de idiomas —eso ya lo vigila
   `pruebas/traducciones.mjs`— y a la vez se ve qué clave pinta cada sitio. */
const t = (k) => k;

/* Las correlaciones entran como parámetro, no dentro del CSV: es lo que hace
   la aplicación, que las tiene ya calculadas del trimestre que se mira. */
const CORRELACIONES = [
  { Nivel: '1EEM', Asignatura1: 'Lenguaje Musical', Asignatura2: 'Piano', Correlacion: 0.62 },
  { Nivel: '1EEM', Asignatura1: 'Lenguaje Musical', Asignatura2: 'Violín', Correlacion: -0.18 },
  /* Una que no se ha podido calcular: en el papel es «—», nunca «0.000»,
     porque un cero ahí significa «no hay ninguna relación» y eso es una
     afirmación que nadie ha hecho. */
  { Nivel: '2EEM', Asignatura1: 'Piano', Asignatura2: 'Optativa', Correlacion: null }
];

const TODAS_LAS_SECCIONES = {
  nombreCentro: 'Centro de prueba',
  cursoAcademico: '26/27',
  incluirPortada: true, incluirAnalisisGlobal: true, incluirKPIs: true,
  incluirMapaDispersion: true, incluirEvolucionCorrelaciones: true,
  incluirCorrelaciones: true, incluirComparativaTransversal: true,
  incluirDatosAsignaturas: true, incluirDificultad: true,
  incluirAnalisisTendencias: true, incluirEvolucionNotas: true,
  incluirDistribucionNotas: true, filtroAgrupaciones: null
};

/** Genera y devuelve { salida, error, texto, paginas }. */
const generar = async (opciones) => {
  const o = opciones || {};
  const trimestre = o.trimestre || MUNDO.trimestresDisponibles[0];
  const modoEtapa = o.modoEtapa || 'EEM';
  const config = { ...TODAS_LAS_SECCIONES, ...(o.config || {}), modoEtapa };

  const kpisGlobales = calcularKPIsGlobales({
    trimestreSeleccionado: trimestre, datosCompletos: MUNDO.datosCompletos,
    trimestresDisponibles: MUNDO.trimestresDisponibles, umbrales: UMBRALES, modoEtapa
  });
  const analisisDificultad = analizarDificultad(MUNDO.datosCompletos[trimestre],
    { umbrales: UMBRALES, vista: 'niveles', modoEtapa });

  let error = null, exito = false, capturado = null;
  const salida = await generarInformePDF({
    trimestreSeleccionado: trimestre,
    datosCompletos: MUNDO.datosCompletos,
    configInforme: config,
    kpisGlobales,
    correlacionesTrimestre: o.correlaciones === undefined ? CORRELACIONES : o.correlaciones,
    analisisDificultad,
    agrupacionesCompletas: MUNDO.agrupacionesCompletas,
    tendenciasParaPDF: o.tendencias || [],
    trimestresDisponibles: MUNDO.trimestresDisponibles,
    chartImages: {},
    t,
    onError: (e) => { error = e; },
    onSuccess: () => { exito = true; },
    guardar: (pdf) => { capturado = pdf; }
  });

  let texto = '';
  if (capturado) {
    const bytes = new Uint8Array(capturado.output('arraybuffer'));
    const crudo = new TextDecoder('latin1').decode(bytes);
    /* El texto de un PDF sin comprimir va como `(...) Tj`. */
    texto = [...crudo.matchAll(/\((?:\\.|[^()\\])*\)\s*Tj/g)]
      .map((m) => m[0].replace(/\)\s*Tj$/, '').slice(1).replace(/\\([()\\])/g, '$1'))
      .join('\n');
  }
  return { salida, error, exito, texto, paginas: salida ? salida.paginas : 0 };
};

/* ---------------------------------------------------------------- */

seccion('1. El informe completo se genera de principio a fin');
{
  const r = await generar({});
  comprobar('CANDADO: ninguna de las quince secciones revienta',
    r.error === null, r.error ? (r.error.message + '\n      ' + String(r.error.stack).split('\n')[1]) : '');
  comprobar('y avisa de que ha terminado bien', r.exito === true);
  comprobar('salen páginas de verdad, no una hoja suelta',
    r.paginas >= 8, r.paginas + ' páginas');
  comprobar('y el documento lleva texto dentro',
    r.texto.length > 500, r.texto.length + ' caracteres');
}

seccion('2. Cada sección deja su rastro en el papel');
{
  /* Si una sección deja de pintarse —porque una condición cambia y nadie se
     entera— el informe sigue generándose sin error, solo que más corto. Esto
     lo caza: cada título tiene que estar. */
  const r = await generar({});
  const debenEstar = [
    'reportTitle',            // portada
    'globalAnalysisTitle',    // análisis global
    'kpis',                   // KPIs visuales
    'kpiDetail',              // KPIs por tipo
    'kpiComparison',          // comparativa
    'correlationsTitle',      // correlaciones
    'subjectsData',           // datos de asignaturas
    'difficulty'              // análisis de dificultad
  ];
  const faltan = debenEstar.filter((k) => !r.texto.includes(k));
  comprobar('CANDADO: están las ocho secciones de texto y tabla',
    faltan.length === 0, 'faltan: ' + faltan.join(', '));
}

seccion('3. Apagar una sección la quita, y no rompe las demás');
{
  const todo = await generar({});
  const sin = await generar({ config: { incluirCorrelaciones: false, incluirDatosAsignaturas: false } });
  comprobar('sigue generando sin error', sin.error === null, sin.error && sin.error.message);
  comprobar('CANDADO: y el informe es más corto, no igual',
    sin.paginas < todo.paginas, `${sin.paginas} frente a ${todo.paginas}`);
  comprobar('las secciones apagadas no dejan rastro',
    !sin.texto.includes('correlationsTitle') && !sin.texto.includes('subjectsData'));
  comprobar('y las encendidas siguen ahí', sin.texto.includes('kpiComparison'));
}

seccion('4. Modo TODOS: dos etapas, dos juegos de KPIs');
{
  /* Es la rama que imprimía tres páginas de ceros. Con las dos etapas
     cargadas, `calcularKPIsGlobales` devuelve `modoComparativo` y el informe
     tiene que sacar un bloque por etapa, cada uno rotulado con la suya. */
  const r = await generar({ modoEtapa: 'TODOS' });
  comprobar('CANDADO: en modo TODOS tampoco revienta',
    r.error === null, r.error && r.error.message);
  comprobar('y salen los dos bloques rotulados por etapa',
    r.texto.includes('kpis — EEM') && r.texto.includes('kpis — EPM'),
    r.texto.split('\n').filter((l) => l.startsWith('kpis')).join(' | '));
  comprobar('CANDADO: y NO imprime la media conjunta de las dos etapas como si fuera del centro',
    !/^0\.00$/m.test(r.texto), 'hay un 0.00 suelto donde debería haber «—»');
}

seccion('5. Un informe de grupo');
{
  const r = await generar({ config: { filtroAgrupaciones: ['especialidad'] } });
  comprobar('el informe filtrado se genera', r.error === null, r.error && r.error.message);
  comprobar('y saca la comparativa contra el centro, que es su razón de ser',
    r.texto.includes('subjectVsCenter') || r.texto.includes('Comparativa Asignaturas'),
    'no aparece el título de la comparativa de grupo');
}

seccion('6. Un solo trimestre cargado');
{
  /* La rama de «no hay bastantes trimestres» estaba escrita y no la
     ejercitaba nadie. */
  const solo = cargar([ficheroEEM('1EV', '26/27')]);
  let error = null;
  const salida = await generarInformePDF({
    trimestreSeleccionado: solo.trimestresDisponibles[0],
    datosCompletos: solo.datosCompletos,
    configInforme: { ...TODAS_LAS_SECCIONES, modoEtapa: 'EEM' },
    kpisGlobales: calcularKPIsGlobales({
      trimestreSeleccionado: solo.trimestresDisponibles[0],
      datosCompletos: solo.datosCompletos,
      trimestresDisponibles: solo.trimestresDisponibles,
      umbrales: UMBRALES, modoEtapa: 'EEM'
    }),
    correlacionesTrimestre: [],
    analisisDificultad: analizarDificultad(solo.datosCompletos[solo.trimestresDisponibles[0]],
      { umbrales: UMBRALES, vista: 'niveles', modoEtapa: 'EEM' }),
    agrupacionesCompletas: solo.agrupacionesCompletas,
    tendenciasParaPDF: [],
    trimestresDisponibles: solo.trimestresDisponibles,
    chartImages: {}, t,
    onError: (e) => { error = e; },
    guardar: () => {}
  });
  comprobar('con un solo trimestre el informe se genera igual',
    error === null && salida && salida.paginas > 3,
    error ? error.message : (salida ? salida.paginas + ' páginas' : 'sin salida'));
}

seccion('7. Un fichero al que le faltan las filas agregadas');
{
  /* El caso que producía «0.00 (-100.0%)» en papel. Aquí se comprueba de
     extremo a extremo, no solo en el núcleo. */
  const cojo = cargar([csv({ trimestre: '1EV', curso: '26/27', centro: 'Centro de prueba', filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 40, media: 7, desviacion: 1.5 }),
    fila({ tipo: 'CURSO_ESP', nivel: '1EEM', asignatura: 'Total Especialidad', registros: 20, media: 7.2 }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Piano', registros: 12, media: 8 })
  ] })]);
  const trim = cojo.trimestresDisponibles[0];
  let error = null, doc = null;
  await generarInformePDF({
    trimestreSeleccionado: trim, datosCompletos: cojo.datosCompletos,
    configInforme: { ...TODAS_LAS_SECCIONES, modoEtapa: 'EEM' },
    kpisGlobales: calcularKPIsGlobales({ trimestreSeleccionado: trim,
      datosCompletos: cojo.datosCompletos, trimestresDisponibles: cojo.trimestresDisponibles,
      umbrales: UMBRALES, modoEtapa: 'EEM' }),
    correlacionesTrimestre: [],
    analisisDificultad: analizarDificultad(cojo.datosCompletos[trim],
      { umbrales: UMBRALES, vista: 'niveles', modoEtapa: 'EEM' }),
    agrupacionesCompletas: {}, tendenciasParaPDF: [],
    trimestresDisponibles: cojo.trimestresDisponibles, chartImages: {}, t,
    onError: (e) => { error = e; }, guardar: (p) => { doc = p; }
  });
  const crudo = new TextDecoder('latin1').decode(new Uint8Array(doc.output('arraybuffer')));
  const texto = [...crudo.matchAll(/\((?:\\.|[^()\\])*\)\s*Tj/g)]
    .map((m) => m[0].replace(/\)\s*Tj$/, '').slice(1)).join('\n');

  comprobar('se genera aunque falten las filas agregadas', error === null, error && error.message);
  comprobar('CANDADO: escribe «—» donde no hay dato',
    texto.split('\n').filter((l) => l.trim() === '—').length >= 3,
    'guiones encontrados: ' + texto.split('\n').filter((l) => l.trim() === '—').length);
  comprobar('CANDADO: y NO escribe la diferencia inventada del -100 %',
    !texto.includes('-100.0%'),
    texto.split('\n').filter((l) => l.includes('-100.0%')).join(' | '));
}

seccion('8. El nombre del fichero que se descarga');
{
  const r = await generar({});
  const n = r.salida.nombreArchivo;
  comprobar('lleva el centro y la evaluación', /Centro_de_prueba/.test(n) && /1EV/.test(n), n);
  comprobar('CANDADO: y ni un carácter que rompa un guardado',
    /^[\w.\-]+\.pdf$/.test(n), n);
}

terminar('el informe entero, generado de verdad y leído del PDF.');
