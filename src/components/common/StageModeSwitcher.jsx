/**
 * Dashboard Académico - Selector de Modo de Etapa
 * Componente para cambiar entre EEM, EPM y TODOS
 */

import React from 'react';

/**
 * Selector de modo de etapa educativa
 * @param {Array<string>} availableStages - Etapas disponibles (ej: ['EEM', 'EPM', 'TODOS'])
 * @param {string} currentStage - Etapa actual
 * @param {Function} onStageChange - Callback al cambiar etapa
 * @param {Function} t - Función de traducción
 */
export const StageModeSwitcher = ({
  availableStages,
  currentStage,
  onStageChange,
  t
}) => {
  if (availableStages.length <= 1) return null;

  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
      {availableStages.map(etapa => (
        <button
          key={etapa}
          onClick={() => onStageChange(etapa)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
            currentStage === etapa ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {etapa === 'TODOS' ? t('allStages') : t(`${etapa.toLowerCase()}Short`)}
        </button>
      ))}
    </div>
  );
};
