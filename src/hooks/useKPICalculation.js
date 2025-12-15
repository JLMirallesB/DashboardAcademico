/**
 * Dashboard Académico - Hook de Cálculo de KPIs
 * Calcula los 8 KPIs globales del centro educativo
 */

import { useMemo } from 'react';
import { normalizar } from '../utils.js';

/**
 * Hook para calcular KPIs globales del centro
 * @param {string} trimestreSeleccionado - Trimestre actual
 * @param {Object} datosCompletos - Datos completos del dashboard
 * @param {Function} calcularResultado - Función para calcular resultado
 * @param {Object} umbrales - Umbrales configurables
 * @param {string} modoEtapa - Modo de etapa (EEM/EPM/TODOS)
 * @param {Function} esAsignaturaEspecialidad - Función para detectar especialidades
 * @param {Function} detectarEtapa - Función para detectar etapa de un nivel
 * @returns {Object|null} KPIs globales calculados
 */
export const useKPICalculation = (
  trimestreSeleccionado,
  datosCompletos,
  calcularResultado,
  umbrales,
  modoEtapa,
  esAsignaturaEspecialidad,
  detectarEtapa
) => {
  return useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) {
      return null;
    }

    const datos = datosCompletos[trimestreSeleccionado];
    const global = datos['GLOBAL'];
    if (!global || !global['Todos']) {
      return null;
    }

    // Asignaturas de referencia según modo
    const asignaturasReferencia = modoEtapa === 'EPM' ? ['Teórica Troncal'] :
                                   modoEtapa === 'EEM' ? ['Lenguaje Musical'] :
                                   ['Lenguaje Musical', 'Teórica Troncal'];

    // KPI 1: Nota media del centro (GLOBAL/Todos)
    const notaMediaCentro = global['Todos']?.stats?.notaMedia || 0;

    // KPI 1b: Desviación típica del centro
    const desviacionCentro = global['Todos']?.stats?.desviacion || 0;

    // KPI 1c: Moda del centro
    const modaCentro = global['Todos']?.stats?.moda || 0;

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
    // Primero intentar leer de 'Total Especialidad' (viene del CSV)
    const totalEsp = global['Total Especialidad'];
    let notaMediaEspecialidades, aprobadosEspecialidades, suspendidosEspecialidades;
    let desviacionEspecialidades, modaEspecialidades;

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
        if (asig === 'Todos' || !data.stats) return;
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

    // KPI No Especialidades: Leer de 'Total no Especialidad' (viene del CSV)
    const totalNoEsp = global['Total no Especialidad'];
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
      if (asig === 'Todos' || !data.stats) return;
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
      const totalEspNivel = datos[nivel]?.['Total Especialidad'];
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

    return {
      // Centro
      notaMediaCentro,
      desviacionCentro,
      modaCentro,
      aprobadosCentro: global['Todos']?.stats?.aprobados || 0,
      suspendidosCentro: global['Todos']?.stats?.suspendidos || 0,

      // Referencia
      notasMediasRef,

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
    detectarEtapa
  ]);
};
