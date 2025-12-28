import React from 'react';

/**
 * Componente KPICentro - Vista de KPIs del Centro
 * Diseño Minimalista: Cards blancas con bordes, sin gradientes
 * Muestra: Nota media, desviación, moda, aprobados, suspendidos, asignaturas difíciles/fáciles y alumnos por curso
 * En modo TODOS muestra comparativa EEM vs EPM
 */
const KPICentro = ({ kpis, t, modoEtapa }) => {
  if (!kpis) return null;

  // En modo TODOS con datos comparativos
  if (modoEtapa === 'TODOS' && kpis.modoComparativo) {
    return <KPICentroComparativo kpis={kpis} t={t} />;
  }

  // Determinar si hay valores críticos para mostrar indicadores
  const suspendidosCritico = (kpis.suspendidosCentro || 0) > 30;
  const asignaturasDificilesCritico = (kpis.asignaturasDificiles || 0) > 0;

  return (
    <div className="space-y-6">
      {/* KPIs Principales del Centro */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {/* Nota Media del Centro */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 hover:border-gray-900 transition-colors">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('kpiCenterAvg')}</span>
          <div className="text-3xl font-bold text-gray-900 mt-2">{(kpis.notaMediaCentro || 0).toFixed(2)}</div>
          <div className="mt-3 h-0.5 bg-gray-900"></div>
        </div>

        {/* Desviación Típica del Centro */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 hover:border-gray-900 transition-colors">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('kpiStdDev')}</span>
          <div className="text-3xl font-bold text-gray-900 mt-2">{(kpis.desviacionCentro || 0).toFixed(2)}</div>
          <div className="mt-3 h-0.5 bg-gray-400"></div>
        </div>

        {/* Moda del Centro */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 hover:border-gray-900 transition-colors">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('kpiMode')}</span>
          <div className="text-3xl font-bold text-gray-900 mt-2">{(kpis.modaCentro || 0).toFixed(0)}</div>
          <div className="mt-3 h-0.5 bg-gray-400"></div>
        </div>

        {/* % Aprobados Total */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 hover:border-gray-900 transition-colors">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('kpiPassedAvg')}</span>
          <div className="text-3xl font-bold text-gray-900 mt-2">{(kpis.aprobadosCentro || 0).toFixed(1)}%</div>
          <div className="mt-3 h-0.5 bg-emerald-500"></div>
        </div>

        {/* % Suspendidos Total - con indicador crítico si aplica */}
        <div className={`bg-white rounded-lg p-6 transition-colors ${
          suspendidosCritico
            ? 'border-l-4 border-l-red-500 border-r border-t border-b border-gray-300'
            : 'border border-gray-300 hover:border-gray-900'
        }`}>
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('kpiFailedAvg')}</span>
          <div className="text-3xl font-bold text-gray-900 mt-2">{(kpis.suspendidosCentro || 0).toFixed(1)}%</div>
          {suspendidosCritico && (
            <span className="text-xs text-red-600 mt-1 block">{t('aboveThreshold') || 'Por encima del umbral'}</span>
          )}
          {!suspendidosCritico && <div className="mt-3 h-0.5 bg-gray-400"></div>}
        </div>
      </div>

      {/* Asignaturas Difíciles y Fáciles */}
      <div className="grid grid-cols-2 gap-6">
        {/* Asignaturas Difíciles - con indicador crítico si hay alguna */}
        <div className={`bg-white rounded-lg p-6 transition-colors ${
          asignaturasDificilesCritico
            ? 'border-l-4 border-l-red-500 border-r border-t border-b border-gray-300'
            : 'border border-gray-300 hover:border-gray-900'
        }`}>
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('kpiDifficult')}</span>
          <div className="text-3xl font-bold text-gray-900 mt-2">{kpis.asignaturasDificiles || 0}</div>
          {asignaturasDificilesCritico && (
            <span className="text-xs text-red-600 mt-1 block">{t('requiresAttention') || 'Requiere atención'}</span>
          )}
          {!asignaturasDificilesCritico && <div className="mt-3 h-0.5 bg-gray-400"></div>}
        </div>

        {/* Asignaturas Fáciles */}
        <div className="bg-white border border-gray-300 rounded-lg p-6 hover:border-gray-900 transition-colors">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('kpiEasy')}</span>
          <div className="text-3xl font-bold text-gray-900 mt-2">{kpis.asignaturasFaciles || 0}</div>
          <div className="mt-3 h-0.5 bg-emerald-500"></div>
        </div>
      </div>

      {/* Alumnos por Curso */}
      {kpis.alumnosPorCurso && kpis.alumnosPorCurso.length > 0 && (
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4">
            {t('studentsPerCourse') || 'Alumnos por Curso'}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {kpis.alumnosPorCurso.map(({ nivel, alumnos }) => (
              <div key={nivel} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center hover:border-gray-400 transition-colors">
                <div className="text-xs font-medium text-gray-600">{nivel}</div>
                <div className="text-xl font-bold text-gray-900">{alumnos}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Componente para vista comparativa EEM vs EPM en modo TODOS
 * Diseño Minimalista: Tabla limpia con bordes oscuros
 */
const KPICentroComparativo = ({ kpis, t }) => {
  const { kpisEEM, kpisEPM } = kpis;

  // Si no hay datos de ninguna etapa
  if (!kpisEEM && !kpisEPM) {
    return (
      <div className="text-center text-gray-500 py-8">
        {t('noDataAvailable') || 'No hay datos disponibles para esta evaluación'}
      </div>
    );
  }

  const metricas = [
    {
      key: 'notaMedia',
      label: t('kpiCenterAvg') || 'Nota Media',
      valorEEM: kpisEEM?.notaMediaCentro,
      valorEPM: kpisEPM?.notaMediaCentro,
      formato: (val) => (val || 0).toFixed(2)
    },
    {
      key: 'desviacion',
      label: t('kpiStdDev') || 'Desviación',
      valorEEM: kpisEEM?.desviacionCentro,
      valorEPM: kpisEPM?.desviacionCentro,
      formato: (val) => (val || 0).toFixed(2)
    },
    {
      key: 'moda',
      label: t('kpiMode') || 'Moda',
      valorEEM: kpisEEM?.modaCentro,
      valorEPM: kpisEPM?.modaCentro,
      formato: (val) => (val || 0).toFixed(0)
    },
    {
      key: 'aprobados',
      label: t('kpiPassedAvg') || '% Aprobados',
      valorEEM: kpisEEM?.aprobadosCentro,
      valorEPM: kpisEPM?.aprobadosCentro,
      formato: (val) => `${(val || 0).toFixed(1)}%`
    },
    {
      key: 'suspendidos',
      label: t('kpiFailedAvg') || '% Suspendidos',
      valorEEM: kpisEEM?.suspendidosCentro,
      valorEPM: kpisEPM?.suspendidosCentro,
      formato: (val) => `${(val || 0).toFixed(1)}%`
    },
    {
      key: 'dificiles',
      label: t('kpiDifficult') || 'Asig. Difíciles',
      valorEEM: kpisEEM?.asignaturasDificiles,
      valorEPM: kpisEPM?.asignaturasDificiles,
      formato: (val) => val || 0
    },
    {
      key: 'faciles',
      label: t('kpiEasy') || 'Asig. Fáciles',
      valorEEM: kpisEEM?.asignaturasFaciles,
      valorEPM: kpisEPM?.asignaturasFaciles,
      formato: (val) => val || 0
    },
    {
      key: 'alumnos',
      label: t('totalStudents') || 'Total Alumnos',
      valorEEM: kpisEEM?.totalAlumnos,
      valorEPM: kpisEPM?.totalAlumnos,
      formato: (val) => val || 0
    }
  ];

  return (
    <div className="space-y-6">
      {/* Tabla comparativa EEM vs EPM - Estilo minimalista */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="text-left py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                {t('metric') || 'Métrica'}
              </th>
              <th className="text-center py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide bg-gray-50">
                EEM
              </th>
              <th className="text-center py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                EPM
              </th>
            </tr>
          </thead>
          <tbody>
            {metricas.map((metrica, idx) => (
              <tr key={metrica.key} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                {/* Métrica */}
                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                  {metrica.label}
                </td>

                {/* EEM */}
                <td className="py-3 px-4 text-center bg-gray-50/50">
                  <span className="text-xl font-bold text-gray-900">
                    {kpisEEM ? metrica.formato(metrica.valorEEM) : '-'}
                  </span>
                </td>

                {/* EPM */}
                <td className="py-3 px-4 text-center">
                  <span className="text-xl font-bold text-gray-900">
                    {kpisEPM ? metrica.formato(metrica.valorEPM) : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alumnos por Curso (ambas etapas) */}
      {kpis.alumnosPorCurso && kpis.alumnosPorCurso.length > 0 && (
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4">
            {t('studentsPerCourse') || 'Alumnos por Curso'}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
            {kpis.alumnosPorCurso.map(({ nivel, alumnos, etapa }) => (
              <div
                key={nivel}
                className={`border rounded-lg p-3 text-center transition-colors ${
                  etapa === 'EEM'
                    ? 'bg-gray-50 border-gray-300 hover:border-gray-500'
                    : 'bg-gray-900 border-gray-900'
                }`}
              >
                <div className={`text-xs font-medium ${
                  etapa === 'EEM' ? 'text-gray-600' : 'text-gray-300'
                }`}>{nivel}</div>
                <div className={`text-xl font-bold ${
                  etapa === 'EEM' ? 'text-gray-900' : 'text-white'
                }`}>{alumnos}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default KPICentro;
