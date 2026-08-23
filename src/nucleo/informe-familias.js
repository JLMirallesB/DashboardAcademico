/* Núcleo — la sección «Familias de asignaturas» del informe
 *
 * Sin React y sin jsPDF: aquí solo se decide QUÉ dice la sección. Las cifras
 * llegan hechas de `agruparPorFamilia`; esto las pone en filas de texto y
 * escribe los avisos que tienen que ir debajo de la tabla.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTA SECCIÓN ES LA DELICADA EN PAPEL
 *
 * Las familias SE SOLAPAN: Piano está a la vez en «Especialidad» y en
 * «Tecla», Violín en «Especialidad» y en «Cuerda». Así que ni la columna de
 * registros ni la de asignaturas son un reparto del centro, y **sumarlas de
 * arriba abajo da un número mayor que el centro**. Sumar una columna es lo
 * primero que hace quien mira una tabla.
 *
 * En la pantalla eso está resuelto: hay un bloque arriba con las cuatro
 * cifras —sumando familias y del centro, para registros y para asignaturas— y
 * un párrafo que lo explica. **En un PDF que circula por correo no hay nadie
 * al lado para avisar**, y se mira en una reunión meses después. Por eso las
 * cuatro cifras y el párrafo salen en `avisos` SIEMPRE, no solo cuando hay
 * solape: que las familias no se solapen no significa que repartan el centro
 * —puede haber asignaturas sin familia—, y ese caso también hay que decirlo.
 *
 * Y por lo mismo, aquí no se calcula ni un porcentaje sobre el total: sería un
 * reparto falso, sumaría 180 % y cada porción mentiría sobre su tamaño. Lo que
 * es legítimo es comparar familias entre sí, que es lo que hace la tabla.
 *
 * ---------------------------------------------------------------------------
 * NI UNA PALABRA TRADUCIBLE AQUÍ
 *
 * El informe se genera en castellano o en valenciano y quien traduce es quien
 * llama: todo rótulo entra por parámetro. Las claves de familia que devuelve
 * el núcleo (`tecla`, `cuerda`…) no son rótulos sino claves estables, y salen
 * tal cual con la mayúscula inicial, igual que en la pantalla — que la misma
 * familia se llame de dos formas en las dos cosas que se miran a la vez es
 * exactamente cómo se llega a «estos dos números no son lo mismo».
 */

import { nota, porcentaje, entero } from './informe.js';

/* Un rótulo que falta se escribe con su clave, nunca con `undefined` ni con un
   hueco: lo primero acaba impreso en el PDF y lo segundo deja una columna sin
   nombre, y las dos cosas se descubren cuando el papel ya está repartido. Con
   la clave delante, quien lo vea sabe qué traducción falta. */
const rot = (rotulos, clave) => {
  const v = rotulos && rotulos[clave];
  return typeof v === 'string' && v ? v : clave;
};

/* Las claves llegan en minúsculas del núcleo porque son claves, no rótulos. */
const conMayuscula = (texto) => (
  typeof texto === 'string' && texto.length
    ? texto.charAt(0).toUpperCase() + texto.slice(1)
    : ''
);

/* Los `{marcadores}` se sustituyen enteros: la frase traducida puede repetirlos
   o cambiarlos de orden, y un `replace` de una sola vez dejaría el segundo sin
   rellenar en un idioma y no en el otro. */
const poner = (texto, marcadores) => Object.keys(marcadores).reduce(
  (t, m) => t.split(m).join(String(marcadores[m])), texto
);

/* El motivo viaja como clave estable desde el núcleo; su frase es del que
   traduce. Un motivo que no esté aquí sale con su propia clave, que es más
   honesto que callarlo: la celda diría «—» sin explicación ninguna. */
const ROTULO_MOTIVO = {
  pocosRegistros: 'motivoPocosRegistros',
  pocasAsignaturas: 'motivoPocasAsignaturas',
  sinDato: 'motivoSinDato'
};

/** La tabla de familias de asignaturas para el informe.
 *
 * @param resultado  lo que devuelve `agruparPorFamilia`
 * @param rotulos    { colFamilia, colAsignaturas, colRegistros, colNotaMedia,
 *                     colAprobados, colSuspensos, sinClasificar,
 *                     sinClasificarNota,
 *                     solapeTitulo, sinSolapeTitulo,
 *                     solapeSumados, solapeDistintos,
 *                     solapeAsigSumadas, solapeAsigDistintas,
 *                     solapeTexto, sinSolapeTexto,
 *                     solapeAsignaturas,          — admite {n}
 *                     motivoPocosRegistros,       — admite {min}
 *                     motivoPocasAsignaturas,     — admite {min}
 *                     motivoSinDato }
 * @returns { vacio, cabecera, filas, avisos }
 */
export const tablaFamilias = (resultado, rotulos = {}) => {
  const familias = resultado && Array.isArray(resultado.familias) ? resultado.familias : [];

  /* Sin familias no hay sección: una tabla con la cabecera y nada debajo se
     lee como «el centro no tiene asignaturas», que es una afirmación. */
  if (!familias.length) return { vacio: true, cabecera: [], filas: [], avisos: [] };

  const cabecera = [
    rot(rotulos, 'colFamilia'),
    rot(rotulos, 'colAsignaturas'),
    rot(rotulos, 'colRegistros'),
    rot(rotulos, 'colNotaMedia'),
    rot(rotulos, 'colAprobados'),
    rot(rotulos, 'colSuspensos')
  ];

  const nombreDe = (f) => (
    f.esSinClasificar ? rot(rotulos, 'sinClasificar') : conMayuscula(f.clave)
  );

  /* El orden es el que trae el núcleo —peor nota primero, las que no tienen
     nota detrás y el montón de sin clasificar al final—, y no se rehace aquí:
     dos criterios de orden es como se llega a que la pantalla y el papel
     pongan a familias distintas en cabeza el mismo día.

     `asignaturas` son nombres distintos, no filas: en vista 'niveles' Piano
     aparece en cada curso y aun así es una asignatura. Contar filas sería
     contar cuatro pianos. */
  const filas = familias.map((f) => ([
    nombreDe(f),
    entero(f.asignaturas),
    entero(f.registros),
    nota(f.notaMedia),
    porcentaje(f.aprobados),
    porcentaje(f.suspendidos)
  ]));

  const solape = (resultado && resultado.solape) || {};
  const avisos = [];

  /* Las cuatro cifras van SIEMPRE, y con `entero`: un resultado sin bloque de
     solape escribe «—» y no un cero, que aquí se leería como «las familias no
     suman ningún registro» — la afirmación más tranquilizadora posible y
     ninguna medición detrás. */
  avisos.push(solape.hay ? rot(rotulos, 'solapeTitulo') : rot(rotulos, 'sinSolapeTitulo'));
  avisos.push(
    rot(rotulos, 'solapeSumados') + ': ' + entero(solape.registrosSumados) + ' · ' +
    rot(rotulos, 'solapeDistintos') + ': ' + entero(solape.registrosDistintos)
  );
  avisos.push(
    rot(rotulos, 'solapeAsigSumadas') + ': ' + entero(solape.asignaturasSumadas) + ' · ' +
    rot(rotulos, 'solapeAsigDistintas') + ': ' + entero(solape.asignaturasDistintas)
  );
  avisos.push(solape.hay ? rot(rotulos, 'solapeTexto') : rot(rotulos, 'sinSolapeTexto'));

  /* Cuáles son las que se solapan, por nombre. Sin la lista, el aviso es una
     advertencia genérica que se aprende a saltar; con ella, quien la lea
     reconoce sus asignaturas y entiende de una vez por qué no cuadra. */
  if (solape.hay && Array.isArray(solape.asignaturas) && solape.asignaturas.length) {
    avisos.push(
      poner(rot(rotulos, 'solapeAsignaturas'), { '{n}': solape.asignaturas.length }) +
      ': ' + solape.asignaturas.map(conMayuscula).join(', ')
    );
  }

  /* La razón de que una fila tenga tres «—». En la pantalla va dentro de la
     propia fila; en la tabla del PDF no cabe, y sin ella la familia parece un
     fallo del informe en vez de una decisión de no dar medias con cuatro
     alumnos. */
  familias.forEach((f) => {
    if (!f.motivo) return;
    const texto = poner(rot(rotulos, ROTULO_MOTIVO[f.motivo] || f.motivo), {
      '{min}': f.motivo === 'pocasAsignaturas' ? f.minimoAsignaturas : f.minimoRegistros
    });
    avisos.push(nombreDe(f) + ': ' + texto);
  });

  /* El montón de sin clasificar no es una familia con la que competir, y en
     papel no hay etiqueta gris que lo diga. */
  if (familias.some((f) => f.esSinClasificar)) avisos.push(rot(rotulos, 'sinClasificarNota'));

  return { vacio: false, cabecera, filas, avisos };
};
