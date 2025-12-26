/**
 * Dashboard Académico - Header Simplificado
 * Solo muestra título, metadata del centro y botón de menú móvil
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
    <header className="bg-white border-b border-slate-200 px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between">
        {/* Lado izquierdo: Menú móvil + Título */}
        <div className="flex items-center gap-3">
          {/* Botón menú móvil */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label={t('openMenu')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Título y metadata */}
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              Dashboard Académico
            </h1>
            {(centerName || academicYear) && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {centerName && <span>{centerName}</span>}
                {centerName && academicYear && <span className="text-slate-300">|</span>}
                {academicYear && <span>{academicYear}</span>}
                {currentTrimester && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="font-medium text-slate-600">{currentTrimester}</span>
                  </>
                )}
              </div>
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
