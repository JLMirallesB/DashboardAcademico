/**
 * Dashboard Académico - Modal de Configuración de Informe
 * Modal para configurar y generar informe PDF
 */

import React from 'react';

/**
 * Modal de configuración de informe PDF
 * @param {boolean} isOpen - Si el modal está visible
 * @param {Function} onClose - Callback al cerrar modal
 * @param {Object} config - Configuración del informe
 * @param {Function} onConfigChange - Callback al cambiar configuración
 * @param {Function} onGeneratePDF - Callback al generar PDF
 * @param {boolean} isGenerating - Si se está generando el PDF
 * @param {Function} t - Función de traducción
 */
export const ReportModal = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
  onGeneratePDF,
  isGenerating,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">{t('reportConfig')}</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Nombre del centro */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('centerName')}
            </label>
            <input
              type="text"
              value={config.nombreCentro}
              onChange={(e) => onConfigChange({ ...config, nombreCentro: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Curso académico */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('academicYear')}
            </label>
            <input
              type="text"
              value={config.cursoAcademico}
              onChange={(e) => onConfigChange({ ...config, cursoAcademico: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Opciones de contenido */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800">Contenido del informe</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.incluirKPIs}
                onChange={(e) => onConfigChange({ ...config, incluirKPIs: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{t('includeKPIs')}</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.incluirDificultad}
                onChange={(e) => onConfigChange({ ...config, incluirDificultad: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{t('includeDifficulty')}</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.incluirCorrelaciones}
                onChange={(e) => onConfigChange({ ...config, incluirCorrelaciones: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{t('includeCorrelations')}</span>
            </label>
          </div>
        </div>

        {/* Botones */}
        <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all font-medium disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onGeneratePDF}
            disabled={isGenerating}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('generating')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('generatePDF')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
