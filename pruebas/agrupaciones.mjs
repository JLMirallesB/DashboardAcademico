/* Las familias de asignaturas, una contra otra — pruebas/agrupaciones.mjs
 *
 *   node pruebas/agrupaciones.mjs
 *
 * Lo que se vigila aquí no es que las cifras sean bonitas: es que la media de
 * una familia sea PONDERADA y no la media de las medias, que las filas de
 * total no se cuelen entre sus propios miembros —la familia se contaría dos
 * veces—, y que el solape entre familias quede a la vista para que nadie
 * pinte con esto un reparto del 100 %.
 */
import {
  agruparPorFamilia, compararFamilias, familia,
  familiasDe, familiasDisponibles, SIN_CLASIFICAR
} from '../src/nucleo/agrupaciones.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { csv, fila } from './fixtures.mjs';
import { comprobar, seccion, terminar, casi, UMBRALES } from './ayuda.mjs';

const cargar = (texto) => procesarDatos(parseCSV(texto));

/* Los grupos van dentro de UN campo separados por `;`, que es también el
   separador del CSV: por eso el campo va entrecomillado. Es como lo escribe el
   analizador y como lo lee `parseCSVLine`. */
const agr = (asignatura, ...grupos) => `AGRUP;${asignatura};"${grupos.join(';')}"`;

/* ------------------------------------------------------------------ */
/* El centro de mentira.
 *
 * Los números están elegidos para que la media ponderada y la media simple den
 * resultados muy distintos: Piano tiene 40 registros con un 5 y Clave tiene 4
 * con un 10. Ponderada 5,45; simple 7,50.
 *
 * Y trae las dos trampas de las filas agregadas: «Total Especialidad» está
 * clasificado como «Especialidad» y «Teórica Troncal» como «Teórica Troncal»,
 * que es exactamente lo que hace el CSV de verdad. */
const CENTRO = csv({
  trimestre: '1EV',
  filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 130, media: 7 }),
    fila({ tipo: 'GLOBAL_ESP', nivel: 'GLOBAL', asignatura: 'Total Especialidad', registros: 60, media: 7 }),
    fila({ tipo: 'GLOBAL_NOESP', nivel: 'GLOBAL', asignatura: 'Total No Especialidad', registros: 60, media: 7 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Teórica Troncal', registros: 60, media: 6.5 }),

    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano', registros: 40, media: 5, aprobados: 0.5, suspendidos: 0.5 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Clave', registros: 4, media: 10, aprobados: 1, suspendidos: 0 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Violín', registros: 16, media: 8, aprobados: 0.75, suspendidos: 0.25 }),

    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Lenguaje Musical', registros: 20, media: 6, aprobados: 0.8, suspendidos: 0.2 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Armonía', registros: 20, media: 6.5, aprobados: 0.8, suspendidos: 0.2 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Análisis', registros: 20, media: 7, aprobados: 0.8, suspendidos: 0.2 }),

    /* Sin familia: el analizador escribe «0» en la columna Grupos. */
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Coro', registros: 10, media: 9, aprobados: 1, suspendidos: 0 })
  ],
  agrupaciones: [
    agr('Piano', 'Especialidad', 'Tecla'),
    agr('Clave', 'Especialidad', 'Tecla'),
    agr('Violín', 'Especialidad', 'Cuerda'),
    agr('Lenguaje Musical', 'No Especialidad', 'Teórica Troncal'),
    agr('Armonía', 'No Especialidad', 'Teórica Troncal'),
    agr('Análisis', 'No Especialidad', 'Teórica Troncal'),
    agr('Teórica Troncal', 'Teórica Troncal'),
    agr('Total Especialidad', 'Especialidad'),
    agr('Coro', '0')
  ]
});

const centro = cargar(CENTRO);
const opciones = { agrupaciones: centro.agrupaciones, modoEtapa: 'TODOS', umbrales: UMBRALES };
const res = agruparPorFamilia(centro.datos, opciones);

/* ------------------------------------------------------------------ */
seccion('1. La media de una familia es ponderada por registros');
{
  const tecla = familia(res, 'tecla') || {};
  /* Piano 40×5 + Clave 4×10 = 240 sobre 44 registros. */
  comprobar('CANDADO: la nota de la familia es la ponderada (5,4545…), no la media de las medias (7,50)',
    casi(tecla.notaMedia, 240 / 44, 1e-9),
    'devuelve ' + tecla.notaMedia);
  comprobar('CANDADO: y por tanto NO es 7,50, que es lo que da promediar promedios',
    Math.abs(tecla.notaMedia - 7.5) > 1,
    'devuelve ' + tecla.notaMedia);
  /* Los porcentajes también: Piano 50 % de aprobados con 40 registros y Clave
     100 % con 4 dan 54,5 %, no 75 %. */
  comprobar('CANDADO: el porcentaje de aprobados también va ponderado (54,5 %, no 75 %)',
    casi(tecla.aprobados, 2400 / 44, 1e-9), 'devuelve ' + tecla.aprobados);
  comprobar('CANDADO: y el de suspensos igual (45,5 %, no 25 %)',
    casi(tecla.suspendidos, 2000 / 44, 1e-9), 'devuelve ' + tecla.suspendidos);
  comprobar('los registros de la familia son la suma de los de sus asignaturas',
    tecla.registros === 44, String(tecla.registros));
}

/* ------------------------------------------------------------------ */
seccion('2. Las filas agregadas no son asignaturas');
{
  const esp = familia(res, 'especialidad') || {};
  /* «Total Especialidad» viene clasificado como «Especialidad» en el CSV y
     tiene 60 registros, justo los mismos que sus tres miembros juntos: si
     entrara, la familia diría 4 asignaturas y 120 registros —el doble— y la
     media se desplazaría hacia el agregado. */
  comprobar('CANDADO: «Total Especialidad» no entra en la familia «especialidad»',
    esp.asignaturas === 3 && esp.registros === 60,
    esp.asignaturas + ' asignaturas / ' + esp.registros + ' registros');
  comprobar('y sus miembros son los tres instrumentos, ninguno más',
    (esp.nombres || []).join('|') === 'Clave|Piano|Violín', String(esp.nombres));

  const troncal = familia(res, 'teórica troncal') || {};
  /* Misma trampa con «Teórica Troncal», que es la SUMA de Lenguaje Musical,
     Armonía y Análisis y viene clasificada en su propia familia. */
  comprobar('CANDADO: «Teórica Troncal» no se cuenta dentro de la familia que resume',
    troncal.asignaturas === 3 && troncal.registros === 60,
    troncal.asignaturas + ' asignaturas / ' + troncal.registros + ' registros');
  comprobar('la nota de la troncal es la ponderada de sus tres partes',
    casi(troncal.notaMedia, (20 * 6 + 20 * 6.5 + 20 * 7) / 60, 1e-9),
    String(troncal.notaMedia));
  comprobar('y el universo tampoco cuenta los agregados: 7 asignaturas, 130 registros',
    res.totales.asignaturas === 7 && res.totales.registros === 130,
    JSON.stringify(res.totales));
}

/* ------------------------------------------------------------------ */
seccion('3. Las familias se solapan: esto no es un reparto del 100 %');
{
  comprobar('se avisa de que hay solape', res.solape.hay === true);
  /* Piano, Clave y Violín están en «Especialidad» y además en su familia
     instrumental; los tres teóricos, en «No Especialidad» y en «Teórica
     Troncal». Seis asignaturas en dos familias cada una. */
  comprobar('CANDADO: se dice QUÉ asignaturas están en más de una familia',
    res.solape.asignaturas.length === 6 &&
    res.solape.asignaturas.indexOf('piano') >= 0 &&
    res.solape.asignaturas.indexOf('violín') >= 0,
    res.solape.asignaturas.join('|'));
  /* 44 (tecla) + 60 (especialidad) + 16 (cuerda) + 60 (no especialidad)
     + 60 (teórica troncal) + 10 (sin clasificar) = 250 sobre 130 reales. */
  comprobar('CANDADO: sumar las familias da 250 registros y el centro tiene 130 — y se ven los dos',
    res.solape.registrosSumados === 250 && res.solape.registrosDistintos === 130,
    JSON.stringify(res.solape));
  comprobar('CANDADO: ninguna familia trae un porcentaje sobre el total, que sería falso',
    res.familias.every((f) => !('porcentaje' in f) && !('porcentajeDelTotal' in f)));
}

/* ------------------------------------------------------------------ */
seccion('4. Las que no tienen familia no desaparecen');
{
  /* Los accesos van defendidos a propósito: si una mutación hace desaparecer
     el montón, la prueba tiene que ponerse ROJA en todas sus líneas, no
     reventar en la primera y dejar sin ejecutar las demás. Una prueba que
     explota informa de un fallo; una que sigue informa de cuántos. */
  const sin = familia(res, SIN_CLASIFICAR) || {};
  comprobar('Coro, sin grupo, va a su propio montón',
    sin.asignaturas === 1 && (sin.nombres || [])[0] === 'Coro',
    JSON.stringify(sin.nombres));
  comprobar('marcado, para que quien pinte pueda apartarlo', sin.esSinClasificar === true);
  /* El «0» de la columna Grupos es relleno de la hoja de cálculo, no una
     familia: si se cuela, aparece una familia llamada «0» con media propia. */
  comprobar('CANDADO: el grupo «0» del CSV no crea una familia llamada «0»',
    familia(res, '0') === null,
    res.familias.map((f) => f.clave).join('|'));
  /* CANDADO. Ojo con el fixture: aquí el montón lo forma Coro, que tiene la
     nota MÁS ALTA del centro, así que con el orden por nota ascendente queda
     el último de todas formas — la comprobación pasaba aunque la regla que lo
     empuja al final no existiera. Se comprueba con un centro donde el montón
     tiene la PEOR nota, que es cuando la regla decide de verdad. */
  comprobar('el montón de sin clasificar va el último, no compitiendo con las familias',
    (res.familias[res.familias.length - 1] || {}).esSinClasificar === true,
    res.familias.map((f) => f.clave).join('|'));

  const csvAlReves = csv({ trimestre: '1EV', filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 40, media: 7 }),
    /* La sin clasificar es la peor del centro: por nota iría la PRIMERA. */
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Optativa X', registros: 20, media: 3 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano', registros: 20, media: 9 }),
    fila({ tipo: 'CURSO_TOTAL', nivel: '1EEM', asignatura: 'Total', registros: 40, media: 7 })
  ] });
  const alRevés = agruparPorFamilia(procesarDatos(parseCSV(csvAlReves)).datos, {
    agrupaciones: { piano: ['tecla'] }, modoEtapa: 'EEM',
    umbrales: { alumnosMinimo: 3 }, vista: 'global'
  });
  comprobar('CANDADO: y va el último AUNQUE tenga la peor nota del centro',
    (alRevés.familias[alRevés.familias.length - 1] || {}).esSinClasificar === true,
    alRevés.familias.map((f) => f.clave + ':' + f.notaMedia).join(' | '));

  const sinMonton = agruparPorFamilia(centro.datos, { ...opciones, incluirSinClasificar: false });
  comprobar('se puede apartar el montón…', familia(sinMonton, SIN_CLASIFICAR) === null);
  comprobar('…pero apartarlo no cambia el universo: siguen siendo 7 asignaturas y 130 registros',
    sinMonton.totales.asignaturas === 7 && sinMonton.totales.registros === 130,
    JSON.stringify(sinMonton.totales));
}

/* ------------------------------------------------------------------ */
seccion('5. Mínimos: sin media, pero sin desaparecer');
{
  const conMinimo = agruparPorFamilia(centro.datos, { ...opciones, minimoRegistros: 20 });
  const cuerdaFuera = familia(conMinimo, 'cuerda');
  const cuerda = cuerdaFuera || {};
  comprobar('CANDADO: la familia que no llega al mínimo sigue en la lista',
    cuerdaFuera !== null, 'cuerda ha desaparecido');
  comprobar('CANDADO: pero sin medias — null, nunca un cero que se lea como medición',
    cuerda.notaMedia === null && cuerda.aprobados === null && cuerda.suspendidos === null,
    JSON.stringify([cuerda.notaMedia, cuerda.aprobados, cuerda.suspendidos]));
  comprobar('y diciendo por qué, con clave estable', cuerda.motivo === 'pocosRegistros', String(cuerda.motivo));
  comprobar('los hechos se conservan: cuántas asignaturas y cuántos registros',
    cuerda.asignaturas === 1 && cuerda.registros === 16);
  comprobar('las que sí llegan mantienen su media', casi(familia(conMinimo, 'tecla').notaMedia, 240 / 44, 1e-9));
  comprobar('las que no tienen media van detrás de las que sí',
    conMinimo.familias.findIndex((f) => f.clave === 'cuerda') >
    conMinimo.familias.findIndex((f) => f.clave === 'tecla'),
    conMinimo.familias.map((f) => f.clave).join('|'));

  const porAsignaturas = agruparPorFamilia(centro.datos, { ...opciones, minimoAsignaturas: 2 });
  const cuerdaPocas = familia(porAsignaturas, 'cuerda') || {};
  comprobar('el mínimo por número de asignaturas también deja la familia sin media',
    cuerdaPocas.motivo === 'pocasAsignaturas' && cuerdaPocas.notaMedia === null,
    JSON.stringify([cuerdaPocas.motivo, cuerdaPocas.notaMedia]));
  comprobar('y por defecto está apagado: con una sola asignatura, cuerda sí tiene media',
    casi((familia(res, 'cuerda') || {}).notaMedia, 8, 1e-9),
    String((familia(res, 'cuerda') || {}).notaMedia));

  /* Sin `minimoRegistros` explícito, el mínimo sale de los umbrales del que
     mira, que es el mismo criterio que usa el resto del proyecto. */
  comprobar('el mínimo por defecto sale de umbrales.alumnosMinimo',
    (familia(res, 'cuerda') || {}).minimoRegistros === UMBRALES.alumnosMinimo,
    String((familia(res, 'cuerda') || {}).minimoRegistros));
}

/* ------------------------------------------------------------------ */
seccion('6. Por niveles, y con la etapa que toca');
{
  /* El mismo Piano en dos cursos y dos etapas. En vista por niveles hay que
     sumar sus registros SIN contarlo como dos asignaturas distintas. */
  const dosEtapas = cargar(csv({
    trimestre: '1EV',
    filas: [
      fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Piano', registros: 8, media: 5 }),
      fila({ tipo: 'CURSO_ASIG', nivel: '2EEM', asignatura: 'Piano', registros: 12, media: 10 }),
      fila({ tipo: 'CURSO_ASIG', nivel: '1EPM', asignatura: 'Piano', registros: 10, media: 9 })
    ],
    agrupaciones: [agr('Piano', 'Especialidad', 'Tecla')]
  }));
  const opc = { agrupaciones: dosEtapas.agrupaciones, vista: 'niveles', umbrales: UMBRALES };

  const eem = familia(agruparPorFamilia(dosEtapas.datos, { ...opc, modoEtapa: 'EEM' }), 'tecla') || {};
  comprobar('CANDADO: una asignatura en dos cursos es UNA asignatura y DOS filas',
    eem.asignaturas === 1 && eem.filas === 2,
    eem.asignaturas + ' asignaturas / ' + eem.filas + ' filas');
  comprobar('CANDADO: en modo EEM solo entran los cursos de elemental (8+12 = 20 registros)',
    eem.registros === 20, String(eem.registros));
  comprobar('con su media ponderada por curso: (8×5 + 12×10) / 20 = 8',
    casi(eem.notaMedia, 8, 1e-9), String(eem.notaMedia));

  const epm = familia(agruparPorFamilia(dosEtapas.datos, { ...opc, modoEtapa: 'EPM' }), 'tecla') || {};
  comprobar('CANDADO: en modo EPM solo entra profesional (10 registros, media 9)',
    epm.registros === 10 && casi(epm.notaMedia, 9, 1e-9),
    epm.registros + ' / ' + epm.notaMedia);

  const todos = familia(agruparPorFamilia(dosEtapas.datos, { ...opc, modoEtapa: 'TODOS' }), 'tecla') || {};
  comprobar('y en modo TODOS entran los tres cursos: (8×5 + 12×10 + 10×9) / 30',
    todos.registros === 30 && casi(todos.notaMedia, 250 / 30, 1e-9),
    todos.registros + ' / ' + todos.notaMedia);

  /* La vista por defecto es la global, que trae cada asignatura una sola vez.
     Si mezclara GLOBAL con los niveles, contaría el centro dos veces. */
  const global = agruparPorFamilia(dosEtapas.datos, { ...opc, vista: 'global', modoEtapa: 'TODOS' });
  comprobar('CANDADO: la vista global no mira los niveles (aquí no hay GLOBAL: ni una familia)',
    global.familias.length === 0 && global.totales.registros === 0,
    JSON.stringify(global.totales));
}

/* ------------------------------------------------------------------ */
seccion('7. Una familia frente a otra');
{
  const c = compararFamilias(res, 'tecla', 'cuerda') || {};
  const cifra = (k) => c[k] || {};
  comprobar('se dice cuál se compara con cuál',
    c.familia === 'tecla' && c.referencia === 'cuerda');
  comprobar('la diferencia de nota media es la resta con su signo',
    casi(cifra('notaMedia').diff, 240 / 44 - 8, 1e-9), JSON.stringify(c.notaMedia));
  comprobar('y bajar la nota se lee como empeorar', cifra('notaMedia').mejora === false);
  /* La regla vive en comparacion.js y aquí se pide, no se reimplementa: subir
     el porcentaje de suspensos es EMPEORAR aunque la resta salga positiva. */
  comprobar('CANDADO: más suspensos es peor, aunque la diferencia sea positiva',
    cifra('suspendidos').diff > 0 && cifra('suspendidos').mejora === false,
    JSON.stringify(c.suspendidos));
  comprobar('y menos aprobados también es peor',
    cifra('aprobados').diff < 0 && cifra('aprobados').mejora === false,
    JSON.stringify(c.aprobados));
  comprobar('la moda y los registros no se restan: no están',
    c.moda === undefined && c.registros === undefined);
  comprobar('con una familia que no existe no se inventa nada',
    compararFamilias(res, 'tecla', 'metal') === null &&
    compararFamilias(res, 'metal', 'tecla') === null);

  /* Si una de las dos no llega al mínimo no tiene media, y comparar contra
     «no hay dato» no puede dar una diferencia: daría la cifra entera de la
     otra y se leería como una ventaja de ocho puntos. */
  const conMinimo = agruparPorFamilia(centro.datos, { ...opciones, minimoRegistros: 20 });
  const c2 = compararFamilias(conMinimo, 'tecla', 'cuerda') || {};
  comprobar('CANDADO: contra una familia sin media no hay diferencia, no hay un cero de base',
    c2.notaMedia === null && c2.aprobados === null && c2.suspendidos === null,
    JSON.stringify(c2));
}

/* ------------------------------------------------------------------ */
seccion('8. El catálogo de familias');
{
  const disponibles = familiasDisponibles(centro.agrupaciones);
  comprobar('salen todas las familias del fichero, en orden',
    disponibles.join('|') === 'cuerda|especialidad|no especialidad|tecla|teórica troncal',
    disponibles.join('|'));
  comprobar('CANDADO: el «0» de relleno no aparece como familia elegible',
    disponibles.indexOf('0') < 0, disponibles.join('|'));

  /* Las claves del mapa de agrupaciones conservan los acentos —lo hace
     `normalizar`— y quitarlos aquí y no allí es lo que hacía desaparecer del
     informe a Violín, Percusión y Saxofón. */
  comprobar('CANDADO: una asignatura con acento encuentra sus familias',
    familiasDe('Violín', centro.agrupaciones).join('|') === 'especialidad|cuerda',
    familiasDe('Violín', centro.agrupaciones).join('|'));
  comprobar('y da igual cómo venga escrita en mayúsculas',
    familiasDe('  VIOLÍN ', centro.agrupaciones).join('|') === 'especialidad|cuerda');
  comprobar('un grupo repetido en la misma asignatura no la cuenta dos veces',
    familiasDe('Trompa', { trompa: ['Metal', 'metal', ' METAL '] }).join('|') === 'metal');
  comprobar('los grupos vacíos y el «0» se apartan',
    familiasDe('Coro', { coro: ['0', '', '  '] }).length === 0);
  comprobar('una asignatura que no está en el mapa no tiene familias',
    familiasDe('Tuba', centro.agrupaciones).length === 0);
}

/* ------------------------------------------------------------------ */
seccion('9. Sin datos no se inventa nada');
{
  const v = agruparPorFamilia(null, opciones);
  comprobar('sin trimestre, la respuesta está vacía pero tiene forma',
    v.familias.length === 0 && v.totales.registros === 0 && v.solape.hay === false);
  const sinMapa = agruparPorFamilia(centro.datos, { modoEtapa: 'TODOS' });
  comprobar('sin mapa de agrupaciones, todo queda sin clasificar y nada se pierde',
    sinMapa.familias.length === 1 && (sinMapa.familias[0] || {}).esSinClasificar === true &&
    (sinMapa.familias[0] || {}).asignaturas === 7 && sinMapa.totales.registros === 130,
    JSON.stringify(sinMapa.totales));
}

terminar('las familias de asignaturas: media ponderada, agregados fuera y solape a la vista.');
