/* Núcleo — los avisos que viajan con el fichero
 *
 * Sin React. Convierte la sección `#METADATA` del CSV en la lista de cosas
 * que hay que saber ANTES de leer una cifra.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTO EXISTE
 *
 * El libro de cálculo sabe cuántos registros se han quedado fuera de las
 * cifras, cuántos se cuentan dos veces y hasta dónde ha mirado. Quien lo abre
 * lo ve. Quien mira solo esta aplicación, no: el exportador llevaba al CSV el
 * centro, el curso y la evaluación, y nada más.
 *
 * Y son justo los datos que cambian lo que significa un número. «Media 7,4»
 * con cuatro registros fuera no es la misma frase que «media 7,4» con cero.
 *
 * ---------------------------------------------------------------------------
 * Y POR QUÉ NO SE CORRIGEN
 *
 * Ninguno de los tres se puede arreglar desde aquí sin decidir por el centro:
 * una asignatura que no está en la configuración puede ser una errata o una
 * asignatura nueva, y quien lleva dos especialidades cuenta dos veces porque
 * tiene dos matrículas. Lo que se puede hacer es decirlo. Un sesgo dicho es
 * una condición de lectura; callado es un error.
 */

/** Lo que se enseña, en el orden en que importa.
 *
 *  `malo` es algo que está mal y se puede arreglar en el libro de cálculo.
 *  `ojo` es algo que está bien y hay que tener en cuenta al leer.
 *  `info` no pide nada: sitúa. */
export const AVISOS = [
  { clave: 'FueraDeLasCifras', nivel: 'malo', mensaje: 'avisoFueraDeLasCifras' },
  { clave: 'ExtraordinariaSinOrdinaria', nivel: 'malo', mensaje: 'avisoExtraSinOrdinaria' },
  { clave: 'DobleEspecialidad', nivel: 'ojo', mensaje: 'avisoDobleEspecialidad' },
];

/** Solo se cuenta como aviso lo que trae un número mayor que cero.
 *
 *  Un cero NO se enseña, y es deliberado: un cuadro que siempre tiene algo
 *  dentro se aprende a ignorar en una semana. Y un aviso que falta —porque el
 *  fichero viene de un libro antiguo— tampoco se inventa: `undefined` no es
 *  cero, es «no lo sé». */
const cifra = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export const avisosDelFichero = (metadata) => {
  const m = metadata || {};
  return AVISOS
    .map((a) => ({ ...a, n: cifra(m[a.clave]) }))
    .filter((a) => a.n !== null && a.n > 0);
};

/** Hasta dónde miró el libro. No es un aviso: es contexto, y va aparte para
 *  que no compita con lo que sí pide mirar algo. */
export const filasLeidas = (metadata) => {
  const n = cifra((metadata || {}).FilasConDatos);
  /* La celda dice la última FILA de la hoja, y la primera es la cabecera:
     hay una fila de datos menos. Devolver la fila tal cual sería decir que
     hay un registro más de los que hay. */
  return n === null ? null : Math.max(0, n - 1);
};
