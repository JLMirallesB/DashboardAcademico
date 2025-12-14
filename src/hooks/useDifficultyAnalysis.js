/**
 * Dashboard Académico - Hook de Análisis de Dificultad
 * Analiza y categoriza asignaturas por dificultad
 */

import { useMemo } from 'react';

/**
 * Hook para análisis de dificultad de asignaturas
 * @param {string} trimestreSeleccionado - Trimestre actual
 * @param {Object} datosCompletos - Datos completos del dashboard
 * @param {Function} calcularResultado - Función para calcular resultado (FÁCIL/DIFÍCIL)
 * @param {Object} umbrales - Umbrales configurables
 * @param {string} vistaDificultad - Tipo de vista ('niveles' o 'global')
 * @param {string} modoEtapa - Modo de etapa (EEM/EPM/TODOS)
 * @param {Function} detectarEtapa - Función para detectar etapa de un nivel
 * @returns {Object} Análisis de dificultad categorizado
 */
export const useDifficultyAnalysis = (
  trimestreSeleccionado,
  datosCompletos,
  calcularResultado,
  umbrales,
  vistaDificultad,
  modoEtapa,
  detectarEtapa
) => {
  return useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) {
      return { dificiles: [], neutrales: [], faciles: [], todas: [] };
    }

    const datos = datosCompletos[trimestreSeleccionado];
    const asignaturas = [];

    if (vistaDificultad === 'niveles') {
      // Vista por niveles: analizar cada nivel por separado
      Object.entries(datos).forEach(([nivel, asigs]) => {
        if (nivel === 'GLOBAL') return;

        // Filtrar por modo etapa
        if (modoEtapa !== 'TODOS' && detectarEtapa(nivel) !== modoEtapa) return;

        Object.entries(asigs).forEach(([nombreAsig, data]) => {
          if (!data.stats || data.stats.registros < umbrales.alumnosMinimo) return;

          const resultado = calcularResultado(data.stats);
          const razones = [];

          if (data.stats.suspendidos >= umbrales.suspensosAlerta) {
            razones.push(`${data.stats.suspendidos.toFixed(1)}% suspensos`);
          }
          if (data.stats.notaMedia < umbrales.mediaCritica) {
            razones.push(`Media ${data.stats.notaMedia.toFixed(2)}`);
          }
          if (data.stats.aprobados >= umbrales.aprobadosMinimo) {
            razones.push(`${data.stats.aprobados.toFixed(1)}% aprobados`);
          }
          if (data.stats.notaMedia >= umbrales.mediaFacil) {
            razones.push(`Media ${data.stats.notaMedia.toFixed(2)}`);
          }

          asignaturas.push({
            nivel,
            asignatura: nombreAsig,
            notaMedia: data.stats.notaMedia,
            suspendidos: data.stats.suspendidos,
            aprobados: data.stats.aprobados,
            registros: data.stats.registros,
            resultado,
            razones: razones.join(', ')
          });
        });
      });
    } else {
      // Vista global: usar datos agregados de GLOBAL
      const global = datos['GLOBAL'];
      if (!global) return { dificiles: [], neutrales: [], faciles: [], todas: [] };

      Object.entries(global).forEach(([nombreAsig, data]) => {
        if (nombreAsig === 'Todos') return;
        if (!data.stats || data.stats.registros < umbrales.alumnosMinimo) return;

        const resultado = calcularResultado(data.stats);
        const razones = [];

        if (data.stats.suspendidos >= umbrales.suspensosAlerta) {
          razones.push(`${data.stats.suspendidos.toFixed(1)}% suspensos`);
        }
        if (data.stats.notaMedia < umbrales.mediaCritica) {
          razones.push(`Media ${data.stats.notaMedia.toFixed(2)}`);
        }
        if (data.stats.aprobados >= umbrales.aprobadosMinimo) {
          razones.push(`${data.stats.aprobados.toFixed(1)}% aprobados`);
        }
        if (data.stats.notaMedia >= umbrales.mediaFacil) {
          razones.push(`Media ${data.stats.notaMedia.toFixed(2)}`);
        }

        asignaturas.push({
          nivel: 'GLOBAL',
          asignatura: nombreAsig,
          notaMedia: data.stats.notaMedia,
          suspendidos: data.stats.suspendidos,
          aprobados: data.stats.aprobados,
          registros: data.stats.registros,
          resultado,
          razones: razones.join(', ')
        });
      });
    }

    // Categorizar por dificultad
    const dificiles = asignaturas.filter(a => a.resultado === 'DIFÍCIL')
      .sort((a, b) => b.suspendidos - a.suspendidos);

    const faciles = asignaturas.filter(a => a.resultado === 'FÁCIL')
      .sort((a, b) => b.aprobados - a.aprobados);

    const neutrales = asignaturas.filter(a => !a.resultado)
      .sort((a, b) => a.notaMedia - b.notaMedia);

    return {
      dificiles,
      neutrales,
      faciles,
      todas: asignaturas
    };
  }, [
    trimestreSeleccionado,
    datosCompletos,
    calcularResultado,
    umbrales,
    vistaDificultad,
    modoEtapa,
    detectarEtapa
  ]);
};
