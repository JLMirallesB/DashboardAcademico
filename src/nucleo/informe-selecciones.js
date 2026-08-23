/* Núcleo — la comparación que el usuario arma a mano ("Estadísticas")
 *
 * Sin React y sin jsPDF: aquí está QUÉ dice la tabla, no cómo se dibuja.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTA VISTA TENÍA QUE ENTRAR EN EL INFORME
 *
 * Las demás secciones del PDF las decide el programa: los KPIs, el ranking de
 * asignaturas, las alertas. Esta no. Aquí el usuario elige hasta quince filas
 * —curso + asignatura, o un agregado— y las pone una debajo de otra porque son
 * justo las que quiere enseñar en la reunión.
 *
 * Y era la única que el informe no incluía. Es decir: lo que se llevaba
 * impreso a la reunión no era lo que se había preparado para la reunión.
 *
 * ---------------------------------------------------------------------------
 * LA SELECCIÓN QUE APUNTA A ALGO QUE YA NO ESTÁ
 *
 * Es el caso que de verdad pasa, y pasa a diario: se compone la comparación con
 * un trimestre cargado, luego se carga otro, y hay filas que en el fichero
 * nuevo no existen —una optativa que ese curso no se dio, un nivel sin
 * matrícula—.
 *
 * En pantalla, la tarjeta de esa selección se salta entera (`if (!datos)
 * return null`), y allí se nota: acabas de componerla y ves que falta. En un
 * PDF no se nota nada. Una comparación de cinco filas que imprime cuatro se
 * lee como una comparación de cuatro, meses después y sin nadie al lado que
 * pueda decir «es que esa fila no estaba en el fichero».
 *
 * Así que la fila sale igual, con su rótulo y con «—» en las cifras —nunca con
 * ceros, que se leen como un dato malo y se llevan una decisión detrás— y
 * además se nombra en `avisos`, porque una fila de guiones no distingue «no
 * estaba en el fichero» de «estaba y no tenía notas», y son dos cosas
 * distintas: la primera es un descuadre entre lo que se compuso y lo que se
 * cargó, la segunda es un dato del centro.
 */

import { nota, porcentaje, entero, SIN_DATO } from './informe.js';

const esObjeto = (v) => v !== null && typeof v === 'object';

/** Un rótulo que llega de fuera, o cadena vacía. Nunca «undefined»: eso se
 *  imprime tal cual en la cabecera del PDF y no hay forma de saber si es un
 *  fallo de traducción o una columna que sobra. */
const rot = (v) => (typeof v === 'string' ? v : '');

/** Cómo se llama una selección en el informe: trimestre · nivel · asignatura,
 *  igual que en la tarjeta de la pantalla.
 *
 *  El trimestre va DENTRO del rótulo, y no es adorno: una comparación puede
 *  mezclar evaluaciones —es su uso principal, ver cómo ha ido del 1EV al
 *  2EV—, así que sin él dos filas del mismo curso y asignatura salen con el
 *  mismo nombre y la tabla no se puede leer.
 *
 *  `rotulos.trimestres` traduce la clave del fichero («1EV-2627-EEM») a lo que
 *  se enseña; sin ese mapa se escribe la clave, que es fea pero es cierta.
 *
 *  Las partes vacías se caen: `agregarSeleccion` deja la asignatura en `''`
 *  cuando el nivel elegido no tiene ninguna, y «1EEM · » con el punto colgando
 *  parece un error de programa en vez de una selección sin terminar. */
export const rotuloSeleccion = (sel, rotulos) => {
  if (!esObjeto(sel)) return SIN_DATO;
  const mapa = (rotulos && rotulos.trimestres) || {};
  const partes = [mapa[sel.trimestre] || sel.trimestre, sel.nivel, sel.asignatura]
    .filter((p) => typeof p === 'string' && p.trim() !== '');
  return partes.length ? partes.join(' · ') : SIN_DATO;
};

/** Las cifras de una selección dentro del bloque de un trimestre, o `null` si
 *  esa fila no está en el fichero.
 *
 *  @param datosTrimestre  { GLOBAL: { Total: { stats } }, '1EEM': {...}, ... }
 *                         —o sea, `datosCompletos[trimestre]`, lo mismo que
 *                         recibe `porAsignaturaAgregada`.
 *  @param claveTrimestre  de qué trimestre es ese bloque («1EV-2627-EEM»)
 *
 *  `null` es «no está», y se distingue de «está y no tiene notas», que devuelve
 *  el `stats` con sus campos a null. Confundirlos es lo que hace que un aviso
 *  de descuadre acuse a un fichero que estaba bien.
 *
 *  ---------------------------------------------------------------------------
 *  POR QUÉ HACE FALTA SABER DE QUÉ TRIMESTRE ES EL BLOQUE
 *
 *  Cada selección lleva SU trimestre —la pantalla tiene un desplegable por
 *  fila— y el uso principal de esta vista es justo mezclarlos: ver cómo ha ido
 *  la misma asignatura del 1EV al 2EV. Pero el bloque que llega aquí es de un
 *  solo trimestre y no dice cuál: `procesarDatos` deja la clave fuera, en el
 *  objeto de arriba.
 *
 *  Sin la clave, `datosTrimestre['1EEM']['Piano']` responde lo mismo pida quien
 *  lo pida, así que la fila rotulada «2EV · 1EEM · Piano» se imprime con las
 *  cifras del 1EV. Y es peor que una fila que falta: las dos evaluaciones salen
 *  con los mismos números, que se lee como «no ha cambiado nada» —una medición
 *  que nadie ha hecho— y encima sin aviso ninguno, porque la fila sí resolvió.
 *
 *  La regla es **el trimestre acota, no excluye**: solo se descarta cuando los
 *  dos lados dicen de qué trimestre hablan y dicen cosas distintas. Sin clave
 *  —el llamador antiguo— y sin `sel.trimestre` —las selecciones guardadas antes
 *  de que existiera el campo— se resuelve como siempre. */
export const statsDeSeleccion = (sel, datosTrimestre, claveTrimestre) => {
  if (!esObjeto(sel) || !esObjeto(datosTrimestre)) return null;
  const clave = typeof claveTrimestre === 'string' ? claveTrimestre.trim() : '';
  const suyo = typeof sel.trimestre === 'string' ? sel.trimestre.trim() : '';
  if (clave && suyo && clave !== suyo) return null;
  const nivel = datosTrimestre[sel.nivel];
  if (!esObjeto(nivel)) return null;
  const entrada = nivel[sel.asignatura];
  if (!esObjeto(entrada) || !esObjeto(entrada.stats)) return null;
  return entrada.stats;
};

/** La frase que nombra las selecciones que no están en el fichero.
 *
 *  Sin plantilla se imprime la lista pelada. Es a propósito: el texto lo pone
 *  quien llama porque el informe se genera en dos idiomas, pero un
 *  `undefined` impreso debajo de la tabla es peor que una lista sin frase. */
const avisoDe = (perdidas, rotulos) => {
  if (!perdidas.length) return [];
  const lista = perdidas.join('; ');
  const plantilla = rot(rotulos && rotulos.avisoNoEncontradas);
  if (!plantilla) return [lista];
  return [plantilla.replace(/\{n\}/g, String(perdidas.length))
                   .replace(/\{lista\}/g, lista)];
};

/** La tabla de la comparación libre: una fila por selección.
 *
 *  @param selecciones     [{ id, trimestre, nivel, asignatura }] en el orden
 *                         que les dio el usuario
 *  @param datosTrimestre  el bloque del trimestre del informe
 *  @param rotulos         { seleccion, registros, notaMedia, desviacion, moda,
 *                           aprobados, suspendidos, trimestres,
 *                           avisoNoEncontradas }
 *  @param claveTrimestre  de qué trimestre es `datosTrimestre`. **Pasarlo.**
 *                         Sin él, una selección de otra evaluación se imprime
 *                         con las cifras de ésta y sin decirlo; ver la cabecera
 *                         de `statsDeSeleccion`.
 *  @returns { vacio, cabecera, filas, avisos }
 */
export const tablaSelecciones = (selecciones, datosTrimestre, rotulos, claveTrimestre) => {
  const r = rotulos || {};
  /* El orden de la cabecera ES el de las celdas de cada fila: aquí no hay
     nombres de columna, hay posiciones. Cambiar una de las dos listas sin la
     otra imprime la desviación bajo el rótulo «Moda», que no da error en
     ninguna parte y no se puede corregir después de repartir el PDF. */
  const cabecera = [rot(r.seleccion), rot(r.registros), rot(r.notaMedia),
                    rot(r.desviacion), rot(r.moda), rot(r.aprobados),
                    rot(r.suspendidos)];

  /* Se conserva el orden tal cual llega, sin ordenar por nombre ni por cifra.
     El resto de tablas del informe sí se ordenan —para que dos informes se
     puedan poner uno al lado del otro—, pero esta es SU comparación: el orden
     de las filas es parte de lo que compuso, y reordenarla es deshacer el
     trabajo que venía a enseñar.

     Tampoco se corta en quince. El tope lo pone la pantalla al añadir; hacerlo
     aquí otra vez escondería filas que el usuario sí tiene delante. */
  const lista = Array.isArray(selecciones) ? selecciones.filter(esObjeto) : [];
  if (lista.length === 0) return { vacio: true, cabecera, filas: [], avisos: [] };

  const perdidas = [];
  const filas = lista.map((sel) => {
    const nombre = rotuloSeleccion(sel, r);
    const s = statsDeSeleccion(sel, datosTrimestre, claveTrimestre);

    if (!s) {
      /* Repetir el mismo nombre en el aviso no añade nada: dos selecciones
         idénticas que faltan son un solo descuadre. */
      if (perdidas.indexOf(nombre) < 0) perdidas.push(nombre);
      return [nombre, SIN_DATO, SIN_DATO, SIN_DATO, SIN_DATO, SIN_DATO, SIN_DATO];
    }

    /* Nada de filtrar agregados aquí, al revés que en los rankings: la
       selección que trae el programa por defecto es GLOBAL · Total, que es una
       fila de total, y descartarla vaciaría la tabla más común de todas. Si el
       usuario la eligió, es que la quiere. Y por lo mismo se queda una fila de
       cero registros: sale con su 0, que es un dato, no un hueco. */
    return [nombre,
            entero(s.registros),
            nota(s.notaMedia),
            nota(s.desviacion),
            entero(s.moda),
            porcentaje(s.aprobados),
            porcentaje(s.suspendidos)];
  });

  return { vacio: false, cabecera, filas, avisos: avisoDe(perdidas, r) };
};
