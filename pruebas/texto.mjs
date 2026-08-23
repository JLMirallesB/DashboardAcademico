/* El criterio de qué es una fila de total y cómo se ordenan los trimestres
 *
 *   node pruebas/texto.mjs
 *
 * Parece la parte tonta y es la que más daño hacía: dos grafías de la misma
 * fila agregada —«Total no Especialidad» en elemental y «Total No
 * Especialidad» en profesional— hacían que once comparaciones de cadena
 * acertaran en una etapa y fallaran en la otra.
 */
import { normalizar, sinAcentos, esFilaTotal, esAgregado, buscarClave, parseTrimestre,
         getTrimestreBase, getTrimestreEtapa, getTrimestreCurso, compararTrimestres,
         evaluacionesDe, ordenDeEvaluacion, evaluacionConocida,
         claveTrimestre, normalizarCurso, momentosDe, esDelMomento, cursosDe,
         mismoCurso } from '../src/nucleo/texto.js';
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

  /* «Teórica Troncal» es la SUMA de lenguaje musical, armonía y análisis, y el
     analizador la escribe como una fila más para poder pintarla arriba.
     Contarla en un ranking la pone a competir con sus propias partes y suma
     una asignatura que no existe al recuento del centro. */
  comprobar('CANDADO: «Teórica Troncal» es un agregado, no una asignatura',
    esAgregado('Teórica Troncal') && esAgregado('teórica troncal'));
  comprobar('pero no es uno de los tres totales', !esFilaTotal('Teórica Troncal'));
  comprobar('y sus partes sí son asignaturas de verdad',
    !esAgregado('Armonía') && !esAgregado('Lenguaje Musical') && !esAgregado('Análisis'));
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

seccion('4. La clave de un fichero: evaluación, curso y etapa');
{
  comprobar('se construye con las tres partes',
    claveTrimestre('1EV', '25/26', 'EEM') === '1EV-2526-EEM');
  /* El curso va normalizado a dígitos: el campo del CSV no tiene formato
     garantizado —se han visto «25/26» y «2026-2027»— y una barra dentro de la
     clave acabaría en el nombre del PDF y en un dataKey de Recharts. */
  comprobar('el curso se normaliza a dígitos',
    normalizarCurso('25/26') === '2526' && normalizarCurso('2026-2027') === '20262027');
  comprobar('y sin curso no se inventa ninguno',
    normalizarCurso('') === null && claveTrimestre('1EV', '', 'EEM') === '1EV-EEM');

  comprobar('se parte en las tres',
    JSON.stringify(parseTrimestre('1EV-2526-EEM')) ===
    JSON.stringify({ base: '1EV', curso: '2526', etapa: 'EEM' }));

  /* CANDADO, y sustituye a conciencia al que decía lo contrario. Hasta el
     23/08/2026 una clave de tres partes se consideraba un ERROR y se
     devolvía null: la clave era evaluación-etapa y el curso académico no
     formaba parte de la identidad, así que cargar la primera evaluación de dos
     cursos daba la MISMA clave y la segunda pisaba a la primera sin avisar. */
  comprobar('CANDADO: tres partes ya NO son un error, son lo normal',
    parseTrimestre('1EV-2526-EEM') !== null);

  /* Dos partes siguen valiendo, y de ahí sale la compatibilidad: un JSON
     exportado antes, o un CSV sin curso, siguen cargándose. Para no
     confundirlas, el curso es todo dígitos y la etapa son letras. */
  comprobar('CANDADO: dos partes con letras es el formato antiguo, sin curso',
    JSON.stringify(parseTrimestre('1EV-EEM')) ===
    JSON.stringify({ base: '1EV', curso: null, etapa: 'EEM' }));
  comprobar('CANDADO: dos partes con dígitos es un curso sin etapa',
    JSON.stringify(parseTrimestre('1EV-2526')) ===
    JSON.stringify({ base: '1EV', curso: '2526', etapa: null }));

  comprobar('lo que no tiene ninguna de las dos formas devuelve null',
    parseTrimestre('1EV') === null && parseTrimestre('a-b-c-d') === null);
  comprobar('las tres piezas se pueden pedir por separado',
    getTrimestreBase('1EV-2526-EEM') === '1EV' &&
    getTrimestreCurso('1EV-2526-EEM') === '2526' &&
    getTrimestreEtapa('1EV-2526-EEM') === 'EEM');
  comprobar('y en el formato antiguo, el curso es null',
    getTrimestreCurso('1EV-EEM') === null && getTrimestreEtapa('1EV-EEM') === 'EEM');
  comprobar('dos ficheros sin curso conocido cuentan como del mismo',
    mismoCurso('1EV-EEM', '2EV-EPM') && !mismoCurso('1EV-2526-EEM', '1EV-2627-EEM'));
}

seccion('5. El orden cronológico');
{
  const desordenado = ['3EV-2627-EPM', '1EV-2627-EPM', '2EV-2627-EEM', '1EV-2627-EEM', 'FINAL-2627-EEM'];
  comprobar('primero por evaluación, y dentro EEM antes que EPM',
    [...desordenado].sort(compararTrimestres).join() ===
    '1EV-2627-EEM,1EV-2627-EPM,2EV-2627-EEM,3EV-2627-EPM,FINAL-2627-EEM',
    [...desordenado].sort(compararTrimestres).join());

  /* CANDADO: el curso académico manda sobre la evaluación. Sin esto, la
     tercera evaluación del curso pasado se dibujaría DESPUÉS de la primera de
     este, y la línea de evolución iría hacia atrás en el tiempo. */
  const dosCursos = ['1EV-2627-EEM', '3EV-2526-EEM', '1EV-2526-EEM'];
  comprobar('CANDADO: primero el curso, luego la evaluación',
    [...dosCursos].sort(compararTrimestres).join() ===
    '1EV-2526-EEM,3EV-2526-EEM,1EV-2627-EEM',
    [...dosCursos].sort(compararTrimestres).join());

  comprobar('CANDADO: también se reconoce el formato 1T/2T/3T',
    ordenDeEvaluacion('2T') === 2 && evaluacionConocida('3T'));
  comprobar('y lo desconocido se puede detectar, no solo empatar',
    !evaluacionConocida('OTOÑO') && ordenDeEvaluacion('OTOÑO') === 99);
}

seccion('6. El eje del tiempo son los MOMENTOS, no las evaluaciones');
{
  /* Un momento es curso académico + evaluación. La etapa NO entra, y esa
     asimetría es deliberada: elemental y profesional se evalúan a la vez —son
     el mismo momento visto en dos sitios—, mientras que dos cursos académicos
     son dos momentos distintos del calendario. */
  const unCurso = ['1EV-2627-EEM', '1EV-2627-EPM', '2EV-2627-EEM', '2EV-2627-EPM'];
  comprobar('CANDADO: cuatro ficheros de un curso son DOS momentos',
    momentosDe(unCurso).map((m) => m.base).join() === '1EV,2EV',
    momentosDe(unCurso).map((m) => m.clave).join());

  /* CANDADO nuevo, y es la razón de ser del cambio: la primera evaluación de
     dos cursos NO es el mismo punto del eje. Fundirlas es el mismo fallo que
     ya se arregló con las etapas, un año más arriba. */
  const dosCursos = ['1EV-2526-EEM', '1EV-2627-EEM', '2EV-2627-EEM'];
  comprobar('CANDADO: la primera evaluación de dos cursos son DOS momentos',
    momentosDe(dosCursos).length === 3,
    momentosDe(dosCursos).map((m) => m.clave).join());
  comprobar('y salen en orden, el curso viejo primero',
    momentosDe(dosCursos).map((m) => m.clave).join() === '2526·1EV,2627·1EV,2627·2EV');

  comprobar('cada fichero sabe a qué momento pertenece',
    esDelMomento('1EV-2627-EPM', momentosDe(dosCursos)[1]) &&
    !esDelMomento('1EV-2526-EEM', momentosDe(dosCursos)[1]));

  comprobar('se puede saber cuántos cursos hay cargados, para decidir si la interfaz lo dice',
    cursosDe(unCurso).length === 1 && cursosDe(dosCursos).length === 2);
  comprobar('con el formato antiguo, un solo curso desconocido',
    cursosDe(['1EV-EEM', '2EV-EPM']).join() === '');

  /* Se conserva «qué evaluaciones existen», que a veces es la pregunta; pero
     no es el eje del tiempo. */
  comprobar('las evaluaciones a secas siguen disponibles',
    evaluacionesDe(dosCursos).join() === '1EV,2EV');
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
