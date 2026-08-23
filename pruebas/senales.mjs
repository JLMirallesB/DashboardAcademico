/* Qué merece mirarse, y por qué — pruebas/senales.mjs
 *
 *   node pruebas/senales.mjs
 *
 * Lo que vigila esta prueba no es que las cifras salgan bonitas: es que el
 * módulo **no diga por qué pasa nada**, y que ordene por lo que de verdad
 * distingue una anécdota de algo estructural.
 *
 * Las dos formas de romperlo son silenciosas. Una: colar en la salida una
 * explicación —«dificultad generalizada»— que el lector va a leer como un
 * hecho comprobado. Otra: confundir «no hay con qué comparar» con «no se
 * repite», que convierte la falta de datos del año pasado en una prueba de
 * que el problema es de este año.
 */
import { senalesDelTrimestre, PESOS, A_MIRAR, REPARTO,
         DISPERSION_MUY_BAJA, MINIMO_PARA_FORMA } from '../src/nucleo/senales.js';
import { serieAlertas } from '../src/nucleo/alertas.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { csv, fila } from './fixtures.mjs';
import { comprobar, seccion, terminar, UMBRALES } from './ayuda.mjs';

const cargar = (textos) => {
  const datosCompletos = {}, trimestresDisponibles = [];
  textos.forEach((texto) => {
    const p = procesarDatos(parseCSV(texto));
    datosCompletos[p.trimestre] = p.datos;
    trimestresDisponibles.push(p.trimestre);
  });
  return { datosCompletos, trimestresDisponibles };
};

/** Un trimestre de elemental con las asignaturas que se le pasen. */
const curso = (trimestre, cursoAcad, asignaturas) => csv({
  trimestre, curso: cursoAcad, filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 100, media: 7 }),
    fila({ tipo: 'CURSO_TOTAL', nivel: '1EEM', asignatura: 'Total', registros: 40, media: 7 }),
    ...asignaturas.map((a) => fila(Object.assign({ tipo: 'CURSO_ASIG', nivel: '1EEM' }, a)))
  ]
});

const opciones = (mundo, extra) => Object.assign({
  trimestreSeleccionado: mundo.trimestresDisponibles[0],
  datosCompletos: mundo.datosCompletos,
  trimestresDisponibles: mundo.trimestresDisponibles,
  umbrales: UMBRALES,
  modoEtapa: 'EEM'
}, extra || {});

seccion('1. Una señal es una observación, nunca una explicación');
{
  const m = cargar([curso('1EV', '26/27', [
    { asignatura: 'Armonía', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45, desviacion: 1.2 }
  ])]);
  const s = senalesDelTrimestre(opciones(m));
  const armonia = s.find((x) => x.tipo === 'mediaBaja');

  comprobar('sale la señal de media baja', !!armonia, JSON.stringify(s.map((x) => x.tipo)));

  /* CANDADO. Este es el fallo que el documento de interpretación viene a
     evitar y que la aplicación cometía en los rótulos del mapa de dispersión:
     «Dificultad generalizada» es una explicación, y quien la lee la toma por
     un hecho. De aquí solo pueden salir cifras y claves estables. */
  const texto = JSON.stringify(armonia);
  const palabrasProhibidas = ['dificultad', 'problema', 'excelente', 'deficien',
    'generalizada', 'metodolog', 'insuficien', 'mal ', 'bien ', 'preocupante'];
  const encontradas = palabrasProhibidas.filter((p) => texto.toLowerCase().includes(p));
  comprobar('CANDADO: no sale ni una palabra que explique la causa',
    encontradas.length === 0, encontradas.join(', '));

  comprobar('sale la cifra y su alumnado, que es lo que sí se ha medido',
    armonia.cifras.notaMedia === 4.8 && armonia.cifras.registros === 20,
    JSON.stringify(armonia.cifras));
  comprobar('y la lista de lo que hay que ir a mirar fuera de los datos',
    Array.isArray(armonia.aMirar) && armonia.aMirar.includes('cambioCriterios'),
    JSON.stringify(armonia.aMirar));
  comprobar('que son claves estables, no frases: las traduce quien pinta',
    armonia.aMirar.every((k) => /^[a-zA-Z]+$/.test(k)), JSON.stringify(armonia.aMirar));
}

seccion('2. «No hay con qué comparar» no es «no se repite»');
{
  /* Es la confusión más cara del documento llevada a código: si la falta del
     curso pasado se contara como «no se repite», una asignatura sin histórico
     saldría SIEMPRE como menos sólida que una que sí lo tiene, y el equipo
     miraría antes lo que lleva años documentado que lo que acaba de aparecer. */
  const solo = cargar([curso('1EV', '26/27', [
    { asignatura: 'Armonía', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45 }
  ])]);
  const sinHistorico = senalesDelTrimestre(opciones(solo)).find((x) => x.tipo === 'mediaBaja');
  comprobar('CANDADO: sin otro curso cargado, «otra cohorte» es null, no false',
    sinHistorico.comprobado.otraCohorte === null,
    JSON.stringify(sinHistorico.comprobado.otraCohorte));

  const dos = cargar([
    curso('1EV', '26/27', [{ asignatura: 'Armonía', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45 }]),
    curso('1EV', '25/26', [{ asignatura: 'Armonía', registros: 18, media: 4.9, aprobados: 0.56, suspendidos: 0.44 }])
  ]);
  const conHistorico = senalesDelTrimestre(opciones(dos)).find((x) => x.tipo === 'mediaBaja');
  comprobar('con el curso pasado cargado y el mismo problema, sale true',
    conHistorico.comprobado.otraCohorte === true);
  comprobar('CANDADO: y eso la hace más sólida',
    conHistorico.solidez.puntos > sinHistorico.solidez.puntos &&
    conHistorico.solidez.motivos.includes('otraCohorte'),
    `${conHistorico.solidez.puntos} frente a ${sinHistorico.solidez.puntos}`);

  const limpio = cargar([
    curso('1EV', '26/27', [{ asignatura: 'Armonía', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45 }]),
    curso('1EV', '25/26', [{ asignatura: 'Armonía', registros: 18, media: 7.4, aprobados: 0.95, suspendidos: 0.05 }])
  ]);
  const noSeRepite = senalesDelTrimestre(opciones(limpio)).find((x) => x.tipo === 'mediaBaja');
  comprobar('y si el año pasado iba bien, sale false —que tampoco es null',
    noSeRepite.comprobado.otraCohorte === false);
}

seccion('3. Solo se compara con el MISMO momento del otro curso');
{
  /* La 1.ª evaluación de este año con la 1.ª del anterior. Comparar con la 2.ª
     no significa nada: son dos puntos distintos del curso. */
  const desalineado = cargar([
    curso('1EV', '26/27', [{ asignatura: 'Armonía', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45 }]),
    curso('2EV', '25/26', [{ asignatura: 'Armonía', registros: 18, media: 4.9, aprobados: 0.56, suspendidos: 0.44 }])
  ]);
  const s = senalesDelTrimestre(opciones(desalineado)).find((x) => x.tipo === 'mediaBaja');
  comprobar('CANDADO: la 2.ª del año pasado no cuenta como cohorte comparable',
    s.comprobado.otraCohorte === null,
    'ha emparejado evaluaciones distintas: ' + JSON.stringify(s.comprobado.otraCohorte));
}

seccion('4. Persistencia: estar en rojo una vez no es estar en rojo');
{
  const m = cargar([
    curso('1EV', '26/27', [
      { asignatura: 'Armonía', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45 },
      { asignatura: 'Coro', registros: 20, media: 7.5, aprobados: 0.95, suspendidos: 0.05 }
    ]),
    curso('2EV', '26/27', [
      { asignatura: 'Armonía', registros: 20, media: 4.9, aprobados: 0.56, suspendidos: 0.44 },
      { asignatura: 'Coro', registros: 20, media: 4.7, aprobados: 0.52, suspendidos: 0.48 }
    ])
  ]);
  const serie = serieAlertas({ trimestresDisponibles: m.trimestresDisponibles,
    datosCompletos: m.datosCompletos, umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' });

  /* Se mira la 2.ª evaluación: ahí las dos están en rojo, pero solo Armonía
     lo estaba ya en la 1.ª. */
  const s = senalesDelTrimestre(opciones(m, {
    trimestreSeleccionado: m.trimestresDisponibles[1], serieAlertas: serie
  }));
  const armonia = s.find((x) => x.tipo === 'mediaBaja' && x.asignatura === 'Armonía');
  const coro = s.find((x) => x.tipo === 'mediaBaja' && x.asignatura === 'Coro');

  comprobar('las dos salen', !!armonia && !!coro, JSON.stringify(s.map((x) => x.asignatura + ':' + x.tipo)));
  comprobar('CANDADO: la que lleva dos evaluaciones en rojo es persistente',
    armonia.comprobado.persistente === true && armonia.comprobado.momentosEnRojo === 2,
    JSON.stringify(armonia.comprobado));
  comprobar('CANDADO: y la que acaba de caer, no',
    coro.comprobado.persistente === false && coro.comprobado.momentosEnRojo === 1,
    JSON.stringify(coro.comprobado));
  comprobar('así que la persistente va antes en la lista',
    s.findIndex((x) => x.asignatura === 'Armonía') < s.findIndex((x) => x.asignatura === 'Coro'),
    s.map((x) => x.asignatura).join(' | '));
  /* Y la persistencia tiene que llegar también al MOTIVO, no solo a la ficha.
     Estaban calculadas por separado y una mutación las separó sin que nada se
     pusiera rojo: la señal dejaba de pesar como persistente para ordenar y
     seguía diciendo que lo era al leerla. */
  comprobar('CANDADO: y consta como motivo, no solo en la ficha',
    armonia.solidez.motivos.includes('persistente') &&
    !coro.solidez.motivos.includes('persistente'),
    JSON.stringify([armonia.solidez.motivos, coro.solidez.motivos]));
}

seccion('5. Lo que no se puede medir con dos alumnos, no se señala');
{
  const m = cargar([curso('1EV', '26/27', [
    { asignatura: 'Optativa', registros: 2, media: 3.0, aprobados: 0.5, suspendidos: 0.5 },
    { asignatura: 'Armonía', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45 }
  ])]);
  const s = senalesDelTrimestre(opciones(m));
  comprobar('CANDADO: una asignatura por debajo del mínimo de alumnado no genera señal',
    !s.some((x) => x.asignatura === 'Optativa'),
    'ha colado una señal sobre dos alumnos: ' + s.map((x) => x.asignatura).join(','));
  comprobar('y la que sí llega al mínimo, sí', s.some((x) => x.asignatura === 'Armonía'));
}

seccion('6. Varios indicadores a la vez pesan más que uno');
{
  const m = cargar([curso('1EV', '26/27', [
    /* Media baja, muchos suspensos y notas repartidas: tres a la vez. */
    { asignatura: 'Armonía', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45, desviacion: 2.1 },
    /* Solo la media, y por poco. */
    { asignatura: 'Análisis', registros: 20, media: 5.9, aprobados: 0.80, suspendidos: 0.20, desviacion: 1.0 }
  ])]);
  const s = senalesDelTrimestre(opciones(m));
  const armonia = s.find((x) => x.tipo === 'mediaBaja' && x.asignatura === 'Armonía');
  const analisis = s.find((x) => x.tipo === 'mediaBaja' && x.asignatura === 'Análisis');
  comprobar('la que junta tres indicadores lo dice',
    armonia.solidez.motivos.includes('variosIndicadores'), JSON.stringify(armonia.solidez));
  comprobar('CANDADO: y la que solo tiene uno, no',
    !analisis.solidez.motivos.includes('variosIndicadores'), JSON.stringify(analisis.solidez));
  comprobar('así que la primera pesa más', armonia.solidez.puntos > analisis.solidez.puntos);
  comprobar('y de la misma asignatura salen las dos señales por separado',
    s.filter((x) => x.asignatura === 'Armonía').map((x) => x.tipo).sort().join(',')
      === 'mediaBaja,suspensosAltos',
    s.filter((x) => x.asignatura === 'Armonía').map((x) => x.tipo).join(','));
  /* CANDADO: y la dispersión NO es una señal por sí sola. Lo fue, con umbral
     fijo en 1,5, y al mirarlo en pantalla con datos reales las diez primeras
     señales del centro eran esa misma. Por sí sola no dice nada; lo que
     cambia la decisión es si lo observado lo comparte el grupo. */
  comprobar('CANDADO: «notas repartidas» no aparece como señal suelta',
    !s.some((x) => x.tipo === 'dispersionAlta'),
    'ha vuelto la señal de dispersión: ' + s.map((x) => x.tipo).join(','));
}

seccion('7. Notas altas y muy juntas: una pregunta, no un problema');
{
  const m = cargar([curso('1EV', '26/27', [
    { asignatura: 'Coro', registros: 20, media: 9.2, aprobados: 1, suspendidos: 0, desviacion: 0.3 }
  ])]);
  const s = senalesDelTrimestre(opciones(m));
  const conc = s.find((x) => x.tipo === 'concentracionAlta');
  comprobar('sale la señal', !!conc, JSON.stringify(s.map((x) => x.tipo)));
  comprobar('CANDADO: y lo que pide es comprobar si la evaluación distingue, nada más',
    conc.aMirar.length === 1 && conc.aMirar[0] === 'discriminaLaEvaluacion',
    JSON.stringify(conc.aMirar));
  comprobar('no se le añade magnitud ni se le infla la solidez',
    conc.solidez.puntos <= PESOS.alcance, JSON.stringify(conc.solidez));
}

seccion('7 bis. El reparto se mide contra el propio centro, no contra un 1,5');
{
  /* Doce asignaturas con dispersiones de 0,8 a 1,9: la mediana del centro cae
     en 1,35 y el tercer cuartil en 1,6. Una asignatura con 1,55 estaría «por
     encima de 1,5» con el umbral viejo y aquí sale como normal para este
     centro, que es lo que era. */
  const asigs = [];
  [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.55, 1.7, 1.8, 1.9].forEach((d, i) => {
    asigs.push({ asignatura: 'A' + i, registros: 20, media: 4.8,
                 aprobados: 0.55, suspendidos: 0.45, desviacion: d });
  });
  const m = cargar([curso('1EV', '26/27', asigs)]);
  const s = senalesDelTrimestre(opciones(m)).filter((x) => x.tipo === 'mediaBaja');

  const de = (nombre) => s.find((x) => x.asignatura === nombre).reparto;
  comprobar('la más repartida del centro sale como concentrada en algunos',
    de('A11').como === REPARTO.concentrado, JSON.stringify(de('A11')));
  comprobar('la más junta sale como compartida por el grupo',
    de('A0').como === REPARTO.compartido, JSON.stringify(de('A0')));
  /* Y este es el caso que da sentido a todo el cambio: una asignatura con
     σ = 1,50 —exactamente el umbral fijo de antes, que la habría marcado como
     «notas muy repartidas»— sale aquí como normal, porque en ESTE centro la
     mitad de las asignaturas andan por ahí. */
  comprobar('CANDADO: la que estaba justo en el umbral viejo sale como normal aquí',
    de('A7').como === REPARTO.medio,
    'σ 1.50 clasificada como ' + de('A7').como);
  comprobar('cada una lleva la referencia del centro, para poder decirlo en el papel',
    de('A11').tipicaDelCentro === 1.3 && de('A11').q1 === 1 && de('A11').q3 === 1.55,
    JSON.stringify({ q1: de('A11').q1, mediana: de('A11').tipicaDelCentro, q3: de('A11').q3 }));

  /* Con pocas asignaturas un cuartil no significa nada, y decir que algo está
     «por encima de lo habitual» sobre cuatro datos es inventarse lo habitual. */
  const pocas = cargar([curso('1EV', '26/27', [
    { asignatura: 'Armonía', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45, desviacion: 1.9 },
    { asignatura: 'Coro', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45, desviacion: 0.8 }
  ])]);
  const conPocas = senalesDelTrimestre(opciones(pocas)).find((x) => x.tipo === 'mediaBaja');
  comprobar('CANDADO: con dos asignaturas no se inventa qué es lo habitual',
    conPocas.reparto === null, JSON.stringify(conPocas.reparto));

  /* Y con poco ALUMNADO tampoco, aunque haya asignaturas de sobra: una
     desviación típica sobre cuatro notas no describe ningún reparto. Se vio
     en pantalla —«notas altas y muy parecidas entre sí» sobre un grupo de
     tres— y es una frase sin contenido. */
  const conPocaGente = cargar([curso('1EV', '26/27',
    asigs.map((a, i) => (i === 0 ? { ...a, registros: 4 } : a)))]);
  const chica = senalesDelTrimestre(opciones(conPocaGente)).find((x) => x.asignatura === 'A0');
  comprobar('CANDADO: con cuatro alumnos no se habla del reparto de sus notas',
    chica && chica.reparto === null,
    JSON.stringify(chica && chica.reparto));
  comprobar('y el mínimo para hablar de forma es mayor que el general',
    MINIMO_PARA_FORMA > 3);
}

seccion('8. Las correlaciones, con su n o no salen');
{
  const m = cargar([curso('1EV', '26/27', [
    { asignatura: 'Armonía', registros: 20, media: 7, aprobados: 0.9, suspendidos: 0.1 }
  ])]);
  const s = senalesDelTrimestre(opciones(m, {
    correlaciones: [
      { Nivel: '1EEM', Asignatura1: 'Armonía', Asignatura2: 'Piano', Correlacion: 0.74, N: 18 },
      /* Un 0,95 sobre dos alumnos: exactamente lo que no se puede publicar. */
      { Nivel: '1EEM', Asignatura1: 'Coro', Asignatura2: 'Piano', Correlacion: 0.95, N: 2 },
      { Nivel: '1EEM', Asignatura1: 'Análisis', Asignatura2: 'Piano', Correlacion: 0.31, N: 20 }
    ]
  }));
  const cors = s.filter((x) => x.tipo === 'correlacionFuerte');
  comprobar('sale la fuerte con alumnado suficiente',
    cors.length === 1 && cors[0].par.join('-') === 'Armonía-Piano',
    JSON.stringify(cors.map((c) => c.par)));
  comprobar('CANDADO: el 0,95 sobre dos alumnos no sale',
    !cors.some((c) => c.par.includes('Coro')), 'ha colado una correlación sin n');
  comprobar('y la débil tampoco: no es una señal', !cors.some((c) => c.par.includes('Análisis')));
  comprobar('la que sale lleva su n y su coeficiente, sin adjetivos',
    cors[0].cifras.correlacion === 0.74 && cors[0].cifras.registros === 18,
    JSON.stringify(cors[0].cifras));
}

seccion('9. El orden es estable, o la pantalla baila entre recargas');
{
  const m = cargar([curso('1EV', '26/27', [
    { asignatura: 'Armonía', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45 },
    { asignatura: 'Análisis', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45 },
    { asignatura: 'Coro', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45 }
  ])]);
  const a = senalesDelTrimestre(opciones(m)).map((x) => x.clave).join('>');
  const b = senalesDelTrimestre(opciones(m)).map((x) => x.clave).join('>');
  comprobar('dos ejecuciones dan exactamente la misma lista', a === b);
  /* Y el desempate se comprueba por su propiedad, no por su síntoma: las tres
     asignaturas tienen la misma solidez y el mismo alumnado, así que lo único
     que puede decidir el orden es la clave. Comprobar «dos ejecuciones dan lo
     mismo» no bastaba —sin desempate también dan lo mismo, el del recorrido—. */
  const empatadas = senalesDelTrimestre(opciones(m)).filter((x) => x.tipo === 'mediaBaja');
  comprobar('CANDADO: al empatar en todo, ordena por clave',
    empatadas.map((x) => x.clave).join('>') ===
    empatadas.map((x) => x.clave).sort().join('>'),
    empatadas.map((x) => x.clave).join(' | '));
  comprobar('y las claves son únicas, que es lo que permite recordar cuáles ya se miraron',
    new Set(a.split('>')).size === a.split('>').length, a);
}

seccion('10. No se filtra nada: la pantalla las quiere todas');
{
  const m = cargar([curso('1EV', '26/27', [
    { asignatura: 'Armonía', registros: 20, media: 4.8, aprobados: 0.55, suspendidos: 0.45, desviacion: 2.2 },
    { asignatura: 'Análisis', registros: 20, media: 5.9, aprobados: 0.82, suspendidos: 0.18 },
    { asignatura: 'Coro', registros: 20, media: 9.4, aprobados: 1, suspendidos: 0, desviacion: 0.2 }
  ])]);
  const s = senalesDelTrimestre(opciones(m));
  comprobar('CANDADO: salen todas, no un top recortado por dentro',
    s.length >= 4, s.length + ' señales: ' + s.map((x) => x.tipo).join(','));
  comprobar('y vienen ordenadas de más a menos sólida',
    s.every((x, i) => i === 0 || s[i - 1].solidez.puntos >= x.solidez.puntos),
    JSON.stringify(s.map((x) => x.solidez.puntos)));
}

seccion('11. Sin datos o sin umbrales no se inventa nada');
{
  comprobar('sin trimestre seleccionado, lista vacía',
    senalesDelTrimestre({}).length === 0);
  comprobar('sin umbrales tampoco: clasificar sin criterio daría todo en rojo',
    senalesDelTrimestre({ trimestreSeleccionado: '1EV-2627-EEM',
      datosCompletos: { '1EV-2627-EEM': {} } }).length === 0);
  comprobar('y la referencia de «notas casi idénticas» está declarada, no escrita por ahí',
    DISPERSION_MUY_BAJA === 0.6);
  comprobar('cada tipo de señal sabe qué hay que ir a mirar',
    Object.keys(A_MIRAR).every((k) => A_MIRAR[k].length > 0));
}

terminar('las señales: observación y solidez, nunca una causa.');
