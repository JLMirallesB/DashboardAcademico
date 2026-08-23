/* El análisis de dificultad: qué asignaturas cuestan y cuáles no
 *
 * Salió del componente grande el 23/08/2026. Es el mismo JSX, con lo que
 * usaba de fuera convertido en props: si algo se comporta distinto, es un
 * fallo de la extracción, no una mejora.
 */

import React from 'react';


export const VistaDificultad = ({ analisisDificultad, vistaDificultad, setVistaDificultad, trimestreSeleccionado, t }) => (
  <div className="max-w-7xl mx-auto">
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('difficulty')}</h3>
        {/* Toggle Por Niveles / Global */}
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setVistaDificultad('niveles')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              vistaDificultad === 'niveles'
                ? 'bg-white text-gray-900 '
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('viewByLevels')}
          </button>
          <button
            onClick={() => setVistaDificultad('global')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              vistaDificultad === 'global'
                ? 'bg-white text-gray-900 '
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('viewGlobal')}
          </button>
        </div>
      </div>

      {/* Selector de trimestre */}
      <div className="mb-6 p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">
          {t('trimester')}: <span className="font-bold">{trimestreSeleccionado}</span>
        </span>
      </div>

      {/* Asignaturas Difíciles */}
      {analisisDificultad.dificiles.length > 0 && (
        <div className="mb-8">
          <h4 className="text-md font-semibold text-red-700 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            {t('difficultSubjects')} ({analisisDificultad.dificiles.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analisisDificultad.dificiles.map((asig, idx) => (
              <div
                key={idx}
                className="bg-red-50 border-2 border-red-300 rounded-lg p-4 hover:border-gray-900 transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-gray-900 text-sm break-words">
                      {asig.nivel} - {asig.asignatura}
                    </h5>
                  </div>
                  <span className="ml-2 px-2 py-1 bg-red-200 text-red-800 text-xs font-bold rounded shrink-0">
                    {t('difficult')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-gray-900">{(asig.notaMedia || 0).toFixed(2)}</div>
                    <div className="text-gray-500">{t('average')}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                    <div className="text-gray-500">{t('passed')}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                    <div className="text-gray-500">{t('failed')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asignaturas Neutrales */}
      {analisisDificultad.neutrales.length > 0 && (
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
            {t('neutralSubjects')} ({analisisDificultad.neutrales.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analisisDificultad.neutrales.map((asig, idx) => (
              <div
                key={idx}
                className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 hover:border-gray-900 transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-gray-900 text-sm break-words">
                      {asig.nivel} - {asig.asignatura}
                    </h5>
                  </div>
                  <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-900 text-xs font-bold rounded shrink-0">
                    {t('neutral')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-gray-900">{(asig.notaMedia || 0).toFixed(2)}</div>
                    <div className="text-gray-500">{t('average')}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                    <div className="text-gray-500">{t('passed')}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                    <div className="text-gray-500">{t('failed')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asignaturas Fáciles */}
      {analisisDificultad.faciles.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-green-700 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            {t('easySubjects')} ({analisisDificultad.faciles.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analisisDificultad.faciles.map((asig, idx) => (
              <div
                key={idx}
                className="bg-green-50 border-2 border-green-300 rounded-lg p-4 hover:border-gray-900 transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-gray-900 text-sm break-words">
                      {asig.nivel} - {asig.asignatura}
                    </h5>
                  </div>
                  <span className="ml-2 px-2 py-1 bg-green-200 text-green-800 text-xs font-bold rounded shrink-0">
                    {t('easy')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-gray-900">{(asig.notaMedia || 0).toFixed(2)}</div>
                    <div className="text-gray-500">{t('average')}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                    <div className="text-gray-500">{t('passed')}</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                    <div className="text-gray-500">{t('failed')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

export default VistaDificultad;
