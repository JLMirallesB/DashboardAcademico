/* La comparación que se compone a mano, con su distribución y su mapa de calor
 *
 * Salió del componente grande el 23/08/2026. Es el mismo JSX, con lo que
 * usaba de fuera convertido en props: si algo se comporta distinto, es un
 * fallo de la extracción, no una mejora.
 */

import React from 'react';
import { calcularTendencia, detectarEtapa } from '../../nucleo/estadistica.js';
import { compararTrimestres, esAgregado, mismoMomento, cursosDe,
         momentosDe, esDelMomento, parseTrimestre as parseClave } from '../../nucleo/texto.js';
import { diferencia, decimalesDe } from '../../nucleo/comparacion.js';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import { normalizar, getBestTrimestre, parseTrimestre, getTrimestreBase, getTrimestreEtapa, tieneAsignatura, perteneceAGrupo } from '../../utils.js';

/* `calcularTendencia` y `detectarEtapa` se importan del núcleo en vez de
   recibirse: son funciones puras y el hook que las daba solo las reexporta.
   `calcularResultado` y `getTrendInfo` sí siguen siendo props, y no por
   descuido: el primero cierra sobre los umbrales y el segundo sobre el
   idioma, así que dependen del estado de la pantalla. */
export const VistaEstadisticas = ({ activarCompararNiveles, actualizarSeleccion, agregarSeleccion, asignaturaComparada, calcularDatosSeleccion, calcularResultado, cambiarAsignaturaComparada, colores, compararNiveles, datosCompletos, datosDistribucion, desactivarCompararNiveles, eliminarSeleccion, getAsignaturas, getTrendInfo, idioma, modoDistribucion, modoEtapa, modoHeatmap, nivelesSinGlobalEtapa, renderOpcionesAsignaturas, rotuloTrimestre, selecciones, setModoDistribucion, setModoHeatmap, t, todasLasAsignaturas, trimestreSeleccionado, trimestresDisponibles }) => (
  <div className="max-w-7xl mx-auto">
    {/* Selectores */}
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('selections')}</h3>
        {!compararNiveles && selecciones.length < 15 && (
          <button
            onClick={agregarSeleccion}
            className="py-2 px-4 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-all"
          >
            + {t('add')}
          </button>
        )}
      </div>

      {/* Opción de comparar niveles */}
      {todasLasAsignaturas.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                {idioma === 'es'
                  ? `Comparar misma asignatura en todos los niveles (${
                      modoEtapa === 'EPM' ? '1EPM - 6EPM' :
                      modoEtapa === 'EEM' ? '1EEM - 4EEM' :
                      '1EEM - 4EEM, 1EPM - 6EPM'
                    })`
                  : `Comparar mateixa assignatura en tots els nivells (${
                      modoEtapa === 'EPM' ? '1EPM - 6EPM' :
                      modoEtapa === 'EEM' ? '1EEM - 4EEM' :
                      '1EEM - 4EEM, 1EPM - 6EPM'
                    })`
                }
              </span>
              <button
                onClick={() => compararNiveles ? desactivarCompararNiveles() : activarCompararNiveles()}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  compararNiveles ? 'bg-gray-900' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  compararNiveles ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
          {compararNiveles && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">{t('subjectToCompare')}</label>
              <select
                value={asignaturaComparada}
                onChange={(e) => cambiarAsignaturaComparada(e.target.value)}
                className="w-full md:w-64 py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm"
              >
                {renderOpcionesAsignaturas(todasLasAsignaturas)}
              </select>
            </div>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        {selecciones.map((sel, idx) => (
          <div
            key={sel.id}
            className="p-4 rounded-lg border-2"
            style={{ borderColor: colores[idx % colores.length].line, backgroundColor: colores[idx % colores.length].bg }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colores[idx % colores.length].line }} />
                <span className="text-sm font-semibold" style={{ color: colores[idx % colores.length].line }}>
                  {t('selection')} {idx + 1}
                </span>
              </div>
              {!compararNiveles && selecciones.length > 1 && (
                <button
                  onClick={() => eliminarSeleccion(sel.id)}
                  className="text-gray-400 hover:text-red-500 text-xl"
                >
                  ×
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('trimester')}</label>
                <select
                  value={sel.trimestre}
                  onChange={(e) => actualizarSeleccion(sel.id, 'trimestre', e.target.value)}
                  disabled={compararNiveles}
                  className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {trimestresDisponibles
                    .filter(t => {
                      if (modoEtapa === 'TODOS') return true;
                      const parsed = parseTrimestre(t);
                      return parsed && parsed.etapa === modoEtapa;
                    })
                    .map(t => (
                      <option key={t} value={t}>{rotuloTrimestre(t)}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('level')}</label>
                <select
                  value={sel.nivel}
                  onChange={(e) => actualizarSeleccion(sel.id, 'nivel', e.target.value)}
                  disabled={compararNiveles}
                  className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {Object.keys(datosCompletos[sel.trimestre] || {}).map(n => (
                    <option key={n} value={n}>{n === 'GLOBAL' ? `📊 ${t('global')}` : n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('subject')}</label>
                <select
                  value={sel.asignatura}
                  onChange={(e) => actualizarSeleccion(sel.id, 'asignatura', e.target.value)}
                  disabled={compararNiveles}
                  className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {renderOpcionesAsignaturas(getAsignaturas(sel.trimestre, sel.nivel))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Tarjetas de estadísticas */}
    <div className="grid grid-cols-1 gap-4 mb-6">
      {selecciones.map((sel, idx) => {
        const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
        if (!datos) return null;
        
        const resultado = calcularResultado(datos.stats);
        const base = selecciones[0];
        const datosBase = datosCompletos[base.trimestre]?.[base.nivel]?.[base.asignatura];
        
        // Generar descripción textual
        const generarDescripcion = () => {
          const { stats } = datos;
          const partes = [];
          
          // Análisis de nota media
          if (stats.notaMedia >= 8) {
            partes.push(`Excelente rendimiento con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
          } else if (stats.notaMedia >= 7) {
            partes.push(`Buen rendimiento con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
          } else if (stats.notaMedia >= 6) {
            partes.push(`Rendimiento aceptable con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
          } else if (stats.notaMedia >= 5) {
            partes.push(`Rendimiento ajustado con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
          } else {
            partes.push(`Rendimiento bajo con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
          }
          
          // Análisis de aprobados/suspendidos
          if (stats.aprobados === 100) {
            partes.push('100% de aprobados');
          } else if (stats.aprobados >= 90) {
            partes.push(`alto porcentaje de aprobados (${stats.aprobados}%)`);
          } else if (stats.suspendidos >= 20) {
            partes.push(`atención: ${stats.suspendidos}% de suspensos`);
          }
          
          // Análisis de dispersión
          if (stats.desviacion <= 1) {
            partes.push('notas muy homogéneas');
          } else if (stats.desviacion >= 2) {
            partes.push('alta dispersión en las notas');
          }
          
          // Análisis de moda
          if (stats.moda) {
            partes.push(`la nota más frecuente es ${stats.moda}`);
          }
          
          return partes.join('. ') + '.';
        };
        
        return (
          <div
            key={sel.id}
            className="bg-white rounded-xl border-2 p-4"
            style={{ borderColor: colores[idx % colores.length].line }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colores[idx % colores.length].line }} />
                <h4 className="font-semibold text-gray-900 text-sm">
                  {sel.trimestre} · {sel.nivel} · {sel.asignatura}
                </h4>
                {resultado && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    resultado === 'DIFÍCIL' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {resultado}
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-8 gap-2 mb-3">
              {[
                { label: 'N', title: t('records'), key: 'registros', format: (v) => v },
                { label: t('average'), title: t('average'), key: 'notaMedia', format: (v) => v?.toFixed(2) },
                { label: 'σ', title: t('deviation'), key: 'desviacion', format: (v) => v?.toFixed(2) },
                { label: t('mode'), title: t('mode'), key: 'moda', format: (v) => v ?? '—' },
                { label: t('passed'), title: `% ${t('passed')}`, key: 'aprobados', format: (v) => `${v?.toFixed(0)}%` },
                { label: t('failed'), title: `% ${t('failed')}`, key: 'suspendidos', format: (v) => `${v?.toFixed(0)}%` },
                { label: `${t('mode')} ${t('passed')}`, title: t('passedMode'), key: 'modaAprobados', format: (v) => v ?? '—' },
                { label: `${t('mode')} ${t('failed')}`, title: t('failedMode'), key: 'modaSuspendidos', format: (v) => v ?? '—' }
              ].map(({ label, title, key, format }) => {
                const valor = datos.stats[key];
                /* La diferencia y su LECTURA las decide el núcleo. No es
                   lo mismo el signo que la mejora: subir la nota media es
                   mejorar, y subir el porcentaje de suspensos es
                   empeorar. Antes las tres se pintaban con la misma
                   regla —positivo, verde—, así que pasar de un 8,5 % a
                   un 14 % de suspensos salía como «+5.5» EN VERDE. */
                const comp = (idx > 0 && datosBase)
                  ? diferencia(valor, datosBase.stats[key], key) : null;

                return (
                  <div key={key} className="bg-gray-50 rounded p-2 md:p-3 lg:p-4 text-center min-h-[60px] md:min-h-[70px] lg:min-h-[80px] flex flex-col justify-center" title={title}>
                    <div className="text-xs md:text-sm text-gray-500">{label}</div>
                    <div className="text-sm md:text-base lg:text-lg font-bold text-gray-900">{format(valor)}</div>
                    {comp && (
                      <div className={`text-xs md:text-sm font-medium ${
                        comp.mejora === null ? 'text-gray-500'
                          : comp.mejora ? 'text-green-600' : 'text-red-600'}`}>
                        {comp.diff > 0 ? '+' : ''}{comp.diff.toFixed(decimalesDe(key))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Descripción textual */}
            <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 italic">
              {generarDescripcion()}
            </div>
          </div>
        );
      })}
    </div>

    {/* Radar combinado de todas las selecciones */}
    {selecciones.length > 0 && (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{t('radarComparison')}</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={(() => {
            // Calcular datos del radar para cada selección
            const metricas = ['Nota Media', `% ${t('passed')}`, `% ${t('excellence')}`, t('mode')];

            return metricas.map((metrica, metricaIdx) => {
              const punto = { subject: metrica };

              selecciones.forEach((sel, idx) => {
                if (idx >= 5) return; // Máximo 5 selecciones

                const datos = calcularDatosSeleccion(sel);
                if (!datos) return;

                const label = `Sel ${idx + 1}`;

                if (metricaIdx === 0) {
                  // Nota Media (normalizada 0-100)
                  punto[label] = (datos.stats.notaMedia / 10) * 100;
                } else if (metricaIdx === 1) {
                  // % Aprobados (0-100)
                  punto[label] = datos.stats.aprobados;
                } else if (metricaIdx === 2) {
                  // % Excelencia (0-100)
                  const registros = datos.stats.registros || 0;
                  punto[label] = registros > 0
                    ? ((datos.distribucion[9] || 0) + (datos.distribucion[10] || 0)) / registros * 100
                    : 0;
                } else if (metricaIdx === 3) {
                  // Moda (normalizada 0-100)
                  punto[label] = datos.stats.moda ? (datos.stats.moda / 10) * 100 : 0;
                }
              });

              return punto;
            });
          })()}>
            <PolarGrid stroke="#cbd5e1" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
            />
            {selecciones.slice(0, 5).map((sel, idx) => (
              <Radar
                key={sel.id}
                name={`${sel.trimestre} - ${sel.nivel} - ${sel.asignatura}`}
                dataKey={`Sel ${idx + 1}`}
                stroke={colores[idx % colores.length].line}
                fill={colores[idx % colores.length].line}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
              formatter={(value) => (value || 0).toFixed(1)}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    )}

    {/* Gráficas de evolución para comparativa de misma asignatura en todos los niveles */}
    {compararNiveles && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Evolución de la Nota Media */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('averageEvolution')}</h3>
          {(() => {
            const datosEvolucion = nivelesSinGlobalEtapa.map(nivel => {
              // En modo TODOS, buscar el trimestre apropiado para cada nivel
              const trimestreParaNivel = modoEtapa === 'TODOS'
                ? getBestTrimestre(trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa)
                : trimestreSeleccionado;

              const datos = datosCompletos[trimestreParaNivel]?.[nivel]?.[asignaturaComparada];
              return {
                nivel,
                notaMedia: datos?.stats?.notaMedia || null
              };
            }).filter(d => d.notaMedia !== null);

            const tendencia = calcularTendencia(datosEvolucion.map(d => d.notaMedia));
            const infoTendencia = getTrendInfo(tendencia.tipo);

            return (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600">{t('trend')}:</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${infoTendencia.color} flex items-center gap-1`} title={infoTendencia.desc}>
                    <span>{tendencia.icono}</span>
                    <span>{infoTendencia.label}</span>
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={datosEvolucion}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="nivel" stroke="#64748b" />
                    <YAxis
                      stroke="#64748b"
                      domain={[0, 10]}
                      label={{
                        value: t('average'),
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#64748b' }
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="notaMedia"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ fill: '#2563eb', r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </>
            );
          })()}
        </div>

        {/* Evolución del % de Suspensos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('failedEvolution')}</h3>
          {(() => {
            const datosEvolucion = nivelesSinGlobalEtapa.map(nivel => {
              // En modo TODOS, buscar el trimestre apropiado para cada nivel
              const trimestreParaNivel = modoEtapa === 'TODOS'
                ? getBestTrimestre(trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa)
                : trimestreSeleccionado;

              const datos = datosCompletos[trimestreParaNivel]?.[nivel]?.[asignaturaComparada];
              return {
                nivel,
                suspendidos: datos?.stats?.suspendidos || null
              };
            }).filter(d => d.suspendidos !== null);

            const tendencia = calcularTendencia(datosEvolucion.map(d => d.suspendidos));
            const infoTendencia = getTrendInfo(tendencia.tipo);

            return (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600">{t('trend')}:</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${infoTendencia.color} flex items-center gap-1`} title={infoTendencia.desc}>
                    <span>{tendencia.icono}</span>
                    <span>{infoTendencia.label}</span>
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={datosEvolucion}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="nivel" stroke="#64748b" />
                    <YAxis
                      stroke="#64748b"
                      domain={[0, 100]}
                      label={{
                        value: '% Suspensos',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#64748b' }
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="suspendidos"
                      stroke="#dc2626"
                      strokeWidth={3}
                      dot={{ fill: '#dc2626', r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </>
            );
          })()}
        </div>
      </div>
    )}

    {/* Gráfico de distribución */}
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('gradeDistribution')}</h3>
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setModoDistribucion('porcentaje')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              modoDistribucion === 'porcentaje'
                ? 'bg-white text-gray-900 '
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('distributionPercentage')}
          </button>
          <button
            onClick={() => setModoDistribucion('absoluto')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              modoDistribucion === 'absoluto'
                ? 'bg-white text-gray-900 '
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('distributionAbsolute')}
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={datosDistribucion}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="nota" stroke="#64748b" />
          <YAxis
            stroke="#64748b"
            label={{
              value: modoDistribucion === 'porcentaje' ? '% Alumnos' : 'Cantidad',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#64748b' }
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}
          />
          <Legend />
          {selecciones.map((sel, idx) => {
            const label = `${sel.trimestre} - ${sel.nivel} - ${sel.asignatura}`;
            return (
              <Line
                key={sel.id}
                type="monotone"
                dataKey={label}
                stroke={colores[idx % colores.length].line}
                strokeWidth={2}
                dot={{ fill: colores[idx % colores.length].line, r: 4 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>

    {/* Tabla de distribución */}
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('distributionTable')}</h3>
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setModoHeatmap('relativo')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              modoHeatmap === 'relativo'
                ? 'bg-white text-gray-900 '
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('heatmapRelative')}
          </button>
          <button
            onClick={() => setModoHeatmap('absoluto')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              modoHeatmap === 'absoluto'
                ? 'bg-white text-gray-900 '
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('heatmapAbsolute')}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        {(() => {
          // Calcular totales y máximos para el mapa de calor
          const totales = selecciones.map(sel => {
            const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
            return datos?.distribucion ? Object.values(datos.distribucion).reduce((a, b) => a + b, 0) : 0;
          });

          // Calcular máximos según el modo
          let maxValorGlobal = 0;
          const maxValoresPorColumna = [];

          selecciones.forEach((sel) => {
            const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
            let maxColumna = 0;
            if (datos?.distribucion) {
              Object.values(datos.distribucion).forEach(v => {
                if (v > maxValorGlobal) maxValorGlobal = v;
                if (v > maxColumna) maxColumna = v;
              });
            }
            maxValoresPorColumna.push(maxColumna);
          });

          // Función para color del mapa de calor (rojo = alto, verde = bajo)
          const getHeatmapColor = (valor, max) => {
            if (max === 0 || valor === 0) return 'transparent';
            const intensity = valor / max;
            // De verde claro (bajo) a rojo (alto)
            if (intensity < 0.33) {
              return `rgba(134, 239, 172, ${0.3 + intensity})`; // Verde claro
            } else if (intensity < 0.66) {
              return `rgba(253, 224, 71, ${0.3 + intensity * 0.5})`; // Amarillo
            } else {
              return `rgba(248, 113, 113, ${0.4 + intensity * 0.4})`; // Rojo
            }
          };
          
          // Calcular agrupaciones
          const calcularAgrupacion = (dist) => {
            const total = Object.values(dist).reduce((a, b) => a + b, 0);
            const grupos = {
              insuficiente: (dist[1] || 0) + (dist[2] || 0) + (dist[3] || 0) + (dist[4] || 0),
              suficiente: dist[5] || 0,
              bien: dist[6] || 0,
              notable: (dist[7] || 0) + (dist[8] || 0),
              excelente: (dist[9] || 0) + (dist[10] || 0)
            };
            const porcentajes = {
              insuficiente: total > 0 ? (grupos.insuficiente / total * 100).toFixed(1) : '0.0',
              suficiente: total > 0 ? (grupos.suficiente / total * 100).toFixed(1) : '0.0',
              bien: total > 0 ? (grupos.bien / total * 100).toFixed(1) : '0.0',
              notable: total > 0 ? (grupos.notable / total * 100).toFixed(1) : '0.0',
              excelente: total > 0 ? (grupos.excelente / total * 100).toFixed(1) : '0.0'
            };
            return { grupos, porcentajes };
          };
          
          return (
            <>
              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-3 px-3 text-left text-sm font-semibold text-gray-600">{t('grade')}</th>
                    {selecciones.map((sel, idx) => (
                      <th key={sel.id} className="py-3 px-2 text-center text-xs font-semibold text-gray-700">
                        <div>{sel.trimestre} · {sel.nivel}</div>
                        <div className="font-normal text-gray-500">{sel.asignatura}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(nota => (
                    <tr key={nota} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium text-gray-700">{nota}</td>
                      {selecciones.map((sel, idx) => {
                        const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                        const valor = datos?.distribucion[nota] || 0;
                        const total = totales[idx];
                        const porcentaje = total > 0 ? (valor / total * 100).toFixed(1) : '0.0';
                        const maxParaColor = modoHeatmap === 'relativo' ? maxValoresPorColumna[idx] : maxValorGlobal;
                        return (
                          <td
                            key={sel.id}
                            className="py-2 px-2 text-center"
                            style={{ backgroundColor: getHeatmapColor(valor, maxParaColor) }}
                          >
                            <span className="font-semibold text-gray-900">{valor}</span>
                            <span className="text-xs text-gray-700 ml-1">({porcentaje}%)</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                    <td className="py-3 px-3 text-gray-700">{t('total')}</td>
                    {selecciones.map((sel, idx) => (
                      <td key={sel.id} className="py-3 px-2 text-center text-gray-900">
                        {totales[idx]}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              {/* Tabla de agrupaciones */}
              <h4 className="text-md font-semibold text-gray-700 mb-3">{t('groupByGrade')}</h4>
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="py-3 px-3 text-left text-sm font-semibold text-gray-600">{t('grade')}</th>
                    <th className="py-3 px-3 text-left text-xs font-normal text-gray-500">{t('grades')}</th>
                    {selecciones.map((sel, idx) => (
                      <th key={sel.id} className="py-3 px-2 text-center text-xs font-semibold text-gray-700">
                        {sel.trimestre} · {sel.nivel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: 'insuficiente', label: t('insufficient'), notas: '1-4' },
                    { key: 'suficiente', label: t('sufficient'), notas: '5' },
                    { key: 'bien', label: t('good'), notas: '6' },
                    { key: 'notable', label: t('notable'), notas: '7-8' },
                    { key: 'excelente', label: t('excellent'), notas: '9-10' }
                  ].map(({ key, label, notas }) => (
                    <tr key={key} className="border-b border-gray-100">
                      <td className="py-2 px-3 font-medium text-gray-700">{label}</td>
                      <td className="py-2 px-3 text-xs text-gray-500">{notas}</td>
                      {selecciones.map((sel, idx) => {
                        const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                        if (!datos) return <td key={sel.id} className="py-2 px-2 text-center">—</td>;
                        const { grupos, porcentajes } = calcularAgrupacion(datos.distribucion);
                        return (
                          <td key={sel.id} className="py-2 px-2 text-center">
                            <span className="font-semibold text-gray-900">{grupos[key]}</span>
                            <span className="text-xs text-gray-900 ml-1">({porcentajes[key]}%)</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          );
        })()}
      </div>
    </div>

  </div>
);

export default VistaEstadisticas;
