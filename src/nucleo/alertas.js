/* Núcleo — cuántas asignaturas están en rojo, y cuáles entran y salen
 *
 * Sin React. La pantalla ya sabe clasificar un trimestre en DIFÍCIL / neutral
 * / FÁCIL, pero solo sabe hacerlo de UNO: se ve la foto, no la película.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ HACE FALTA, QUE NO ES OBVIO MIRANDO LA PANTALLA
 *
 * **La nota media es la cifra que menos se mueve.** Un centro puede tener 7,0
 * en la primera evaluación y 7,0 en la segunda y haber pasado de tres
 * asignaturas problemáticas a nueve: unas bajan, otras suben, y la media —que
 * es una media ponderada de todo— se queda quieta. La media lo esconde; el
 * recuento no.
 *
 * Y el recuento tampoco basta. «Hemos pasado de 3 a 5» no dice qué mirar el
 * lunes. Lo accionable es **qué asignaturas concretas entran y salen** de la
 * lista, así que eso es lo que se calcula aquí.
 *
 * ---------------------------------------------------------------------------
 * TRES COSAS QUE SE PARECEN Y NO SON LO MISMO
 *
 * Una asignatura que estaba en rojo y ya no aparece puede ser tres cosas
 * distintas, y confundirlas es dar por bueno un progreso que no ha ocurrido:
 *
 *   · **ha salido** — sigue ahí, se sigue midiendo, y ha dejado de ser
 *     difícil. Esto es la buena noticia.
 *   · **ha desaparecido del fichero** — nadie la ha arreglado: no está en el
 *     CSV de esta evaluación. Puede ser una asignatura cuatrimestral, un
 *     cambio de plantilla o un error de exportación.
 *   · **se ha quedado por debajo del mínimo de alumnado** — está en el
 *     fichero, pero con tan pocos registros que no se abre juicio sobre ella
 *     (el mismo criterio de `analizarDificultad`).
 *
 * Y un cuarto caso, el más traicionero: **falta el fichero entero de esa
 * etapa** en esa evaluación. Si solo se ha cargado el CSV de elemental del
 * 2EV, TODO profesional «desaparece» de golpe. Sin distinguirlo, la pantalla
 * felicitaría al centro por haber resuelto veinte asignaturas que nadie ha
 * mirado.
 *
 * Por eso `desaparecidas` y `nuevas` van aparte de `salen` y `entran`, y cada
 * una lleva su `motivo`.
 *
 * ---------------------------------------------------------------------------
 * EL EJE ES LA EVALUACIÓN, NO EL FICHERO
 *
 * Mismo criterio que `evolucion.js`, y por la misma razón: «1EV-EEM» y
 * «1EV-EPM» son el MISMO momento del curso. En modo TODOS, la primera
 * evaluación es un solo punto que suma las difíciles de las dos etapas, no dos
 * puntos consecutivos. La etapa es una dimensión de la serie, no una posición
 * del eje.
 *
 * De ahí sale la trampa de la clave. En la vista global todos los ficheros
 * escriben sus filas bajo el nivel `GLOBAL`, así que el «Piano» global de
 * elemental y el de profesional son dos asignaturas distintas con el MISMO
 * nivel y el MISMO nombre. Sin la etapa en la clave, una pisaría a la otra:
 * el recuento diría una donde hay dos, y en cuanto una de las dos cambiara de
 * caja aparecería una entrada o una salida que no ha ocurrido. Por eso la
 * identidad es **etapa + nivel + asignatura**.
 */

import { evaluacionesDe, parseTrimestre, buscarClave, normalizar } from './texto.js';
import { trimestreDe } from './evolucion.js';
import { analizarDificultad } from './dificultad.js';

/** La identidad de una asignatura a lo largo del tiempo: etapa + nivel +
 *  nombre. El nombre se normaliza porque dos exportaciones pueden escribirlo
 *  con distinta caja —«Armonía» y «ARMONÍA»— y eso convertiría a la misma
 *  asignatura en una que desaparece y otra que nace. */
export const claveDe = ({ etapa, nivel, asignatura }) =>
  [etapa || '—', nivel, normalizar(asignatura)].join('|');

/** Los motivos por los que una asignatura no está clasificada en una
 *  evaluación. Son datos, no rótulos: la traducción se pone arriba. */
export const MOTIVOS = ['sinFichero', 'ausente', 'bajoMinimo', 'presente'];

/** La etapa que declara la clave de un trimestre, o `null` en el formato
 *  antiguo (sin etapa). Se lee del fichero ENCONTRADO y no de la etapa que se
 *  pedía: `trimestreDe` tiene un respaldo que devuelve el fichero de otra
 *  etapa cuando no hay uno de la suya, y etiquetar esas filas con la etapa
 *  pedida haría que la misma asignatura cambiara de identidad de una
 *  evaluación a otra. */
const etapaDelFichero = (trimestre) => {
  const p = parseTrimestre(trimestre);
  return p ? p.etapa : null;
};

/** El fichero de una etapa entre los ya resueltos para una evaluación. */
const ficheroDeEtapa = (ficheros, etapa) =>
  (ficheros || []).find((t) => etapaDelFichero(t) === etapa) || null;

/** Por qué una asignatura no aparece clasificada en una evaluación.
 *  Mira el dato en crudo, que es lo único que distingue «no está en el CSV»
 *  de «está pero con dos alumnos». */
const presenciaEn = (datosCompletos, trimestre, item, umbrales) => {
  if (!trimestre) return 'sinFichero';
  const datos = datosCompletos[trimestre];
  const nivelObj = datos ? datos[item.nivel] : null;
  const clave = buscarClave(nivelObj, item.asignatura);
  const fila = clave ? nivelObj[clave] : null;
  if (!fila || !fila.stats) return 'ausente';
  if (fila.stats.registros < umbrales.alumnosMinimo) return 'bajoMinimo';
  return 'presente';
};

/** Lo que se enseña de cada asignatura en las listas de cambios. */
const resumir = (a) => ({
  clave: a.clave,
  etapa: a.etapa,
  nivel: a.nivel,
  asignatura: a.asignatura,
  notaMedia: a.notaMedia,
  suspendidos: a.suspendidos,
  registros: a.registros,
  razon: a.razon
});

/* Lo más bajo arriba, que es por donde se empieza a mirar; y el que no tiene
   nota, al final —no delante, que es donde lo pone una resta con `null`—. El
   desempate por clave es para que dos ejecuciones den la misma lista: sin él,
   el orden lo decidiría el del Map y la pantalla bailaría entre recargas. */
const ordenar = (lista) => lista.slice().sort((a, b) => {
  const na = typeof a.notaMedia === 'number' ? a.notaMedia : Infinity;
  const nb = typeof b.notaMedia === 'number' ? b.notaMedia : Infinity;
  if (na !== nb) return na - nb;
  return a.clave < b.clave ? -1 : (a.clave > b.clave ? 1 : 0);
});

/** La serie temporal del recuento de alertas, y qué entra y sale entre una
 *  evaluación y la siguiente.
 *
 * @param opciones { trimestresDisponibles, datosCompletos, umbrales, modoEtapa, vista }
 *        · `vista` 'niveles' (por curso) o 'global' — el mismo de
 *          `analizarDificultad`. **Es obligatorio decidirla**: sin ella esa
 *          función mira GLOBAL Y los niveles a la vez y cada asignatura se
 *          cuenta dos veces, así que aquí se toma 'niveles' por defecto.
 * @returns { puntos, cambios, hayDatos }
 *          · `puntos`  una entrada por EVALUACIÓN, con los recuentos
 *          · `cambios` una entrada por PAREJA de evaluaciones consecutivas
 */
export const serieAlertas = ({
  trimestresDisponibles = [],
  datosCompletos = {},
  umbrales,
  modoEtapa,
  vista = 'niveles'
} = {}) => {
  const vacio = { puntos: [], cambios: [], hayDatos: false };

  /* Sin umbrales no hay criterio. Clasificar con ceros no daría error: daría
     todas las asignaturas en rojo, que es una respuesta plausible y falsa. */
  if (!umbrales) return vacio;

  /* Mismo filtro que `ejeDe` de evolucion.js —que no está exportado—: un
     trimestre sin etapa en la clave (formato antiguo) pasa cualquier modo,
     porque no hay forma de saber de cuál es y descartarlo sería vaciar la
     pantalla de quien tenga ficheros viejos. */
  const soloEtapa = modoEtapa && modoEtapa !== 'TODOS' ? modoEtapa : null;
  const relevantes = (trimestresDisponibles || []).filter((t) => {
    const p = parseTrimestre(t);
    return !p || !soloEtapa || p.etapa === soloEtapa;
  });

  const evaluaciones = evaluacionesDe(relevantes);
  if (!evaluaciones.length) return vacio;

  const etapas = [];
  relevantes.forEach((t) => {
    const e = etapaDelFichero(t);
    if (etapas.indexOf(e) < 0) etapas.push(e);
  });

  /* Un mapa clave → asignatura clasificada por evaluación. Se guarda aparte de
     `puntos` porque es la materia prima de los cambios, no algo que la
     pantalla tenga que pintar. */
  const mapas = [];

  const puntos = evaluaciones.map((ev) => {
    const mapa = new Map();
    const ficheros = [];

    etapas.forEach((etapa) => {
      const trim = trimestreDe(trimestresDisponibles, ev, etapa);
      /* El mismo fichero, una sola vez. `trimestreDe` cae al respaldo «lo que
         case la evaluación» cuando falta el de esa etapa, así que pidiendo
         EEM y EPM en una evaluación donde solo se cargó elemental devuelve DOS
         veces el fichero de elemental: sin este corte, sus asignaturas se
         contarían dos veces y el punto diría el doble de difíciles sin que
         nada fallara. */
      if (!trim || ficheros.indexOf(trim) >= 0) return;
      ficheros.push(trim);

      /* Se delega en `analizarDificultad`: el criterio de qué es difícil vive
         en un solo sitio, y las filas agregadas —los tres totales y «Teórica
         Troncal»— se apartan allí. Reimplementarlo aquí es exactamente el
         fallo que este proyecto persigue: dos respuestas para la misma
         pregunta.

         `modoEtapa` en falsy tiene que viajar como 'TODOS': esa función
         compara `detectarEtapa(nivel) !== modoEtapa`, así que con `undefined`
         descarta TODOS los niveles y devuelve cero asignaturas sin dar
         error. */
      const r = analizarDificultad(datosCompletos[trim], {
        umbrales, vista, modoEtapa: modoEtapa || 'TODOS'
      });

      const etapaReal = etapaDelFichero(trim);
      r.todas.forEach((a) => {
        const clave = claveDe({ etapa: etapaReal, nivel: a.nivel, asignatura: a.asignatura });
        mapa.set(clave, {
          clave,
          etapa: etapaReal,
          trimestre: trim,
          nivel: a.nivel,
          asignatura: a.asignatura,
          categoria: a.categoria,
          notaMedia: a.notaMedia,
          aprobados: a.aprobados,
          suspendidos: a.suspendidos,
          registros: a.registros,
          razon: a.razon
        });
      });
    });

    mapas.push(mapa);

    const todas = Array.from(mapa.values());
    const dificiles = todas.filter((a) => a.categoria === 'DIFÍCIL');
    const faciles = todas.filter((a) => a.categoria === 'FÁCIL');
    const neutrales = todas.filter((a) => a.categoria === 'NEUTRAL');

    return {
      evaluacion: ev,
      trimestres: ficheros,
      total: todas.length,
      dificiles: dificiles.length,
      neutrales: neutrales.length,
      faciles: faciles.length,
      /* `null` y no cero cuando no hay nada que dividir: un 0 % se lee como
         «ninguna asignatura en rojo», que es justo lo contrario de «no se ha
         cargado nada». */
      porcentajeDificiles: todas.length ? (dificiles.length * 100) / todas.length : null,
      listaDificiles: ordenar(dificiles.map(resumir))
    };
  });

  const cambios = [];
  for (let i = 1; i < evaluaciones.length; i++) {
    const antes = mapas[i - 1];
    const ahora = mapas[i];
    const entran = [], salen = [], nuevas = [], desaparecidas = [];

    ahora.forEach((a, clave) => {
      if (a.categoria !== 'DIFÍCIL') return;
      const previa = antes.get(clave);
      if (!previa) {
        /* Difícil hoy y ayer ni siquiera se medía: NO es una asignatura que
           haya empeorado, es una que aparece. Se dice de dónde sale. */
        nuevas.push(Object.assign(resumir(a), {
          motivo: presenciaEn(datosCompletos,
            ficheroDeEtapa(puntos[i - 1].trimestres, a.etapa), a, umbrales)
        }));
      } else if (previa.categoria !== 'DIFÍCIL') {
        entran.push(Object.assign(resumir(a), { desde: previa.categoria }));
      }
    });

    antes.forEach((previa, clave) => {
      if (previa.categoria !== 'DIFÍCIL') return;
      const actual = ahora.get(clave);
      if (!actual) {
        /* Estaba en rojo y hoy no se mide. Nadie la ha arreglado. */
        desaparecidas.push(Object.assign(resumir(previa), {
          motivo: presenciaEn(datosCompletos,
            ficheroDeEtapa(puntos[i].trimestres, previa.etapa), previa, umbrales)
        }));
      } else if (actual.categoria !== 'DIFÍCIL') {
        /* Se enseña con las cifras de HOY: es lo que se ha conseguido, y con
           las de ayer la lista de salidas diría el 40 % de suspensos que ya no
           tiene. */
        salen.push(Object.assign(resumir(actual), { hacia: actual.categoria }));
      }
    });

    cambios.push({
      de: evaluaciones[i - 1],
      a: evaluaciones[i],
      entran: ordenar(entran),
      salen: ordenar(salen),
      nuevas: ordenar(nuevas),
      desaparecidas: ordenar(desaparecidas),
      variacion: puntos[i].dificiles - puntos[i - 1].dificiles
    });
  }

  return { puntos, cambios, hayDatos: puntos.some((p) => p.total > 0) };
};
