/**
 * Dashboard Académico - Hook de Cálculo de KPIs
 * Calcula los 8 KPIs globales del centro educativo
 */

import { useMemo } from 'react';
import { normalizar, getTrimestreBase } from '../utils.js';

/**
 * Calcula KPIs para un trimestre específico
 * @param {Object} datos - Datos del trimestre
 * @param {Function} calcularResultado - Función para calcular resultado
 * @param {Object} umbrales - Umbrales configurables
 * @param {string} modoEtapa - Modo de etapa para esta instancia
 * @param {Function} esAsignaturaEspecialidad - Función para detectar especialidades
 * @param {Function} detectarEtapa - Función para detectar etapa de un nivel
 * @returns {Object|null} KPIs calculados
 */
const calcularKPIsParaTrimestre = (datos, calcularResultado, umbrales, modoEtapa, esAsignaturaEspecialidad, detectarEtapa) => {
  if (!datos) return null;

  const global = datos['GLOBAL'];
  if (!global || !global['Total']) {
    return null;
  }

  // KPI 1: Nota media del centro (GLOBAL/Total)
  const notaMediaCentro = global['Total']?.stats?.notaMedia || 0;

  // KPI 1b: Desviación típica del centro
  const desviacionCentro = global['Total']?.stats?.desviacion || 0;

  // KPI 1c: Moda del centro
  const modaCentro = global['Total']?.stats?.moda || 0;

  // KPI 3, 4, 5: Estadísticas de Especialidades
  // Buscar Total Especialidad (case-insensitive)
  const totalEspKey = Object.keys(global).find(key =>
    normalizar(key) === 'total especialidad'
  );
  const totalEsp = totalEspKey ? global[totalEspKey] : null;
  let notaMediaEspecialidades, aprobadosEspecialidades, suspendidosEspecialidades;
  let desviacionEspecialidades, modaEspecialidades;

  if (totalEsp && totalEsp.stats) {
    notaMediaEspecialidades = totalEsp.stats.notaMedia || 0;
    aprobadosEspecialidades = totalEsp.stats.aprobados || 0;
    suspendidosEspecialidades = totalEsp.stats.suspendidos || 0;
    desviacionEspecialidades = totalEsp.stats.desviacion || 0;
    modaEspecialidades = totalEsp.stats.moda || 0;
  } else {
    // Fallback: calcular manualmente
    const totalesExcluirFallback = ['total', 'total especialidad', 'total no especialidad'];
    let sumaNotasEsp = 0, sumaPesosEsp = 0;
    let sumaAprobEsp = 0, sumaPesosAprobEsp = 0;
    let sumaSuspEsp = 0, sumaPesosSuspEsp = 0;

    Object.entries(global).forEach(([asig, data]) => {
      if (totalesExcluirFallback.includes(normalizar(asig)) || !data.stats) return;
      if (esAsignaturaEspecialidad(asig, modoEtapa)) {
        const peso = data.stats.registros || 0;
        sumaNotasEsp += (data.stats.notaMedia || 0) * peso;
        sumaPesosEsp += peso;
        sumaAprobEsp += (data.stats.aprobados || 0) * peso;
        sumaPesosAprobEsp += peso;
        sumaSuspEsp += (data.stats.suspendidos || 0) * peso;
        sumaPesosSuspEsp += peso;
      }
    });

    notaMediaEspecialidades = sumaPesosEsp > 0 ? sumaNotasEsp / sumaPesosEsp : 0;
    aprobadosEspecialidades = sumaPesosAprobEsp > 0 ? sumaAprobEsp / sumaPesosAprobEsp : 0;
    suspendidosEspecialidades = sumaPesosSuspEsp > 0 ? sumaSuspEsp / sumaPesosSuspEsp : 0;
    desviacionEspecialidades = 0;
    modaEspecialidades = 0;
  }

  // No Especialidades
  // Buscar Total No Especialidad (case-insensitive)
  const totalNoEspKey = Object.keys(global).find(key =>
    normalizar(key) === 'total no especialidad'
  );
  const totalNoEsp = totalNoEspKey ? global[totalNoEspKey] : null;
  let notaMediaNoEspecialidades = 0, aprobadosNoEspecialidades = 0, suspendidosNoEspecialidades = 0;
  let desviacionNoEspecialidades = 0, modaNoEspecialidades = 0;

  if (totalNoEsp && totalNoEsp.stats) {
    notaMediaNoEspecialidades = totalNoEsp.stats.notaMedia || 0;
    aprobadosNoEspecialidades = totalNoEsp.stats.aprobados || 0;
    suspendidosNoEspecialidades = totalNoEsp.stats.suspendidos || 0;
    desviacionNoEspecialidades = totalNoEsp.stats.desviacion || 0;
    modaNoEspecialidades = totalNoEsp.stats.moda || 0;
  }

  // Asignaturas difíciles/fáciles
  const totalesExcluir = ['total', 'total especialidad', 'total no especialidad'];
  let contDificiles = 0, contFaciles = 0, contNeutrales = 0;
  Object.entries(global).forEach(([asig, data]) => {
    if (totalesExcluir.includes(normalizar(asig)) || !data.stats) return;
    if ((data.stats.registros || 0) < umbrales.alumnosMinimo) return;

    const resultado = calcularResultado(data.stats);
    if (resultado === 'DIFÍCIL') contDificiles++;
    else if (resultado === 'FÁCIL') contFaciles++;
    else contNeutrales++;
  });

  const totalAsignaturas = contDificiles + contFaciles + contNeutrales;

  // Alumnos por curso
  const alumnosPorCurso = [];
  const niveles = Object.keys(datos).filter(n => n !== 'GLOBAL');

  niveles.forEach(nivel => {
    const nivelData = datos[nivel];
    if (!nivelData) return;
    const totalEspNivelKey = Object.keys(nivelData).find(key =>
      normalizar(key) === 'total especialidad'
    );
    const totalEspNivel = totalEspNivelKey ? nivelData[totalEspNivelKey] : null;
    if (totalEspNivel && totalEspNivel.stats) {
      const etapa = detectarEtapa ? detectarEtapa(nivel) : null;
      alumnosPorCurso.push({
        nivel,
        etapa,
        alumnos: totalEspNivel.stats.registros || 0
      });
    }
  });

  alumnosPorCurso.sort((a, b) => {
    const numA = parseInt(a.nivel.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.nivel.match(/\d+/)?.[0] || '0');
    if (a.etapa !== b.etapa) {
      return a.etapa === 'EEM' ? -1 : 1;
    }
    return numA - numB;
  });

  // Total de alumnos
  const totalAlumnos = alumnosPorCurso.reduce((sum, c) => sum + c.alumnos, 0);

  return {
    notaMediaCentro,
    desviacionCentro,
    modaCentro,
    aprobadosCentro: global['Total']?.stats?.aprobados || 0,
    suspendidosCentro: global['Total']?.stats?.suspendidos || 0,
    notaMediaEspecialidades,
    aprobadosEspecialidades,
    suspendidosEspecialidades,
    desviacionEspecialidades,
    modaEspecialidades,
    notaMediaNoEspecialidades,
    aprobadosNoEspecialidades,
    suspendidosNoEspecialidades,
    desviacionNoEspecialidades,
    modaNoEspecialidades,
    asignaturasDificiles: contDificiles,
    asignaturasFaciles: contFaciles,
    asignaturasNeutrales: contNeutrales,
    totalAsignaturas,
    alumnosPorCurso,
    totalAlumnos
  };
};

/**
 * Hook para calcular KPIs globales del centro
 * @param {string} trimestreSeleccionado - Trimestre actual
 * @param {Object} datosCompletos - Datos completos del dashboard
 * @param {Function} calcularResultado - Función para calcular resultado
 * @param {Object} umbrales - Umbrales configurables
 * @param {string} modoEtapa - Modo de etapa (EEM/EPM/TODOS)
 * @param {Function} esAsignaturaEspecialidad - Función para detectar especialidades
 * @param {Function} detectarEtapa - Función para detectar etapa de un nivel
 * @param {Array} trimestresDisponibles - Lista de trimestres disponibles (para modo TODOS)
 * @returns {Object|null} KPIs globales calculados
 */
export const useKPICalculation = (
  trimestreSeleccionado,
  datosCompletos,
  calcularResultado,
  umbrales,
  modoEtapa,
  esAsignaturaEspecialidad,
  detectarEtapa,
  trimestresDisponibles = []
) => {
  return useMemo(() => {
    if (!trimestreSeleccionado) {
      return null;
    }

    // En modo TODOS, calcular KPIs separados para cada etapa
    if (modoEtapa === 'TODOS') {
      const trimestreBase = getTrimestreBase(trimestreSeleccionado);

      // Encontrar trimestres de EEM y EPM para la misma evaluación
      const trimestreEEM = trimestresDisponibles.find(t => t === `${trimestreBase}-EEM`);
      const trimestreEPM = trimestresDisponibles.find(t => t === `${trimestreBase}-EPM`);

      const kpisEEM = trimestreEEM && datosCompletos[trimestreEEM]
        ? calcularKPIsParaTrimestre(datosCompletos[trimestreEEM], calcularResultado, umbrales, 'EEM', esAsignaturaEspecialidad, detectarEtapa)
        : null;

      const kpisEPM = trimestreEPM && datosCompletos[trimestreEPM]
        ? calcularKPIsParaTrimestre(datosCompletos[trimestreEPM], calcularResultado, umbrales, 'EPM', esAsignaturaEspecialidad, detectarEtapa)
        : null;

      return {
        modoComparativo: true,
        kpisEEM,
        kpisEPM,
        // Para compatibilidad con componentes que no usan modo comparativo
        notaMediaCentro: 0,
        desviacionCentro: 0,
        modaCentro: 0,
        aprobadosCentro: 0,
        suspendidosCentro: 0,
        asignaturasDificiles: (kpisEEM?.asignaturasDificiles || 0) + (kpisEPM?.asignaturasDificiles || 0),
        asignaturasFaciles: (kpisEEM?.asignaturasFaciles || 0) + (kpisEPM?.asignaturasFaciles || 0),
        alumnosPorCurso: [
          ...(kpisEEM?.alumnosPorCurso || []),
          ...(kpisEPM?.alumnosPorCurso || [])
        ]
      };
    }

    // Modo EEM o EPM: comportamiento original
    if (!datosCompletos[trimestreSeleccionado]) {
      return null;
    }

    const datos = datosCompletos[trimestreSeleccionado];
    const global = datos['GLOBAL'];
    if (!global || !global['Total']) {
      return null;
    }

    // Asignaturas de referencia según modo
    const asignaturasReferencia = modoEtapa === 'EPM' ? ['Teórica Troncal'] :
                                   modoEtapa === 'EEM' ? ['Lenguaje Musical'] :
                                   ['Lenguaje Musical', 'Teórica Troncal'];

    // KPI 1: Nota media del centro (GLOBAL/Total)
    const notaMediaCentro = global['Total']?.stats?.notaMedia || 0;

    // KPI 1b: Desviación típica del centro
    const desviacionCentro = global['Total']?.stats?.desviacion || 0;

    // KPI 1c: Moda del centro
    const modaCentro = global['Total']?.stats?.moda || 0;

    // KPI 2: Notas medias de asignaturas de referencia (case-insensitive)
    const notasMediasRef = asignaturasReferencia.map(asigBuscada => {
      const asigEncontrada = Object.keys(global).find(key =>
        normalizar(key) === normalizar(asigBuscada)
      );
      return {
        asignatura: asigBuscada,
        notaMedia: asigEncontrada ? (global[asigEncontrada]?.stats?.notaMedia || 0) : 0,
        aprobados: asigEncontrada ? (global[asigEncontrada]?.stats?.aprobados || 0) : 0,
        suspendidos: asigEncontrada ? (global[asigEncontrada]?.stats?.suspendidos || 0) : 0
      };
    });

    // KPI 3, 4, 5: Estadísticas de Especialidades
    // Buscar Total Especialidad (case-insensitive)
    const totalEspKey = Object.keys(global).find(key =>
      normalizar(key) === 'total especialidad'
    );
    const totalEsp = totalEspKey ? global[totalEspKey] : null;
    let notaMediaEspecialidades, aprobadosEspecialidades, suspendidosEspecialidades;
    let desviacionEspecialidades, modaEspecialidades;

    // Lista de totales a excluir para cálculos de asignaturas individuales
    const totalesExcluir = ['total', 'total especialidad', 'total no especialidad'];

    if (totalEsp && totalEsp.stats) {
      // Usar datos precalculados del CSV
      notaMediaEspecialidades = totalEsp.stats.notaMedia || 0;
      aprobadosEspecialidades = totalEsp.stats.aprobados || 0;
      suspendidosEspecialidades = totalEsp.stats.suspendidos || 0;
      desviacionEspecialidades = totalEsp.stats.desviacion || 0;
      modaEspecialidades = totalEsp.stats.moda || 0;
    } else {
      // Fallback: calcular manualmente (retrocompatibilidad con CSVs antiguos)
      let sumaNotasEsp = 0, sumaPesosEsp = 0;
      let sumaAprobEsp = 0, sumaPesosAprobEsp = 0;
      let sumaSuspEsp = 0, sumaPesosSuspEsp = 0;

      Object.entries(global).forEach(([asig, data]) => {
        if (totalesExcluir.includes(normalizar(asig)) || !data.stats) return;
        if (esAsignaturaEspecialidad(asig, modoEtapa)) {
          const peso = data.stats.registros || 0;
          sumaNotasEsp += (data.stats.notaMedia || 0) * peso;
          sumaPesosEsp += peso;
          sumaAprobEsp += (data.stats.aprobados || 0) * peso;
          sumaPesosAprobEsp += peso;
          sumaSuspEsp += (data.stats.suspendidos || 0) * peso;
          sumaPesosSuspEsp += peso;
        }
      });

      notaMediaEspecialidades = sumaPesosEsp > 0 ? sumaNotasEsp / sumaPesosEsp : 0;
      aprobadosEspecialidades = sumaPesosAprobEsp > 0 ? sumaAprobEsp / sumaPesosAprobEsp : 0;
      suspendidosEspecialidades = sumaPesosSuspEsp > 0 ? sumaSuspEsp / sumaPesosSuspEsp : 0;
      desviacionEspecialidades = 0; // No disponible en fallback
      modaEspecialidades = 0; // No disponible en fallback
    }

    // KPI No Especialidades: Buscar Total No Especialidad (case-insensitive)
    const totalNoEspKey = Object.keys(global).find(key =>
      normalizar(key) === 'total no especialidad'
    );
    const totalNoEsp = totalNoEspKey ? global[totalNoEspKey] : null;
    let notaMediaNoEspecialidades = 0, aprobadosNoEspecialidades = 0, suspendidosNoEspecialidades = 0;
    let desviacionNoEspecialidades = 0, modaNoEspecialidades = 0;

    if (totalNoEsp && totalNoEsp.stats) {
      notaMediaNoEspecialidades = totalNoEsp.stats.notaMedia || 0;
      aprobadosNoEspecialidades = totalNoEsp.stats.aprobados || 0;
      suspendidosNoEspecialidades = totalNoEsp.stats.suspendidos || 0;
      desviacionNoEspecialidades = totalNoEsp.stats.desviacion || 0;
      modaNoEspecialidades = totalNoEsp.stats.moda || 0;
    }

    // KPI 6: Asignaturas difíciles
    let contDificiles = 0, contFaciles = 0, contNeutrales = 0;
    Object.entries(global).forEach(([asig, data]) => {
      if (totalesExcluir.includes(normalizar(asig)) || !data.stats) return;
      if ((data.stats.registros || 0) < umbrales.alumnosMinimo) return;

      const resultado = calcularResultado(data.stats);
      if (resultado === 'DIFÍCIL') contDificiles++;
      else if (resultado === 'FÁCIL') contFaciles++;
      else contNeutrales++;
    });

    // KPI 7: Asignaturas fáciles
    // Ya calculado en contFaciles

    // KPI 8: Total de asignaturas evaluadas
    const totalAsignaturas = contDificiles + contFaciles + contNeutrales;

    // KPI 9: Alumnos por curso (registros de 'Total Especialidad' por cada nivel)
    const alumnosPorCurso = [];
    const niveles = Object.keys(datos).filter(n => n !== 'GLOBAL');

    niveles.forEach(nivel => {
      const nivelData = datos[nivel];
      if (!nivelData) return;
      const totalEspNivelKey = Object.keys(nivelData).find(key =>
        normalizar(key) === 'total especialidad'
      );
      const totalEspNivel = totalEspNivelKey ? nivelData[totalEspNivelKey] : null;
      if (totalEspNivel && totalEspNivel.stats) {
        const etapa = detectarEtapa ? detectarEtapa(nivel) : null;
        alumnosPorCurso.push({
          nivel,
          etapa,
          alumnos: totalEspNivel.stats.registros || 0
        });
      }
    });

    // Ordenar por nivel (1EEM, 2EEM, ..., 1EPM, 2EPM, ...)
    alumnosPorCurso.sort((a, b) => {
      const numA = parseInt(a.nivel.match(/\d+/)?.[0] || '0');
      const numB = parseInt(b.nivel.match(/\d+/)?.[0] || '0');
      if (a.etapa !== b.etapa) {
        return a.etapa === 'EEM' ? -1 : 1;
      }
      return numA - numB;
    });

    // KPI Teórica Troncal (para EPM): buscar en GLOBAL
    let notaMediaTeoricaTroncal = 0, aprobadosTeoricaTroncal = 0, suspendidosTeoricaTroncal = 0;
    let desviacionTeoricaTroncal = 0, modaTeoricaTroncal = 0;

    if (modoEtapa === 'EPM' || modoEtapa === 'TODOS') {
      // Buscar Teórica Troncal (case-insensitive)
      const teoricaTroncalKey = Object.keys(global).find(key =>
        normalizar(key) === 'teórica troncal'
      );

      if (teoricaTroncalKey && global[teoricaTroncalKey]?.stats) {
        const stats = global[teoricaTroncalKey].stats;
        notaMediaTeoricaTroncal = stats.notaMedia || 0;
        aprobadosTeoricaTroncal = stats.aprobados || 0;
        suspendidosTeoricaTroncal = stats.suspendidos || 0;
        desviacionTeoricaTroncal = stats.desviacion || 0;
        modaTeoricaTroncal = stats.moda || 0;
      }
    }

    return {
      // Centro
      notaMediaCentro,
      desviacionCentro,
      modaCentro,
      aprobadosCentro: global['Total']?.stats?.aprobados || 0,
      suspendidosCentro: global['Total']?.stats?.suspendidos || 0,

      // Referencia
      notasMediasRef,

      // Teórica Troncal (EPM)
      notaMediaTeoricaTroncal,
      aprobadosTeoricaTroncal,
      suspendidosTeoricaTroncal,
      desviacionTeoricaTroncal,
      modaTeoricaTroncal,

      // Especialidades
      notaMediaEspecialidades,
      aprobadosEspecialidades,
      suspendidosEspecialidades,
      desviacionEspecialidades,
      modaEspecialidades,

      // No Especialidades
      notaMediaNoEspecialidades,
      aprobadosNoEspecialidades,
      suspendidosNoEspecialidades,
      desviacionNoEspecialidades,
      modaNoEspecialidades,

      // Asignaturas
      asignaturasDificiles: contDificiles,
      asignaturasFaciles: contFaciles,
      asignaturasNeutrales: contNeutrales,
      totalAsignaturas,

      // Alumnos
      alumnosPorCurso
    };
  }, [
    trimestreSeleccionado,
    datosCompletos,
    calcularResultado,
    umbrales,
    modoEtapa,
    esAsignaturaEspecialidad,
    detectarEtapa,
    trimestresDisponibles
  ]);
};
