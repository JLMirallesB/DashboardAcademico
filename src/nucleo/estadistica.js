/* Núcleo — estadística: clasificación por umbrales y análisis de tendencia
 *
 * Sin React. `calcularTendencia` es matemática pura y se movió VERBATIM desde
 * `useStatisticalCalculations`: es el trozo más delicado del proyecto —
 * regresión lineal y cuadrática, puntos de inflexión y doce patrones— y
 * reescribirlo «de paso» habría sido cambiar resultados sin querer.
 *
 * Lo único que se separó es el ROTULO de cada patrón. Antes el mapa de
 * tendencias mezclaba la clasificación con `t(...)` y con clases de Tailwind,
 * así que no se podía usar fuera del navegador ni probar en node. Aquí queda
 * el dato —tipo, icono, color y prioridad de orden— y la traducción se pone
 * arriba, en la capa que pinta.
 */

/* ------------------------------------------------------------------ */
/* Clasificación por umbrales                                          */

/** DIFÍCIL / FÁCIL / null, según los umbrales configurables.
 *  Ojo al orden: difícil gana a fácil. Una asignatura con muchos suspensos y
 *  a la vez media alta se marca como difícil, que es lo que interesa mirar. */
export const calcularResultado = (stats, umbrales) => {
  if (!stats || !umbrales) return null;

  const esDificil = stats.suspendidos >= umbrales.suspensosAlerta ||
                    stats.notaMedia < umbrales.mediaCritica;
  const esFacil = stats.aprobados >= umbrales.aprobadosMinimo ||
                  stats.notaMedia >= umbrales.mediaFacil;

  if (esDificil) return 'DIFÍCIL';
  if (esFacil) return 'FÁCIL';
  return null;
};

/** La etapa a la que pertenece un nivel. `GLOBAL` no es de ninguna. */
export const detectarEtapa = (nivel) => {
  if (!nivel || nivel === 'GLOBAL') return null;
  if (String(nivel).includes('EEM')) return 'EEM';
  if (String(nivel).includes('EPM')) return 'EPM';
  return null;
};

/* ------------------------------------------------------------------ */
/* Tendencia                                                           */

/** Clasifica una serie de valores en uno de doce patrones.
 *  Devuelve { tipo, icono, pendiente, curvatura, confianza, r2, puntosInflexion }. */
export const calcularTendencia = (valores) => {
  if (!valores || valores.length < 2) {
    return {
      tipo: 'insuficiente',
      icono: '📊',
      pendiente: 0,
      curvatura: 0,
      confianza: 'baja',
      r2: 0
    };
  }

  // Filtrar valores nulos/undefined
  const valoresValidos = valores.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (valoresValidos.length < 2) {
    return {
      tipo: 'insuficiente',
      icono: '📊',
      pendiente: 0,
      curvatura: 0,
      confianza: 'baja',
      r2: 0
    };
  }

  const n = valoresValidos.length;

  // ========== REGRESIÓN LINEAL ==========
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  valoresValidos.forEach((y, x) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  });

  const denominador = (n * sumX2 - sumX * sumX);
  const pendiente = denominador !== 0 ? (n * sumXY - sumX * sumY) / denominador : 0;
  const intercepto = n !== 0 ? (sumY - pendiente * sumX) / n : 0;

  // Calcular R² para regresión lineal
  const mediaY = sumY / n;
  let ssTotal = 0, ssResidual = 0;
  valoresValidos.forEach((y, x) => {
    const yPred = pendiente * x + intercepto;
    ssTotal += (y - mediaY) ** 2;
    ssResidual += (y - yPred) ** 2;
  });
  const r2Lineal = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

  // ========== REGRESIÓN CUADRÁTICA (solo si tenemos suficientes datos) ==========
  let curvatura = 0;
  let r2Cuadratica = 0;

  if (n >= 3) {
    // Resolver sistema de ecuaciones para regresión cuadrática: y = ax² + bx + c
    let sumX3 = 0, sumX4 = 0, sumX2Y = 0;
    valoresValidos.forEach((y, x) => {
      sumX3 += x ** 3;
      sumX4 += x ** 4;
      sumX2Y += (x ** 2) * y;
    });

    // Matriz de coeficientes y resolución
    const denom = (sumX4 * (sumX2 * n - sumX * sumX) - sumX3 * (sumX3 * n - sumX * sumX2) + sumX2 * (sumX3 * sumX - sumX2 * sumX2));

    if (Math.abs(denom) > 1e-10) {
      curvatura = (
        (sumX2Y * (sumX2 * n - sumX * sumX) - sumXY * (sumX3 * n - sumX * sumX2) + sumY * (sumX3 * sumX - sumX2 * sumX2))
      ) / denom;

      // Calcular R² para regresión cuadrática
      const b = ((sumX2 * sumX2Y - sumX4 * sumXY) + (sumX3 * sumY * sumX - sumX2 * sumY * sumX2)) / denom;
      const c = (sumY - b * sumX - curvatura * sumX2) / n;

      let ssResidualCuad = 0;
      valoresValidos.forEach((y, x) => {
        const yPred = curvatura * x * x + b * x + c;
        ssResidualCuad += (y - yPred) ** 2;
      });
      r2Cuadratica = ssTotal > 0 ? 1 - (ssResidualCuad / ssTotal) : 0;
    }
  }

  // ========== DETECCIÓN DE PUNTOS DE INFLEXIÓN ==========
  let puntosInflexion = 0;
  let esRecuperacion = false;
  let esPico = false;

  if (n >= 4) {
    const diferencias = [];
    for (let i = 1; i < valoresValidos.length; i++) {
      diferencias.push(valoresValidos[i] - valoresValidos[i - 1]);
    }

    // Contar cambios de signo en las diferencias
    for (let i = 1; i < diferencias.length; i++) {
      if (diferencias[i - 1] * diferencias[i] < 0) {
        puntosInflexion++;
      }
    }

    // Detectar forma de U (recuperación): primero baja, luego sube
    if (puntosInflexion === 1) {
      const mitad = Math.floor(diferencias.length / 2);
      const primerosDiferencias = diferencias.slice(0, mitad);
      const segundosDiferencias = diferencias.slice(mitad);

      const mediaPrimeros = primerosDiferencias.length > 0
        ? primerosDiferencias.reduce((a, b) => a + b, 0) / primerosDiferencias.length
        : 0;
      const mediaSegundos = segundosDiferencias.length > 0
        ? segundosDiferencias.reduce((a, b) => a + b, 0) / segundosDiferencias.length
        : 0;

      if (mediaPrimeros < -0.1 && mediaSegundos > 0.1) {
        esRecuperacion = true;
      } else if (mediaPrimeros > 0.1 && mediaSegundos < -0.1) {
        esPico = true;
      }
    }
  }

  // ========== ANÁLISIS DE OSCILACIONES ==========
  let varianzaDiferencias = 0;
  if (n >= 3) {
    const diferencias = [];
    for (let i = 1; i < valoresValidos.length; i++) {
      diferencias.push(valoresValidos[i] - valoresValidos[i - 1]);
    }

    const mediaDif = diferencias.length > 0
      ? diferencias.reduce((a, b) => a + b, 0) / diferencias.length
      : 0;
    varianzaDiferencias = diferencias.length > 0
      ? diferencias.reduce((sum, d) => sum + (d - mediaDif) ** 2, 0) / diferencias.length
      : 0;
  }

  // ========== CLASIFICACIÓN EN CATEGORÍAS ==========
  const confianza = n >= 4 ? 'alta' : 'baja';
  const umbralEstable = 0.1;
  const umbralCurvatura = 0.05;
  const umbralOscilacion = 0.5;

  let tipo, icono;

  // Prioridad 1: Patrones insuficientes o irregulares
  if (r2Lineal < 0.3 && n >= 3 && varianzaDiferencias > umbralOscilacion) {
    if (puntosInflexion >= 2) {
      tipo = 'oscilante';
      icono = '〰️';
    } else {
      tipo = 'irregular';
      icono = '❓';
    }
  }
  // Prioridad 2: Patrones U/∩ (muy relevantes pedagógicamente)
  else if (esRecuperacion) {
    tipo = 'valle';
    icono = '↗️';
  }
  else if (esPico) {
    tipo = 'pico';
    icono = '⚠️';
  }
  // Prioridad 3: Patrones con curvatura significativa
  else if (n >= 3 && Math.abs(curvatura) > umbralCurvatura && r2Cuadratica > r2Lineal + 0.1) {
    if (pendiente > umbralEstable && curvatura > 0) {
      tipo = 'creciente_acelerado';
      icono = '🚀';
    } else if (pendiente > umbralEstable && curvatura < 0) {
      tipo = 'creciente_desacelerado';
      icono = '📈';
    } else if (pendiente < -umbralEstable && curvatura < 0) {
      tipo = 'decreciente_acelerado';
      icono = '📉';
    } else if (pendiente < -umbralEstable && curvatura > 0) {
      tipo = 'decreciente_desacelerado';
      icono = '⬇️';
    } else {
      // Curvatura sin tendencia clara
      tipo = 'estable';
      icono = '➖';
    }
  }
  // Prioridad 4: Patrones lineales simples
  else {
    if (Math.abs(pendiente) < umbralEstable) {
      tipo = 'estable';
      icono = '➖';
    } else if (pendiente > 0) {
      tipo = 'creciente_sostenido';
      icono = '↗️';
    } else {
      tipo = 'decreciente_sostenido';
      icono = '↘️';
    }
  }

  return {
    tipo,
    icono,
    pendiente,
    curvatura,
    confianza,
    r2: Math.max(r2Lineal, r2Cuadratica),
    puntosInflexion
  };
};

/* Lo que cada patrón significa para quien pinta: icono, color y en qué orden
   sale en un listado. Las etiquetas y descripciones NO están aquí — son
   traducibles y se resuelven arriba con `t('trend' + …)`. */
export const TENDENCIAS = {
  insuficiente:             { icono: '📊', color: 'bg-gray-100 text-gray-700',       prioridad: 0 },
  estable:                  { icono: '➖', color: 'bg-blue-100 text-blue-700',       prioridad: 5 },
  creciente_sostenido:      { icono: '↗️', color: 'bg-green-100 text-green-700',     prioridad: 8 },
  decreciente_sostenido:    { icono: '↘️', color: 'bg-red-100 text-red-700',         prioridad: 2 },
  creciente_acelerado:      { icono: '🚀', color: 'bg-emerald-100 text-emerald-700', prioridad: 10 },
  creciente_desacelerado:   { icono: '📈', color: 'bg-green-100 text-green-600',     prioridad: 7 },
  decreciente_acelerado:    { icono: '📉', color: 'bg-rose-100 text-rose-700',       prioridad: 1 },
  decreciente_desacelerado: { icono: '⬇️', color: 'bg-orange-100 text-orange-700',   prioridad: 3 },
  valle:                    { icono: '↗️', color: 'bg-teal-100 text-teal-700',       prioridad: 9 },
  pico:                     { icono: '⚠️', color: 'bg-amber-100 text-amber-700',     prioridad: 4 },
  oscilante:                { icono: '〰️', color: 'bg-purple-100 text-purple-700',   prioridad: 6 },
  irregular:                { icono: '❓', color: 'bg-gray-100 text-gray-600',       prioridad: 0 }
};

/** La clave de traducción de un patrón: 'valle' → 'trendValle'. Se deriva en
 *  vez de escribirse a mano para que añadir un patrón no obligue a tocar dos
 *  listas y dejarse una a medias. */
export const claveDeTendencia = (tipo) =>
  'trend' + String(tipo || 'insuficiente').split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
