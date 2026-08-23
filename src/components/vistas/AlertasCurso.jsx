import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * AlertasCurso — la película de las alertas, no la foto.
 *
 * La pantalla de indicadores ya dice cuántas asignaturas están en rojo en UN
 * momento del curso. Esta enseña cómo se mueve ese recuento y, sobre todo, QUÉ
 * asignaturas entran y salen: «hemos pasado de 3 a 5» no dice qué mirar el
 * lunes; «se han sumado Armonía de 3.º y Análisis de 5.º» sí.
 *
 * Aquí no se calcula nada. Todo llega hecho en `serie` (`serieAlertas` de
 * `nucleo/alertas.js`): un segundo criterio en la capa de pintar es como se
 * llega a que dos pantallas digan cifras distintas de lo mismo.
 */

/* Los tres colores son los del resto del panel, y su reparto no es decorativo:
   difícil es lo que hay que mirar. */
const COLOR_DIFICILES = '#dc2626';
const COLOR_NEUTRALES = '#94a3b8';
const COLOR_FACILES = '#059669';

/* Un valor que el núcleo no ha podido calcular llega como `null`, y se pinta
   «—». Un cero se lee como una medición: «ninguna asignatura en rojo» y «no se
   ha cargado nada» son cosas distintas y no pueden verse igual. */
const cifra = (valor, decimales = 2) =>
  typeof valor === 'number' && isFinite(valor) ? valor.toFixed(decimales) : '—';

const porcentaje = (valor, decimales = 1) =>
  typeof valor === 'number' && isFinite(valor) ? `${valor.toFixed(decimales)}%` : '—';

/* Las categorías viajan como clave estable desde el núcleo ('DIFÍCIL',
   'NEUTRAL', 'FÁCIL'); lo traducible es solo lo que se pinta. */
const CLAVE_CATEGORIA = {
  'DIFÍCIL': 'alrCatDificil',
  'NEUTRAL': 'alrCatNeutral',
  'FÁCIL': 'alrCatFacil'
};

const RESPALDO_CATEGORIA = {
  'DIFÍCIL': 'Difícil',
  'NEUTRAL': 'Neutral',
  'FÁCIL': 'Fácil'
};

/* Vocabulario cerrado de `MOTIVOS`. 'presente' es el caso raro —la asignatura
   está en el fichero y con alumnado suficiente, pero no ha llegado a
   clasificarse—; se le da texto igual, porque dejarlo sin rótulo lo convertiría
   en un hueco en blanco justo en la lista que existe para no dar por buena una
   mejora que no ha ocurrido. */
const CLAVE_MOTIVO = {
  ausente: 'alrMotivoAusente',
  bajoMinimo: 'alrMotivoBajoMinimo',
  sinFichero: 'alrMotivoSinFichero',
  presente: 'alrMotivoPresente'
};

const RESPALDO_MOTIVO = {
  ausente: 'Ya no viene en el fichero',
  bajoMinimo: 'Tiene menos alumnado del mínimo',
  sinFichero: 'No se ha cargado el fichero de su etapa',
  presente: 'Está en el fichero, pero no se ha podido clasificar'
};

const rotularCategoria = (t, categoria) =>
  CLAVE_CATEGORIA[categoria]
    ? (t(CLAVE_CATEGORIA[categoria]) || RESPALDO_CATEGORIA[categoria])
    : (categoria || '—');

const rotularMotivo = (t, motivo) =>
  CLAVE_MOTIVO[motivo]
    ? (t(CLAVE_MOTIVO[motivo]) || RESPALDO_MOTIVO[motivo])
    : (t('alrMotivoDesconocido') || 'Sin motivo declarado');

/** El sitio de una asignatura: su etapa y su curso, tal y como vienen. */
const situacion = (item) => [item.etapa, item.nivel].filter(Boolean).join(' · ') || '—';

/** Una asignatura de cualquiera de las cuatro listas. `pie` es lo que la
 *  distingue: de qué caja venía, a cuál se va, o por qué ya no se mide. */
const Asignatura = ({ item, t, colorNota, pie }) => (
  <li className="border border-gray-200 rounded-lg p-3 bg-white">
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm font-semibold text-gray-900">{item.asignatura}</span>
      <span className="text-xs text-gray-500 whitespace-nowrap">{situacion(item)}</span>
    </div>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      <span>
        {t('alrNotaMedia') || 'Nota media'}:{' '}
        <span className={`font-bold ${colorNota}`}>{cifra(item.notaMedia)}</span>
      </span>
      <span>
        {t('alrSuspensos') || '% suspensos'}:{' '}
        <span className="font-bold text-gray-900">{porcentaje(item.suspendidos)}</span>
      </span>
      <span>
        {t('alrAlumnado') || 'Alumnado'}:{' '}
        <span className="font-bold text-gray-900">
          {typeof item.registros === 'number' ? item.registros : '—'}
        </span>
      </span>
    </div>
    {pie && <div className="mt-2 text-xs text-gray-500">{pie}</div>}
  </li>
);

/** Una de las cuatro listas de un salto, con su cabecera y su recuento. */
const Bloque = ({ titulo, aviso, borde, tono, items, vacio, children }) => (
  <div className={`border ${borde} rounded-lg p-4 bg-white`}>
    <div className="flex items-baseline justify-between gap-2">
      <h4 className={`text-xs font-bold uppercase tracking-wide ${tono}`}>{titulo}</h4>
      <span className="text-sm font-bold text-gray-900">{items.length}</span>
    </div>
    {aviso && <p className="mt-2 text-xs text-gray-600">{aviso}</p>}
    {items.length === 0
      ? <p className="mt-3 text-xs text-gray-400">{vacio}</p>
      : <ul className="mt-3 space-y-2">{children}</ul>}
  </div>
);

const AlertasCurso = ({ serie, t, rotularMomento }) => {
  /* Sin datos no se pinta una pantalla vacía: se dice qué falta. El núcleo
     devuelve `hayDatos: false` tanto cuando no hay ficheros como cuando no hay
     umbrales con los que clasificar, así que el texto menciona las dos. */
  if (!serie || !serie.hayDatos) {
    return (
      <div className="bg-white border border-gray-300 rounded-lg p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('alrSinDatos') || 'Todavía no hay alertas que seguir'}
        </h3>
        <p className="mt-2 text-sm text-gray-600 max-w-2xl mx-auto">
          {t('alrSinDatosDetalle') ||
            'Esta vista compara el recuento de asignaturas difíciles entre momentos del curso. Carga al menos un CSV de evaluación y comprueba que los umbrales de la barra lateral están puestos.'}
        </p>
      </div>
    );
  }

  const puntos = serie.puntos || [];
  const cambios = serie.cambios || [];

  /* Los puntos, tal cual llegan, con el rótulo que sabe poner la pantalla: con
     dos cursos académicos cargados tiene que decir de cuál es cada punto, y eso
     ya está resuelto en `rotularMomento`. */
  const datosGrafica = puntos.map((p) => ({
    rotulo: rotularMomento(p.momento),
    dificiles: p.dificiles,
    neutrales: p.neutrales,
    faciles: p.faciles
  }));

  const rotDificiles = t('alrDificiles') || 'Difíciles';
  const rotNeutrales = t('alrNeutrales') || 'Neutrales';
  const rotFaciles = t('alrFaciles') || 'Fáciles';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('alrTitulo') || 'Alertas a lo largo del curso'}
        </h3>
        <p className="mt-1 text-sm text-gray-600 max-w-3xl">
          {t('alrDescripcion') ||
            'La nota media es la cifra que menos se mueve: el centro puede tener la misma media en dos evaluaciones y haber pasado de tres asignaturas problemáticas a nueve. Aquí se ve el recuento y, debajo, qué asignaturas concretas entran y salen.'}
        </p>

        <div
          className="mt-6"
          role="img"
          aria-label={t('alrGraficaAria') ||
            'Gráfica de líneas con el número de asignaturas difíciles, neutrales y fáciles en cada momento del curso'}
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={datosGrafica} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="rotulo" stroke="#64748b" tick={{ fontSize: 12 }} interval={0} />
              {/* Son asignaturas contadas: media asignatura no existe. */}
              <YAxis stroke="#64748b" allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <Legend />
              <Line type="monotone" dataKey="dificiles" name={rotDificiles}
                stroke={COLOR_DIFICILES} strokeWidth={3} dot={{ fill: COLOR_DIFICILES, r: 5 }} />
              <Line type="monotone" dataKey="neutrales" name={rotNeutrales}
                stroke={COLOR_NEUTRALES} strokeWidth={2} strokeDasharray="4 3" dot={{ fill: COLOR_NEUTRALES, r: 4 }} />
              <Line type="monotone" dataKey="faciles" name={rotFaciles}
                stroke={COLOR_FACILES} strokeWidth={3} dot={{ fill: COLOR_FACILES, r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {puntos.map((p) => (
            <div key={p.momento.clave} className="border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                {rotularMomento(p.momento)}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-red-600">{p.dificiles}</span>
                <span className="text-xs text-gray-500">
                  {t('alrDeTotal') || 'de'} {p.total}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                {t('alrPorcentajeDificiles') || '% difíciles'}: {porcentaje(p.porcentajeDificiles)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('alrCambiosTitulo') || 'Qué entra y qué sale'}
        </h3>

        {cambios.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">
            {t('alrUnSoloMomento') ||
              'Con un solo momento del curso cargado no hay nada que comparar: carga otra evaluación para ver qué asignaturas entran y salen de la lista.'}
          </p>
        ) : (
          <div className="mt-4 space-y-8">
            {cambios.map((c) => {
              /* El color NO sale de `c.variacion`, y esa es la corrección
                 importante. `variacion` es la resta bruta de recuentos, así
                 que incluye las asignaturas que aparecen y las que dejan de
                 medirse — justo lo que el núcleo separa en `nuevas` y
                 `desaparecidas` para no apuntárselo al centro.

                 Escenario medido: con Piano en rojo en las dos etapas y
                 cargando después solo el fichero de elemental, la variación
                 era −1 y el badge salía VERDE. Nadie había mejorado: la lista
                 de debajo decía «Piano/EPM · no se ha cargado el fichero de su
                 etapa». Un −1 en verde ahí es una mejora inventada.

                 Lo que sí es movimiento del centro: las que entran menos las
                 que salen, ambas medidas en los dos momentos. */
              const neto = (c.entran || []).length - (c.salen || []).length;
              const empeora = neto > 0;
              const igual = neto === 0;
              const colorVariacion = igual
                ? 'text-gray-500 border-gray-300'
                : (empeora ? 'text-red-600 border-red-300' : 'text-emerald-600 border-emerald-300');
              /* Y cuando el recuento total se ha movido por otra razón, se
                 dice aparte y sin color: es un hecho, no una valoración. */
              const movimientoNoAtribuible = c.variacion - neto;

              return (
                <section key={`${c.deMomento.clave}→${c.aMomento.clave}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-gray-900 pb-2">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      {rotularMomento(c.deMomento)} → {rotularMomento(c.aMomento)}
                    </h4>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded border ${colorVariacion}`}>
                        {igual
                          ? (t('alrVariacionIgual') || 'Mismo número de difíciles')
                          : `${empeora ? '+' : ''}${neto} ${t('alrVariacionSufijo') || 'difíciles'}`}
                      </span>
                      {movimientoNoAtribuible !== 0 && (
                        <span className="text-xs text-gray-500">
                          {(t('alrTotalTambien') || 'el recuento total varía {n} por asignaturas que aparecen o dejan de medirse')
                            .replace('{n}', (movimientoNoAtribuible > 0 ? '+' : '') + movimientoNoAtribuible)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Bloque
                      titulo={t('alrEntran') || 'Entran en la lista de difíciles'}
                      borde="border-red-300"
                      tono="text-red-600"
                      items={c.entran}
                      vacio={t('alrNingunaEntra') || 'Ninguna asignatura ha entrado en la lista.'}
                    >
                      {c.entran.map((a) => (
                        <Asignatura
                          key={a.clave} item={a} t={t} colorNota="text-red-600"
                          pie={`${t('alrVenia') || 'Venía de'}: ${rotularCategoria(t, a.desde)}`}
                        />
                      ))}
                    </Bloque>

                    <Bloque
                      titulo={t('alrSalen') || 'Salen de la lista de difíciles'}
                      borde="border-emerald-300"
                      tono="text-emerald-600"
                      items={c.salen}
                      vacio={t('alrNingunaSale') || 'Ninguna asignatura ha salido de la lista.'}
                    >
                      {c.salen.map((a) => (
                        <Asignatura
                          key={a.clave} item={a} t={t} colorNota="text-emerald-600"
                          pie={`${t('alrPasaA') || 'Pasa a'}: ${rotularCategoria(t, a.hacia)}`}
                        />
                      ))}
                    </Bloque>

                    {/* Aparecer en rojo no es empeorar, y desaparecer de la
                        lista no es mejorar. Las dos van aparte y con su motivo:
                        juntarlas con las de arriba sería apuntarle al centro un
                        cambio que nadie ha hecho. */}
                    <Bloque
                      titulo={t('alrNuevas') || 'Nuevas en la lista'}
                      aviso={t('alrNuevasAviso') ||
                        'Están en rojo, pero en el momento anterior no se clasificaban: no son asignaturas que hayan empeorado.'}
                      borde="border-gray-300"
                      tono="text-gray-900"
                      items={c.nuevas}
                      vacio={t('alrNingunaNueva') || 'Ninguna asignatura nueva en la lista.'}
                    >
                      {c.nuevas.map((a) => (
                        <Asignatura
                          key={a.clave} item={a} t={t} colorNota="text-red-600"
                          pie={`${t('alrAntes') || 'Antes'}: ${rotularMotivo(t, a.motivo)}`}
                        />
                      ))}
                    </Bloque>

                    <Bloque
                      titulo={t('alrDesaparecidas') || 'Ya no se miden'}
                      aviso={t('alrDesaparecidasAviso') ||
                        'Estaban en rojo y hoy no se pueden clasificar. Nadie las ha arreglado: han dejado de medirse. Las cifras son las últimas conocidas.'}
                      borde="border-amber-300"
                      tono="text-amber-700"
                      items={c.desaparecidas}
                      vacio={t('alrNingunaDesaparece') || 'Todas las difíciles del momento anterior se siguen midiendo.'}
                    >
                      {c.desaparecidas.map((a) => (
                        <Asignatura
                          key={a.clave} item={a} t={t} colorNota="text-gray-900"
                          pie={`${t('alrAhora') || 'Ahora'}: ${rotularMotivo(t, a.motivo)}`}
                        />
                      ))}
                    </Bloque>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertasCurso;
