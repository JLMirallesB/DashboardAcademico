/* Qué asignaturas cuestan — pruebas/dificultad.mjs
 *
 *   node pruebas/dificultad.mjs
 *
 * Este cálculo vivía dentro del render y no se podía probar. Lo que vigila
 * esta prueba, sobre todo: que las filas agregadas no compitan en el ranking
 * como si fueran asignaturas, y que ESTA lista y la tarjeta de KPIs cuenten lo
 * mismo — porque hasta ahora no lo hacían.
 */
import { analizarDificultad } from '../src/nucleo/dificultad.js';
import { calcularKPIs } from '../src/nucleo/kpi.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { csv, fila } from './fixtures.mjs';
import { comprobar, seccion, terminar, UMBRALES } from './ayuda.mjs';

const cargar = (texto) => procesarDatos(parseCSV(texto)).datos;

/* Profesional, que es donde la grafía es «Total No Especialidad» con ene
   mayúscula: por eso el fallo se veía en una etapa y no en la otra. */
const datos = cargar(csv({ filas: [
  fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 100, media: 7 }),
  fila({ tipo: 'GLOBAL_ESP', nivel: 'GLOBAL', asignatura: 'Total Especialidad', registros: 50, media: 7 }),
  fila({ tipo: 'GLOBAL_NOESP', nivel: 'GLOBAL', asignatura: 'Total No Especialidad',
         registros: 50, media: 7, aprobados: 0.962 }),
  fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Armonía', registros: 20,
         media: 5.2, aprobados: 0.6, suspendidos: 0.4 }),
  fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano', registros: 20,
         media: 8.6, aprobados: 0.98, suspendidos: 0.02 }),
  /* Ni fácil ni difícil: 85 % de aprobados queda por debajo del umbral de
     fácil (90) y por encima del de suspensos. */
  fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Coro', registros: 20, media: 7,
         aprobados: 0.85, suspendidos: 0.15 }),
  /* Con dos registros no se puede decir nada de un porcentaje. */
  fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Tuba', registros: 2,
         media: 3, aprobados: 0, suspendidos: 1 }),
  fila({ tipo: 'CURSO_TOTAL', nivel: '1EPM', asignatura: 'Total', registros: 25, media: 7 }),
  fila({ tipo: 'CURSO_ESP', nivel: '1EPM', asignatura: 'Total Especialidad', registros: 12, media: 7 }),
  fila({ tipo: 'CURSO_NOESP', nivel: '1EPM', asignatura: 'Total No Especialidad', registros: 13, media: 7 }),
  fila({ tipo: 'CURSO_ASIG', nivel: '1EPM', asignatura: 'Armonía', registros: 12,
         media: 5.2, aprobados: 0.6, suspendidos: 0.4 })
] }));

const opc = { umbrales: UMBRALES, vista: 'global', modoEtapa: 'EPM' };

seccion('1. Las filas de total no entran en el ranking (fallo 5)');
{
  const r = analizarDificultad(datos, opc);
  const nombres = r.todas.map((a) => a.asignatura);
  comprobar('CANDADO: ninguna fila de total se cuela como asignatura',
    !nombres.some((n) => /^total/i.test(n)), nombres.join(' · '));
  comprobar('y las asignaturas de verdad sí están',
    nombres.indexOf('Armonía') >= 0 && nombres.indexOf('Piano') >= 0);
  /* «Total No Especialidad» tiene 96,2 % de aprobados, por encima del umbral:
     antes salía clasificada como FÁCIL, con 50 registros, junto a asignaturas
     de veinte. */
  comprobar('CANDADO: el agregado de no-especialidades ya no sale como «fácil»',
    !r.faciles.some((a) => /especialidad/i.test(a.asignatura)),
    r.faciles.map((a) => a.asignatura).join(' · '));
}

seccion('2. La lista y la tarjeta de KPIs cuentan lo mismo');
{
  const r = analizarDificultad(datos, opc);
  const k = calcularKPIs(datos, { umbrales: UMBRALES, modoEtapa: 'EPM' });
  /* Este es el candado de verdad: dos cálculos distintos, en dos archivos
     distintos, tienen que dar el mismo número. Antes uno apartaba los totales
     y el otro no, así que la tarjeta decía una cosa y la lista otra. */
  comprobar('CANDADO: mismas difíciles', r.dificiles.length === k.asignaturasDificiles,
    r.dificiles.length + ' vs ' + k.asignaturasDificiles);
  comprobar('CANDADO: mismas fáciles', r.faciles.length === k.asignaturasFaciles,
    r.faciles.length + ' vs ' + k.asignaturasFaciles);
  comprobar('CANDADO: mismo total', r.todas.length === k.totalAsignaturas,
    r.todas.length + ' vs ' + k.totalAsignaturas);
}

seccion('3. Quién es difícil y quién fácil');
{
  const r = analizarDificultad(datos, opc);
  comprobar('armonía, con 40 % de suspensos, es difícil',
    r.dificiles.some((a) => a.asignatura === 'Armonía'));
  comprobar('piano, con 98 % de aprobados, es fácil',
    r.faciles.some((a) => a.asignatura === 'Piano'));
  comprobar('coro, en medio, es neutral',
    r.neutrales.some((a) => a.asignatura === 'Coro'));
  comprobar('y se dice por qué, no solo la etiqueta',
    /suspensos/.test(r.dificiles.find((a) => a.asignatura === 'Armonía').razon));
  /* Con dos registros no se abre juicio: un porcentaje sobre dos alumnos no
     significa nada, y saldría siempre en el extremo del ranking. */
  comprobar('CANDADO: por debajo del mínimo de alumnado, no se clasifica',
    !r.todas.some((a) => a.asignatura === 'Tuba'));
}

seccion('4. Las dos vistas miran sitios distintos');
{
  const global = analizarDificultad(datos, opc);
  const niveles = analizarDificultad(datos, { ...opc, vista: 'niveles' });
  comprobar('la vista global solo mira GLOBAL',
    global.todas.every((a) => a.nivel === 'GLOBAL'));
  comprobar('la vista por niveles NO mira GLOBAL',
    niveles.todas.every((a) => a.nivel !== 'GLOBAL') && niveles.todas.length > 0,
    JSON.stringify(niveles.todas.map((a) => a.nivel + '/' + a.asignatura)));
  comprobar('CANDADO: y tampoco cuela los totales del nivel',
    !niveles.todas.some((a) => /^total/i.test(a.asignatura)),
    niveles.todas.map((a) => a.asignatura).join(' · '));
  comprobar('en modo de una etapa, los niveles de la otra no entran',
    analizarDificultad(datos, { ...opc, vista: 'niveles', modoEtapa: 'EEM' }).todas.length === 0);
}

seccion('5. Sin datos, no revienta');
{
  comprobar('sin trimestre devuelve las tres cajas vacías',
    analizarDificultad(null, opc).todas.length === 0);
}

terminar('el análisis de dificultad, y que cuadre con los KPIs.');
