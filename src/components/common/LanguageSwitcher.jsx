/**
 * Dashboard Académico - Selector de Idioma
 * Componente para cambiar entre Español y Valenciano
 */

import React from 'react';

/**
 * Selector de idioma
 * @param {string} currentLanguage - Idioma actual ('es' o 'va')
 * @param {Function} onLanguageChange - Callback al cambiar idioma
 * @param {boolean} compact - Modo compacto para sidebar colapsado
 */
export const LanguageSwitcher = ({ currentLanguage, onLanguageChange, compact = false }) => {
  // Modo compacto: mostrar solo el idioma actual con toggle
  if (compact) {
    return (
      <button
        onClick={() => onLanguageChange(currentLanguage === 'es' ? 'va' : 'es')}
        className="px-2 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        title={currentLanguage === 'es' ? 'Cambiar a Valencià' : 'Canviar a Español'}
      >
        {currentLanguage.toUpperCase()}
      </button>
    );
  }

  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
      <button
        onClick={() => onLanguageChange('es')}
        className={`px-2 py-1 text-xs font-medium rounded transition-all ${
          currentLanguage === 'es' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        ES
      </button>
      <button
        onClick={() => onLanguageChange('va')}
        className={`px-2 py-1 text-xs font-medium rounded transition-all ${
          currentLanguage === 'va' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        VA
      </button>
    </div>
  );
};
