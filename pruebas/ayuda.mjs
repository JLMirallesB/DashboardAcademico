/* Lo mínimo para probar sin framework — pruebas/ayuda.mjs
 *
 * No hay vitest ni jest a propósito: el núcleo no depende de React ni del
 * navegador, así que node basta, y una dependencia menos es una cosa menos que
 * puede impedir que las pruebas se ejecuten el día que hagan falta.
 *
 * Regla de la casa: **una prueba que no puede fallar es peor que no tenerla.**
 * La forma de saberlo es romper el código a propósito y mirar si se pone roja.
 */

let ok = 0;
const fallos = [];

export function comprobar(titulo, condicion, detalle) {
  if (condicion) { ok++; console.log('  ✓ ' + titulo); }
  else {
    fallos.push(titulo + (detalle ? '\n      ' + detalle : ''));
    console.log('  ✗ ' + titulo + (detalle ? '  → ' + detalle : ''));
  }
}

export function seccion(titulo) { console.log('\n' + titulo); }

export function terminar(resumen) {
  console.log('');
  if (fallos.length) {
    console.error('FALLA:');
    fallos.forEach((f) => console.error('  · ' + f));
    process.exit(1);
  }
  console.log('OK: ' + ok + ' comprobaciones — ' + resumen);
}

/* Comparación de números con tolerancia: los cálculos llevan divisiones y
   exigir igualdad exacta convierte la prueba en un detector de ruido. */
export const casi = (a, b, eps = 1e-9) =>
  typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < eps;

export const UMBRALES = {
  suspensosAlerta: 30,
  mediaCritica: 6,
  mediaFacil: 8,
  aprobadosMinimo: 90,
  alumnosMinimo: 3
};
