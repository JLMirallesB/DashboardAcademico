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
    /* `OR+EX` es la única opción que da la foto definitiva del curso: EX a
       solas enseña SOLO lo que se suspendió en junio, que es lo único que
       trae la extraordinaria, y una media de 4,2 sobre los recuperados se
       lee igual que «la media del centro». */
    codigos: '1EV,2EV,3EV,OR,EX,OR+EX', hojaCalc: 'CALC_EPM', rangoEspecialidad: '$B$7:$B$27',
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

  /* CANDADO. Dos celdas con la misma referencia en la misma fila, o filas
     desordenadas: Excel lo comprueba al abrir y ofrece reparar. Sale al
     regenerar una hoja conservando lo que había y añadiendo lo nuevo encima
     —ha pasado tres veces— y no se ve por ningún otro sitio. */
  const rotas = [];
  hojas.forEach((h) => {
    let ultima = 0;
    for (const fila of txt(h).matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
      const n = +fila[1];
      if (n <= ultima) rotas.push(`${h.split('/').pop()} fila ${n} fuera de orden`);
      ultima = n;
      const refs = [...fila[2].matchAll(/<c r="([A-Z]+)(\d+)"/g)];
      const cols = refs.map((x) => x[1]);
      if (new Set(cols).size !== cols.length) {
        const dup = cols.filter((c, i) => cols.indexOf(c) !== i);
        rotas.push(`${h.split('/').pop()} fila ${n}: celda repetida ${[...new Set(dup)]}`);
      }
      if (refs.some((x) => +x[2] !== n)) rotas.push(`${h.split('/').pop()} fila ${n}: celda de otra fila`);
    }
  });
  comprobar('CANDADO: ni celdas repetidas en una fila ni filas desordenadas',
    rotas.length === 0, rotas.slice(0, 4).join(' · ') + (rotas.length > 4 ? ` (y ${rotas.length - 4} más)` : ''));

  /* CANDADO. Una fórmula que lleva dentro FILTER o UNIQUE es de matriz
     dinámica, y en el XML hay que DECLARARLO: `cm="1"` en la celda y
     `<f t="array" ref="…">`. Sin eso Excel no la evalúa como matriz — y no da
     ningún error: la columna selectora de profesional se quedó en una sola
     celda, todos los totales del libro dieron 1, y lo único visible era que
     la primera celda tenía el valor correcto. */
  const sinDeclarar = [...piezas.keys()]
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .flatMap((k) => [...txt(k).matchAll(/<c r="([A-Z]+\d+)"([^>]*)><f([^>]*)>([^<]*)/g)]
      .filter((x) => /_xlws\.FILTER\(|_xlfn\.UNIQUE\(/.test(x[4])
                     && !(/cm="1"/.test(x[2]) && /t="array"/.test(x[3])))
      .map((x) => `${k.split('/').pop()}!${x[1]}`));
  comprobar('CANDADO: las fórmulas de matriz se declaran como matriz',
    sinDeclarar.length === 0,
    sinDeclarar.slice(0, 5).join(' · ') + (sinDeclarar.length > 5 ? ` (y ${sinDeclarar.length - 5} más)` : ''));

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

  /* CANDADO. Los rangos llegan hasta donde hay datos, no hasta la fila
     20.000. Con 1.939 filas reales, diecinueve de cada veinte lecturas eran
     de celdas vacías: profesional citaba 345.221 veces un rango de 20.000, o
     sea unos 6.900 millones de lecturas por recálculo. Se hace con nombres
     definidos —`nASIG` ocupa menos que `DATOS!$I$2:$I$20000`, así que el
     fichero encoge— y con INDEX, no con OFFSET, que es volátil y obligaría a
     recalcular el libro entero cada vez que se toca una celda.

     Si alguien vuelve a escribir un rango fijo, no falla nada: el libro da
     las mismas cifras y tarda diez veces más en abrirse. */
  const fijos = hojas.map((h) => [h, (txt(h).match(/\$2:\$[A-Z]+\$20000/g) || []).length])
    .filter(([, n]) => n > 0);
  comprobar('CANDADO: ningún rango llega a la fila 20.000 a lo bruto',
    fijos.length === 0,
    fijos.map(([h, n]) => `${h.split('/').pop()} ×${n}`).join(' · '));

  comprobar('y hay nombres definidos que dicen hasta dónde',
    /<definedName name="nASIG">/.test(wb) && wb.includes('INDEX(') && !wb.includes('OFFSET('),
    (wb.match(/<definedName name="(\w+)"/g) || []).length + ' nombres');

  /* Las columnas del catálogo son CRITERIOS, no rótulos: «especialidad» en
     minúscula o «SI» sin tilde no dan error en ninguna parte, la asignatura
     simplemente deja de contar donde debía. Una lista cerrada es la
     diferencia entre un error imposible y un error invisible. */
  const cfgV = txt('xl/worksheets/sheet2.xml');
  const conLista = (cfgV.match(/<dataValidation type="list"/g) || []).length;
  comprobar('el catálogo tiene listas cerradas en sus columnas de criterio',
    conLista >= 5, conLista + ' columnas con lista');

  /* CANDADO: y van DONDE dice el esquema. Ponerlas al final es lo que hizo
     que los dos libros abrieran dañados la primera vez. */
  comprobar('CANDADO: y el formato condicional va antes que las validaciones',
    !/<dataValidations[\s\S]*<conditionalFormatting/.test(cfgV)
    && !/<pageMargins[\s\S]*<(?:dataValidations|conditionalFormatting)/.test(cfgV));

  comprobar('y una asignatura desactivada se ve en rojo',
    /<conditionalFormatting/.test(cfgV) && cfgV.includes('$G2&lt;&gt;&quot;Sí&quot;')
    && /<dxfs count="[1-9]/.test(txt('xl/styles.xml')));

  /* CANDADO. Ningún texto del libro nombra una herramienta de gestión
     concreta. Este analizador lo puede abrir cualquier conservatorio, y el que
     lo haga no tiene por qué usar las mismas que nosotros: lo que importa es
     la FORMA de los datos, no de dónde salgan. Estaba en el aviso del selector
     de evaluación —«usa uno de los códigos que escribe X»—, que es justo el
     texto que alguien lee cuando se equivoca. */
  const nombrados = ['GEODE', 'ITACA', 'Itaca', 'Geode']
    .filter((n) => [...piezas.keys()].filter((k) => k.endsWith('.xml'))
      .some((k) => txt(k).includes(n)));
  comprobar('CANDADO: no se nombra ninguna herramienta de gestión concreta',
    nombrados.length === 0, nombrados.join(' · '));

  /* Los tres avisos que hay que mirar antes de fiarse de una cifra. Ninguno
     corrige nada: los tres DICEN. */
  const meta3 = txt('xl/worksheets/sheet3.xml');
  const faltan = ['FilasConDatos', 'FueraDeLasCifras', 'DobleEspecialidad']
    .concat(m.etapa === 'EPM' ? ['ExtraordinariaSinOrdinaria'] : [])
    .filter((a) => !meta3.includes(a));
  comprobar('lleva sus avisos, y los mismos en los dos libros',
    faltan.length === 0, 'faltan: ' + faltan.join(', '));

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

  /* Qué separa «Especialidad» de «No Especialidad». */
  const calc = txt(m.hojaCalc === 'CALC_EEM' ? 'xl/worksheets/sheet6.xml' : 'xl/worksheets/sheet6.xml');

  /* CANDADO. Quién es «especialidad» y quién está activa se deciden UNA vez,
     en la columna `Clase` del catálogo, y todo lo demás la mira.

     Antes cada total llevaba el criterio dentro: primero un RANGO DE FILAS
     —«las especialidades son de la 5 a la 27», que obliga a insertar en mitad
     del bloque y deja fuera, en silencio, a la que se escriba en la primera
     fila libre—, luego un COUNTIFS contra el catálogo entero con el rango de
     DATOS como criterio: 20.000 × 90 comparaciones por fórmula, unos 2.500
     millones por recálculo en profesional. Ahora es un VLOOKUP por fila.

     Lo que se rompe si esto se deshace no da error: las cifras siguen
     saliendo, y o cuentan de más, o el libro tarda un minuto en abrirse. */
  const cfg0 = txt('xl/worksheets/sheet2.xml');
  comprobar('CANDADO: la clase se calcula en el catálogo, y mira Grupo1 y Activa',
    /<c r="J\d+"[^>]*><f>IF\(\$G\d+&lt;&gt;&quot;Sí&quot;/.test(cfg0)
    && cfg0.includes('&quot;Especialidad&quot;,&quot;E&quot;'),
    'la columna Clase del catálogo');

  /* El rango puede venir escrito entero o por su nombre definido: desde que
     los rangos se acotan a las filas con datos, las fórmulas dicen `nCLASE_I`
     en vez de `CONFIG_METADATA!$I$2:$I$20000`. */
  const porClase = (calc.match(/(?:CONFIG_METADATA!\$[A-Z]\$2:\$[A-Z]\$20000|nCLASE_[A-Z])(?:&lt;&gt;|=)&quot;(?:E|NT|)&quot;/g) || []).length;
  comprobar('CANDADO: los totales preguntan a la clase, no se recorren el catálogo',
    porClase >= 10 && !/COUNTIFS\(CONFIG_ASIGNATURAS/.test(calc),
    `${porClase} totales miran la clase` + (/COUNTIFS\(CONFIG_ASIGNATURAS/.test(calc)
      ? ' · pero queda algún COUNTIFS contra el catálogo' : ''));

  if (m.listaManda) {
    /* Y los rangos llegan más abajo que las asignaturas escritas, que es lo
       que permite añadir una sin volver a generar el libro. */
    const escritas = [...cfg0.matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/gs)]
      .filter((x) => +x[1] > 1 && /<c r="B\d+"[^>]*>(?!<\/c>)/.test(x[2])).length;
    const hasta = Math.max(...[...cfg0.matchAll(/CONFIG_ASIGNATURAS!\$B\$2:\$[A-Z]\$(\d+)/g)]
      .concat([...txt('xl/worksheets/sheet3.xml').matchAll(/CONFIG_ASIGNATURAS!\$B\$2:\$[A-Z]\$(\d+)/g)])
      .map((x) => +x[1]));
    comprobar('y los rangos dejan sitio libre para las que vengan',
      hasta > escritas + 20, `${escritas} escritas · los rangos llegan a la ${hasta}`);
  }

  /* Las fórmulas son el libro: si un día se pierden en una edición, el
     fichero abre igual y no calcula nada. */
  const formulas = (calc.match(/<f[ >]/g) || []).length;
  comprobar('las fórmulas de cálculo siguen ahí',
    formulas > 2000, formulas + ' fórmulas en ' + m.hojaCalc);

  /* El catálogo entero, para que cada centro active lo suyo. */
  const cfg = txt('xl/worksheets/sheet2.xml');
  /* Se cuentan las filas que tienen ASIGNATURA, no las filas de la hoja: por
     debajo hay margen libre marcado para las que cada centro añada. */
  const cuantas = [...cfg.matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/gs)]
    .filter((x) => +x[1] > 1 && /<c r="B\d+"[^>]*>(?!<\/c>)/.test(x[2])).length;
  comprobar(`la configuración lleva las ${m.asignaturas} asignaturas`,
    cuantas === m.asignaturas, cuantas + ' filas');

  if (m.listaManda) {
    /* CANDADO: el nombre de cada asignatura sale de la configuración, no está
       escrito en la hoja de cálculo. Es lo que hace que añadir una
       especialidad sea escribir una línea y no diez inserciones de fila. */
    const dinamicas = (calc.match(/<f[^>]*>IFERROR\(INDEX\(_xlfn\._xlws\.FILTER\(CONFIG_ASIGNATURAS/g) || []).length;
    comprobar('CANDADO: los nombres de asignatura los pone la configuración',
      dinamicas > 100, dinamicas + ' filas con nombre calculado');

    /* CANDADO: el exportador se calla la fila SIN NOMBRE, no la que da cero.
       Cada columna se guardaba a sí misma —`IF(CALC_EEM!D2="","",…)`—, así
       que una ranura sin usar salía al CSV con el nivel puesto, la asignatura
       vacía y ceros en todo; y `parseCSV` la ingiere, porque solo mira que la
       primera columna tenga algo y esa es el nivel. Cuarenta filas fantasma
       por fichero, indistinguibles de una asignatura con cero alumnos.
       Guardando por el nombre, sin nombre no hay fila y con nombre y cero
       registros sí la hay — que es justo para lo que existe «Activa»: «no lo
       impartimos» y «este año no hay nadie» no son lo mismo. */
    const exp0 = txt('xl/worksheets/sheet9.xml');
    const porNombre = (exp0.match(/IF\(CALC_EEM!\$B\d+=""/g) || []).length;
    const porOtra = (exp0.match(/IF\(CALC_EEM![A-Z]+\d+=""/g) || []).length;
    comprobar('CANDADO: el exportador se guarda por el nombre, no por su propia columna',
      porOtra === 0 && porNombre > 3000,
      `por el nombre ${porNombre} · por otra columna ${porOtra}`);
    comprobar('y no se salta ninguna asignatura por dar cero',
      (exp0.match(/N\(CALC_EEM!\$?[A-Z]+\d+\)=0/g) || []).length === 0);

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

  /* La opción que da la foto definitiva del curso. Existe porque `EX` a
     solas enseña SOLO las asignaturas suspendidas en junio —es lo único que
     trae la extraordinaria—, y eso se lee como si fuera el centro entero. */
  if (m.etapa === 'EPM') {
    const meta2 = txt('xl/worksheets/sheet3.xml');
    comprobar('lleva la columna que decide qué filas cuentan',
      /<c r="G2"[^>]*><f>/.test(meta2) && meta2.includes('OR+EX'),
      'la selectora está en CONFIG_METADATA!G2');

    /* CANDADO. Con 34.002 fórmulas comparando `DATOS!G` contra la evaluación
       elegida, `OR+EX` no podía existir: habría que escribir dos versiones de
       cada una. Ahora todas preguntan a una sola columna. Si alguien vuelve a
       comparar la evaluación en una fórmula de cálculo, esa cifra deja de
       responder a `OR+EX` y sigue dando un número — el de la ordinaria sola,
       sin las recuperaciones. */
    const sueltas = ['xl/worksheets/sheet6.xml', 'xl/worksheets/sheet7.xml',
      'xl/worksheets/sheet8.xml', 'xl/worksheets/sheet9.xml']
      .map((h) => [h, (txt(h) || '').split('DATOS!$G$2:$G$20000').length - 1])
      .filter(([, n]) => n > 0);
    comprobar('CANDADO: ninguna fórmula de cálculo compara la evaluación por su cuenta',
      sueltas.length === 0,
      sueltas.map(([h, n]) => `${h.split('/').pop()} ×${n}`).join(' · '));

    /* Y el aviso que antes no podía darse: una fila de extraordinaria sin su
       ordinaria no puede existir —no se recupera lo que no se suspendió— y
       con `OR+EX` se colaría como una nota más. */
    comprobar('y avisa de las filas de extraordinaria sin su ordinaria',
      meta2.includes('ExtraordinariaSinOrdinaria'));
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
