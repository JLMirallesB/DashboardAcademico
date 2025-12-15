import React from 'react';

/**
 * Componente KPIComparativa - Vista comparativa
 * EPM: Centro | Teórica Troncal | Especialidades | No Especialidades (4 columnas)
 * Otros: Especialidades | Centro | No Especialidades (3 columnas)
 * Con relaciones porcentuales respecto al centro
 */
const KPIComparativa = ({ kpis, t, modoEtapa }) => {
  if (!kpis) return null;

  // Calcular diferencias porcentuales con respecto al centro
  const calcularRelacion = (valor, valorCentro) => {
    if (!valorCentro || valorCentro === 0) return 0;
    const diff = ((valor - valorCentro) / valorCentro) * 100;
    return diff;
  };

  const renderRelacion = (diff) => {
    const isPositive = diff > 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const icon = isPositive ? '↑' : '↓';
    return (
      <span className={`text-xs font-medium ${color} ml-1`}>
        {icon} {Math.abs(diff).toFixed(1)}%
      </span>
    );
  };

  const metricas = [
    {
      key: 'notaMedia',
      label: t('avgGrade') || 'Nota Media',
      centro: kpis.notaMediaCentro,
      teoricaTroncal: kpis.notaMediaTeoricaTroncal,
      especialidades: kpis.notaMediaEspecialidades,
      noEspecialidades: kpis.notaMediaNoEspecialidades,
      formato: (val) => (val || 0).toFixed(2),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      key: 'desviacion',
      label: t('kpiStdDev') || 'Desviación Típica',
      centro: kpis.desviacionCentro,
      teoricaTroncal: kpis.desviacionTeoricaTroncal,
      especialidades: kpis.desviacionEspecialidades,
      noEspecialidades: kpis.desviacionNoEspecialidades,
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
      centro: kpis.modaCentro,
      teoricaTroncal: kpis.modaTeoricaTroncal,
      especialidades: kpis.modaEspecialidades,
      noEspecialidades: kpis.modaNoEspecialidades,
      formato: (val) => (val || 0).toFixed(0),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      key: 'aprobados',
      label: t('passed') || '% Aprobados',
      centro: kpis.aprobadosCentro,
      teoricaTroncal: kpis.aprobadosTeoricaTroncal,
      especialidades: kpis.aprobadosEspecialidades,
      noEspecialidades: kpis.aprobadosNoEspecialidades,
      formato: (val) => `${(val || 0).toFixed(1)}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      key: 'suspendidos',
      label: t('failed') || '% Suspendidos',
      centro: kpis.suspendidosCentro,
      teoricaTroncal: kpis.suspendidosTeoricaTroncal,
      especialidades: kpis.suspendidosEspecialidades,
      noEspecialidades: kpis.suspendidosNoEspecialidades,
      formato: (val) => `${(val || 0).toFixed(1)}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  // En EPM: 4 columnas (Centro, Teórica Troncal, Especialidades, No Especialidades)
  // En otros modos: 3 columnas (Especialidades, Centro, No Especialidades)
  if (modoEtapa === 'EPM') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-300">
                Métrica
              </th>
              <th className="p-4 text-center text-sm font-semibold text-blue-700 border-b-2 border-blue-300 bg-blue-50">
                {t('center') || 'Centro'}
              </th>
              <th className="p-4 text-center text-sm font-semibold text-cyan-700 border-b-2 border-cyan-300 bg-cyan-50">
                Teórica Troncal
              </th>
              <th className="p-4 text-center text-sm font-semibold text-amber-700 border-b-2 border-amber-300 bg-amber-50">
                {t('specialties') || 'Especialidades'}
              </th>
              <th className="p-4 text-center text-sm font-semibold text-purple-700 border-b-2 border-purple-300 bg-purple-50">
                {t('nonSpecialties') || 'No Especialidades'}
              </th>
            </tr>
          </thead>
          <tbody>
            {metricas.map((metrica, idx) => {
              const diffTT = calcularRelacion(metrica.teoricaTroncal, metrica.centro);
              const diffEsp = calcularRelacion(metrica.especialidades, metrica.centro);
              const diffNoEsp = calcularRelacion(metrica.noEspecialidades, metrica.centro);

              return (
                <tr key={metrica.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  {/* Métrica */}
                  <td className="p-4 border-b border-slate-200">
                    <div className="flex items-center gap-2 text-slate-700">
                      {metrica.icon}
                      <span className="font-medium">{metrica.label}</span>
                    </div>
                  </td>

                  {/* Centro */}
                  <td className="p-4 text-center border-b border-blue-200 bg-blue-50/30">
                    <span className="text-2xl font-bold text-blue-900">
                      {metrica.formato(metrica.centro)}
                    </span>
                  </td>

                  {/* Teórica Troncal */}
                  <td className="p-4 text-center border-b border-cyan-200 bg-cyan-50/30">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-cyan-900">
                        {metrica.formato(metrica.teoricaTroncal)}
                      </span>
                      {renderRelacion(diffTT)}
                    </div>
                  </td>

                  {/* Especialidades */}
                  <td className="p-4 text-center border-b border-amber-200 bg-amber-50/30">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-amber-900">
                        {metrica.formato(metrica.especialidades)}
                      </span>
                      {renderRelacion(diffEsp)}
                    </div>
                  </td>

                  {/* No Especialidades */}
                  <td className="p-4 text-center border-b border-purple-200 bg-purple-50/30">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-purple-900">
                        {metrica.formato(metrica.noEspecialidades)}
                      </span>
                      {renderRelacion(diffNoEsp)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Leyenda */}
        <div className="mt-4 p-3 bg-slate-100 rounded-lg">
          <p className="text-xs text-slate-600 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('comparisonLegend') || 'Las flechas indican la diferencia porcentual con respecto al centro. Verde (↑) = superior, Rojo (↓) = inferior.'}
          </p>
        </div>
      </div>
    );
  }

  // Modo EEM/TODOS: 3 columnas
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="p-4 text-left text-sm font-semibold text-slate-700 border-b-2 border-slate-300">
              Métrica
            </th>
            <th className="p-4 text-center text-sm font-semibold text-amber-700 border-b-2 border-amber-300 bg-amber-50">
              {t('specialties') || 'Especialidades'}
            </th>
            <th className="p-4 text-center text-sm font-semibold text-blue-700 border-b-2 border-blue-300 bg-blue-50">
              {t('center') || 'Centro'}
            </th>
            <th className="p-4 text-center text-sm font-semibold text-purple-700 border-b-2 border-purple-300 bg-purple-50">
              {t('nonSpecialties') || 'No Especialidades'}
            </th>
          </tr>
        </thead>
        <tbody>
          {metricas.map((metrica, idx) => {
            const diffEsp = calcularRelacion(metrica.especialidades, metrica.centro);
            const diffNoEsp = calcularRelacion(metrica.noEspecialidades, metrica.centro);

            return (
              <tr key={metrica.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {/* Métrica */}
                <td className="p-4 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-slate-700">
                    {metrica.icon}
                    <span className="font-medium">{metrica.label}</span>
                  </div>
                </td>

                {/* Especialidades */}
                <td className="p-4 text-center border-b border-amber-200 bg-amber-50/30">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-amber-900">
                      {metrica.formato(metrica.especialidades)}
                    </span>
                    {renderRelacion(diffEsp)}
                  </div>
                </td>

                {/* Centro */}
                <td className="p-4 text-center border-b border-blue-200 bg-blue-50/30">
                  <span className="text-2xl font-bold text-blue-900">
                    {metrica.formato(metrica.centro)}
                  </span>
                </td>

                {/* No Especialidades */}
                <td className="p-4 text-center border-b border-purple-200 bg-purple-50/30">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-purple-900">
                      {metrica.formato(metrica.noEspecialidades)}
                    </span>
                    {renderRelacion(diffNoEsp)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Leyenda */}
      <div className="mt-4 p-3 bg-slate-100 rounded-lg">
        <p className="text-xs text-slate-600 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('comparisonLegend') || 'Las flechas indican la diferencia porcentual con respecto al centro. Verde (↑) = superior, Rojo (↓) = inferior.'}
        </p>
      </div>
    </div>
  );
};

export default KPIComparativa;
