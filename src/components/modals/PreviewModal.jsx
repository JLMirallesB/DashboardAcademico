/* La vista previa del informe — antes de bajarlo al disco
 *
 * Hasta ahora «Generar PDF» descargaba directamente. Un informe son catorce o
 * veinte páginas y tarda unos segundos en construirse, así que comprobar si
 * has marcado las secciones que querías costaba una descarga; y quien iba
 * probando acababa con seis PDF idénticos en la carpeta.
 *
 * Esto es posible porque el generador acepta `guardar`: la misma costura que
 * permite probarlo en Node sin navegador permite enseñarlo sin escribir en el
 * disco. No es casualidad — es lo que suele pasar cuando se separa «hacer la
 * cosa» de «entregar la cosa».
 */

import React, { useEffect } from 'react';

export const PreviewModal = ({ isOpen, url, nombre, paginas, onClose, onDownload, t }) => {
  /* Escape cierra, como en cualquier visor. */
  useEffect(() => {
    if (!isOpen) return undefined;
    const alPulsar = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [isOpen, onClose]);

  if (!isOpen || !url) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('previewTitle') || 'Vista previa del informe'}
    >
      <div className="bg-white rounded-xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {t('previewTitle') || 'Vista previa del informe'}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {nombre}
              {paginas ? ` · ${paginas} ${t('pages') || 'páginas'}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onDownload}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
            >
              {t('download') || 'Descargar'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('close') || 'Cerrar'}
            </button>
          </div>
        </div>

        {/* El visor del navegador. `title` no es decorativo: sin él, un iframe
            no tiene nombre para quien navega con lector de pantalla. */}
        <iframe
          src={url}
          title={t('previewTitle') || 'Vista previa del informe'}
          className="flex-1 w-full border-0 bg-gray-100"
        />
      </div>
    </div>
  );
};

export default PreviewModal;
