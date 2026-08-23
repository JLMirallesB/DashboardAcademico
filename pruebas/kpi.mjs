/* Los KPIs del centro — pruebas/kpi.mjs
 *
 *   node pruebas/kpi.mjs
 *
 * Lo que se vigila aquí no es que las cifras sean bonitas: es que las filas de
 * TOTAL no se cuelen entre las asignaturas y que las dos etapas no se sumen
 * nunca en un mismo número. Elemental y profesional son dos poblaciones
 * distintas y su media conjunta no significa nada.
 */
import { calcularKPIs, calcularKPIsGlobales } from '../src/nucleo/kpi.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { elemental, profesional } from './fixtures.mjs';
import { comprobar, seccion, terminar, casi, UMBRALES } from './ayuda.mjs';
import { parseTrimestre } from '../src/nucleo/texto.js';

/* La clave lleva el curso académico desde el 23/08/2026, así que no se escribe
   a mano: se busca por sus piezas. Lo que esta prueba vigila son los KPIs. */
const K = (base, etapa) => mundo().trimestresDisponibles.find((t) => {
  const p = parseTrimestre(t);
  return p && p.base === base && p.etapa === etapa;
});
let _mundo = null;
const mundo = () => (_mundo || (_mundo = mundoBase()));

const cargar = (texto) => procesarDatos(parseCSV(texto));

/* Un mundo con las dos etapas cargadas, que es el estado normal del curso y
   justo el que nada probaba. */
function mundoBase() {
  const datosCompletos = {}, trimestresDisponibles = [];
  [[elemental('1EV', 7.25), 0], [profesional('1EV', 6.9), 0],
   [elemental('2EV', 7.30), 0], [profesional('2EV', 7.0), 0]].forEach(([texto]) => {
    const p = cargar(texto);
    datosCompletos[p.trimestre] = p.datos;
    trimestresDisponibles.push(p.trimestre);
  });
  return { datosCompletos, trimestresDisponibles };
}

const opciones = { umbrales: UMBRALES, modoEtapa: 'EEM' };

seccion('1. Las cifras del centro');
{
  const d = cargar(elemental('1EV', 7.25)).datos;
  const k = calcularKPIs(d, opciones);
  comprobar('la nota media sale de GLOBAL/Total', casi(k.notaMediaCentro, 7.25));
  comprobar('sin GLOBAL/Total no se inventa nada',
    calcularKPIs({ '1EEM': {} }, opciones) === null);
  comprobar('y sin datos tampoco', calcularKPIs(null, opciones) === null);
}

seccion('2. Las filas de total no son asignaturas');
{
  /* Profesional escribe «Total No Especialidad» con ene mayúscula. Si el
     criterio comparara cadenas exactas, esa fila —110 registros y 99 % de
     aprobados— entraría en el recuento como una asignatura fácil más. */
  const d = cargar(profesional('1EV', 6.9)).datos;
  const k = calcularKPIs(d, { umbrales: UMBRALES, modoEtapa: 'EPM' });
  comprobar('CANDADO: solo se cuenta la asignatura de verdad, no los tres totales',
    k.totalAsignaturas === 1, k.totalAsignaturas + ' asignaturas contadas');
  comprobar('y el agregado de no-especialidades sí se lee, como agregado',
    casi(k.aprobadosNoEspecialidades, 99), String(k.aprobadosNoEspecialidades));
}

seccion('3. Cuánta gente hay en cada curso');
{
  const d = cargar(elemental('1EV', 7.25)).datos;
  const k = calcularKPIs(d, opciones);
  /* Se cuenta por «Total Especialidad» del nivel, que es una matrícula por
     alumno. El «Total» a secas cuenta registros de todas las asignaturas y
     saldría multiplicado por el número de asignaturas del curso. */
  comprobar('CANDADO: el alumnado del curso sale de Total Especialidad, no de Total',
    k.alumnosPorCurso.length === 1 && k.alumnosPorCurso[0].alumnos === 12,
    JSON.stringify(k.alumnosPorCurso));
  comprobar('y el total del centro es la suma de sus cursos', k.totalAlumnos === 12);
  comprobar('cada curso sabe de qué etapa es', k.alumnosPorCurso[0].etapa === 'EEM');
}

seccion('4. Modo TODOS: dos bloques, nunca uno mezclado');
{
  const { datosCompletos, trimestresDisponibles } = mundo();
  const k = calcularKPIsGlobales({
    trimestreSeleccionado: K('1EV', 'EEM'), datosCompletos, trimestresDisponibles,
    umbrales: UMBRALES, modoEtapa: 'TODOS'
  });
  comprobar('se marca como comparativo, para que quien pinte lo sepa', k.modoComparativo === true);
  comprobar('CANDADO: elemental y profesional van separados, con sus medias',
    casi(k.kpisEEM.notaMediaCentro, 7.25) && casi(k.kpisEPM.notaMediaCentro, 6.9),
    k.kpisEEM.notaMediaCentro + ' / ' + k.kpisEPM.notaMediaCentro);
  comprobar('el alumnado de los dos bloques se lista junto pero sin sumarse en una media',
    k.alumnosPorCurso.length === 2);

  /* CANDADO (fallo 6): en modo comparativo NO hay una nota media del centro, y
     lo que se devuelve tiene que decir «no hay», no un cero. El informe leía
     esos ceros y sacaba tres páginas de KPIs a 0,00 con las diferencias
     porcentuales vacías, porque no se puede dividir por cero. */
  comprobar('CANDADO: las cifras del centro son null, no ceros de relleno',
    k.notaMediaCentro === null && k.aprobadosCentro === null && k.desviacionCentro === null,
    JSON.stringify([k.notaMediaCentro, k.aprobadosCentro]));
  comprobar('pero cada etapa sí tiene las suyas completas',
    typeof k.kpisEEM.aprobadosCentro === 'number' && typeof k.kpisEPM.aprobadosCentro === 'number');
  /* Lo que sí tiene sentido sumar se suma: contar asignaturas difíciles de las
     dos etapas es una cuenta, no una media. */
  comprobar('y lo que sí se puede sumar, se suma',
    k.asignaturasDificiles === k.kpisEEM.asignaturasDificiles + k.kpisEPM.asignaturasDificiles);

  /* Coge la MISMA evaluación de cada etapa, no «el siguiente de la lista». */
  const k2 = calcularKPIsGlobales({
    trimestreSeleccionado: K('2EV', 'EEM'), datosCompletos, trimestresDisponibles,
    umbrales: UMBRALES, modoEtapa: 'TODOS'
  });
  comprobar('CANDADO: empareja por evaluación, no por orden de carga',
    casi(k2.kpisEEM.notaMediaCentro, 7.30) && casi(k2.kpisEPM.notaMediaCentro, 7.0),
    k2.kpisEEM.notaMediaCentro + ' / ' + k2.kpisEPM.notaMediaCentro);
}

seccion('5. Modo de una sola etapa');
{
  const { datosCompletos, trimestresDisponibles } = mundo();
  const k = calcularKPIsGlobales({
    trimestreSeleccionado: K('1EV', 'EPM'), datosCompletos, trimestresDisponibles,
    umbrales: UMBRALES, modoEtapa: 'EPM'
  });
  comprobar('devuelve un solo bloque, sin marca de comparativo', !k.modoComparativo);
  comprobar('con la media de esa etapa', casi(k.notaMediaCentro, 6.9));
  comprobar('sin trimestre seleccionado no devuelve nada',
    calcularKPIsGlobales({ trimestreSeleccionado: null, datosCompletos,
      umbrales: UMBRALES, modoEtapa: 'EPM' }) === null);
  comprobar('y con un trimestre que no está cargado, tampoco',
    calcularKPIsGlobales({ trimestreSeleccionado: '3EV-2627-EPM', datosCompletos,
      umbrales: UMBRALES, modoEtapa: 'EPM' }) === null);
}

terminar('los KPIs, con las dos etapas cargadas a la vez.');
