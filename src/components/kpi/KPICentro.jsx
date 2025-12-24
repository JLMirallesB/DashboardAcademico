import React from 'react';

/**
 * Componente KPICentro - Vista de KPIs del Centro
 * Muestra: Nota media, desviación, moda, aprobados, suspendidos, asignaturas difíciles/fáciles y alumnos por curso
 * En modo TODOS muestra comparativa EEM vs EPM
 */
const KPICentro = ({ kpis, t, modoEtapa }) => {
  if (!kpis) return null;

  // En modo TODOS con datos comparativos
  if (modoEtapa === 'TODOS' && kpis.modoComparativo) {
    return <KPICentroComparativo kpis={kpis} t={t} />;
  }

  return (
    <div className="space-y-6">
      {/* KPIs Principales del Centro */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Nota Media del Centro */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs font-medium text-blue-700">{t('kpiCenterAvg')}</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">{(kpis.notaMediaCentro || 0).toFixed(2)}</div>
        </div>

        {/* Desviación Típica del Centro */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <span className="text-xs font-medium text-indigo-700">{t('kpiStdDev')}</span>
          </div>
          <div className="text-3xl font-bold text-indigo-900">{(kpis.desviacionCentro || 0).toFixed(2)}</div>
        </div>

        {/* Moda del Centro */}
        <div className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-xs font-medium text-violet-700">{t('kpiMode')}</span>
          </div>
          <div className="text-3xl font-bold text-violet-900">{(kpis.modaCentro || 0).toFixed(0)}</div>
        </div>

        {/* % Aprobados Total */}
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium text-teal-700">{t('kpiPassedAvg')}</span>
          </div>
          <div className="text-3xl font-bold text-teal-900">{(kpis.aprobadosCentro || 0).toFixed(1)}%</div>
        </div>

        {/* % Suspendidos Total */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium text-rose-700">{t('kpiFailedAvg')}</span>
          </div>
          <div className="text-3xl font-bold text-rose-900">{(kpis.suspendidosCentro || 0).toFixed(1)}%</div>
        </div>
      </div>

      {/* Asignaturas Difíciles y Fáciles */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-medium text-red-700">{t('kpiDifficult')}</span>
          </div>
          <div className="text-3xl font-bold text-red-900">{kpis.asignaturasDificiles || 0}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span className="text-xs font-medium text-green-700">{t('kpiEasy')}</span>
          </div>
          <div className="text-3xl font-bold text-green-900">{kpis.asignaturasFaciles || 0}</div>
        </div>
      </div>

      {/* Alumnos por Curso */}
      {kpis.alumnosPorCurso && kpis.alumnosPorCurso.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {t('studentsPerCourse') || 'Alumnos por Curso'}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {kpis.alumnosPorCurso.map(({ nivel, alumnos }) => (
              <div key={nivel} className="bg-white border border-amber-300 rounded-lg p-2 text-center">
                <div className="text-xs font-medium text-amber-700">{nivel}</div>
                <div className="text-xl font-bold text-amber-900">{alumnos}</div>
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
 */
const KPICentroComparativo = ({ kpis, t }) => {
  const { kpisEEM, kpisEPM } = kpis;

  // Si no hay datos de ninguna etapa
  if (!kpisEEM && !kpisEPM) {
    return (
      <div className="text-center text-slate-500 py-8">
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
      formato: (val) => (val || 0).toFixed(2),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      key: 'desviacion',
      label: t('kpiStdDev') || 'Desviacion',
      valorEEM: kpisEEM?.desviacionCentro,
      valorEPM: kpisEPM?.desviacionCentro,
      formato: (val) => (val || 0).toFixed(2),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
    {
      key: 'moda',
      label: t('kpiMode') || 'Moda',
      valorEEM: kpisEEM?.modaCentro,
      valorEPM: kpisEPM?.modaCentro,
      formato: (val) => (val || 0).toFixed(0),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      key: 'aprobados',
      label: t('kpiPassedAvg') || '% Aprobados',
      valorEEM: kpisEEM?.aprobadosCentro,
      valorEPM: kpisEPM?.aprobadosCentro,
      formato: (val) => `${(val || 0).toFixed(1)}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      key: 'suspendidos',
      label: t('kpiFailedAvg') || '% Suspendidos',
      valorEEM: kpisEEM?.suspendidosCentro,
      valorEPM: kpisEPM?.suspendidosCentro,
      formato: (val) => `${(val || 0).toFixed(1)}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      key: 'dificiles',
      label: t('kpiDifficult') || 'Asig. Dificiles',
      valorEEM: kpisEEM?.asignaturasDificiles,
      valorEPM: kpisEPM?.asignaturasDificiles,
      formato: (val) => val || 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    {
      key: 'faciles',
      label: t('kpiEasy') || 'Asig. Faciles',
      valorEEM: kpisEEM?.asignaturasFaciles,
      valorEPM: kpisEPM?.asignaturasFaciles,
      formato: (val) => val || 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        </svg>
      )
    },
    {
      key: 'alumnos',
      label: t('totalStudents') || 'Total Alumnos',
      valorEEM: kpisEEM?.totalAlumnos,
      valorEPM: kpisEPM?.totalAlumnos,
      formato: (val) => val || 0,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Tabla comparativa EEM vs EPM */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-300">
                {t('metric') || 'Metrica'}
              </th>
              <th className="p-4 text-center text-sm font-semibold text-emerald-700 border-b-2 border-emerald-300 bg-emerald-50">
                EEM
              </th>
              <th className="p-4 text-center text-sm font-semibold text-purple-700 border-b-2 border-purple-300 bg-purple-50">
                EPM
              </th>
            </tr>
          </thead>
          <tbody>
            {metricas.map((metrica, idx) => (
              <tr key={metrica.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {/* Metrica */}
                <td className="p-4 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-slate-700">
                    {metrica.icon}
                    <span className="font-medium">{metrica.label}</span>
                  </div>
                </td>

                {/* EEM */}
                <td className="p-4 text-center border-b border-emerald-200 bg-emerald-50/30">
                  <span className="text-2xl font-bold text-emerald-900">
                    {kpisEEM ? metrica.formato(metrica.valorEEM) : '-'}
                  </span>
                </td>

                {/* EPM */}
                <td className="p-4 text-center border-b border-purple-200 bg-purple-50/30">
                  <span className="text-2xl font-bold text-purple-900">
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
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {t('studentsPerCourse') || 'Alumnos por Curso'}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
            {kpis.alumnosPorCurso.map(({ nivel, alumnos, etapa }) => (
              <div
                key={nivel}
                className={`border rounded-lg p-2 text-center ${
                  etapa === 'EEM'
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-purple-50 border-purple-300'
                }`}
              >
                <div className={`text-xs font-medium ${
                  etapa === 'EEM' ? 'text-emerald-700' : 'text-purple-700'
                }`}>{nivel}</div>
                <div className={`text-xl font-bold ${
                  etapa === 'EEM' ? 'text-emerald-900' : 'text-purple-900'
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
