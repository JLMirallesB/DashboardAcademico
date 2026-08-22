/**
 * Dashboard Académico - Hook de Cálculo de KPIs
 *
 * El cálculo vive en `src/nucleo/kpi.js`. Aquí solo queda la memoización.
 */

import { useMemo } from 'react';
import { calcularKPIsGlobales } from '../nucleo/kpi.js';

export const useKPICalculation = (
  trimestreSeleccionado,
  datosCompletos,
  calcularResultado,   // se conserva en la firma por compatibilidad; el núcleo
                       // aplica los umbrales directamente
  umbrales,
  modoEtapa,
  esAsignaturaEspecialidad,
  detectarEtapa,
  trimestresDisponibles = []
) => {
  return useMemo(
    () => calcularKPIsGlobales({
      trimestreSeleccionado,
      datosCompletos,
      trimestresDisponibles,
      umbrales,
      modoEtapa,
      esAsignaturaEspecialidad
    }),
    [trimestreSeleccionado, datosCompletos, trimestresDisponibles,
     umbrales, modoEtapa, esAsignaturaEspecialidad]
  );
};
