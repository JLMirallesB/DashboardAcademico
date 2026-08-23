/**
 * Dashboard Académico - Header Simplificado
 * Diseño Minimalista: Más limpio y espacioso
 */

import React from 'react';
import { BarraContexto } from './BarraContexto.jsx';

/**
 * Header simplificado
 * @param {string} centerName - Nombre del centro
 * @param {string} academicYear - Curso académico
 * @param {Object} contexto - Qué se está mirando: momento, etapa y si la vista compara
 * @param {Function} onMenuClick - Callback para abrir menú móvil
 * @param {Function} t - Función de traducción
 */
export const Header = ({
  centerName,
  academicYear,
  onMenuClick,
  contexto,
  t
}) => {
  return (
    /* Pegada arriba: es donde vive el contexto —qué evaluación y qué etapa
       estás mirando— y hasta hoy se iba con el scroll. Cuando llevas veinte
       minutos entre gráficas, lo que tienes delante es lo que decide si sabes
       lo que estás viendo. */
    <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
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
              </p>
            )}
          </div>
        </div>

        {/* Lado derecho: QUÉ estoy mirando. Aquí y no en la barra lateral,
            porque esto no es una herramienta: es el contexto de todo lo que se
            ve debajo. Ver components/layout/BarraContexto.jsx. */}
        <div className="flex items-center gap-2">
          {contexto && <BarraContexto {...contexto} t={t} />}
        </div>
      </div>
    </header>
  );
};
