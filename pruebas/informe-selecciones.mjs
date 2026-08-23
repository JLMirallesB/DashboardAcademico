/* La comparación que el usuario arma a mano, en el informe — pruebas/informe-selecciones.mjs
 *
 *   node pruebas/informe-selecciones.mjs
 *
 * La vista «Estadísticas» es la única del programa que compone el usuario: hasta
 * quince filas elegidas a mano porque son las que quiere enseñar en la reunión.
 * Y era justo la que el PDF no llevaba.
 *
 * Lo que vigilan estas comprobaciones no es que las cifras salgan bonitas: es
 * que la tabla impresa sea LA MISMA que se compuso. Que no falte ninguna fila,
 * que las que el fichero no tiene se vean como lo que son y no como ceros, y
 * que el orden siga siendo el que se le dio.
 */
import { tablaSelecciones, rotuloSeleccion, statsDeSeleccion }
  from '../src/nucleo/informe-selecciones.js';
import { SIN_DATO } from '../src/nucleo/informe.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { csv, fila } from './fixtures.mjs';
import { comprobar, seccion, terminar } from './ayuda.mjs';

/* Un trimestre con las cuatro situaciones que hay que saber distinguir:
   la fila normal, la fila de total (que es la selección por defecto), la que
   existe sin ninguna nota y la de cero matriculados. */
const TRIM = csv({ trimestre: '1EV', curso: '26/27', filas: [
  fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total',
         registros: 100, media: 7, desviacion: 1.5, moda: 7,
         aprobados: 0.9, suspendidos: 0.1 }),
  fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Piano',
         registros: 8, media: 8.25, desviacion: 1.2, moda: 9,
         aprobados: 1, suspendidos: 0 }),
  /* Está en el fichero y no tiene ni una nota: seis matriculados sin evaluar. */
  fila({ tipo: 'CURSO_ASIG', nivel: '2EEM', asignatura: 'Optativa',
         registros: 6, media: null, desviacion: null, moda: null,
         aprobados: null, suspendidos: null }),
  /* Cero matriculados, que es un dato y no un hueco. */
  fila({ tipo: 'CURSO_ASIG', nivel: '2EEM', asignatura: 'Coro',
         registros: 0, media: null, desviacion: null, moda: null,
         aprobados: null, suspendidos: null })
] });

const procesado = procesarDatos(parseCSV(TRIM));
const DATOS = procesado.datos;
const T = procesado.trimestre;            // «1EV-2627-EEM»

const ROT = {
  seleccion: 'Selección', registros: 'N', notaMedia: 'Nota media',
  desviacion: 'Desviación', moda: 'Moda', aprobados: '% Aprobados',
  suspendidos: '% Suspensos',
  avisoNoEncontradas: '{n} selecciones no están en este fichero: {lista}'
};

const sel = (id, nivel, asignatura, trimestre = T) => ({ id, trimestre, nivel, asignatura });

seccion('1. Sin selecciones no hay sección');
{
  const vacia = tablaSelecciones([], DATOS, ROT);
  comprobar('sin selecciones, `vacio: true`', vacia.vacio === true);
  comprobar('y ni filas ni avisos que imprimir',
    vacia.filas.length === 0 && vacia.avisos.length === 0);
  comprobar('la cabecera viene igual, para que el pintor sea siempre el mismo',
    vacia.cabecera.length === 7 && vacia.cabecera[0] === 'Selección');
  /* No basta con contar siete. La cabecera no lleva nombres de columna: lleva
     POSICIONES, y las celdas de cada fila también. Intercambiar dos rótulos
     imprime la desviación debajo de «Moda» —un número correcto bajo el título
     de otro— y ni el pintor ni autoTable tienen forma de notarlo. */
  comprobar('CANDADO: cada rótulo en su sitio, en el orden de las celdas',
    vacia.cabecera.join('|') ===
      'Selección|N|Nota media|Desviación|Moda|% Aprobados|% Suspensos',
    vacia.cabecera.join('|'));
  comprobar('y sin repetidos, que es como se pierde una columna sin darse cuenta',
    new Set(vacia.cabecera).size === 7, vacia.cabecera.join('|'));
  comprobar('un `selecciones` que no es lista tampoco revienta',
    tablaSelecciones(null, DATOS, ROT).vacio === true &&
    tablaSelecciones(undefined, DATOS, ROT).vacio === true);
  comprobar('y una lista de basura es una lista vacía, no una fila de basura',
    tablaSelecciones([null, 'Piano', 7], DATOS, ROT).vacio === true);
}

seccion('2. El orden es el que le dio el usuario, no el alfabético');
{
  /* Piano, el total y Coro: ni por nombre, ni al revés, ni por cifra. Es SU
     comparación —la puso en ese orden para enseñarla en ese orden— y todas las
     demás tablas del informe sí van ordenadas, así que la tentación de pasarle
     un `.sort()` de paso está a una línea de distancia. */
  const t = tablaSelecciones([
    sel(1, '1EEM', 'Piano'),
    sel(2, 'GLOBAL', 'Total'),
    sel(3, '2EEM', 'Coro')
  ], DATOS, ROT);

  comprobar('una fila por selección, las tres', t.filas.length === 3 && t.vacio === false);
  comprobar('CANDADO: en el orden que se compuso, no en el alfabético',
    t.filas.map((f) => f[0]).join(' | ') ===
      `${T} · 1EEM · Piano | ${T} · GLOBAL · Total | ${T} · 2EEM · Coro`,
    t.filas.map((f) => f[0]).join(' | '));
  comprobar('y cada fila trae las siete celdas de la cabecera',
    t.filas.every((f) => f.length === t.cabecera.length));
}

seccion('3. Las cifras, con el formato del informe');
{
  const t = tablaSelecciones([sel(1, '1EEM', 'Piano')], DATOS, ROT);
  comprobar('N, media, desviación, moda y los dos porcentajes',
    t.filas[0].join('|') === `${T} · 1EEM · Piano|8|8.25|1.20|9|100.0%|0.0%`,
    t.filas[0].join('|'));
  comprobar('CANDADO: un 0 % de suspensos de verdad se escribe «0.0%», no «—»',
    t.filas[0][6] === '0.0%', t.filas[0][6]);
  comprobar('la selección por defecto es una fila de TOTAL y sale con sus cifras',
    /* En los rankings los agregados se descartan; aquí no, porque el programa
       arranca con GLOBAL · Total seleccionado y filtrarlo vaciaría la tabla más
       común de todas. */
    tablaSelecciones([sel(1, 'GLOBAL', 'Total')], DATOS, ROT)
      .filas[0].join('|') === `${T} · GLOBAL · Total|100|7.00|1.50|7|90.0%|10.0%`,
    tablaSelecciones([sel(1, 'GLOBAL', 'Total')], DATOS, ROT).filas[0].join('|'));
}

seccion('4. La selección que ya no está en el fichero');
{
  /* El caso de verdad: la comparación se compuso con otro trimestre cargado.
     En pantalla la tarjeta se salta entera y se nota, porque acabas de
     componerla. En un PDF que se mira en una reunión tres meses después, una
     comparación de cuatro filas que imprime tres se lee como una de tres. */
  const t = tablaSelecciones([
    sel(1, '1EEM', 'Piano'),
    sel(2, '3EEM', 'Guitarra'),        // ese nivel no está en el fichero
    sel(3, '1EEM', 'Guitarra'),        // el nivel sí, la asignatura no
    sel(4, 'GLOBAL', 'Total')
  ], DATOS, ROT);

  comprobar('CANDADO: las cuatro filas siguen ahí, ninguna desaparece',
    t.filas.length === 4, 'salen ' + t.filas.length);
  comprobar('CANDADO: y la que falta sale con «—», nunca con ceros',
    t.filas[1].slice(1).every((c) => c === SIN_DATO) &&
    t.filas[2].slice(1).every((c) => c === SIN_DATO),
    t.filas[1].join('|'));
  comprobar('con su rótulo delante, que es lo que permite ir a buscarla',
    t.filas[1][0] === `${T} · 3EEM · Guitarra`, t.filas[1][0]);
  comprobar('CANDADO: y además se cuentan en `avisos`, con nombre y apellidos',
    t.avisos.length === 1 &&
    t.avisos[0] === `2 selecciones no están en este fichero: ${T} · 3EEM · Guitarra; ${T} · 1EEM · Guitarra`,
    JSON.stringify(t.avisos));
  comprobar('las que sí están conservan sus cifras al lado de las que no',
    t.filas[0][1] === '8' && t.filas[3][1] === '100');
}

seccion('5. «No está» y «está sin notas» no son lo mismo');
{
  /* Las dos filas se ven igual —guiones—, y por eso el aviso solo puede nombrar
     una de las dos. Optativa tiene seis matriculados sin evaluar: eso es un dato
     del centro, no un descuadre entre lo que se compuso y lo que se cargó.
     Acusar al fichero de no traerla manda a alguien a buscar un problema que no
     existe. */
  const t = tablaSelecciones([
    sel(1, '2EEM', 'Optativa'),
    sel(2, '2EEM', 'Coro')
  ], DATOS, ROT);

  comprobar('la que está sin notas conserva su N y pone «—» en el resto',
    t.filas[0].join('|') === `${T} · 2EEM · Optativa|6|${SIN_DATO}|${SIN_DATO}|${SIN_DATO}|${SIN_DATO}|${SIN_DATO}`,
    t.filas[0].join('|'));
  comprobar('CANDADO: y NO se acusa al fichero de no traerla',
    t.avisos.length === 0, JSON.stringify(t.avisos));
  comprobar('CANDADO: cero matriculados es un 0, no un hueco',
    t.filas[1][1] === '0', t.filas[1][1]);
  comprobar('el núcleo distingue las dos cosas por debajo',
    statsDeSeleccion(sel(1, '2EEM', 'Optativa'), DATOS) !== null &&
    statsDeSeleccion(sel(2, '2EEM', 'Nada'), DATOS) === null &&
    statsDeSeleccion(sel(3, '2EEM', 'Optativa'), null) === null);

  /* Una entrada sin `stats` no la produce el lector de CSV, pero sí puede salir
     de un JSON exportado a mano o de una versión anterior del formato. Darla
     por buena imprime una fila muda —seis guiones— sin decir en ninguna parte
     que ahí falta algo, que es exactamente lo que esta tabla existe para
     evitar. */
  const roto = { '3EEM': { Guitarra: {} } };
  comprobar('CANDADO: una entrada sin `stats` cuenta como ausencia, no como fila muda',
    statsDeSeleccion(sel(1, '3EEM', 'Guitarra'), roto) === null &&
    tablaSelecciones([sel(1, '3EEM', 'Guitarra')], roto, ROT).avisos.length === 1,
    JSON.stringify(tablaSelecciones([sel(1, '3EEM', 'Guitarra')], roto, ROT).avisos));
}

seccion('6. El aviso: lo pone quien traduce, pero nunca sale «undefined»');
{
  const perdida = [sel(1, '3EEM', 'Guitarra')];
  comprobar('la plantilla interpola el recuento y la lista',
    tablaSelecciones(perdida, DATOS, ROT).avisos[0] ===
      `1 selecciones no están en este fichero: ${T} · 3EEM · Guitarra`);
  comprobar('CANDADO: sin plantilla se imprime la lista pelada, no «undefined»',
    tablaSelecciones(perdida, DATOS, {}).avisos[0] === `${T} · 3EEM · Guitarra`,
    JSON.stringify(tablaSelecciones(perdida, DATOS, {}).avisos));
  comprobar('y sin rótulos ningún «undefined» se cuela en la cabecera',
    tablaSelecciones(perdida, DATOS, undefined).cabecera.every((c) => c === ''),
    JSON.stringify(tablaSelecciones(perdida, DATOS, undefined).cabecera));

  /* Dos filas idénticas que faltan son un solo descuadre: repetir el nombre en
     el aviso no dice nada nuevo. Pero las DOS filas se imprimen, porque las dos
     están en la comparación. */
  const dobles = tablaSelecciones([
    sel(1, '3EEM', 'Guitarra'), sel(2, '3EEM', 'Guitarra')
  ], DATOS, ROT);
  /* Contar `filas.length === 2` no basta: un hueco dejado en su sitio también
     mide dos. Las dos tienen que ser filas de verdad, con sus siete celdas, o
     el pintor recibe un agujero donde esperaba una fila. */
  comprobar('la misma ausencia repetida se nombra una vez y se imprime dos',
    dobles.filas.length === 2 &&
    dobles.filas.every((f) => Array.isArray(f) && f.length === 7) &&
    dobles.filas[0].join('|') === dobles.filas[1].join('|') &&
    dobles.avisos[0] === `1 selecciones no están en este fichero: ${T} · 3EEM · Guitarra`,
    JSON.stringify(dobles.filas) + ' ' + JSON.stringify(dobles.avisos));
}

seccion('7. El rótulo de una selección');
{
  comprobar('trimestre · nivel · asignatura, como en la tarjeta de la pantalla',
    rotuloSeleccion(sel(1, '1EEM', 'Piano'), ROT) === `${T} · 1EEM · Piano`);
  comprobar('el mapa de trimestres traduce la clave del fichero',
    rotuloSeleccion(sel(1, '1EEM', 'Piano'),
      { trimestres: { [T]: '1.ª evaluación 26/27' } }) === '1.ª evaluación 26/27 · 1EEM · Piano',
    rotuloSeleccion(sel(1, '1EEM', 'Piano'), { trimestres: { [T]: '1.ª evaluación 26/27' } }));
  comprobar('CANDADO: el trimestre va dentro, o dos evaluaciones de la misma '
    + 'asignatura salen con el mismo nombre',
    rotuloSeleccion(sel(1, '1EEM', 'Piano', '2EV-2627-EEM'), ROT) !==
    rotuloSeleccion(sel(2, '1EEM', 'Piano', '1EV-2627-EEM'), ROT));
  comprobar('una asignatura vacía no deja el punto colgando',
    rotuloSeleccion({ id: 1, trimestre: T, nivel: '1EEM', asignatura: '' }, ROT)
      === `${T} · 1EEM`,
    rotuloSeleccion({ id: 1, trimestre: T, nivel: '1EEM', asignatura: '' }, ROT));
  comprobar('y una selección de la que no se sabe nada es «—», no una celda en blanco',
    rotuloSeleccion({}, ROT) === SIN_DATO && rotuloSeleccion(null, ROT) === SIN_DATO);
}

seccion('8. El bloque es de UN trimestre, y cada selección dice de cuál');
{
  /* Este es el uso principal de la vista: la misma asignatura en dos
     evaluaciones, una debajo de la otra. La pantalla tiene un desplegable de
     trimestre por fila, así que las selecciones mezclan trimestres a diario.

     Y el bloque que recibe el informe es de uno solo, sin decir de cuál: la
     clave vive fuera, en `datosCompletos`. Sin pasarla, `datos['1EEM']['Piano']`
     responde lo mismo pida quien lo pida, y la fila rotulada «2EV» sale con las
     cifras del 1EV. Ese fallo es peor que una fila que falta: las dos
     evaluaciones salen con los MISMOS números, que en la reunión se lee «no ha
     cambiado nada» —y no hay aviso, porque la fila resolvió—.

     Las dos filas de aquí son deliberadamente idénticas salvo en el trimestre,
     que es la única forma de ver la diferencia: con datos distintos en cada
     nivel, un módulo que ignore el trimestre daría el mismo resultado que uno
     que lo respete. */
  const otro = procesarDatos(parseCSV(csv({ trimestre: '2EV', curso: '26/27', filas: [
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Piano',
           registros: 8, media: 4.5, desviacion: 2, moda: 4,
           aprobados: 0.5, suspendidos: 0.5 })
  ] })));
  const T2 = otro.trimestre;                 // «2EV-2627-EEM»
  comprobar('el montaje: dos trimestres distintos con la misma fila',
    T !== T2 && otro.datos['1EEM'].Piano.stats.notaMedia === 4.5, `${T} / ${T2}`);

  const mezcla = [sel(1, '1EEM', 'Piano', T), sel(2, '1EEM', 'Piano', T2)];
  const t = tablaSelecciones(mezcla, DATOS, ROT, T);

  comprobar('CANDADO: la fila de la otra evaluación NO se imprime con las cifras de ésta',
    t.filas[0][2] === '8.25' && t.filas[1][2] === SIN_DATO,
    t.filas.map((f) => f.join('|')).join('  ||  '));
  comprobar('CANDADO: y las dos filas no pueden salir con los mismos números',
    t.filas[0].slice(1).join('|') !== t.filas[1].slice(1).join('|'),
    t.filas[1].join('|'));
  comprobar('la de fuera se nombra en `avisos`, con SU trimestre en el rótulo',
    t.avisos.length === 1 &&
    t.avisos[0] === `1 selecciones no están en este fichero: ${T2} · 1EEM · Piano`,
    JSON.stringify(t.avisos));
  comprobar('y la fila sigue ahí, con sus guiones, no desaparece',
    t.filas.length === 2 && t.filas[1].slice(1).every((c) => c === SIN_DATO));

  /* «El trimestre acota, no excluye»: solo se descarta cuando los dos lados
     dicen de qué trimestre hablan y dicen cosas distintas. Una selección sin
     trimestre —guardada antes de que existiera el campo— tiene que seguir
     resolviendo, o al añadir la clave se vaciarían de golpe las comparaciones
     que ya había compuestas. */
  const sinTrim = tablaSelecciones([{ id: 1, nivel: '1EEM', asignatura: 'Piano' }],
    DATOS, ROT, T);
  comprobar('CANDADO: una selección sin trimestre sigue resolviendo (acota, no excluye)',
    sinTrim.filas[0][1] === '8' && sinTrim.avisos.length === 0,
    sinTrim.filas[0].join('|'));
  comprobar('y la clave del bloque tampoco excluye si no se pasa',
    tablaSelecciones([sel(1, '1EEM', 'Piano', T2)], DATOS, ROT).filas[0][1] === '8',
    'sin clave el módulo no puede saberlo: pdfGenerator TIENE que pasarla');
  comprobar('lo mismo por debajo, en `statsDeSeleccion`',
    statsDeSeleccion(sel(1, '1EEM', 'Piano', T2), DATOS, T) === null &&
    statsDeSeleccion(sel(1, '1EEM', 'Piano', T), DATOS, T) !== null &&
    statsDeSeleccion(sel(1, '1EEM', 'Piano', T2), DATOS, '') !== null);
}

terminar('la comparación que se lleva a la reunión: ni una fila menos, ni un cero de relleno.');
