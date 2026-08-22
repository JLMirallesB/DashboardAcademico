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

/** ¿Esta fila es un agregado y no una asignatura? */
export const esFilaTotal = (asignatura) => TOTALES.includes(normalizar(asignatura));

/** Busca una clave dentro de un objeto sin distinguir mayúsculas ni espacios.
 *  Devuelve la clave real (para poder indexar) o `null`. */
export const buscarClave = (obj, nombre) => {
  if (!obj) return null;
  const buscado = normalizar(nombre);
  return Object.keys(obj).find((k) => normalizar(k) === buscado) || null;
};

/* ------------------------------------------------------------------ */
/* Trimestres                                                          */

/** «1EV-EEM» → { base: '1EV', etapa: 'EEM' }. `null` si no tiene esa forma. */
export const parseTrimestre = (trimestre) => {
  if (typeof trimestre !== 'string' || !trimestre.includes('-')) return null;
  const partes = trimestre.split('-');
  if (partes.length !== 2) return null;
  return { base: partes[0], etapa: partes[1] };
};

export const getTrimestreBase = (trimestre) => {
  const p = parseTrimestre(trimestre);
  return p ? p.base : trimestre;
};

export const getTrimestreEtapa = (trimestre) => {
  const p = parseTrimestre(trimestre);
  return p ? p.etapa : null;
};

/* El orden cronológico de las evaluaciones. Se aceptan las dos formas que
   circulan: la del exportador (`1EV`) y la que documenta el validador (`1T`).
   Un desconocido va al final, pero **con aviso**: si todos empatan a 99, el
   orden pasa a ser el de carga y la «evolución» se dibuja al revés sin que
   nada lo diga. */
export const ORDEN_EVALUACION = {
  '1EV': 1, '2EV': 2, '3EV': 3, 'FINAL': 4,
  '1T': 1, '2T': 2, '3T': 3
};

export const ordenDeEvaluacion = (base) =>
  ORDEN_EVALUACION[String(base || '').toUpperCase().trim()] ?? 99;

export const evaluacionConocida = (base) =>
  Object.prototype.hasOwnProperty.call(ORDEN_EVALUACION, String(base || '').toUpperCase().trim());

/** Orden canónico de trimestres: primero por evaluación, luego EEM antes que
 *  EPM. Es el mismo criterio en la pantalla y en el PDF; tenerlo en dos sitios
 *  era como acababan desincronizados el eje y la leyenda. */
export const compararTrimestres = (a, b) => {
  const pa = parseTrimestre(a);
  const pb = parseTrimestre(b);
  const oa = ordenDeEvaluacion(pa ? pa.base : a);
  const ob = ordenDeEvaluacion(pb ? pb.base : b);
  if (oa !== ob) return oa - ob;
  if (pa && pb && pa.etapa && pb.etapa) return pa.etapa.localeCompare(pb.etapa);
  return 0;
};

/** Las evaluaciones distintas presentes en una lista de trimestres, en orden
 *  cronológico y sin repetir. Es el eje X correcto de cualquier evolución: la
 *  etapa es una dimensión de serie, no una posición del eje. */
export const evaluacionesDe = (trimestres) => {
  const vistas = [];
  (trimestres || []).forEach((t) => {
    const base = getTrimestreBase(t);
    if (vistas.indexOf(base) < 0) vistas.push(base);
  });
  return vistas.sort((a, b) => ordenDeEvaluacion(a) - ordenDeEvaluacion(b));
};
