/**
 * Dashboard Académico - Modal de Configuración de Informe
 * Modal para configurar y generar informe PDF con múltiples secciones
 */

import React from 'react';

/**
 * Checkbox con etiqueta estilizada
 */
const CheckboxOption = ({ checked, onChange, label, disabled = false }) => (
  <label className={`flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    />
    <span className="text-sm text-slate-700">{label}</span>
  </label>
);

/**
 * Modal de configuración de informe PDF
 * @param {boolean} isOpen - Si el modal está visible
 * @param {Function} onClose - Callback al cerrar modal
 * @param {Object} config - Configuración del informe
 * @param {Function} onConfigChange - Callback al cambiar configuración
 * @param {Function} onGeneratePDF - Callback al generar PDF
 * @param {boolean} isGenerating - Si se está generando el PDF
 * @param {string} progressMessage - Mensaje de progreso durante generación
 * @param {Array} agrupacionesDisponibles - Lista de agrupaciones disponibles para filtrar
 * @param {number} trimestresCount - Número de trimestres cargados (para habilitar/deshabilitar evolución)
 * @param {Function} t - Función de traducción
 */
export const ReportModal = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
  onGeneratePDF,
  isGenerating,
  progressMessage = '',
  agrupacionesDisponibles = [],
  trimestresCount = 1,
  t
}) => {
  if (!isOpen) return null;

  // Helper para actualizar config
  const updateConfig = (key, value) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">{t('reportConfig')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('reportConfigDesc') || 'Configura el contenido del informe PDF'}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Datos del centro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('centerName')}
              </label>
              <input
                type="text"
                value={config.nombreCentro}
                onChange={(e) => updateConfig('nombreCentro', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('centerNamePlaceholder') || 'Nombre del conservatorio'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('academicYear')}
              </label>
              <input
                type="text"
                value={config.cursoAcademico}
                onChange={(e) => updateConfig('cursoAcademico', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="2024-2025"
              />
            </div>
          </div>

          {/* Secciones del informe */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('reportSections') || 'Secciones del informe'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 rounded-xl p-4">
              {/* Columna 1 */}
              <div className="space-y-1">
                <CheckboxOption
                  checked={config.incluirPortada !== false}
                  onChange={(e) => updateConfig('incluirPortada', e.target.checked)}
                  label={t('includeCover') || 'Portada'}
                />
                <CheckboxOption
                  checked={config.incluirAnalisisGlobal !== false}
                  onChange={(e) => updateConfig('incluirAnalisisGlobal', e.target.checked)}
                  label={t('includeGlobalAnalysis') || 'Análisis global de centro'}
                />
                <CheckboxOption
                  checked={config.incluirKPIs !== false}
                  onChange={(e) => updateConfig('incluirKPIs', e.target.checked)}
                  label={t('includeKPIs') || 'KPIs de centro'}
                />
                <CheckboxOption
                  checked={config.incluirMapaDispersion !== false}
                  onChange={(e) => updateConfig('incluirMapaDispersion', e.target.checked)}
                  label={t('includeScatterMap') || 'Mapa de dispersión'}
                />
              </div>

              {/* Columna 2 */}
              <div className="space-y-1">
                <CheckboxOption
                  checked={config.incluirEvolucionCorrelaciones !== false}
                  onChange={(e) => updateConfig('incluirEvolucionCorrelaciones', e.target.checked)}
                  label={t('includeCorrelationEvolution') || 'Evolución de correlaciones'}
                />
                <CheckboxOption
                  checked={config.incluirCorrelaciones !== false}
                  onChange={(e) => updateConfig('incluirCorrelaciones', e.target.checked)}
                  label={t('includeCorrelations') || 'Correlaciones (detalle)'}
                />
                <CheckboxOption
                  checked={config.incluirComparativaTransversal !== false}
                  onChange={(e) => updateConfig('incluirComparativaTransversal', e.target.checked)}
                  label={t('includeTransversalComparison') || 'Comparativa transversal'}
                />
                <CheckboxOption
                  checked={config.incluirDatosAsignaturas !== false}
                  onChange={(e) => updateConfig('incluirDatosAsignaturas', e.target.checked)}
                  label={t('includeSubjectData') || 'Datos de asignaturas'}
                />
              </div>
            </div>
          </div>

          {/* Análisis de dificultad (solo si datos de asignaturas está activo) */}
          {config.incluirDatosAsignaturas !== false && (
            <div className="pl-4 border-l-2 border-blue-200">
              <CheckboxOption
                checked={config.incluirDificultad !== false}
                onChange={(e) => updateConfig('incluirDificultad', e.target.checked)}
                label={t('includeDifficulty') || 'Incluir análisis de dificultad detallado'}
              />
            </div>
          )}

          {/* Análisis adicionales */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Análisis adicionales
            </h3>

            <div className="bg-emerald-50 rounded-xl p-4 space-y-1">
              <CheckboxOption
                checked={config.incluirAnalisisTendencias !== false}
                onChange={(e) => updateConfig('incluirAnalisisTendencias', e.target.checked)}
                label={t('includeTrendAnalysis') || 'Análisis de tendencias'}
              />
              <div className="flex items-center gap-2">
                <CheckboxOption
                  checked={config.incluirEvolucionNotas !== false && trimestresCount >= 2}
                  onChange={(e) => updateConfig('incluirEvolucionNotas', e.target.checked)}
                  disabled={trimestresCount < 2}
                  label={t('includeGradeEvolution') || 'Evolución de notas medias'}
                />
                {trimestresCount < 2 && (
                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    {t('requiresMultipleTrm') || 'Requiere 2+ trimestres'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Filtro por agrupaciones */}
          {agrupacionesDisponibles.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {t('filterByGroups') || 'Filtrar por agrupaciones'}
              </h3>

              <div className="bg-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={config.filtroAgrupaciones == null}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Volver a "todas" - null significa sin filtro (incluir todo)
                        updateConfig('filtroAgrupaciones', null);
                      } else {
                        // Desmarcar "Todas" - array vacío habilita selección individual
                        updateConfig('filtroAgrupaciones', []);
                      }
                    }}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-purple-800">
                    {t('allGroups') || 'Todas las agrupaciones'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-4 border-l-2 border-purple-200">
                  {agrupacionesDisponibles.map((grupo) => (
                    <label key={grupo} className={`flex items-center gap-2 p-1.5 rounded transition-colors ${config.filtroAgrupaciones == null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-purple-100'}`}>
                      <input
                        type="checkbox"
                        checked={config.filtroAgrupaciones?.includes(grupo) || false}
                        onChange={(e) => {
                          const currentFilters = config.filtroAgrupaciones || [];
                          if (e.target.checked) {
                            updateConfig('filtroAgrupaciones', [...currentFilters, grupo]);
                          } else {
                            updateConfig('filtroAgrupaciones', currentFilters.filter(g => g !== grupo));
                          }
                        }}
                        disabled={config.filtroAgrupaciones == null}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                      />
                      <span className={`text-sm ${config.filtroAgrupaciones == null ? 'text-purple-400' : 'text-purple-700'}`}>
                        {grupo}
                      </span>
                    </label>
                  ))}
                </div>

                <p className="text-xs text-purple-600 mt-3">
                  {t('groupFilterInfo') || 'Selecciona agrupaciones específicas o deja "Todas" para incluir todo.'}
                </p>
              </div>
            </div>
          )}

          {/* Información sobre orientación */}
          <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-800 font-medium">
                {t('landscapeInfo') || 'Formato horizontal'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {t('landscapeInfoDesc') || 'El informe se generará en formato horizontal (A4 apaisado) para mejor visualización de gráficas.'}
              </p>
            </div>
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
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 flex items-center gap-2 min-w-[180px] justify-center"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">{progressMessage || t('generating')}</span>
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

export default ReportModal;
