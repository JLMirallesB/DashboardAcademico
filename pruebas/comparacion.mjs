/* Comparar dos selecciones — pruebas/comparacion.mjs
 *
 *   node pruebas/comparacion.mjs
 *
 * Es la comparación que de verdad hace el usuario cuando quiere ver cómo ha
 * ido de una evaluación a la siguiente: pone una selección con el 1EV, otra con
 * el 2EV, y mira la diferencia debajo de cada cifra.
 *
 * Lo que se vigila: que el SIGNO y la LECTURA no se confundan. Subir la nota
 * media es mejorar; subir el porcentaje de suspensos es empeorar. Las tres
 * cifras se pintaban con la misma regla —positivo, verde—, así que pasar de un
 * 8,5 % a un 14 % de suspensos salía como «+5.5» en verde. No es un detalle de
 * color: es la cifra que decide si alguien mira una asignatura o pasa de largo.
 */
import { diferencia, esInverso, decimalesDe, CLAVES_COMPARABLES } from '../src/nucleo/comparacion.js';
import { comprobar, seccion, terminar, casi } from './ayuda.mjs';

seccion('1. Subir no siempre es mejorar');
{
  const media = diferencia(7.5, 7.0, 'notaMedia');
  comprobar('subir la nota media es mejorar', casi(media.diff, 0.5) && media.mejora === true);
  comprobar('bajarla es empeorar', diferencia(7.0, 7.5, 'notaMedia').mejora === false);

  const aprob = diferencia(95, 90, 'aprobados');
  comprobar('subir los aprobados es mejorar', aprob.mejora === true);

  /* EL CANDADO. De 8,5 % a 14 % de suspensos: la diferencia es +5,5 y la
     lectura es «peor». Antes se pintaba en verde. */
  const susp = diferencia(14, 8.5, 'suspendidos');
  comprobar('CANDADO: subir los suspensos es EMPEORAR, aunque el signo sea +',
    casi(susp.diff, 5.5) && susp.mejora === false,
    JSON.stringify(susp));
  comprobar('y bajarlos es mejorar, aunque el signo sea −',
    diferencia(8.5, 14, 'suspendidos').mejora === true);
  comprobar('el criterio está en un solo sitio',
    esInverso('suspendidos') && !esInverso('aprobados') && !esInverso('notaMedia'));
}

seccion('2. El empate no es una derrota');
{
  const igual = diferencia(7.2, 7.2, 'notaMedia');
  /* Se pintaba en rojo con «↓ 0.0 %», así que un grupo idéntico al centro
     parecía peor que el centro. */
  comprobar('CANDADO: una diferencia de cero no es ni mejor ni peor',
    igual.diff === 0 && igual.mejora === null, JSON.stringify(igual));
}

seccion('3. «Sin dato» no es cero');
{
  /* Si la referencia trae la celda vacía, `7.2 - null` daba 7,2 y se enseñaba
     como si la base hubiera sido cero: una mejora inventada de siete puntos. */
  comprobar('CANDADO: sin referencia no se compara',
    diferencia(7.2, null, 'notaMedia') === null &&
    diferencia(7.2, '', 'notaMedia') === null &&
    diferencia(7.2, undefined, 'notaMedia') === null);
  comprobar('y sin valor tampoco', diferencia(null, 7.2, 'notaMedia') === null);
  comprobar('un cero de verdad SÍ se compara',
    diferencia(0, 7.2, 'notaMedia') !== null &&
    diferencia(0, 7.2, 'notaMedia').mejora === false);
}

seccion('4. Qué se compara y qué no');
{
  comprobar('la moda no se resta: es un valor, no una escala',
    diferencia(7, 6, 'moda') === null);
  comprobar('los registros tampoco', diferencia(30, 20, 'registros') === null);
  comprobar('y las tres comparables son las que dice la lista',
    CLAVES_COMPARABLES.join() === 'notaMedia,aprobados,suspendidos');
}

seccion('5. Los decimales, iguales arriba y abajo');
{
  /* El valor se enseñaba con dos decimales y su diferencia con uno: 7,24
     frente a 7,19 mostraba «+0.1», y una diferencia real de −0,04 se imprimía
     como «-0.0» en rojo. */
  comprobar('CANDADO: la nota media lleva dos decimales, como el valor',
    decimalesDe('notaMedia') === 2);
  comprobar('los porcentajes, uno',
    decimalesDe('aprobados') === 1 && decimalesDe('suspendidos') === 1);
  const fina = diferencia(7.19, 7.24, 'notaMedia');
  comprobar('y una diferencia pequeña deja de salir como «-0.0»',
    fina.diff.toFixed(decimalesDe('notaMedia')) === '-0.05',
    fina.diff.toFixed(decimalesDe('notaMedia')));
}

terminar('el signo, la lectura y el «sin dato».');
