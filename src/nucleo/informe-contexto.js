/* Núcleo — la ficha de «cómo se ha hecho este informe»
 *
 * Sin React y sin jsPDF, como el resto del núcleo: aquí está QUÉ dice la
 * ficha, y el pintor se queda con las coordenadas.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ EXISTE ESTE ARCHIVO
 *
 * Los umbrales que deciden si una asignatura es DIFÍCIL o FÁCIL
 * —`calcularResultado`, en `estadistica.js`— son configurables desde la
 * pantalla, y **el informe PDF no los mencionaba ni una sola vez**: no salían
 * en ninguna página y `generarInformePDF` ni siquiera los recibía como
 * parámetro. Consecuencia medida: dos informes de los MISMOS datos pueden
 * llamar «difícil» a asignaturas distintas, y nada en el documento lo delata.
 *
 * En la aplicación da igual, porque el panel de umbrales está a la vista. En
 * un PDF que circula por correo y se mira en una reunión meses después, no:
 * quien lo lee no tiene forma de saber si el listado de asignaturas difíciles
 * sale de los umbrales de siempre o de los que alguien movió aquella tarde.
 *
 * Lo mismo con lo demás que hay aquí. Un informe es de UN fichero de los que
 * había cargados, con UN filtro de agrupaciones puesto y en UN modo de etapa;
 * ninguna de las tres cosas se escribía en el documento, así que dos PDF
 * distintos podían parecer contradictorios sin serlo.
 *
 * ---------------------------------------------------------------------------
 * DOS REGLAS QUE SOSTIENEN LA FICHA
 *
 *  · **Cero y «no hay dato» no son lo mismo**, la regla de `informe.js`. Aquí
 *    muerde de una forma concreta: un umbral que no llega —ausente, `null` o
 *    escrito como texto en el campo de la pantalla— NO se rellena con el de
 *    fábrica. Rellenarlo mentiría sobre con qué se clasificó, y la mentira
 *    sería justo la contraria de la verdad: con `suspensosAlerta` a
 *    `undefined`, `stats.suspendidos >= undefined` es `false` y **ninguna
 *    asignatura se marca como difícil en todo el informe**. Escribir «30 %»
 *    ahí haría creer que el listado vacío es una buena noticia.
 *  · **Que los umbrales estén escritos no basta**: hay que decir cuáles se han
 *    cambiado. Un «6,00» suelto no le dice nada a quien no se sabe los de
 *    fábrica de memoria, que es todo el mundo menos quien los tocó.
 *
 * ---------------------------------------------------------------------------
 * `UMBRALES_DEFAULT` SE IMPORTA, NO SE COPIA
 *
 * Es la única dependencia de fuera de `src/nucleo/`, y es a propósito:
 * `constants.js` es datos puros sin un solo `import`, así que el módulo sigue
 * siendo ejecutable en node. Copiar aquí los cinco números daría dos
 * definiciones de «los de fábrica», y el día que alguien cambiara la de
 * `constants.js` esta ficha marcaría como «cambiado» lo que no lo está —y al
 * revés—, que es exactamente el fallo que se trata de evitar.
 */

import { UMBRALES_DEFAULT } from '../constants.js';
import { parseTrimestre } from './texto.js';
import { nota, porcentaje, entero, SIN_DATO } from './informe.js';

/** Un texto que hay, o «—». El equivalente de `texto()` para lo que no es
 *  número: una cadena vacía es «no lo sé», no un nombre en blanco. */
const cadena = (v) => (typeof v === 'string' && v.trim() ? v.trim() : SIN_DATO);

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);

/** Los rótulos entran de fuera —el informe se genera en castellano o en
 *  valenciano y quien traduce es quien llama—, y si falta uno se escribe la
 *  clave. Es el mismo trato que da `t()` en las apps hermanas: una clave suelta
 *  en el PDF se ve y se arregla; una excepción a mitad de la generación deja al
 *  usuario sin informe por un rótulo. */
const hacerRot = (rotulos) => (clave) => {
  const v = rotulos && rotulos[clave];
  return typeof v === 'string' && v.trim() ? v.trim() : String(clave);
};

/* Los cinco umbrales, en el orden en que están declarados en `constants.js`, y
   cada uno con el formato de lo que mide. No es cosmético: `mediaCritica` es
   una nota y `aprobadosMinimo` un porcentaje, y escribir «90» a secas donde se
   quiere decir «90 %» invita a compararlos entre sí. */
const UMBRALES_FICHA = [
  { clave: 'suspensosAlerta', formato: porcentaje },
  { clave: 'mediaCritica', formato: nota },
  { clave: 'mediaFacil', formato: nota },
  { clave: 'aprobadosMinimo', formato: porcentaje },
  { clave: 'alumnosMinimo', formato: entero }
];

/** La clave de rótulo de un umbral: `mediaCritica` → `umbralMediaCritica`.
 *  Se deriva en vez de escribirse a mano, como `claveDeTendencia`, para que
 *  añadir un umbral no obligue a tocar dos listas y dejarse una a medias. */
export const claveDeUmbral = (clave) =>
  'umbral' + String(clave).charAt(0).toUpperCase() + String(clave).slice(1);

/** El curso académico de una CLAVE de fichero, para leerlo: «2627» → «26/27».
 *
 *  Dentro de la clave el curso son dígitos porque una barra ahí acabaría en el
 *  nombre del PDF y en un `dataKey` de Recharts (ver `texto.js`); delante de
 *  una persona es «26/27». Lo que se enseña de preferencia es lo que escribió
 *  el centro en la metadata; esto solo se usa para la lista de ficheros
 *  cargados, donde no hay más metadata que la clave. */
const cursoLegible = (curso) => {
  const d = String(curso || '');
  return d.length === 4 ? d.slice(0, 2) + '/' + d.slice(2) : d;
};

/** El rótulo de un fichero cargado: «26/27 · 1EV (EEM)».
 *  Nunca su clave: `1EV-2627-EEM` es un identificador interno. */
const rotuloDeFichero = (clave, rot) => {
  const p = parseTrimestre(clave);
  if (!p) return cadena(clave);
  const curso = p.curso ? cursoLegible(p.curso) + ' · ' : '';
  const etapa = p.etapa ? ' (' + rot(p.etapa) + ')' : '';
  return curso + rot(p.base) + etapa;
};

/** La fecha de generación, en un formato que no depende del idioma.
 *
 *  Se construye con los componentes LOCALES a mano y no con `toISOString()`,
 *  que pasa a UTC: un informe generado a las 00:30 en España saldría fechado
 *  el día anterior, y la fecha de un documento que se archiva es justo lo que
 *  nadie vuelve a comprobar.
 *
 *  Si llega una cadena se respeta tal cual: quien llama sabe en qué idioma se
 *  está generando el informe y puede haberla formateado ya. */
const fechaLegible = (generadoEn) => {
  if (typeof generadoEn === 'string') return cadena(generadoEn);
  if (!(generadoEn instanceof Date) || Number.isNaN(generadoEn.getTime())) return SIN_DATO;
  const dd = (n) => String(n).padStart(2, '0');
  return `${generadoEn.getFullYear()}-${dd(generadoEn.getMonth() + 1)}-${dd(generadoEn.getDate())}` +
         ` ${dd(generadoEn.getHours())}:${dd(generadoEn.getMinutes())}`;
};

/**
 * La ficha técnica del informe: una tabla de dos columnas, concepto y valor.
 *
 * @param umbrales               los que se han usado para clasificar
 * @param metadata               el `#METADATA` del fichero seleccionado
 * @param trimestreSeleccionado  la clave del fichero del que va el informe
 * @param trimestresDisponibles  las claves de todos los ficheros cargados
 * @param modoEtapa              'EEM' | 'EPM' | 'TODOS'
 * @param filtroAgrupaciones     null = sin filtro; [] = filtro que no deja
 *                               pasar nada; array de nombres = ese filtro
 * @param generadoEn             Date o cadena ya formateada. NUNCA se lee el
 *                               reloj aquí dentro: un módulo que llama a
 *                               `new Date()` no se puede probar
 * @param rotulos                { clave: texto } — quien traduce es quien llama
 * @returns { vacio, cabecera, filas, avisos }
 */
export const fichaDelInforme = ({
  umbrales,
  metadata,
  trimestreSeleccionado,
  trimestresDisponibles,
  modoEtapa,
  filtroAgrupaciones,
  generadoEn,
  rotulos
} = {}) => {
  const rot = hacerRot(rotulos);
  const meta = metadata || {};
  const filas = [];
  const avisos = [];

  /* ---- De qué fichero sale ---- */

  const p = parseTrimestre(trimestreSeleccionado);
  const evaluacion = (p && p.base) || (typeof trimestreSeleccionado === 'string' ? trimestreSeleccionado : '');
  filas.push([rot('fichaEvaluacion'),
    meta.Trimestre ? rot(String(meta.Trimestre)) : (evaluacion ? rot(evaluacion) : SIN_DATO)]);

  /* El curso académico se toma de la metadata —es lo que escribió el centro—
     y no se reconstruye de la clave: la clave lo lleva porque lo sacó de ahí,
     así que si falta en una falta en las dos. Lo que no se sabe, no se
     inventa. */
  const curso = meta.CursoAcademico || meta['CursoAcadémico'];
  filas.push([rot('fichaCursoAcademico'), cadena(curso)]);

  /* La etapa del FICHERO y el modo de etapa son dos cosas distintas, y por eso
     van en dos filas: un fichero de elemental mirado en modo TODOS produce un
     informe que suma elemental y profesional. */
  filas.push([rot('fichaEtapa'), p && p.etapa ? rot(p.etapa) : SIN_DATO]);
  filas.push([rot('fichaModoEtapa'), modoEtapa ? rot(String(modoEtapa)) : SIN_DATO]);

  /* ---- Cuántos ficheros hay, y cuáles ---- */

  /* Si quien llama no pasa la lista, el informe no viene de la nada: viene del
     fichero seleccionado. Decir «0 ficheros cargados» sería peor que no decir
     nada. */
  const lista = (Array.isArray(trimestresDisponibles) && trimestresDisponibles.length)
    ? trimestresDisponibles
    : (trimestreSeleccionado ? [trimestreSeleccionado] : []);

  filas.push([rot('fichaFicherosCargados'), entero(lista.length)]);
  filas.push([rot('fichaFicherosLista'),
    lista.length
      /* Los ficheros se separan con « | » y no con « · », que es lo que ya
         separa el curso de la evaluación DENTRO de cada rótulo: con los dos
         iguales, «26/27 · 1EV (EEM) · 25/26 · 1EV (EEM)» son cuatro cosas
         para quien lo lee y dos para quien lo escribió. */
      ? lista.map((c) => rotuloDeFichero(c, rot) +
          (c === trimestreSeleccionado ? ' ' + rot('fichaEsteFichero') : '')).join(' | ')
      : SIN_DATO]);

  if (lista.length > 1) avisos.push(rot('fichaAvisoVariosFicheros'));

  /* ---- El filtro de agrupaciones ---- */

  /* Tres estados, no dos, y el tercero es una trampa real del generador:
     `null` incluye todo, pero un array VACÍO no deja pasar ni una asignatura.
     Un informe así sale con las tablas en blanco y sin decir por qué. */
  if (Array.isArray(filtroAgrupaciones) && filtroAgrupaciones.length === 0) {
    filas.push([rot('fichaFiltroAgrupaciones'), rot('fichaFiltroVacio')]);
    avisos.push(rot('fichaAvisoFiltroVacio'));
  } else if (Array.isArray(filtroAgrupaciones)) {
    filas.push([rot('fichaFiltroAgrupaciones'), filtroAgrupaciones.map((g) => cadena(String(g))).join(', ')]);
  } else {
    filas.push([rot('fichaFiltroAgrupaciones'), rot('fichaSinFiltro')]);
  }

  /* ---- Los umbrales, y cuáles se han cambiado ---- */

  const u = umbrales || {};
  const cambiados = [];
  const sinValor = [];

  UMBRALES_FICHA.forEach(({ clave, formato }) => {
    const rotulo = rot(claveDeUmbral(clave));
    const valor = u[clave];
    const fabrica = UMBRALES_DEFAULT[clave];

    if (!esNumero(valor)) {
      /* Ni el de fábrica ni un cero: con este umbral fuera de juego el informe
         se ha clasificado SIN él, y eso es lo que hay que poder leer. */
      sinValor.push(rotulo);
      filas.push([rotulo, SIN_DATO]);
      return;
    }

    const cambiado = valor !== fabrica;
    if (cambiado) cambiados.push(rotulo);
    filas.push([rotulo, formato(valor) + (cambiado
      ? ` (${rot('fichaCambiado')}, ${rot('fichaDeFabrica')} ${formato(fabrica)})`
      : '')]);
  });

  if (cambiados.length) {
    avisos.push(`${rot('fichaAvisoUmbralesCambiados')}: ${cambiados.join(', ')}`);
  }
  if (sinValor.length) {
    avisos.push(`${rot('fichaAvisoUmbralSinValor')}: ${sinValor.join(', ')}`);
  }

  /* ---- Cuándo se generó ---- */

  filas.push([rot('fichaGeneradoEn'), fechaLegible(generadoEn)]);

  return {
    /* Se calcula, no se fija a `false`: el contrato es el mismo para todas las
       piezas del informe y una excepción escrita a mano es una que alguien
       tendrá que volver a comprobar. En la práctica no está vacía nunca, y ese
       es el objetivo: aunque no llegue ni un umbral, la ficha dice «—» cinco
       veces, que es información. */
    vacio: filas.length === 0,
    cabecera: [rot('fichaConcepto'), rot('fichaValor')],
    filas,
    avisos
  };
};

export default fichaDelInforme;
