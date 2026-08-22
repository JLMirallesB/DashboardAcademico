/**
 * Dashboard Académico - Hook de Cálculos Estadísticos
 *
 * El cálculo ya no vive aquí: está en `src/nucleo/estadistica.js`, sin React y
 * ejercitable en node. Este hook solo lo ata a los umbrales y al idioma, que es
 * lo único que de verdad depende del componente.
 */

import { useCallback } from 'react';
import {
  calcularResultado as calcularResultadoNucleo,
  calcularTendencia as calcularTendenciaNucleo,
  detectarEtapa as detectarEtapaNucleo,
  TENDENCIAS,
  claveDeTendencia
} from '../nucleo/estadistica.js';

export const useStatisticalCalculations = (umbrales, t) => {
  const calcularResultado = useCallback(
    (stats) => calcularResultadoNucleo(stats, umbrales),
    [umbrales]
  );

  const calcularTendencia = useCallback(calcularTendenciaNucleo, []);

  /* Lo único que añade la capa de pantalla: el rótulo traducido y el color.
     El patrón —y su prioridad de orden— lo decide el núcleo. */
  const getTrendInfo = useCallback((tipo) => {
    const conocido = TENDENCIAS[tipo] ? tipo : 'insuficiente';
    const info = TENDENCIAS[conocido];
    const clave = claveDeTendencia(conocido);
    return {
      label: t(clave),
      desc: t(clave.replace('trend', 'trendDesc')),
      color: info.color,
      sortPriority: info.prioridad
    };
  }, [t]);

  const detectarEtapa = useCallback(detectarEtapaNucleo, []);

  return { calcularResultado, calcularTendencia, getTrendInfo, detectarEtapa };
};
