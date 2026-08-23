/* Lo que el informe dice de las alertas del curso — pruebas/informe-alertas.mjs
 *
 *   node pruebas/informe-alertas.mjs
 *
 * Lo que vigila esta prueba no es que las tablas queden bonitas: es que **el
 * papel no felicite a nadie por una mejora que no ha ocurrido**.
 *
 * El núcleo separa a propósito cuatro cosas que se parecen —entran, salen,
 * nuevas y desaparecidas—, y en la pantalla se ven en cuatro cajas distintas
 * con su motivo debajo. Si al llegar al PDF «sale de la lista» y «ya no se
 * mide» acaban en la misma columna, el informe está diciendo que el centro ha
 * resuelto unas asignaturas que nadie ha mirado. Y un PDF se imprime, se manda
 * por correo y se lee en una reunión meses después, sin nadie al lado que
 * pueda decir «eso es que faltaba el fichero de profesional».
 *
 * Ningún dato real: aquí no entra ni un NIA ni un nombre.
 */
import { tablaRecuento, tablaCambios } from '../src/nucleo/informe-alertas.js';
import { serieAlertas } from '../src/nucleo/alertas.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { csv, fila, elemental, profesional } from './fixtures.mjs';
import { comprobar, seccion, terminar, UMBRALES } from './ayuda.mjs';
import { SIN_DATO } from '../src/nucleo/informe.js';

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

/** Un trimestre de elemental con las asignaturas que se le pasen. Las filas
 *  agregadas van siempre: son las que el recuento tiene que apartar. */
const cursoEEM = (trimestre, asignaturas) => csv({ trimestre, filas: [
  fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 100, media: 7 }),
  fila({ tipo: 'CURSO_TOTAL', nivel: '1EEM', asignatura: 'Total', registros: 25, media: 7 }),
  fila({ tipo: 'CURSO_ESP', nivel: '1EEM', asignatura: 'Total Especialidad', registros: 12, media: 7 }),
  ...asignaturas.map((a) => fila(Object.assign({ tipo: 'CURSO_ASIG', nivel: '1EEM' }, a)))
] });

/* El curso entero: cada asignatura está puesta para producir UNA de las
   cuatro situaciones, que son las cuatro columnas que hay que separar. */
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
    { asignatura: 'Armonía', registros: 12, media: 5.5, aprobados: 0.62, suspendidos: 0.38 },
    /* SALE: se sigue midiendo y ha dejado de ser difícil. */
    { asignatura: 'Lenguaje Musical', registros: 20, media: 7.2, aprobados: 0.92, suspendidos: 0.08 },
    /* ENTRA: estaba clasificada y ha empeorado. */
    { asignatura: 'Coro', registros: 18, media: 5.8, aprobados: 0.70, suspendidos: 0.25 },
    /* NUEVA: en rojo, pero antes no estaba en el fichero. */
    { asignatura: 'Guitarra', registros: 9, media: 5.1, aprobados: 0.55, suspendidos: 0.45 },
    /* DESAPARECIDA por debajo del mínimo: sigue en el CSV con dos registros. */
    { asignatura: 'Tuba', registros: 2, media: 4.0, aprobados: 0.50, suspendidos: 0.50 },
    { asignatura: 'Piano', registros: 15, media: 8.6, aprobados: 0.98, suspendidos: 0.02 },
    { asignatura: 'Análisis', registros: 14, media: 7.1, aprobados: 0.88, suspendidos: 0.12 }
    /* Y «Optativa» ya no está: DESAPARECIDA del fichero. */
  ])
]);

const serieA = serieAlertas({ ...A, umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' });

/* Los rótulos entran de fuera, que es la regla de la casa: el informe se
   genera en castellano o en valenciano y quien traduce es quien llama. */
const R = {
  momento: (m) => (m.curso ? `${m.curso} · ${m.base}` : m.base),
  colMomento: 'Momento', colDificiles: 'Difíciles', colNeutrales: 'Neutrales',
  colFaciles: 'Fáciles', colTotal: 'Asignaturas', colPctDificiles: '% difíciles',
  colSalto: 'Salto', colVariacion: 'Variación', colEntran: 'Entran',
  colSalen: 'Salen', colNuevas: 'Nuevas', colDesaparecidas: 'Ya no se miden',
  motivos: {
    ausente: 'ya no viene en el fichero',
    bajoMinimo: 'tiene menos alumnado del mínimo',
    sinFichero: 'no se ha cargado el fichero de su etapa',
    presente: 'está en el fichero, pero no se ha podido clasificar'
  },
  avisoSinClasificar: 'En {n} momento(s) no hay ninguna asignatura clasificada: {momentos}.',
  avisoFicherosDesiguales: '{n} momento(s) salen de menos ficheros que el resto: {momentos}.',
  avisoNuevas: '{n} asignatura(s) aparecen en rojo sin estar clasificadas antes: no han empeorado.',
  avisoDesaparecidas: '{n} asignatura(s) estaban en rojo y hoy no se pueden clasificar: no han mejorado.',
  avisoNoAtribuible: 'El recuento total se mueve además por asignaturas que aparecen o dejan de medirse.'
};

const celda = (t, f, c) => t.filas[f][c];
const COL = { salto: 0, variacion: 1, entran: 2, salen: 3, nuevas: 4, desaparecidas: 5 };

/* La columna que quien lee el papel encuentra bajo un rótulo. Comprobar las
   celdas por índice no ve que la cabecera esté cambiada de sitio: los datos
   estarían bien y encima de la columna de entradas pondría «Salen». */
const bajo = (t, rotulo) => {
  const i = t.cabecera.indexOf(rotulo);
  return i < 0 ? null : t.filas.map((f) => f[i]);
};

seccion('1. El recuento, momento a momento');
{
  const t = tablaRecuento(serieA, R);
  comprobar('la sección no está vacía y trae una fila por punto de la serie',
    t.vacio === false && t.filas.length === 2, JSON.stringify(t.filas));
  comprobar('la cabecera tiene las seis columnas y ninguna es un hueco',
    t.cabecera.length === 6 && t.cabecera.every((c) => typeof c === 'string' && c.length > 0),
    JSON.stringify(t.cabecera));
  comprobar('CANDADO: y cada rótulo de fuera está sobre SU columna, no sobre otra',
    t.cabecera.join('|') === [R.colMomento, R.colDificiles, R.colNeutrales,
                              R.colFaciles, R.colTotal, R.colPctDificiles].join('|'),
    JSON.stringify(t.cabecera));
  comprobar('CANDADO: la columna que el papel titula «Difíciles» trae las difíciles',
    bajo(t, R.colDificiles).join('|') === '4|3' &&
    bajo(t, R.colFaciles).join('|') === '1|2',
    JSON.stringify([bajo(t, R.colDificiles), bajo(t, R.colFaciles)]));
  comprobar('las celdas son texto ya formateado, no números',
    t.filas.every((f) => f.every((c) => typeof c === 'string')), JSON.stringify(t.filas[0]));
  comprobar('CANDADO: el recuento del papel es el del núcleo, con sus tres cajas',
    t.filas[0].slice(1, 5).join('|') === '4|2|1|7', JSON.stringify(t.filas[0]));
  comprobar('y el segundo momento también',
    t.filas[1].slice(1, 5).join('|') === '3|1|2|6', JSON.stringify(t.filas[1]));
  comprobar('el porcentaje de difíciles lleva su símbolo y un decimal',
    t.filas[0][5] === '57.1%', t.filas[0][5]);
  comprobar('CANDADO: el momento lleva el rótulo que pone quien llama, no la clave interna',
    t.filas[0][0] === '2627 · 1EV', t.filas[0][0]);
  comprobar('sin nada raro que contar, no se inventan avisos',
    t.avisos.length === 0, JSON.stringify(t.avisos));
}

seccion('2. Cero y «no hay dato» tampoco son lo mismo aquí');
{
  /* Un momento en el que no se clasifica ninguna asignatura: el 2EV solo trae
     las filas de total. Es el caso que en una tabla parece el mejor momento
     del curso, porque enseña un cero en la columna de difíciles. */
  const E = cargar([
    cursoEEM('1EV', [
      { asignatura: 'Armonía', registros: 12, media: 5.2, aprobados: 0.60, suspendidos: 0.40 }
    ]),
    cursoEEM('2EV', [])
  ]);
  const t = tablaRecuento(
    serieAlertas({ ...E, umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' }), R);

  comprobar('CANDADO: cero difíciles medidos SÍ se escribe «0»',
    t.filas[1][1] === '0' && t.filas[1][4] === '0', JSON.stringify(t.filas[1]));
  comprobar('CANDADO: pero el porcentaje sin nada que dividir es «—», no «0.0%»',
    t.filas[1][5] === SIN_DATO, t.filas[1][5]);
  comprobar('y se avisa de que ese cero no sale de haber mirado nada',
    t.avisos.some((a) => a.includes('ninguna asignatura clasificada') && a.includes('2627 · 2EV')),
    JSON.stringify(t.avisos));
  comprobar('CANDADO: y el aviso cuenta los momentos que hay, que es uno',
    t.avisos.some((a) => a.startsWith('En 1 momento(s)')), JSON.stringify(t.avisos));

  /* Y el mismo fichero por el otro lado: Armonía estaba en rojo y hoy no se
     clasifica. En la columna de salidas sería una asignatura resuelta. */
  const c = tablaCambios(
    serieAlertas({ ...E, umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' }), R);
  comprobar('CANDADO: la que deja de medirse no aparece como salida',
    celda(c, 0, COL.salen) === '0' &&
    celda(c, 0, COL.desaparecidas).includes('Armonía'),
    celda(c, 0, COL.salen) + '  ||  ' + celda(c, 0, COL.desaparecidas));
}

seccion('3. Las cuatro columnas: la razón de ser de esta sección');
{
  const t = tablaCambios(serieA, R);
  comprobar('un salto entre las dos evaluaciones, con las seis columnas',
    t.vacio === false && t.filas.length === 1 && t.cabecera.length === 6,
    JSON.stringify(t.cabecera));
  comprobar('el salto se rotula con los dos momentos',
    celda(t, 0, COL.salto) === '2627 · 1EV → 2627 · 2EV', celda(t, 0, COL.salto));
  comprobar('CANDADO: cada rótulo de fuera está sobre SU columna',
    t.cabecera.join('|') === [R.colSalto, R.colVariacion, R.colEntran, R.colSalen,
                              R.colNuevas, R.colDesaparecidas].join('|'),
    JSON.stringify(t.cabecera));
  /* Con los datos en su sitio y la cabecera corrida, el papel dice «Salen:
     Coro» de una asignatura que ha entrado. No da error y se lee al revés. */
  comprobar('CANDADO: y lo que hay bajo cada rótulo es lo que ese rótulo nombra',
    bajo(t, R.colEntran)[0] === '1 — Coro (EEM · 1EEM)' &&
    bajo(t, R.colSalen)[0] === '1 — Lenguaje Musical (EEM · 1EEM)' &&
    bajo(t, R.colNuevas)[0].includes('Guitarra') &&
    bajo(t, R.colDesaparecidas)[0].includes('Optativa'),
    JSON.stringify([bajo(t, R.colEntran), bajo(t, R.colSalen),
                    bajo(t, R.colNuevas), bajo(t, R.colDesaparecidas)]));

  comprobar('entra Coro, con su recuento delante y su curso al lado',
    celda(t, 0, COL.entran) === '1 — Coro (EEM · 1EEM)', celda(t, 0, COL.entran));
  comprobar('sale Lenguaje Musical, que se sigue midiendo y ya no es difícil',
    celda(t, 0, COL.salen) === '1 — Lenguaje Musical (EEM · 1EEM)', celda(t, 0, COL.salen));

  comprobar('CANDADO: la que ya no viene en el CSV NO está en la columna de salidas',
    !celda(t, 0, COL.salen).includes('Optativa'), celda(t, 0, COL.salen));
  comprobar('CANDADO: ni la que se quedó con dos alumnos',
    !celda(t, 0, COL.salen).includes('Tuba'), celda(t, 0, COL.salen));
  comprobar('CANDADO: las dos van en su columna, y cada una con su motivo escrito',
    celda(t, 0, COL.desaparecidas).includes('Optativa (EEM · 1EEM) — ya no viene en el fichero') &&
    celda(t, 0, COL.desaparecidas).includes('Tuba (EEM · 1EEM) — tiene menos alumnado del mínimo'),
    celda(t, 0, COL.desaparecidas));
  comprobar('CANDADO: la que aparece nueva en rojo tampoco es una que haya empeorado',
    celda(t, 0, COL.nuevas).includes('Guitarra') &&
    !celda(t, 0, COL.entran).includes('Guitarra'),
    celda(t, 0, COL.nuevas) + '  ||  ' + celda(t, 0, COL.entran));
  comprobar('CANDADO: y ninguna de las cuatro se cuela en otra columna',
    ['Optativa', 'Tuba', 'Guitarra'].every((n) =>
      !celda(t, 0, COL.entran).includes(n) && !celda(t, 0, COL.salen).includes(n)) &&
    !celda(t, 0, COL.desaparecidas).includes('Guitarra'),
    t.filas[0].join('  ||  '));
  comprobar('la que sigue en rojo no está en ninguna de las cuatro',
    !t.filas[0].slice(2).some((c) => c.includes('Armonía')), t.filas[0].join('  ||  '));
}

seccion('4. La variación que se escribe es la que ha movido el centro');
{
  /* `variacion` del núcleo es la resta bruta de recuentos: 4 → 3, o sea −1.
     Pero ese −1 sale de dos asignaturas que dejaron de medirse y una que
     apareció, no de que nadie haya arreglado nada. Lo medido en los dos
     momentos es una que entra y una que sale: cero. */
  const t = tablaCambios(serieA, R);
  comprobar('el núcleo sigue diciendo su resta bruta',
    serieA.cambios[0].variacion === -1, String(serieA.cambios[0].variacion));
  comprobar('CANDADO: pero la columna del informe no escribe ese −1',
    celda(t, 0, COL.variacion) === '0', celda(t, 0, COL.variacion));
  comprobar('y se dice aparte que el total se mueve por otra cosa',
    t.avisos.includes(R.avisoNoAtribuible), JSON.stringify(t.avisos));
}

seccion('5. Falta el fichero de una etapa entera: el caso que no da error');
{
  /* Las dos etapas en rojo en la primera evaluación; en la segunda solo llega
     el fichero de elemental. Elemental mejora de verdad; profesional no se ha
     mirado. En una sola columna, el informe diría que se han resuelto dos. */
  const DIFICIL = { registros: 20, media: 5.0, aprobados: 0.55, suspendidos: 0.45 };
  const FACIL = { registros: 20, media: 8.6, aprobados: 0.98, suspendidos: 0.02 };
  const conGlobal = (trimestre, nivel, piano) => csv({ trimestre, filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 100, media: 7 }),
    fila(Object.assign({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano' }, piano)),
    fila({ tipo: 'CURSO_TOTAL', nivel, asignatura: 'Total', registros: 25, media: 7 })
  ] });

  const D = cargar([
    conGlobal('1EV', '1EPM', DIFICIL), conGlobal('1EV', '1EEM', DIFICIL),
    conGlobal('2EV', '1EEM', FACIL)
  ]);
  const s = serieAlertas({ ...D, umbrales: UMBRALES, modoEtapa: 'TODOS', vista: 'global' });
  const t = tablaCambios(s, R);

  comprobar('CANDADO: la de profesional NO figura como salida',
    celda(t, 0, COL.salen) === '1 — Piano (EEM · GLOBAL)', celda(t, 0, COL.salen));
  comprobar('CANDADO: figura aparte, y el papel dice que falta su fichero',
    celda(t, 0, COL.desaparecidas) ===
      '1 — Piano (EPM · GLOBAL) — no se ha cargado el fichero de su etapa',
    celda(t, 0, COL.desaparecidas));
  comprobar('CANDADO: y la variación escrita es −1, no el −2 de la resta bruta',
    celda(t, 0, COL.variacion) === '-1' && s.cambios[0].variacion === -2,
    celda(t, 0, COL.variacion) + ' / núcleo: ' + s.cambios[0].variacion);

  const r = tablaRecuento(s, R);
  comprobar('CANDADO: y el recuento avisa de que un momento sale de menos ficheros',
    r.avisos.some((a) => a.includes('menos ficheros') && a.includes('2EV')),
    JSON.stringify(r.avisos));

  /* El otro reparto del mismo problema: elemental completo y profesional solo
     en la segunda evaluación. El primer punto no es comparable con el segundo
     y en el papel no hay forma de verlo si no se dice. */
  const C = cargar([elemental('1EV', 7.25), elemental('2EV', 7.30), profesional('2EV', 7.0)]);
  const rc = tablaRecuento(
    serieAlertas({ ...C, umbrales: UMBRALES, modoEtapa: 'TODOS', vista: 'niveles' }), R);
  comprobar('también cuando el que va corto es el primer momento',
    rc.avisos.some((a) => a.includes('menos ficheros') && a.includes('1EV')),
    JSON.stringify(rc.avisos));
}

seccion('6. Los avisos cuentan lo que la tabla no puede');
{
  const t = tablaCambios(serieA, R);
  comprobar('se avisa de la que aparece nueva, con su número',
    t.avisos.some((a) => a.startsWith('1 asignatura(s) aparecen en rojo')),
    JSON.stringify(t.avisos));
  comprobar('CANDADO: y de las dos que han dejado de medirse, que es la frase que evita el daño',
    t.avisos.some((a) => a.startsWith('2 asignatura(s) estaban en rojo')),
    JSON.stringify(t.avisos));
  comprobar('sin marcadores sin rellenar',
    t.avisos.every((a) => !a.includes('{')), JSON.stringify(t.avisos));
}

seccion('7. Lo que no hay no se pinta');
{
  const una = cargar([cursoEEM('1EV', [
    { asignatura: 'Armonía', registros: 12, media: 5.2, aprobados: 0.6, suspendidos: 0.4 }
  ])]);
  const s = serieAlertas({ ...una, umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' });

  comprobar('con una sola evaluación sí hay recuento',
    tablaRecuento(s, R).vacio === false && tablaRecuento(s, R).filas.length === 1);
  comprobar('CANDADO: pero la sección de cambios se salta, no sale una tabla en blanco',
    tablaCambios(s, R).vacio === true && tablaCambios(s, R).filas.length === 0 &&
    tablaCambios(s, R).cabecera.length === 0,
    JSON.stringify(tablaCambios(s, R)));

  const nada = serieAlertas({ ...A, umbrales: UMBRALES, modoEtapa: 'EPM', vista: 'niveles' });
  comprobar('CANDADO: sin ficheros de la etapa que se mira, las dos secciones se saltan',
    tablaRecuento(nada, R).vacio === true && tablaCambios(nada, R).vacio === true,
    JSON.stringify([tablaRecuento(nada, R), tablaCambios(nada, R)]));

  /* Dos evaluaciones cargadas y ninguna asignatura clasificada en ninguna: el
     núcleo sí trae los puntos y el salto, pero `hayDatos` está en falso. Sin
     esa guarda salen dos filas de ceros y un salto de «0», y una columna de
     ceros en un PDF se lee como «ninguna asignatura en rojo». */
  const mudo = serieAlertas({
    ...cargar([cursoEEM('1EV', []), cursoEEM('2EV', [])]),
    umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' });
  comprobar('el núcleo trae los dos puntos y el salto, pero sin nada clasificado',
    mudo.puntos.length === 2 && mudo.cambios.length === 1 && mudo.hayDatos === false,
    JSON.stringify({ puntos: mudo.puntos.length, cambios: mudo.cambios.length,
                     hayDatos: mudo.hayDatos }));
  comprobar('CANDADO: y aun así no se pinta ni la tabla de ceros ni el salto vacío',
    tablaRecuento(mudo, R).vacio === true && tablaCambios(mudo, R).vacio === true,
    JSON.stringify([tablaRecuento(mudo, R).filas, tablaCambios(mudo, R).filas]));

  /* Sin umbrales el núcleo no clasifica nada. Una tabla de ceros diría que no
     hay ninguna asignatura en rojo, que es lo contrario de lo que pasa. */
  comprobar('sin umbrales tampoco se pinta una columna de ceros',
    tablaRecuento(serieAlertas({ ...A }), R).vacio === true);
  comprobar('y sin serie ninguna no revienta',
    tablaRecuento(undefined, R).vacio === true && tablaCambios(null, R).vacio === true &&
    tablaRecuento({ puntos: [], cambios: [], hayDatos: false }).vacio === true);
  comprobar('las cuatro claves del contrato están siempre, aunque esté vacía',
    ['vacio', 'cabecera', 'filas', 'avisos']
      .every((k) => Object.prototype.hasOwnProperty.call(tablaCambios(nada, R), k)),
    JSON.stringify(Object.keys(tablaCambios(nada, R))));
}

seccion('8. Sin rótulos: se escribe la clave, nunca un hueco');
{
  /* Un rótulo que falta es un descuido que se ve y se arregla. Un hueco en
     blanco justo en la columna que existe para no dar por buena una mejora
     inventada es el fallo original otra vez, y sin síntoma. */
  const t = tablaCambios(serieA, {});
  comprobar('CANDADO: sin tabla de motivos, la desaparecida conserva el suyo en clave',
    celda(t, 0, COL.desaparecidas).includes('bajoMinimo') &&
    celda(t, 0, COL.desaparecidas).includes('ausente'),
    celda(t, 0, COL.desaparecidas));
  comprobar('la cabecera cae a las claves de rótulo, y no a cadenas vacías',
    t.cabecera.every((c) => typeof c === 'string' && c.length > 0) &&
    t.cabecera[COL.desaparecidas] === 'colDesaparecidas',
    JSON.stringify(t.cabecera));
  comprobar('y el momento, sin función de rótulo, cae a la evaluación',
    celda(t, 0, COL.salto) === '1EV → 2EV', celda(t, 0, COL.salto));

  const r = tablaRecuento(serieA, { colMomento: '   ' });
  comprobar('un rótulo en blanco cuenta como que no lo han pasado',
    r.cabecera[0] === 'colMomento', r.cabecera[0]);
}

seccion('9. Tres evaluaciones: el orden de las filas y el silencio de los avisos');
{
  /* La misma pareja de asignaturas en las tres: no aparece ninguna, no deja de
     medirse ninguna, y la resta bruta coincide con lo medido. Con una sola
     fila no se puede ver si las filas salen en el orden del curso, y con algo
     que contar en todas no se puede ver si los avisos saben callarse — un
     cuadro que siempre tiene algo en rojo se aprende a ignorar en una semana. */
  const DIF = { registros: 12, media: 5.5, aprobados: 0.60, suspendidos: 0.40 };
  const NEU = { registros: 12, media: 6.5, aprobados: 0.80, suspendidos: 0.20 };
  const S = serieAlertas({
    ...cargar([
      cursoEEM('1EV', [{ asignatura: 'Armonía', ...DIF }, { asignatura: 'Coro', ...NEU }]),
      cursoEEM('2EV', [{ asignatura: 'Armonía', ...DIF }, { asignatura: 'Coro', ...DIF }]),
      cursoEEM('3EV', [{ asignatura: 'Armonía', ...DIF }, { asignatura: 'Coro', ...NEU }])
    ]),
    umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' });

  const r = tablaRecuento(S, R);
  const t = tablaCambios(S, R);

  comprobar('CANDADO: el recuento saca los tres momentos en el orden del curso',
    r.filas.map((f) => f[0]).join(' | ') === '2627 · 1EV | 2627 · 2EV | 2627 · 3EV',
    JSON.stringify(r.filas.map((f) => f[0])));
  comprobar('dos saltos, uno por pareja de evaluaciones consecutivas',
    t.filas.length === 2, JSON.stringify(t.filas.map((f) => f[COL.salto])));
  comprobar('CANDADO: y también en el orden del curso, no en cualquiera',
    celda(t, 0, COL.salto) === '2627 · 1EV → 2627 · 2EV' &&
    celda(t, 1, COL.salto) === '2627 · 2EV → 2627 · 3EV',
    JSON.stringify(t.filas.map((f) => f[COL.salto])));
  comprobar('CANDADO: cada fila lleva SU variación, con el signo de su dirección',
    celda(t, 0, COL.variacion) === '+1' && celda(t, 1, COL.variacion) === '-1',
    celda(t, 0, COL.variacion) + ' / ' + celda(t, 1, COL.variacion));
  comprobar('y Coro entra en el primer salto y sale en el segundo, cada uno en su fila',
    celda(t, 0, COL.entran).includes('Coro') && celda(t, 0, COL.salen) === '0' &&
    celda(t, 1, COL.salen).includes('Coro') && celda(t, 1, COL.entran) === '0',
    t.filas.map((f) => f.join(' · ')).join('  ||  '));
  comprobar('CANDADO: sin nada que aparezca ni deje de medirse, la sección no avisa de nada',
    t.avisos.length === 0, JSON.stringify(t.avisos));
  comprobar('CANDADO: y el recuento tampoco, que los tres salen de los mismos ficheros',
    r.avisos.length === 0, JSON.stringify(r.avisos));
}

terminar('el relato del curso en el informe: desaparecer no es mejorar, y se dice en el papel.');
