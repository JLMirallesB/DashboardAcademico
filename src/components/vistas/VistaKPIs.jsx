/* Los indicadores clave del centro, con sus tres pestañas
 *
 * Salió del componente grande el 23/08/2026, con el resto de las vistas. No
 * es una reescritura: es el mismo JSX, con lo que usaba de fuera convertido en
 * props. Cualquier cambio de comportamiento aquí sería un fallo de la
 * extracción, no una mejora.
 */

import React from 'react';
import KPICentro from '../kpi/KPICentro.jsx';
import KPIDetalle from '../kpi/KPIDetalle.jsx';
import KPIComparativa from '../kpi/KPIComparativa.jsx';

export const VistaKPIs = ({ kpisGlobales, vistaKPI, setVistaKPI, modoEtapa, t }) => (
  <div className="max-w-7xl mx-auto">
    {/* Panel de KPIs Globales con Navegación por Pestañas */}
    {kpisGlobales && (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('kpis')}</h3>
          {/* Navegación por pestañas */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setVistaKPI('centro')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                vistaKPI === 'centro'
                  ? 'bg-white text-gray-900 '
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('center') || 'Centro'}
            </button>
            <button
              onClick={() => setVistaKPI('detalle')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                vistaKPI === 'detalle'
                  ? 'bg-white text-gray-900 '
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('detail') || 'Detalle'}
            </button>
            {/* La pestaña NO desaparece en modo TODOS: se deshabilita y
                dice por qué. Antes se esfumaba —y además el modo la
                apagaba sola si estabas dentro—, así que quien la buscaba
                creía que se la había inventado. */}
            <button
              onClick={() => setVistaKPI('comparativa')}
              disabled={modoEtapa === 'TODOS'}
              title={modoEtapa === 'TODOS' ? t('comparisonNeedsOneStage') : undefined}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                modoEtapa === 'TODOS'
                  ? 'text-gray-400 cursor-not-allowed'
                  : vistaKPI === 'comparativa'
                    ? 'bg-white text-gray-900 '
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('comparison') || 'Comparativa'}
            </button>
          </div>
        </div>

        {/* Renderizar componente según vista seleccionada */}
        {vistaKPI === 'centro' && <KPICentro kpis={kpisGlobales} t={t} modoEtapa={modoEtapa} />}
        {vistaKPI === 'detalle' && <KPIDetalle kpis={kpisGlobales} t={t} modoEtapa={modoEtapa} />}
        {vistaKPI === 'comparativa' && (
          modoEtapa === 'TODOS'
            /* Con las dos etapas cargadas no hay UN centro con el que
               comparar: son dos poblaciones. Se dice, en vez de enseñar
               una tabla de ceros o cambiar de pestaña por su cuenta. */
            ? <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
                {t('comparisonNeedsOneStage')}
              </p>
            : <KPIComparativa kpis={kpisGlobales} t={t} modoEtapa={modoEtapa} />
        )}
      </div>
    )}

    {/* Aquí vivían 173 líneas de una sección de KPIs anterior, envuelta en
        `{false && …}` con el comentario «mantener por compatibilidad con
        el PDF». Nunca se renderizaba, así que el PDF no podía estar
        leyéndola: el informe se genera con jsPDF desde los datos, y lo
        único que captura del DOM son las gráficas, que están en sus
        propias vistas. Código muerto, retirado el 23/08/2026. */}
  </div>
);

export default VistaKPIs;
