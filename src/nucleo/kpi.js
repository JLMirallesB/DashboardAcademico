/* Núcleo — los KPIs del centro
 *
 * Sin React. Antes vivía en `useKPICalculation`, y con una particularidad que
 * conviene conocer: había DOS copias del mismo cálculo —una para modo TODOS y
 * otra para EEM/EPM— que habían divergido. La de TODOS no devolvía ni las
 * asignaturas de referencia ni la teórica troncal; la otra no devolvía el total
 * de alumnos. Nadie lo notó porque cada pantalla mira campos distintos.
 *
 * Aquí hay UNA sola función que lo calcula todo, y dos envoltorios que eligen
 * qué trimestres le dan de comer. Duplicar el cálculo para cambiar dos campos
 * es exactamente cómo se llega a que la tarjeta y la lista digan cifras
 * distintas de lo mismo.
 *
 * ---------------------------------------------------------------------------
 * LO QUE NO ARREGLA (todavía)
 *
 * Esto es una extracción: mismo comportamiento, otro sitio. Los fallos
 * conocidos van marcados con TODO(fallo N) y se arreglan después, cada uno con
 * su prueba, para que el historial diga cuál cambió qué.
 */

import { normalizar, buscarClave, esFilaTotal, getTrimestreBase } from './texto.js';
import { calcularResultado, detectarEtapa } from './estadistica.js';

/** Los stats de una fila agregada, o `null` si no está.
 *  Busca sin distinguir mayúsculas: es lo que hace que «Total no Especialidad»
 *  y «Total No Especialidad» sean la misma fila. */
const statsDe = (contenedor, nombre) => {
  const clave = buscarClave(contenedor, nombre);
  const fila = clave ? contenedor[clave] : null;
  return fila && fila.stats ? fila.stats : null;
};

/** Media ponderada por número de registros sobre las asignaturas que cumplan
 *  `filtro`. Se usa solo cuando el CSV no trae la fila agregada: es
 *  retrocompatibilidad con ficheros antiguos, no el camino normal. */
const agregadoPorPeso = (global, filtro) => {
  let notas = 0, aprob = 0, susp = 0, pesos = 0;
  Object.entries(global).forEach(([asig, data]) => {
    if (esFilaTotal(asig) || !data.stats) return;
    if (!filtro(asig)) return;
    const peso = data.stats.registros || 0;
    notas += (data.stats.notaMedia || 0) * peso;
    aprob += (data.stats.aprobados || 0) * peso;
    susp += (data.stats.suspendidos || 0) * peso;
    pesos += peso;
  });
  return {
    notaMedia: pesos > 0 ? notas / pesos : 0,
    aprobados: pesos > 0 ? aprob / pesos : 0,
    suspendidos: pesos > 0 ? susp / pesos : 0,
    /* En este camino no hay de dónde sacarlas: la desviación y la moda de un
       conjunto no se pueden recomponer desde las de sus partes.
       TODO(fallo 12): devolver `null` y que la pantalla diga «—», en vez de un
       cero que se lee como «desviación cero». */
    desviacion: 0,
    moda: 0
  };
};

/** El bloque de cinco cifras de un agregado, con su camino de respaldo. */
const bloque = (global, nombreTotal, filtroRespaldo) => {
  const s = statsDe(global, nombreTotal);
  if (s) {
    return {
      notaMedia: s.notaMedia || 0,
      aprobados: s.aprobados || 0,
      suspendidos: s.suspendidos || 0,
      desviacion: s.desviacion || 0,
      moda: s.moda || 0
    };
  }
  if (!filtroRespaldo) {
    return { notaMedia: 0, aprobados: 0, suspendidos: 0, desviacion: 0, moda: 0 };
  }
  return agregadoPorPeso(global, filtroRespaldo);
};

/* ------------------------------------------------------------------ */

/** Los KPIs de UN trimestre ya elegido.
 *
 * @param datos    el trimestre: { GLOBAL: {...}, '1EEM': {...}, ... }
 * @param opciones { umbrales, modoEtapa, esAsignaturaEspecialidad }
 * @returns null si no hay ni siquiera un GLOBAL/Total del que colgar nada.
 */
export const calcularKPIs = (datos, opciones) => {
  if (!datos) return null;
  const { umbrales, modoEtapa, esAsignaturaEspecialidad } = opciones || {};

  const global = datos['GLOBAL'];
  if (!global || !global['Total']) return null;

  const totalCentro = global['Total'].stats || {};

  /* Las asignaturas contra las que se compara el centro. En profesional la
     referencia es la teórica troncal; en elemental, el lenguaje musical. */
  const asignaturasReferencia = modoEtapa === 'EPM' ? ['Teórica Troncal']
    : modoEtapa === 'EEM' ? ['Lenguaje Musical']
    : ['Lenguaje Musical', 'Teórica Troncal'];

  const notasMediasRef = asignaturasReferencia.map((asig) => {
    const s = statsDe(global, asig);
    return {
      asignatura: asig,
      notaMedia: s ? (s.notaMedia || 0) : 0,
      aprobados: s ? (s.aprobados || 0) : 0,
      suspendidos: s ? (s.suspendidos || 0) : 0
    };
  });

  const esp = bloque(global, 'Total Especialidad',
    esAsignaturaEspecialidad ? (asig) => esAsignaturaEspecialidad(asig, modoEtapa) : null);
  const noEsp = bloque(global, 'Total No Especialidad', null);
  /* Solo en profesional: en elemental no existe la teórica troncal, y buscarla
     ahí solo podría encontrar una fila que se llame parecido. */
  const troncal = (modoEtapa === 'EPM' || modoEtapa === 'TODOS')
    ? bloque(global, 'Teórica Troncal', null)
    : { notaMedia: 0, aprobados: 0, suspendidos: 0, desviacion: 0, moda: 0 };

  /* Cuántas asignaturas salen difíciles, fáciles o ni una cosa ni otra.
     Las filas de total se apartan aquí —esa es la razón de ser de
     `esFilaTotal`— y las de muy pocos alumnos también: con dos registros, un
     porcentaje no significa nada. */
  let dificiles = 0, faciles = 0, neutrales = 0;
  Object.entries(global).forEach(([asig, data]) => {
    if (esFilaTotal(asig) || !data.stats) return;
    if ((data.stats.registros || 0) < umbrales.alumnosMinimo) return;
    const r = calcularResultado(data.stats, umbrales);
    if (r === 'DIFÍCIL') dificiles++;
    else if (r === 'FÁCIL') faciles++;
    else neutrales++;
  });

  /* Cuánta gente hay en cada curso. Se cuenta por los registros de «Total
     Especialidad» del nivel, que es una matrícula por alumno: el «Total» a
     secas cuenta registros de todas las asignaturas y saldría multiplicado. */
  const alumnosPorCurso = [];
  Object.keys(datos).filter((n) => n !== 'GLOBAL').forEach((nivel) => {
    const s = statsDe(datos[nivel], 'Total Especialidad');
    if (!s) return;
    alumnosPorCurso.push({ nivel, etapa: detectarEtapa(nivel), alumnos: s.registros || 0 });
  });

  alumnosPorCurso.sort((a, b) => {
    if (a.etapa !== b.etapa) return a.etapa === 'EEM' ? -1 : 1;
    const na = parseInt((a.nivel.match(/\d+/) || ['0'])[0], 10);
    const nb = parseInt((b.nivel.match(/\d+/) || ['0'])[0], 10);
    return na - nb;
  });

  return {
    notaMediaCentro: totalCentro.notaMedia || 0,
    desviacionCentro: totalCentro.desviacion || 0,
    modaCentro: totalCentro.moda || 0,
    aprobadosCentro: totalCentro.aprobados || 0,
    suspendidosCentro: totalCentro.suspendidos || 0,

    notasMediasRef,

    notaMediaTeoricaTroncal: troncal.notaMedia,
    aprobadosTeoricaTroncal: troncal.aprobados,
    suspendidosTeoricaTroncal: troncal.suspendidos,
    desviacionTeoricaTroncal: troncal.desviacion,
    modaTeoricaTroncal: troncal.moda,

    notaMediaEspecialidades: esp.notaMedia,
    aprobadosEspecialidades: esp.aprobados,
    suspendidosEspecialidades: esp.suspendidos,
    desviacionEspecialidades: esp.desviacion,
    modaEspecialidades: esp.moda,

    notaMediaNoEspecialidades: noEsp.notaMedia,
    aprobadosNoEspecialidades: noEsp.aprobados,
    suspendidosNoEspecialidades: noEsp.suspendidos,
    desviacionNoEspecialidades: noEsp.desviacion,
    modaNoEspecialidades: noEsp.moda,

    asignaturasDificiles: dificiles,
    asignaturasFaciles: faciles,
    asignaturasNeutrales: neutrales,
    totalAsignaturas: dificiles + faciles + neutrales,

    alumnosPorCurso,
    totalAlumnos: alumnosPorCurso.reduce((s, c) => s + c.alumnos, 0)
  };
};

/* ------------------------------------------------------------------ */

/** Los KPIs del trimestre seleccionado, resolviendo el modo de etapa.
 *
 * En modo TODOS no se puede devolver un solo bloque: elemental y profesional
 * son dos poblaciones distintas y su media conjunta no significa nada. Se
 * devuelven los dos, y quien pinta decide.
 */
export const calcularKPIsGlobales = ({
  trimestreSeleccionado,
  datosCompletos,
  trimestresDisponibles = [],
  umbrales,
  modoEtapa,
  esAsignaturaEspecialidad
}) => {
  if (!trimestreSeleccionado) return null;

  if (modoEtapa === 'TODOS') {
    const base = getTrimestreBase(trimestreSeleccionado);
    const deEtapa = (etapa) => {
      const trim = trimestresDisponibles.find((t) => t === `${base}-${etapa}`);
      return trim && datosCompletos[trim]
        ? calcularKPIs(datosCompletos[trim], { umbrales, modoEtapa: etapa, esAsignaturaEspecialidad })
        : null;
    };
    const kpisEEM = deEtapa('EEM');
    const kpisEPM = deEtapa('EPM');

    return {
      modoComparativo: true,
      kpisEEM,
      kpisEPM,
      /* TODO(fallo 6): estos ceros son para los componentes que no saben de
         modo comparativo. La pantalla los esquiva mirando `modoComparativo`,
         pero el informe PDF no, y por eso imprime todos los KPIs a 0,00. */
      notaMediaCentro: 0,
      desviacionCentro: 0,
      modaCentro: 0,
      aprobadosCentro: 0,
      suspendidosCentro: 0,
      asignaturasDificiles: ((kpisEEM && kpisEEM.asignaturasDificiles) || 0) +
                            ((kpisEPM && kpisEPM.asignaturasDificiles) || 0),
      asignaturasFaciles: ((kpisEEM && kpisEEM.asignaturasFaciles) || 0) +
                          ((kpisEPM && kpisEPM.asignaturasFaciles) || 0),
      alumnosPorCurso: [
        ...((kpisEEM && kpisEEM.alumnosPorCurso) || []),
        ...((kpisEPM && kpisEPM.alumnosPorCurso) || [])
      ]
    };
  }

  if (!datosCompletos[trimestreSeleccionado]) return null;
  return calcularKPIs(datosCompletos[trimestreSeleccionado],
    { umbrales, modoEtapa, esAsignaturaEspecialidad });
};

export { normalizar };
