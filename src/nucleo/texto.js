/* Núcleo — texto, filas de totales y trimestres
 *
 * Sin React y sin dependencias. Todo lo que hay aquí se puede ejercitar en node.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE `esFilaTotal`
 *
 * En el CSV conviven filas de asignatura y filas de TOTAL, y las segundas hay
 * que apartarlas en casi todos los cálculos: un «Total no Especialidad» con 730
 * registros compitiendo en un ranking de asignaturas de ocho alumnos no es un
 * dato, es un artefacto.
 *
 * Y hay una trampa medida: la plantilla de elemental escribe «Total no
 * Especialidad» y la de profesional «Total **N**o Especialidad». Son la misma
 * fila con dos grafías, así que compararlas con `===` acierta en una etapa y
 * falla en la otra — que es la peor forma de fallar, porque el síntoma es «los
 * números de profesional no cuadran» y no señala a ninguna línea.
 *
 * Por eso el criterio vive AQUÍ y en un solo sitio. Añadir una grafía nueva se
 * hace en `TOTALES` y no en los once sitios que comparaban cadenas.
 */

/** Minúsculas y sin espacios sobrantes. Conserva los acentos a propósito: las
 *  claves de agrupaciones se construyen con esta misma función, y quitarlos
 *  aquí y no allí es lo que hacía desaparecer del informe a Percusión, Violín
 *  y Saxofón. Para comparar sin acentos, `sinAcentos`. */
export const normalizar = (str) => {
  if (typeof str !== 'string') return '';
  return str.toLowerCase().trim();
};

/** Normaliza y además quita tildes. Solo para donde se quiera tolerancia
 *  explícita; NO para claves de mapas que se construyan con `normalizar`. */
export const sinAcentos = (str) =>
  normalizar(str).normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Las filas agregadas, ya normalizadas. `total no especialidad` cubre las dos
 *  grafías de las plantillas porque `normalizar` pasa a minúsculas. */
export const TOTALES = [
  'total',
  'total especialidad',
  'total no especialidad'
];

/** ¿Esta fila es uno de los tres totales? */
export const esFilaTotal = (asignatura) => TOTALES.includes(normalizar(asignatura));

/* «Teórica Troncal» NO es una asignatura: es la suma de Lenguaje Musical,
   Armonía y Análisis, y el analizador la escribe como una fila más de
   #ESTADISTICAS para poder pintarla arriba. Contarla en un ranking de
   asignaturas la pone a competir con sus propias partes y suma una asignatura
   inexistente al recuento. Es el mismo fallo que tenían las filas de total,
   una fila más abajo. */
export const AGREGADOS = TOTALES.concat(['teórica troncal']);

/** ¿Esta fila es un agregado y no una asignatura de verdad?
 *  Es el criterio que hay que usar para RANKINGS y RECUENTOS de asignaturas.
 *  `esFilaTotal` sigue existiendo para lo que de verdad son los tres totales. */
export const esAgregado = (asignatura) => AGREGADOS.includes(normalizar(asignatura));

/** Busca una clave dentro de un objeto sin distinguir mayúsculas ni espacios.
 *  Devuelve la clave real (para poder indexar) o `null`. */
export const buscarClave = (obj, nombre) => {
  if (!obj) return null;
  const buscado = normalizar(nombre);
  return Object.keys(obj).find((k) => normalizar(k) === buscado) || null;
};

/* ------------------------------------------------------------------ */
/* LA CLAVE DE UN FICHERO CARGADO                                      */

/* Cada CSV que se carga vive bajo una clave, y esa clave es su identidad:
 * indexa los datos, las correlaciones, las agrupaciones y la metadata, es el
 * `value` de tres desplegables y es un nombre de propiedad dentro del JSON
 * que se exporta.
 *
 * Hasta el 23/08/2026 era `evaluación-etapa` —«1EV-EEM»— y **el curso
 * académico no formaba parte de ella**, aunque viene en la metadata del CSV.
 * Consecuencia medida: cargar la primera evaluación del curso pasado y la de
 * este producía la MISMA clave y la segunda pisaba a la primera sin un aviso.
 * Es decir, la comparación más útil que puede querer un equipo directivo —¿vamos
 * mejor que el año pasado?— no solo no se podía hacer: intentarla borraba datos.
 *
 * Ahora la clave es `evaluación-curso-etapa`: **1EV-2526-EEM**.
 *
 * Tres decisiones, y conviene entenderlas antes de tocarlas:
 *
 *  · **El curso va normalizado a dígitos.** «25/26» → «2526». El campo del CSV
 *    no tiene formato garantizado —se han visto «25/26» y «2026-2027»— y una
 *    barra dentro de la clave acabaría en el nombre del PDF y en un `dataKey`
 *    de Recharts, donde tiene consecuencias. Los dígitos no son para leerlos:
 *    para eso está la metadata.
 *  · **Es una cadena, no un objeto.** No cabe otra cosa: la clave es nombre de
 *    propiedad en cuatro mapas, `value` de tres `<select>` de HTML —que siempre
 *    devuelven cadenas— y parte del formato del fichero exportado.
 *  · **Dos partes siguen siendo válidas**, y eso da la compatibilidad gratis:
 *    un JSON exportado antes, o un CSV sin curso académico, produce «1EV-EEM» y
 *    todo sigue funcionando con `curso: null`. Para distinguirlas sin
 *    ambigüedad: **el curso es todo dígitos y la etapa son letras.**
 */

/** El curso académico, reducido a CUATRO dígitos: «2526».
 *
 * No basta con quitar lo que no sea dígito. El campo del CSV no tiene formato
 * garantizado y se han visto por lo menos tres formas —«25/26», «2025/26» y
 * «2026-2027»—, que darían «2526», «202526» y «20262027»: tres identidades
 * distintas para el mismo curso.
 *
 * Y eso no es cosmético. La clave del fichero lleva el curso dentro, así que
 * si el CSV de elemental lo escribe de una forma y el de profesional de otra,
 * **dejan de ser el mismo momento**: el modo TODOS no los empareja, el eje del
 * tiempo los pone en puntos distintos y la comparación entre etapas se queda
 * sin la mitad, sin que nada dé error.
 *
 * Por eso se reduce a los dos últimos dígitos de cada año. Colisionan dos
 * siglos —«1925/26» y «2025/26» dan lo mismo— y es un precio que se paga a
 * gusto: para leerlo está `formatearCursoAcademico`, y la metadata conserva lo
 * que puso el centro.
 */
export const normalizarCurso = (curso) => {
  const d = String(curso == null ? '' : curso).replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 8) return d.slice(2, 4) + d.slice(6, 8);   // 2026-2027 → 2627
  if (d.length === 6) return d.slice(2, 4) + d.slice(4, 6);   // 2025/26  → 2526
  return d;                                                    // 25/26    → 2526
};

/** Construye la clave de un fichero. El curso y la etapa son opcionales:
 *  lo que no se sabe, no se inventa. */
export const claveTrimestre = (evaluacion, curso, etapa) => {
  const partes = [String(evaluacion == null ? '' : evaluacion).trim()];
  const c = normalizarCurso(curso);
  if (c) partes.push(c);
  if (etapa) partes.push(String(etapa).trim());
  return partes.join('-');
};

/** «1EV-2526-EEM» → { base: '1EV', curso: '2526', etapa: 'EEM' }.
 *  Con dos partes se decide por la forma: dígitos es curso, letras es etapa.
 *  `null` si no tiene ninguna de las dos formas. */
export const parseTrimestre = (trimestre) => {
  if (typeof trimestre !== 'string' || !trimestre.includes('-')) return null;
  const partes = trimestre.split('-');
  if (partes.length === 3) {
    return { base: partes[0], curso: partes[1], etapa: partes[2] };
  }
  if (partes.length === 2) {
    return /^\d+$/.test(partes[1])
      ? { base: partes[0], curso: partes[1], etapa: null }
      : { base: partes[0], curso: null, etapa: partes[1] };
  }
  return null;
};

export const getTrimestreBase = (trimestre) => {
  const p = parseTrimestre(trimestre);
  return p ? p.base : trimestre;
};

export const getTrimestreEtapa = (trimestre) => {
  const p = parseTrimestre(trimestre);
  return p ? p.etapa : null;
};

export const getTrimestreCurso = (trimestre) => {
  const p = parseTrimestre(trimestre);
  return p ? p.curso : null;
};

/** ¿Son del mismo curso académico? Dos ficheros sin curso conocido se
 *  consideran del mismo, que es lo que pasaba antes de que la clave lo llevara. */
export const mismoCurso = (a, b) => getTrimestreCurso(a) === getTrimestreCurso(b);

/* El orden cronológico de las evaluaciones. Se aceptan las dos formas que
   circulan: la del exportador (`1EV`) y la que documenta el validador (`1T`).
   Un desconocido va al final, pero **con aviso**: si todos empatan a 99, el
   orden pasa a ser el de carga y la «evolución» se dibuja al revés sin que
   nada lo diga. */
export const ORDEN_EVALUACION = {
  '1EV': 1, '2EV': 2, '3EV': 3, 'FINAL': 4,
  '1T': 1, '2T': 2, '3T': 3,
  /* Los códigos que salen de GEODE, añadidos el 24/08/2026. Elemental cierra
     con FI y profesional con OR, y las dos son «el final de su etapa»: nunca
     conviven en el mismo fichero —FI solo aparece con cursos EEM y OR solo
     con EPM—, así que comparten posición. La extraordinaria va detrás, que es
     donde ocurre.

     Sin esto los tres caían a 99 y empataban: el eje del tiempo los colocaba
     en el orden en que se cargaron los ficheros, y una evolución dibujada al
     revés no da ningún error. */
  'FI': 4, 'OR': 4, 'EX': 5
};

export const ordenDeEvaluacion = (base) =>
  ORDEN_EVALUACION[String(base || '').toUpperCase().trim()] ?? 99;

export const evaluacionConocida = (base) =>
  Object.prototype.hasOwnProperty.call(ORDEN_EVALUACION, String(base || '').toUpperCase().trim());

/** Orden canónico de trimestres: primero por CURSO ACADÉMICO, luego por
 *  evaluación, y dentro EEM antes que EPM. Es el mismo criterio en la pantalla
 *  y en el informe; tenerlo en dos sitios era como acababan desincronizados el
 *  eje y la leyenda.
 *
 *  El curso se compara como cadena de dígitos. Eso ordena bien mientras un
 *  centro escriba el curso académico siempre igual —«25/26», «26/27»—, que es
 *  lo que pasa. Mezclar dos formas de escribirlo en la misma sesión («25/26» y
 *  «2026-2027») daría un orden raro; no se soporta, y no se disimula. */
export const compararTrimestres = (a, b) => {
  const pa = parseTrimestre(a);
  const pb = parseTrimestre(b);
  const ca = (pa && pa.curso) || '';
  const cb = (pb && pb.curso) || '';
  if (ca !== cb) return ca < cb ? -1 : 1;
  const oa = ordenDeEvaluacion(pa ? pa.base : a);
  const ob = ordenDeEvaluacion(pb ? pb.base : b);
  if (oa !== ob) return oa - ob;
  if (pa && pb && pa.etapa && pb.etapa) return pa.etapa.localeCompare(pb.etapa);
  return 0;
};

/* ------------------------------------------------------------------ */
/* EL EJE DEL TIEMPO                                                   */

/* Un MOMENTO es un punto del calendario: curso académico + evaluación. Es el
 * eje X correcto de cualquier evolución.
 *
 * Antes el eje eran las evaluaciones a secas, y con un solo curso cargado eso
 * bastaba. En cuanto conviven dos cursos deja de bastar: la primera evaluación
 * de 25/26 y la de 26/27 **no son el mismo momento**, y fundirlas en un punto
 * es exactamente el fallo que ya se arregló con las etapas, un año más arriba.
 *
 * La etapa NO entra aquí, y esa es la asimetría deliberada: elemental y
 * profesional se evalúan a la vez —son el mismo momento visto en dos sitios— y
 * por eso la etapa es una dimensión de la SERIE. Dos cursos académicos, no.
 */

/** Los momentos distintos de una lista de claves, en orden y sin repetir.
 *  Cada uno: { clave, curso, base }. La `clave` sirve de valor del eje; el
 *  rótulo lo pone quien pinta, que es quien sabe si hay que decir el curso. */
export const momentosDe = (trimestres) => {
  const vistos = new Map();
  (trimestres || []).forEach((t) => {
    const p = parseTrimestre(t);
    const base = p ? p.base : getTrimestreBase(t);
    const curso = p ? p.curso : null;
    const clave = curso ? curso + '\u00b7' + base : base;
    if (!vistos.has(clave)) vistos.set(clave, { clave, curso, base });
  });
  return Array.from(vistos.values()).sort((x, y) => {
    const cx = x.curso || '', cy = y.curso || '';
    if (cx !== cy) return cx < cy ? -1 : 1;
    return ordenDeEvaluacion(x.base) - ordenDeEvaluacion(y.base);
  });
};

/** ¿Los dos ficheros son del MISMO momento —misma evaluación y mismo curso—,
 *  aunque sean de etapas distintas?
 *
 *  Existe porque el componente resolvía esa pregunta con
 *  `t.startsWith(trimestreBase)`, en cuatro sitios. Con la clave de dos partes
 *  colaba; con el curso dentro, «1EV» casa con «1EV-2425-EEM» Y con
 *  «1EV-2526-EEM», así que el modo TODOS fundía dos cursos académicos en el
 *  mismo recuento de niveles, en el mismo catálogo de asignaturas y —en uno de
 *  los cuatro— en la misma SUMA de registros. Un prefijo no es una identidad. */
export const mismoMomento = (a, b) => {
  const pa = parseTrimestre(a);
  const pb = parseTrimestre(b);
  const ba = pa ? pa.base : getTrimestreBase(a);
  const bb = pb ? pb.base : getTrimestreBase(b);
  if (ba !== bb) return false;
  return ((pa && pa.curso) || null) === ((pb && pb.curso) || null);
};

/** ¿Este fichero es de ese momento? */
export const esDelMomento = (trimestre, momento) => {
  if (!momento) return false;
  const p = parseTrimestre(trimestre);
  const base = p ? p.base : getTrimestreBase(trimestre);
  const curso = p ? p.curso : null;
  return base === momento.base && (curso || null) === (momento.curso || null);
};

/** Cuántos cursos académicos distintos hay cargados. Decide si la interfaz
 *  tiene que enseñar el curso o puede callárselo. */
export const cursosDe = (trimestres) => {
  const vistos = [];
  (trimestres || []).forEach((t) => {
    const c = getTrimestreCurso(t);
    if (vistos.indexOf(c) < 0) vistos.push(c);
  });
  return vistos;
};

/** Las evaluaciones distintas, sin mirar el curso. Se conserva porque hay
 *  sitios donde de verdad se quiere «qué evaluaciones existen», pero **no es
 *  el eje del tiempo**: para eso, `momentosDe`. */
export const evaluacionesDe = (trimestres) => {
  const vistas = [];
  (trimestres || []).forEach((t) => {
    const base = getTrimestreBase(t);
    if (vistas.indexOf(base) < 0) vistas.push(base);
  });
  return vistas.sort((a, b) => ordenDeEvaluacion(a) - ordenDeEvaluacion(b));
};
