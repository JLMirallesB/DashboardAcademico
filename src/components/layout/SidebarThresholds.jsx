/**
 * Dashboard Académico - Panel de Umbrales en Sidebar
 * Configuración de umbrales de dificultad
 */

import React, { useState } from 'react';
import { UMBRALES_DEFAULT } from '../../constants';

/**
 * Panel de umbrales colapsable para el sidebar
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
        className="w-full flex justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
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
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {t('thresholds')}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Contenido expandido */}
      {expanded && (
        <div className="px-2 py-2 bg-slate-50 rounded-lg space-y-3">
          {/* Botón restaurar */}
          <button
            onClick={() => onThresholdsChange(UMBRALES_DEFAULT)}
            className="w-full text-[10px] py-1 px-2 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
          >
            {t('restoreDefaults')}
          </button>

          {/* Inputs de umbrales */}
          <div className="space-y-2">
            {/* % Suspensos alerta */}
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                {t('failedAlert')}
              </label>
              <input
                type="number"
                value={thresholds.suspensosAlerta}
                onChange={(e) => onThresholdsChange({ ...thresholds, suspensosAlerta: parseFloat(e.target.value) || 0 })}
                className="w-full py-1 px-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Media crítica */}
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                {t('criticalAvg')}
              </label>
              <input
                type="number"
                step="0.1"
                value={thresholds.mediaCritica}
                onChange={(e) => onThresholdsChange({ ...thresholds, mediaCritica: parseFloat(e.target.value) || 0 })}
                className="w-full py-1 px-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Media fácil */}
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                {t('easyAvg')}
              </label>
              <input
                type="number"
                step="0.1"
                value={thresholds.mediaFacil}
                onChange={(e) => onThresholdsChange({ ...thresholds, mediaFacil: parseFloat(e.target.value) || 0 })}
                className="w-full py-1 px-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* % Aprobados mínimo */}
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                {t('minPassed')}
              </label>
              <input
                type="number"
                value={thresholds.aprobadosMinimo}
                onChange={(e) => onThresholdsChange({ ...thresholds, aprobadosMinimo: parseFloat(e.target.value) || 0 })}
                className="w-full py-1 px-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Alumnos mínimos */}
            <div>
              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                {t('minStudents')}
              </label>
              <input
                type="number"
                value={thresholds.alumnosMinimo}
                onChange={(e) => onThresholdsChange({ ...thresholds, alumnosMinimo: parseInt(e.target.value) || 0 })}
                className="w-full py-1 px-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Leyenda */}
          <div className="pt-2 border-t border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 text-[9px]">
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">{t('difficult')}</span>
              <span className="text-slate-500">{'>='}{thresholds.suspensosAlerta}% o {'<'}{thresholds.mediaCritica}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px]">
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{t('easy')}</span>
              <span className="text-slate-500">{'>='}{thresholds.aprobadosMinimo}% o {'>='}{thresholds.mediaFacil}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
