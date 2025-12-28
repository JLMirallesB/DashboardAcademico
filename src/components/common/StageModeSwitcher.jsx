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
 * @param {boolean} vertical - Layout vertical para sidebar expandido
 * @param {boolean} compact - Modo compacto para sidebar colapsado
 */
export const StageModeSwitcher = ({
  availableStages,
  currentStage,
  onStageChange,
  t,
  vertical = false,
  compact = false
}) => {
  if (availableStages.length <= 1) return null;

  // Modo compacto: mostrar solo icono con la etapa actual
  if (compact) {
    const nextStage = availableStages[(availableStages.indexOf(currentStage) + 1) % availableStages.length];
    return (
      <button
        onClick={() => onStageChange(nextStage)}
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-gray-300 text-gray-700 hover:border-gray-900 transition-colors"
        title={`${currentStage} - Click para cambiar`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </button>
    );
  }

  // Layout vertical para sidebar
  if (vertical) {
    return (
      <div className="flex flex-col gap-1 bg-white border border-gray-200 rounded-lg p-1">
        {availableStages.map(etapa => (
          <button
            key={etapa}
            onClick={() => onStageChange(etapa)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors text-center ${
              currentStage === etapa ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {etapa === 'TODOS' ? t('allStages') : etapa}
          </button>
        ))}
      </div>
    );
  }

  // Layout horizontal (por defecto)
  return (
    <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
      {availableStages.map(etapa => (
        <button
          key={etapa}
          onClick={() => onStageChange(etapa)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            currentStage === etapa ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {etapa === 'TODOS' ? t('allStages') : t(`${etapa.toLowerCase()}Short`)}
        </button>
      ))}
    </div>
  );
};
