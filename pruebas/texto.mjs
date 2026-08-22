/* El criterio de qué es una fila de total y cómo se ordenan los trimestres
 *
 *   node pruebas/texto.mjs
 *
 * Parece la parte tonta y es la que más daño hacía: dos grafías de la misma
 * fila agregada —«Total no Especialidad» en elemental y «Total No
 * Especialidad» en profesional— hacían que once comparaciones de cadena
 * acertaran en una etapa y fallaran en la otra.
 */
import { normalizar, sinAcentos, esFilaTotal, buscarClave, parseTrimestre,
         getTrimestreBase, getTrimestreEtapa, compararTrimestres,
         evaluacionesDe, ordenDeEvaluacion, evaluacionConocida } from '../src/nucleo/texto.js';
import { comprobar, seccion, terminar } from './ayuda.mjs';

seccion('1. Qué cuenta como fila de total');
{
  comprobar('«Total» lo es', esFilaTotal('Total'));
  comprobar('CANDADO: «Total no Especialidad» (elemental) lo es',
    esFilaTotal('Total no Especialidad'));
  comprobar('CANDADO: «Total No Especialidad» (profesional) TAMBIÉN lo es',
    esFilaTotal('Total No Especialidad'));
  comprobar('y da igual el espaciado y la caja',
    esFilaTotal('  TOTAL ESPECIALIDAD  '));
  comprobar('una asignatura no lo es', !esFilaTotal('Piano'));
  /* Que no se pase de listo: hay asignaturas que empiezan por «total» en
     ningún catálogo, pero el criterio es de igualdad, no de prefijo. */
  comprobar('CANDADO: el criterio es igualdad, no «empieza por»',
    !esFilaTotal('Total de horas de práctica'));
}

seccion('2. Acentos: se conservan, y por una razón');
{
  comprobar('normalizar NO quita tildes', normalizar('Percusión') === 'percusión');
  comprobar('sinAcentos sí, cuando se pide expresamente',
    sinAcentos('Percusión') === 'percusion');
  /* El mapa de agrupaciones se construye con `normalizar`. Si quien consulta
     usa una función que quita acentos, la clave nunca casa y la asignatura
     desaparece del informe sin ningún aviso. */
  comprobar('CANDADO: la clave con la que se guarda y con la que se busca coinciden',
    normalizar('Saxofón') === normalizar('  SAXOFÓN '));
}

seccion('3. Buscar una fila sin saber cómo la escribieron');
{
  const global = { 'Total No Especialidad': { stats: { notaMedia: 7 } }, 'Piano': {} };
  comprobar('encuentra la clave real para poder indexar',
    buscarClave(global, 'total no especialidad') === 'Total No Especialidad');
  comprobar('y devuelve null si de verdad no está',
    buscarClave(global, 'Violonchelo') === null);
  comprobar('sin objeto no revienta', buscarClave(null, 'x') === null);
}

seccion('4. Trimestres');
{
  comprobar('parte la clave compuesta',
    parseTrimestre('1EV-EEM').base === '1EV' && parseTrimestre('1EV-EEM').etapa === 'EEM');
  comprobar('lo que no tiene esa forma devuelve null',
    parseTrimestre('1EV') === null && parseTrimestre('a-b-c') === null);
  comprobar('la base de algo sin etapa es ello mismo', getTrimestreBase('1EV') === '1EV');
  comprobar('la etapa de algo sin etapa es null', getTrimestreEtapa('1EV') === null);
}

seccion('5. El orden cronológico');
{
  const desordenado = ['3EV-EPM', '1EV-EPM', '2EV-EEM', '1EV-EEM', 'FINAL-EEM'];
  comprobar('primero por evaluación, y dentro EEM antes que EPM',
    [...desordenado].sort(compararTrimestres).join() ===
    '1EV-EEM,1EV-EPM,2EV-EEM,3EV-EPM,FINAL-EEM',
    [...desordenado].sort(compararTrimestres).join());

  /* El formato «1T» lo documenta el validador del propio proyecto. Si no se
     reconoce, todos empatan al final y el orden pasa a ser el de carga: la
     evolución se dibuja al revés y la tendencia sale con el signo cambiado. */
  comprobar('CANDADO: también se reconoce el formato 1T/2T/3T',
    ordenDeEvaluacion('2T') === 2 && evaluacionConocida('3T'));
  comprobar('y lo desconocido se puede detectar, no solo empatar',
    !evaluacionConocida('OTOÑO') && ordenDeEvaluacion('OTOÑO') === 99);
}

seccion('6. El eje del tiempo: evaluaciones, no claves compuestas');
{
  const trimestres = ['1EV-EEM', '1EV-EPM', '2EV-EEM', '2EV-EPM'];
  comprobar('CANDADO: cuatro ficheros son DOS momentos del curso',
    evaluacionesDe(trimestres).join() === '1EV,2EV',
    evaluacionesDe(trimestres).join());
  comprobar('y salen en orden aunque lleguen al revés',
    evaluacionesDe(['3EV-EPM', '1EV-EEM']).join() === '1EV,3EV');
}

seccion('7. El filtro por agrupación del informe (fallo 10)');
{
  /* El mapa de agrupaciones se construye con `normalizar`, que CONSERVA los
     acentos. El informe tenía su propia copia que los quitaba, así que
     buscaba «percusion» en un mapa cuya clave es «percusión»: la asignatura
     no pertenecía a ningún grupo, desaparecía del informe sin aviso, y la
     portada seguía contando las que sí. */
  const mapa = {};
  ['Percusión', 'Violín', 'Saxofón', 'Órgano', 'Piano'].forEach((a) => {
    mapa[normalizar(a)] = ['especialidad'];
  });
  const pertenece = (asig) => (mapa[normalizar(asig)] || []).indexOf('especialidad') >= 0;
  comprobar('CANDADO: las asignaturas con tilde encuentran su grupo',
    ['Percusión', 'Violín', 'Saxofón', 'Órgano'].every(pertenece),
    ['Percusión', 'Violín', 'Saxofón', 'Órgano'].filter((a) => !pertenece(a)).join(' · '));
  comprobar('y las que no tienen tilde también, claro', pertenece('Piano'));
  /* Y la prueba de que el fallo era real: con la normalización que quitaba
     acentos, ninguna de las cuatro casaba. */
  const conAcentosQuitados = (asig) =>
    (mapa[sinAcentos(asig)] || []).indexOf('especialidad') >= 0;
  comprobar('CANDADO: quitar los acentos al buscar las pierde todas',
    !['Percusión', 'Violín', 'Saxofón', 'Órgano'].some(conAcentosQuitados));
}

terminar('el criterio de totales, los acentos y el eje del tiempo.');
