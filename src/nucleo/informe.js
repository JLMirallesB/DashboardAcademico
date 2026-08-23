/* Núcleo — QUÉ dice el informe, separado de CÓMO se dibuja
 *
 * Sin React y sin jsPDF. `pdfGenerator.js` son 1.500 líneas de `pdf.text(...)`
 * en las que el cálculo y el dibujo estaban en la misma expresión, así que no
 * había forma de comprobar una cifra sin generar un PDF y mirarlo. Aquí está
 * lo que se puede comprobar: los valores, las diferencias y las filas de las
 * tablas. El pintor se queda con las coordenadas.
 *
 * ---------------------------------------------------------------------------
 * LA REGLA QUE ESTE ARCHIVO EXISTE PARA SOSTENER
 *
 * **Cero y «no hay dato» no son lo mismo**, y en un informe que se entrega
 * pesa más que en la pantalla: el PDF se imprime, se manda por correo y se
 * mira en una reunión meses después, sin nadie al lado que pueda decir «eso
 * es que faltaba la fila».
 *
 * El núcleo devuelve `null` cuando algo no se puede calcular —lo dice el
 * comentario de `kpi.js`— y la pantalla lo pinta «—». El informe lo pasaba
 * por `(valor || 0).toFixed(2)` en sesenta sitios, así que escribía «0,00»;
 * y peor, la diferencia con el centro salía «(-100,0 %)», que es una
 * medición que nadie ha hecho. Un cero de relleno se lee como un dato malo,
 * y un dato malo se lleva una decisión detrás.
 */

import { esAgregado } from './texto.js';

/** Lo que no hay se escribe así, en el informe y en la pantalla. */
export const SIN_DATO = '—';

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);

/** Un valor con su formato, o «—» si no hay dato.
 *  @param formato  función que recibe el número y devuelve el texto */
export const texto = (valor, formato) => (
  esNumero(valor) ? formato(valor) : SIN_DATO
);

export const nota = (v) => texto(v, (n) => n.toFixed(2));
export const porcentaje = (v) => texto(v, (n) => `${n.toFixed(1)}%`);
export const entero = (v) => texto(v, (n) => n.toFixed(0));

/** La diferencia porcentual con la referencia, entre paréntesis.
 *
 *  Cadena vacía cuando no se puede calcular, que son tres casos y los tres
 *  daban un número antes: sin valor —salía «(-100,0 %)», la distancia de cero
 *  a la media del centro—, sin referencia, y con la referencia a cero, que es
 *  una división por cero. */
export const diferenciaPct = (valor, referencia) => {
  if (!esNumero(valor) || !esNumero(referencia) || referencia === 0) return '';
  const d = ((valor - referencia) / referencia) * 100;
  return `(${d > 0 ? '+' : ''}${d.toFixed(1)}%)`;
};

/** Un valor y su diferencia con el centro, tal como va a la celda. */
export const celdaConDiferencia = (valor, referencia, formato) => {
  const dif = diferenciaPct(valor, referencia);
  const v = texto(valor, formato);
  return dif ? `${v} ${dif}` : v;
};

/** La diferencia en bruto —no porcentual—, con su signo.
 *  `null` cuando falta cualquiera de los dos: restar de un hueco da un número
 *  con toda la pinta de ser una medición. */
export const diferencia = (valor, referencia) => (
  esNumero(valor) && esNumero(referencia) ? valor - referencia : null
);

/** Con signo delante, que es como se lee una diferencia. */
export const conSigno = (valor, formato) => (
  esNumero(valor) ? `${valor >= 0 ? '+' : ''}${formato(valor)}` : SIN_DATO
);

/* ------------------------------------------------------------------ */

/** La media de una asignatura agregando todos los cursos, ponderada por
 *  registros.
 *
 *  Lo que arregla respecto de la versión que estaba dentro del PDF: **una
 *  asignatura sin nota media no cuenta como un cero**. Antes sumaba
 *  `(notaMedia || 0) * registros` y dividía por TODOS los registros, así que
 *  un curso sin nota tiraba la media de la asignatura hacia abajo en
 *  proporción a su tamaño — y el informe lo presentaba como si esa asignatura
 *  fuera peor de lo que es. Y `registros || 1` convertía una fila de cero
 *  registros en una de uno.
 *
 *  @param datosTrimestre  { GLOBAL: {...}, '1EEM': {...}, ... }
 *  @param incluir         (asignatura) => bool — el filtro de agrupaciones
 *  @returns [{ asignatura, notaMedia, aprobados, registros, cursos }]
 */
export const porAsignaturaAgregada = (datosTrimestre, incluir) => {
  const acc = new Map();
  Object.entries(datosTrimestre || {}).forEach(([nivel, asigs]) => {
    if (nivel === 'GLOBAL') return;
    Object.entries(asigs || {}).forEach(([asig, data]) => {
      if (esAgregado(asig)) return;
      if (incluir && !incluir(asig)) return;
      const s = data && data.stats;
      if (!s) return;
      const registros = esNumero(s.registros) ? s.registros : 0;
      if (registros <= 0) return;
      if (!acc.has(asig)) {
        acc.set(asig, { asignatura: asig, sumaNota: 0, pesoNota: 0,
                        sumaAprob: 0, pesoAprob: 0, registros: 0, cursos: 0 });
      }
      const a = acc.get(asig);
      a.registros += registros;
      a.cursos++;
      /* Cada métrica lleva su propio peso: una asignatura puede traer la nota
         media de un curso y no la de otro, y mezclar los denominadores es
         justo lo que producía la media hundida. */
      if (esNumero(s.notaMedia)) { a.sumaNota += s.notaMedia * registros; a.pesoNota += registros; }
      if (esNumero(s.aprobados)) { a.sumaAprob += s.aprobados * registros; a.pesoAprob += registros; }
    });
  });

  return Array.from(acc.values())
    .map((a) => ({
      asignatura: a.asignatura,
      notaMedia: a.pesoNota > 0 ? a.sumaNota / a.pesoNota : null,
      aprobados: a.pesoAprob > 0 ? a.sumaAprob / a.pesoAprob : null,
      registros: a.registros,
      cursos: a.cursos
    }))
    .sort((x, y) => x.asignatura.localeCompare(y.asignatura, 'es', { sensitivity: 'base' }));
};

/* ------------------------------------------------------------------ */

/** Las filas de la comparativa de KPIs: métrica, y una columna por bloque.
 *
 *  @param kpis      un bloque de KPIs (ya resuelto el modo etapa)
 *  @param columnas  [{ clave: 'Especialidades', sufijo: 'Especialidades' }]
 *                   donde `sufijo` es lo que va detrás de `notaMedia…`
 *  @param rotulos   { notaMedia, desviacion, moda, aprobados, suspendidos }
 */
export const filasComparativaKPI = (kpis, columnas, rotulos) => {
  const k = kpis || {};
  const metricas = [
    { campo: 'notaMedia', rotulo: rotulos.notaMedia, formato: (n) => n.toFixed(2) },
    { campo: 'desviacion', rotulo: rotulos.desviacion, formato: (n) => n.toFixed(2) },
    { campo: 'moda', rotulo: rotulos.moda, formato: (n) => n.toFixed(0) },
    { campo: 'aprobados', rotulo: rotulos.aprobados, formato: (n) => `${n.toFixed(1)}%` },
    { campo: 'suspendidos', rotulo: rotulos.suspendidos, formato: (n) => `${n.toFixed(1)}%` }
  ];

  return metricas.map((m) => {
    const centro = k[`${m.campo}Centro`];
    const celdas = columnas.map((c) => (
      c.esCentro
        ? texto(centro, m.formato)
        : celdaConDiferencia(k[`${m.campo}${c.sufijo}`], centro, m.formato)
    ));
    return [m.rotulo, ...celdas];
  });
};

export { esAgregado };
