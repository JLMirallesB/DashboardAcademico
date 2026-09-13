/* El conversor de la exportación de calificaciones — pruebas/conversor-excel.mjs
 *
 *   node pruebas/conversor-excel.mjs
 *
 * Como `modelos-excel.mjs`, esto no comprueba cifras: comprueba que el libro
 * que se reparte se puede ABRIR y que lleva lo que tiene que llevar. Las
 * cifras las comprueba `herramientas/probar-conversor.py`, que necesita un
 * Excel de verdad para recalcular y por eso no va en esta red.
 *
 * Y dos cosas que aquí importan más que en los analizadores, porque este
 * libro es el que toca datos personales:
 *   · que ninguna fórmula lea nombre, apellidos ni sexo;
 *   · y que el fichero que se reparte no lleve ni una fila en ENTRADA.
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { comprobar, seccion, terminar } from './ayuda.mjs';

const RAIZ = new URL('..', import.meta.url).pathname;
const CONVERSOR = 'public/data/CONVERSOR_EXCEL_A_DASHBOARD.xlsx';
const ANALIZADORES = [['EEM', 'public/data/ANALIZADOR_ELEMENTAL_V2.xlsx'],
                      ['EPM', 'public/data/ANALIZADOR_PROFESIONAL_v2.xlsx']];

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
    const ini = lo + 30 + buf.readUInt16LE(lo + 26) + buf.readUInt16LE(lo + 28);
    const datos = buf.subarray(ini, ini + buf.readUInt32LE(off + 20));
    piezas.set(nombre, buf.readUInt16LE(off + 10) === 0 ? datos : inflateRawSync(datos));
    off += 46 + nl + el + cl;
  }
  return piezas;
};

/** Las filas de una hoja por su nombre: { número: { columna: texto } }. */
const leerHoja = (piezas, nombre) => {
  const txt = (p) => (piezas.has(p) ? piezas.get(p).toString('utf8') : '');
  const rid = new RegExp(`<sheet [^>]*name="${nombre}"[^>]*r:id="([^"]+)"`).exec(txt('xl/workbook.xml'));
  if (!rid) return null;
  const destino = new RegExp(`Id="${rid[1]}"[^>]*Target="([^"]+)"`).exec(txt('xl/_rels/workbook.xml.rels'))[1];
  const xml = txt('xl/' + destino.replace(/^\/?xl\//, ''));
  const compartidas = [...txt('xl/sharedStrings.xml').matchAll(/<si>(.*?)<\/si>/gs)]
    .map((x) => x[1].replace(/<.*?>/g, ''));
  const filas = {};
  for (const f of xml.matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
    const fila = {};
    for (const c of f[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
      const dentro = c[3] || '';
      const v = /<v>(.*?)<\/v>/s.exec(dentro);
      const t = /<t[^>]*>(.*?)<\/t>/s.exec(dentro);
      if (/t="s"/.test(c[2]) && v) fila[c[1]] = compartidas[+v[1]];
      else if (t) fila[c[1]] = t[1];
      else if (v) fila[c[1]] = v[1];
    }
    filas[+f[1]] = fila;
  }
  return { xml, filas };
};

const ORDEN = ['sheetPr', 'dimension', 'sheetViews', 'sheetFormatPr', 'cols', 'sheetData',
  'sheetCalcPr', 'sheetProtection', 'protectedRanges', 'scenarios', 'autoFilter', 'sortState',
  'dataConsolidate', 'customSheetViews', 'mergeCells', 'phoneticPr', 'conditionalFormatting',
  'dataValidations', 'hyperlinks', 'printOptions', 'pageMargins', 'pageSetup', 'headerFooter'];
const ordenValido = (xml) => {
  const vistos = [];
  let ultimo = -1;
  for (const m of xml.matchAll(/<([a-zA-Z]+)[ />]/g)) {
    const i = ORDEN.indexOf(m[1]);
    if (i < 0 || vistos.includes(m[1])) continue;
    vistos.push(m[1]);
    if (i < ultimo) return m[1];
    ultimo = i;
  }
  return null;
};

const desXml = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');

seccion(CONVERSOR.split('/').pop());
const piezas = abrirZip(RAIZ + CONVERSOR);
comprobar('el fichero es un zip que se puede abrir', piezas !== null);
if (!piezas) terminar('');
const txt = (p) => (piezas.has(p) ? piezas.get(p).toString('utf8') : '');
const wb = txt('xl/workbook.xml');
const hojas = [...piezas.keys()].filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));

const NOMBRES = ['PORTADA', 'ENTRADA', 'CATALOGO', 'DATOS_EEM', 'DATOS_EPM', 'CONTROL', 'INCIDENCIAS'];
comprobar('lleva sus siete hojas, con sus nombres',
  hojas.length === 7 && NOMBRES.every((n) => wb.includes(`name="${n}"`)),
  (wb.match(/<sheet name="[^"]+"/g) || []).join(' '));

const malas = hojas.map((h) => [h, ordenValido(txt(h))]).filter(([, e]) => e);
comprobar('CANDADO: los elementos de cada hoja van en el orden del esquema',
  malas.length === 0, malas.map(([h, e]) => `${h} → <${e}>`).join(' · '));

const rotas = [];
hojas.forEach((h) => {
  let ultima = 0;
  for (const fila of txt(h).matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
    if (+fila[1] <= ultima) rotas.push(`${h} fila ${fila[1]} fuera de orden`);
    ultima = +fila[1];
    const refs = [...fila[2].matchAll(/<c r="([A-Z]+)(\d+)"/g)];
    const cols = refs.map((x) => x[1]);
    if (new Set(cols).size !== cols.length) rotas.push(`${h} fila ${fila[1]}: celda repetida`);
    if (refs.some((x) => x[2] !== fila[1])) rotas.push(`${h} fila ${fila[1]}: celda de otra fila`);
  }
});
comprobar('CANDADO: ni celdas repetidas ni filas desordenadas', rotas.length === 0, rotas.slice(0, 4).join(' · '));

/* CANDADO. Todas las fórmulas de este libro operan con matrices: se declaran
   TODAS. Una sin declarar no derrama y no da error — sale la primera fila de
   DATOS y nada más. */
const formulas = hojas.flatMap((h) => [...txt(h).matchAll(/<c r="([A-Z]+\d+)"([^>]*)><f([^>]*)>([^<]*)<\/f>/g)]
  .map((x) => ({ donde: `${h.split('/').pop()}!${x[1]}`, celda: x[2], f: x[3], texto: desXml(x[4]) })));
const sinDeclarar = formulas.filter((x) => !(/cm="1"/.test(x.celda) && /t="array"/.test(x.f)));
comprobar('CANDADO: todas las fórmulas se declaran como matriz',
  formulas.length > 20 && sinDeclarar.length === 0,
  `${formulas.length} fórmulas · sin declarar: ${sinDeclarar.map((x) => x.donde).join(' ')}`);
comprobar('y está la pieza que lo declara', piezas.has('xl/metadata.xml')
  && txt('xl/_rels/workbook.xml.rels').includes('metadata.xml')
  && txt('[Content_Types].xml').includes('sheetMetadata'));

/* CANDADO. Los prefijos: `LET(` a pelo no existe en el fichero, y el libro
   entero abre como dañado. Lo mismo las variables de LET sin `_xlpm.`. */
const nombresDef = [...wb.matchAll(/<definedName name="(\w+)">(.*?)<\/definedName>/g)]
  .map((x) => ({ nombre: x[1], texto: desXml(x[2]) }));
const todo = formulas.map((x) => x.texto).concat(nombresDef.map((x) => x.texto)).join('\n');
/* IFNA es de 2013 y también lleva prefijo: a pelo, abre sin avisar y la
   columna Contenido entera sale como #¿NOMBRE?. Faltaba en esta lista y lo
   cazó el recálculo con Excel, no esta prueba. */
const MODERNAS = ['LET', 'XLOOKUP', 'XMATCH', 'FILTER', 'UNIQUE', 'SORT', 'SEQUENCE', 'TEXTJOIN',
  'NUMBERVALUE', 'IFNA', 'HSTACK', 'VSTACK', 'LAMBDA', 'TEXTBEFORE', 'CHOOSECOLS'];
const desnudas = MODERNAS.filter((f) => new RegExp(`(?<![.\\w])${f}\\(`).test(todo));
comprobar('CANDADO: las funciones modernas llevan su prefijo', desnudas.length === 0, desnudas.join(' · '));
const variablesSueltas = (todo.match(/(?<![.\w])v[A-Z]\w*/g) || []);
comprobar('CANDADO: y las variables de LET, el suyo', variablesSueltas.length === 0,
  [...new Set(variablesSueltas)].slice(0, 5).join(' '));
/* HSTACK y compañía no existen en Excel 2021, y el resto del libro sí. */
comprobar('no usa funciones que Excel 2021 no tiene',
  !/_xlfn\.(HSTACK|VSTACK|TEXTBEFORE|TEXTAFTER|CHOOSECOLS|TAKE|DROP)\(/.test(todo));

comprobar('recalcula al abrir', wb.includes('fullCalcOnLoad'));
comprobar('CANDADO: ningún rango llega a la fila 20.000 a lo bruto', !/\$2:\$[A-Z]+\$20000/.test(todo));

/* CANDADO. Ninguna fórmula ni ningún nombre lee una columna personal. El
   conversor tiene que funcionar con ellas pegadas, y no puede sacar nada de
   ellas: si alguien añade «apellido1» a una fórmula, esto se pone rojo. */
const personales = ['nombre', 'apellido1', 'apellido2', 'sexo']
  .filter((c) => todo.includes(`"${c}"`));
comprobar('CANDADO: ninguna fórmula lee nombre, apellidos ni sexo', personales.length === 0, personales.join(' · '));

/* CANDADO. El libro que se reparte no lleva datos: ENTRADA tiene la fila de
   cabeceras y nada más. Generarlo con `--datos` para probar y copiarlo a
   public/ por error repartiría un fichero de prueba —o uno de verdad—. */
const entrada = leerHoja(piezas, 'ENTRADA');
comprobar('CANDADO: ENTRADA va vacía, solo con las cabeceras',
  entrada && Object.keys(entrada.filas).length === 1 && entrada.filas[1].J === 'nia',
  entrada ? `${Object.keys(entrada.filas).length} filas` : 'sin hoja');

/* CANDADO. Las cabeceras de salida son las de DATOS de los analizadores,
   letra por letra. Si un analizador cambia una, la hoja pegada deja de casar
   y el analizador no dice nada: calcula sobre columnas vacías. */
ANALIZADORES.forEach(([etapa, ruta]) => {
  const suyo = leerHoja(abrirZip(RAIZ + ruta), 'DATOS').filas;
  const mia = leerHoja(piezas, `DATOS_${etapa}`).filas;
  const cols = 'ABCDEFGHIJKLMN'.split('');
  const distintas = cols.filter((c) => (suyo[1][c] || '') !== (mia[1][c] || ''));
  comprobar(`CANDADO: DATOS_${etapa} tiene las cabeceras de DATOS del analizador`,
    distintas.length === 0,
    distintas.map((c) => `${c}: «${mia[1][c]}» frente a «${suyo[1][c]}»`).join(' · '));
});

/* CANDADO. La lista manda: CATALOGO es el catálogo de los dos analizadores,
   con su etapa y su marca de especialidad. Si se desacompasan, una
   especialidad nueva del analizador no se reconoce aquí y su alumnado se
   queda sin especialidad. */
const catalogo = leerHoja(piezas, 'CATALOGO').filas;
const enConversor = new Set(Object.entries(catalogo).filter(([n, f]) => +n > 1 && f.B)
  .map(([, f]) => `${f.A}|${f.B}|${f.C}`));
const enAnalizadores = new Set(ANALIZADORES.flatMap(([etapa, ruta]) =>
  Object.entries(leerHoja(abrirZip(RAIZ + ruta), 'CONFIG_ASIGNATURAS').filas)
    .filter(([n, f]) => +n > 1 && f.B && !f.B.startsWith('↓'))
    .map(([, f]) => `${f.B.trim()}|${etapa}|${f.F || 'No'}`)));
const faltan = [...enAnalizadores].filter((x) => !enConversor.has(x));
const sobran = [...enConversor].filter((x) => !enAnalizadores.has(x));
comprobar('CANDADO: CATALOGO dice lo mismo que los dos analizadores',
  faltan.length === 0 && sobran.length === 0 && enConversor.size > 60,
  `faltan ${faltan.slice(0, 3).join(', ')} · sobran ${sobran.slice(0, 3).join(', ')} · ${enConversor.size} filas`);

/* Las decisiones que se tomaron mirando una exportación real. Cada una tiene
   su porqué en la cabecera del generador; aquí se comprueba que siguen ahí. */
const def = Object.fromEntries(nombresDef.map((x) => [x.nombre, x.texto]));
comprobar('CANDADO: el curso es el de la asignatura, no el de matrícula',
  /XMATCH\("curso_cont"/.test(def.eCURSO || ''), def.eCURSO);
const salidaEPM = formulas.find((x) => x.donde === 'sheet5.xml!A2');
comprobar('CANDADO: las filas sin nota no pasan',
  salidaEPM && salidaEPM.texto.includes('(_xlpm.vTexto<>"")'), salidaEPM && salidaEPM.texto.slice(-120));
comprobar('CANDADO: el NIA sale como número correlativo, no como NIA',
  salidaEPM && /_xlpm\.vId,_xlfn\.XMATCH\(eNIA&"",_xlfn\.UNIQUE\(eNIA&""\)\)/.test(salidaEPM.texto)
  && /CHOOSE\(\{1,2,3,4,5,6,7,8,9,10,11,12,13,14\},_xlpm\.vId,/.test(salidaEPM.texto));
comprobar('CANDADO: la etapa se decide por el curso, sin «lo que no es EEM es EPM»',
  salidaEPM && salidaEPM.texto.includes('(_xlpm.vEt="EPM")')
  && formulas.find((x) => x.donde === 'sheet4.xml!A2').texto.includes('(_xlpm.vEt="EEM")'));

/* CANDADO. Una asignatura que no está en el catálogo conserva SU nombre.
   Con el «si no se encuentra» de XLOOKUP y una matriz de búsqueda, Excel no
   lo aplica elemento a elemento: devuelve el primer valor de toda la matriz,
   y las notas de una asignatura desconocida pasaban a nombre de la primera
   fila del fichero. No da error. Se vio recalculando con Excel. */
const xlookupConVariable = todo.match(/_xlfn\.XLOOKUP\((?:[^()]|\([^()]*\))*,_xlpm\.v\w+\)/g) || [];
comprobar('CANDADO: ningún XLOOKUP usa una matriz como «si no se encuentra»',
  xlookupConVariable.length === 0 && todo.includes('_xlpm.vCanon,_xlfn.IFNA(_xlfn.XLOOKUP('),
  xlookupConVariable.slice(0, 2).join(' · '));

/* INCIDENCIAS: la hoja que un centro nos manda. Agrupa por valor y cuenta;
   no puede llevar nada por lo que se reconozca a alguien. */
const inc = formulas.filter((x) => x.donde.startsWith('sheet7.xml'));
comprobar('INCIDENCIAS lleva sus cuatro listas y el recuento sin especialidad', inc.length === 5, inc.length);
comprobar('CANDADO: ninguna lista de INCIDENCIAS agrupa por el NIA',
  inc.every((x) => !/_xlpm\.vK,_xlfn\._xlws\.FILTER\([^,]*eNIA/.test(x.texto)
                   && !/_xlpm\.vU,_xlfn\.UNIQUE\(_xlfn\._xlws\.FILTER\(CHOOSE\(\{[^}]*\},[^)]*eNIA/.test(x.texto)));

/* La regla de la casa, también aquí. */
const nombrados = ['GEODE', 'ITACA', 'SOGERE', 'Sogere', 'Geode', 'Itaca']
  .filter((n) => [...piezas.keys()].some((k) => txt(k).includes(n)));
comprobar('CANDADO: no se nombra ninguna herramienta de gestión concreta', nombrados.length === 0, nombrados.join(' · '));

terminar('el conversor: se abre, no lee datos personales y casa con los analizadores.');
