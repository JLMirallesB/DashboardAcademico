/**
 * Dashboard Académico - Sidebar Principal
 * Diseño Minimalista: Monocromo y funcional
 */

import React from 'react';
import { SidebarNav } from './SidebarNav';
import { SidebarThresholds } from './SidebarThresholds';
import { SidebarActions } from './SidebarActions';
import { StageModeSwitcher } from '../common/StageModeSwitcher';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

/**
 * Sidebar principal del Dashboard
 * @param {boolean} collapsed - Si el sidebar está colapsado
 * @param {Function} onToggleCollapse - Callback para toggle
 * @param {string} currentView - Vista activa
 * @param {Function} onViewChange - Callback al cambiar vista
 * @param {string} currentStage - Etapa activa (EEM/EPM/TODOS)
 * @param {Array} availableStages - Etapas disponibles
 * @param {Function} onStageChange - Callback al cambiar etapa
 * @param {Object} thresholds - Umbrales actuales
 * @param {Function} onThresholdsChange - Callback al cambiar umbrales
 * @param {string} language - Idioma actual
 * @param {Function} onLanguageChange - Callback al cambiar idioma
 * @param {Object} actions - Callbacks para acciones
 * @param {Function} t - Función de traducción
 */
export const Sidebar = ({
  collapsed,
  onToggleCollapse,
  currentView,
  onViewChange,
  currentStage,
  availableStages,
  onStageChange,
  thresholds,
  onThresholdsChange,
  language,
  onLanguageChange,
  actions,
  t
}) => {
  return (
    <aside
      className={`
        fixed left-0 top-0 bottom-0 z-30
        bg-gray-50 border-r border-gray-200
        flex flex-col
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* Header del Sidebar */}
      <div className={`
        flex items-center border-b border-gray-200
        ${collapsed ? 'justify-center p-3' : 'justify-between p-4'}
      `}>
        {!collapsed && (
          <span className="text-sm font-bold text-gray-900 tracking-tight truncate">
            Dashboard
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-white transition-colors text-gray-600 hover:text-gray-900"
          aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
          title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {/* Navegación */}
        <div className="px-2 mb-4">
          {!collapsed && (
            <span className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {t('navigation')}
            </span>
          )}
          <SidebarNav
            currentView={currentView}
            onViewChange={onViewChange}
            collapsed={collapsed}
            t={t}
          />
        </div>

        {/* Selector de Etapa */}
        {availableStages.length > 1 && (
          <div className={`px-2 mb-4 ${collapsed ? 'flex justify-center' : ''}`}>
            {!collapsed && (
              <span className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {t('stage')}
              </span>
            )}
            <div className="mt-1">
              <StageModeSwitcher
                availableStages={availableStages}
                currentStage={currentStage}
                onStageChange={onStageChange}
                t={t}
                vertical={!collapsed}
                compact={collapsed}
              />
            </div>
          </div>
        )}

        {/* Umbrales */}
        <div className="px-2 mb-4">
          <SidebarThresholds
            thresholds={thresholds}
            onThresholdsChange={onThresholdsChange}
            collapsed={collapsed}
            t={t}
          />
        </div>

        {/* Idioma */}
        <div className={`px-2 mb-4 ${collapsed ? 'flex justify-center' : ''}`}>
          {!collapsed && (
            <span className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {t('language')}
            </span>
          )}
          <div className="mt-1">
            <LanguageSwitcher
              currentLanguage={language}
              onLanguageChange={onLanguageChange}
              compact={collapsed}
            />
          </div>
        </div>
      </div>

      {/* Acciones (fijas abajo) */}
      <div className="border-t border-gray-200 py-2 px-2">
        {!collapsed && (
          <span className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {t('actions')}
          </span>
        )}
        <SidebarActions
          actions={actions}
          collapsed={collapsed}
          t={t}
        />
      </div>
    </aside>
  );
};
