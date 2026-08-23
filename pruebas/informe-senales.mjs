/* El resumen ejecutivo del informe y su nota — pruebas/informe-senales.mjs
 *
 *   node pruebas/informe-senales.mjs
 *
 * Dos cosas que en un papel pesan más que en una pantalla, y las dos son
 * silenciosas si se rompen:
 *
 * - **El recorte tiene que decirse.** Un informe con seis señales de cuarenta
 *   se lee como «hay seis cosas que mirar» si no hay una línea que diga que
 *   faltan treinta y cuatro y dónde están.
 * - **«No hay con qué comparar» no puede escribirse igual que «no».** En la
 *   pantalla alguien puede preguntar; en un PDF que se lee en una reunión seis
 *   meses después, no.
 */
import { tablaSenales, notaMetodologica, POR_DEFECTO } from '../src/nucleo/informe-senales.js';
import { senalesDelTrimestre } from '../src/nucleo/senales.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { csv, fila } from './fixtures.mjs';
import { comprobar, seccion, terminar, UMBRALES } from './ayuda.mjs';

/* Los rótulos, como los pasa el generador. Por defecto la clave tal cual —así
   se ve qué pinta cada sitio sin depender de la tabla de idiomas— salvo los
   que llevan marcadores, que se escriben con ellos: el módulo los rellena, y
   una plantilla sin marcadores no probaría el relleno. */
const PLANTILLAS = {
  avisoRecorte: 'avisoRecorte {recogidas} de {total}, fuera {fuera}',
  metPorPocoAlumnado: 'metPorPocoAlumnado menos de {n}',
  metSenalesTotal: 'metSenalesTotal {n}',
  metCorrelacionesConN: 'metCorrelacionesConN {n}',
  metCorrelacionesSinN: 'metCorrelacionesSinN {n}'
};
const R = new Proxy(PLANTILLAS, { get: (o, k) => o[k] || String(k) });

const unaSenal = (extra) => Object.assign({
  clave: 'mediaBaja|1EEM|armonía',
  tipo: 'mediaBaja', nivel: '1EEM', asignatura: 'Armonía', etapa: 'EEM',
  cifras: { notaMedia: 4.8, suspendidos: 45, desviacion: 1.7, aprobados: 55, registros: 20 },
  reparto: null,
  solidez: { puntos: 4, motivos: ['persistente', 'otraCohorte'] },
  comprobado: { momentosEnRojo: 3, persistente: true, otraCohorte: true,
                desviacion: 1.7, suspendidos: 45, alumnado: 20 },
  aMirar: ['cambioCriterios', 'asistencia']
}, extra || {});

seccion('1. Una fila dice lo que se ve, y sobre cuánta gente');
{
  const t = tablaSenales([unaSenal()], { rotulos: R });
  const [observado, donde, cifras, porQue, comprobado, porMirar] = t.filas[0];

  comprobar('la columna del qué usa la clave del tipo, que traduce quien pinta',
    observado === 'tipo_mediaBaja', observado);
  comprobar('el dónde lleva curso y asignatura', donde === '1EEM · Armonía', donde);
  comprobar('CANDADO: las cifras SIEMPRE llevan la n, y al final',
    /\bn 20$/.test(cifras), cifras);
  comprobar('y no se rellenan con guiones las que no hay',
    !cifras.includes('—'), cifras);
  comprobar('el porqué enumera los motivos, no una nota',
    porQue.includes('motivo_persistente') && porQue.includes('motivo_otraCohorte'), porQue);
  comprobar('lo comprobado dice cuántas evaluaciones y que sí hay otra cohorte',
    comprobado.includes('persistenteSi') && comprobado.includes('(3)') &&
    comprobado.includes('cohorteSi'), comprobado);
  comprobar('y lo que falta por mirar viaja con la fila',
    porMirar.includes('mirar_cambioCriterios') && porMirar.includes('mirar_asistencia'), porMirar);
}

seccion('2. «No hay con qué comparar» se escribe distinto de «no»');
{
  const sinDatos = tablaSenales([unaSenal({
    comprobado: { momentosEnRojo: 1, persistente: false, otraCohorte: null,
                  desviacion: null, suspendidos: null, alumnado: 20 }
  })], { rotulos: R }).filas[0][4];
  const queNo = tablaSenales([unaSenal({
    comprobado: { momentosEnRojo: 1, persistente: false, otraCohorte: false,
                  desviacion: null, suspendidos: null, alumnado: 20 }
  })], { rotulos: R }).filas[0][4];

  comprobar('CANDADO: sin histórico se dice que no hay con qué comparar',
    sinDatos.includes('cohorteSinDatos') && !sinDatos.includes('cohorteNo'), sinDatos);
  comprobar('CANDADO: y comprobado que no se repite se dice de otra forma',
    queNo.includes('cohorteNo') && !queNo.includes('cohorteSinDatos'), queNo);
  comprobar('las dos frases no son la misma', sinDatos !== queNo);
}

seccion('3. El recorte se dice, o el informe miente por omisión');
{
  const muchas = Array.from({ length: 20 }, (_, i) =>
    unaSenal({ clave: 'k' + i, asignatura: 'A' + i }));

  const t = tablaSenales(muchas, { limite: 6, rotulos: R });
  comprobar('se recogen las seis primeras', t.filas.length === 6, t.filas.length + ' filas');
  comprobar('CANDADO: y se dice cuántas quedan fuera y de cuántas',
    t.avisos.some((a) => a.includes('6') && a.includes('20') && a.includes('14')),
    JSON.stringify(t.avisos));

  const cabenTodas = tablaSenales(muchas.slice(0, 4), { limite: 6, rotulos: R });
  comprobar('CANDADO: y si caben todas, NO se avisa de un recorte que no ha habido',
    !cabenTodas.avisos.some((a) => a.includes('avisoRecorte')),
    JSON.stringify(cabenTodas.avisos));
  comprobar('pero el aviso de que son observaciones sale siempre',
    cabenTodas.avisos.some((a) => a.includes('avisoObservacion')));

  comprobar('el orden que traían se respeta: ya venían priorizadas',
    t.filas.map((f) => f[1]).join(',') === muchas.slice(0, 6).map((s) => `1EEM · ${s.asignatura}`).join(','),
    t.filas.map((f) => f[1]).join(','));
  comprobar('sin señales, la sección no se pinta',
    tablaSenales([], { rotulos: R }).vacio === true);
  comprobar('y el tope por defecto está declarado', POR_DEFECTO === 6);
}

seccion('4. La nota metodológica lleva los números de ESTE informe');
{
  const texto = csv({ trimestre: '1EV', curso: '26/27', filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 60, media: 7 }),
    fila({ tipo: 'CURSO_TOTAL', nivel: '1EEM', asignatura: 'Total', registros: 30, media: 7 }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Armonía', registros: 20, media: 5 }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Coro', registros: 12, media: 7 }),
    /* Dos por debajo del mínimo: no es que estén bien, es que no se han
       podido juzgar, y eso tiene que decirlo el informe. */
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Tuba', registros: 2, media: 4 }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Órgano', registros: 1, media: 9 })
  ] });
  const datos = procesarDatos(parseCSV(texto)).datos;

  const n = notaMetodologica({
    senales: [unaSenal(), unaSenal({ clave: 'b' })],
    datosTrimestre: datos, umbrales: UMBRALES,
    correlaciones: [{ Nivel: '1EEM', Asignatura1: 'a', Asignatura2: 'b', Correlacion: 0.5, N: 12 }],
    rotulos: R
  });

  const valor = (clave) => (n.filas.find((f) => f[0] === clave) || [])[1];

  comprobar('dice cuántas asignaturas se han mirado', valor('metAsignaturasMiradas') === '2',
    valor('metAsignaturasMiradas'));
  comprobar('CANDADO: y cuántas se han quedado fuera por poco alumnado',
    String(valor('metAsignaturasFuera')).startsWith('2'),
    valor('metAsignaturasFuera'));
  comprobar('con el mínimo que se ha aplicado dentro del texto',
    String(valor('metAsignaturasFuera')).includes(String(UMBRALES.alumnosMinimo)),
    valor('metAsignaturasFuera'));
  comprobar('y cuál es el grupo más pequeño que sí ha entrado en una cifra',
    valor('metGrupoMasPequeno') === '12', valor('metGrupoMasPequeno'));
  comprobar('las correlaciones dicen si traían su n',
    String(valor('metCorrelaciones')).includes('metCorrelacionesConN'),
    valor('metCorrelaciones'));
  comprobar('y el total de señales, que es de lo que se ha recortado',
    String(valor('metSenales')).includes('2'), valor('metSenales'));

  comprobar('los principios salen como frases, no como filas de tabla',
    n.avisos.length >= 6 && n.avisos.includes('metPrincipioSenal'),
    JSON.stringify(n.avisos));
  comprobar('CANDADO: y entre ellos está el que sostiene todo lo demás',
    n.avisos.includes('metPrincipioSenal') && n.avisos.includes('metPrincipioN'),
    JSON.stringify(n.avisos));
}

seccion('5. Un informe sin correlaciones lo dice, no se calla');
{
  const n = notaMetodologica({ datosTrimestre: {}, umbrales: UMBRALES,
    correlaciones: [], rotulos: R });
  const valor = (clave) => (n.filas.find((f) => f[0] === clave) || [])[1];
  comprobar('lo dice en su fila', String(valor('metCorrelaciones')).includes('metSinCorrelaciones'),
    valor('metCorrelaciones'));
  comprobar('y sin asignaturas, el grupo más pequeño es «—», no un cero',
    valor('metGrupoMasPequeno') === '—', valor('metGrupoMasPequeno'));
}

seccion('6. De punta a punta: del fichero a las filas');
{
  const texto = csv({ trimestre: '1EV', curso: '26/27', filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 60, media: 7 }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Armonía', registros: 20, media: 4.5, aprobados: 0.5, suspendidos: 0.5 })
  ] });
  const p = procesarDatos(parseCSV(texto));
  const senales = senalesDelTrimestre({
    trimestreSeleccionado: p.trimestre,
    datosCompletos: { [p.trimestre]: p.datos },
    trimestresDisponibles: [p.trimestre],
    umbrales: UMBRALES, modoEtapa: 'EEM'
  });
  const t = tablaSenales(senales, { rotulos: R });
  comprobar('las señales de verdad se convierten en filas',
    !t.vacio && t.filas.length === senales.length,
    `${senales.length} señales → ${t.filas.length} filas`);
  comprobar('CANDADO: y ninguna celda dice por qué pasa',
    !JSON.stringify(t.filas).toLowerCase().match(/dificultad|problema|excelente|metodolog/),
    JSON.stringify(t.filas));
}

terminar('el resumen ejecutivo del informe: se dice lo que se recorta, y la n no falta nunca.');
