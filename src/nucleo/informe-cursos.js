/* Núcleo — la comparación entre cursos académicos, para el informe
 *
 * Sin React y sin jsPDF. Es la pieza hermana de `informe.js`: aquel dice lo que
 * se puede decir de UN fichero, y este lo único que NO se puede decir con uno
 * solo, porque hace falta tener varios cursos académicos cargados a la vez.
 * Eso es lo más nuevo de la aplicación —`serieEntreCursos`, en `evolucion.js`,
 * y antes del 23/08/2026 ni siquiera se podía: cargar la primera evaluación de
 * dos cursos daba la misma clave y la segunda pisaba a la primera.
 *
 * La pregunta que responde es la del equipo directivo: **«¿vamos mejor que el
 * año pasado?»**. En la pantalla son dos líneas paralelas y la distancia entre
 * ellas es la respuesta. En papel tiene que ser una tabla, y una tabla con las
 * filas equivocadas miente sin dar ningún error.
 *
 * ---------------------------------------------------------------------------
 * LAS DOS REGLAS QUE ESTE ARCHIVO EXISTE PARA SOSTENER
 *
 * 1. **Solo se comparan momentos comparables.** La primera evaluación de 26/27
 *    se compara con la primera de 25/26, nunca con la segunda. Una fila que
 *    cruzara las dos saldría impresa con el mismo aspecto que las demás —un
 *    curso, tres cifras y una diferencia— y quien la lea en una reunión no
 *    tiene forma de saber que esa diferencia es, en buena parte, el trimestre
 *    que va de una evaluación a la otra. Si al curso anterior le falta esa
 *    evaluación **la fila no sale**, y se dice cuál falta: una ausencia
 *    silenciosa en una tabla se lee como «ese año no existía».
 *
 * 2. **Y solo dentro de la misma etapa.** Elemental y profesional son dos
 *    poblaciones distintas y su media conjunta no significa nada; es la misma
 *    razón por la que `calcularKPIs` se niega a devolver un bloque único en
 *    modo TODOS. Aquí el daño sería peor que allí: el «25/26» de la tabla
 *    tomaría la nota de profesional y el «26/27» la de elemental, y la
 *    diferencia entre las dos se leería como la evolución del centro.
 *
 * Y la advertencia que en papel pesa más que en la pantalla: **dos cursos no
 * son la misma gente.** El 1EEM de este año no son los del año pasado un año
 * mayores; son otros. Esto compara el estado del centro en el mismo punto del
 * calendario, que es una pregunta legítima y NO es seguir a una cohorte. Por
 * eso viaja como aviso al pie de la tabla y no como una nota al margen que
 * alguien pueda quitar sin darse cuenta de lo que quita.
 *
 * ---------------------------------------------------------------------------
 * NADA DE TRADUCCIONES AQUÍ
 *
 * El informe se genera en castellano o en valenciano y quien traduce es quien
 * llama: los rótulos —cabecera y plantillas de aviso— entran por parámetro.
 * Las plantillas llevan `{marcadores}`, que es la convención de la casa, y una
 * plantilla que no venga **no imprime una línea en blanco**: se calla.
 */

import { nota, porcentaje, diferencia, conSigno } from './informe.js';
import { parseTrimestre, buscarClave } from './texto.js';

/** El curso académico como se lee delante de una persona: «2526» → «25/26».
 *
 *  Dentro de la clave el curso son dígitos a propósito —una barra ahí acabaría
 *  en el nombre de un PDF y en un `dataKey` de Recharts—, así que la tabla
 *  tiene que deshacerlo. Rotular una fila «2526» sería enseñar la clave
 *  interna, que no es un curso académico para nadie fuera de este código.
 *
 *  Gemela de `formatearCursoAcademico` (src/utils/formatters.js), que no se
 *  puede importar desde el núcleo: aquella arrastra `constants.js` y el núcleo
 *  no depende de nada de la aplicación, que es lo que permite ejercitarlo en
 *  node. El día que alguien toque aquella, que llame a esta. */
export const cursoLegible = (curso) => {
  if (!curso) return '';
  const d = String(curso);
  /* `normalizarCurso` reduce cualquier forma a cuatro dígitos, así que este es
     el caso normal; los otros dos, por si llega una clave de antes. */
  if (d.length === 4) return d.slice(0, 2) + '/' + d.slice(2);
  if (d.length === 6 || d.length === 8) return d.slice(0, 4) + '/' + d.slice(4);
  return d;
};

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);

/** Las tres cifras del centro de un fichero, leídas tal cual y sin rellenar.
 *
 *  No se usa `calcularKPIs` a propósito, y no es por evitar una dependencia:
 *  aquel devuelve `totalCentro.notaMedia || 0`, así que un fichero cuya fila
 *  Total no trae nota da **cero** en vez de «no hay dato». En la pantalla eso
 *  se disimula; aquí ese cero se restaría del curso de referencia y la tabla
 *  imprimiría «-7,00» — «el año pasado íbamos siete puntos mejor», una frase
 *  que nadie ha medido. Y además pide `umbrales`, que son del que mira y no
 *  tienen nada que ver con esta comparación. */
const cifrasDelCentro = (datosTrimestre) => {
  const global = datosTrimestre && datosTrimestre['GLOBAL'];
  /* Por nombre y sin distinguir mayúsculas, que es el criterio del núcleo para
     encontrar una fila agregada: el analizador se rellena a mano. */
  const clave = buscarClave(global, 'Total');
  const s = clave && global[clave] ? global[clave].stats : null;
  const cifra = (v) => (s && esNumero(v) ? v : null);
  return {
    notaMedia: cifra(s && s.notaMedia),
    aprobados: cifra(s && s.aprobados),
    suspendidos: cifra(s && s.suspendidos)
  };
};

const interpolar = (plantilla, vars) =>
  String(plantilla).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

/* Formatos de las tres diferencias. La nota se resta en puntos y los dos
   porcentajes en puntos porcentuales; van con signo delante porque una
   diferencia sin signo no se puede leer.

   Ojo al leerlas, y esto no se puede pintar en un texto plano: **subir el
   porcentaje de suspensos es empeorar**. El signo es aritmético, la lectura no
   —es lo que documenta `esInverso` en `comparacion.js`—, así que el rótulo de
   esa columna tiene que decir que son suspensos y no «diferencia» a secas. */
const DIF_NOTA = (n) => n.toFixed(2);
const DIF_PORCENTAJE = (n) => `${n.toFixed(1)}%`;

/** La tabla «curso contra curso» del informe: una fila por curso académico
 *  cargado, para la MISMA evaluación y la MISMA etapa que el fichero
 *  seleccionado, con la diferencia respecto de él.
 *
 * @param opciones.trimestresDisponibles  las claves de los ficheros cargados
 * @param opciones.datosCompletos         { clave: datos del fichero }
 * @param opciones.modoEtapa              'EEM' | 'EPM' | 'TODOS'
 * @param opciones.trimestreSeleccionado  la clave del fichero de referencia
 * @param opciones.rotulos                { curso, notaMedia, aprobados,
 *                                          suspensos, difNota, difAprobados,
 *                                          difSuspensos,
 *                                          referencia, sinEvaluacion,
 *                                          sinCursoAcademico, noEsCohorte }
 * @returns { vacio, cabecera, filas, avisos }
 */
export const tablaEntreCursos = ({
  trimestresDisponibles = [],
  datosCompletos = {},
  modoEtapa,
  trimestreSeleccionado,
  rotulos
} = {}) => {
  const r = rotulos || {};
  const nada = { vacio: true, cabecera: [], filas: [], avisos: [] };

  const yo = parseTrimestre(trimestreSeleccionado);
  /* **Un fichero que no dice de qué curso es no compara cursos.** Los CSV
     anteriores al 23/08/2026 no traen curso académico y su clave sale de dos
     partes. Dejarlos entrar tenía un final malo: la fila saldría rotulada con
     el curso del OTRO y una diferencia de cero se leería como «igual que el
     año pasado», cuando lo más probable es que sea el mismo año exportado dos
     veces. Lo que no se sabe, no se inventa; se dice en un aviso. */
  if (!yo || !yo.curso) return nada;

  const etapa = yo.etapa || null;
  /* El modo de etapa del informe manda sobre el fichero elegido. Si el informe
     es de elemental y el fichero seleccionado es de profesional, esta tabla no
     tiene nada que decir: cualquier cosa que imprimiera sería de la otra
     población que la del resto del documento. */
  if (modoEtapa && modoEtapa !== 'TODOS' && etapa && etapa !== modoEtapa) return nada;

  /* Los candidatos: los de LA MISMA etapa que el fichero de referencia, sea
     cual sea el modo. En modo TODOS el informe enseña las dos etapas, pero
     cada tabla sigue siendo de una: no hay una media conjunta que valga. */
  const candidatos = [];
  let sinCurso = 0;
  (trimestresDisponibles || []).forEach((t) => {
    const p = parseTrimestre(t);
    if (!p) return;
    if ((p.etapa || null) !== etapa) return;
    if (!p.curso) { if (p.base === yo.base) sinCurso++; return; }
    candidatos.push({ clave: t, base: p.base, curso: p.curso });
  });

  /* Dos listas distintas y hacen falta las dos: los cursos que hay cargados, y
     los que tienen ESTA evaluación. La diferencia entre ambas es justo lo que
     no puede desaparecer sin decirlo. */
  const cargados = [];
  const comparables = [];
  candidatos.forEach((c) => {
    if (cargados.indexOf(c.curso) < 0) cargados.push(c.curso);
    if (c.base === yo.base && comparables.indexOf(c.curso) < 0) comparables.push(c.curso);
  });
  /* El curso es una cadena de cuatro dígitos, así que el orden alfabético ES el
     cronológico —mismo criterio que `compararTrimestres`—, y las filas salen
     del más antiguo al más nuevo, que es como se lee una serie temporal. */
  comparables.sort();

  /* Sin la fila de referencia no hay ninguna diferencia que calcular. Pasa si
     el trimestre seleccionado no está entre los disponibles, que es un estado
     transitorio de la aplicación al cerrar un fichero. */
  if (comparables.indexOf(yo.curso) < 0) return nada;

  const cifrasDe = (curso) => {
    const c = candidatos.find((x) => x.base === yo.base && x.curso === curso);
    return cifrasDelCentro(c ? datosCompletos[c.clave] : null);
  };
  const ref = cifrasDe(yo.curso);

  const filas = comparables.map((curso) => {
    const c = cifrasDe(curso);
    /* La fila de referencia no se resta consigo misma. Un «+0,00» ahí sería
       una medición que nadie ha hecho —el patrón no se mide contra el patrón—
       y un «—» sería mentira, porque dato hay. La casilla se deja vacía y el
       aviso de abajo dice cuál es la referencia. */
    const esRef = curso === yo.curso;
    return [
      cursoLegible(curso),
      nota(c.notaMedia),
      porcentaje(c.aprobados),
      porcentaje(c.suspendidos),
      esRef ? '' : conSigno(diferencia(c.notaMedia, ref.notaMedia), DIF_NOTA),
      esRef ? '' : conSigno(diferencia(c.aprobados, ref.aprobados), DIF_PORCENTAJE),
      esRef ? '' : conSigno(diferencia(c.suspendidos, ref.suspendidos), DIF_PORCENTAJE)
    ];
  });

  const avisos = [];
  const anota = (plantilla, vars) => { if (plantilla) avisos.push(interpolar(plantilla, vars)); };
  anota(r.referencia, { curso: cursoLegible(yo.curso), evaluacion: yo.base });

  const faltan = cargados.filter((c) => comparables.indexOf(c) < 0).sort();
  anota(faltan.length ? r.sinEvaluacion : null, {
    evaluacion: yo.base, n: faltan.length, cursos: faltan.map(cursoLegible).join(', ')
  });
  anota(sinCurso ? r.sinCursoAcademico : null, { n: sinCurso });
  anota(r.noEsCohorte, {});

  return {
    /* Con un solo curso comparable la tabla sería una fila midiéndose contra sí
       misma: tres cifras que ya están en el resto del informe y una columna de
       diferencias en blanco. La sección se salta entera. */
    vacio: filas.length < 2,
    cabecera: [r.curso || '', r.notaMedia || '', r.aprobados || '', r.suspensos || '',
               r.difNota || '', r.difAprobados || '', r.difSuspensos || ''],
    filas,
    avisos
  };
};
