/**
 * Dashboard Académico - Navegación del Sidebar
 * Navegación de las 5 vistas principales con iconos
 */

import React from 'react';

// Iconos SVG inline para cada vista
const icons = {
  kpis: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  dispersion: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  ),
  estadisticas: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  correlaciones: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  evolucion: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  dificultad: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  asignaturas: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
};

// Configuración de vistas
const views = [
  { id: 'kpis', labelKey: 'kpisNav' },
  { id: 'dispersion', labelKey: 'dispersionNav' },
  { id: 'estadisticas', labelKey: 'statistics' },
  { id: 'correlaciones', labelKey: 'correlations' },
  { id: 'evolucion', labelKey: 'evolution' },
  { id: 'dificultad', labelKey: 'difficulty' },
  { id: 'asignaturas', labelKey: 'subjectsData' }
];

/**
 * Navegación del sidebar con iconos
 * @param {string} currentView - Vista activa
 * @param {Function} onViewChange - Callback al cambiar vista
 * @param {boolean} collapsed - Modo colapsado (solo iconos)
 * @param {Function} t - Función de traducción
 */
export const SidebarNav = ({ currentView, onViewChange, collapsed, t }) => {
  return (
    <nav className="mt-1 space-y-1">
      {views.map(view => {
        const isActive = currentView === view.id;
        const label = t(view.labelKey);

        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg
              transition-all duration-200
              ${isActive
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? label : undefined}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={isActive ? 'text-white' : 'text-slate-500'}>
              {icons[view.id]}
            </span>
            {!collapsed && (
              <span className="text-sm font-medium truncate">
                {label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
