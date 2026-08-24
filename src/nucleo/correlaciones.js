/* Núcleo — las correlaciones entre asignaturas
 *
 * Sin React.
 *
 * ---------------------------------------------------------------------------
 * LA GRÁFICA LLAMADA «EVOLUCIÓN» NO EVOLUCIONABA
 *
 * Las dos gráficas de correlaciones recorrían TODOS los trimestres cargados y
 * escribían en la misma clave:
 *
 *     Object.entries(correlacionesCompletas).forEach(([trim, corrs]) => {
 *       const corr = corrs.find(...);
 *       if (corr) punto[nivel] = corr.Correlacion;   // gana el último
 *     });
 *
 * El trimestre no formaba parte de la dimensión del dato, así que **el último
 * que se hubiera cargado pisaba a los anteriores**. Con la primera evaluación
 * en 0,82 y la segunda en 0,55, la gráfica enseñaba 0,55 y nada indicaba que
 * hubiera descartado la otra. Y si los ficheros se cargaban en otro orden, el
 * número cambiaba sin que cambiaran los datos.
 *
 * Mirando los dos ejes se ve que el problema es más de fondo: una gráfica tiene
 * los PARES en el eje X y los niveles como series; la otra, los NIVELES en el
 * eje X y los pares como series. **En ninguna de las dos el tiempo es un eje**,
 * así que no hay sitio donde poner un segundo trimestre.
 *
 * La decisión, mientras no se rediseñe: se enseñan las correlaciones **del
 * trimestre seleccionado**, que es determinista y es lo que el usuario cree
 * estar mirando. Sin sorpresas por orden de carga.
 *
 * ---------------------------------------------------------------------------
 * DOS DETALLES QUE TAMBIÉN ESTABAN MAL
 *
 *   · El par se identificaba con `` `${a}-${b}` `` y luego se partía con
 *     `split('-')`. Cualquier asignatura con un guion en el nombre se rompía.
 *     Aquí el par es un objeto y nunca se vuelve a partir una cadena.
 *   · El promedio de correlaciones se hacía sumando y dividiendo. Un
 *     coeficiente de correlación **no se promedia así**: sesga a la baja. Se
 *     usa la transformada de Fisher, que es el promedio correcto.
 */

import { detectarEtapa } from './estadistica.js';

/** Clave estable de un par, inmune a los guiones del nombre. */
export const clavePar = (a, b) => JSON.stringify([String(a || ''), String(b || '')]);

/** Los pares de asignaturas presentes, filtrados por etapa. */
export const paresDe = (correlaciones, modoEtapa) => {
  const vistos = new Map();
  (correlaciones || []).forEach((c) => {
    const etapa = detectarEtapa(c.Nivel);
    if (modoEtapa && modoEtapa !== 'TODOS' && etapa !== modoEtapa) return;
    const clave = clavePar(c.Asignatura1, c.Asignatura2);
    if (!vistos.has(clave)) {
      vistos.set(clave, { clave, asig1: c.Asignatura1, asig2: c.Asignatura2 });
    }
  });
  return Array.from(vistos.values());
};

/** El coeficiente de un par en un nivel, o `null`. */
export const correlacionDe = (correlaciones, par, nivel) => {
  const c = (correlaciones || []).find((x) =>
    x.Asignatura1 === par.asig1 && x.Asignatura2 === par.asig2 && x.Nivel === nivel);
  return c && typeof c.Correlacion === 'number' ? c.Correlacion : null;
};

/** Promedio de coeficientes de correlación por la transformada de Fisher.
 *  Promediarlos a pelo sesga a la baja, porque la escala de r no es lineal.
 *  Los ±1 exactos se recortan: `atanh(1)` es infinito. */
export const mediaFisher = (valores) => {
  const v = (valores || []).filter((x) => typeof x === 'number' && !isNaN(x));
  if (!v.length) return null;
  const z = v.map((r) => {
    const rr = Math.max(-0.999999, Math.min(0.999999, r));
    return 0.5 * Math.log((1 + rr) / (1 - rr));
  });
  const media = z.reduce((s, x) => s + x, 0) / z.length;
  return Math.tanh(media);
};

/** Los pares con mayor correlación media (en valor absoluto), para quedarse
 *  con los que dicen algo. */
export const paresMasFuertes = (correlaciones, pares, niveles, cuantos) => {
  const conFuerza = pares.map((par) => {
    const valores = (niveles || [])
      .map((n) => correlacionDe(correlaciones, par, n))
      .filter((x) => x !== null)
      .map(Math.abs);
    return { par, fuerza: mediaFisher(valores) };
  });
  return conFuerza
    .filter((x) => x.fuerza !== null)
    .sort((a, b) => b.fuerza - a.fuerza)
    .slice(0, cuantos || 10)
    .map((x) => x.par);
};

/** Eje X = MOMENTOS, una serie por par. La única que evoluciona de verdad.
 *
 * Las otras dos ponen en el eje los pares o los niveles, así que enseñan la
 * foto del momento elegido: cambias de trimestre y ves otra foto, pero nunca
 * la trayectoria. La gráfica se llamaba «evolución» y no evolucionaba.
 *
 * Dos reglas que no se ven y deciden si el dibujo miente:
 *
 * · Los coeficientes de los distintos niveles se promedian por **Fisher**, no
 *   a pelo. La escala de r no es lineal y la media aritmética sesga a la baja:
 *   0,9 y 0,5 no dan 0,7.
 * · Un par que falta en un momento **no recibe punto**, así que la línea se
 *   corta. Rellenarlo con el valor de al lado dibujaría una tendencia que
 *   nadie ha medido, que es la misma regla que la gráfica de evolución de
 *   notas.
 *
 * @param porMomento  { momento: [correlaciones] }
 * @param pares       los pares a seguir
 * @param momentos    en orden
 * @param niveles     los niveles a promediar; vacío o `null` = todos los que haya
 * @returns [{ momento, [clave del par]: r }]
 */
export const porMomentos = (porMomento, pares, momentos, niveles, abreviar) => {
  const corto = abreviar || ((s) => s);
  return (momentos || []).map((momento) => {
    const corrs = (porMomento || {})[momento] || [];
    const punto = { momento };
    (pares || []).forEach((par) => {
      const usar = (niveles && niveles.length)
        ? niveles
        : [...new Set(corrs.filter((c) => c.Asignatura1 === par.asig1
                                       && c.Asignatura2 === par.asig2).map((c) => c.Nivel))];
      const valores = usar.map((n) => correlacionDe(corrs, par, n)).filter((x) => x !== null);
      const r = mediaFisher(valores);
      if (r !== null) punto[`${corto(par.asig1)}-${corto(par.asig2)}`] = r;
    });
    return punto;
  });
};

/** Eje X = pares, una serie por nivel. */
export const porPares = (correlaciones, pares, niveles, abreviar) => {
  const corto = abreviar || ((s) => s);
  return pares.map((par) => {
    const punto = {
      par: `${corto(par.asig1)}-${corto(par.asig2)}`,
      parCompleto: `${par.asig1} ↔ ${par.asig2}`
    };
    (niveles || []).forEach((nivel) => {
      const r = correlacionDe(correlaciones, par, nivel);
      if (r !== null) punto[nivel] = r;
    });
    return punto;
  });
};

/** Eje X = niveles, una serie por par. */
export const porNiveles = (correlaciones, pares, niveles, abreviar) => {
  const corto = abreviar || ((s) => s);
  return (niveles || []).map((nivel) => {
    const punto = { nivel };
    pares.forEach((par) => {
      const r = correlacionDe(correlaciones, par, nivel);
      if (r !== null) punto[`${corto(par.asig1)}-${corto(par.asig2)}`] = r;
    });
    return punto;
  });
};
