import React from 'react';

/**
 * Componente KPIComparativa - Vista comparativa
 * Diseño Minimalista: Tabla con bordes oscuros, sin colores de fondo
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
    const color = isPositive ? 'text-emerald-600' : 'text-red-600';
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
      formato: (val) => (val || 0).toFixed(2)
    },
    {
      key: 'desviacion',
      label: t('kpiStdDev') || 'Desviación Típica',
      centro: kpis.desviacionCentro,
      teoricaTroncal: kpis.desviacionTeoricaTroncal,
      especialidades: kpis.desviacionEspecialidades,
      noEspecialidades: kpis.desviacionNoEspecialidades,
      formato: (val) => (val || 0).toFixed(2)
    },
    {
      key: 'moda',
      label: t('kpiMode') || 'Moda',
      centro: kpis.modaCentro,
      teoricaTroncal: kpis.modaTeoricaTroncal,
      especialidades: kpis.modaEspecialidades,
      noEspecialidades: kpis.modaNoEspecialidades,
      formato: (val) => (val || 0).toFixed(0)
    },
    {
      key: 'aprobados',
      label: t('passed') || '% Aprobados',
      centro: kpis.aprobadosCentro,
      teoricaTroncal: kpis.aprobadosTeoricaTroncal,
      especialidades: kpis.aprobadosEspecialidades,
      noEspecialidades: kpis.aprobadosNoEspecialidades,
      formato: (val) => `${(val || 0).toFixed(1)}%`
    },
    {
      key: 'suspendidos',
      label: t('failed') || '% Suspendidos',
      centro: kpis.suspendidosCentro,
      teoricaTroncal: kpis.suspendidosTeoricaTroncal,
      especialidades: kpis.suspendidosEspecialidades,
      noEspecialidades: kpis.suspendidosNoEspecialidades,
      formato: (val) => `${(val || 0).toFixed(1)}%`
    }
  ];

  // En EPM: 4 columnas (Centro, Teórica Troncal, Especialidades, No Especialidades)
  // En otros modos: 3 columnas (Especialidades, Centro, No Especialidades)
  if (modoEtapa === 'EPM') {
    return (
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="text-left py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                {t('metric') || 'Métrica'}
              </th>
              <th className="text-center py-4 px-4 text-xs font-bold text-white uppercase tracking-wide bg-gray-900">
                {t('center') || 'Centro'}
              </th>
              <th className="text-center py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide bg-gray-50">
                Teórica Troncal
              </th>
              <th className="text-center py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
                {t('specialties') || 'Especialidades'}
              </th>
              <th className="text-center py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide bg-gray-50">
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
                <tr key={metrica.key} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  {/* Métrica */}
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {metrica.label}
                  </td>

                  {/* Centro */}
                  <td className="py-3 px-4 text-center bg-gray-100">
                    <span className="text-xl font-bold text-gray-900">
                      {metrica.formato(metrica.centro)}
                    </span>
                  </td>

                  {/* Teórica Troncal */}
                  <td className="py-3 px-4 text-center bg-gray-50/50">
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-bold text-gray-900">
                        {metrica.formato(metrica.teoricaTroncal)}
                      </span>
                      {renderRelacion(diffTT)}
                    </div>
                  </td>

                  {/* Especialidades */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-bold text-gray-900">
                        {metrica.formato(metrica.especialidades)}
                      </span>
                      {renderRelacion(diffEsp)}
                    </div>
                  </td>

                  {/* No Especialidades */}
                  <td className="py-3 px-4 text-center bg-gray-50/50">
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-bold text-gray-900">
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
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 flex items-center gap-2">
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
    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-900">
            <th className="text-left py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide">
              {t('metric') || 'Métrica'}
            </th>
            <th className="text-center py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide bg-gray-50">
              {t('specialties') || 'Especialidades'}
            </th>
            <th className="text-center py-4 px-4 text-xs font-bold text-white uppercase tracking-wide bg-gray-900">
              {t('center') || 'Centro'}
            </th>
            <th className="text-center py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide bg-gray-50">
              {t('nonSpecialties') || 'No Especialidades'}
            </th>
          </tr>
        </thead>
        <tbody>
          {metricas.map((metrica, idx) => {
            const diffEsp = calcularRelacion(metrica.especialidades, metrica.centro);
            const diffNoEsp = calcularRelacion(metrica.noEspecialidades, metrica.centro);

            return (
              <tr key={metrica.key} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                {/* Métrica */}
                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                  {metrica.label}
                </td>

                {/* Especialidades */}
                <td className="py-3 px-4 text-center bg-gray-50/50">
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-bold text-gray-900">
                      {metrica.formato(metrica.especialidades)}
                    </span>
                    {renderRelacion(diffEsp)}
                  </div>
                </td>

                {/* Centro */}
                <td className="py-3 px-4 text-center bg-gray-100">
                  <span className="text-xl font-bold text-gray-900">
                    {metrica.formato(metrica.centro)}
                  </span>
                </td>

                {/* No Especialidades */}
                <td className="py-3 px-4 text-center bg-gray-50/50">
                  <div className="flex flex-col items-center">
                    <span className="text-xl font-bold text-gray-900">
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
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600 flex items-center gap-2">
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
