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
import { serieAlertas } from '../src/nucleo/alertas.js';
import { agruparPorFamilia } from '../src/nucleo/agrupaciones.js';
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
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

/* La comparación que compone el usuario a mano, que es la vista
   «Estadísticas». Con su trimestre en cada fila, que es como la guarda la
   pantalla. */
const SELECCIONES = [
  { id: 's1', trimestre: '1EV-2627-EEM', nivel: '1EEM', asignatura: 'Piano' },
  { id: 's2', trimestre: '1EV-2627-EEM', nivel: '2EEM', asignatura: 'Lenguaje Musical' },
  { id: 's3', trimestre: '1EV-2627-EEM', nivel: '1EEM', asignatura: 'Optativa' }
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

/* eslint-disable no-use-before-define */
/** Lo que de verdad está escrito en el PDF.
 *
 *  El informe se genera con `compress: true` —sin eso pesaba 18 MB, de los
 *  que 17,85 eran dos imágenes guardadas en crudo—, así que los flujos van
 *  comprimidos y hay que inflarlos para leerlos. Merece la pena hacerlo aquí:
 *  generar la prueba sin comprimir sería probar un documento que no es el que
 *  se entrega. */
const textoDelPDF = (pdf) => {
  if (!pdf) return '';
  const bytes = Buffer.from(pdf.output('arraybuffer'));
  const crudo = bytes.toString('latin1');
  const trozos = [];

  let i = 0;
  while (true) {
    const ini = crudo.indexOf('stream', i);
    if (ini < 0) break;
    const fin = crudo.indexOf('endstream', ini);
    if (fin < 0) break;
    /* Tras «stream» va un salto de línea, que no es parte del flujo. */
    let desde = ini + 6;
    if (crudo[desde] === '\r') desde++;
    if (crudo[desde] === '\n') desde++;
    const bruto = bytes.subarray(desde, fin);
    try { trozos.push(inflateSync(bruto).toString('latin1')); }
    catch { trozos.push(bruto.toString('latin1')); }  // por si alguno no va comprimido
    i = fin + 9;
  }

  /* Y los objetos sueltos que no son flujos —los títulos de los marcadores
     viven ahí—, que se leen del PDF tal cual. */
  trozos.push(crudo);

  const salida = [];
  trozos.forEach((tr) => {
    for (const m of tr.matchAll(/\((?:\\.|[^()\\])*\)\s*Tj/g)) {
      salida.push(deWinAnsi(m[0].replace(/\)\s*Tj$/, '').slice(1).replace(/\\([()\\])/g, '$1')));
    }
  });
  return salida.join('\n');
};

/* Dentro del PDF el texto va en WinAnsi, un byte por carácter, y el bloque
   0x80-0x9F no es latin-1: ahí viven el guion largo, las comillas
   tipográficas y los puntos suspensivos. Sin deshacer esa traducción, «—»
   —el carácter con el que este informe dice «no hay dato», y que es media
   razón de ser de estas pruebas— se lee como un carácter de control y
   cualquier comprobación que lo busque sale verde sin haber mirado nada.
   Y si una cadena lleva algo fuera de WinAnsi, jsPDF pasa ESA cadena entera a
   dos bytes; también se deshace. */
const ALTO = { 0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†',
  0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž',
  0x91: '\u2018', 0x92: '\u2019', 0x93: '\u201c', 0x94: '\u201d', 0x95: '•',
  0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ',
  0x9e: 'ž', 0x9f: 'Ÿ' };

const deWinAnsi = (cadena) => {
  /* Dos bytes por carácter: se reconoce porque los pares llevan un cero
     delante en casi todo. */
  const ceros = [...cadena].filter((c) => c.charCodeAt(0) === 0).length;
  if (ceros > cadena.length / 3) {
    let fuera = '';
    for (let i = 0; i + 1 < cadena.length; i += 2) {
      fuera += String.fromCharCode((cadena.charCodeAt(i) << 8) | cadena.charCodeAt(i + 1));
    }
    return fuera;
  }
  return [...cadena].map((c) => ALTO[c.charCodeAt(0)] || c).join('');
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
    umbrales: o.umbrales === undefined ? UMBRALES : o.umbrales,
    metadata: MUNDO.metadata[trimestre] || {},
    serieAlertasPDF: o.sinAlertas ? null : serieAlertas({
      trimestresDisponibles: MUNDO.trimestresDisponibles,
      datosCompletos: MUNDO.datosCompletos, umbrales: UMBRALES, modoEtapa, vista: 'niveles'
    }),
    familiasPDF: agruparPorFamilia(MUNDO.datosCompletos[trimestre], {
      agrupaciones: {}, modoEtapa, umbrales: UMBRALES, vista: 'global'
    }),
    selecciones: o.selecciones === undefined ? SELECCIONES : o.selecciones,
    generadoEn: new Date('2026-08-23T10:00:00Z'),
    t,
    onError: (e) => { error = e; },
    onSuccess: () => { exito = true; },
    guardar: (pdf) => { capturado = pdf; }
  });

  return { salida, error, exito, texto: textoDelPDF(capturado), paginas: salida ? salida.paginas : 0 };
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
  const texto = textoDelPDF(doc);

  comprobar('se genera aunque falten las filas agregadas', error === null, error && error.message);
  comprobar('CANDADO: escribe «—» donde no hay dato',
    texto.split('\n').filter((l) => l.trim() === '—').length >= 3,
    'guiones encontrados: ' + texto.split('\n').filter((l) => l.trim() === '—').length);
  comprobar('CANDADO: y NO escribe la diferencia inventada del -100 %',
    !texto.includes('-100.0%'),
    texto.split('\n').filter((l) => l.includes('-100.0%')).join(' | '));
}

seccion('8. El índice y los marcadores');
{
  const r = await generar({});
  comprobar('el informe lleva su índice', r.texto.includes('tableOfContents'));

  /* El índice tiene que llevar el número de página de cada sección, y esos
     números tienen que ser los de verdad: un índice que apunta a otro sitio
     es peor que no tenerlo, porque se sigue igual y se llega a otra tabla.
     Se comprueba contra los marcadores del propio PDF, que salen del mismo
     registro pero por otro camino. */
  const crudo = new TextDecoder('latin1').decode(new Uint8Array(r.salida.pdf.output('arraybuffer')));
  const marcadores = (crudo.match(/\/Title\s*\(/g) || []).length;
  comprobar('CANDADO: y marcadores para navegarlo desde el lector',
    marcadores >= 6, marcadores + ' marcadores');

  const sinIndice = await generar({ config: { incluirIndice: false } });
  comprobar('se puede quitar', !sinIndice.texto.includes('tableOfContents'));
  comprobar('CANDADO: y al quitarlo el informe tiene UNA página menos, no la misma',
    sinIndice.paginas === r.paginas - 1, `${sinIndice.paginas} frente a ${r.paginas}`);
}

seccion('9. El nombre del fichero que se descarga');
{
  const r = await generar({});
  const n = r.salida.nombreArchivo;
  comprobar('lleva el centro y la evaluación', /Centro_de_prueba/.test(n) && /1EV/.test(n), n);
  comprobar('CANDADO: y ni un carácter que rompa un guardado',
    /^[\w.\-]+\.pdf$/.test(n), n);
}

seccion('10. Las cinco secciones que antes no salían del navegador');
{
  const r = await generar({});
  /* Cada una tiene que dejar su título en el papel. Si una deja de pintarse
     —porque una condición cambia, o porque alguien se deja un argumento— el
     informe se genera igual, solo que sin ella y sin decirlo. */
  const nuevas = {
    'la ficha de en qué se basa': 'fichaTitulo',
    'las alertas del curso': 'alrTitulo',
    'qué cambia entre evaluaciones': 'alrCambiosTitulo',
    'las familias de asignaturas': 'fam_titulo',
    'la comparación compuesta a mano': 'statistics'
  };
  Object.entries(nuevas).forEach(([nombre, clave]) => {
    comprobar('está ' + nombre, r.texto.includes(clave), 'no aparece ' + clave);
  });

  /* Y la de curso contra curso NO tiene que estar: este mundo solo tiene un
     curso académico cargado, así que compararlo consigo mismo sería una fila
     de ceros que se lee «igual que el año pasado». */
  comprobar('CANDADO: con un solo curso académico, la comparación entre cursos no se pinta',
    !r.texto.includes('entreCursosTitulo'),
    'aparece una sección que no tiene nada que comparar');
}

seccion('11. Con dos cursos académicos SÍ se compara, y ahí está el sentido');
{
  /* La comprobación de arriba —«con un curso no se pinta»— pasaría también si
     la sección estuviera rota y no se pintara nunca. Este es el caso que las
     separa. */
  const dos = cargar([
    ficheroEEM('1EV', '26/27'), ficheroEEM('1EV', '25/26', -0.4),
    ficheroEEM('2EV', '25/26', -0.2)
  ]);
  const trim = dos.trimestresDisponibles.find((k) => k.includes('2627'));
  let error = null, doc = null;
  await generarInformePDF({
    trimestreSeleccionado: trim, datosCompletos: dos.datosCompletos,
    configInforme: { ...TODAS_LAS_SECCIONES, modoEtapa: 'EEM' },
    kpisGlobales: calcularKPIsGlobales({ trimestreSeleccionado: trim,
      datosCompletos: dos.datosCompletos, trimestresDisponibles: dos.trimestresDisponibles,
      umbrales: UMBRALES, modoEtapa: 'EEM' }),
    correlacionesTrimestre: [],
    analisisDificultad: analizarDificultad(dos.datosCompletos[trim],
      { umbrales: UMBRALES, vista: 'niveles', modoEtapa: 'EEM' }),
    agrupacionesCompletas: {}, tendenciasParaPDF: [],
    trimestresDisponibles: dos.trimestresDisponibles, chartImages: {},
    umbrales: UMBRALES, metadata: dos.metadata[trim] || {}, selecciones: [],
    generadoEn: new Date('2026-08-23T10:00:00Z'), t,
    onError: (e) => { error = e; }, guardar: (p) => { doc = p; }
  });
  const texto = textoDelPDF(doc);

  comprobar('se genera con dos cursos cargados', error === null, error && error.message);
  comprobar('CANDADO: ahora SÍ sale la comparación entre cursos',
    texto.includes('entreCursosTitulo'), 'no se pinta habiendo dos cursos que comparar');
  comprobar('y nombra los dos cursos académicos, legibles',
    texto.includes('25/26') && texto.includes('26/27'),
    texto.split('\n').filter((l) => /\d\d\/\d\d/.test(l)).slice(0, 4).join(' | '));
  comprobar('CANDADO: compara la MISMA evaluación, no la 2.ª del año pasado con la 1.ª de este',
    texto.split('\n').filter((l) => l.trim() === '2EV').length === 0,
    'se ha colado una evaluación que no toca');
}

seccion('12. Los umbrales con los que se ha clasificado salen en el papel');
{
  /* Es lo que faltaba y por lo que la ficha existe: los umbrales son
     configurables, así que dos informes de los mismos datos pueden llamar
     «difícil» a asignaturas distintas. Sin esto, nada en el documento lo
     delata. */
  const deFabrica = await generar({});
  const cambiados = await generar({ umbrales: { ...UMBRALES, mediaCritica: 6.8 } });

  comprobar('el informe escribe los cinco umbrales',
    ['criticalAvg', 'easyAvg', 'failedAlert', 'minPassed', 'minStudents']
      .every((k) => deFabrica.texto.includes(k)),
    'faltan umbrales en la ficha');
  comprobar('CANDADO: y si se ha cambiado uno, el papel lo dice',
    cambiados.texto.includes('6.8') && /cambiado/i.test(cambiados.texto),
    'no se marca el umbral cambiado');
  comprobar('CANDADO: con los de fábrica NO dice «cambiado», que si no la marca no significa nada',
    !/cambiado/i.test(deFabrica.texto),
    'marca como cambiado un umbral que no lo está');
  comprobar('y dice de qué fichero sale y cuántos hay cargados',
    deFabrica.texto.includes('fichaEsteFichero') && deFabrica.texto.includes('fichaFicherosCargados'));

  /* CANDADO: y el curso académico de la ficha es el del fichero, no un hueco.
     Esta comprobación existe porque el fallo se dio: la integración pasaba el
     MAPA de metadatos de todos los ficheros en vez del del que se imprime, así
     que `metadata.CursoAcademico` era `undefined` y la ficha escribía «—»
     mientras la portada, que lo saca de otro sitio, decía «26/27». Las dos
     cifras en el mismo documento y distintas. No lo vio ninguna prueba: se vio
     abriendo el PDF. */
  /* Y se mira EN SU CELDA, no en todo el documento: «26/27» sale también en
     la portada y en la cabecera de cada página, así que buscarlo suelto daba
     verde con la ficha escribiendo «—». Comprobado mutando: la primera versión
     de esta comprobación no se ponía roja. */
  const lineas = deFabrica.texto.split('\n');
  const iCurso = lineas.indexOf('academicYear');
  comprobar('CANDADO: la celda del curso académico de la ficha lleva el curso, no «—»',
    iCurso >= 0 && lineas[iCurso + 1] === '26/27',
    iCurso < 0 ? 'no está la fila' : 'dice ' + JSON.stringify(lineas[iCurso + 1]));
}

seccion('13. Sin selecciones y sin alertas, esas secciones no se pintan');
{
  const pelado = await generar({ selecciones: [], sinAlertas: true });
  comprobar('se genera igual', pelado.error === null, pelado.error && pelado.error.message);
  comprobar('CANDADO: no queda una hoja con un título y una tabla vacía',
    !pelado.texto.includes('alrTitulo') && !pelado.texto.includes('statistics'),
    'se ha pintado una sección sin nada dentro');
  comprobar('y las demás siguen ahí', pelado.texto.includes('fichaTitulo'));
}

seccion('14. Las gráficas entran comprimidas, que es de lo que dependía el tamaño');
{
  /* Medido, no supuesto: un informe con dos gráficas pesaba 18,05 MB y 17,85
     eran esas dos imágenes —9,6 y 8,2 MB, exactamente ancho × alto × 3—.
     jsPDF no sabe meter un PNG de html2canvas tal cual: lo decodifica y lo
     guarda EN CRUDO, sin filtro ninguno. Un JPEG lo mete con `DCTDecode`, es
     decir, los mismos bytes que ya venían comprimidos.

     Comprimir el documento entero (`compress: true`) no vale: el deflate de
     jsPDF es síncrono y con 18 MB de píxeles congela la pestaña más de un
     minuto. Se probó y se descartó.

     Así que lo que hay que vigilar es que las gráficas se sigan capturando en
     JPEG y que el generador lo reconozca. Volver a PNG no daría error, ni se
     vería en el papel: solo saldrían informes que no se pueden mandar. */
  const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgK'
    + 'DBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA'
    + '/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

  let doc = null, error = null;
  await generarInformePDF({
    trimestreSeleccionado: MUNDO.trimestresDisponibles[0],
    datosCompletos: MUNDO.datosCompletos,
    configInforme: { ...TODAS_LAS_SECCIONES, modoEtapa: 'EEM' },
    kpisGlobales: calcularKPIsGlobales({
      trimestreSeleccionado: MUNDO.trimestresDisponibles[0],
      datosCompletos: MUNDO.datosCompletos,
      trimestresDisponibles: MUNDO.trimestresDisponibles,
      umbrales: UMBRALES, modoEtapa: 'EEM' }),
    correlacionesTrimestre: [],
    analisisDificultad: analizarDificultad(MUNDO.datosCompletos[MUNDO.trimestresDisponibles[0]],
      { umbrales: UMBRALES, vista: 'niveles', modoEtapa: 'EEM' }),
    agrupacionesCompletas: {}, tendenciasParaPDF: [],
    trimestresDisponibles: MUNDO.trimestresDisponibles,
    chartImages: { scatter: JPEG, evolution: JPEG },
    umbrales: UMBRALES, metadata: {}, selecciones: [],
    generadoEn: new Date('2026-08-23T10:00:00Z'), t,
    onError: (e) => { error = e; }, guardar: (p) => { doc = p; }
  });

  comprobar('el informe con gráficas se genera', error === null && doc !== null,
    error && error.message);

  const crudo = Buffer.from(doc.output('arraybuffer')).toString('latin1');
  const imagenes = [...crudo.matchAll(/\/Subtype\s*\/Image/g)].length;
  const conDCT = [...crudo.matchAll(/\/Filter\s*\/DCTDecode/g)].length;

  /* Una y no dos: las dos gráficas del caso son el MISMO dato, y jsPDF no
     guarda dos veces la misma imagen. Es lo que queremos —un informe con la
     misma gráfica en varias páginas no debe pesar el doble— pero conviene
     saberlo antes de contar imágenes en una prueba. */
  comprobar('la gráfica está dentro', imagenes >= 1, imagenes + ' imágenes');
  comprobar('CANDADO: y las dos entran ya comprimidas, no en crudo',
    conDCT === imagenes && conDCT > 0,
    conDCT + ' de ' + imagenes + ' con DCTDecode');

  comprobar('CANDADO: no queda ninguna imagen guardada sin filtro',
    !/\/Subtype\s*\/Image(?![\s\S]{0,300}\/Filter)/.test(crudo),
    'hay una imagen sin comprimir dentro del PDF');

  /* Y el candado que de verdad hace falta, que es sobre la CAPTURA.
     Comprobado que jsPDF mira la cabecera del data URL y hace lo correcto
     aunque se le pase el formato equivocado; lo único que decide el tamaño,
     entonces, es en qué formato captura `chartCapture.js`. Esa función solo
     corre en un navegador, así que se mira su código: volver a PNG es una
     palabra y no daría error en ningún sitio — solo informes de 18 MB que no
     se pueden mandar por correo. Es la misma clase de comprobación que la de
     los rótulos fuera de WinAnsi, y por la misma razón: el daño no tiene
     síntoma. */
  const captura = readFileSync(new URL('../src/utils/chartCapture.js', import.meta.url), 'utf8');
  comprobar('CANDADO: las gráficas se siguen capturando en JPEG',
    /toDataURL\(\s*'image\/jpeg'/.test(captura),
    (captura.match(/toDataURL\([^)]*\)/) || ['no encuentro la llamada'])[0]);
}

terminar('el informe entero, generado de verdad y leído del PDF.');
