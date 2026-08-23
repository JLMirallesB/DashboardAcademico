/* Núcleo — las familias de asignaturas, una contra otra
 *
 * Sin React. La sección `#AGRUPACIONES` del CSV dice a qué familias pertenece
 * cada asignatura —cuerda, madera, metal, tecla, lenguaje y voz, especialidad,
 * no-especialidad, teórica troncal…—, y hasta ahora eso solo servía para
 * FILTRAR el informe PDF. Aquí se usa para AGREGAR: poner la cuerda contra el
 * viento y ver si una va sistemáticamente por debajo de la otra, que es la
 * pregunta que se hace en una reunión de jefatura de estudios y que hoy se
 * contesta mirando treinta filas a ojo.
 *
 * ---------------------------------------------------------------------------
 * LAS FAMILIAS SE SOLAPAN: ESTO NO ES UN REPARTO DEL 100 %
 *
 * Piano está a la vez en «Especialidad» y en «Tecla». Violín está en
 * «Especialidad» y en «Cuerda». Así que **los registros de las familias suman
 * más que los del centro**, y una tarta o un «% del total» construidos con
 * estas cifras serían falsos: sumarían 180 % y cada porción mentiría sobre su
 * tamaño.
 *
 * Por eso aquí NO se devuelve ningún porcentaje sobre el total, ni siquiera
 * calculable de un vistazo: se devuelven `solape.registrosSumados` (lo que dan
 * las familias juntas) y `solape.registrosDistintos` (el universo de verdad),
 * que son dos números distintos y a la vista. Si alguien quiere pintar
 * proporciones, tiene delante la prueba de que no puede. Comparar familias
 * ENTRE SÍ sí es legítimo, y para eso está `compararFamilias`.
 *
 * ---------------------------------------------------------------------------
 * LA MEDIA DE UNA FAMILIA ES PONDERADA POR REGISTROS
 *
 * Nunca la media de las medias. Una asignatura de 40 alumnos y otra de 4 no
 * pesan igual: con 5,0 en la de 40 y 10,0 en la de 4, la ponderada da 5,45 y
 * la media simple 7,50. Dos puntos de diferencia sobre la misma realidad, y el
 * 7,50 no lo ha sacado nadie. La media simple convierte una asignatura
 * residual en medio centro.
 *
 * Cada magnitud lleva su propio peso: una fila sin nota media (`null`, que en
 * este proyecto significa «no hay dato» y nunca cero) no diluye la nota de la
 * familia, pero sí cuenta en los registros.
 */

import { normalizar, esAgregado } from './texto.js';
import { detectarEtapa } from './estadistica.js';
import { diferencia, CLAVES_COMPARABLES } from './comparacion.js';

/* Lo que el analizador escribe en la columna `Grupos` cuando una asignatura no
   tiene familia. El `'0'` no es un descuido nuestro: sale de la hoja de
   cálculo, y el filtro del informe PDF ya lo apartaba a mano
   (`DashboardAcademico.jsx`, `agrupacionesDisponiblesPDF`). Si no se aparta
   aquí, aparece una familia llamada «0» con media propia y pinta de dato. */
const GRUPOS_VACIOS = ['', '0'];

/* La familia de las que no tienen familia. Los paréntesis no son adorno: la
   clave se compara contra nombres de grupo que vienen del CSV, y sin ellos un
   centro que algún día escriba literalmente «Sin clasificar» en la columna
   `Grupos` fundiría las dos cosas en una. Para distinguirla en el código está
   `esSinClasificar`, que es el discriminante fiable. */
export const SIN_CLASIFICAR = '(sin clasificar)';

/** Las familias de una asignatura, normalizadas y sin los grupos de relleno. */
export const familiasDe = (asignatura, agrupaciones) => {
  const grupos = (agrupaciones || {})[normalizar(asignatura)];
  if (!Array.isArray(grupos)) return [];
  const vistas = [];
  grupos.forEach((g) => {
    const n = normalizar(g);
    /* Sin repetir: un `Grupos` mal escrito como «Cuerda;cuerda» contaría la
       asignatura dos veces DENTRO de la misma familia, y ahí el solape no es
       una propiedad del dominio sino una errata. */
    if (n && GRUPOS_VACIOS.indexOf(n) < 0 && vistas.indexOf(n) < 0) vistas.push(n);
  });
  return vistas;
};

/** Todas las familias que nombra un mapa de agrupaciones, en orden alfabético.
 *  Es lo que necesita un selector para ofrecer «cuerda contra viento». */
export const familiasDisponibles = (agrupaciones) => {
  const vistas = new Set();
  Object.keys(agrupaciones || {}).forEach((asig) => {
    familiasDe(asig, agrupaciones).forEach((f) => vistas.add(f));
  });
  return Array.from(vistas).sort((a, b) => a.localeCompare(b, 'es'));
};

/* ------------------------------------------------------------------ */

const acumuladorNuevo = (clave, esSinClasificar) => ({
  clave,
  esSinClasificar,
  nombres: new Set(),
  filas: 0,
  registros: 0,
  sumaNota: 0, pesoNota: 0,
  sumaAprob: 0, pesoAprob: 0,
  sumaSusp: 0, pesoSusp: 0
});

/** Suma una fila a una familia, magnitud a magnitud y con su peso propio. */
const acumular = (a, asignatura, stats, registros) => {
  a.nombres.add(asignatura);
  a.filas++;
  a.registros += registros;
  if (typeof stats.notaMedia === 'number' && registros > 0) {
    a.sumaNota += stats.notaMedia * registros; a.pesoNota += registros;
  }
  if (typeof stats.aprobados === 'number' && registros > 0) {
    a.sumaAprob += stats.aprobados * registros; a.pesoAprob += registros;
  }
  if (typeof stats.suspendidos === 'number' && registros > 0) {
    a.sumaSusp += stats.suspendidos * registros; a.pesoSusp += registros;
  }
};

/** Agrega las asignaturas de un trimestre por familia.
 *
 * @param datos     el trimestre: { GLOBAL: {...}, '1EEM': {...}, ... }
 * @param opciones  {
 *    agrupaciones,          mapa { asignatura normalizada → [familias] }
 *    modoEtapa,             'EEM' | 'EPM' | 'TODOS' — solo filtra en vista 'niveles'
 *    vista,                 'global' (por defecto) | 'niveles'
 *    umbrales,              de ahí sale `minimoRegistros` si no se pasa aparte
 *    minimoRegistros,       por debajo, la familia sale SIN medias y con motivo
 *    minimoAsignaturas,     ídem por número de asignaturas distintas (1 = apagado)
 *    incluirSinClasificar   true por defecto
 * }
 * @returns { familias, totales, solape }
 */
export const agruparPorFamilia = (datos, opciones = {}) => {
  const {
    agrupaciones = {},
    modoEtapa = 'TODOS',
    vista = 'global',
    umbrales,
    minimoAsignaturas = 1,
    incluirSinClasificar = true
  } = opciones;

  /* El mínimo por defecto es el mismo que usa el resto del proyecto para
     decidir si un porcentaje significa algo (`umbrales.alumnosMinimo`), pero
     medido sobre los REGISTROS de la familia, no sobre los de cada asignatura.
     Y el mínimo NO se aplica a los miembros: filtrar antes de agregar las
     asignaturas de pocos alumnos vaciaría de contenido justo lo que la familia
     viene a arreglar —que una clase de tres se pueda medir junto a las suyas—,
     y además cambiaría la población de la que se habla sin decirlo. */
  const minimoRegistros = opciones.minimoRegistros !== undefined
    ? opciones.minimoRegistros
    : (umbrales && typeof umbrales.alumnosMinimo === 'number' ? umbrales.alumnosMinimo : 0);

  const vacio = {
    familias: [],
    totales: { asignaturas: 0, filas: 0, registros: 0 },
    solape: { hay: false, asignaturas: [], registrosSumados: 0, registrosDistintos: 0 }
  };
  if (!datos) return vacio;

  const acum = new Map();
  const nombresUniverso = new Set();
  const familiasPorAsignatura = new Map();
  let filasUniverso = 0;
  let registrosUniverso = 0;

  Object.entries(datos).forEach(([nivel, asigs]) => {
    if (vista === 'global' && nivel !== 'GLOBAL') return;
    if (vista === 'niveles' && nivel === 'GLOBAL') return;
    if (nivel !== 'GLOBAL' && modoEtapa && modoEtapa !== 'TODOS' &&
        detectarEtapa(nivel) !== modoEtapa) return;

    Object.entries(asigs || {}).forEach(([asig, data]) => {
      /* Las filas agregadas no son asignaturas. «Total», «Total Especialidad»,
         «Total No Especialidad» y «Teórica Troncal» son SUMAS de las filas que
         están a su lado, y el CSV las agrupa igual que a sus partes: si entran,
         la familia cuenta a sus propios miembros dos veces y los duplica
         además en el peso, así que la media se desplaza hacia el agregado y
         los registros salen al doble. Es el mismo fallo que ya tenían el
         ranking de dificultad y la tarjeta de KPIs, y por eso el criterio vive
         en `esAgregado` y no en una comparación de cadenas aquí. */
      if (esAgregado(asig) || !data || !data.stats) return;

      const stats = data.stats;
      const registros = Number(stats.registros) || 0;

      nombresUniverso.add(normalizar(asig));
      filasUniverso++;
      registrosUniverso += registros;

      const familias = familiasDe(asig, agrupaciones);

      if (!familias.length) {
        /* Sin familia: van a su propio montón en vez de desaparecer. Si el
           analizador deja de clasificar una asignatura nueva —o la escribe con
           otra grafía—, callarla haría que se esfumara de la comparación sin
           que nada lo dijera, y las familias seguirían pareciendo completas.
           Con un montón visible, la omisión se ve el primer día. Quien pinte
           puede apartarla mirando `esSinClasificar`, pero apartarla es una
           decisión suya y no un silencio nuestro. */
        if (!incluirSinClasificar) return;
        if (!acum.has(SIN_CLASIFICAR)) acum.set(SIN_CLASIFICAR, acumuladorNuevo(SIN_CLASIFICAR, true));
        acumular(acum.get(SIN_CLASIFICAR), asig, stats, registros);
        return;
      }

      const yaVistas = familiasPorAsignatura.get(normalizar(asig)) || new Set();
      familias.forEach((f) => {
        yaVistas.add(f);
        if (!acum.has(f)) acum.set(f, acumuladorNuevo(f, false));
        acumular(acum.get(f), asig, stats, registros);
      });
      familiasPorAsignatura.set(normalizar(asig), yaVistas);
    });
  });

  const familias = Array.from(acum.values()).map((a) => {
    const nombres = Array.from(a.nombres).sort((x, y) => x.localeCompare(y, 'es'));
    let motivo = null;
    if (a.registros < minimoRegistros) motivo = 'pocosRegistros';
    else if (nombres.length < minimoAsignaturas) motivo = 'pocasAsignaturas';
    else if (a.pesoNota === 0 && a.pesoAprob === 0 && a.pesoSusp === 0) motivo = 'sinDato';

    /* `null` y no cero, como en todo el núcleo: un cero de relleno se lee como
       una medición —«la cuerda tiene un 0 % de aprobados»— y en el informe eso
       se imprime tal cual. El motivo viaja como clave estable, no como frase:
       lo que se pinta se traduce arriba. */
    const media = (suma, peso) => (motivo || peso === 0 ? null : suma / peso);

    return {
      clave: a.clave,
      esSinClasificar: a.esSinClasificar,
      /* `asignaturas` son nombres distintos y `filas` son filas agregadas: en
         vista 'niveles' Piano aparece en cada curso, así que 1 asignatura y 4
         filas. Confundirlos es contar cuatro pianos. */
      asignaturas: nombres.length,
      filas: a.filas,
      nombres,
      registros: a.registros,
      notaMedia: media(a.sumaNota, a.pesoNota),
      aprobados: media(a.sumaAprob, a.pesoAprob),
      suspendidos: media(a.sumaSusp, a.pesoSusp),
      motivo,
      minimoRegistros,
      minimoAsignaturas
    };
  });

  /* Lo que preocupa, arriba: nota media ascendente, igual que el ranking de
     dificultad. Las que no tienen media van detrás —no arriba, que las haría
     parecer las peores— y el montón de sin clasificar cierra siempre, porque
     no es una familia con la que competir. */
  familias.sort((a, b) => {
    if (a.esSinClasificar !== b.esSinClasificar) return a.esSinClasificar ? 1 : -1;
    const na = a.notaMedia, nb = b.notaMedia;
    if (na === null && nb === null) return a.clave.localeCompare(b.clave, 'es');
    if (na === null) return 1;
    if (nb === null) return -1;
    if (na !== nb) return na - nb;
    return a.clave.localeCompare(b.clave, 'es');
  });

  const compartidas = [];
  familiasPorAsignatura.forEach((fams, asig) => { if (fams.size > 1) compartidas.push(asig); });
  compartidas.sort((a, b) => a.localeCompare(b, 'es'));

  return {
    familias,
    /* El universo de verdad: cada asignatura una vez, pertenezca a las
       familias que pertenezca. */
    totales: {
      asignaturas: nombresUniverso.size,
      filas: filasUniverso,
      registros: registrosUniverso
    },
    solape: {
      hay: compartidas.length > 0,
      asignaturas: compartidas,
      registrosSumados: familias.reduce((s, f) => s + f.registros, 0),
      registrosDistintos: registrosUniverso
    }
  };
};

/* ------------------------------------------------------------------ */

/** La familia de clave `clave` dentro de un resultado, o `null`. */
export const familia = (resultado, clave) => {
  if (!resultado || !Array.isArray(resultado.familias)) return null;
  const buscada = normalizar(clave);
  return resultado.familias.find((f) => f.clave === buscada) || null;
};

/** Una familia frente a otra, cifra a cifra.
 *
 * La lectura de cada diferencia NO se decide aquí: se pide a `comparacion.js`,
 * que es donde vive la regla de que **subir el porcentaje de suspensos es
 * empeorar** mientras que subir la nota o los aprobados es mejorar. Escribir
 * un segundo criterio aquí es exactamente cómo se llega a que la misma
 * diferencia salga verde en una pantalla y roja en la otra.
 *
 * @returns null si falta alguna de las dos familias, o
 *          { familia, referencia, notaMedia, aprobados, suspendidos } donde
 *          cada cifra es `{ diff, mejora }` o `null` cuando no procede comparar
 *          —por ejemplo, si una de las dos no llega al mínimo de registros y
 *          por tanto no tiene media—.
 */
export const compararFamilias = (resultado, clave, claveReferencia) => {
  const a = familia(resultado, clave);
  const b = familia(resultado, claveReferencia);
  if (!a || !b) return null;

  const salida = { familia: a.clave, referencia: b.clave };
  CLAVES_COMPARABLES.forEach((k) => { salida[k] = diferencia(a[k], b[k], k); });
  return salida;
};
