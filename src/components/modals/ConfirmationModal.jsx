/**
 * Dashboard Académico - Modal de Confirmación
 * Modal para confirmar el reemplazo de trimestres ya cargados
 */

import React from 'react';

/**
 * Modal de confirmación para reemplazo de trimestres
 * @param {boolean} isOpen - Si el modal está visible
 * @param {string} trimester - Nombre del trimestre a reemplazar
 * @param {Function} onConfirm - Callback al confirmar
 * @param {Function} onCancel - Callback al cancelar
 * @param {Function} formatTrimester - Función para formatear nombre de trimestre
 * @param {Function} t - Función de traducción
 */
export const ConfirmationModal = ({
  isOpen,
  trimester,
  onConfirm,
  onCancel,
  formatTrimester,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{t('trimesterAlreadyLoaded')}</h3>
        <p className="text-gray-600 mb-6">
          {t('replaceConfirm').replace('{trimester}', trimester ? formatTrimester(trimester) : '')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-6 bg-white border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-6 bg-white border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
          >
            {t('replace')}
          </button>
        </div>
      </div>
    </div>
  );
};
