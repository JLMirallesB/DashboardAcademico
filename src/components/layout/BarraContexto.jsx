import React from 'react';

/**
 * QUÉ ESTOY MIRANDO.
 *
 * Antes esto no existía y había TRES nociones de contexto que no se hablaban
 * entre sí:
 *
 *  · la etapa, global, y solo cambiable desde la barra lateral;
 *  · el trimestre, global, y cambiable solo desde el modal de gestión de
 *    ficheros y desde un `<select>` escondido DENTRO de la vista de
 *    correlaciones —que mutaba el estado de todas las demás vistas sin
 *    decirlo—;
 *  · y el trimestre de cada fila de la vista de estadísticas, por su cuenta.
 *
 * De ahí salía que en Indicadores no se pudiera cambiar de trimestre sin abrir
 * un modal de gestión de ficheros, y que en Estadísticas la cabecera dijera
 * «1EV» mientras comparabas el segundo: no mentía sobre su variable, es que
 * enseñaba una variable que esa vista no usa.
 *
 * Ahora el contexto es UNO, vive arriba y se cambia aquí. Con dos matices que
 * son la parte de pensar:
 *
 *  1. **Solo se enseña lo que hay que elegir.** Con un solo curso cargado no
 *     sale el selector de curso; con una sola etapa, tampoco el suyo. La
 *     interfaz se complica cuando se complican los datos, no antes.
 *  2. **Las vistas que comparan varios momentos no obedecen a esto, y lo
 *     dicen.** En vez de enseñar un contexto que esa vista no usa, la barra
 *     cambia a «Comparando…». Es la diferencia entre una cabecera que miente y
 *     una que se calla a tiempo.
 */
export const BarraContexto = ({
  momentos = [],
  momentoActual,
  onMomentoChange,
  etapas = [],
  etapaActual,
  onEtapaChange,
  comparando,
  rotularMomento,
  t
}) => {
  /* Nada que enseñar hasta que haya datos. */
  if (!comparando && (!momentos.length || !momentoActual)) return null;

  const clase = 'py-1.5 px-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900';

  /* La etapa se elige SIEMPRE, también en las vistas que comparan varios
     momentos: ahí no manda el momento, pero la etapa sí filtra —Estadísticas
     limita los trimestres ofrecidos, Evolución filtra las series y Alertas el
     recuento—. Esconderla ahí fue una regresión: antes vivía en la barra
     lateral y estaba siempre a mano.

     `etapas` YA trae «TODOS» cuando hay más de una (lo añade
     `etapasDisponibles`), así que aquí no se vuelve a añadir: con dos etapas
     salían dos botones «Todas», y React se quejaba de la clave repetida. */
  const selectorEtapa = etapas.length > 1 ? (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
      {etapas.map((e) => (
        <button
          key={e}
          onClick={() => onEtapaChange(e)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
            etapaActual === e ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {e === 'TODOS' ? t('allStages') : e}
        </button>
      ))}
    </div>
  ) : null;

  if (comparando) {
    return (
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="text-gray-500">{t('ctxComparando')}</span>
        <span className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg font-medium text-gray-900">
          {comparando}
        </span>
        {selectorEtapa && <span className="text-gray-400">·</span>}
        {selectorEtapa}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap text-sm">
      <span className="text-gray-500">{t('ctxViendo')}</span>

      <select
        value={momentoActual}
        onChange={(e) => onMomentoChange(e.target.value)}
        className={clase}
        aria-label={t('ctxEvaluacion')}
        /* Con un solo momento cargado el desplegable no aporta nada, pero se
           deja visible y deshabilitado: sirve de rótulo de qué se está
           mirando, que es la mitad de su trabajo. */
        disabled={momentos.length <= 1}
      >
        {momentos.map((m) => (
          <option key={m.clave} value={m.clave}>{rotularMomento(m)}</option>
        ))}
      </select>

      {selectorEtapa && (
        <>
          <span className="text-gray-400">·</span>
          {selectorEtapa}
        </>
      )}
    </div>
  );
};

export default BarraContexto;
