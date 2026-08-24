/* Los modelos de analizador que se reparten — pruebas/modelos-excel.mjs
 *
 *   node pruebas/modelos-excel.mjs
 *
 * Un .xlsx es un zip de XML, y editarlo a mano es la única forma de tocarlo
 * sin que una librería se coma las LAMBDA del libro. Pero el esquema de Excel
 * **no permite poner los elementos donde a uno le venga bien**: dentro de
 * `<worksheet>` van en un orden fijo, y si se rompe, Excel abre con «hemos
 * encontrado un problema con el contenido» y ofrece reparar.
 *
 * Pasó: se añadió la validación del selector de evaluación al final de la
 * hoja, después de `<pageMargins>`, cuando va antes. Los dos modelos salieron
 * dañados y no se supo hasta que alguien los abrió — no hay ningún otro sitio
 * donde eso dé la cara.
 *
 * Esta prueba no comprueba que las cifras estén bien: comprueba que los
 * ficheros que se reparten se pueden ABRIR, que llevan lo que tienen que
 * llevar y que nadie les ha quitado una hoja sin darse cuenta.
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { comprobar, seccion, terminar } from './ayuda.mjs';

/** Las piezas de un .xlsx, sin dependencias. */
const abrirZip = (ruta) => {
  const buf = readFileSync(ruta);
  const piezas = new Map();
  let i = buf.length - 22;
  while (i >= 0 && buf.readUInt32LE(i) !== 0x06054b50) i--;
  if (i < 0) return null;
  const n = buf.readUInt16LE(i + 10);
  let off = buf.readUInt32LE(i + 16);
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) return null;
    const nl = buf.readUInt16LE(off + 28), el = buf.readUInt16LE(off + 30), cl = buf.readUInt16LE(off + 32);
    const nombre = buf.toString('utf8', off + 46, off + 46 + nl);
    const lo = buf.readUInt32LE(off + 42);
    const lnl = buf.readUInt16LE(lo + 26), lel = buf.readUInt16LE(lo + 28);
    const ini = lo + 30 + lnl + lel;
    const comp = buf.readUInt16LE(off + 10), cs = buf.readUInt32LE(off + 20);
    const datos = buf.subarray(ini, ini + cs);
    piezas.set(nombre, comp === 0 ? datos : inflateRawSync(datos));
    off += 46 + nl + el + cl;
  }
  return piezas;
};

/* El orden que fija el esquema para los hijos de <worksheet>. Está aquí
   entero y no recortado: quien añada algo mañana necesita ver dónde encaja. */
const ORDEN = ['sheetPr', 'dimension', 'sheetViews', 'sheetFormatPr', 'cols', 'sheetData',
  'sheetCalcPr', 'sheetProtection', 'protectedRanges', 'scenarios', 'autoFilter', 'sortState',
  'dataConsolidate', 'customSheetViews', 'mergeCells', 'phoneticPr', 'conditionalFormatting',
  'dataValidations', 'hyperlinks', 'printOptions', 'pageMargins', 'pageSetup', 'headerFooter',
  'rowBreaks', 'colBreaks', 'customProperties', 'cellWatches', 'ignoredErrors', 'smartTags',
  'drawing', 'drawingHF', 'picture', 'oleObjects', 'controls', 'webPublishItems', 'tableParts',
  'extLst'];

const ordenValido = (xml) => {
  const vistos = [];
  let ultimo = -1;
  for (const m of xml.matchAll(/<([a-zA-Z]+)[ />]/g)) {
    const e = m[1];
    const i = ORDEN.indexOf(e);
    if (i < 0 || vistos.includes(e)) continue;
    vistos.push(e);
    if (i < ultimo) return e;
    ultimo = i;
  }
  return null;
};

const MODELOS = [
  { archivo: 'public/data/ANALIZADOR_ELEMENTAL_V2.xlsx', etapa: 'EEM',
    codigos: '1EV,2EV,3EV,FI', hojaCalc: 'CALC_EEM', rangoEspecialidad: '$B$5:$B$27',
    /* El catálogo del art. 5 del D.159/2007: 3 comunes + 23 especialidades. */
    asignaturas: 26, listaManda: true },
  { archivo: 'public/data/ANALIZADOR_PROFESIONAL_v2.xlsx', etapa: 'EPM',
    codigos: '1EV,2EV,3EV,OR,EX', hojaCalc: 'CALC_EPM', rangoEspecialidad: '$B$7:$B$27',
    asignaturas: 42, listaManda: false }
];

const RAIZ = new URL('..', import.meta.url).pathname;

MODELOS.forEach((m) => {
  seccion(`${m.archivo.split('/').pop()}`);
  const piezas = abrirZip(RAIZ + m.archivo);

  comprobar('el fichero es un zip que se puede abrir', piezas !== null);
  if (!piezas) return;

  const txt = (p) => (piezas.has(p) ? piezas.get(p).toString('utf8') : null);

  /* CANDADO. Es lo que rompió: los elementos de una hoja van en el orden que
     fija el esquema, y Excel lo comprueba al abrir. Fuera de sitio, el libro
     sale con el aviso de contenido dañado. */
  const hojas = [...piezas.keys()].filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
  const malas = hojas.map((h) => [h, ordenValido(txt(h))]).filter(([, e]) => e);
  comprobar('CANDADO: los elementos de cada hoja van en el orden del esquema',
    malas.length === 0,
    malas.map(([h, e]) => `${h.split('/').pop()} → <${e}> fuera de sitio`).join(' · '));

  comprobar('están las nueve hojas', hojas.length === 9, hojas.length + ' hojas');

  /* CANDADO. Excel no guarda `FILTER(`: guarda `_xlfn._xlws.FILTER(`. El
     prefijo no es decoración, es el nombre de la función en el fichero —lo
     mismo con `STDEV.P`, `UNIQUE` o `MODE.SNGL`, que llevan `_xlfn.`—. Escrita
     a pelo, esa función no existe y el LIBRO ENTERO abre con «hemos encontrado
     un problema con el contenido». Pasó al generar las fórmulas de la columna
     B: 170 de golpe, y no lo dice nada hasta que alguien lo abre. */
  const todoXml = [...piezas.keys()].filter((k) => /\.xml$/.test(k))
    .map((k) => txt(k)).join('');
  const MODERNAS = ['FILTER', 'UNIQUE', 'SORT', 'SEQUENCE', 'STDEV.P', 'STDEV.S',
    'MODE.SNGL', 'VAR.P', 'NORM.DIST', 'QUARTILE.INC', 'PERCENTILE.INC', 'TEXTJOIN', 'IFS'];
  const desnudas = MODERNAS
    .map((f) => [f, (todoXml.match(new RegExp(`(?<![.\\w])${f.replace('.', '\\.')}\\(`, 'g')) || []).length])
    .filter(([, n]) => n > 0);
  comprobar('CANDADO: las funciones modernas llevan su prefijo _xlfn',
    desnudas.length === 0,
    desnudas.map(([f, n]) => `${f}( sin prefijo ×${n}`).join(' · '));

  /* CANDADO. `calcChain.xml` es la caché del orden de recálculo: una lista de
     todas las celdas con fórmula. Al mover filas deja de cuadrar, Excel lo
     comprueba al abrir y avisa de contenido dañado. Como es reconstruible, lo
     correcto es no llevarla; si vuelve, tiene que cuadrar al cero. */
  const cc = txt('xl/calcChain.xml');
  if (cc === null) {
    comprobar('no lleva calcChain, y nadie la nombra',
      !txt('[Content_Types].xml').includes('calcChain')
      && !txt('xl/_rels/workbook.xml.rels').includes('calcChain'));
  } else {
    const enCadena = (cc.match(/<c r="/g) || []).length;
    const conFormula = hojas.reduce((a, h) => a + (txt(h).match(/<f[ >]/g) || []).length, 0);
    comprobar('CANDADO: la calcChain cuadra con las celdas que tienen fórmula',
      enCadena === conFormula, `cadena ${enCadena} · fórmulas ${conFormula}`);
  }

  const wb = txt('xl/workbook.xml');
  comprobar('y siguen con sus nombres',
    ['CONFIG_ASIGNATURAS', 'CONFIG_METADATA', 'DATOS', m.hojaCalc, 'EXPORTADOR']
      .every((n) => wb.includes(`name="${n}"`)),
    wb.match(/name="[^"]+"/g).slice(0, 9).join(' '));

  /* Los valores en caché son los de antes de cualquier corrección, así que
     el libro tiene que recalcular al abrirse o enseña cifras viejas sin
     decirlo. */
  comprobar('recalcula al abrir', wb.includes('fullCalcOnLoad'));

  /* El selector de evaluación era texto libre comparado literalmente contra
     la columna Evaluación: un código mal escrito devuelve cero filas y toda
     la hoja sale a «—» sin explicar por qué. */
  const meta = txt('xl/worksheets/sheet3.xml');
  comprobar('el selector de evaluación tiene lista cerrada',
    meta.includes('<dataValidation') && meta.includes('sqref="B4"'));
  comprobar(`y ofrece los códigos de ${m.etapa}: ${m.codigos}`,
    meta.includes(m.codigos), (meta.match(/<formula1>(.*?)<\/formula1>/) || [])[1]);

  /* CANDADO: y la lista VISIBLE de al lado dice lo mismo que el desplegable.
     La columna D de CONFIG_METADATA ofrecía «FINAL» y el desplegable «FI»,
     que es lo que escribe GEODE, a un palmo la una de la otra. Quien copie de
     la de al lado se queda con cero filas y toda la hoja en «—», y no hay
     nada que se lo explique. */
  const cadenas = [...txt('xl/sharedStrings.xml').matchAll(/<si>(.*?)<\/si>/gs)]
    .map((x) => x[1].replace(/<.*?>/g, ''));
  const valorDe = (celda) => {
    const v = /<v>(.*?)<\/v>/s.exec(celda);
    if (/t="s"/.test(celda) && v) return cadenas[+v[1]];
    const is = /<is>.*?<t[^>]*>(.*?)<\/t>/s.exec(celda);
    return is ? is[1] : (v ? v[1] : '');
  };
  const visible = [...meta.matchAll(/<c r="D(\d+)"(?:[^>]*\/>|[^>]*>.*?<\/c>)/gs)]
    .filter((x) => +x[1] > 1).map((x) => valorDe(x[0])).filter(Boolean);
  comprobar('CANDADO: la lista visible, si la hay, dice lo mismo que el desplegable',
    visible.length === 0 || visible.join(',') === m.codigos,
    visible.length ? visible.join(',') + ' frente a ' + m.codigos : 'no lleva lista visible');

  /* El bloque de instrumentos, que es lo que separa «Especialidad» de «No
     Especialidad». En elemental apuntaba a TODAS las asignaturas
     configuradas, así que las dos cifras se solapaban y sumaban más que el
     total del centro. */
  const calc = txt('xl/worksheets/sheet6.xml');
  comprobar('CANDADO: «Total Especialidad» mira solo el bloque de instrumentos',
    calc.includes('CONFIG_ASIGNATURAS!' + m.rangoEspecialidad),
    (calc.match(/CONFIG_ASIGNATURAS!\$B\$\d+:\$B\$\d+/g) || []).join(' '));

  /* Las fórmulas son el libro: si un día se pierden en una edición, el
     fichero abre igual y no calcula nada. */
  const formulas = (calc.match(/<f[ >]/g) || []).length;
  comprobar('las fórmulas de cálculo siguen ahí',
    formulas > 2000, formulas + ' fórmulas en ' + m.hojaCalc);

  /* El catálogo entero, para que cada centro active lo suyo. */
  const cfg = txt('xl/worksheets/sheet2.xml');
  const cuantas = (cfg.match(/<row r="\d+"/g) || []).length - 1;
  comprobar(`la configuración lleva las ${m.asignaturas} asignaturas`,
    cuantas === m.asignaturas, cuantas + ' filas');

  if (m.listaManda) {
    /* CANDADO: el nombre de cada asignatura sale de la configuración, no está
       escrito en la hoja de cálculo. Es lo que hace que añadir una
       especialidad sea escribir una línea y no diez inserciones de fila. */
    const dinamicas = (calc.match(/<f>IFERROR\(INDEX\(_xlfn\._xlws\.FILTER\(CONFIG_ASIGNATURAS/g) || []).length;
    comprobar('CANDADO: los nombres de asignatura los pone la configuración',
      dinamicas > 100, dinamicas + ' filas con nombre calculado');

    /* CANDADO: y NINGUNA fórmula lleva un nombre de asignatura escrito dentro.
       «Total Especialidad» era dos cosas a la vez: el recuento del bloque
       GLOBAL preguntaba al catálogo y todo lo demás —media, moda, reparto de
       notas, y el recuento de los bloques de curso— usaba «no es Lenguaje
       Musical, ni Coro, ni Conjunto» escrito a mano en dieciocho columnas. Se
       parecen mientras toda asignatura de DATOS esté en la configuración; en
       cuanto llega una que no está, el global deja de ser la suma de los
       cursos y nadie lo dice. Y añadir una común a la configuración no la
       metía en «Total no Especialidad», que era justo lo contrario de que
       mande la lista. */
    const escritos = ['Lenguaje Musical', 'Coro', 'Conjunto']
      .map((n) => [n, (calc.match(new RegExp(`"${n}"`, 'g')) || []).length])
      .filter(([, n]) => n > 0);
    comprobar('CANDADO: ni una asignatura escrita dentro de una fórmula',
      escritos.length === 0,
      escritos.map(([n, c]) => `"${n}" ×${c}`).join(' · '));

    /* Y que el exportador siga apuntando a todas las filas de cálculo: si se
       queda corto, las últimas asignaturas no salen en el CSV y no lo dice
       nadie. */
    const exp = txt('xl/worksheets/sheet9.xml');
    const filasCalc = new Set([...calc.matchAll(/<row r="(\d+)"/g)].map((x) => +x[1]));
    const apunta = new Set([...exp.matchAll(/CALC_EEM!\$?[A-Z]+\$?(\d+)/g)].map((x) => +x[1]));
    const huerfanas = [...apunta].filter((x) => !filasCalc.has(x));
    const sinExportar = [...filasCalc].filter((x) => x > 1 && !apunta.has(x));
    comprobar('CANDADO: el exportador cubre todas las filas de cálculo, ni una menos',
      huerfanas.length === 0 && sinExportar.length === 0,
      `apunta a filas que no existen: ${huerfanas.length} · sin exportar: ${sinExportar.length}`);
  }

  /* GEODE escribe «DULZAINA» en castellano. Con «Dolçaina» en la
     configuración, sus filas no casaban con nada y la asignatura no aparecía
     ni con un cero. */
  if (m.etapa === 'EPM') {
    const ss = txt('xl/sharedStrings.xml');
    comprobar('CANDADO: la dulzaina se llama como la escribe GEODE',
      ss.includes('>Dulzaina<') && !ss.includes('>Dolçaina<'));
  }
});

terminar('los modelos de analizador: se abren, conservan sus fórmulas y llevan lo que deben.');
