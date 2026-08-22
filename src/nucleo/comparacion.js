/* Núcleo — comparar dos selecciones (y con ellas, dos trimestres)
 *
 * Sin React. Es la comparación que de verdad hace el usuario cuando quiere ver
 * cómo ha ido de una evaluación a la siguiente: añade una selección con el 1EV
 * y otra con el 2EV y mira la diferencia debajo de cada cifra.
 *
 * ---------------------------------------------------------------------------
 * NO TODAS LAS DIFERENCIAS SE LEEN IGUAL
 *
 * Subir la nota media es mejorar. Subir el porcentaje de aprobados es mejorar.
 * **Subir el porcentaje de suspensos es empeorar**, y sin embargo las tres se
 * pintaban con la misma regla: positivo, verde.
 *
 * Así que pasar de un 8,5 % de suspensos a un 14 % salía como `+5.5` en verde.
 * No es un detalle de color: es la cifra que decide si alguien mira una
 * asignatura o pasa de largo.
 */

/** Las cifras que admiten diferencia entre dos selecciones. Las demás —moda,
 *  registros— no se restan: la moda es un valor, no una escala. */
export const CLAVES_COMPARABLES = ['notaMedia', 'aprobados', 'suspendidos'];

/** ¿Para esta cifra, subir es empeorar? */
export const esInverso = (clave) => clave === 'suspendidos';

/** La diferencia de una cifra respecto de la selección de referencia.
 *
 * @param valor  el de esta selección
 * @param base   el de la selección de referencia (la primera)
 * @param clave  cuál de las cifras es
 * @returns null si no procede comparar, o { diff, mejora }
 *          · `diff`   la resta, con su signo aritmético (para enseñarla)
 *          · `mejora` true / false / null — la LECTURA, que no es el signo
 */
export const diferencia = (valor, base, clave) => {
  if (CLAVES_COMPARABLES.indexOf(clave) < 0) return null;

  /* TODO(fallo 3): hoy no se distingue «sin dato» de cero. Si la referencia
     trae la celda vacía, `7.2 - null` da 7,2 y se enseña como si la base
     hubiera sido cero. */
  if (valor === null || valor === undefined || valor === '') return null;
  if (base === null || base === undefined || base === '') return null;

  const diff = valor - base;

  /* TODO(fallo 3): esta es la lectura correcta, pero la pantalla todavía no la
     usa — sigue pintando en verde todo lo que sea `diff >= 0`. */
  const mejora = diff === 0 ? null : (esInverso(clave) ? diff < 0 : diff > 0);

  return { diff, mejora };
};

/** Cuántos decimales enseñar en cada cifra. Estaba repartido por el render con
 *  dos criterios distintos: el valor con dos decimales y su diferencia con uno,
 *  así que 7,24 frente a 7,19 mostraba «+0.1» y una diferencia de −0,04 salía
 *  como «-0.0» en rojo. */
export const DECIMALES = {
  notaMedia: 2,
  desviacion: 2,
  aprobados: 1,
  suspendidos: 1
};

export const decimalesDe = (clave) =>
  Object.prototype.hasOwnProperty.call(DECIMALES, clave) ? DECIMALES[clave] : 1;
