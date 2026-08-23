/* La comparación entre cursos académicos del informe — pruebas/informe-cursos.mjs
 *
 *   node pruebas/informe-cursos.mjs
 *
 * Es la tabla que responde a «¿vamos mejor que el año pasado?», y la única del
 * informe que necesita más de un fichero. Lo que vigilan estas comprobaciones
 * no es que las cifras sean bonitas: es que **la tabla no empareje lo que no se
 * puede emparejar**. Una fila que cruzara la 1.ª evaluación de este año con la
 * 2.ª del pasado, o la nota de elemental con la de profesional, saldría impresa
 * exactamente igual que las demás —un curso, tres cifras y una diferencia— y en
 * una reunión, meses después, no hay nadie al lado para decir «esa comparación
 * no significa nada».
 */
import { tablaEntreCursos, cursoLegible } from '../src/nucleo/informe-cursos.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { SIN_DATO } from '../src/nucleo/informe.js';
import { csv, fila } from './fixtures.mjs';
import { comprobar, seccion, terminar } from './ayuda.mjs';

/** Un fichero con las cifras del centro que mira esta tabla.
 *  `nivel` decide la etapa que detecta `procesarDatos`; `curso: ''` fabrica un
 *  fichero del formato antiguo, sin curso académico en la clave.
 *
 *  El bloque GLOBAL trae las TRES filas agregadas que trae un CSV de verdad, no
 *  solo la que aquí se lee: «Total Especialidad» y «Total No Especialidad»
 *  existen, tienen otras cifras y se parecen mucho de nombre. Y van escritas
 *  ANTES que «Total» a propósito —el analizador se rellena a mano y el orden de
 *  las filas no puede decidir cuál se lee—: con «Total» la primera, buscarla
 *  por el principio del nombre acertaría por casualidad y la comprobación de
 *  abajo quedaría en verde sin probar nada. `rotuloTotal` sirve para escribirla
 *  como la escribiría una persona con la tecla de mayúsculas puesta. */
const centro = ({ trimestre = '1EV', curso, nivel = '1EEM', media = 7,
                  aprobados = 0.9, suspendidos = 0.1,
                  rotuloTotal = 'Total' }) => csv({
  trimestre, curso,
  filas: [
    fila({ tipo: 'GLOBAL_ESP', nivel: 'GLOBAL', asignatura: 'Total Especialidad',
           registros: 40, media: 3.33, aprobados: 0.11, suspendidos: 0.89 }),
    fila({ tipo: 'GLOBAL_NOESP', nivel: 'GLOBAL', asignatura: 'Total No Especialidad',
           registros: 60, media: 9.87, aprobados: 0.99, suspendidos: 0.01 }),
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: rotuloTotal, registros: 100,
           media, aprobados, suspendidos }),
    fila({ tipo: 'CURSO_TOTAL', nivel, asignatura: 'Total', registros: 25, media })
  ]
});

/** Carga una lista de ficheros como los carga la aplicación. */
const mundo = (textos) => {
  const datosCompletos = {}, trimestresDisponibles = [];
  textos.forEach((t) => {
    const p = procesarDatos(parseCSV(t));
    datosCompletos[p.trimestre] = p.datos;
    trimestresDisponibles.push(p.trimestre);
  });
  return { datosCompletos, trimestresDisponibles };
};

/* Los rótulos entran por parámetro: el informe se genera en dos idiomas y aquí
   dentro no hay traducciones. Las plantillas llevan `{marcadores}`. */
const ROT = {
  curso: 'Curso', notaMedia: 'Nota media', aprobados: '% Aprobados',
  suspensos: '% Suspensos', difNota: 'Dif. nota',
  difAprobados: 'Dif. aprobados', difSuspensos: 'Dif. suspensos',
  referencia: 'Referencia: {evaluacion} de {curso}.',
  sinEvaluacion: 'Sin {evaluacion} cargada, y por eso no salen: {cursos}.',
  sinCursoAcademico: '{n} fichero(s) no dicen de qué curso son y quedan fuera.',
  noEsCohorte: 'Dos cursos no son la misma gente.'
};

const tabla = (textos, opciones = {}) => {
  const m = mundo(textos);
  return tablaEntreCursos({ ...m, rotulos: ROT, modoEtapa: 'EEM', ...opciones });
};

seccion('1. Un curso solo no se compara con nadie');
{
  const uno = tabla([centro({ curso: '26/27' })], { trimestreSeleccionado: '1EV-2627-EEM' });
  /* CANDADO: la alternativa es una tabla de una fila con la columna de
     diferencias en blanco, repitiendo tres cifras que ya están en el resto del
     informe y sugiriendo que la comparación se ha hecho. */
  comprobar('CANDADO: con un solo curso cargado la sección se salta',
    uno.vacio === true, JSON.stringify(uno.filas));

  const dos = tabla([centro({ curso: '25/26', media: 6.5 }), centro({ curso: '26/27' })],
    { trimestreSeleccionado: '1EV-2627-EEM' });
  comprobar('con dos, la tabla existe y trae una fila por curso',
    dos.vacio === false && dos.filas.length === 2, JSON.stringify(dos.filas));
  comprobar('y la cabecera son las siete columnas que le han pasado',
    dos.cabecera.join('|') === 'Curso|Nota media|% Aprobados|% Suspensos|' +
      'Dif. nota|Dif. aprobados|Dif. suspensos', dos.cabecera.join('|'));
}

seccion('2. Solo se comparan momentos comparables');
{
  /* 24/25 tiene las dos evaluaciones; 25/26 solo la segunda; 26/27, que es el
     seleccionado, solo la primera. La 2.ª de 24/25 va MUY alta a propósito: si
     el código empareja por curso sin mirar la evaluación, se ve enseguida.

     Y va cargada ANTES que la 1.ª, que no es un capricho: con la primera
     evaluación cargada antes, una búsqueda que no mirara la evaluación daría
     igualmente la respuesta correcta y esta sección quedaría en verde sin
     probar nada. Se comprobó mutando el módulo. */
  const t = tabla([
    centro({ trimestre: '2EV', curso: '24/25', media: 9.9 }),
    centro({ trimestre: '1EV', curso: '24/25', media: 6.0 }),
    centro({ trimestre: '2EV', curso: '25/26', media: 8.0 }),
    centro({ trimestre: '2EV', curso: '23/24', media: 5.0 }),
    centro({ trimestre: '1EV', curso: '26/27', media: 7.0 })
  ], { trimestreSeleccionado: '1EV-2627-EEM' });

  comprobar('CANDADO: de 24/25 se toma su PRIMERA evaluación, no la segunda',
    t.filas[0][1] === '6.00', t.filas[0].join('|'));
  comprobar('CANDADO: el curso al que le falta esa evaluación no sale',
    t.filas.length === 2 && !t.filas.some((f) => f[0] === '25/26'),
    t.filas.map((f) => f[0]).join());
  comprobar('pero no desaparece en silencio: se dice cuál falta',
    t.avisos.some((a) => a.includes('25/26') && a.includes('1EV')),
    JSON.stringify(t.avisos));
  /* Los que faltan son dos, y esa lista se lee en un pie de tabla: va del más
     antiguo al más nuevo, como las filas. Con uno solo el orden no se mide. */
  comprobar('y los que faltan se enumeran en orden, no en el de carga',
    t.avisos.some((a) => a.includes('23/24, 25/26')), JSON.stringify(t.avisos));
  comprobar('y la diferencia es contra la primera evaluación del curso elegido',
    t.filas[0][4] === '-1.00', t.filas[0][4]);

  /* CANDADO de la decisión: `vacio` se decide por FILAS COMPARABLES, no por
     cursos cargados. Aquí hay DOS cursos de elemental cargados —y uno de ellos
     es la referencia—, pero al otro le falta esta evaluación, así que la única
     fila posible es la de referencia midiéndose contra sí misma. Contar cursos
     cargados en vez de filas imprimiría esa tabla de una fila: tres cifras que
     ya están en el resto del informe y una columna de diferencias en blanco. */
  const unaSola = tabla([
    centro({ trimestre: '2EV', curso: '25/26', media: 8.0 }),
    centro({ trimestre: '1EV', curso: '26/27', media: 7.0 })
  ], { trimestreSeleccionado: '1EV-2627-EEM' });
  comprobar('CANDADO: dos cursos cargados, pero al otro le falta esta evaluación: no hay tabla',
    unaSola.vacio === true && unaSola.filas.length === 1, JSON.stringify(unaSola.filas));
  comprobar('y aun así se dice por qué, que es lo que hay que poder leer',
    unaSola.avisos.some((a) => a.includes('25/26')), JSON.stringify(unaSola.avisos));
}

seccion('3. Y solo dentro de la misma etapa');
{
  /* El mismo curso 25/26 cargado en las dos etapas, con notas separadas a
     propósito. Si la tabla no filtra por etapa, la fila de 25/26 puede coger
     la de profesional y la diferencia se leería como la evolución del centro. */
  const textos = [
    centro({ curso: '25/26', nivel: '1EEM', media: 6.0 }),
    centro({ curso: '25/26', nivel: '1EPM', media: 9.0 }),
    centro({ curso: '26/27', nivel: '1EEM', media: 7.0 })
  ];
  const t = tabla(textos, { trimestreSeleccionado: '1EV-2627-EEM' });
  comprobar('CANDADO: la fila de 25/26 trae la nota de elemental, no la de profesional',
    t.filas.length === 2 && t.filas[0][1] === '6.00', JSON.stringify(t.filas));

  const todos = tabla(textos, { trimestreSeleccionado: '1EV-2627-EEM', modoEtapa: 'TODOS' });
  comprobar('CANDADO: y en modo «las dos etapas» tampoco se mezclan',
    todos.filas.length === 2 && todos.filas[0][1] === '6.00', JSON.stringify(todos.filas));

  /* Del curso pasado solo se cargó profesional: para elemental no hay con qué
     comparar, y una fila «25/26 = 9,00» sería de otra población. */
  const soloOtra = tabla([
    centro({ curso: '25/26', nivel: '1EPM', media: 9.0 }),
    centro({ curso: '26/27', nivel: '1EEM', media: 7.0 })
  ], { trimestreSeleccionado: '1EV-2627-EEM' });
  comprobar('CANDADO: si del curso anterior solo hay la otra etapa, no hay tabla',
    soloOtra.vacio === true, JSON.stringify(soloOtra.filas));

  const enEPM = tabla(textos, { trimestreSeleccionado: '1EV-2526-EPM', modoEtapa: 'EPM' });
  comprobar('y en profesional pasa lo mismo, con un solo curso suyo cargado',
    enEPM.vacio === true, JSON.stringify(enEPM.filas));
}

seccion('4. Del más antiguo al más nuevo, y con el curso legible');
{
  const t = tabla([
    centro({ curso: '26/27', media: 7.0 }),
    centro({ curso: '24/25', media: 6.0 }),
    centro({ curso: '25/26', media: 6.5 })
  ], { trimestreSeleccionado: '1EV-2627-EEM' });

  comprobar('CANDADO: las filas van en orden cronológico, no en el de carga',
    t.filas.map((f) => f[0]).join() === '24/25,25/26,26/27',
    t.filas.map((f) => f[0]).join());
  comprobar('CANDADO: el curso se rotula «25/26», nunca con la clave interna «2526»',
    t.filas.every((f) => /^\d\d\/\d\d$/.test(f[0])), t.filas.map((f) => f[0]).join());
  comprobar('y `cursoLegible` deshace las tres formas de escribirlo',
    cursoLegible('2526') === '25/26' && cursoLegible('202526') === '2025/26' &&
    cursoLegible(null) === '', cursoLegible('2526'));
}

seccion('5. Cero y «no hay dato» tampoco son lo mismo aquí');
{
  /* 24/25 tiene un cero de verdad, 25/26 no tiene nota —la fila Total del CSV
     trae «—», que es lo que escribe el analizador cuando no la hay— y 26/27 es
     la referencia. Los porcentajes se separan para que las tres columnas se
     midan de verdad y no solo la primera. */
  const t = tabla([
    centro({ curso: '24/25', media: 0, aprobados: 0.82, suspendidos: 0.18 }),
    centro({ curso: '25/26', media: null, aprobados: 0.9, suspendidos: 0.1 }),
    centro({ curso: '26/27', media: 7.0, aprobados: 0.9, suspendidos: 0.1 })
  ], { trimestreSeleccionado: '1EV-2627-EEM' });

  const cero = t.filas[0], sinNota = t.filas[1], ref = t.filas[2];

  comprobar('CANDADO: el curso sin nota dice «—» en el valor Y en la diferencia',
    sinNota[1] === SIN_DATO && sinNota[4] === SIN_DATO, sinNota.join('|'));
  comprobar('CANDADO: pero un cero de verdad se escribe, y su diferencia también',
    cero[1] === '0.00' && cero[4] === '-7.00', cero.join('|'));
  comprobar('los porcentajes se leen de su columna y se restan en puntos',
    cero[2] === '82.0%' && cero[3] === '18.0%' &&
    cero[5] === '-8.0%' && cero[6] === '+8.0%', cero.join('|'));
  comprobar('una diferencia de cero medida de verdad sí se escribe',
    sinNota[5] === '+0.0%', sinNota[5]);
  /* La fila de referencia no se mide contra sí misma: «+0,00» ahí es una
     medición que nadie ha hecho, y «—» sería falso porque dato hay. */
  comprobar('CANDADO: la fila de referencia no dice «+0.00» ni «—»: no compara',
    ref[1] === '7.00' && ref[4] === '' && ref[5] === '' && ref[6] === '',
    ref.join('|'));

  /* CANDADO: la fila que se lee es «Total», no sus dos hermanas. En el bloque
     GLOBAL conviven «Total», «Total Especialidad» y «Total No Especialidad», y
     coger «la primera que empiece por Total» daría la nota de las asignaturas
     de especialidad presentada como la del centro: una cifra plausible, en su
     sitio, y de otra cosa. En el fixture las hermanas valen 3,33 y 9,87. */
  comprobar('CANDADO: se lee la fila «Total», no «Total Especialidad» ni «Total No Especialidad»',
    ref[1] === '7.00' && ref[2] === '90.0%' && ref[3] === '10.0%', ref.join('|'));

  /* Y se encuentra sin distinguir mayúsculas, que es lo que promete
     `buscarClave`: esta hoja la rellena una persona a mano. Si se buscara con
     `===` la tabla saldría entera de «—» sin dar ningún error. */
  const mayus = tabla([
    centro({ curso: '25/26', media: 6.5 }),
    centro({ curso: '26/27', media: 7.0, rotuloTotal: 'TOTAL' })
  ], { trimestreSeleccionado: '1EV-2627-EEM' });
  comprobar('CANDADO: la fila del centro se encuentra aunque venga escrita «TOTAL»',
    mayus.filas[1][1] === '7.00' && mayus.filas[0][4] === '-0.50',
    JSON.stringify(mayus.filas));
}

seccion('6. Lo que se imprime debajo de la tabla');
{
  const t = tabla([
    centro({ trimestre: '2EV', curso: '25/26', media: 8.0 }),
    centro({ trimestre: '1EV', curso: '24/25', media: 6.0 }),
    centro({ trimestre: '1EV', curso: '26/27', media: 7.0 })
  ], { trimestreSeleccionado: '1EV-2627-EEM' });

  comprobar('el aviso de referencia dice cuál es, con el curso ya legible',
    t.avisos[0] === 'Referencia: 1EV de 26/27.', t.avisos[0]);
  comprobar('y va también la advertencia de que dos cursos no son la misma gente',
    t.avisos.includes('Dos cursos no son la misma gente.'), JSON.stringify(t.avisos));

  /* CANDADO: un rótulo que no llegue no puede imprimir una línea en blanco
     debajo de la tabla; se calla. */
  const mudo = tabla([centro({ curso: '25/26', media: 6.5 }), centro({ curso: '26/27' })],
    { trimestreSeleccionado: '1EV-2627-EEM', rotulos: {} });
  comprobar('CANDADO: sin plantillas no se imprimen líneas vacías',
    mudo.avisos.length === 0 && mudo.vacio === false, JSON.stringify(mudo.avisos));

  /* Un fichero del formato antiguo, sin curso académico en la clave. No puede
     ser una fila —se rotularía con un curso que no se sabe— pero tampoco puede
     desaparecer sin decirlo. */
  const viejo = tabla([
    centro({ curso: '', media: 5.0 }),
    /* Dos señuelos: uno de otra evaluación y otro de la otra etapa, los dos sin
       curso académico. NO son ficheros que esta tabla haya dejado fuera —no
       tenían nada que hacer aquí—, así que el recuento del aviso tiene que
       seguir diciendo uno. Un aviso que cuenta de más es un aviso que se deja
       de leer. */
    centro({ curso: '', trimestre: '2EV', media: 4.0 }),
    centro({ curso: '', nivel: '1EPM', media: 3.0 }),
    centro({ curso: '25/26', media: 6.5 }),
    centro({ curso: '26/27', media: 7.0 })
  ], { trimestreSeleccionado: '1EV-2627-EEM' });
  comprobar('CANDADO: el fichero sin curso académico no se convierte en una fila',
    viejo.filas.length === 2 && viejo.filas.every((f) => f[0] !== ''),
    JSON.stringify(viejo.filas));
  comprobar('CANDADO: y se avisa de que se ha quedado fuera, contando solo los que lo estaban',
    viejo.avisos.some((a) => a.includes('1 fichero(s)')), JSON.stringify(viejo.avisos));

  /* Un `{marcador}` que el módulo no rellena se queda a la vista. Es lo que
     hace visible una errata en una traducción; borrarlo dejaría una frase que
     se lee bien y dice otra cosa. */
  const errata = tabla([centro({ curso: '25/26', media: 6.5 }), centro({ curso: '26/27' })],
    { trimestreSeleccionado: '1EV-2627-EEM',
      rotulos: { ...ROT, referencia: 'Referencia: {evaluacion} de {curs}.' } });
  comprobar('un {marcador} que no se rellena se queda a la vista, no se borra',
    errata.avisos[0] === 'Referencia: 1EV de {curs}.', errata.avisos[0]);
}

seccion('7. Sin referencia no hay comparación');
{
  const fuera = tabla([centro({ curso: '24/25', media: 6.0 }), centro({ curso: '25/26', media: 6.5 })],
    { trimestreSeleccionado: '1EV-2627-EEM' });
  comprobar('CANDADO: si el fichero elegido no está cargado, no se compara nada',
    fuera.vacio === true, JSON.stringify(fuera.filas));

  const sinCurso = tabla([
    centro({ curso: '', media: 5.0 }),
    centro({ curso: '25/26', media: 6.5 })
  ], { trimestreSeleccionado: '1EV-EEM' });
  comprobar('CANDADO: un fichero que no dice de qué curso es no compara cursos',
    sinCurso.vacio === true, JSON.stringify(sinCurso.filas));

  comprobar('y sin fichero seleccionado tampoco revienta',
    tablaEntreCursos({}).vacio === true &&
    tablaEntreCursos({ trimestreSeleccionado: null, rotulos: ROT }).vacio === true);
}

seccion('8. El modo de etapa del informe manda');
{
  const textos = [
    centro({ curso: '25/26', nivel: '1EEM', media: 6.0 }),
    centro({ curso: '26/27', nivel: '1EEM', media: 7.0 })
  ];
  comprobar('CANDADO: un informe de profesional no imprime la tabla de elemental',
    tabla(textos, { trimestreSeleccionado: '1EV-2627-EEM', modoEtapa: 'EPM' }).vacio === true);
  comprobar('y en su etapa, sí',
    tabla(textos, { trimestreSeleccionado: '1EV-2627-EEM', modoEtapa: 'EEM' }).filas.length === 2);
}

terminar('curso contra curso: mismo momento, misma etapa, y nada emparejado a la fuerza.');
