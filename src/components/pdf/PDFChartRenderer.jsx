/**
 * Dashboard Académico - Renderizador de Gráficas para PDF
 * Componente oculto que renderiza gráficas con dimensiones fijas para captura con html2canvas
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  LineChart, Line,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

/**
 * Tooltip personalizado para el mapa de dispersión
 */
const CustomTooltipDispersion = ({ active, payload }) => {
  if (!active || !payload || !payload[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white p-3 border border-slate-300 rounded-lg shadow-lg">
      <p className="font-semibold text-slate-800">{data.asignatura}</p>
      <p className="text-sm text-slate-600">Media: {data.notaMedia?.toFixed(2)}</p>
      <p className="text-sm text-slate-600">Desviación: {data.desviacion?.toFixed(2)}</p>
      <p className="text-sm text-slate-600">Alumnos: {data.alumnos}</p>
    </div>
  );
};

/**
 * 10 colores bien diferenciados para líneas de evolución
 * Seleccionados para máximo contraste visual
 */
const COLORES_LINEAS = [
  '#2563eb', // Azul fuerte
  '#dc2626', // Rojo
  '#16a34a', // Verde
  '#9333ea', // Púrpura
  '#ea580c', // Naranja
  '#0891b2', // Cyan
  '#c026d3', // Magenta/Fucsia
  '#854d0e', // Marrón/Ocre
  '#4f46e5', // Índigo
  '#059669', // Esmeralda
];

/**
 * Componente de renderizado de gráficas para PDF
 * Renderiza gráficas fuera de pantalla con dimensiones fijas para captura
 */
export const PDFChartRenderer = forwardRef(({
  isGenerating,
  datosDispersion,
  datosEvolucionCorrelaciones,
  nivelesCorrelaciones,
  datosTransversal, // Ahora es un array de grupos: [{datos, asignaturas, titulo}, ...]
  datosEvolucionNotas, // Datos para evolución de notas por trimestre: {datos: [...], niveles: [...]}
  datosDistribucion, // Datos para distribución de notas por asignatura: [{asignatura, datos, niveles}, ...]
  idioma = 'es',
  t = (key) => key
}, ref) => {
  const scatterRef = useRef(null);
  const correlationRef = useRef(null);
  const evolutionRef = useRef(null);
  // Array de refs para múltiples gráficas transversales
  const transversalRefs = useRef([]);
  // Array de refs para gráficas de distribución
  const distributionRefs = useRef([]);

  // Calcular número de grupos transversales
  const numGruposTransversal = Array.isArray(datosTransversal) ? datosTransversal.length : 0;
  const numDistribuciones = Array.isArray(datosDistribucion) ? datosDistribucion.length : 0;

  // Asegurar que tenemos suficientes refs
  if (transversalRefs.current.length !== numGruposTransversal) {
    transversalRefs.current = Array(numGruposTransversal).fill(null).map((_, i) =>
      transversalRefs.current[i] || { current: null }
    );
  }
  if (distributionRefs.current.length !== numDistribuciones) {
    distributionRefs.current = Array(numDistribuciones).fill(null).map((_, i) =>
      distributionRefs.current[i] || { current: null }
    );
  }

  // Exponer refs al componente padre
  useImperativeHandle(ref, () => ({
    scatterRef,
    correlationRef,
    evolutionRef,
    transversalRefs: transversalRefs.current,
    distributionRefs: distributionRefs.current
  }));

  // No renderizar si no está generando PDF
  if (!isGenerating) return null;

  // Calcular dominio máximo de desviación
  const maxDesviacion = datosDispersion?.length > 0
    ? Math.max(3, Math.ceil(Math.max(...datosDispersion.map(d => d.desviacion || 0)) + 0.5))
    : 3;

  return (
    <div
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '1200px',
        background: 'white',
        padding: '20px'
      }}
      aria-hidden="true"
    >
      {/* Mapa de Dispersión */}
      {datosDispersion && datosDispersion.length > 0 && (
        <div
          ref={scatterRef}
          style={{ width: '1200px', height: '700px', background: 'white', padding: '20px' }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px', textAlign: 'center' }}>
            {idioma === 'es' ? 'Mapa de Dispersión' : 'Mapa de Dispersió'}
          </h2>
          <ResponsiveContainer width="100%" height={620}>
            <ScatterChart margin={{ top: 30, right: 40, bottom: 80, left: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                dataKey="notaMedia"
                name={t('average')}
                domain={[0, 10]}
                stroke="#64748b"
                label={{
                  value: idioma === 'es' ? 'Nota Media' : 'Nota Mitjana',
                  position: 'bottom',
                  offset: 50,
                  style: { fill: '#475569', fontSize: 14, fontWeight: 600 }
                }}
              />
              <YAxis
                type="number"
                dataKey="desviacion"
                name={t('standardDeviation')}
                domain={[0, maxDesviacion]}
                stroke="#64748b"
                label={{
                  value: idioma === 'es' ? 'Desviación Estándar' : 'Desviació Estàndard',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 15,
                  style: { fill: '#475569', fontSize: 14, fontWeight: 600 }
                }}
              />
              <Tooltip content={<CustomTooltipDispersion />} />
              <Scatter
                data={datosDispersion}
                shape={(props) => {
                  const { cx, cy, payload } = props;
                  const mediaAlta = payload.notaMedia >= 7;
                  const desviacionAlta = payload.desviacion >= 1.5;

                  let color;
                  if (mediaAlta && !desviacionAlta) color = '#10b981'; // emerald
                  else if (mediaAlta && desviacionAlta) color = '#3b82f6'; // blue
                  else if (!mediaAlta && !desviacionAlta) color = '#f97316'; // orange
                  else color = '#f43f5e'; // rose

                  const radius = Math.min(25, Math.max(8, Math.sqrt(payload.alumnos || 10) * 2.5));

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
                        {payload.asignatura?.length > 18
                          ? payload.asignatura.substring(0, 18) + '...'
                          : payload.asignatura}
                      </text>
                    </g>
                  );
                }}
              />
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
          {/* Leyenda de cuadrantes */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
              <span style={{ fontSize: '12px', color: '#475569' }}>Alta media, baja dispersión</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
              <span style={{ fontSize: '12px', color: '#475569' }}>Alta media, alta dispersión</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#f97316' }}></div>
              <span style={{ fontSize: '12px', color: '#475569' }}>Baja media, baja dispersión</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#f43f5e' }}></div>
              <span style={{ fontSize: '12px', color: '#475569' }}>Baja media, alta dispersión</span>
            </div>
          </div>
        </div>
      )}

      {/* Evolución de Correlaciones */}
      {datosEvolucionCorrelaciones && datosEvolucionCorrelaciones.length > 0 && (
        <div
          ref={correlationRef}
          style={{ width: '1200px', height: '500px', background: 'white', padding: '20px', marginTop: '40px' }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px', textAlign: 'center' }}>
            {idioma === 'es' ? 'Evolución de Correlaciones por Nivel' : 'Evolució de Correlacions per Nivell'}
          </h2>
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={datosEvolucionCorrelaciones} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="par"
                stroke="#64748b"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                stroke="#64748b"
                domain={[-0.2, 1]}
                tickFormatter={(v) => (v || 0).toFixed(1)}
                label={{
                  value: idioma === 'es' ? 'Correlación' : 'Correlació',
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
                formatter={(value, name) => [value?.toFixed(3), name]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.parCompleto || label;
                  }
                  return label;
                }}
              />
              <Legend />
              {nivelesCorrelaciones?.map((nivel, idx) => (
                <Line
                  key={nivel}
                  type="monotone"
                  dataKey={nivel}
                  name={nivel}
                  stroke={COLORES_LINEAS[idx % COLORES_LINEAS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORES_LINEAS[idx % COLORES_LINEAS.length], r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparativa Transversal - Múltiples gráficas de 10 asignaturas cada una */}
      {Array.isArray(datosTransversal) && datosTransversal.map((grupo, grupoIdx) => (
        grupo?.datos?.length > 0 && grupo?.asignaturas?.length > 0 && (
          <div
            key={grupoIdx}
            ref={(el) => {
              if (transversalRefs.current[grupoIdx]) {
                transversalRefs.current[grupoIdx].current = el;
              }
            }}
            style={{ width: '1200px', height: '600px', background: 'white', padding: '20px', marginTop: '40px' }}
          >
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px', textAlign: 'center' }}>
              {grupo.titulo || (idioma === 'es'
                ? `Comparativa Transversal (${grupoIdx + 1}/${datosTransversal.length})`
                : `Comparativa Transversal (${grupoIdx + 1}/${datosTransversal.length})`)}
            </h2>
            <ResponsiveContainer width="100%" height={500}>
              <LineChart
                data={grupo.datos}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="nivel"
                  stroke="#64748b"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="#64748b"
                  domain={[0, 10]}
                  label={{
                    value: idioma === 'es' ? 'Nota Media' : 'Nota Mitjana',
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
                  formatter={(value, name) => [value?.toFixed(2), name]}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                {grupo.asignaturas.map((asig, idx) => (
                  <Line
                    key={asig}
                    type="monotone"
                    dataKey={asig}
                    name={asig}
                    stroke={COLORES_LINEAS[idx % COLORES_LINEAS.length]}
                    strokeWidth={2}
                    dot={{ fill: COLORES_LINEAS[idx % COLORES_LINEAS.length], r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      ))}

      {/* Evolución de Notas Medias por Trimestre */}
      {datosEvolucionNotas && datosEvolucionNotas.datos && datosEvolucionNotas.datos.length >= 2 && (
        <div
          ref={evolutionRef}
          style={{ width: '1200px', height: '600px', background: 'white', padding: '20px', marginTop: '40px' }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px', textAlign: 'center' }}>
            {idioma === 'es' ? 'Evolución de Notas Medias por Trimestre' : 'Evolució de Notes Mitjanes per Trimestre'}
          </h2>
          <ResponsiveContainer width="100%" height={520}>
            <LineChart
              data={datosEvolucionNotas.datos}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="trimestre"
                stroke="#64748b"
                tick={{ fontSize: 12 }}
                label={{
                  value: idioma === 'es' ? 'Trimestre' : 'Trimestre',
                  position: 'bottom',
                  offset: 40,
                  style: { fill: '#475569', fontSize: 14, fontWeight: 600 }
                }}
              />
              <YAxis
                stroke="#64748b"
                domain={[0, 10]}
                label={{
                  value: idioma === 'es' ? 'Nota Media' : 'Nota Mitjana',
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
                formatter={(value, name) => [value?.toFixed(2), name]}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              {datosEvolucionNotas.niveles?.map((nivel, idx) => (
                <Line
                  key={nivel}
                  type="monotone"
                  dataKey={nivel}
                  name={nivel}
                  stroke={COLORES_LINEAS[idx % COLORES_LINEAS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORES_LINEAS[idx % COLORES_LINEAS.length], r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Distribución de Notas por Asignatura - Una gráfica por asignatura con líneas por curso */}
      {Array.isArray(datosDistribucion) && datosDistribucion.map((item, itemIdx) => (
        item?.datos?.length > 0 && item?.niveles?.length > 0 && (
          <div
            key={itemIdx}
            ref={(el) => {
              if (distributionRefs.current[itemIdx]) {
                distributionRefs.current[itemIdx].current = el;
              }
            }}
            style={{ width: '1200px', height: '550px', background: 'white', padding: '20px', marginTop: '40px' }}
          >
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1e293b', marginBottom: '15px', textAlign: 'center' }}>
              {idioma === 'es' ? 'Distribución de Notas: ' : 'Distribució de Notes: '}{item.asignatura}
            </h2>
            <ResponsiveContainer width="100%" height={470}>
              <LineChart
                data={item.datos}
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="nota"
                  stroke="#64748b"
                  tick={{ fontSize: 12 }}
                  label={{
                    value: idioma === 'es' ? 'Nota' : 'Nota',
                    position: 'bottom',
                    offset: 35,
                    style: { fill: '#475569', fontSize: 14, fontWeight: 600 }
                  }}
                />
                <YAxis
                  stroke="#64748b"
                  domain={[0, 'auto']}
                  label={{
                    value: idioma === 'es' ? '% Alumnos' : '% Alumnes',
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
                  formatter={(value, name) => [`${value?.toFixed(1)}%`, name]}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                {/* Línea vertical de referencia para el aprobado (nota 5) */}
                <ReferenceLine x={5} stroke="#dc2626" strokeDasharray="5 5" strokeWidth={2} />
                {item.niveles.map((nivel, idx) => (
                  <Line
                    key={nivel}
                    type="monotone"
                    dataKey={nivel}
                    name={nivel}
                    stroke={COLORES_LINEAS[idx % COLORES_LINEAS.length]}
                    strokeWidth={2}
                    dot={{ fill: COLORES_LINEAS[idx % COLORES_LINEAS.length], r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      ))}
    </div>
  );
});

PDFChartRenderer.displayName = 'PDFChartRenderer';

export default PDFChartRenderer;
