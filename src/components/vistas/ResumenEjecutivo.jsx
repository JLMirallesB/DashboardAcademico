/* Qué merece mirarse este trimestre
 *
 * La vista que faltaba: hasta ahora, para saber qué pasa había que recorrer
 * nueve pantallas y acordarse de lo que decía cada una. Aquí está todo lo que
 * los indicadores han levantado, ordenado por lo sólida que es cada señal.
 *
 * ---------------------------------------------------------------------------
 * LO QUE ESTA PANTALLA NO HACE
 *
 * **No dice por qué pasa nada.** Cada tarjeta es una observación con su
 * alumnado, y debajo dos columnas: lo que la aplicación ya ha comprobado y lo
 * que hay que ir a mirar fuera de los datos. Un cuadro de mandos que explica
 * las causas convierte una tabla en un juicio sobre alguien, y lo hace con
 * una seguridad que los datos no tienen: una media baja es compatible con
 * dificultades de aprendizaje y también con un aumento legítimo de la
 * exigencia, con otra cohorte o con un cambio de criterios.
 *
 * Se enseñan TODAS. No hay recorte aquí: el informe se queda con las primeras
 * porque un papel tiene que caber, pero quien está delante de la pantalla
 * decide dónde corta, y para eso necesita ver la lista entera y por qué está
 * en ese orden.
 */

import React, { useState } from 'react';

/** Los puntos de solidez, pintados. No es una nota: es cuántos de los
 *  criterios se cumplen, y al lado están dichos cuáles. */
const Solidez = ({ puntos, maximo }) => {
  const total = Math.max(maximo || 0, 1);
  const ancho = Math.min(100, Math.round((puntos / total) * 100));
  return (
    <div className="flex items-center gap-2 shrink-0" aria-hidden="true">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gray-900 rounded-full" style={{ width: `${ancho}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 tabular-nums">{puntos}</span>
    </div>
  );
};

const Etiqueta = ({ children, tono = 'gris' }) => {
  const tonos = {
    gris: 'bg-gray-100 text-gray-700',
    ambar: 'bg-amber-100 text-amber-900',
    indigo: 'bg-indigo-100 text-indigo-900'
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${tonos[tono]}`}>
      {children}
    </span>
  );
};

export const ResumenEjecutivo = ({ senales = [], t, formatoNota, formatoPorcentaje }) => {
  const [abierta, setAbierta] = useState(null);

  const rot = (clave, respaldo) => t(clave) || respaldo;
  const nota = (v) => (typeof v === 'number' && Number.isFinite(v)
    ? (formatoNota ? formatoNota(v) : v.toFixed(2)) : '—');
  const pct = (v) => (typeof v === 'number' && Number.isFinite(v)
    ? (formatoPorcentaje ? formatoPorcentaje(v) : `${v.toFixed(1)}%`) : '—');

  if (!senales.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          {rot('resTitulo', 'Qué merece mirarse')}
        </h2>
        <p className="text-sm text-gray-600 mt-2 max-w-xl mx-auto">
          {rot('resSinSenales', 'Con los umbrales puestos, ningún indicador ha levantado nada en este trimestre. Eso no quiere decir que no haya nada que mirar: quiere decir que estos indicadores, con estos umbrales, no lo ven.')}
        </p>
      </div>
    );
  }

  const maximo = senales[0].solidez.puntos;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-900">
          {rot('resTitulo', 'Qué merece mirarse')}
        </h2>
        {/* El aviso va arriba y no en letra pequeña al final: es la condición
            para leer bien todo lo de abajo. */}
        <p className="text-sm text-gray-700 mt-2 leading-relaxed">
          {rot('resAviso', 'Cada línea es una observación, no una explicación. Los mismos datos admiten varias causas —aprendizaje, evaluación, cohorte, organización— y este cuadro no sabe cuál es. Sirve para decidir qué comprobar primero.')}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {(rot('resOrden', 'Ordenadas por solidez: pesa el doble lo que se repite en varias evaluaciones o en otro curso académico. {n} señales.'))
            .replace('{n}', senales.length)}
        </p>
      </div>

      <ol className="space-y-3">
        {senales.map((s) => {
          const abiertaEsta = abierta === s.clave;
          const titulo = rot(`resTipo_${s.tipo}`, s.tipo);
          const donde = s.par
            ? `${s.nivel} · ${s.par.join(' ↔ ')}`
            : `${s.nivel} · ${s.asignatura}`;

          return (
            <li key={s.clave} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setAbierta(abiertaEsta ? null : s.clave)}
                aria-expanded={abiertaEsta}
                className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{titulo}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{donde}</div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-700 tabular-nums">
                      {typeof s.cifras.correlacion === 'number' && (
                        <span>r = {s.cifras.correlacion.toFixed(2)}</span>
                      )}
                      {typeof s.cifras.notaMedia === 'number' && (
                        <span>{rot('average', 'Media')} {nota(s.cifras.notaMedia)}</span>
                      )}
                      {typeof s.cifras.suspendidos === 'number' && (
                        <span>{rot('failed', '% Suspensos')} {pct(s.cifras.suspendidos)}</span>
                      )}
                      {typeof s.cifras.desviacion === 'number' && (
                        <span>σ {nota(s.cifras.desviacion)}</span>
                      )}
                      {typeof s.cifras.registros === 'number' && (
                        <span className="text-gray-500">n = {s.cifras.registros}</span>
                      )}
                    </div>
                  </div>
                  <Solidez puntos={s.solidez.puntos} maximo={maximo} />
                </div>

                {/* El reparto va arriba y no escondido en el detalle: es lo
                    único de esta tarjeta que cambia QUÉ se hace. Si lo que se
                    observa lo comparte el grupo, se mira la asignatura; si
                    está concentrado en algunos, se mira a quién. */}
                {s.reparto && s.reparto.como !== 'medio' && (
                  <div className="mt-2 text-xs text-gray-700">
                    <span className="font-medium">
                      {rot(`resReparto_${s.reparto.como}`, s.reparto.como)}
                    </span>
                    <span className="text-gray-500">
                      {' '}
                      {(rot('resRepartoRef', '(σ {suya} · lo habitual aquí es {centro})'))
                        .replace('{suya}', nota(s.reparto.desviacion))
                        .replace('{centro}', nota(s.reparto.tipicaDelCentro))}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {s.solidez.motivos.map((m) => (
                    <Etiqueta key={m} tono="ambar">
                      {rot(`resMotivo_${m}`, m)}
                    </Etiqueta>
                  ))}
                  {s.solidez.motivos.length === 0 && (
                    <Etiqueta>{rot('resSinMotivos', 'Señal aislada: un solo indicador, una sola vez')}</Etiqueta>
                  )}
                </div>
              </button>

              {abiertaEsta && (
                <div className="px-5 pb-5 pt-1 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Izquierda: lo que la aplicación ya sabe. Va primero
                      porque es lo que evita salir a preguntar algo que está
                      aquí mismo. */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                      {rot('resYaComprobado', 'Esto ya está comprobado')}
                    </h4>
                    <dl className="mt-2 space-y-1.5 text-sm">
                      <Comprobacion
                        rotulo={rot('resPersistente', '¿Se repite en varias evaluaciones?')}
                        valor={s.comprobado.momentosEnRojo === null ? null : s.comprobado.persistente}
                        /* «1 evaluación», no «1 evaluación(es)»: el plural
                            entre paréntesis es la marca de que nadie leyó la
                            frase. */
                        detalle={s.comprobado.momentosEnRojo !== null
                          ? (s.comprobado.momentosEnRojo === 1
                              ? rot('resMomentoUno', '1 evaluación')
                              : (rot('resMomentos', '{n} evaluaciones')).replace('{n}', s.comprobado.momentosEnRojo))
                          : null}
                        t={t}
                      />
                      <Comprobacion
                        rotulo={rot('resOtraCohorte', '¿Aparece también en otro curso académico?')}
                        valor={s.comprobado.otraCohorte}
                        detalle={s.comprobado.otraCohorte === null
                          ? rot('resSinHistorico', 'no hay otro curso cargado con el que comparar') : null}
                        t={t}
                      />
                      {typeof s.comprobado.desviacion === 'number' && (
                        <Dato rotulo={rot('deviation', 'Desviación')} valor={nota(s.comprobado.desviacion)} />
                      )}
                      {typeof s.comprobado.suspendidos === 'number' && (
                        <Dato rotulo={rot('failed', '% Suspensos')} valor={pct(s.comprobado.suspendidos)} />
                      )}
                      {typeof s.comprobado.alumnado === 'number' && (
                        <Dato rotulo={rot('resAlumnado', 'Alumnado')} valor={String(s.comprobado.alumnado)} />
                      )}
                    </dl>
                  </div>

                  {/* Derecha: lo que no está en los datos. */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                      {rot('resAMirar', 'Esto hay que ir a mirarlo')}
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
                      {s.aMirar.map((k) => (
                        <li key={k} className="flex gap-2">
                          <span className="text-gray-400 shrink-0">·</span>
                          <span>{rot(`resMirar_${k}`, k)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-gray-500 mt-3">
                      {rot('resProporcion', 'La actuación debería ser proporcional a lo que se encuentre. Seguir mirando también es una decisión.')}
                    </p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/** Una pregunta que la aplicación sí sabe contestar.
 *  `null` es «no hay con qué comparar», que NO es «no»: mezclarlas haría que
 *  la falta de datos del año pasado se leyera como una prueba. */
const Comprobacion = ({ rotulo, valor, detalle, t }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="text-gray-600">{rotulo}</dt>
    <dd className="text-right shrink-0">
      <span className={`font-medium ${valor === true ? 'text-amber-700' : valor === false ? 'text-gray-700' : 'text-gray-400'}`}>
        {valor === true ? (t('yes') || 'Sí') : valor === false ? (t('no') || 'No') : '—'}
      </span>
      {detalle && <span className="block text-xs text-gray-500">{detalle}</span>}
    </dd>
  </div>
);

const Dato = ({ rotulo, valor }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="text-gray-600">{rotulo}</dt>
    <dd className="font-medium text-gray-900 tabular-nums shrink-0">{valor}</dd>
  </div>
);

export default ResumenEjecutivo;
