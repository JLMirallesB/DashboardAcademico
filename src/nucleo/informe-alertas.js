/* Núcleo — el relato del curso en el informe: cuántas alertas hay y qué se mueve
 *
 * Sin React y sin jsPDF, como `informe.js`: aquí está QUÉ dice esta sección y
 * el pintor se queda con las coordenadas.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EL INFORME LA NECESITA
 *
 * La vista «Alertas a lo largo del curso» existe en pantalla desde hace
 * tiempo y el núcleo ya la calcula (`serieAlertas`), pero **el PDF no la
 * menciona ni una vez**. Y el PDF es lo que se lleva a la reunión: el informe
 * cuenta la foto de una evaluación —medias, rankings, KPIs— y la película no
 * llega al papel. La nota media es la cifra que menos se mueve; un centro
 * puede tener 7,0 en las dos evaluaciones y haber pasado de tres asignaturas
 * problemáticas a nueve.
 *
 * ---------------------------------------------------------------------------
 * LA REGLA QUE ESTE ARCHIVO EXISTE PARA SOSTENER
 *
 * **Una asignatura que estaba en rojo y hoy no aparece NO ha mejorado.**
 *
 * El núcleo ya separa cuatro cosas que se parecen: `entran`, `salen`,
 * `nuevas` (hoy en rojo, ayer sin clasificar) y `desaparecidas` (ayer en rojo,
 * hoy sin clasificar), y a cada una de las dos últimas le pone su `motivo` —no
 * está en el CSV, se quedó con dos alumnos, o falta el fichero entero de su
 * etapa—. Juntar `salen` y `desaparecidas` en una sola columna sería escribir
 * en un papel que el centro ha resuelto unas asignaturas que nadie ha mirado.
 * Y en un papel no hay nadie al lado para decir «eso es que faltaba el
 * fichero de profesional». Por eso son columnas distintas, cada una con su
 * nombre y las desaparecidas con su motivo al lado.
 *
 * De ahí sale también la columna de variación: cuenta **entran menos salen**,
 * que es lo único que se ha medido en los dos momentos, y no la resta bruta de
 * recuentos (`variacion`), que incluye las que aparecen y las que dejan de
 * medirse. Es la misma corrección que ya se hizo en la pantalla, donde un −1
 * salía en verde porque no se había cargado el fichero de una etapa.
 *
 * ---------------------------------------------------------------------------
 * LOS RÓTULOS ENTRAN DE FUERA
 *
 * Ni una traducción aquí dentro: el informe se genera en castellano o en
 * valenciano y quien traduce es quien llama. Lo que falte se escribe con su
 * clave estable —«sinFichero»— y no con un hueco en blanco: un rótulo que
 * falta es un descuido que se arregla, y un hueco justo en la columna que
 * existe para no dar por buena una mejora inventada es el fallo original otra
 * vez.
 */

import { entero, porcentaje, conSigno, SIN_DATO } from './informe.js';
import { parseTrimestre } from './texto.js';

/** Un rótulo de fuera, o su clave si no lo han pasado. Nunca vacío. */
const rot = (rotulos, clave) => {
  const v = rotulos && rotulos[clave];
  return typeof v === 'string' && v.trim() ? v : clave;
};

/** Una plantilla con `{marcador}`, rellenada. Los marcadores son los mismos
 *  que usa la pantalla, para que las claves de traducción se puedan compartir. */
const rellenar = (plantilla, valores) =>
  Object.keys(valores).reduce(
    (txt, k) => txt.split(`{${k}}`).join(String(valores[k])), plantilla);

/** El rótulo de un momento del curso. Lo pone quien pinta, porque solo él sabe
 *  si hay dos cursos académicos cargados y hay que decir de cuál es cada punto;
 *  el núcleo se queda con la clave, que es un identificador. */
const rotularMomento = (rotulos, momento, respaldo) => {
  const f = rotulos && rotulos.momento;
  if (typeof f === 'function') {
    const r = f(momento);
    if (typeof r === 'string' && r.trim()) return r;
  }
  if (momento && typeof momento.base === 'string' && momento.base) return momento.base;
  return typeof respaldo === 'string' && respaldo ? respaldo : SIN_DATO;
};

/** El motivo por el que una asignatura ya no se clasifica, con el rótulo que
 *  haya puesto quien llama. Sin rótulo se escribe la clave del núcleo: el
 *  vocabulario de `MOTIVOS` es cerrado y una clave suelta se lee y se arregla;
 *  un hueco, no. */
const rotularMotivo = (rotulos, motivo) => {
  const tabla = (rotulos && rotulos.motivos) || {};
  const v = tabla[motivo];
  if (typeof v === 'string' && v.trim()) return v;
  return typeof motivo === 'string' && motivo ? motivo : SIN_DATO;
};

/** Dónde está una asignatura: su etapa y su curso, como vienen del núcleo. */
const situacion = (item) =>
  [item.etapa, item.nivel].filter(Boolean).join(' · ') || SIN_DATO;

const nombreDe = (item) =>
  (item && typeof item.asignatura === 'string' && item.asignatura) || SIN_DATO;

/** La celda de una de las cuatro listas: el recuento y los nombres.
 *
 *  Con la lista vacía se escribe «0» y no «—», y la diferencia importa: aquí
 *  el cero SÍ está medido —se han comparado las dos evaluaciones y no ha
 *  entrado ninguna—, así que ponerle el guion de «no hay dato» sería tirar
 *  por la borda la única información que da esa celda. */
const celdaLista = (items, pie) => {
  const lista = items || [];
  if (!lista.length) return entero(0);
  const nombres = lista.map((a) => {
    const base = `${nombreDe(a)} (${situacion(a)})`;
    const extra = pie ? pie(a) : '';
    return extra ? `${base} — ${extra}` : base;
  });
  return `${lista.length} — ${nombres.join('; ')}`;
};

/** Las etapas que han aportado fichero a un punto de la serie.
 *  Se leen de la clave del fichero LEÍDO, no de la que se pedía: es el mismo
 *  criterio que usa `alertas.js` para etiquetar las filas. */
const etapasDe = (punto) => {
  const vistas = [];
  (punto.trimestres || []).forEach((t) => {
    const p = parseTrimestre(t);
    const e = p ? p.etapa : null;
    if (vistas.indexOf(e) < 0) vistas.push(e);
  });
  return vistas;
};

const VACIO = () => ({ vacio: true, cabecera: [], filas: [], avisos: [] });

/* ------------------------------------------------------------------ */

/** El recuento de alertas en cada momento del curso: una fila por punto.
 *
 * @param serie    lo que devuelve `serieAlertas`
 * @param rotulos  { momento(m), colMomento, colDificiles, colNeutrales,
 *                   colFaciles, colTotal, colPctDificiles,
 *                   avisoSinClasificar, avisoFicherosDesiguales }
 * @returns { vacio, cabecera, filas, avisos }
 */
export const tablaRecuento = (serie, rotulos = {}) => {
  const puntos = (serie && serie.puntos) || [];

  /* `hayDatos` en falso es tanto «no se ha cargado nada de esta etapa» como
     «no hay umbrales con los que clasificar». En los dos casos la tabla sería
     una columna de ceros, y una columna de ceros en un PDF se lee como «no hay
     ninguna asignatura en rojo», que es justo lo contrario. */
  if (!serie || !serie.hayDatos || !puntos.length) return VACIO();

  const cabecera = ['colMomento', 'colDificiles', 'colNeutrales', 'colFaciles',
                    'colTotal', 'colPctDificiles'].map((k) => rot(rotulos, k));

  const filas = puntos.map((p) => [
    rotularMomento(rotulos, p.momento, p.evaluacion),
    entero(p.dificiles),
    entero(p.neutrales),
    entero(p.faciles),
    entero(p.total),
    /* El núcleo devuelve `null` cuando no hay nada que dividir, y aquí se
       respeta: «0.0%» de difíciles se lee como una medición excelente. */
    porcentaje(p.porcentajeDificiles)
  ]);

  const avisos = [];

  /* Un punto sin ninguna asignatura clasificada enseña «0 difíciles», que en
     una tabla al lado de un 4 y un 3 parece el mejor momento del curso. */
  const sinClasificar = puntos.filter((p) => !p.total);
  if (sinClasificar.length) {
    avisos.push(rellenar(rot(rotulos, 'avisoSinClasificar'), {
      n: sinClasificar.length,
      momentos: sinClasificar
        .map((p) => rotularMomento(rotulos, p.momento, p.evaluacion)).join(', ')
    }));
  }

  /* Y el caso más traicionero, que en pantalla se ve mirando la lista de
     debajo y en un papel no se ve de ninguna manera: un momento que sale de
     menos ficheros que los demás. Si en la segunda evaluación solo se cargó
     elemental, TODO profesional deja de contarse y el recuento baja sin que
     nadie haya arreglado nada. */
  const maxFicheros = puntos.reduce((m, p) => Math.max(m, etapasDe(p).length), 0);
  const cojos = puntos.filter((p) => etapasDe(p).length < maxFicheros);
  if (cojos.length) {
    avisos.push(rellenar(rot(rotulos, 'avisoFicherosDesiguales'), {
      n: cojos.length,
      momentos: cojos
        .map((p) => rotularMomento(rotulos, p.momento, p.evaluacion)).join(', ')
    }));
  }

  return { vacio: false, cabecera, filas, avisos };
};

/* ------------------------------------------------------------------ */

/** Qué entra y qué sale entre una evaluación y la siguiente: una fila por
 *  salto, con las cuatro listas SEPARADAS.
 *
 * @param serie    lo que devuelve `serieAlertas`
 * @param rotulos  { momento(m), colSalto, colVariacion, colEntran, colSalen,
 *                   colNuevas, colDesaparecidas, motivos: {...},
 *                   avisoNuevas, avisoDesaparecidas, avisoNoAtribuible }
 * @returns { vacio, cabecera, filas, avisos }
 */
export const tablaCambios = (serie, rotulos = {}) => {
  const cambios = (serie && serie.cambios) || [];

  /* Con una sola evaluación cargada hay recuento pero no hay nada que
     comparar. Una tabla en blanco con su cabecera diría que se ha mirado y no
     se ha movido nada; la sección se salta y quien lee no se lleva esa idea. */
  if (!serie || !serie.hayDatos || !cambios.length) return VACIO();

  const cabecera = ['colSalto', 'colVariacion', 'colEntran', 'colSalen',
                    'colNuevas', 'colDesaparecidas'].map((k) => rot(rotulos, k));

  const conMotivo = (a) => rotularMotivo(rotulos, a.motivo);

  const filas = cambios.map((c) => {
    const entran = c.entran || [];
    const salen = c.salen || [];
    /* Lo que de verdad ha movido el centro: las que se miden en los DOS
       momentos. `c.variacion` es la resta bruta de recuentos, así que suma las
       que aparecen y resta las que dejan de medirse — con Piano en rojo en las
       dos etapas y el fichero de profesional sin cargar, esa resta daba −1 y
       se leía como una mejora. */
    const neto = entran.length - salen.length;

    return [
      `${rotularMomento(rotulos, c.deMomento, c.de)} → ${rotularMomento(rotulos, c.aMomento, c.a)}`,
      /* Sin cambio se escribe «0» y no «+0»: un aumento de cero es una frase
         que no dice nadie, y el signo invita a leerlo como movimiento. */
      neto === 0 ? entero(0) : conSigno(neto, (n) => n.toFixed(0)),
      celdaLista(entran),
      celdaLista(salen),
      celdaLista(c.nuevas),
      /* El motivo viaja pegado al nombre. Es la única forma de que quien lee
         el PDF meses después distinga «ha dejado de ser difícil» de «ya no
         viene en el fichero». */
      celdaLista(c.desaparecidas, conMotivo)
    ];
  });

  const avisos = [];
  const suma = (campo) =>
    cambios.reduce((n, c) => n + ((c[campo] || []).length), 0);

  const nuevas = suma('nuevas');
  if (nuevas) {
    avisos.push(rellenar(rot(rotulos, 'avisoNuevas'), { n: nuevas }));
  }

  const desaparecidas = suma('desaparecidas');
  if (desaparecidas) {
    avisos.push(rellenar(rot(rotulos, 'avisoDesaparecidas'), { n: desaparecidas }));
  }

  /* Cuando el recuento total se ha movido por algo que no es mérito ni culpa
     de nadie, se dice, y se dice aparte de la columna: es un hecho, no una
     valoración. Sin esta frase, quien sume la columna de variación y la
     compare con la tabla de recuentos encuentra dos cifras distintas de lo
     mismo y no tiene forma de saber cuál creer. */
  const hayNoAtribuible = cambios.some((c) => {
    const neto = (c.entran || []).length - (c.salen || []).length;
    return typeof c.variacion === 'number' && c.variacion !== neto;
  });
  if (hayNoAtribuible) {
    avisos.push(rot(rotulos, 'avisoNoAtribuible'));
  }

  return { vacio: false, cabecera, filas, avisos };
};
