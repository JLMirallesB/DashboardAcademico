/**
 * Dashboard Académico - Panel de Umbrales en Sidebar
 * Configuración de umbrales de dificultad
 */

import React, { useState } from 'react';
import { UMBRALES_DEFAULT } from '../../constants';

/**
 * Panel de umbrales colapsable para el sidebar
 * Diseño Minimalista: Inputs con bordes grises, sin colores
 * @param {Object} thresholds - Umbrales actuales
 * @param {Function} onThresholdsChange - Callback al cambiar umbrales
 * @param {boolean} collapsed - Modo colapsado del sidebar
 * @param {Function} t - Función de traducción
 */
export const SidebarThresholds = ({ thresholds, onThresholdsChange, collapsed, t }) => {
  const [expanded, setExpanded] = useState(false);

  // En modo colapsado, mostrar solo icono
  if (collapsed) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex justify-center p-2 rounded-lg text-gray-500 hover:bg-white hover:text-gray-900 transition-colors"
        title={t('configureThresholds')}
        aria-label={t('configureThresholds')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header colapsable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {t('thresholds')}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div className="px-2 py-3 bg-white border border-gray-200 rounded-lg space-y-3">
          {/* Botón restaurar */}
          <button
            onClick={() => onThresholdsChange(UMBRALES_DEFAULT)}
            className="w-full text-[10px] py-1.5 px-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium"
          >
            {t('restoreDefaults')}
          </button>

          {/* Inputs de umbrales */}
          <div className="space-y-2">
            {/* % Suspensos alerta */}
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                {t('failedAlert')}
              </label>
              <input
                type="number"
                value={thresholds.suspensosAlerta}
                onChange={(e) => onThresholdsChange({ ...thresholds, suspensosAlerta: parseFloat(e.target.value) || 0 })}
                className="w-full py-1.5 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:outline-none"
              />
            </div>

            {/* Media crítica */}
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                {t('criticalAvg')}
              </label>
              <input
                type="number"
                step="0.1"
                value={thresholds.mediaCritica}
                onChange={(e) => onThresholdsChange({ ...thresholds, mediaCritica: parseFloat(e.target.value) || 0 })}
                className="w-full py-1.5 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:outline-none"
              />
            </div>

            {/* Media fácil */}
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                {t('easyAvg')}
              </label>
              <input
                type="number"
                step="0.1"
                value={thresholds.mediaFacil}
                onChange={(e) => onThresholdsChange({ ...thresholds, mediaFacil: parseFloat(e.target.value) || 0 })}
                className="w-full py-1.5 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:outline-none"
              />
            </div>

            {/* % Aprobados mínimo */}
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                {t('minPassed')}
              </label>
              <input
                type="number"
                value={thresholds.aprobadosMinimo}
                onChange={(e) => onThresholdsChange({ ...thresholds, aprobadosMinimo: parseFloat(e.target.value) || 0 })}
                className="w-full py-1.5 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:outline-none"
              />
            </div>

            {/* Alumnos mínimos */}
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
                {t('minStudents')}
              </label>
              <input
                type="number"
                value={thresholds.alumnosMinimo}
                onChange={(e) => onThresholdsChange({ ...thresholds, alumnosMinimo: parseInt(e.target.value) || 0 })}
                className="w-full py-1.5 px-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Leyenda */}
          <div className="pt-2 border-t border-gray-200 space-y-1">
            <div className="flex items-center gap-1.5 text-[9px]">
              <span className="px-1.5 py-0.5 bg-gray-900 text-white rounded font-medium">{t('difficult')}</span>
              <span className="text-gray-600">{'>='}{thresholds.suspensosAlerta}% o {'<'}{thresholds.mediaCritica}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px]">
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-900 border border-gray-300 rounded font-medium">{t('easy')}</span>
              <span className="text-gray-600">{'>='}{thresholds.aprobadosMinimo}% o {'>='}{thresholds.mediaFacil}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
