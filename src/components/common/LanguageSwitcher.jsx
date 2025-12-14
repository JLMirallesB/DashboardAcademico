/**
 * Dashboard Académico - Selector de Idioma
 * Componente para cambiar entre Español y Valenciano
 */

import React from 'react';

/**
 * Selector de idioma
 * @param {string} currentLanguage - Idioma actual ('es' o 'va')
 * @param {Function} onLanguageChange - Callback al cambiar idioma
 */
export const LanguageSwitcher = ({ currentLanguage, onLanguageChange }) => {
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
