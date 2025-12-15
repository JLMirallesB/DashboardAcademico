import React from 'react';

/**
 * Componente KPIDetalle - Vista detallada de Especialidades vs No Especialidades
 * En EPM muestra 3 columnas: Teórica Troncal, Especialidades, No Especialidades
 * En otros modos muestra 2 columnas: Especialidades, No Especialidades
 */
const KPIDetalle = ({ kpis, t, modoEtapa }) => {
  if (!kpis) return null;

  const teoricaTroncal = {
    titulo: 'Teórica Troncal',
    notaMedia: kpis.notaMediaTeoricaTroncal,
    desviacion: kpis.desviacionTeoricaTroncal,
    moda: kpis.modaTeoricaTroncal,
    aprobados: kpis.aprobadosTeoricaTroncal,
    suspendidos: kpis.suspendidosTeoricaTroncal,
    colorFrom: 'cyan-50',
    colorTo: 'cyan-100',
    colorBorder: 'cyan-200',
    colorText: 'cyan-700',
    colorValue: 'cyan-900'
  };

  const especialidades = {
    titulo: t('specialties') || 'Especialidades',
    notaMedia: kpis.notaMediaEspecialidades,
    desviacion: kpis.desviacionEspecialidades,
    moda: kpis.modaEspecialidades,
    aprobados: kpis.aprobadosEspecialidades,
    suspendidos: kpis.suspendidosEspecialidades,
    colorFrom: 'amber-50',
    colorTo: 'amber-100',
    colorBorder: 'amber-200',
    colorText: 'amber-700',
    colorValue: 'amber-900'
  };

  const noEspecialidades = {
    titulo: t('nonSpecialties') || 'No Especialidades',
    notaMedia: kpis.notaMediaNoEspecialidades,
    desviacion: kpis.desviacionNoEspecialidades,
    moda: kpis.modaNoEspecialidades,
    aprobados: kpis.aprobadosNoEspecialidades,
    suspendidos: kpis.suspendidosNoEspecialidades,
    colorFrom: 'purple-50',
    colorTo: 'purple-100',
    colorBorder: 'purple-200',
    colorText: 'purple-700',
    colorValue: 'purple-900'
  };

  const renderGrupo = (grupo) => (
    <div className="space-y-3">
      <h4 className="text-lg font-bold text-slate-800 text-center mb-4">{grupo.titulo}</h4>

      {/* Nota Media */}
      <div className={`bg-gradient-to-br from-${grupo.colorFrom} to-${grupo.colorTo} border border-${grupo.colorBorder} rounded-xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <svg className={`w-5 h-5 text-${grupo.colorText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className={`text-xs font-medium text-${grupo.colorText}`}>{t('avgGrade') || 'Nota Media'}</span>
        </div>
        <div className={`text-3xl font-bold text-${grupo.colorValue}`}>{(grupo.notaMedia || 0).toFixed(2)}</div>
      </div>

      {/* Desviación Típica */}
      <div className={`bg-gradient-to-br from-${grupo.colorFrom} to-${grupo.colorTo} border border-${grupo.colorBorder} rounded-xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <svg className={`w-5 h-5 text-${grupo.colorText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <span className={`text-xs font-medium text-${grupo.colorText}`}>{t('kpiStdDev') || 'Desviación Típica'}</span>
        </div>
        <div className={`text-3xl font-bold text-${grupo.colorValue}`}>{(grupo.desviacion || 0).toFixed(2)}</div>
      </div>

      {/* Moda */}
      <div className={`bg-gradient-to-br from-${grupo.colorFrom} to-${grupo.colorTo} border border-${grupo.colorBorder} rounded-xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <svg className={`w-5 h-5 text-${grupo.colorText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className={`text-xs font-medium text-${grupo.colorText}`}>{t('kpiMode') || 'Moda'}</span>
        </div>
        <div className={`text-3xl font-bold text-${grupo.colorValue}`}>{(grupo.moda || 0).toFixed(0)}</div>
      </div>

      {/* % Aprobados */}
      <div className={`bg-gradient-to-br from-${grupo.colorFrom} to-${grupo.colorTo} border border-${grupo.colorBorder} rounded-xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <svg className={`w-5 h-5 text-${grupo.colorText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`text-xs font-medium text-${grupo.colorText}`}>{t('passed') || '% Aprobados'}</span>
        </div>
        <div className={`text-3xl font-bold text-${grupo.colorValue}`}>{(grupo.aprobados || 0).toFixed(1)}%</div>
      </div>

      {/* % Suspendidos */}
      <div className={`bg-gradient-to-br from-${grupo.colorFrom} to-${grupo.colorTo} border border-${grupo.colorBorder} rounded-xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
          <svg className={`w-5 h-5 text-${grupo.colorText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className={`text-xs font-medium text-${grupo.colorText}`}>{t('failed') || '% Suspendidos'}</span>
        </div>
        <div className={`text-3xl font-bold text-${grupo.colorValue}`}>{(grupo.suspendidos || 0).toFixed(1)}%</div>
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

export default KPIDetalle;
