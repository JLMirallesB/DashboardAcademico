/* El inventario de comparaciones — pruebas/comparaciones.mjs
 *
 *   node pruebas/comparaciones.mjs
 *
 * Esta prueba no arregla nada ni mide ninguna cifra nueva: es un CANDADO
 * ANTES DE UN REDISEÑO. Se va a reorganizar la interfaz y a cambiar la clave
 * con la que vive cada fichero cargado, y el riesgo real no es que salga un
 * número mal —eso se ve— sino que desaparezca en silencio una comparación que
 * hoy es posible y que alguien usa cada trimestre. Aquí quedan las SEIS,
 * medidas sobre el código actual, con datos que las hacen visibles.
 *
 * ---------------------------------------------------------------------------
 * QUÉ CUBRE CADA UNA, SIN EXAGERAR
 *
 * 1. Dentro de un trimestre y una etapa. CUBIERTA llamando al núcleo
 *    (`calcularKPIs`, `analizarDificultad`, `diferencia`).
 *
 * 2. Etapa contra etapa, mismas cifras. CUBIERTA llamando al núcleo
 *    (`calcularKPIsGlobales` con modoEtapa 'TODOS').
 *
 * 3. Etapa contra etapa, una asignatura, todos los cursos. CUBIERTA A MEDIAS.
 *    El bucle que monta las selecciones vive en `src/DashboardAcademico.jsx`
 *    —repetido tres veces: `activarCompararNiveles`, el `useEffect` de
 *    modoEtapa y `cambiarAsignaturaComparada`— y no se puede importar desde
 *    node: es JSX y usa hooks. Aquí se reproduce ese bucle (`seleccionesPorNivel`)
 *    y se ejercitan DE VERDAD las piezas puras sobre las que se apoya:
 *    `getBestTrimestre`, `tieneAsignatura`, `parseTrimestre`, `detectarEtapa`.
 *    · SÍ se pone rojo: si cambia la clave del fichero, si `getBestTrimestre`
 *      deja de casar la etapa del nivel, si el respaldo por asignatura deja de
 *      encontrarla, o si el filtro final deja pasar selecciones sin dato.
 *    · NO se pone rojo: si alguien borra o cambia el bucle del JSX sin tocar
 *      esas funciones. Eso solo lo ve el ojo, abriendo la app.
 *
 * 4. Cualquier cosa contra cualquier cosa. CUBIERTA A MEDIAS, igual que la 3.
 *    Lo que se fija es que el conjunto de triples (trimestre, nivel,
 *    asignatura) que la vista permite formar siga siendo ALCANZABLE: los
 *    desplegables se reproducen con las mismas expresiones puras que usa el
 *    render, y cada triple se resuelve como lo resuelve
 *    `calcularDatosSeleccion` (`datosCompletos[t][n][a]`). El tope de 15 filas
 *    está escrito a mano en el JSX (dos veces) y desde node solo se puede
 *    comprobar que quince triples mezclados se resuelven, no que el botón lo
 *    respete.
 *
 * 5. Evolución temporal de pares (nivel, asignatura) con las dos etapas.
 *    CUBIERTA llamando al núcleo (`serieEvolucionSelecciones`).
 *
 * 6. Los cursos de las dos etapas en un mismo listado. CUBIERTA SOLO LA
 *    FUNCIÓN. `analizarDificultad` con modoEtapa 'TODOS' no descarta niveles
 *    de la otra etapa —ese es el mecanismo—, pero hoy el componente le pasa
 *    `datosCompletos[trimestreSeleccionado]`, o sea UN fichero, y un fichero
 *    es de una sola etapa (`procesarDatos` deduce la etapa de sus niveles).
 *    Así que en pantalla los cursos de las dos etapas no llegan a mezclarse.
 *    Aquí se fija el contrato de la función con un objeto de niveles de las
 *    dos etapas: es el escenario que un rediseño que fusione ficheros por
 *    evaluación produciría, y la función tiene que seguir sin filtrar.
 *
 * ---------------------------------------------------------------------------
 * LOS NÚMEROS
 *
 * Cada celda lleva un número único y legible: entero = etapa (6 elemental,
 * 7 profesional), primer decimal = curso, segundo = asignatura, tercero =
 * evaluación. Un 6,121 solo puede venir de elemental, 1.º, Coro, primera
 * evaluación. Así una comprobación que lee un valor demuestra de qué celda
 * salió, y no solo que salió un número.
 */
import { calcularKPIs, calcularKPIsGlobales } from '../src/nucleo/kpi.js';
import { analizarDificultad } from '../src/nucleo/dificultad.js';
import { serieEvolucionSelecciones } from '../src/nucleo/evolucion.js';
import { diferencia } from '../src/nucleo/comparacion.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { parseTrimestre } from '../src/nucleo/texto.js';
import { detectarEtapa } from '../src/nucleo/estadistica.js';
import { getBestTrimestre, tieneAsignatura } from '../src/utils.js';
import { csv, fila, elemental, profesional } from './fixtures.mjs';
import { comprobar, seccion, terminar, casi, UMBRALES } from './ayuda.mjs';

/* ------------------------------------------------------------------ */
/* El escenario: cuatro ficheros, 1EV y 2EV de las dos etapas          */

/** Códigos de asignatura, el segundo decimal del número de cada celda. */
const COD = { total: 0, piano: 1, coro: 2, teoria: 3, armonia: 4, esp: 8, noEsp: 9 };

/** El valor de una celda. Se redondea a tres decimales a propósito: sin eso,
 *  6 + 0,1 + 0,02 + 0,001 no es exactamente 6,121 y el número deja de ser
 *  legible en el mensaje de un fallo. */
const val = (etapa, curso, cod, ev) =>
  Math.round((( etapa === 'EEM' ? 6 : 7) + curso / 10 + cod / 100 + ev / 1000) * 1000) / 1000;

/* Ni fácil ni difícil: 80 % de aprobados queda por debajo del umbral de fácil
   y 20 % de suspensos por debajo del de alerta. Se fija en todas las
   asignaturas para que la única DIFÍCIL sea la que se quiere que lo sea. */
const NEUTRA = { aprobados: 0.8, suspendidos: 0.2 };
/* Armonía suspende al 42 %: difícil por suspensos, no por nota media, así que
   sigue siéndolo aunque su media sea alta. */
const DURA = { aprobados: 0.55, suspendidos: 0.42 };

/** Un fichero de una etapa y una evaluación, con sus dos cursos. */
const fichero = (etapa, ev) => {
  const e = ev === '1EV' ? 1 : 2;
  /* La asignatura teórica de referencia de cada etapa, y la grafía de la fila
     de no-especialidad, que es distinta en cada plantilla: elemental escribe
     «no» y profesional «No». Esa diferencia es un caso real y aquí hace
     trabajar al criterio insensible a mayúsculas. */
  const teorica = etapa === 'EEM' ? 'Lenguaje Musical' : 'Teórica Troncal';
  const noEsp = etapa === 'EEM' ? 'Total no Especialidad' : 'Total No Especialidad';
  const alumnos = { '1EEM': 12, '2EEM': 13, '1EPM': 14, '2EPM': 15 };

  const filas = [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total',
           registros: 100, media: val(etapa, 0, COD.total, e), ...NEUTRA }),
    fila({ tipo: 'GLOBAL_ESP', nivel: 'GLOBAL', asignatura: 'Total Especialidad',
           registros: 50, media: val(etapa, 0, COD.esp, e), ...NEUTRA }),
    fila({ tipo: 'GLOBAL_NOESP', nivel: 'GLOBAL', asignatura: noEsp,
           registros: 50, media: val(etapa, 0, COD.noEsp, e), ...NEUTRA }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano',
           registros: 30, media: val(etapa, 0, COD.piano, e), ...NEUTRA }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: teorica,
           registros: 30, media: val(etapa, 0, COD.teoria, e), ...NEUTRA })
  ];

  [1, 2].forEach((c) => {
    const nivel = `${c}${etapa}`;
    filas.push(
      fila({ tipo: 'CURSO_TOTAL', nivel, asignatura: 'Total',
             registros: 40, media: val(etapa, c, COD.total, e), ...NEUTRA }),
      /* El alumnado del curso se cuenta por aquí, no por «Total». */
      fila({ tipo: 'CURSO_ESP', nivel, asignatura: 'Total Especialidad',
             registros: alumnos[nivel], media: val(etapa, c, COD.esp, e), ...NEUTRA }),
      fila({ tipo: 'CURSO_NOESP', nivel, asignatura: noEsp,
             registros: 20, media: val(etapa, c, COD.noEsp, e), ...NEUTRA }),
      fila({ tipo: 'CURSO_ASIG', nivel, asignatura: 'Piano',
             registros: 8, media: val(etapa, c, COD.piano, e), ...NEUTRA })
    );
    if (etapa === 'EPM') {
      filas.push(fila({ tipo: 'CURSO_ASIG', nivel, asignatura: 'Armonía',
                        registros: 10, media: val(etapa, c, COD.armonia, e), ...DURA }));
    }
    /* Coro está en elemental en las dos evaluaciones, pero en profesional SOLO
       en la segunda. Es lo que obliga a la comparación 3 a usar su respaldo:
       para un curso de profesional, el fichero de su etapa y su evaluación no
       tiene la asignatura y hay que buscarla en otro de la misma etapa. */
    if (etapa === 'EEM' || e === 2) {
      filas.push(fila({ tipo: 'CURSO_ASIG', nivel, asignatura: 'Coro',
                        registros: 6, media: val(etapa, c, COD.coro, e), ...NEUTRA }));
    }
  });

  return csv({ trimestre: ev, filas });
};

const datosCompletos = {};
const trimestresDisponibles = [];
['EEM', 'EPM'].forEach((etapa) => ['1EV', '2EV'].forEach((ev) => {
  const p = procesarDatos(parseCSV(fichero(etapa, ev)));
  datosCompletos[p.trimestre] = p.datos;
  trimestresDisponibles.push(p.trimestre);
}));

const NIVELES_TODOS = ['1EEM', '2EEM', '1EPM', '2EPM'];
/** Lo que hace `calcularDatosSeleccion` en el componente: la búsqueda es
 *  EXACTA, sin normalizar. Conviene tenerlo aquí igual de crudo. */
const celda = (t, n, a) => datosCompletos[t]?.[n]?.[a];
const media = (t, n, a) => celda(t, n, a)?.stats?.notaMedia;

/* ------------------------------------------------------------------ */

/* Las claves NO se escriben a mano en esta prueba: se buscan entre las
   cargadas. Este archivo es el inventario de las COMPARACIONES, y su trabajo
   es seguir en verde cuando cambie el formato de la clave y ponerse rojo si se
   pierde una comparación. Que la clave tenga la forma que tiene se vigila en
   `pruebas/texto.mjs`, que es su sitio. */
const K = (base, etapa) => {
  const clave = trimestresDisponibles.find((t) => {
    const p = parseTrimestre(t);
    return p && p.base === base && p.etapa === etapa;
  });
  if (!clave) throw new Error('no está cargado el fichero ' + base + '/' + etapa);
  return clave;
};

seccion('0. El escenario, y la clave con la que vive cada fichero');
{
  comprobar('los cuatro ficheros se cargan con cuatro claves distintas',
    trimestresDisponibles.length === 4 &&
    new Set(trimestresDisponibles).size === 4, trimestresDisponibles.join(' · '));
  /* Esta comprobación nació diciendo que la clave era «evaluación-etapa», y se
     puso roja el 23/08/2026 al añadirle el CURSO ACADÉMICO — que era justo su
     trabajo: avisar de que se estaba moviendo el suelo. Lo que vigila ahora no
     es la forma de la cadena, sino lo que de verdad importa aquí: que de cada
     clave se saque de qué evaluación y de qué etapa es, porque TODO lo que hay
     debajo —el emparejado por etapas, el eje del tiempo, el respaldo por
     asignatura— lo lee con `parseTrimestre`. */
  comprobar('CANDADO: de cada clave se saca su evaluación y su etapa',
    trimestresDisponibles.every((t) => {
      const p = parseTrimestre(t);
      return p && p.base && p.etapa;
    }), trimestresDisponibles.join(' · '));
  comprobar('CANDADO: de cada clave se puede sacar su evaluación y su etapa',
    trimestresDisponibles.every((t) => {
      const p = parseTrimestre(t);
      return p && ['1EV', '2EV'].includes(p.base) && ['EEM', 'EPM'].includes(p.etapa);
    }));
  comprobar('y cada celda tiene su número, que dice de dónde salió',
    casi(media(K('1EV', 'EEM'), '1EEM', 'Coro'), 6.121) &&
    casi(media(K('2EV', 'EPM'), '2EPM', 'Piano'), 7.212),
    media(K('1EV', 'EEM'), '1EEM', 'Coro') + ' / ' + media(K('2EV', 'EPM'), '2EPM', 'Piano'));
}

seccion('1. Dentro de un trimestre y una etapa (el caso base)');
{
  const k = calcularKPIs(datosCompletos[K('1EV', 'EEM')], { umbrales: UMBRALES, modoEtapa: 'EEM' });
  comprobar('las cifras del centro salen del fichero elegido, y solo de él',
    casi(k.notaMediaCentro, 6.001), String(k.notaMediaCentro));
  comprobar('la referencia de elemental es el lenguaje musical',
    k.notasMediasRef.length === 1 &&
    k.notasMediasRef[0].asignatura === 'Lenguaje Musical' &&
    casi(k.notasMediasRef[0].notaMedia, 6.031),
    JSON.stringify(k.notasMediasRef));
  comprobar('CANDADO: el alumnado del trimestre es el de sus dos cursos, y nada más',
    k.totalAlumnos === 25 && k.alumnosPorCurso.length === 2,
    JSON.stringify(k.alumnosPorCurso));

  const d = analizarDificultad(datosCompletos[K('1EV', 'EEM')],
    { umbrales: UMBRALES, vista: 'niveles', modoEtapa: 'EEM' });
  comprobar('el listado por niveles trae los dos cursos de la etapa',
    new Set(d.todas.map((a) => a.nivel)).size === 2 &&
    !d.todas.some((a) => a.nivel === 'GLOBAL'),
    d.todas.map((a) => a.nivel + '/' + a.asignatura).join(' · '));

  /* La comparación de dos selecciones del MISMO fichero, que es lo que hace
     quien mira un curso contra otro sin salir del trimestre. */
  const a = celda(K('1EV', 'EEM'), '1EEM', 'Piano').stats;
  const b = celda(K('1EV', 'EEM'), '2EEM', 'Piano').stats;
  comprobar('dos cursos del mismo fichero se restan cifra a cifra',
    casi(diferencia(b.notaMedia, a.notaMedia, 'notaMedia').diff, 0.1),
    String(diferencia(b.notaMedia, a.notaMedia, 'notaMedia').diff));
}

seccion('2. Etapa contra etapa, mismas cifras');
{
  const k = calcularKPIsGlobales({
    trimestreSeleccionado: K('2EV', 'EEM'), datosCompletos, trimestresDisponibles,
    umbrales: UMBRALES, modoEtapa: 'TODOS'
  });
  comprobar('se marca como comparativo y trae los dos bloques',
    k.modoComparativo === true && !!k.kpisEEM && !!k.kpisEPM);
  /* Si emparejara mal la evaluación, profesional saldría con 7,001 —la primera
     evaluación— junto al 6,002 de elemental, y la comparación estaría
     comparando dos momentos distintos del curso sin decirlo. */
  comprobar('CANDADO: empareja la MISMA evaluación de cada etapa',
    casi(k.kpisEEM.notaMediaCentro, 6.002) && casi(k.kpisEPM.notaMediaCentro, 7.002),
    k.kpisEEM.notaMediaCentro + ' / ' + k.kpisEPM.notaMediaCentro);
  comprobar('CANDADO: no hay ninguna cifra conjunta de las dos etapas',
    k.notaMediaCentro === null && k.aprobadosCentro === null && k.modaCentro === null);
  comprobar('los cuatro cursos quedan en una sola lista, cada uno con su etapa',
    k.alumnosPorCurso.map((c) => c.nivel).join() === '1EEM,2EEM,1EPM,2EPM' &&
    k.alumnosPorCurso.reduce((s, c) => s + c.alumnos, 0) === 54,
    JSON.stringify(k.alumnosPorCurso));

  /* Da igual desde qué etapa se mire: la comparación es la misma. */
  const desdeEPM = calcularKPIsGlobales({
    trimestreSeleccionado: K('2EV', 'EPM'), datosCompletos, trimestresDisponibles,
    umbrales: UMBRALES, modoEtapa: 'TODOS'
  });
  comprobar('CANDADO: mirando desde profesional sale la misma pareja',
    casi(desdeEPM.kpisEEM.notaMediaCentro, 6.002) &&
    casi(desdeEPM.kpisEPM.notaMediaCentro, 7.002));

  /* Con una sola etapa cargada, la otra mitad no se inventa. */
  const soloEEM = calcularKPIsGlobales({
    trimestreSeleccionado: K('1EV', 'EEM'),
    datosCompletos: { [K('1EV', 'EEM')]: datosCompletos[K('1EV', 'EEM')] },
    trimestresDisponibles: [K('1EV', 'EEM')], umbrales: UMBRALES, modoEtapa: 'TODOS'
  });
  comprobar('CANDADO: sin fichero de profesional, su bloque es null y no un cero',
    soloEEM.kpisEPM === null && !!soloEEM.kpisEEM);
}

seccion('3. Etapa contra etapa, una asignatura, todos los cursos');
/* COPIA DELIBERADA del bucle de `src/DashboardAcademico.jsx` (está tres veces
   allí: `activarCompararNiveles`, el `useEffect` de modoEtapa y
   `cambiarAsignaturaComparada`). No se puede importar —es JSX y usa hooks—,
   así que aquí se reproduce la forma y se llaman las funciones REALES que
   hacen el trabajo: `getBestTrimestre`, `tieneAsignatura`, `parseTrimestre`,
   `detectarEtapa`. Ver el encabezado: esto no vigila el bucle, vigila que lo
   que el bucle necesita siga estando y siga resolviendo lo mismo. */
const seleccionesPorNivel = ({ trimestreSeleccionado, niveles, asignatura, modoEtapa }) =>
  niveles.map((nivel, idx) => {
    let trimestreParaNivel = trimestreSeleccionado;
    if (modoEtapa === 'TODOS') {
      const mejor = getBestTrimestre(trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa);
      if (tieneAsignatura(datosCompletos, mejor, nivel, asignatura)) {
        trimestreParaNivel = mejor;
      } else {
        const etapaNivel = detectarEtapa(nivel);
        const conAsignatura = trimestresDisponibles.find((trim) => {
          const p = parseTrimestre(trim);
          return p && p.etapa === etapaNivel &&
                 tieneAsignatura(datosCompletos, trim, nivel, asignatura);
        });
        if (conAsignatura) trimestreParaNivel = conAsignatura;
      }
    }
    return { id: idx, trimestre: trimestreParaNivel, nivel, asignatura };
  }).filter((sel) => tieneAsignatura(datosCompletos, sel.trimestre, sel.nivel, sel.asignatura));
{
  const piano = seleccionesPorNivel({
    trimestreSeleccionado: K('1EV', 'EEM'), niveles: NIVELES_TODOS,
    asignatura: 'Piano', modoEtapa: 'TODOS'
  });
  comprobar('los cuatro cursos de las dos etapas entran en la comparación',
    piano.length === 4 && piano.map((s) => s.nivel).join() === '1EEM,2EEM,1EPM,2EPM',
    piano.map((s) => s.nivel).join());
  /* Sin esto, los cursos de profesional se buscarían en el fichero de
     elemental —que no los tiene— y la comparación se quedaría en dos filas. */
  comprobar('CANDADO: cada curso lee del fichero de SU etapa',
    piano.map((s) => s.trimestre).join() === [K('1EV','EEM'),K('1EV','EEM'),K('1EV','EPM'),K('1EV','EPM')].join(),
    piano.map((s) => s.trimestre).join());
  comprobar('CANDADO: y de la MISMA evaluación, no de otra',
    piano.every((s) => parseTrimestre(s.trimestre).base === '1EV'));
  /* La misma comparación pero partiendo de la SEGUNDA evaluación. Sin esta
     fila, quitarle a `getBestTrimestre` la búsqueda por etapa no rompía nada:
     el respaldo de abajo encuentra igualmente un fichero de profesional con
     Piano… pero el PRIMERO de la lista, que es el de la primera evaluación.
     El resultado sería elemental de la segunda contra profesional de la
     primera, con la pantalla diciendo que es la segunda. */
  const pianoSegunda = seleccionesPorNivel({
    trimestreSeleccionado: K('2EV', 'EEM'), niveles: NIVELES_TODOS,
    asignatura: 'Piano', modoEtapa: 'TODOS'
  });
  comprobar('CANDADO: comparando la segunda evaluación, profesional no se cae a la primera',
    pianoSegunda.map((s) => s.trimestre).join() === [K('2EV','EEM'),K('2EV','EEM'),K('2EV','EPM'),K('2EV','EPM')].join(),
    pianoSegunda.map((s) => s.trimestre).join());

  comprobar('cada fila trae el valor de su celda, no el de la de al lado',
    piano.map((s) => media(s.trimestre, s.nivel, s.asignatura)).join() ===
    [6.111, 6.211, 7.111, 7.211].join(),
    piano.map((s) => media(s.trimestre, s.nivel, s.asignatura)).join());

  /* El respaldo: Coro no está en el fichero de profesional de la primera
     evaluación, pero sí en el de la segunda. */
  const coro = seleccionesPorNivel({
    trimestreSeleccionado: K('1EV', 'EEM'), niveles: NIVELES_TODOS,
    asignatura: 'Coro', modoEtapa: 'TODOS'
  });
  comprobar('CANDADO: el respaldo busca la asignatura en otro trimestre de su etapa',
    coro.length === 4 &&
    coro.map((s) => s.trimestre).join() === [K('1EV','EEM'),K('1EV','EEM'),K('2EV','EPM'),K('2EV','EPM')].join(),
    coro.map((s) => s.trimestre).join());
  /* OJO, y está medido, no es una hipótesis: al caer en el respaldo la
     comparación mezcla evaluaciones —la primera de elemental contra la segunda
     de profesional— y la pantalla no lo dice en ningún sitio. Se deja escrito
     aquí porque el rediseño es el momento de decidir si se avisa. */
  comprobar('OJO: el respaldo mezcla evaluaciones sin avisar (medido, no deseable)',
    new Set(coro.map((s) => parseTrimestre(s.trimestre).base)).size === 2,
    coro.map((s) => s.trimestre).join());

  /* Una asignatura que solo existe en una etapa: los cursos de la otra se
     caen, y no queda una fila vacía ocupando sitio. */
  const armonia = seleccionesPorNivel({
    trimestreSeleccionado: K('1EV', 'EEM'), niveles: NIVELES_TODOS,
    asignatura: 'Armonía', modoEtapa: 'TODOS'
  });
  comprobar('CANDADO: el curso que no tiene la asignatura no entra como fila vacía',
    armonia.length === 2 && armonia.every((s) => s.nivel.includes('EPM')),
    armonia.map((s) => s.nivel + '@' + s.trimestre).join(' · '));

  /* Fuera de modo TODOS no hay nada que resolver: todo sale del trimestre
     elegido. Es el caso que hace ver que el trabajo de arriba es del modo
     comparativo y no de la vista en general. */
  const soloEEM = seleccionesPorNivel({
    trimestreSeleccionado: K('2EV', 'EEM'), niveles: ['1EEM', '2EEM'],
    asignatura: 'Piano', modoEtapa: 'EEM'
  });
  comprobar('en una sola etapa, todas las filas salen del trimestre elegido',
    soloEEM.length === 2 && soloEEM.every((s) => s.trimestre === K('2EV', 'EEM')));

  /* Las dos plantillas escriben distinto la fila de no-especialidad
     —«Total no Especialidad» y «Total No Especialidad»— y las dos están en el
     desplegable, porque se recogen como cadenas exactas. Elegir una y comparar
     las dos etapas depende de que el criterio no distinga mayúsculas. */
  const noEsp = seleccionesPorNivel({
    trimestreSeleccionado: K('1EV', 'EEM'), niveles: NIVELES_TODOS,
    asignatura: 'Total no Especialidad', modoEtapa: 'TODOS'
  });
  comprobar('CANDADO: las dos grafías de «Total no Especialidad» son la misma fila',
    noEsp.length === 4, noEsp.map((s) => s.nivel).join());
  /* Y aquí el fallo que eso destapa, medido: la fila pasa el filtro porque
     `tieneAsignatura` normaliza, pero el valor se busca con la cadena EXACTA
     (`datosCompletos[t][n][a]`), así que los cursos de profesional entran en la
     comparación y salen sin datos. Si el rediseño lo arregla, esta
     comprobación se pone roja: entonces bórrala, que es la señal de que ya no
     pasa. */
  comprobar('OJO: pasa el filtro pero el valor no se encuentra (fallo medido)',
    media(K('1EV', 'EPM'), '1EPM', 'Total no Especialidad') === undefined &&
    media(K('1EV', 'EPM'), '1EPM', 'Total No Especialidad') !== undefined);
}

seccion('4. Cualquier cosa contra cualquier cosa');
{
  /* Los desplegables de cada fila, reproducidos con las mismas expresiones que
     usa el render: el de trimestre filtra por etapa salvo en modo TODOS, y el
     de nivel ofrece lo que tenga el trimestre de esa fila. */
  const trimestresOfrecidos = (modoEtapa) => trimestresDisponibles.filter((t) => {
    if (modoEtapa === 'TODOS') return true;
    const p = parseTrimestre(t);
    return p && p.etapa === modoEtapa;
  });
  const nivelesOfrecidos = (t) => Object.keys(datosCompletos[t] || {});

  comprobar('CANDADO: en modo TODOS se pueden elegir los cuatro ficheros en una misma fila',
    trimestresOfrecidos('TODOS').length === 4);
  comprobar('y en una sola etapa, solo los suyos',
    trimestresOfrecidos('EEM').join() === [K('1EV','EEM'),K('2EV','EEM')].join(),
    trimestresOfrecidos('EEM').join());
  comprobar('CANDADO: el nivel se elige dentro del fichero de la fila (GLOBAL incluido)',
    nivelesOfrecidos(K('1EV', 'EEM')).join() === 'GLOBAL,1EEM,2EEM' &&
    nivelesOfrecidos(K('1EV', 'EPM')).join() === 'GLOBAL,1EPM,2EPM',
    nivelesOfrecidos(K('1EV', 'EEM')).join() + ' | ' + nivelesOfrecidos(K('1EV', 'EPM')).join());
  /* Por eso la mezcla de etapas se hace CON DOS FILAS y no dentro de una: un
     nivel de profesional sobre un fichero de elemental no se puede ni elegir,
     y si se colara no daría dato. */
  comprobar('un nivel de la otra etapa sobre ese fichero no existe',
    celda(K('1EV', 'EEM'), '1EPM', 'Piano') === undefined);

  /* Quince filas —el tope de la vista— mezclando trimestres, etapas, cursos y
     asignaturas: es la comparación más potente de la app y la que más fácil
     sería recortar sin querer al reorganizar la pantalla. */
  const libres = [
    [K('1EV', 'EEM'), 'GLOBAL', 'Total'],
    [K('2EV', 'EEM'), 'GLOBAL', 'Total'],
    [K('1EV', 'EPM'), 'GLOBAL', 'Total'],
    [K('2EV', 'EPM'), 'GLOBAL', 'Total'],
    [K('1EV', 'EEM'), '1EEM', 'Piano'],
    [K('2EV', 'EEM'), '1EEM', 'Piano'],
    [K('1EV', 'EEM'), '2EEM', 'Coro'],
    [K('2EV', 'EEM'), '2EEM', 'Total Especialidad'],
    [K('1EV', 'EPM'), '1EPM', 'Armonía'],
    [K('2EV', 'EPM'), '1EPM', 'Armonía'],
    [K('1EV', 'EPM'), '2EPM', 'Piano'],
    [K('2EV', 'EPM'), '2EPM', 'Coro'],
    [K('2EV', 'EPM'), '1EPM', 'Total'],
    [K('1EV', 'EEM'), '1EEM', 'Total no Especialidad'],
    [K('2EV', 'EPM'), '2EPM', 'Total No Especialidad']
  ];
  comprobar('CANDADO: quince filas libres, y las quince encuentran su dato',
    libres.length === 15 && libres.every(([t, n, a]) => typeof media(t, n, a) === 'number'),
    libres.filter(([t, n, a]) => typeof media(t, n, a) !== 'number')
          .map((x) => x.join('/')).join(' · '));
  comprobar('CANDADO: cada fila lee su celda, y las quince son distintas',
    new Set(libres.map(([t, n, a]) => media(t, n, a))).size === 15,
    libres.map(([t, n, a]) => media(t, n, a)).join(' '));
  comprobar('y los valores son los de su etapa, curso, asignatura y evaluación',
    casi(media(K('1EV', 'EEM'), '2EEM', 'Coro'), 6.221) &&
    casi(media(K('2EV', 'EPM'), '1EPM', 'Armonía'), 7.142) &&
    casi(media(K('1EV', 'EPM'), 'GLOBAL', 'Total'), 7.001),
    [media(K('1EV', 'EEM'), '2EEM', 'Coro'), media(K('2EV', 'EPM'), '1EPM', 'Armonía'),
     media(K('1EV', 'EPM'), 'GLOBAL', 'Total')].join(' '));

  /* La comparación de verdad: todas las filas se restan de la primera, y
     mezclando etapas y evaluaciones. Subir suspensos es empeorar aunque el
     número suba, que es la lectura que la vista pinta debajo de cada cifra. */
  const base = celda(...libres[4]).stats;               // 1EV-EEM · 1EEM · Piano
  const otra = celda(...libres[8]).stats;               // 1EV-EPM · 1EPM · Armonía
  const dNota = diferencia(otra.notaMedia, base.notaMedia, 'notaMedia');
  const dSusp = diferencia(otra.suspendidos, base.suspendidos, 'suspendidos');
  comprobar('CANDADO: se puede comparar una fila con otra de distinta etapa y curso',
    dNota !== null && casi(dNota.diff, 1.03, 1e-6) && dNota.mejora === true,
    JSON.stringify(dNota));
  comprobar('CANDADO: y la lectura de los suspensos sigue siendo al revés',
    casi(dSusp.diff, 22) && dSusp.mejora === false, JSON.stringify(dSusp));
}

seccion('5. Evolución temporal de pares (nivel, asignatura), las dos etapas a la vez');
{
  const r = serieEvolucionSelecciones({
    trimestresDisponibles, datosCompletos, modoEtapa: 'TODOS',
    selecciones: [
      { nivel: '1EEM', asignatura: 'Piano' },
      { nivel: '1EPM', asignatura: 'Piano' },
      { nivel: '2EPM', asignatura: 'Coro' }
    ]
  });
  comprobar('CANDADO: cuatro ficheros son dos momentos, no cuatro',
    r.puntos.length === 2 && r.puntos.map((p) => p.momento.base).join() === '1EV,2EV',
    r.puntos.map((p) => p.trimestre).join());
  comprobar('CANDADO: la serie de elemental solo toma valores de elemental',
    casi(r.puntos[0].notaMedia_0, 6.111) && casi(r.puntos[1].notaMedia_0, 6.112),
    [r.puntos[0].notaMedia_0, r.puntos[1].notaMedia_0].join(' '));
  comprobar('CANDADO: y la de profesional, del fichero de profesional',
    casi(r.puntos[0].notaMedia_1, 7.111) && casi(r.puntos[1].notaMedia_1, 7.112),
    [r.puntos[0].notaMedia_1, r.puntos[1].notaMedia_1].join(' '));
  /* Coro no existe en profesional en la primera evaluación. Un hueco es un
     hueco: si se rellenara, la gráfica dibujaría un valor que nadie calculó. */
  comprobar('CANDADO: lo que no hay es null y se cuenta como hueco',
    r.puntos[0].notaMedia_2 === null && casi(r.puntos[1].notaMedia_2, 7.222) &&
    r.huecos === 1, r.huecos + ' huecos');
  comprobar('cada serie sabe de qué par es',
    r.puntos[0].label_0 === '1EEM-Piano' && r.puntos[0].label_2 === '2EPM-Coro');
  comprobar('y hay algo que pintar', r.hayDatos === true);
}

seccion('6. Los cursos de las dos etapas en un mismo listado');
{
  const opc = { umbrales: UMBRALES, vista: 'niveles', modoEtapa: 'TODOS' };
  const eem = analizarDificultad(datosCompletos[K('1EV', 'EEM')], opc);
  const epm = analizarDificultad(datosCompletos[K('1EV', 'EPM')], opc);
  comprobar('cada fichero aporta sus dos cursos, con GLOBAL fuera',
    new Set(eem.todas.map((a) => a.nivel)).size === 2 &&
    new Set(epm.todas.map((a) => a.nivel)).size === 2 &&
    !eem.todas.concat(epm.todas).some((a) => a.nivel === 'GLOBAL'));

  /* El escenario que hoy la pantalla no produce —el componente le pasa UN
     fichero, y un fichero es de una etapa— pero que es justo lo que un
     rediseño que fusione ficheros por evaluación va a producir. Lo que se fija
     es el contrato: en modo TODOS esta función NO descarta niveles por etapa. */
  const fusionado = { ...datosCompletos[K('1EV', 'EEM')], ...datosCompletos[K('1EV', 'EPM')] };
  const juntos = analizarDificultad(fusionado, opc);
  const niveles = Array.from(new Set(juntos.todas.map((a) => a.nivel))).sort();
  comprobar('CANDADO: en modo TODOS los cuatro cursos caben en un mismo listado',
    niveles.join() === '1EEM,1EPM,2EEM,2EPM', niveles.join());
  comprobar('CANDADO: y en modo de una etapa se queda solo la suya',
    Array.from(new Set(analizarDificultad(fusionado,
      { ...opc, modoEtapa: 'EEM' }).todas.map((a) => a.nivel))).sort().join() === '1EEM,2EEM');

  /* Primero lo que preocupa, y dentro de eso por nota media ascendente: es el
     orden por el que se empieza a mirar la lista, y con las dos etapas juntas
     es lo único que impide que los cursos de una tapen los problemas de la
     otra. Las dos difíciles son las de Armonía, con 42 % de suspensos. */
  comprobar('CANDADO: las difíciles van primero, aunque sean de la otra etapa',
    juntos.todas.slice(0, 2).every((a) => a.categoria === 'DIFÍCIL') &&
    juntos.dificiles.map((a) => a.nivel + '/' + a.asignatura).join() === '1EPM/Armonía,2EPM/Armonía',
    juntos.todas.slice(0, 3).map((a) => a.nivel + '/' + a.asignatura + ':' + a.categoria).join(' · '));
  comprobar('y las filas de total no se cuelan como asignaturas en el listado junto',
    !juntos.todas.some((a) => /^total/i.test(a.asignatura)),
    juntos.todas.map((a) => a.asignatura).join(' · '));
}

seccion('7. Con DOS cursos académicos cargados');
{
  /* Todo lo de arriba vive en un solo curso, así que el candado que la fase 1
     puso en `getBestTrimestre` —que el fichero elegido sea también del mismo
     CURSO— no podía ponerse rojo: con un curso, exigirlo o no da lo mismo.
     Este bloque monta el escenario que sí lo distingue. */
  const dosCursos = {}, listaDos = [];
  [elemental('1EV', 7.0, '25/26'), profesional('1EV', 6.0, '25/26'),
   elemental('1EV', 8.0, '26/27'), profesional('1EV', 7.0, '26/27')].forEach((texto) => {
    const p = procesarDatos(parseCSV(texto));
    dosCursos[p.trimestre] = p.datos;
    listaDos.push(p.trimestre);
  });
  const K2 = (base, curso, etapa) => listaDos.find((t) => {
    const p = parseTrimestre(t);
    return p && p.base === base && p.curso === curso && p.etapa === etapa;
  });

  comprobar('los cuatro ficheros conviven, dos por curso',
    listaDos.length === 4 && new Set(listaDos).size === 4, listaDos.join(' · '));

  /* CANDADO: estando en la primera evaluación de 26/27 y en modo TODOS, un
     nivel de profesional tiene que resolverse al fichero de profesional DE ESE
     CURSO. Sin la condición de curso, `getBestTrimestre` devolvía el primero
     que casara la evaluación y la etapa: el del año pasado, y la comparación
     mezclaba cursos bajo un rótulo que decía uno solo. */
  const elegido = getBestTrimestre(K2('1EV', '2627', 'EEM'), '1EPM', listaDos, detectarEtapa);
  comprobar('CANDADO: para un nivel de profesional se elige el fichero de SU curso',
    elegido === K2('1EV', '2627', 'EPM'), elegido);
  comprobar('y desde el curso viejo, el viejo',
    getBestTrimestre(K2('1EV', '2526', 'EEM'), '1EPM', listaDos, detectarEtapa) === K2('1EV', '2526', 'EPM'));

  /* Y la cifra, que es lo que se vería en pantalla: los dos cursos tienen
     medias distintas a propósito. */
  const media = (t) => dosCursos[t].GLOBAL.Total.stats.notaMedia;
  comprobar('CANDADO: y por tanto la cifra es la del curso que se está mirando',
    Math.abs(media(elegido) - 7.0) < 0.01, String(media(elegido)));
}

terminar('las seis comparaciones que la app sabe hacer hoy, antes del rediseño.');
