/**
 * Dashboard Académico - Acciones del Sidebar
 * Botones de acción: Gestionar datos, Exportar, Informe, Ayuda
 */

import React from 'react';

// Iconos SVG inline para cada acción
const icons = {
  manageData: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  export: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  report: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  help: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
};

// Configuración de acciones
const actionsList = [
  { id: 'manageData', labelKey: 'manageData', color: 'blue' },
  { id: 'export', labelKey: 'exportJSON', color: 'slate' },
  { id: 'report', labelKey: 'generateReport', color: 'indigo' },
  { id: 'help', labelKey: 'helpButton', color: 'slate' }
];

/**
 * Botones de acción del sidebar
 * @param {Object} actions - Callbacks para cada acción
 * @param {boolean} collapsed - Modo colapsado
 * @param {Function} t - Función de traducción
 */
export const SidebarActions = ({ actions, collapsed, t }) => {
  const handleAction = (actionId) => {
    switch (actionId) {
      case 'manageData':
        actions.onManageData?.();
        break;
      case 'export':
        actions.onExport?.();
        break;
      case 'report':
        actions.onReport?.();
        break;
      case 'help':
        actions.onHelp?.();
        break;
    }
  };

  return (
    <div className="mt-1 space-y-1">
      {actionsList.map(action => {
        const label = t(action.labelKey);

        return (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            className={`
              w-full flex items-center gap-3 px-4 py-3
              transition-colors
              text-gray-700 hover:bg-white hover:text-gray-900
              ${collapsed ? 'justify-center px-2' : ''}
            `}
            title={collapsed ? label : undefined}
            aria-label={label}
          >
            <span className="text-gray-500">
              {icons[action.id]}
            </span>
            {!collapsed && (
              <span className="text-sm font-medium truncate">
                {label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
