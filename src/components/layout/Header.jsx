/**
 * Dashboard Académico - Header Simplificado
 * Diseño Minimalista: Más limpio y espacioso
 */

import React from 'react';

/**
 * Header simplificado
 * @param {string} centerName - Nombre del centro
 * @param {string} academicYear - Curso académico
 * @param {string} currentTrimester - Trimestre seleccionado
 * @param {Function} onMenuClick - Callback para abrir menú móvil
 * @param {Function} t - Función de traducción
 */
export const Header = ({
  centerName,
  academicYear,
  currentTrimester,
  onMenuClick,
  t
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-5">
      <div className="flex items-center justify-between">
        {/* Lado izquierdo: Menú móvil + Título */}
        <div className="flex items-center gap-4">
          {/* Botón menú móvil */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
            aria-label={t('openMenu')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Título y metadata */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Dashboard Académico
            </h1>
            {(centerName || academicYear) && (
              <p className="text-sm text-gray-600 mt-1">
                {centerName && <span>{centerName}</span>}
                {centerName && academicYear && <span className="text-gray-400 mx-2">|</span>}
                {academicYear && <span>{academicYear}</span>}
                {currentTrimester && (
                  <>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="font-medium text-gray-900">{currentTrimester}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Lado derecho: Espacio para elementos opcionales futuros */}
        <div className="flex items-center gap-2">
          {/* Placeholder para notificaciones, usuario, etc. */}
        </div>
      </div>
    </header>
  );
};
