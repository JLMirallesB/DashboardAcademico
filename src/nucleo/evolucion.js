/* Núcleo — la evolución entre trimestres
 *
 * Sin React. Había dos cálculos casi iguales y en sitios muy distintos: uno
 * dentro del render de la vista «Evolución» y otro en un `useMemo` que prepara
 * la gráfica del PDF. Los dos construían el eje temporal, y los dos lo
 * construían mal, cada uno a su manera.
 *
 * ---------------------------------------------------------------------------
 * QUÉ PASABA, PORQUE NO ES OBVIO
 *
 * Un trimestre aquí no es «1EV»: es «1EV-EEM» o «1EV-EPM». La etapa forma
 * parte de la clave porque cada fichero trae una sola. Pero **la etapa no es
 * una posición en el tiempo**: la primera evaluación de elemental y la primera
 * de profesional son el mismo momento del curso.
 *
 * En la pantalla, con las dos etapas cargadas y en modo TODOS, el eje pasaba a
 * ser la lista completa de claves: `1EV-EEM, 1EV-EPM, 2EV-EEM, 2EV-EPM`. Entre
 * la primera y la segunda evaluación de elemental se colaba la primera de
 * profesional, y la línea zigzagueaba. Se leía como «en la segunda baja y
 * luego sube» cuando las dos etapas subían.
 *
 * En el PDF era peor: colapsaba la etiqueta a la evaluación pero NO fusionaba
 * los puntos, así que el eje salía literalmente `1EV, 1EV, 2EV, 2EV` y las
 * líneas de una etapa cruzaban por encima de los puntos de la otra.
 *
 * ---------------------------------------------------------------------------
 * LA REGLA
 *
 * **El eje es la evaluación. La etapa es una dimensión de la serie, no una
 * posición del eje.** Cada serie —una selección, o un nivel— sabe de qué etapa
 * es, y en cada evaluación busca el fichero de SU etapa.
 *
 * Y `connectNulls` fuera. Un hueco es un hueco: si una asignatura existe en la
 * primera evaluación y en la tercera pero no en la segunda, la recta que las
 * unía dibujaba en la segunda un valor que nadie había calculado, y se leía
 * como dato.
 */

import { parseTrimestre, getTrimestreBase, evaluacionesDe, compararTrimestres } from './texto.js';
import { detectarEtapa } from './estadistica.js';

/** El fichero cargado que corresponde a una evaluación y una etapa.
 *  Si los trimestres vinieran sin etapa —formato antiguo— se casa por la base
 *  a secas, que es todo lo que hay. */
export const trimestreDe = (trimestres, evaluacion, etapa) => {
  const conEtapa = (trimestres || []).find((t) => {
    const p = parseTrimestre(t);
    return p && p.base === evaluacion && (!etapa || p.etapa === etapa);
  });
  if (conEtapa) return conEtapa;
  return (trimestres || []).find((t) => getTrimestreBase(t) === evaluacion) || null;
};

/** Las evaluaciones que hay que pintar, ya filtradas por el modo de etapa. */
const ejeDe = (trimestresDisponibles, modoEtapa) => {
  const relevantes = (trimestresDisponibles || []).filter((t) => {
    if (modoEtapa === 'TODOS' || !modoEtapa) return true;
    const p = parseTrimestre(t);
    return !p || p.etapa === modoEtapa;
  });
  return evaluacionesDe(relevantes);
};

/** La evolución de las selecciones que el usuario ha ido añadiendo (cada una
 *  es un par nivel + asignatura).
 *
 * @param opciones { trimestresDisponibles, datosCompletos, selecciones, modoEtapa }
 * @returns { puntos, hayDatos, huecos }
 *          · `puntos`  una entrada por EVALUACIÓN, con `notaMedia_<i>` por selección
 *          · `huecos`  cuántas parejas (selección, evaluación) no tienen dato
 */
export const serieEvolucionSelecciones = ({
  trimestresDisponibles = [],
  datosCompletos = {},
  selecciones = [],
  modoEtapa
}) => {
  const evaluaciones = ejeDe(trimestresDisponibles, modoEtapa);
  let huecos = 0;

  const puntos = evaluaciones.map((ev) => {
    const punto = { trimestre: ev };
    selecciones.forEach((sel, idx) => {
      /* Cada selección busca el fichero de SU etapa. Es lo que permite que
         una línea de 1EEM y otra de 1EPM compartan el mismo eje sin pisarse. */
      const trim = trimestreDe(trimestresDisponibles, ev, detectarEtapa(sel.nivel));
      const d = trim && datosCompletos[trim] &&
                datosCompletos[trim][sel.nivel] &&
                datosCompletos[trim][sel.nivel][sel.asignatura];
      const v = (d && d.stats && typeof d.stats.notaMedia === 'number') ? d.stats.notaMedia : null;
      if (v === null) huecos++;
      punto[`notaMedia_${idx}`] = v;
      punto[`label_${idx}`] = `${sel.nivel}-${sel.asignatura}`;
    });
    return punto;
  });

  const hayDatos = puntos.some((p) =>
    selecciones.some((_, idx) => p[`notaMedia_${idx}`] !== null));

  return { puntos, hayDatos, huecos };
};

/** La evolución de la nota media de cada nivel, para la gráfica del informe.
 *
 * @param opciones { trimestresDisponibles, datosCompletos, modoEtapa }
 * @returns { datos, niveles } — o `null` si no hay al menos dos evaluaciones.
 */
export const serieEvolucionNiveles = ({
  trimestresDisponibles = [],
  datosCompletos = {},
  modoEtapa
}) => {
  const evaluaciones = ejeDe(trimestresDisponibles, modoEtapa);
  /* Dos FICHEROS no son dos momentos: el 1EV de elemental y el de profesional
     son el mismo. Antes se miraba `trimestresDisponibles.length < 2` y con una
     sola evaluación de las dos etapas ya se dibujaba una «evolución». */
  if (evaluaciones.length < 2) return null;

  const nivelesSet = new Set();
  (trimestresDisponibles || []).forEach((trim) => {
    Object.keys(datosCompletos[trim] || {}).forEach((nivel) => {
      if (nivel === 'GLOBAL') return;
      /* El informe no filtraba por etapa: uno de solo profesional imprimía
         igualmente las líneas de elemental. */
      if (modoEtapa && modoEtapa !== 'TODOS' && detectarEtapa(nivel) !== modoEtapa) return;
      nivelesSet.add(nivel);
    });
  });

  /* Primero por etapa y luego por número. Ordenar solo por el número dejaba
     1EEM y 1EPM intercalados de forma arbitraria en la leyenda. */
  const niveles = Array.from(nivelesSet).sort((a, b) => {
    const ea = detectarEtapa(a) || '';
    const eb = detectarEtapa(b) || '';
    if (ea !== eb) return ea === 'EEM' ? -1 : 1;
    const na = parseInt((a.match(/\d+/) || ['0'])[0], 10);
    const nb = parseInt((b.match(/\d+/) || ['0'])[0], 10);
    return na - nb;
  });

  const datos = evaluaciones.map((ev) => {
    const punto = { trimestre: ev };
    niveles.forEach((nivel) => {
      const trim = trimestreDe(trimestresDisponibles, ev, detectarEtapa(nivel));
      const total = trim && datosCompletos[trim] &&
                    datosCompletos[trim][nivel] &&
                    datosCompletos[trim][nivel]['Total'];
      if (total && total.stats && typeof total.stats.notaMedia === 'number') {
        punto[nivel] = total.stats.notaMedia;
      }
    });
    return punto;
  });

  return { datos, niveles };
};

export { compararTrimestres };
