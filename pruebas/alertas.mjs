/* El recuento de alertas y quién entra y sale — pruebas/alertas.mjs
 *
 *   node pruebas/alertas.mjs
 *
 * Lo que vigila esta prueba es la cifra que la media esconde. El fichero de
 * abajo está fabricado a propósito para eso: **la nota media del centro es
 * exactamente la misma en las dos evaluaciones** y por debajo han cambiado
 * cuatro asignaturas de caja. Si el recuento se calculara desde la media, o
 * desde cualquier agregado, esta prueba no vería nada.
 *
 * Y la parte que de verdad cuesta acertar: una asignatura que estaba en rojo y
 * hoy no aparece NO ha mejorado. Puede haber desaparecido del CSV, haberse
 * quedado sin alumnado suficiente para juzgarla, o faltar el fichero entero de
 * su etapa. Las tres se dan aquí, y las tres tienen que salir separadas de las
 * que de verdad han salido de la lista.
 */
import { serieAlertas, claveDe } from '../src/nucleo/alertas.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { csv, fila, elemental, profesional } from './fixtures.mjs';
import { comprobar, seccion, terminar, casi, UMBRALES } from './ayuda.mjs';
import { parseTrimestre } from '../src/nucleo/texto.js';

/* La clave de un fichero lleva el curso académico desde el 23/08/2026, así que
   no se escribe a mano: se busca entre las cargadas por sus piezas. Lo que
   esta prueba vigila es el recuento, no el formato de la clave —eso está en
   `pruebas/texto.mjs`— y escribirla aquí la ataría a algo que no es lo suyo. */
const claveDeFichero = (mundo, base, etapa) =>
  mundo.trimestresDisponibles.find((t) => {
    const p = parseTrimestre(t);
    return p && p.base === base && p.etapa === etapa;
  });

/** Carga una lista de CSV y devuelve lo que la pantalla tiene en la mano. */
const cargar = (textos) => {
  const datosCompletos = {}, trimestresDisponibles = [];
  textos.forEach((texto) => {
    const p = procesarDatos(parseCSV(texto));
    datosCompletos[p.trimestre] = p.datos;
    trimestresDisponibles.push(p.trimestre);
  });
  return { datosCompletos, trimestresDisponibles };
};

/** Un trimestre de elemental con las asignaturas que se le pasen, y con la
 *  media del centro FIJA en 7,00: es lo que hace visible que el recuento vea
 *  lo que la media no. */
const cursoEEM = (trimestre, asignaturas) => csv({ trimestre, filas: [
  fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 100, media: 7 }),
  fila({ tipo: 'CURSO_TOTAL', nivel: '1EEM', asignatura: 'Total', registros: 25, media: 7 }),
  fila({ tipo: 'CURSO_ESP', nivel: '1EEM', asignatura: 'Total Especialidad', registros: 12, media: 7 }),
  fila({ tipo: 'CURSO_NOESP', nivel: '1EEM', asignatura: 'Total no Especialidad', registros: 13, media: 7 }),
  /* «Teórica Troncal» es la suma de tres asignaturas, no una asignatura. Con
     estas cifras saldría en rojo en las dos evaluaciones, así que si se colara
     inflaría el recuento en uno y de forma constante — que es la peor manera,
     porque parece estable. */
  fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Teórica Troncal', registros: 30,
         media: 4.2, aprobados: 0.4, suspendidos: 0.6 }),
  ...asignaturas.map((a) => fila(Object.assign({ tipo: 'CURSO_ASIG', nivel: '1EEM' }, a)))
] });

const A = cargar([
  cursoEEM('1EV', [
    { asignatura: 'Armonía', registros: 12, media: 5.2, aprobados: 0.60, suspendidos: 0.40 },
    { asignatura: 'Lenguaje Musical', registros: 20, media: 6.5, aprobados: 0.65, suspendidos: 0.35 },
    { asignatura: 'Optativa', registros: 8, media: 5.0, aprobados: 0.50, suspendidos: 0.50 },
    { asignatura: 'Tuba', registros: 10, media: 4.0, aprobados: 0.50, suspendidos: 0.50 },
    { asignatura: 'Piano', registros: 15, media: 8.6, aprobados: 0.98, suspendidos: 0.02 },
    { asignatura: 'Coro', registros: 18, media: 7.0, aprobados: 0.85, suspendidos: 0.15 },
    { asignatura: 'Análisis', registros: 14, media: 7.1, aprobados: 0.88, suspendidos: 0.12 }
  ]),
  cursoEEM('2EV', [
    /* Sigue en rojo. */
    { asignatura: 'Armonía', registros: 12, media: 5.5, aprobados: 0.62, suspendidos: 0.38 },
    /* SALE: sigue midiéndose y ha dejado de ser difícil. */
    { asignatura: 'Lenguaje Musical', registros: 20, media: 7.2, aprobados: 0.92, suspendidos: 0.08 },
    /* ENTRA: estaba en el centro de la tabla y se ha caído por debajo del 6. */
    { asignatura: 'Coro', registros: 18, media: 5.8, aprobados: 0.70, suspendidos: 0.25 },
    /* NUEVA: en rojo, pero en la primera evaluación no estaba en el fichero. */
    { asignatura: 'Guitarra', registros: 9, media: 5.1, aprobados: 0.55, suspendidos: 0.45 },
    /* DESAPARECIDA por debajo del mínimo: sigue en el CSV con dos registros. */
    { asignatura: 'Tuba', registros: 2, media: 4.0, aprobados: 0.50, suspendidos: 0.50 },
    { asignatura: 'Piano', registros: 15, media: 8.6, aprobados: 0.98, suspendidos: 0.02 },
    { asignatura: 'Análisis', registros: 14, media: 7.1, aprobados: 0.88, suspendidos: 0.12 }
    /* Y «Optativa» ya no está: DESAPARECIDA del fichero. */
  ])
]);

const opcA = { ...A, umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' };

seccion('1. La media no se mueve y las alertas sí — que es por lo que existe esto');
{
  const media = (t) => A.datosCompletos[t].GLOBAL.Total.stats.notaMedia;
  comprobar('el fichero está montado como se pretendía: la media es idéntica',
    casi(media(claveDeFichero(A, '1EV', 'EEM')), media(claveDeFichero(A, '2EV', 'EEM'))),
    media(claveDeFichero(A, '1EV', 'EEM')) + ' vs ' + media(claveDeFichero(A, '2EV', 'EEM')));

  const r = serieAlertas(opcA);
  comprobar('CANDADO: con la misma media, el recuento de difíciles SÍ cambia',
    r.puntos[0].dificiles === 4 && r.puntos[1].dificiles === 3,
    r.puntos.map((p) => p.evaluacion + ':' + p.dificiles).join(' · '));
  comprobar('y se reparten las tres cajas y el total',
    r.puntos[0].total === 7 && r.puntos[0].faciles === 1 && r.puntos[0].neutrales === 2,
    JSON.stringify(r.puntos[0]));
  comprobar('el segundo punto también cuadra',
    r.puntos[1].total === 6 && r.puntos[1].faciles === 2 && r.puntos[1].neutrales === 1,
    JSON.stringify(r.puntos[1]));
  comprobar('el porcentaje de difíciles sale del recuento, no de la media',
    casi(r.puntos[0].porcentajeDificiles, 400 / 7, 1e-9), String(r.puntos[0].porcentajeDificiles));
  comprobar('hay datos', r.hayDatos === true);
}

seccion('2. Los agregados no son asignaturas (se delega en analizarDificultad)');
{
  const r = serieAlertas(opcA);
  const nombres = r.puntos.map((p) => p.listaDificiles.map((a) => a.asignatura)).flat();
  comprobar('CANDADO: ni los totales ni «Teórica Troncal» entran en el recuento',
    !nombres.some((n) => /^total|troncal/i.test(n)), nombres.join(' · '));
  /* Cuatro filas agregadas en cada fichero: si alguna colara, estos totales
     serían 8 y 7 en vez de 7 y 6. */
  comprobar('CANDADO: y tampoco engordan el total de asignaturas',
    r.puntos[0].total === 7 && r.puntos[1].total === 6,
    r.puntos.map((p) => p.total).join(' · '));
}

seccion('3. Quién ENTRA y quién SALE de la lista de difíciles');
{
  const c = serieAlertas(opcA).cambios;
  comprobar('un solo salto entre dos evaluaciones', c.length === 1 && c[0].de === '1EV' && c[0].a === '2EV');

  comprobar('CANDADO: entra Coro, que estaba clasificada y ha empeorado',
    c[0].entran.length === 1 && c[0].entran[0].asignatura === 'Coro',
    c[0].entran.map((a) => a.asignatura).join(' · '));
  comprobar('y se dice de qué caja venía',
    c[0].entran[0].desde === 'NEUTRAL', String(c[0].entran[0].desde));

  comprobar('CANDADO: sale Lenguaje Musical, que sigue midiéndose y ya no es difícil',
    c[0].salen.length === 1 && c[0].salen[0].asignatura === 'Lenguaje Musical',
    c[0].salen.map((a) => a.asignatura).join(' · '));
  comprobar('con las cifras de HOY, que es lo que se ha conseguido',
    casi(c[0].salen[0].notaMedia, 7.2, 1e-6) && c[0].salen[0].hacia === 'FÁCIL',
    JSON.stringify(c[0].salen[0]));

  comprobar('Armonía, que sigue en rojo, no está en ninguna de las dos listas',
    !c[0].entran.concat(c[0].salen).some((a) => a.asignatura === 'Armonía'));
  comprobar('la variación es el cambio de recuento, con su signo',
    c[0].variacion === -1, String(c[0].variacion));
}

seccion('4. Desaparecer no es mejorar (el caso que no da error)');
{
  const c = serieAlertas(opcA).cambios[0];
  const desap = c.desaparecidas.map((a) => a.asignatura + ':' + a.motivo).sort().join(' · ');

  comprobar('CANDADO: la que ya no viene en el CSV NO se cuenta como salida',
    !c.salen.some((a) => a.asignatura === 'Optativa'), c.salen.map((a) => a.asignatura).join(' · '));
  comprobar('CANDADO: la que se quedó con dos alumnos tampoco',
    !c.salen.some((a) => a.asignatura === 'Tuba'), c.salen.map((a) => a.asignatura).join(' · '));
  comprobar('CANDADO: las dos salen aparte, y cada una dice por qué',
    desap === 'Optativa:ausente · Tuba:bajoMinimo', desap);

  comprobar('CANDADO: y la que aparece nueva en rojo no es una que haya empeorado',
    c.nuevas.length === 1 && c.nuevas[0].asignatura === 'Guitarra' &&
    c.nuevas[0].motivo === 'ausente',
    JSON.stringify(c.nuevas));
  comprobar('la nueva no está en «entran»',
    !c.entran.some((a) => a.asignatura === 'Guitarra'));
}

/* ------------------------------------------------------------------ */
/* La etapa: una dimensión de la serie, no una posición del eje         */

const DIFICIL = { registros: 20, media: 5.0, aprobados: 0.55, suspendidos: 0.45 };
const FACIL = { registros: 20, media: 8.6, aprobados: 0.98, suspendidos: 0.02 };

/** Un fichero con una asignatura GLOBAL —el sitio donde las dos etapas
 *  escriben con el MISMO nivel y el MISMO nombre—. */
const conGlobal = (trimestre, nivel, piano) => csv({ trimestre, filas: [
  fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 100, media: 7 }),
  fila(Object.assign({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano' }, piano)),
  fila({ tipo: 'CURSO_TOTAL', nivel, asignatura: 'Total', registros: 25, media: 7 })
] });

seccion('5. El «Piano» global de elemental y el de profesional son dos');
{
  /* En la vista global las dos etapas escriben bajo el nivel GLOBAL. Sin la
     etapa en la clave, una pisa a la otra: el recuento dice una donde hay dos
     y, en cuanto cambian de caja en direcciones opuestas, aparece una entrada
     que no ha ocurrido y desaparece una salida que sí. */
  const B = cargar([
    conGlobal('1EV', '1EEM', DIFICIL), conGlobal('1EV', '1EPM', FACIL),
    conGlobal('2EV', '1EEM', FACIL), conGlobal('2EV', '1EPM', DIFICIL)
  ]);
  const r = serieAlertas({ ...B, umbrales: UMBRALES, modoEtapa: 'TODOS', vista: 'global' });

  comprobar('CANDADO: cuatro ficheros son DOS puntos en el eje',
    r.puntos.length === 2 && r.puntos.map((p) => p.evaluacion).join() === '1EV,2EV',
    r.puntos.map((p) => p.evaluacion).join());
  comprobar('CANDADO: dos asignaturas, no una — la etapa forma parte de la identidad',
    r.puntos[0].total === 2 && r.puntos[1].total === 2,
    r.puntos.map((p) => p.total).join(' · '));
  comprobar('el recuento suma las dos etapas en el mismo punto',
    r.puntos[0].dificiles === 1 && r.puntos[1].dificiles === 1);
  comprobar('CANDADO: entra la de profesional y sale la de elemental, no un solo cambio',
    r.cambios[0].entran.length === 1 && r.cambios[0].entran[0].etapa === 'EPM' &&
    r.cambios[0].salen.length === 1 && r.cambios[0].salen[0].etapa === 'EEM',
    JSON.stringify({ entran: r.cambios[0].entran.map((a) => a.etapa),
                     salen: r.cambios[0].salen.map((a) => a.etapa) }));
  comprobar('y la clave las distingue',
    claveDe({ etapa: 'EEM', nivel: 'GLOBAL', asignatura: 'Piano' }) !==
    claveDe({ etapa: 'EPM', nivel: 'GLOBAL', asignatura: 'Piano' }));
}

seccion('6. Falta el fichero de una etapa: ni se cuenta dos veces ni se felicita a nadie');
{
  /* Profesional solo trae la segunda evaluación. `trimestreDe` tiene un
     respaldo que devuelve «lo que case la evaluación», así que al pedirle el
     1EV de profesional contesta con el de elemental: sin cortarlo, el primer
     punto contaría las asignaturas de elemental DOS veces. */
  const C = cargar([elemental('1EV', 7.25), elemental('2EV', 7.30), profesional('2EV', 7.0)]);
  const r = serieAlertas({ ...C, umbrales: UMBRALES, modoEtapa: 'TODOS', vista: 'niveles' });

  comprobar('CANDADO: el punto sin fichero de profesional NO duplica elemental',
    r.puntos[0].total === 1 && r.puntos[0].trimestres.join() === claveDeFichero(C, '1EV', 'EEM'),
    r.puntos[0].total + ' — ' + r.puntos[0].trimestres.join());
  comprobar('y donde están los dos ficheros, cuenta los dos',
    r.puntos[1].total === 2 && r.puntos[1].trimestres.join() === [claveDeFichero(C, '2EV', 'EEM'), claveDeFichero(C, '2EV', 'EPM')].join(),
    r.puntos[1].total + ' — ' + r.puntos[1].trimestres.join());

  /* Al revés: las dos etapas en rojo en la primera evaluación y en la segunda
     solo llega el fichero de elemental. Elemental mejora de verdad;
     profesional no se ha mirado. Y el fichero de profesional se carga PRIMERO
     a propósito: así, al buscar el 2EV de profesional, el respaldo devuelve el
     de elemental. Si esas filas se etiquetaran con la etapa que se PEDÍA en
     vez de con la del fichero que ha contestado, la mejora de elemental se le
     apuntaría a profesional —que no ha entregado datos— y elemental figuraría
     como la que ha dejado de medirse. Ni un error, y los dos departamentos
     leyendo el informe del otro. */
  const D = cargar([
    conGlobal('1EV', '1EPM', DIFICIL), conGlobal('1EV', '1EEM', DIFICIL),
    conGlobal('2EV', '1EEM', FACIL)
  ]);
  const rd = serieAlertas({ ...D, umbrales: UMBRALES, modoEtapa: 'TODOS', vista: 'global' });
  comprobar('CANDADO: sin el fichero de su etapa, la difícil no «sale», falta',
    rd.cambios[0].desaparecidas.length === 1 &&
    rd.cambios[0].desaparecidas[0].etapa === 'EPM' &&
    rd.cambios[0].desaparecidas[0].motivo === 'sinFichero',
    JSON.stringify(rd.cambios[0].desaparecidas));
  comprobar('CANDADO: y la que sí ha mejorado se apunta a la etapa del fichero leído',
    rd.cambios[0].salen.length === 1 && rd.cambios[0].salen[0].etapa === 'EEM',
    JSON.stringify(rd.cambios[0].salen.map((a) => a.etapa + '/' + a.hacia)));
  comprobar('y el recuento baja de verdad, porque una no se ha medido',
    rd.puntos[0].dificiles === 2 && rd.puntos[1].dificiles === 0 &&
    rd.cambios[0].variacion === -2,
    JSON.stringify(rd.puntos.map((p) => p.dificiles)));
}

seccion('7. El modo de etapa y la vista');
{
  const B = cargar([
    conGlobal('1EV', '1EEM', DIFICIL), conGlobal('1EV', '1EPM', FACIL),
    conGlobal('2EV', '1EEM', FACIL), conGlobal('2EV', '1EPM', DIFICIL)
  ]);
  const soloEEM = serieAlertas({ ...B, umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'global' });
  comprobar('en modo de una etapa, la otra no entra en el recuento',
    soloEEM.puntos.every((p) => p.total === 1) &&
    soloEEM.puntos[0].dificiles === 1 && soloEEM.puntos[1].dificiles === 0,
    JSON.stringify(soloEEM.puntos.map((p) => p.total + '/' + p.dificiles)));

  /* Sin modo de etapa, `analizarDificultad` compara la etapa del nivel con
     `undefined` y descarta TODOS los niveles: cero asignaturas y ni un error. */
  const sinModo = serieAlertas({ ...A, umbrales: UMBRALES, vista: 'niveles' });
  comprobar('CANDADO: sin modo de etapa se cuenta todo, no cero',
    sinModo.puntos[0].total === 7, String(sinModo.puntos[0].total));

  const global = serieAlertas({ ...opcA, vista: 'global' });
  comprobar('la vista global no mira los niveles: aquí no hay asignaturas globales',
    global.puntos.every((p) => p.total === 0) && global.hayDatos === false,
    JSON.stringify(global.puntos.map((p) => p.total)));
  comprobar('y sin nada que dividir el porcentaje es null, no 0',
    global.puntos[0].porcentajeDificiles === null, String(global.puntos[0].porcentajeDificiles));
}

seccion('8. Lo que no se puede calcular');
{
  comprobar('sin umbrales no se clasifica nada — con ceros saldría todo en rojo',
    serieAlertas({ ...A }).puntos.length === 0);
  comprobar('sin ficheros, ni puntos ni cambios ni datos',
    JSON.stringify(serieAlertas({ umbrales: UMBRALES })) ===
    JSON.stringify({ puntos: [], cambios: [], hayDatos: false }));
  comprobar('sin argumentos tampoco revienta', serieAlertas().hayDatos === false);

  const una = cargar([cursoEEM('1EV', [
    { asignatura: 'Armonía', registros: 12, media: 5.2, aprobados: 0.6, suspendidos: 0.4 }
  ])]);
  const r = serieAlertas({ ...una, umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' });
  comprobar('con una sola evaluación hay recuento pero no hay cambios',
    r.puntos.length === 1 && r.cambios.length === 0 && r.puntos[0].dificiles === 1);

  const nada = serieAlertas({ ...A, umbrales: UMBRALES, modoEtapa: 'EPM', vista: 'niveles' });
  comprobar('y si no hay ficheros de la etapa que se mira, no se inventa un eje',
    nada.puntos.length === 0 && nada.hayDatos === false);
}

seccion('9. El orden de las listas: primero lo peor');
{
  const r = serieAlertas(opcA);
  const notas = r.puntos[0].listaDificiles.map((a) => a.notaMedia);
  comprobar('las difíciles salen por nota media ascendente',
    notas.every((n, i) => i === 0 || notas[i - 1] <= n), JSON.stringify(notas));
  comprobar('y cada una lleva su razón, no solo la etiqueta',
    r.puntos[0].listaDificiles.every((a) => typeof a.razon === 'string' && a.razon.length > 0));

  /* CANDADO: la que NO tiene nota media va al final, no delante.
     La comprobación de arriba no podía verlo —todas las difíciles del fixture
     tienen nota— así que la regla de `ordenar` («no delante, que es donde lo
     pone una resta con null») no la vigilaba nadie: cambiar el `Infinity` por
     `-Infinity` dejaba la suite en verde. Y el caso es real: el analizador
     escribe «—» en la nota media cuando no la puede calcular, y una fila con
     60 % de suspensos sale DIFÍCIL igual. Sin esto, la asignatura de la que
     menos se sabe encabeza la lista de lo que más preocupa. */
  const sinNota = cargar([cursoEEM('1EV', [
    { asignatura: 'Armonía', registros: 12, media: 5.2, aprobados: 0.60, suspendidos: 0.40 },
    { asignatura: 'Tuba', registros: 10, media: 4.0, aprobados: 0.50, suspendidos: 0.50 },
    { asignatura: 'Sin nota', registros: 12, media: null, aprobados: 0.40, suspendidos: 0.60 }
  ])]);
  const lista = serieAlertas({ ...sinNota, umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' })
    .puntos[0].listaDificiles;
  comprobar('la que no tiene nota media entra igual en la lista de difíciles',
    lista.some((a) => a.asignatura === 'Sin nota' && a.notaMedia === null),
    JSON.stringify(lista.map((a) => [a.asignatura, a.notaMedia])));
  comprobar('CANDADO: y sale la ÚLTIMA, no la primera',
    lista.length > 1 && lista[lista.length - 1].asignatura === 'Sin nota',
    JSON.stringify(lista.map((a) => a.asignatura)));
}

seccion('9. La misma asignatura escrita con otra caja');
{
  /* `claveDe` normaliza el nombre a propósito —su comentario lo dice— y no lo
     comprobaba nadie: ningún fixture escribía la misma asignatura de dos
     formas entre dos evaluaciones, que es exactamente el caso. Pasa de
     verdad: el analizador se rellena a mano y «Armonía» aparece un trimestre
     como «ARMONÍA». */
  const conCaja = cargar([
    cursoEEM('1EV', [
      { asignatura: 'Armonía', registros: 12, media: 5.2, aprobados: 0.6, suspendidos: 0.4 },
      { asignatura: 'Piano', registros: 12, media: 8.0, aprobados: 0.95, suspendidos: 0.05 }
    ]),
    cursoEEM('2EV', [
      /* La misma, en mayúsculas, y ya no es difícil. */
      { asignatura: 'ARMONÍA', registros: 12, media: 7.5, aprobados: 0.9, suspendidos: 0.1 },
      { asignatura: 'Piano', registros: 12, media: 8.0, aprobados: 0.95, suspendidos: 0.05 }
    ])
  ]);
  const r = serieAlertas({ ...conCaja, umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' });
  const c = r.cambios[0];

  /* CANDADO: sin normalizar el nombre, «ARMONÍA» sería una asignatura
     DISTINTA de «Armonía»: la primera figuraría como desaparecida —que se lee
     como «ha dejado de medirse»— y la segunda no habría salido de la lista.
     Dos errores de lectura por el precio de una mayúscula. */
  comprobar('CANDADO: la misma asignatura con otra caja es la misma, y SALE de la lista',
    c.salen.length === 1 && /armon/i.test(c.salen[0].asignatura),
    JSON.stringify({ salen: c.salen.map((x) => x.asignatura),
                     desaparecidas: c.desaparecidas.map((x) => x.asignatura) }));
  comprobar('y no figura como desaparecida', c.desaparecidas.length === 0,
    JSON.stringify(c.desaparecidas.map((x) => x.asignatura)));
}

terminar('el recuento de alertas y quién entra y sale de la lista.');
