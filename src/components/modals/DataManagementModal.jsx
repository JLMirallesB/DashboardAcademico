/**
 * Dashboard Académico - Modal de Gestión de Datos
 * Modal para gestionar trimestres cargados (ver, seleccionar, eliminar)
 */

import React from 'react';

/**
 * Modal de gestión de datos cargados
 * @param {boolean} isOpen - Si el modal está visible
 * @param {Function} onClose - Callback al cerrar modal
 * @param {Array<string>} availableTrimesters - Lista de trimestres disponibles
 * @param {string} selectedTrimester - Trimestre actualmente seleccionado
 * @param {Object} completeData - Datos completos de todos los trimestres
 * @param {Object} fileInputRef - Ref del input de archivo CSV
 * @param {Object} jsonInputRef - Ref del input de archivo JSON
 * @param {Function} onTrimesterSelect - Callback al seleccionar un trimestre
 * @param {Function} onTrimesterDelete - Callback al eliminar un trimestre
 * @param {Function} parseTrimester - Función para parsear nombre de trimestre
 * @param {Function} formatTrimester - Función para formatear nombre de trimestre
 * @param {Function} t - Función de traducción
 */
export const DataManagementModal = ({
  isOpen,
  onClose,
  availableTrimesters,
  selectedTrimester,
  completeData,
  fileInputRef,
  jsonInputRef,
  onTrimesterSelect,
  onTrimesterDelete,
  parseTrimester,
  formatTrimester,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">{t('loadedData')}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Botones de acción */}
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 min-w-[200px] py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('loadCSV')}
            </button>
            <button
              onClick={() => jsonInputRef.current?.click()}
              className="flex-1 min-w-[200px] py-3 px-4 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t('importJSON')}
            </button>
          </div>

          {/* Lista de datos cargados */}
          {availableTrimesters.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-lg text-slate-500 mb-2">{t('noDataYet')}</p>
              <p className="text-sm text-slate-400">{t('loadFirstDataset')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableTrimesters.map(trim => {
                const parsed = parseTrimester(trim);
                const etapa = parsed?.etapa;
                const nivelCount = Object.keys(completeData[trim] || {}).filter(n => n !== 'GLOBAL').length;

                return (
                  <div
                    key={trim}
                    className={`border-2 rounded-xl p-4 transition-all ${
                      trim === selectedTrimester
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">
                          {formatTrimester(trim)}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {etapa && (
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              etapa === 'EEM' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {etapa === 'EEM' ? t('elementaryStage') : t('professionalStage')}
                            </span>
                          )}
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold">
                            {nivelCount} {nivelCount === 1 ? 'nivel' : 'niveles'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onTrimesterDelete(trim)}
                        className="ml-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title={t('delete')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {trim !== selectedTrimester && (
                      <button
                        onClick={() => {
                          onTrimesterSelect(trim);
                          onClose();
                        }}
                        className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all"
                      >
                        Seleccionar
                      </button>
                    )}
                    {trim === selectedTrimester && (
                      <div className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium text-center">
                        ✓ Actualmente seleccionado
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
