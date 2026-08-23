/* La evolución a lo largo del curso, y entre cursos
 *
 * Salió del componente grande el 23/08/2026. Es el mismo JSX, con lo que
 * usaba de fuera convertido en props: si algo se comporta distinto, es un
 * fallo de la extracción, no una mejora.
 */

import React from 'react';
import { calcularTendencia, detectarEtapa } from '../../nucleo/estadistica.js';
import { serieEvolucionSelecciones, serieEvolucionNiveles, serieEntreCursos } from '../../nucleo/evolucion.js';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import { formatearNombreTrimestre, formatearCursoAcademico, abreviarAsignatura,
         rotularMomento as rotularMomentoComun } from '../../utils/formatters.js';
import { normalizar, getBestTrimestre, parseTrimestre, getTrimestreBase, getTrimestreEtapa, tieneAsignatura, perteneceAGrupo } from '../../utils.js';

/* `calcularTendencia` y `detectarEtapa` se importan del núcleo en vez de
   recibirse: son funciones puras y el hook que las daba solo las reexporta.
   `calcularResultado` y `getTrendInfo` sí siguen siendo props, y no por
   descuido: el primero cierra sobre los umbrales y el segundo sobre el
   idioma, así que dependen del estado de la pantalla. */
export const VistaEvolucion = ({ asignaturasTransversal, datosCompletos, entreCursos, filtroTendenciaMedia, filtroTendenciaSuspensos, getTrendInfo, hayVariosCursos, idioma, modoEtapa, nivelesDisponibles, nivelesSinGlobalEtapa, renderOpcionesAsignaturas, rotuloDeMomento, rotuloTrimestre, seleccionesEvolucion, setAsignaturasTransversal, setEntreCursos, setFiltroTendenciaMedia, setFiltroTendenciaSuspensos, setSeleccionesEvolucion, t, todasLasAsignaturas, trimestreSeleccionado, trimestresDisponibles }) => (
  <div className="max-w-7xl mx-auto">
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('evolutionTitle')}</h3>

      {trimestresDisponibles.length < 2 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">{t('needTwoTrimesters')}</p>
          <p className="text-sm text-gray-400">{t('trimestersLoaded')}: {trimestresDisponibles.join(', ') || 'Ninguno'}</p>
        </div>
      ) : (
        <>
          {/* Selectores independientes para Evolución */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-700">{t('selections')}</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (seleccionesEvolucion.length < 15) {
                      setSeleccionesEvolucion([...seleccionesEvolucion, { nivel: 'GLOBAL', asignatura: 'Total' }]);
                    }
                  }}
                  disabled={seleccionesEvolucion.length >= 15}
                  className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + {t('add')}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {seleccionesEvolucion.map((sel, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-semibold text-gray-600 w-24">{t('selection')} {idx + 1}</span>

                  <select
                    value={sel.nivel}
                    onChange={(e) => {
                      const nuevas = [...seleccionesEvolucion];
                      nuevas[idx].nivel = e.target.value;
                      setSeleccionesEvolucion(nuevas);
                    }}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  >
                    {nivelesDisponibles.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>

                  <select
                    value={sel.asignatura}
                    onChange={(e) => {
                      const nuevas = [...seleccionesEvolucion];
                      nuevas[idx].asignatura = e.target.value;
                      setSeleccionesEvolucion(nuevas);
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  >
                    {renderOpcionesAsignaturas(todasLasAsignaturas)}
                  </select>

                  {seleccionesEvolucion.length > 1 && (
                    <button
                      onClick={() => {
                        setSeleccionesEvolucion(seleccionesEvolucion.filter((_, i) => i !== idx));
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico de evolución de nota media */}
          {(() => {
            // Colores para las diferentes selecciones
            const colores = ['#1a1a2e', '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316', '#a855f7', '#f43f5e', '#84cc16', '#0ea5e9', '#f472b6'];

            // El cálculo vive en `src/nucleo/evolucion.js`
            const entre = entreCursos && hayVariosCursos
              ? serieEntreCursos({ trimestresDisponibles, datosCompletos,
                                   selecciones: seleccionesEvolucion, modoEtapa })
              : null;
            const normal = serieEvolucionSelecciones({
              trimestresDisponibles,
              datosCompletos,
              selecciones: seleccionesEvolucion,
              modoEtapa
            });
            const datosEvolucion = entre ? entre.puntos : normal.puntos;
            const hayDatos = entre ? entre.hayDatos : normal.hayDatos;

            if (!hayDatos) {
              return (
                <p className="text-gray-500 text-center py-8">
                  {t('notEnoughData')}
                </p>
              );
            }

            return (
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-md font-semibold text-gray-700">
                    {entre ? t('evoEntreCursos') : t('averageEvolution')}
                  </h4>
                  {/* El interruptor solo aparece con dos cursos cargados:
                      con uno no hay nada que comparar y sería un control
                      que no hace nada. */}
                  {hayVariosCursos && (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={entreCursos}
                        onChange={(e) => setEntreCursos(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      {t('evoCompararCursos')}
                    </label>
                  )}
                </div>
                {entre && (
                  <p className="mb-3 text-xs text-gray-500 max-w-3xl">{t('evoEntreCursosNota')}</p>
                )}

                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={datosEvolucion}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey={entre ? 'evaluacion' : 'trimestre'}
                      stroke="#64748b"
                      tickFormatter={entre ? undefined : rotuloDeMomento}
                    />
                    <YAxis stroke="#64748b" domain={[0, 10]} />
                    <Tooltip
                      /* El eje ya se formatea, pero el tooltip tenía su
                         propia etiqueta y salía con la clave interna
                         —«2526·2EV»— al pasar el ratón. Se ve solo
                         mirando, que es para lo que hay que mirar. */
                      labelFormatter={entre ? undefined : rotuloDeMomento}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    {entre
                      ? entre.series.map((s2, i) => (
                          <Line
                            key={s2.clave}
                            type="monotone"
                            dataKey={s2.clave}
                            name={`${formatearCursoAcademico(s2.curso)} · ${s2.seleccion.nivel} - ${s2.seleccion.asignatura}`}
                            stroke={colores[i % colores.length]}
                            strokeWidth={3}
                            dot={{ fill: colores[i % colores.length], r: 5 }}
                          />
                        ))
                      : seleccionesEvolucion.map((sel, idx) => (
                          <Line
                            key={idx}
                            type="monotone"
                            dataKey={`notaMedia_${idx}`}
                            name={`${sel.nivel} - ${sel.asignatura}`}
                            stroke={colores[idx % colores.length]}
                            strokeWidth={3}
                            dot={{ fill: colores[idx % colores.length], r: 5 }}
                          />
                        ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </>
      )}

      {/* La mitad de abajo de esta vista NO recorre los momentos: es la foto
    del que está seleccionado. Como la vista entera se declara
    comparativa —la gráfica de arriba sí los recorre—, la cabecera dice
    «varios momentos» y esto quedaba debajo desmintiéndola en silencio.
    Se rotula con el momento del que sale. */}
{/* ANÁLISIS TRANSVERSAL - Todas las Asignaturas */}
      {trimestreSeleccionado && (() => {
        // Obtener todas las asignaturas y calcular sus datos transversales
        const asignaturasConDatos = todasLasAsignaturas.map(asignatura => {
          const datosPorNivel = nivelesSinGlobalEtapa.map(nivel => {
            // En modo TODOS, buscar el trimestre apropiado para cada nivel
            const trimestreParaNivel = modoEtapa === 'TODOS'
              ? getBestTrimestre(trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa)
              : trimestreSeleccionado;

            const datos = datosCompletos[trimestreParaNivel]?.[nivel]?.[asignatura];
            return datos ? {
              nivel,
              notaMedia: datos.stats?.notaMedia || datos.notaMedia,
              suspendidos: datos.stats
                ? (datos.stats.suspendidos)
                : (datos.estadisticas?.alumnos > 0
                    ? (datos.estadisticas.suspendidos / datos.estadisticas.alumnos * 100)
                    : 0)
            } : null;
          }).filter(Boolean);

          if (datosPorNivel.length < 2) return null;

          // Calcular tendencias
          const tendenciaMedia = calcularTendencia(datosPorNivel.map(d => d.notaMedia));
          const tendenciaSuspensos = calcularTendencia(datosPorNivel.map(d => d.suspendidos));

          return {
            asignatura,
            datosPorNivel,
            tendenciaMedia,
            tendenciaSuspensos
          };
        }).filter(Boolean);

        // Filtrar asignaturas según selección
        let asignaturasFiltradas = asignaturasTransversal.length > 0
          ? asignaturasConDatos.filter(item => asignaturasTransversal.includes(item.asignatura))
          : asignaturasConDatos;

        // Filtrar según los tipos de tendencia seleccionados
        let asignaturasConFiltro = asignaturasFiltradas.filter(item => {
          const cumpleFiltroMedia = filtroTendenciaMedia === 'all' || item.tendenciaMedia.tipo === filtroTendenciaMedia;
          const cumpleFiltroSuspensos = filtroTendenciaSuspensos === 'all' || item.tendenciaSuspensos.tipo === filtroTendenciaSuspensos;
          return cumpleFiltroMedia && cumpleFiltroSuspensos;
        });

        return (
          <div className="mt-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('transversalComparison')}{trimestreSeleccionado ? ' · ' + rotuloTrimestre(trimestreSeleccionado) : ''} - {t('allSubjects')}
                </h2>
                <div className="flex items-center gap-4">
                  {/* Filtro por tendencia de nota media */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      {idioma === 'es' ? 'Filtrar nota media:' : 'Filtrar nota mitjana:'}
                    </label>
                    <select
                      value={filtroTendenciaMedia}
                      onChange={(e) => setFiltroTendenciaMedia(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                    >
                      <option value="all">{t('allTrends')}</option>
                      <optgroup label={idioma === 'es' ? 'Tendencias lineales' : 'Tendències lineals'}>
                        <option value="estable">➖ {t('trendEstable')}</option>
                        <option value="creciente_sostenido">↗️ {t('trendCrecienteSostenido')}</option>
                        <option value="decreciente_sostenido">↘️ {t('trendDecrecienteSostenido')}</option>
                      </optgroup>
                      <optgroup label={idioma === 'es' ? 'Con curvatura' : 'Amb curvatura'}>
                        <option value="creciente_acelerado">🚀 {t('trendCrecienteAcelerado')}</option>
                        <option value="creciente_desacelerado">📈 {t('trendCrecienteDesacelerado')}</option>
                        <option value="decreciente_acelerado">📉 {t('trendDecrecienteAcelerado')}</option>
                        <option value="decreciente_desacelerado">⬇️ {t('trendDecrecienteDesacelerado')}</option>
                      </optgroup>
                      <optgroup label={idioma === 'es' ? 'Patrones especiales' : 'Patrons especials'}>
                        <option value="valle">↗️ {t('trendValle')}</option>
                        <option value="pico">⚠️ {t('trendPico')}</option>
                        <option value="oscilante">〰️ {t('trendOscilante')}</option>
                      </optgroup>
                      <optgroup label={idioma === 'es' ? 'Otros' : 'Altres'}>
                        <option value="irregular">❓ {t('trendIrregular')}</option>
                        <option value="insuficiente">📊 {t('trendInsuficiente')}</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Filtro por tendencia de suspensos */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      {idioma === 'es' ? 'Filtrar % suspensos:' : 'Filtrar % suspesos:'}
                    </label>
                    <select
                      value={filtroTendenciaSuspensos}
                      onChange={(e) => setFiltroTendenciaSuspensos(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                    >
                      <option value="all">{t('allTrends')}</option>
                      <optgroup label={idioma === 'es' ? 'Tendencias lineales' : 'Tendències lineals'}>
                        <option value="estable">➖ {t('trendEstable')}</option>
                        <option value="creciente_sostenido">↗️ {t('trendCrecienteSostenido')}</option>
                        <option value="decreciente_sostenido">↘️ {t('trendDecrecienteSostenido')}</option>
                      </optgroup>
                      <optgroup label={idioma === 'es' ? 'Con curvatura' : 'Amb curvatura'}>
                        <option value="creciente_acelerado">🚀 {t('trendCrecienteAcelerado')}</option>
                        <option value="creciente_desacelerado">📈 {t('trendCrecienteDesacelerado')}</option>
                        <option value="decreciente_acelerado">📉 {t('trendDecrecienteAcelerado')}</option>
                        <option value="decreciente_desacelerado">⬇️ {t('trendDecrecienteDesacelerado')}</option>
                      </optgroup>
                      <optgroup label={idioma === 'es' ? 'Patrones especiales' : 'Patrons especials'}>
                        <option value="valle">↗️ {t('trendValle')}</option>
                        <option value="pico">⚠️ {t('trendPico')}</option>
                        <option value="oscilante">〰️ {t('trendOscilante')}</option>
                      </optgroup>
                      <optgroup label={idioma === 'es' ? 'Otros' : 'Altres'}>
                        <option value="irregular">❓ {t('trendIrregular')}</option>
                        <option value="insuficiente">📊 {t('trendInsuficiente')}</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* Selector de asignaturas para filtrar */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {idioma === 'es' ? 'Seleccionar asignaturas a mostrar:' : 'Seleccionar assignatures a mostrar:'}
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setAsignaturasTransversal([])}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      asignaturasTransversal.length === 0
                        ? 'bg-gray-900 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {t('allSubjects')}
                  </button>
                  {todasLasAsignaturas.map(asig => (
                    <button
                      key={asig}
                      onClick={() => {
                        if (asignaturasTransversal.includes(asig)) {
                          setAsignaturasTransversal(asignaturasTransversal.filter(a => a !== asig));
                        } else {
                          setAsignaturasTransversal([...asignaturasTransversal, asig]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        asignaturasTransversal.includes(asig)
                          ? 'bg-gray-900 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {asig}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gráficas de evolución transversal por asignatura */}
            <div className="space-y-8">
              {asignaturasConFiltro.map(({ asignatura, datosPorNivel, tendenciaMedia, tendenciaSuspensos }) => (
                <div key={asignatura} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{asignatura}</h3>
                    <p className="text-sm text-gray-600">
                      {idioma === 'es'
                        ? `Evolución de ${asignatura} a través de los niveles de ${modoEtapa === 'TODOS' ? 'todas las etapas' : modoEtapa}`
                        : `Evolució de ${asignatura} a través dels nivells de ${modoEtapa === 'TODOS' ? 'totes les etapes' : modoEtapa}`
                      }
                    </p>
                  </div>

                  {/* Gráfica de Nota Media */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-700">{t('averageEvolution')}</h4>
                      <span
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${getTrendInfo(tendenciaMedia.tipo).color}`}
                        title={getTrendInfo(tendenciaMedia.tipo).desc}
                      >
                        <span className="text-base">{tendenciaMedia.icono}</span>
                        <span>{getTrendInfo(tendenciaMedia.tipo).label}</span>
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={datosPorNivel} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="nivel"
                          stroke="#64748b"
                          style={{ fontSize: '14px', fontWeight: 500 }}
                        />
                        <YAxis
                          domain={[0, 10]}
                          stroke="#64748b"
                          style={{ fontSize: '14px' }}
                          label={{ value: t('average'), angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '2px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '12px',
                            fontSize: '14px'
                          }}
                          formatter={(value) => [typeof value === 'number' ? value.toFixed(2) : 'N/A', t('average')]}
                          labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="notaMedia"
                          stroke="#1a1a2e"
                          strokeWidth={4}
                          dot={{ fill: '#1a1a2e', r: 6, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Gráfica de % Suspendidos */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-700">{t('failedEvolution')}</h4>
                      {(() => {
                        const infoSuspensos = getTrendInfo(tendenciaSuspensos.tipo);

                        return (
                          <span
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${infoSuspensos.color}`}
                            title={infoSuspensos.desc}
                          >
                            <span className="text-base">{tendenciaSuspensos.icono}</span>
                            <span>{infoSuspensos.label}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={datosPorNivel} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="nivel"
                          stroke="#64748b"
                          style={{ fontSize: '14px', fontWeight: 500 }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="#64748b"
                          style={{ fontSize: '14px' }}
                          label={{ value: '% ' + t('failed'), angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '2px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '12px',
                            fontSize: '14px'
                          }}
                          formatter={(value) => [`${typeof value === 'number' ? value.toFixed(1) : 'N/A'}%`, '% ' + t('failed')]}
                          labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="suspendidos"
                          stroke="#ef4444"
                          strokeWidth={4}
                          dot={{ fill: '#ef4444', r: 6, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  </div>
);

export default VistaEvolucion;
