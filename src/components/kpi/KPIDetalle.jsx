import React from 'react';

/**
 * Componente KPIDetalle - Vista detallada de Especialidades vs No Especialidades
 * Diseño Minimalista: Cards blancas con bordes, sin gradientes ni colores
 * En EPM muestra 3 columnas: Teórica Troncal, Especialidades, No Especialidades
 * En EEM muestra 2 columnas: Especialidades, No Especialidades
 * En TODOS muestra comparativa de Especialidades EEM vs EPM
 */
const KPIDetalle = ({ kpis, t, modoEtapa }) => {
  if (!kpis) return null;

  // En modo TODOS con datos comparativos
  if (modoEtapa === 'TODOS' && kpis.modoComparativo) {
    return <KPIDetalleComparativo kpis={kpis} t={t} />;
  }

  // Configuración de grupos con estilo minimalista
  const teoricaTroncal = {
    titulo: 'Teórica Troncal',
    notaMedia: kpis.notaMediaTeoricaTroncal,
    desviacion: kpis.desviacionTeoricaTroncal,
    moda: kpis.modaTeoricaTroncal,
    aprobados: kpis.aprobadosTeoricaTroncal,
    suspendidos: kpis.suspendidosTeoricaTroncal
  };

  const especialidades = {
    titulo: t('specialties') || 'Especialidades',
    notaMedia: kpis.notaMediaEspecialidades,
    desviacion: kpis.desviacionEspecialidades,
    moda: kpis.modaEspecialidades,
    aprobados: kpis.aprobadosEspecialidades,
    suspendidos: kpis.suspendidosEspecialidades
  };

  const noEspecialidades = {
    titulo: t('nonSpecialties') || 'No Especialidades',
    notaMedia: kpis.notaMediaNoEspecialidades,
    desviacion: kpis.desviacionNoEspecialidades,
    moda: kpis.modaNoEspecialidades,
    aprobados: kpis.aprobadosNoEspecialidades,
    suspendidos: kpis.suspendidosNoEspecialidades
  };

  const renderGrupo = (grupo) => (
    <div className="space-y-3">
      <h4 className="text-lg font-bold text-gray-900 text-center mb-4">{grupo.titulo}</h4>

      {/* Nota Media */}
      <div className="bg-white border border-gray-300 rounded-lg p-4 hover:border-gray-900 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('avgGrade') || 'Nota Media'}</span>
        </div>
        <div className="text-3xl font-bold text-gray-900">{(grupo.notaMedia || 0).toFixed(2)}</div>
        <div className="mt-3 h-0.5 bg-gray-900"></div>
      </div>

      {/* Desviación Típica */}
      <div className="bg-white border border-gray-300 rounded-lg p-4 hover:border-gray-900 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('kpiStdDev') || 'Desviación Típica'}</span>
        </div>
        <div className="text-3xl font-bold text-gray-900">{(grupo.desviacion || 0).toFixed(2)}</div>
        <div className="mt-3 h-0.5 bg-gray-400"></div>
      </div>

      {/* Moda */}
      <div className="bg-white border border-gray-300 rounded-lg p-4 hover:border-gray-900 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('kpiMode') || 'Moda'}</span>
        </div>
        <div className="text-3xl font-bold text-gray-900">{(grupo.moda || 0).toFixed(0)}</div>
        <div className="mt-3 h-0.5 bg-gray-400"></div>
      </div>

      {/* % Aprobados */}
      <div className="bg-white border border-gray-300 rounded-lg p-4 hover:border-gray-900 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('passed') || '% Aprobados'}</span>
        </div>
        <div className="text-3xl font-bold text-gray-900">{(grupo.aprobados || 0).toFixed(1)}%</div>
        <div className="mt-3 h-0.5 bg-emerald-500"></div>
      </div>

      {/* % Suspendidos */}
      <div className="bg-white border border-gray-300 rounded-lg p-4 hover:border-gray-900 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">{t('failed') || '% Suspendidos'}</span>
        </div>
        <div className="text-3xl font-bold text-gray-900">{(grupo.suspendidos || 0).toFixed(1)}%</div>
        <div className="mt-3 h-0.5 bg-gray-400"></div>
      </div>
    </div>
  );

  // En EPM mostrar 3 columnas, en otros modos 2 columnas
  if (modoEtapa === 'EPM') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderGrupo(teoricaTroncal)}
        {renderGrupo(especialidades)}
        {renderGrupo(noEspecialidades)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {renderGrupo(especialidades)}
      {renderGrupo(noEspecialidades)}
    </div>
  );
};

/**
 * Componente para vista comparativa de Especialidades EEM vs EPM en modo TODOS
 * Diseño Minimalista: Tabla con bordes oscuros
 */
const KPIDetalleComparativo = ({ kpis, t }) => {
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
      label: t('avgGrade') || 'Nota Media',
      valorEEM: kpisEEM?.notaMediaEspecialidades,
      valorEPM: kpisEPM?.notaMediaEspecialidades,
      formato: (val) => (val || 0).toFixed(2)
    },
    {
      key: 'desviacion',
      label: t('kpiStdDev') || 'Desviación',
      valorEEM: kpisEEM?.desviacionEspecialidades,
      valorEPM: kpisEPM?.desviacionEspecialidades,
      formato: (val) => (val || 0).toFixed(2)
    },
    {
      key: 'moda',
      label: t('kpiMode') || 'Moda',
      valorEEM: kpisEEM?.modaEspecialidades,
      valorEPM: kpisEPM?.modaEspecialidades,
      formato: (val) => (val || 0).toFixed(0)
    },
    {
      key: 'aprobados',
      label: t('passed') || '% Aprobados',
      valorEEM: kpisEEM?.aprobadosEspecialidades,
      valorEPM: kpisEPM?.aprobadosEspecialidades,
      formato: (val) => `${(val || 0).toFixed(1)}%`
    },
    {
      key: 'suspendidos',
      label: t('failed') || '% Suspendidos',
      valorEEM: kpisEEM?.suspendidosEspecialidades,
      valorEPM: kpisEPM?.suspendidosEspecialidades,
      formato: (val) => `${(val || 0).toFixed(1)}%`
    }
  ];

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-bold text-gray-900 text-center">
        {t('specialtiesComparison') || 'Comparativa de Especialidades'}
      </h4>

      {/* Tabla comparativa Especialidades EEM vs EPM - Estilo minimalista */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="text-left py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                {t('metric') || 'Métrica'}
              </th>
              <th className="text-center py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide bg-gray-50">
                {t('specialtiesEEM') || 'Especialidades EEM'}
              </th>
              <th className="text-center py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                {t('specialtiesEPM') || 'Especialidades EPM'}
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

                {/* Especialidades EEM */}
                <td className="py-3 px-4 text-center bg-gray-50/50">
                  <span className="text-xl font-bold text-gray-900">
                    {kpisEEM ? metrica.formato(metrica.valorEEM) : '-'}
                  </span>
                </td>

                {/* Especialidades EPM */}
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
    </div>
  );
};

export default KPIDetalle;
