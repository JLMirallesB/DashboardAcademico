import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { decimalesDe } from '../../nucleo/comparacion.js';

/* Vista — las familias de asignaturas, una contra otra
 *
 * Solo pinta. Todas las cifras llegan hechas de `agruparPorFamilia`, y la
 * lectura de cada diferencia —si subir es mejorar o empeorar— llega hecha de
 * `compararFamilias`. Aquí no se calcula ni se vuelve a decidir ninguna de las
 * dos cosas: un segundo criterio en la capa de pintar es exactamente cómo se
 * llega a que dos pantallas digan cifras distintas de lo mismo.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ AQUÍ NO HAY, NI PUEDE HABER, UNA TARTA
 *
 * Piano está a la vez en «Especialidad» y en «Tecla»; Violín, en
 * «Especialidad» y en «Cuerda». Así que **los registros de las familias suman
 * más que los del centro**: en el centro de prueba, 250 frente a 130. Una
 * tarta, una barra apilada o un «% del total» construidos con estas cifras
 * sumarían el 190 % y cada porción mentiría sobre su tamaño, con la pinta de
 * dato que tiene un gráfico circular.
 *
 * Por eso esta pantalla enseña LOS DOS números que da el núcleo
 * —`solape.registrosSumados` y `solape.registrosDistintos`— arriba y a tamaño
 * legible, y todo lo demás compara familias ENTRE SÍ, que es lo único
 * legítimo. Si alguien viene a añadir aquí un gráfico de reparto con buena
 * intención, esto es lo que tiene que leer antes.
 */

/* Sobrio y sin degradados, como el resto de la pantalla. La referencia se
   pinta en negro para que se distinga de un vistazo del resto, y el montón de
   sin clasificar en gris claro porque no es una familia con la que competir. */
const COLOR_BARRA = '#64748b';
const COLOR_REFERENCIA = '#111827';
const COLOR_SIN_CLASIFICAR = '#cbd5e1';

/* Las claves de familia vienen en minúsculas del núcleo porque son claves
   estables, no rótulos. Esto solo les pone la mayúscula inicial para
   enseñarlas; la clave que viaja sigue siendo la del núcleo. */
const conMayuscula = (texto) =>
  typeof texto === 'string' && texto.length ? texto.charAt(0).toUpperCase() + texto.slice(1) : '';

/* Los decimales los decide `comparacion.js`, no esta pantalla: con dos
   criterios, 7,24 frente a 7,19 salía como «+0.1» y una diferencia de −0,04
   como «-0.0» en rojo. */
const formatoNota = (valor) => valor.toFixed(decimalesDe('notaMedia'));
const formatoPorcentaje = (valor, clave) => `${valor.toFixed(decimalesDe(clave))}%`;

/* Fuera del componente a propósito: un componente declarado dentro del render
   se crea de nuevo en cada pasada y pierde su estado. */
const TooltipGrafica = ({ active, payload, t }) => {
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white p-3 border border-gray-300 rounded-lg">
      <p className="font-semibold text-gray-900">{d.etiqueta}</p>
      <p className="text-sm text-gray-600">
        {t('fam_colNotaMedia') || 'Nota media'}: {formatoNota(d.notaMedia)}
      </p>
      <p className="text-sm text-gray-600">
        {t('fam_colRegistros') || 'Registros'}: {d.registros}
      </p>
      <p className="text-sm text-gray-600">
        {t('fam_colAsignaturas') || 'Asignaturas'}: {d.asignaturas}
      </p>
    </div>
  );
};

/* De qué campo tira cada columna al ordenar. Ninguno se calcula: se lee. */
const CAMPO = {
  familia: (f) => f.clave,
  asignaturas: (f) => f.asignaturas,
  registros: (f) => f.registros,
  notaMedia: (f) => f.notaMedia,
  aprobados: (f) => f.aprobados,
  suspendidos: (f) => f.suspendidos
};

const FamiliasAsignaturas = ({ resultado, compararFamilias, t }) => {
  const [referenciaElegida, setReferenciaElegida] = useState('');
  const [orden, setOrden] = useState({ columna: null, asc: true });

  const familias = useMemo(
    () => (resultado && Array.isArray(resultado.familias) ? resultado.familias : []),
    [resultado]
  );

  /* Si el trimestre cambia y la familia elegida ya no está, se vuelve a «sin
     comparar» en vez de dejar una referencia fantasma que haría que TODAS las
     comparaciones salieran vacías sin decir por qué. */
  const referencia = useMemo(
    () => (familias.some((f) => f.clave === referenciaElegida) ? referenciaElegida : ''),
    [familias, referenciaElegida]
  );

  const comparaciones = useMemo(() => {
    if (!referencia || typeof compararFamilias !== 'function') return {};
    const mapa = {};
    familias.forEach((f) => {
      if (f.clave === referencia) return;
      mapa[f.clave] = compararFamilias(resultado, f.clave, referencia);
    });
    return mapa;
  }, [resultado, familias, referencia, compararFamilias]);

  const familiasOrdenadas = useMemo(() => {
    if (!orden.columna || !CAMPO[orden.columna]) return familias;
    const leer = CAMPO[orden.columna];
    return [...familias].sort((a, b) => {
      /* El montón de sin clasificar cierra siempre, se ordene por lo que se
         ordene: no es una familia con la que competir, y ponerlo primero por
         tener la peor nota lo convertiría en el titular de la pantalla. */
      if (a.esSinClasificar !== b.esSinClasificar) return a.esSinClasificar ? 1 : -1;

      const va = leer(a);
      const vb = leer(b);

      if (orden.columna === 'familia') {
        const cmp = String(va).localeCompare(String(vb), 'es');
        return orden.asc ? cmp : -cmp;
      }

      /* «Sin dato» va detrás en las dos direcciones. Tratarlo como el valor
         más bajo pondría a la cabeza de «peores notas» a las familias que
         justamente no tienen nota. */
      if (va === null && vb === null) return a.clave.localeCompare(b.clave, 'es');
      if (va === null) return 1;
      if (vb === null) return -1;
      if (va === vb) return a.clave.localeCompare(b.clave, 'es');
      return orden.asc ? va - vb : vb - va;
    });
  }, [familias, orden]);

  if (!familias.length) {
    return (
      <div className="bg-white border border-gray-300 rounded-lg p-6 text-center text-gray-500">
        {t('fam_sinDatos') || 'No hay familias que enseñar con los datos cargados.'}
      </div>
    );
  }

  const rotulo = (f) => (f.esSinClasificar ? t('fam_sinClasificar') || '(sin clasificar)' : conMayuscula(f.clave));

  /* Una familia sin nota media no puede tener barra: dibujarla a cero la
     enseñaría como la peor del centro. Se quedan fuera de la gráfica y se
     nombran debajo, que es distinto de desaparecer. */
  const sinNota = familiasOrdenadas.filter((f) => f.notaMedia === null);

  const datosGrafica = familiasOrdenadas
    .filter((f) => f.notaMedia !== null)
    .map((f) => ({
      clave: f.clave,
      etiqueta: rotulo(f),
      notaMedia: f.notaMedia,
      registros: f.registros,
      asignaturas: f.asignaturas,
      esSinClasificar: f.esSinClasificar
    }));

  const solape = (resultado && resultado.solape) || { hay: false, asignaturas: [], registrosSumados: 0, registrosDistintos: 0 };

  /* Una asignatura en cuatro cursos son 1 asignatura y 4 filas, y confundirlos
     es contar cuatro pianos: por eso las filas se enseñan aparte. */
  const textoFilas = (n) => (n === 1
    ? (t('fam_filaUna') || '1 fila')
    : (t('fam_filas') || '{n} filas').replace('{n}', n));

  const textoMotivo = (f) => {
    if (f.motivo === 'pocosRegistros') {
      return (t('fam_motivoPocosRegistros') || 'Menos de {min} registros: no se dan medias.')
        .replace('{min}', f.minimoRegistros);
    }
    if (f.motivo === 'pocasAsignaturas') {
      return (t('fam_motivoPocasAsignaturas') || 'Menos de {min} asignaturas distintas: no se dan medias.')
        .replace('{min}', f.minimoAsignaturas);
    }
    if (f.motivo === 'sinDato') {
      return t('fam_motivoSinDato') || 'Ninguna de sus asignaturas trae notas: no hay nada que promediar.';
    }
    return null;
  };

  /* El signo se enseña tal cual sale de la resta; el COLOR lo decide `mejora`,
     que viene del núcleo. Son dos cosas distintas: más suspensos sube la cifra
     y es peor, y esa lectura no se rehace aquí. */
  const pintarComparacion = (f, clave) => {
    /* La propia referencia no se compara consigo misma, y ya lleva su etiqueta
       en la columna del nombre: repetirla bajo cada cifra solo era ruido. */
    if (!referencia || f.clave === referencia) return null;
    const comp = (comparaciones[f.clave] || {})[clave];
    if (!comp) {
      return (
        <span
          className="block text-xs text-gray-400 mt-1"
          title={t('fam_sinComparacion') || 'No se puede comparar: falta la cifra en una de las dos familias.'}
        >
          —
        </span>
      );
    }
    const color = comp.mejora === null
      ? 'text-gray-500'
      : comp.mejora ? 'text-emerald-600' : 'text-red-600';
    return (
      <span className={`block text-xs font-medium mt-1 ${color}`}>
        {comp.diff > 0 ? '+' : ''}{comp.diff.toFixed(decimalesDe(clave))}
      </span>
    );
  };

  const celdaMetrica = (f, clave, formato) => (
    <td className="py-3 px-4 text-center align-top">
      <span className="text-lg font-bold text-gray-900">
        {f[clave] === null ? '—' : formato(f[clave], clave)}
      </span>
      {pintarComparacion(f, clave)}
    </td>
  );

  const alOrdenar = (columna) => {
    setOrden((previo) => (previo.columna === columna
      ? { columna, asc: !previo.asc }
      : { columna, asc: columna === 'familia' }));
  };

  const cabecera = (columna, texto, alineacion = 'text-center') => {
    const activa = orden.columna === columna;
    return (
      <th
        className={`${alineacion} py-4 px-4 text-xs font-bold text-gray-900 uppercase tracking-wide`}
        aria-sort={activa ? (orden.asc ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          onClick={() => alOrdenar(columna)}
          className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-gray-600"
          title={(t('fam_ordenarPor') || 'Ordenar por {columna}').replace('{columna}', texto)}
        >
          {texto}
          <span className="text-gray-400" aria-hidden="true">{activa ? (orden.asc ? '▲' : '▼') : '↕'}</span>
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('fam_titulo') || 'Familias de asignaturas'}
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          {t('fam_descripcion') || 'Cada familia agrupa las asignaturas que el CSV clasifica juntas. Sirve para poner unas contra otras, no para repartir el centro.'}
        </p>
      </div>

      {/* La nota del solape: a tamaño legible y arriba, porque es la que impide
          leer esta pantalla como un reparto. */}
      <div className="bg-white border-l-4 border-l-gray-900 border-r border-t border-b border-gray-300 rounded-lg p-6">
        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
          {solape.hay
            ? (t('fam_solapeTitulo') || 'Las familias se solapan')
            : (t('fam_sinSolapeTitulo') || 'Las familias no reparten el centro')}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              {t('fam_solapeSumados') || 'Registros sumando familias'}
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{solape.registrosSumados}</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              {t('fam_solapeDistintos') || 'Registros del centro'}
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{solape.registrosDistintos}</div>
          </div>
        </div>

        <p className="text-sm text-gray-800 mt-4">
          {solape.hay
            ? (t('fam_solapeTexto') || 'Una asignatura puede estar en varias familias a la vez —Piano está en «Especialidad» y en «Tecla»—, así que las familias juntas suman más registros que el centro. Por eso aquí no hay tartas, ni barras apiladas, ni porcentajes sobre el total: serían un reparto falso. Comparar unas familias con otras sí vale.')
            : (t('fam_sinSolapeTexto') || 'Con estos datos ninguna asignatura está en más de una familia. Aun así, no todas las asignaturas tienen por qué pertenecer a alguna, así que estas cifras tampoco son un reparto del centro.')}
        </p>

        {solape.hay && solape.asignaturas.length > 0 && (
          <details className="mt-3">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer">
              {(t('fam_solapeAsignaturas') || 'Asignaturas que están en más de una familia ({n})')
                .replace('{n}', solape.asignaturas.length)}
            </summary>
            <p className="text-sm text-gray-600 mt-2">
              {solape.asignaturas.map(conMayuscula).join(', ')}
            </p>
          </details>
        )}
      </div>

      {/* Selector de referencia */}
      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <label htmlFor="familia-referencia" className="block text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
          {t('fam_referencia') || 'Comparar el resto con'}
        </label>
        <select
          id="familia-referencia"
          value={referencia}
          onChange={(e) => setReferenciaElegida(e.target.value)}
          aria-label={t('fam_referenciaAria') || 'Elegir la familia de referencia con la que comparar el resto'}
          className="w-full sm:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white hover:border-gray-900 focus:outline-none focus:border-gray-900"
        >
          <option value="">{t('fam_referenciaNinguna') || 'Sin comparar'}</option>
          {familias.map((f) => (
            <option key={f.clave} value={f.clave}>{rotulo(f)}</option>
          ))}
        </select>
        {referencia && (
          <p className="text-xs text-gray-600 mt-2">
            {t('fam_referenciaPie') || 'Debajo de cada cifra, la diferencia con la familia de referencia. El color dice si esa diferencia es mejor o peor, que no es lo mismo que el signo: más suspensos sube la cifra y es peor.'}
          </p>
        )}
      </div>

      {/* Gráfica de nota media. Barras y no porciones, por lo dicho arriba. */}
      <div className="bg-white border border-gray-300 rounded-lg p-6">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4">
          {t('fam_grafica') || 'Nota media por familia'}
        </h4>
        {datosGrafica.length > 0 ? (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={datosGrafica} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="etiqueta"
                stroke="#64748b"
                interval={0}
                angle={-30}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 11 }}
              />
              <YAxis domain={[0, 10]} stroke="#64748b" tick={{ fontSize: 12 }} />
              <Tooltip content={<TooltipGrafica t={t} />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="notaMedia" name={t('fam_colNotaMedia') || 'Nota media'}>
                {datosGrafica.map((d) => (
                  <Cell
                    key={d.clave}
                    fill={d.clave === referencia
                      ? COLOR_REFERENCIA
                      : d.esSinClasificar ? COLOR_SIN_CLASIFICAR : COLOR_BARRA}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-500">
            {t('fam_graficaVacia') || 'Ninguna familia tiene nota media con los mínimos de ahora, así que no hay barras que dibujar.'}
          </p>
        )}

        {sinNota.length > 0 && (
          <p className="text-sm text-gray-700 mt-4">
            {(t('fam_graficaSinNota') || 'Sin barra por no tener nota media, y sin desaparecer de la tabla: {lista}.')
              .replace('{lista}', sinNota.map(rotulo).join(', '))}
          </p>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-900">
                {cabecera('familia', t('fam_colFamilia') || 'Familia', 'text-left')}
                {cabecera('asignaturas', t('fam_colAsignaturas') || 'Asignaturas')}
                {cabecera('registros', t('fam_colRegistros') || 'Registros')}
                {cabecera('notaMedia', t('fam_colNotaMedia') || 'Nota media')}
                {cabecera('aprobados', t('fam_colAprobados') || '% Aprobados')}
                {cabecera('suspendidos', t('fam_colSuspensos') || '% Suspensos')}
              </tr>
            </thead>
            <tbody>
              {familiasOrdenadas.map((f) => (
                <tr
                  key={f.clave}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    f.esSinClasificar ? 'bg-gray-50' : ''
                  } ${f.clave === referencia ? 'bg-gray-100' : ''}`}
                >
                  <td className="py-3 px-4 align-top">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{rotulo(f)}</span>
                      {f.esSinClasificar && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-700 border border-gray-400 rounded px-1.5 py-0.5">
                          {t('fam_etiquetaSinClasificar') || 'Sin agrupar'}
                        </span>
                      )}
                      {f.clave === referencia && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-white bg-gray-900 rounded px-1.5 py-0.5">
                          {t('fam_esReferencia') || 'Referencia'}
                        </span>
                      )}
                    </div>

                    {/* El motivo va a la vista y en la propia fila: es la razón de
                        que sus tres cifras sean «—», y en otro sitio no se leería. */}
                    {f.motivo && (
                      <p className="text-xs text-gray-600 mt-1">{textoMotivo(f)}</p>
                    )}
                    {f.esSinClasificar && (
                      <p className="text-xs text-gray-600 mt-1">
                        {t('fam_sinClasificarNota') || 'Asignaturas que el CSV no agrupa en ninguna familia. Se enseñan aparte: escondidas, una asignatura mal clasificada desaparecería de la comparación sin que nada lo dijera.'}
                      </p>
                    )}
                    {f.nombres && f.nombres.length > 0 && (
                      <details className="mt-1">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          {t('fam_verAsignaturas') || 'Ver asignaturas'}
                        </summary>
                        <p className="text-xs text-gray-600 mt-1">{f.nombres.join(', ')}</p>
                      </details>
                    )}
                  </td>

                  {/* Los hechos se conservan aunque no haya medias: cuántas
                      asignaturas y cuántos registros tiene la familia. */}
                  <td className="py-3 px-4 text-center align-top">
                    <span className="text-lg font-bold text-gray-900">{f.asignaturas}</span>
                    <span className="block text-xs text-gray-500 mt-1">{textoFilas(f.filas)}</span>
                  </td>
                  <td className="py-3 px-4 text-center align-top">
                    <span className="text-lg font-bold text-gray-900">{f.registros}</span>
                  </td>

                  {celdaMetrica(f, 'notaMedia', formatoNota)}
                  {celdaMetrica(f, 'aprobados', formatoPorcentaje)}
                  {celdaMetrica(f, 'suspendidos', formatoPorcentaje)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            {t('fam_leyenda') || 'Un «—» es «no hay dato», nunca un cero: las familias que no llegan al mínimo se quedan sin medias, pero no sin fila.'}
          </p>
          {orden.columna && (
            <button
              type="button"
              onClick={() => setOrden({ columna: null, asc: true })}
              className="text-xs font-medium text-gray-700 border border-gray-300 rounded px-3 py-1.5 hover:border-gray-900"
            >
              {t('fam_ordenOriginal') || 'Orden original (peor nota primero)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FamiliasAsignaturas;
