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
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-2xl text-slate-800 mb-4">{t('trimesterAlreadyLoaded')}</h3>
        <p className="text-slate-600 mb-6">
          {t('replaceConfirm').replace('{trimester}', trimester ? formatTrimester(trimester) : '')}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium"
          >
            {t('replace')}
          </button>
        </div>
      </div>
    </div>
  );
};
