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
 * @returns {Object|null} KPIs globales calculados
 */
export const useKPICalculation = (
  trimestreSeleccionado,
  datosCompletos,
  calcularResultado,
  umbrales,
  modoEtapa,
  esAsignaturaEspecialidad
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

    // KPI 3: Nota media de Especialidades
    let sumaNotasEsp = 0, sumaPesosEsp = 0;
    Object.entries(global).forEach(([asig, data]) => {
      if (asig === 'Todos' || !data.stats) return;
      if (esAsignaturaEspecialidad(asig, modoEtapa)) {
        const peso = data.stats.registros || 0;
        sumaNotasEsp += (data.stats.notaMedia || 0) * peso;
        sumaPesosEsp += peso;
      }
    });
    const notaMediaEspecialidades = sumaPesosEsp > 0 ? sumaNotasEsp / sumaPesosEsp : 0;

    // KPI 4: % Aprobados en Especialidades
    let sumaAprobEsp = 0, sumaPesosAprobEsp = 0;
    Object.entries(global).forEach(([asig, data]) => {
      if (asig === 'Todos' || !data.stats) return;
      if (esAsignaturaEspecialidad(asig, modoEtapa)) {
        const peso = data.stats.registros || 0;
        sumaAprobEsp += (data.stats.aprobados || 0) * peso;
        sumaPesosAprobEsp += peso;
      }
    });
    const aprobadosEspecialidades = sumaPesosAprobEsp > 0 ? sumaAprobEsp / sumaPesosAprobEsp : 0;

    // KPI 5: % Suspensos en Especialidades
    let sumaSuspEsp = 0, sumaPesosSuspEsp = 0;
    Object.entries(global).forEach(([asig, data]) => {
      if (asig === 'Todos' || !data.stats) return;
      if (esAsignaturaEspecialidad(asig, modoEtapa)) {
        const peso = data.stats.registros || 0;
        sumaSuspEsp += (data.stats.suspendidos || 0) * peso;
        sumaPesosSuspEsp += peso;
      }
    });
    const suspendidosEspecialidades = sumaPesosSuspEsp > 0 ? sumaSuspEsp / sumaPesosSuspEsp : 0;

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

    return {
      notaMediaCentro,
      notasMediasRef,
      notaMediaEspecialidades,
      aprobadosEspecialidades,
      suspendidosEspecialidades,
      asignaturasDificiles: contDificiles,
      asignaturasFaciles: contFaciles,
      asignaturasNeutrales: contNeutrales,
      totalAsignaturas
    };
  }, [
    trimestreSeleccionado,
    datosCompletos,
    calcularResultado,
    umbrales,
    modoEtapa,
    esAsignaturaEspecialidad
  ]);
};
