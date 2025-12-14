/**
 * Dashboard Académico - Navegación de Vistas
 * Componente de pestañas para cambiar entre vistas
 */

import React from 'react';

/**
 * Navegación por pestañas de las diferentes vistas del dashboard
 * @param {string} currentView - Vista actual activa
 * @param {Function} onViewChange - Callback al cambiar de vista
 * @param {Function} t - Función de traducción
 */
export const ViewTabNavigation = ({ currentView, onViewChange, t }) => {
  const views = [
    { id: 'estadisticas', label: t('statistics') },
    { id: 'correlaciones', label: t('correlations') },
    { id: 'evolucion', label: t('evolution') },
    { id: 'dificultad', label: t('difficulty') },
    { id: 'asignaturas', label: t('subjectsData') }
  ];

  return (
    <div className="max-w-7xl mx-auto mb-6">
      <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200 w-fit">
        {views.map(vista => (
          <button
            key={vista.id}
            onClick={() => onViewChange(vista.id)}
            className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              currentView === vista.id
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {vista.label}
          </button>
        ))}
      </div>
    </div>
  );
};
