/* Los datos de asignaturas en crudo, con sus filtros
 *
 * Salió del componente grande el 23/08/2026. Es el mismo JSX, con lo que
 * usaba de fuera convertido en props: si algo se comporta distinto, es un
 * fallo de la extracción, no una mejora.
 */

import React from 'react';
import { normalizar, getBestTrimestre, parseTrimestre, getTrimestreBase, getTrimestreEtapa, tieneAsignatura, perteneceAGrupo } from '../../utils.js';
import { formatearCursoAcademico } from '../../utils/formatters.js';

/* `formatearCursoAcademico` es una función pura y se importa donde se usa.
   `calcularResultado` NO: cierra sobre los umbrales, y el hook del padre se
   los da. Se intentó importarla del núcleo y el resultado fue silencioso y
   caro — la misma asignatura, con los mismos números, pasaba de «FÁCIL» a
   «NEUTRAL», porque la del núcleo pide los umbrales como segundo argumento y
   aquí se la llamaba con uno. No dio ningún error: solo clasificaba distinto.
   Lo cazó comparar la huella de la pantalla antes y después de extraerla. */
export const VistaAsignaturas = ({ agrupacionesCompletas, calcularResultado, datosCompletos, filtroGrupo, filtroNivel, filtroTrimestre, hayVariosCursos, modoEtapa, obtenerGruposDisponibles, rotuloTrimestre, setFiltroGrupo, setFiltroNivel, setFiltroTrimestre, t, trimestresDisponibles }) => (
  <div className="max-w-7xl mx-auto">
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByTrimester')}</label>
          <select
            value={filtroTrimestre}
            onChange={(e) => setFiltroTrimestre(e.target.value)}
            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="ALL">{t('allTrimesters')}</option>
            {trimestresDisponibles
              .filter(t => {
                if (modoEtapa === 'TODOS') return true;
                const parsed = parseTrimestre(t);
                return parsed && parsed.etapa === modoEtapa;
              })
              .map(trim => (
                <option key={trim} value={trim}>{rotuloTrimestre(trim)}</option>
              ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByLevel')}</label>
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="ALL">{t('allLevels')}</option>
            <option value="GLOBAL">{t('global')}</option>
            {['1EEM', '2EEM', '3EEM', '4EEM', '1EPM', '2EPM', '3EPM', '4EPM', '5EPM', '6EPM'].map(nivel => (
              <option key={nivel} value={nivel}>{nivel}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByGroup')}</label>
          <select
            value={filtroGrupo}
            onChange={(e) => setFiltroGrupo(e.target.value)}
            className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white"
            disabled={obtenerGruposDisponibles().length === 0}
          >
            <option value="ALL">{t('allGroups')}</option>
            {obtenerGruposDisponibles().map(grupo => (
              <option key={grupo} value={grupo}>
                {grupo.charAt(0).toUpperCase() + grupo.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de asignaturas */}
      {(() => {
        // Recopilar todas las asignaturas según filtros
        const asignaturas = [];
        const trimestresAFiltrar = filtroTrimestre === 'ALL' ? trimestresDisponibles : [filtroTrimestre];

        trimestresAFiltrar.forEach(trimestre => {
          if (!datosCompletos[trimestre]) return;

          Object.entries(datosCompletos[trimestre]).forEach(([nivel, asigs]) => {
            // Filtrar por nivel si no es ALL
            if (filtroNivel !== 'ALL' && nivel !== filtroNivel) return;
            // Si filtroNivel no es ALL ni GLOBAL, excluir GLOBAL
            if (filtroNivel !== 'ALL' && filtroNivel !== 'GLOBAL' && nivel === 'GLOBAL') return;
            // Si filtroNivel es ALL, excluir GLOBAL (no mezclar agregados con datos por nivel)
            if (filtroNivel === 'ALL' && nivel === 'GLOBAL') return;

            Object.entries(asigs).forEach(([asignatura, data]) => {
              if (asignatura === 'Total' || !data?.stats) return;

              // Filtrar por grupo si no es 'ALL'
              if (filtroGrupo !== 'ALL') {
                const agrupacionesTrimestre = agrupacionesCompletas[trimestre] || {};
                const perteneceAlGrupo = perteneceAGrupo(asignatura, filtroGrupo, agrupacionesTrimestre);
                if (!perteneceAlGrupo) return;
              }

              asignaturas.push({
                trimestre,
                nivel,
                asignatura,
                stats: data.stats,
                resultado: calcularResultado(data.stats)
              });
            });
          });
        });

        const count = asignaturas.length;

        return (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {t('showingSubjects').replace('{count}', count)}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {asignaturas.map((item, idx) => {
                const { trimestre, nivel, asignatura, stats, resultado } = item;

                // Determinar colores según resultado
                let bgColor, borderColor, badgeBg, badgeText;
                if (resultado === 'DIFÍCIL') {
                  bgColor = 'bg-red-50';
                  borderColor = 'border-red-200';
                  badgeBg = 'bg-red-100';
                  badgeText = 'text-red-700';
                } else if (resultado === 'FÁCIL') {
                  bgColor = 'bg-green-50';
                  borderColor = 'border-green-200';
                  badgeBg = 'bg-green-100';
                  badgeText = 'text-green-700';
                } else {
                  bgColor = 'bg-gray-50';
                  borderColor = 'border-gray-200';
                  badgeBg = 'bg-gray-100';
                  badgeText = 'text-gray-700';
                }

                /* El rótulo de la tarjeta. Dos cosas que estaban mal:
                   la rama de GLOBAL imprimía la CLAVE interna del
                   fichero —«1EV-2627-EEM»—, que es un identificador y no
                   un rótulo; y la otra se quedaba solo con la evaluación
                   y tiraba el curso académico, así que con dos años
                   cargados y el filtro en «Todos» salían tarjetas
                   idénticas de cabecera con cifras distintas y sin forma
                   de saber cuál era de qué año. La etapa se conserva
                   solo en GLOBAL: en las demás ya la dice el nivel. */
                const partes = parseTrimestre(trimestre);
                const cursoRot = hayVariosCursos && partes && partes.curso
                  ? `${formatearCursoAcademico(partes.curso)} · ` : '';
                const base = partes ? partes.base : trimestre;
                const etapaRot = nivel === 'GLOBAL' && partes && partes.etapa
                  ? ` (${partes.etapa})` : '';
                const headerText = `${cursoRot}${base}${etapaRot} · ${nivel}`;

                return (
                  <div
                    key={`${trimestre}-${nivel}-${asignatura}-${idx}`}
                    className={`${bgColor} ${borderColor} border rounded-lg p-4 transition-all hover:border-gray-900`}
                  >
                    {/* Header con badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-600 mb-1">{headerText}</div>
                        <h4 className="text-sm font-bold text-gray-900 leading-tight">{asignatura}</h4>
                      </div>
                      <span className={`${badgeBg} ${badgeText} text-xs px-2 py-0.5 rounded font-medium ml-2`}>
                        {t(resultado === 'DIFÍCIL' ? 'difficult' : resultado === 'FÁCIL' ? 'easy' : 'neutral')}
                      </span>
                    </div>

                    {/* Métricas */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">{t('records')}:</span>
                        <span className="text-sm font-semibold text-gray-900">{stats.registros}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">{t('average')}:</span>
                        <span className="text-sm font-semibold text-gray-900">{(stats.notaMedia || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">{t('standardDeviation')}:</span>
                        <span className="text-sm font-semibold text-gray-900">{typeof stats.desviacion === 'number' ? stats.desviacion.toFixed(2) : '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">{t('mode')}:</span>
                        <span className="text-sm font-semibold text-gray-900">{stats.moda || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-green-600">{t('passed')}:</span>
                        <span className="text-sm font-semibold text-green-700">{(stats.aprobados || 0).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-green-600">{t('passedMode')}:</span>
                        <span className="text-sm font-semibold text-green-700">{stats.modaAprobados || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-red-600">{t('failed')}:</span>
                        <span className="text-sm font-semibold text-red-700">{(stats.suspendidos || 0).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-red-600">{t('failedMode')}:</span>
                        <span className="text-sm font-semibold text-red-700">{stats.modaSuspendidos || '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {count === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">{t('noCorrelationData')}</p>
              </div>
            )}
          </>
        );
      })()}
    </div>
  </div>
);

export default VistaAsignaturas;
