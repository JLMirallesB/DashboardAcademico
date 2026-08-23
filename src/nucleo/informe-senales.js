/* Núcleo — el resumen ejecutivo del informe, y su nota metodológica
 *
 * Sin React ni jsPDF. Convierte las señales de `senales.js` en las filas que
 * el generador pinta, y produce la nota que dice **cómo hay que leer todo lo
 * demás**.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EN EL PAPEL SE RECORTA Y EN LA PANTALLA NO
 *
 * En la aplicación salen todas: quien está delante puede recorrerlas y decide
 * dónde corta. Un informe es otra cosa — se imprime, se reparte y se lee en
 * una reunión— y una lista de cuarenta señales en un papel no se prioriza: se
 * hojea. Así que aquí se recogen las más sólidas y **se dice cuántas se han
 * dejado fuera y dónde están**, que es lo que impide que el recorte se lea
 * como «esto es todo lo que hay».
 *
 * ---------------------------------------------------------------------------
 * Y POR QUÉ LA NOTA METODOLÓGICA NO ES UN ADORNO
 *
 * Un PDF viaja. Se lee meses después, por gente que no estaba cuando se
 * generó y que no tiene la aplicación al lado para ver con qué umbrales se
 * clasificó ni sobre cuánta gente. Sin eso, las cifras de las tablas se leen
 * como hechos y no como mediciones con sus condiciones. La nota lleva **los
 * números de este informe**, no una plantilla: cuántas asignaturas se han
 * mirado, cuántas quedaron fuera por tener poco alumnado, y cuál es el
 * alumnado más pequeño que ha entrado en una cifra.
 */

import { nota, porcentaje, entero, SIN_DATO } from './informe.js';

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);
const rot = (rotulos, clave) => {
  const v = rotulos && rotulos[clave];
  return typeof v === 'string' && v.trim() ? v : clave;
};

/** Cuántas señales caben en un informe antes de dejar de ser una lista de
 *  prioridades. No es un número mágico: es que una página aguanta eso. */
export const POR_DEFECTO = 6;

/** Las filas del resumen ejecutivo.
 *
 * @param senales  lo que devuelve `senalesDelTrimestre`, ya ordenado
 * @param opciones { limite, rotulos }
 * @returns { vacio, cabecera, filas, avisos }
 */
export const tablaSenales = (senales, opciones = {}) => {
  const r = opciones.rotulos || {};
  const limite = esNumero(opciones.limite) ? opciones.limite : POR_DEFECTO;
  const lista = Array.isArray(senales) ? senales : [];

  const cabecera = ['colObservado', 'colDonde', 'colCifras', 'colPorQuePesa',
    'colComprobado', 'colPorMirar'].map((k) => rot(r, k));

  if (!lista.length) return { vacio: true, cabecera: [], filas: [], avisos: [] };

  const recogidas = lista.slice(0, Math.max(1, limite));

  const filas = recogidas.map((s) => {
    /* Las cifras, cada una con su rótulo corto y solo si existe. Meter «—» en
       todas dejaría la celda llena de guiones y escondería las que sí hay. */
    const cifras = [];
    if (esNumero(s.cifras.correlacion)) cifras.push(`r ${s.cifras.correlacion.toFixed(2)}`);
    if (esNumero(s.cifras.notaMedia)) cifras.push(`${rot(r, 'abrevMedia')} ${nota(s.cifras.notaMedia)}`);
    if (esNumero(s.cifras.suspendidos)) cifras.push(`${rot(r, 'abrevSuspensos')} ${porcentaje(s.cifras.suspendidos)}`);
    if (esNumero(s.cifras.desviacion)) cifras.push(`${rot(r, 'abrevDesviacion')} ${nota(s.cifras.desviacion)}`);
    /* La `n` va SIEMPRE y la última, que es donde se busca. Una cifra sin
       saber sobre cuánta gente es media cifra. */
    cifras.push(`n ${entero(s.cifras.registros)}`);

    const porQue = s.solidez.motivos.length
      ? s.solidez.motivos.map((m) => rot(r, `motivo_${m}`)).join('; ')
      : rot(r, 'sinMotivos');

    /* Lo que la aplicación ya ha contestado. `null` se escribe distinto de
       «no»: uno es «no hay con qué comparar» y el otro es una comprobación
       hecha. Confundirlos en el papel sería peor que en la pantalla, porque
       aquí nadie puede preguntar. */
    const comprobado = [];
    if (s.comprobado.momentosEnRojo !== null && s.comprobado.momentosEnRojo !== undefined) {
      comprobado.push(s.comprobado.persistente
        ? `${rot(r, 'persistenteSi')} (${s.comprobado.momentosEnRojo})`
        : rot(r, 'persistenteNo'));
    }
    comprobado.push(s.comprobado.otraCohorte === true ? rot(r, 'cohorteSi')
      : s.comprobado.otraCohorte === false ? rot(r, 'cohorteNo')
        : rot(r, 'cohorteSinDatos'));
    if (s.reparto && s.reparto.como !== 'medio') {
      comprobado.push(rot(r, `reparto_${s.reparto.como}`));
    }

    const donde = s.par ? `${s.nivel} · ${s.par.join(' / ')}` : `${s.nivel} · ${s.asignatura}`;

    return [
      rot(r, `tipo_${s.tipo}`),
      donde,
      cifras.join('  '),
      porQue,
      comprobado.join('; '),
      (s.aMirar || []).map((k) => rot(r, `mirar_${k}`)).join(' ')
    ];
  });

  const avisos = [rot(r, 'avisoObservacion')];
  /* Y lo que NO cabe. Sin esta línea, un informe de seis señales sobre
     cuarenta se lee como «hay seis cosas que mirar». */
  if (lista.length > recogidas.length) {
    avisos.push((rot(r, 'avisoRecorte'))
      .replace('{recogidas}', recogidas.length)
      .replace('{total}', lista.length)
      .replace('{fuera}', lista.length - recogidas.length));
  }

  return { vacio: false, cabecera, filas, avisos };
};

/* ------------------------------------------------------------------ */

/** La nota metodológica: cómo hay que leer lo de arriba.
 *
 * Lleva los números DE ESTE informe, no una plantilla. Lo que se puede
 * calcular se calcula; lo que es un principio, se dice como principio.
 *
 * @param opciones { senales, datosTrimestre, umbrales, correlaciones, rotulos }
 * @returns { vacio, cabecera, filas, avisos } — filas de dos columnas
 */
export const notaMetodologica = ({ senales = [], datosTrimestre = {}, umbrales,
                                   correlaciones = [], rotulos } = {}) => {
  const r = rotulos || {};
  const filas = [];

  /* Cuántas asignaturas se han mirado y cuántas quedaron fuera por tener poco
     alumnado. Es el dato que más cambia cómo se lee un informe y que nunca
     aparece: si de treinta asignaturas se han juzgado dieciocho, las otras
     doce no es que estén bien. */
  let miradas = 0, fuera = 0, minimoVisto = null;
  Object.entries(datosTrimestre || {}).forEach(([nivel, asigs]) => {
    if (nivel === 'GLOBAL') return;
    Object.entries(asigs || {}).forEach(([asignatura, data]) => {
      if (/^total/i.test(String(asignatura).trim())) return;
      const n = data && data.stats && data.stats.registros;
      if (!esNumero(n)) return;
      if (n < (umbrales?.alumnosMinimo ?? 0)) { fuera++; return; }
      miradas++;
      if (minimoVisto === null || n < minimoVisto) minimoVisto = n;
    });
  });

  filas.push([rot(r, 'metAsignaturasMiradas'), entero(miradas)]);
  filas.push([rot(r, 'metAsignaturasFuera'),
    fuera ? `${entero(fuera)} (${(rot(r, 'metPorPocoAlumnado')).replace('{n}', entero(umbrales?.alumnosMinimo))})`
      : entero(0)]);
  filas.push([rot(r, 'metGrupoMasPequeno'), minimoVisto === null ? SIN_DATO : entero(minimoVisto)]);

  const conN = (correlaciones || []).filter((c) => esNumero(Number(c.N)));
  filas.push([rot(r, 'metCorrelaciones'),
    correlaciones.length
      ? (conN.length === correlaciones.length
        ? (rot(r, 'metCorrelacionesConN')).replace('{n}', entero(correlaciones.length))
        : (rot(r, 'metCorrelacionesSinN')).replace('{n}', entero(correlaciones.length)))
      : rot(r, 'metSinCorrelaciones')]);

  filas.push([rot(r, 'metSenales'),
    (rot(r, 'metSenalesTotal')).replace('{n}', entero(senales.length))]);

  /* Los principios. Van como avisos y no como filas porque son frases, no
     datos, y una tabla de dos columnas con párrafos dentro no se lee. */
  const avisos = ['metPrincipioSenal', 'metPrincipioVarias', 'metPrincipioPersistencia',
    'metPrincipioN', 'metPrincipioCorrelacion', 'metPrincipioUmbrales',
    'metPrincipioProporcion'].map((k) => rot(r, k));

  return { vacio: false, cabecera: [rot(r, 'metConcepto'), rot(r, 'metValor')], filas, avisos };
};
