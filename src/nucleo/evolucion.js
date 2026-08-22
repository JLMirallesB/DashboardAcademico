/* Núcleo — la evolución entre trimestres
 *
 * Sin React. Había dos cálculos casi iguales y en sitios muy distintos: uno
 * dentro del render de la vista «Evolución» y otro en un `useMemo` que prepara
 * la gráfica del PDF. Los dos construyen el eje temporal, y los dos lo
 * construyen mal, cada uno a su manera.
 *
 * ---------------------------------------------------------------------------
 * DE QUÉ VA EL PROBLEMA, PORQUE NO ES OBVIO
 *
 * Un trimestre aquí no es «1EV»: es «1EV-EEM» o «1EV-EPM». La etapa forma
 * parte de la clave porque cada fichero trae una. Pero **la etapa no es una
 * posición en el tiempo**: la primera evaluación de elemental y la primera de
 * profesional son el mismo momento del curso.
 *
 * Si se usa la clave completa como eje X, el eje queda
 * `1EV-EEM, 1EV-EPM, 2EV-EEM, 2EV-EPM` y entre la primera y la segunda
 * evaluación de elemental se cuela la primera de profesional. La línea zigzaguea
 * y se lee como «baja y luego sube» cuando las dos etapas suben.
 *
 * Lo correcto: **el eje es la evaluación, y la etapa es una dimensión de la
 * serie.** Eso es lo que hace `evaluacionesDe` en `texto.js`.
 */

import { parseTrimestre, getTrimestreBase, compararTrimestres, ordenDeEvaluacion } from './texto.js';

/** La evolución de las selecciones que el usuario ha ido añadiendo
 *  (cada una es un par nivel + asignatura).
 *
 * @param opciones { trimestresDisponibles, datosCompletos, selecciones, modoEtapa }
 * @returns { puntos, hayDatos }
 */
export const serieEvolucionSelecciones = ({
  trimestresDisponibles = [],
  datosCompletos = {},
  selecciones = [],
  modoEtapa
}) => {
  /* TODO(fallo 1): en modo TODOS esto no filtra nada, así que el eje pasa a
     ser la lista completa de claves compuestas y mezcla las dos etapas en la
     misma línea temporal. */
  const trimestres = trimestresDisponibles.filter((t) => {
    if (modoEtapa === 'TODOS') return true;
    const p = parseTrimestre(t);
    return p && p.etapa === modoEtapa;
  });

  const puntos = trimestres.map((trim) => {
    const punto = { trimestre: trim };
    selecciones.forEach((sel, idx) => {
      const d = datosCompletos[trim] &&
                datosCompletos[trim][sel.nivel] &&
                datosCompletos[trim][sel.nivel][sel.asignatura];
      punto[`notaMedia_${idx}`] = (d && d.stats && d.stats.notaMedia) || null;
      punto[`label_${idx}`] = `${sel.nivel}-${sel.asignatura}`;
    });
    return punto;
  });

  const hayDatos = puntos.some((p) =>
    selecciones.some((_, idx) => p[`notaMedia_${idx}`] !== null));

  return { puntos, hayDatos };
};

/** La evolución de la nota media de cada nivel, para la gráfica del informe.
 *
 * @param opciones { trimestresDisponibles, datosCompletos }
 * @returns { datos, niveles } — o `null` si no hay al menos dos trimestres.
 */
export const serieEvolucionNiveles = ({
  trimestresDisponibles = [],
  datosCompletos = {}
}) => {
  if (trimestresDisponibles.length < 2) return null;

  /* Ordena solo por evaluación, así que dos etapas de la misma evaluación
     quedan una detrás de otra en un orden que depende de la carga. */
  const ordenados = [...trimestresDisponibles].sort((a, b) =>
    ordenDeEvaluacion(getTrimestreBase(a)) - ordenDeEvaluacion(getTrimestreBase(b)));

  const nivelesSet = new Set();
  ordenados.forEach((trim) => {
    Object.keys(datosCompletos[trim] || {}).forEach((nivel) => {
      if (nivel !== 'GLOBAL') nivelesSet.add(nivel);
    });
  });

  /* TODO(fallo 2): ordena solo por el número, así que 1EEM y 1EPM quedan
     intercalados de forma arbitraria en la leyenda. */
  const niveles = Array.from(nivelesSet).sort((a, b) => {
    const na = parseInt((a.match(/\d+/) || ['0'])[0], 10);
    const nb = parseInt((b.match(/\d+/) || ['0'])[0], 10);
    return na - nb;
  });

  /* TODO(fallo 2): la etiqueta se colapsa a la evaluación pero los puntos NO
     se fusionan, así que el eje sale literalmente «1EV, 1EV, 2EV, 2EV» y las
     líneas de una etapa cruzan por encima de los puntos de la otra. */
  const datos = ordenados.map((trim) => {
    const punto = { trimestre: getTrimestreBase(trim) };
    niveles.forEach((nivel) => {
      const total = datosCompletos[trim] &&
                    datosCompletos[trim][nivel] &&
                    datosCompletos[trim][nivel]['Total'];
      if (total && total.stats && total.stats.notaMedia) {
        punto[nivel] = total.stats.notaMedia;
      }
    });
    return punto;
  });

  return { datos, niveles };
};

export { compararTrimestres };
