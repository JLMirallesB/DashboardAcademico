/* El mapa de dispersión: nota media frente a desviación
 *
 * Salió del componente grande el 23/08/2026. Es el mismo JSX, con lo que
 * usaba de fuera convertido en props: si algo se comporta distinto, es un
 * fallo de la extracción, no una mejora.
 */

import React from 'react';
import { compararTrimestres, esAgregado, mismoMomento, cursosDe,
         momentosDe, esDelMomento, parseTrimestre as parseClave } from '../../nucleo/texto.js';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ReferenceLine } from 'recharts';

export const VistaDispersion = ({ datosCompletos, idioma, minAlumnosDispersion, modoEtapa, nivelDispersion, setMinAlumnosDispersion, setNivelDispersion, setZoomDispersion, t, trimestreSeleccionado, trimestresDisponibles, zoomDispersion }) => (
  <div className="max-w-7xl mx-auto">
    {/* Mapa de Dispersión: Nota Media vs Desviación Estándar */}
    {trimestreSeleccionado && (() => {
      // Recopilar datos de todas las asignaturas desde el nivel seleccionado
      const datosDispersion = [];

      if (nivelDispersion === 'GLOBAL') {
        // Mostrar datos de GLOBAL
        if (modoEtapa === 'TODOS') {
          // En modo TODOS: combinar datos de asignaturas con mismo nombre de ambas etapas
          const asignaturasCombinadas = new Map();

          // Buscar en todos los trimestres de la misma evaluación
          const trimestresABuscar = trimestresDisponibles.filter(t => mismoMomento(t, trimestreSeleccionado));

          trimestresABuscar.forEach(trim => {
            const datosNivel = datosCompletos[trim]?.['GLOBAL'];
            if (datosNivel) {
              Object.entries(datosNivel).forEach(([asignatura, datos]) => {
                if (!esAgregado(asignatura) && datos?.stats) {
                  if (!asignaturasCombinadas.has(asignatura)) {
                    asignaturasCombinadas.set(asignatura, {
                      asignatura,
                      notasAcumuladas: [],
                      alumnosTotales: 0
                    });
                  }
                  const asigData = asignaturasCombinadas.get(asignatura);

                  // Agregar las notas individuales si están disponibles
                  if (datos.stats.notaMedia && datos.stats.registros > 0) {
                    // Aproximar las notas individuales usando media y desviación
                    const numAlumnos = datos.stats.registros || 0;
                    asigData.notasAcumuladas.push({
                      media: datos.stats.notaMedia,
                      desviacion: datos.stats.desviacion || 0,
                      alumnos: numAlumnos
                    });
                    asigData.alumnosTotales += numAlumnos;
                  }
                }
              });
            }
          });

          // Calcular media y desviación combinadas
          asignaturasCombinadas.forEach((asigData) => {
            if (asigData.notasAcumuladas.length > 0 && asigData.alumnosTotales > 0) {
              // Media ponderada
              const mediaPonderada = asigData.notasAcumuladas.reduce((sum, grupo) =>
                sum + (grupo.media * grupo.alumnos), 0) / asigData.alumnosTotales;

              // Desviación estándar combinada (aproximación conservadora)
              const desviacionCombinada = Math.sqrt(
                asigData.notasAcumuladas.reduce((sum, grupo) => {
                  const varianza = Math.pow(grupo.desviacion, 2);
                  const difMedia = Math.pow(grupo.media - mediaPonderada, 2);
                  return sum + ((varianza + difMedia) * grupo.alumnos);
                }, 0) / asigData.alumnosTotales
              );

              datosDispersion.push({
                asignatura: asigData.asignatura,
                notaMedia: mediaPonderada,
                desviacion: desviacionCombinada,
                alumnos: asigData.alumnosTotales
              });
            }
          });
        } else {
          // Modo EEM o EPM: datos GLOBAL del trimestre seleccionado
          const datosNivel = datosCompletos[trimestreSeleccionado]?.['GLOBAL'];
          if (datosNivel) {
            Object.entries(datosNivel).forEach(([asignatura, datos]) => {
              if (!esAgregado(asignatura) && datos?.stats) {
                const notaMedia = datos.stats.notaMedia;
                const desviacion = datos.stats.desviacion || 0;
                const alumnos = datos.stats.registros || 0;

                if (notaMedia !== undefined && alumnos > 0) {
                  datosDispersion.push({
                    asignatura,
                    notaMedia,
                    desviacion,
                    alumnos
                  });
                }
              }
            });
          }
        }
      } else {
        // Mostrar datos de un nivel específico (1EEM, 2EPM, etc.)
        const datosNivel = datosCompletos[trimestreSeleccionado]?.[nivelDispersion];
        if (datosNivel) {
          Object.entries(datosNivel).forEach(([asignatura, datos]) => {
            if (!esAgregado(asignatura) && datos?.stats) {
              const notaMedia = datos.stats.notaMedia;
              const desviacion = datos.stats.desviacion || 0;
              const alumnos = datos.stats.registros || 0;

              if (notaMedia !== undefined && alumnos > 0) {
                datosDispersion.push({
                  asignatura,
                  notaMedia,
                  desviacion,
                  alumnos
                });
              }
            }
          });
        }
      }

      if (datosDispersion.length === 0) return null;

      // Calcular desviación máxima y alumnos máximos para los rangos
      const maxDesviacion = datosDispersion.length > 0
        ? Math.max(...datosDispersion.map(d => d.desviacion))
        : 0;
      const desviacionMax = zoomDispersion.rangoDesviacion.max || Math.max(3, Math.ceil(maxDesviacion * 1.2));

      const maxAlumnos = datosDispersion.length > 0
        ? Math.max(...datosDispersion.map(d => d.alumnos))
        : 0;

      // Filtrar datos según rangos de valores (no índices)
      const datosFiltrados = datosDispersion.filter(d =>
        d.notaMedia >= zoomDispersion.rangoMedia.min &&
        d.notaMedia <= zoomDispersion.rangoMedia.max &&
        d.desviacion >= zoomDispersion.rangoDesviacion.min &&
        d.desviacion <= desviacionMax &&
        d.alumnos >= minAlumnosDispersion
      );

      // Función para determinar el cuadrante y su interpretación
      const getAnalisis = (notaMedia, desviacion) => {
        const mediaAlta = notaMedia >= 7;
        const desviacionAlta = desviacion >= 1.5;

        if (mediaAlta && !desviacionAlta) return t('highAvgLowDev');
        if (mediaAlta && desviacionAlta) return t('highAvgHighDev');
        if (!mediaAlta && !desviacionAlta) return t('lowAvgLowDev');
        return t('lowAvgHighDev');
      };

      // Tooltip personalizado
      const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
          const data = payload[0].payload;
          return (
            <div className="bg-white p-3 border-2 border-gray-900 rounded-lg">
              <p className="font-bold text-gray-900 mb-2">{data.asignatura}</p>
              <p className="text-sm text-gray-600">{t('average')}: <span className="font-semibold">{data.notaMedia.toFixed(2)}</span></p>
              <p className="text-sm text-gray-600">{t('standardDeviation')}: <span className="font-semibold">{data.desviacion.toFixed(2)}</span></p>
              <p className="text-sm text-gray-600">{t('students')}: <span className="font-semibold">{data.alumnos}</span></p>
              <p className="text-xs text-gray-500 mt-2 italic">{getAnalisis(data.notaMedia, data.desviacion)}</p>
            </div>
          );
        }
        return null;
      };

      // Obtener niveles disponibles para el selector
      // En modo TODOS, combinar niveles de todos los trimestres de la misma evaluación
      const obtenerNivelesDispersion = () => {
        if (modoEtapa === 'TODOS') {
          const nivelesSet = new Set();
          // Buscar en todos los trimestres de la misma evaluación
          trimestresDisponibles.forEach(trim => {
            if (mismoMomento(trim, trimestreSeleccionado) && datosCompletos[trim]) {
              Object.keys(datosCompletos[trim]).forEach(nivel => {
                if (nivel !== 'GLOBAL') nivelesSet.add(nivel);
              });
            }
          });
          // Ordenar niveles: primero EEM (1-4), luego EPM (1-6)
          const niveles = Array.from(nivelesSet).sort((a, b) => {
            const esEEM_A = a.includes('EEM');
            const esEEM_B = b.includes('EEM');
            if (esEEM_A && !esEEM_B) return -1;
            if (!esEEM_A && esEEM_B) return 1;
            return a.localeCompare(b, undefined, { numeric: true });
          });
          return ['GLOBAL', ...niveles];
        }
        // En modos EEM/EPM, solo niveles del trimestre seleccionado
        return ['GLOBAL', ...Object.keys(datosCompletos[trimestreSeleccionado] || {}).filter(n => n !== 'GLOBAL')];
      };
      const nivelesParaDispersion = obtenerNivelesDispersion();

      return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dispersionMap')}</h3>

          {/* Selector de nivel/curso */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {idioma === 'es' ? 'Filtrar por curso:' : 'Filtrar per curs:'}
            </label>
            <div className="flex flex-wrap gap-2">
              {nivelesParaDispersion.map(nivel => (
                <button
                  key={nivel}
                  onClick={() => setNivelDispersion(nivel)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    nivelDispersion === nivel
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {nivel === 'GLOBAL' ? `📊 ${idioma === 'es' ? 'Todos los cursos' : 'Tots els cursos'}` : nivel}
                </button>
              ))}
            </div>
          </div>

          {/* Controles y leyenda */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Leyenda de cuadrantes */}
            <div className="flex-1 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('dispersionAnalysis')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full mt-0.5"></div>
                  <span className="text-gray-600">{t('highAvgLowDev')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-0.5"></div>
                  <span className="text-gray-600">{t('highAvgHighDev')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mt-0.5"></div>
                  <span className="text-gray-600">{t('lowAvgLowDev')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 bg-rose-500 rounded-full mt-0.5"></div>
                  <span className="text-gray-600">{t('lowAvgHighDev')}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 italic">
                {idioma === 'es'
                  ? '* El tamaño del punto indica la cantidad de alumnos. Use los controles de la derecha para filtrar por rangos.'
                  : '* La mida del punt indica la quantitat d\'alumnes. Utilitzeu els controls de la dreta per filtrar per rangs.'}
              </p>
            </div>

            {/* Controles de zoom */}
            <div className="flex flex-col gap-2">
              {/* Ajustar a los datos: los ejes por defecto van de 0 a 10
                  en la media y hasta un máximo redondeado en la
                  desviación, así que con un centro que se mueve entre
                  6,5 y 8 la nube se queda apretada en una esquina y las
                  diferencias que importan no se ven. Esto los recorta a
                  lo que hay, con un margen para que nada quede pegado al
                  borde. Se calcula sobre los puntos que se están
                  pintando —los que pasan el mínimo de alumnado—, no
                  sobre todos: ajustar a un punto que está filtrado
                  dejaría espacio vacío. */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const puntos = datosDispersion.filter(d => d.alumnos >= minAlumnosDispersion);
                    if (!puntos.length) return;
                    const medias = puntos.map(d => d.notaMedia);
                    const desv = puntos.map(d => d.desviacion);
                    const margen = (lo, hi, minimo) => {
                      const m = Math.max((hi - lo) * 0.08, minimo);
                      return [lo - m, hi + m];
                    };
                    const [mMin, mMax] = margen(Math.min(...medias), Math.max(...medias), 0.2);
                    const [dMin, dMax] = margen(Math.min(...desv), Math.max(...desv), 0.1);
                    setZoomDispersion({
                      /* Redondeado a medio punto y a una décima: un eje
                         que empieza en 6,3174 se lee peor que uno que
                         empieza en 6,5, y no se gana nada. */
                      rangoMedia: {
                        min: Math.max(0, Math.floor(mMin * 2) / 2),
                        max: Math.min(10, Math.ceil(mMax * 2) / 2)
                      },
                      rangoDesviacion: {
                        min: Math.max(0, Math.floor(dMin * 10) / 10),
                        max: Math.ceil(dMax * 10) / 10
                      }
                    });
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-black transition-colors"
                >
                  {t('dispAjustar')}
                </button>
                <button
                  onClick={() => setZoomDispersion({
                    rangoMedia: { min: 0, max: 10 },
                    rangoDesviacion: { min: 0, max: null }
                  })}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('dispRestablecer')}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 whitespace-nowrap">{t('average')}:</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={zoomDispersion.rangoMedia.min}
                  onChange={(e) => setZoomDispersion({
                    ...zoomDispersion,
                    rangoMedia: { ...zoomDispersion.rangoMedia, min: parseFloat(e.target.value) }
                  })}
                  className="w-24"
                />
                <span className="text-xs text-gray-700 font-mono">{zoomDispersion.rangoMedia.min.toFixed(1)}</span>
                <span className="text-xs text-gray-500">-</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={zoomDispersion.rangoMedia.max}
                  onChange={(e) => setZoomDispersion({
                    ...zoomDispersion,
                    rangoMedia: { ...zoomDispersion.rangoMedia, max: parseFloat(e.target.value) }
                  })}
                  className="w-24"
                />
                <span className="text-xs text-gray-700 font-mono">{zoomDispersion.rangoMedia.max.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 whitespace-nowrap">{t('standardDeviation')}:</span>
                <input
                  type="range"
                  min="0"
                  max={Math.ceil(maxDesviacion)}
                  step="0.1"
                  value={zoomDispersion.rangoDesviacion.min}
                  onChange={(e) => setZoomDispersion({
                    ...zoomDispersion,
                    rangoDesviacion: { ...zoomDispersion.rangoDesviacion, min: parseFloat(e.target.value) }
                  })}
                  className="w-24"
                />
                <span className="text-xs text-gray-700 font-mono">{zoomDispersion.rangoDesviacion.min.toFixed(1)}</span>
                <span className="text-xs text-gray-500">-</span>
                <input
                  type="range"
                  min="0"
                  max={Math.max(3, Math.ceil(maxDesviacion * 1.2))}
                  step="0.1"
                  value={desviacionMax}
                  onChange={(e) => setZoomDispersion({
                    ...zoomDispersion,
                    rangoDesviacion: { ...zoomDispersion.rangoDesviacion, max: parseFloat(e.target.value) }
                  })}
                  className="w-24"
                />
                <span className="text-xs text-gray-700 font-mono">{desviacionMax.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 whitespace-nowrap">{t('students')} ≥:</span>
                {/* Botones rápidos para valores bajos */}
                <div className="flex gap-1">
                  {[0, 3, 5, 10].map(val => (
                    <button
                      key={val}
                      onClick={() => setMinAlumnosDispersion(val)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        minAlumnosDispersion === val
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                {/* Input numérico directo */}
                <input
                  type="number"
                  min="0"
                  max={Math.max(50, maxAlumnos)}
                  value={minAlumnosDispersion}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setMinAlumnosDispersion(Math.max(0, Math.min(val, Math.max(50, maxAlumnos))));
                  }}
                  className="w-16 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
                {minAlumnosDispersion > 0 && (
                  <span className="text-xs text-emerald-600">✓</span>
                )}
              </div>
              <button
                onClick={() => {
                  setZoomDispersion({
                    rangoMedia: { min: 0, max: 10 },
                    rangoDesviacion: { min: 0, max: null }
                  });
                  setMinAlumnosDispersion(0);
                }}
                className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-all whitespace-nowrap"
              >
                {idioma === 'es' ? 'Reiniciar filtros' : 'Reiniciar filtres'}
              </button>
            </div>
          </div>

          {/* Gráfico de dispersión */}
          <ResponsiveContainer width="100%" height={700}>
            <ScatterChart margin={{ top: 30, right: 40, bottom: 80, left: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="notaMedia"
                name={t('average')}
                domain={[zoomDispersion.rangoMedia.min, zoomDispersion.rangoMedia.max]}
                stroke="#64748b"
                label={{
                  value: t('average'),
                  position: 'bottom',
                  offset: 60,
                  style: { fill: '#475569', fontSize: 14, fontWeight: 600 }
                }}
                allowDataOverflow={false}
              />
              <YAxis
                type="number"
                dataKey="desviacion"
                name={t('standardDeviation')}
                domain={[zoomDispersion.rangoDesviacion.min, desviacionMax]}
                stroke="#64748b"
                label={{
                  value: t('standardDeviation'),
                  angle: -90,
                  position: 'insideLeft',
                  offset: 15,
                  style: { fill: '#475569', fontSize: 14, fontWeight: 600 }
                }}
                allowDataOverflow={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter
                data={datosFiltrados}
                shape={(props) => {
                  const { cx, cy, payload } = props;
                  const mediaAlta = payload.notaMedia >= 7;
                  const desviacionAlta = payload.desviacion >= 1.5;

                  let color;
                  if (mediaAlta && !desviacionAlta) color = '#10b981'; // emerald
                  else if (mediaAlta && desviacionAlta) color = '#3b82f6'; // blue
                  else if (!mediaAlta && !desviacionAlta) color = '#f97316'; // orange
                  else color = '#f43f5e'; // rose

                  // Tamaño basado en cantidad de alumnos con escala de raíz cuadrada
                  const radius = Math.min(25, Math.max(8, Math.sqrt(payload.alumnos) * 2.5));

                  return (
                    <g>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={color}
                        fillOpacity={0.6}
                        stroke={color}
                        strokeWidth={2}
                      />
                      <text
                        x={cx}
                        y={cy + radius + 15}
                        textAnchor="middle"
                        fill="#1e293b"
                        fontSize={11}
                        fontWeight={600}
                      >
                        {payload.asignatura.length > 18
                          ? payload.asignatura.substring(0, 18) + '...'
                          : payload.asignatura}
                      </text>
                    </g>
                  );
                }}
              />
              {/* Líneas de referencia */}
              <ReferenceLine
                x={7}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth={1}
                label={{
                  value: idioma === 'es' ? 'Media alta' : 'Mitjana alta',
                  position: 'top',
                  fill: '#64748b',
                  fontSize: 11
                }}
              />
              <ReferenceLine
                y={1.5}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                strokeWidth={1}
                label={{
                  value: idioma === 'es' ? 'Dispersión alta' : 'Dispersió alta',
                  position: 'right',
                  fill: '#64748b',
                  fontSize: 11
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      );
    })()}
  </div>
);

export default VistaDispersion;
