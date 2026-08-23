/* La sección «Familias de asignaturas» del informe — pruebas/informe-familias.mjs
 *
 *   node pruebas/informe-familias.mjs
 *
 * Esta sección es la delicada en papel. En la pantalla, las cuatro cifras del
 * solape están arriba y a tamaño legible, y un párrafo explica que las
 * familias no reparten el centro. En un PDF que se imprime y se manda por
 * correo no hay nadie al lado para decirlo, y sumar la columna de registros es
 * lo primero que hace quien mira una tabla: da un número mayor que el centro.
 *
 * Así que lo que se vigila aquí no es que las cifras sean bonitas: es que el
 * aviso NO se pueda perder —tampoco cuando las familias no se solapan, que es
 * distinto de que repartan el centro—, que las medias sean las ponderadas que
 * calcula el núcleo, y que una familia sin nota comparable escriba «—» y nunca
 * un 0,00.
 */
import { tablaFamilias } from '../src/nucleo/informe-familias.js';
import { agruparPorFamilia } from '../src/nucleo/agrupaciones.js';
import { SIN_DATO } from '../src/nucleo/informe.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { csv, fila } from './fixtures.mjs';
import { comprobar, seccion, terminar, UMBRALES } from './ayuda.mjs';

/* Los grupos van dentro de UN campo separados por `;`, que es también el
   separador del CSV: por eso el campo va entrecomillado, como lo escribe el
   analizador. */
const agr = (asignatura, ...grupos) => `AGRUP;${asignatura};"${grupos.join(';')}"`;

const cargar = (texto) => procesarDatos(parseCSV(texto));

/* Rótulos como los que pasará el generador. Aquí van en castellano porque se
   leen mejor al fallar; lo que importa es que ENTREN, no cuáles sean — la
   sección 8 lo comprueba con rótulos que no son de ningún idioma. */
const R = {
  colFamilia: 'Familia',
  colAsignaturas: 'Asignaturas',
  colRegistros: 'Registros',
  colNotaMedia: 'Nota media',
  colAprobados: '% Aprobados',
  colSuspensos: '% Suspensos',
  sinClasificar: '(sin clasificar)',
  sinClasificarNota: 'Asignaturas que el CSV no agrupa en ninguna familia.',
  solapeTitulo: 'Las familias se solapan',
  sinSolapeTitulo: 'Las familias no reparten el centro',
  solapeSumados: 'Registros sumando familias',
  solapeDistintos: 'Registros del centro',
  solapeAsigSumadas: 'Asignaturas sumando familias',
  solapeAsigDistintas: 'Asignaturas del centro',
  solapeTexto: 'Una asignatura puede estar en varias familias a la vez, así que ' +
    'las familias juntas suman más registros que el centro. Estas cifras no son ' +
    'un reparto: no hay porcentajes sobre el total.',
  sinSolapeTexto: 'Con estos datos ninguna asignatura está en más de una familia. ' +
    'Aun así, no todas tienen por qué pertenecer a alguna, así que estas cifras ' +
    'tampoco son un reparto del centro.',
  solapeAsignaturas: 'Asignaturas que están en más de una familia ({n})',
  motivoPocosRegistros: 'Menos de {min} registros: no se dan medias.',
  motivoPocasAsignaturas: 'Menos de {min} asignaturas distintas: no se dan medias.',
  motivoSinDato: 'Ninguna de sus asignaturas trae notas: no hay nada que promediar.'
};

/* ------------------------------------------------------------------ */
/* El centro de mentira, con solape a propósito.
 *
 * Piano y Clave están en «Especialidad» y en «Tecla»; Violín, en
 * «Especialidad» y en «Cuerda». Los números están elegidos para que la media
 * ponderada y la media de las medias den cosas muy distintas: Piano 40
 * registros con un 5 y Clave 4 con un 10 → ponderada 5,45; simple 7,50.
 *
 * Percusión tiene 2 registros, por debajo del mínimo de 3: es la familia que
 * tiene que salir con «—» y con su motivo escrito.
 * Coro no está en ninguna familia: es el montón de sin clasificar. */
const CENTRO = csv({
  trimestre: '1EV',
  filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 72, media: 7 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano', registros: 40, media: 5, aprobados: 0.5, suspendidos: 0.5 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Clave', registros: 4, media: 10, aprobados: 1, suspendidos: 0 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Violín', registros: 16, media: 8, aprobados: 0.75, suspendidos: 0.25 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Percusión', registros: 2, media: 6, aprobados: 0.5, suspendidos: 0.5 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Coro', registros: 10, media: 9, aprobados: 1, suspendidos: 0 })
  ],
  agrupaciones: [
    agr('Piano', 'Especialidad', 'Tecla'),
    agr('Clave', 'Especialidad', 'Tecla'),
    agr('Violín', 'Especialidad', 'Cuerda'),
    agr('Percusión', 'Percusión'),
    /* El analizador escribe «0» cuando una asignatura no tiene familia. */
    agr('Coro', '0')
  ]
});

const centro = cargar(CENTRO);
const res = agruparPorFamilia(centro.datos, {
  agrupaciones: centro.agrupaciones, modoEtapa: 'TODOS', umbrales: UMBRALES
});
const tabla = tablaFamilias(res, R);

const porNombre = (t, nombre) => t.filas.find((f) => f[0] === nombre) || [];
const todosLosAvisos = (t) => t.avisos.join(' ␟ ');

/* ------------------------------------------------------------------ */
seccion('1. La forma que el generador espera, igual para todas las secciones');
{
  comprobar('no está vacía y trae las cuatro claves del contrato',
    tabla.vacio === false && Array.isArray(tabla.cabecera) &&
    Array.isArray(tabla.filas) && Array.isArray(tabla.avisos),
    JSON.stringify(Object.keys(tabla)));
  comprobar('la cabecera son las seis columnas pedidas, en orden',
    tabla.cabecera.join('|') === 'Familia|Asignaturas|Registros|Nota media|% Aprobados|% Suspensos',
    tabla.cabecera.join('|'));
  comprobar('una fila por familia, incluido el montón de sin clasificar',
    tabla.filas.length === 5 && tabla.filas.every((f) => f.length === 6),
    tabla.filas.map((f) => f[0]).join('|'));
  comprobar('todas las celdas son texto ya formateado, no números sueltos',
    tabla.filas.every((f) => f.every((c) => typeof c === 'string')),
    JSON.stringify(tabla.filas[0]));
  comprobar('y el orden es el del núcleo —peor nota primero, sin clasificar al final—, no otro',
    tabla.filas.map((f) => f[0]).join('|') ===
      'Tecla|Especialidad|Cuerda|Percusión|(sin clasificar)',
    tabla.filas.map((f) => f[0]).join('|'));
}

/* ------------------------------------------------------------------ */
seccion('2. Las cuatro cifras del solape salen SIEMPRE en los avisos');
{
  /* Sumando familias: 60 (especialidad) + 44 (tecla) + 16 (cuerda) + 2
     (percusión) + 10 (sin clasificar) = 132. El centro tiene 72. */
  const texto = todosLosAvisos(tabla);
  comprobar('CANDADO: los registros sumando familias (132) están escritos',
    texto.includes('Registros sumando familias: 132'), texto);
  comprobar('CANDADO: y los del centro (72) también, que son otro número',
    texto.includes('Registros del centro: 72'), texto);
  comprobar('CANDADO: las asignaturas sumando familias (8) están escritas',
    texto.includes('Asignaturas sumando familias: 8'), texto);
  comprobar('CANDADO: y las del centro (5) también',
    texto.includes('Asignaturas del centro: 5'), texto);
  comprobar('CANDADO: y el párrafo que dice que esto no es un reparto',
    tabla.avisos.includes(R.solapeTexto), texto);
  comprobar('con el titular de que se solapan, no el de que no',
    tabla.avisos.includes(R.solapeTitulo) && !tabla.avisos.includes(R.sinSolapeTitulo));
  comprobar('y la lista de las que están en más de una familia, por su nombre',
    texto.includes('Asignaturas que están en más de una familia (3)') &&
    texto.includes('Clave, Piano, Violín'), texto);
}

/* ------------------------------------------------------------------ */
seccion('3. CANDADO: la columna de registros suma exactamente lo que dice el aviso');
{
  /* Si alguien quita de la tabla el montón de sin clasificar y no lo quita del
     aviso —o al revés—, quien sume la columna con el dedo obtiene un número
     que el aviso desmiente, y entonces el aviso deja de servir para lo que
     está puesto. */
  const suma = tabla.filas.reduce((s, f) => s + Number(f[2]), 0);
  comprobar('CANDADO: sumar la columna da 132, que es la cifra «sumando familias»',
    suma === res.solape.registrosSumados && suma === 132, String(suma));
  const sumaAsig = tabla.filas.reduce((s, f) => s + Number(f[1]), 0);
  comprobar('CANDADO: y la de asignaturas da 8, la cifra «sumando familias»',
    sumaAsig === res.solape.asignaturasSumadas && sumaAsig === 8, String(sumaAsig));
  comprobar('las dos son mayores que las del centro: eso es lo que hay que avisar',
    suma > res.solape.registrosDistintos && sumaAsig > res.solape.asignaturasDistintas,
    suma + '>' + res.solape.registrosDistintos + ', ' + sumaAsig + '>' + res.solape.asignaturasDistintas);
}

/* ------------------------------------------------------------------ */
seccion('4. Sin solape el aviso sigue estando, y dice otra cosa');
{
  /* Cada asignatura en una sola familia. Que no se solapen NO significa que
     repartan el centro, y ese matiz es justo el que se pierde si el aviso se
     escribe solo cuando `solape.hay`. */
  const sinSolape = cargar(csv({
    trimestre: '1EV',
    filas: [
      fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 66, media: 7 }),
      fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano', registros: 40, media: 5 }),
      fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Violín', registros: 16, media: 8 }),
      fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Coro', registros: 10, media: 9 })
    ],
    agrupaciones: [agr('Piano', 'Tecla'), agr('Violín', 'Cuerda'), agr('Coro', '0')]
  }));
  const opciones = { agrupaciones: sinSolape.agrupaciones, modoEtapa: 'TODOS', umbrales: UMBRALES };

  const conMonton = tablaFamilias(agruparPorFamilia(sinSolape.datos, opciones), R);
  const t1 = todosLosAvisos(conMonton);
  comprobar('CANDADO: sin solape las cuatro cifras siguen ahí',
    t1.includes('Registros sumando familias: 66') && t1.includes('Registros del centro: 66') &&
    t1.includes('Asignaturas sumando familias: 3') && t1.includes('Asignaturas del centro: 3'), t1);
  comprobar('CANDADO: y el párrafo es el de «tampoco reparten el centro», no el de solape',
    conMonton.avisos.includes(R.sinSolapeTexto) && !conMonton.avisos.includes(R.solapeTexto), t1);
  comprobar('con su propio titular', conMonton.avisos.includes(R.sinSolapeTitulo));
  /* Ojo al comprobarlo: el propio párrafo de «sin solape» dice la frase
     «ninguna asignatura está en más de una familia», así que buscar ese
     trozo de texto da un falso positivo. Lo que no puede haber es el aviso
     con la LISTA. */
  comprobar('y sin la lista de solapadas, que no las hay',
    !conMonton.avisos.some((a) => a.startsWith('Asignaturas que están en más de una familia')), t1);

  /* El tercer caso, el que demuestra el matiz: sin solape Y sin repartir. Coro
     no está en ninguna familia, así que las familias juntas tienen 56 de los
     66 registros del centro. */
  const sinMonton = tablaFamilias(
    agruparPorFamilia(sinSolape.datos, { ...opciones, incluirSinClasificar: false }), R);
  const t2 = todosLosAvisos(sinMonton);
  comprobar('CANDADO: sin solape las familias pueden sumar MENOS que el centro, y se dice',
    t2.includes('Registros sumando familias: 56') && t2.includes('Registros del centro: 66') &&
    t2.includes('Asignaturas sumando familias: 2') && t2.includes('Asignaturas del centro: 3'), t2);
  comprobar('y el párrafo sigue siendo el que avisa de que no es un reparto',
    sinMonton.avisos.includes(R.sinSolapeTexto), t2);
}

/* ------------------------------------------------------------------ */
seccion('5. Las medias son las ponderadas del núcleo, no medias de medias');
{
  const tecla = porNombre(tabla, 'Tecla');
  /* Piano 40×5 + Clave 4×10 = 240 sobre 44 registros → 5,45. Promediar los dos
     promedios daría 7,50: dos puntos y medio de diferencia sobre la misma
     realidad, y el 7,50 no lo ha sacado nadie. */
  comprobar('CANDADO: la nota de Tecla es 5.45 (ponderada), no 7.50 (media de medias)',
    tecla[3] === '5.45', tecla.join(' | '));
  comprobar('CANDADO: los aprobados también van ponderados: 54.5%, no 75.0%',
    tecla[4] === '54.5%', tecla[4]);
  comprobar('CANDADO: y los suspensos: 45.5%, no 25.0%',
    tecla[5] === '45.5%', tecla[5]);
  comprobar('la fila lleva sus dos recuentos: 2 asignaturas y 44 registros',
    tecla[1] === '2' && tecla[2] === '44', tecla.join(' | '));
  comprobar('y los recuentos van sin decimales, que son personas y asignaturas',
    tabla.filas.every((f) => !f[1].includes('.') && !f[2].includes('.')),
    JSON.stringify(tabla.filas.map((f) => [f[1], f[2]])));
  comprobar('la nota lleva dos decimales y los porcentajes uno y su símbolo',
    porNombre(tabla, 'Cuerda').slice(3).join('|') === '8.00|75.0%|25.0%',
    porNombre(tabla, 'Cuerda').join(' | '));
}

/* ------------------------------------------------------------------ */
seccion('6. Una familia sin nota comparable escribe «—», no 0,00');
{
  const perc = porNombre(tabla, 'Percusión');
  comprobar('CANDADO: las tres medias son «—» —2 registros, por debajo del mínimo—',
    perc[3] === SIN_DATO && perc[4] === SIN_DATO && perc[5] === SIN_DATO,
    perc.join(' | '));
  comprobar('CANDADO: pero no desaparece, y sus hechos siguen ahí: 1 asignatura, 2 registros',
    perc[1] === '1' && perc[2] === '2', perc.join(' | '));
  comprobar('CANDADO: y el motivo del «—» se escribe, que en la tabla del PDF no cabe',
    tabla.avisos.includes('Percusión: Menos de 3 registros: no se dan medias.'),
    todosLosAvisos(tabla));

  /* Una familia con alumnado y sin una sola nota: es otro motivo, y también
     tiene que decirse. Un «—» sin explicación se lee como un fallo del
     informe. */
  const sinNotas = cargar(csv({
    trimestre: '1EV',
    filas: [
      fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 20, media: 7 }),
      fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Optativa', registros: 20,
             media: null, aprobados: null, suspendidos: null })
    ],
    agrupaciones: [agr('Optativa', 'Optativas')]
  }));
  const t3 = tablaFamilias(agruparPorFamilia(sinNotas.datos, {
    agrupaciones: sinNotas.agrupaciones, modoEtapa: 'TODOS', umbrales: UMBRALES
  }), R);
  /* La fila se lee con `|| []` a propósito: si la sección desaparece entera
     —porque alguien decida que una familia sin medias no cuenta— esto tiene
     que ponerse rojo, no reventar con un TypeError. Una prueba que casca
     tapa a las que vienen detrás. */
  const fOpt = t3.filas[0] || [];
  comprobar('CANDADO: con 20 matriculados y ninguna nota, «—» en las tres y su motivo',
    fOpt.slice(3).join('|') === [SIN_DATO, SIN_DATO, SIN_DATO].join('|') &&
    fOpt[2] === '20' &&
    t3.avisos.includes('Optativas: ' + R.motivoSinDato),
    fOpt.join(' | ') + ' // ' + todosLosAvisos(t3));

  /* Y el otro extremo: un cero de verdad SÍ se escribe. Clave tiene 0 % de
     suspensos y eso es una medición. */
  const clave = porNombre(tabla, 'Especialidad');
  comprobar('CANDADO: un cero de verdad sí se escribe —no todo «—» es cero ni al revés',
    porNombre(tabla, 'Cuerda')[5] === '25.0%' && clave[3] !== SIN_DATO,
    clave.join(' | '));
}

/* ------------------------------------------------------------------ */
seccion('7. Ni un porcentaje sobre el total: sería un reparto falso');
{
  /* La tentación es la columna «% del centro»: Tecla tendría 44 de 72 → 61,1 %,
     Especialidad 83,3 %… y las cinco sumarían 183 %. Cada porción mentiría
     sobre su tamaño con la pinta de dato que tiene un porcentaje. */
  const total = res.totales.registros;
  const sospechosos = res.familias.map((f) => ((f.registros / total) * 100).toFixed(1) + '%');
  const aparece = tabla.filas.some((f, i) => f.includes(sospechosos[i]));
  comprobar('CANDADO: ninguna fila trae su cuota de registros sobre el centro',
    !aparece, sospechosos.join(', ') + ' vs ' + JSON.stringify(tabla.filas));
  comprobar('CANDADO: y la tabla tiene seis columnas, ni una más donde meterla',
    tabla.cabecera.length === 6 && tabla.filas.every((f) => f.length === 6),
    String(tabla.cabecera.length));
  comprobar('los únicos porcentajes son los de aprobados y suspensos',
    tabla.filas.every((f) => f.filter((c) => c.includes('%')).length <= 2),
    JSON.stringify(tabla.filas));
}

/* ------------------------------------------------------------------ */
seccion('8. Aquí no se traduce nada: los rótulos entran por parámetro');
{
  /* El informe se genera en castellano o en valenciano. Cualquier palabra fija
     dentro del módulo sale en castellano en el PDF valenciano, y eso no da
     error en ningún sitio. */
  const S = {};
  Object.keys(R).forEach((k) => { S[k] = '«' + k + '»'; });
  const t = tablaFamilias(res, S);

  comprobar('CANDADO: toda la cabecera viene de los rótulos, ni una palabra propia',
    t.cabecera.every((c) => c.startsWith('«')), t.cabecera.join('|'));
  comprobar('CANDADO: y todos los avisos llevan al menos un rótulo del que llama',
    t.avisos.every((a) => a.includes('«')), JSON.stringify(t.avisos));
  comprobar('el montón sin clasificar se nombra con el rótulo, no con la clave del núcleo',
    t.filas.some((f) => f[0] === '«sinClasificar»') &&
    !t.filas.some((f) => f[0].includes('(sin clasificar)')),
    t.filas.map((f) => f[0]).join('|'));
  comprobar('las claves de familia, en cambio, salen tal cual con la mayúscula inicial',
    t.filas.map((f) => f[0]).includes('Tecla'), t.filas.map((f) => f[0]).join('|'));
  comprobar('y un rótulo que falta se escribe con su clave, nunca «undefined»',
    tablaFamilias(res, {}).cabecera.join('|') ===
      'colFamilia|colAsignaturas|colRegistros|colNotaMedia|colAprobados|colSuspensos',
    tablaFamilias(res, {}).cabecera.join('|'));
  comprobar('los {marcadores} se rellenan: ni «{n}» ni «{min}» llegan al papel',
    !todosLosAvisos(tabla).includes('{n}') && !todosLosAvisos(tabla).includes('{min}'),
    todosLosAvisos(tabla));
}

/* ------------------------------------------------------------------ */
seccion('9. Cuando no hay nada que contar, la sección se salta');
{
  const nada = tablaFamilias(null, R);
  comprobar('sin resultado, `vacio` y nada que pintar',
    nada.vacio === true && nada.filas.length === 0 && nada.avisos.length === 0,
    JSON.stringify(nada));
  comprobar('con un resultado sin familias, igual',
    tablaFamilias({ familias: [], solape: { hay: false } }, R).vacio === true);
  comprobar('CANDADO: pero con familias NO está vacía, aunque ninguna tenga medias',
    tablaFamilias({ familias: [{ clave: 'percusión', asignaturas: 1, registros: 2,
                                 notaMedia: null, aprobados: null, suspendidos: null,
                                 motivo: 'pocosRegistros', minimoRegistros: 3 }] }, R).vacio === false);

  /* Un resultado al que le falta el bloque de solape: las cuatro cifras dicen
     «—». Un cero aquí afirmaría que las familias no suman ni un registro. */
  const cojo = tablaFamilias({ familias: [{ clave: 'tecla', asignaturas: 1, registros: 44,
                                            notaMedia: 5.45, aprobados: 54.5, suspendidos: 45.5,
                                            motivo: null }] }, R);
  comprobar('CANDADO: sin bloque de solape, las cuatro cifras son «—» y no cero',
    cojo.avisos[1] === 'Registros sumando familias: — · Registros del centro: —' &&
    cojo.avisos[2] === 'Asignaturas sumando familias: — · Asignaturas del centro: —',
    JSON.stringify(cojo.avisos));
}

/* ------------------------------------------------------------------ */
seccion('10. Tres reglas que el módulo escribe y nada ponía a prueba');
{
  /* --- 10a. La columna «Asignaturas» son NOMBRES DISTINTOS, no filas.
     En vista 'global' cada asignatura trae una sola fila, así que las dos
     cifras coinciden y la tabla saldría igual con la una que con la otra: el
     caso de prueba no distingue la hipótesis de su contraria. Hace falta la
     vista por niveles, donde Piano aparece en cada curso y `filas` es el
     doble que `asignaturas`. Sin esto, poner `f.filas` en la columna no pone
     roja ninguna comprobación, y el informe diría «2 asignaturas» de una
     familia que tiene una: cuatro pianos. */
  const niveles = cargar(csv({
    trimestre: '1EV',
    filas: [
      fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Piano', registros: 8, media: 5 }),
      fila({ tipo: 'CURSO_ASIG', nivel: '2EEM', asignatura: 'Piano', registros: 12, media: 10 }),
      fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Violín', registros: 16, media: 8 })
    ],
    agrupaciones: [agr('Piano', 'Tecla'), agr('Violín', 'Cuerda')]
  }));
  const resN = agruparPorFamilia(niveles.datos, {
    agrupaciones: niveles.agrupaciones, vista: 'niveles', modoEtapa: 'TODOS', umbrales: UMBRALES
  });
  const tN = tablaFamilias(resN, R);
  const teclaN = porNombre(tN, 'Tecla');
  const nucleoTecla = resN.familias.find((f) => f.clave === 'tecla') || {};

  comprobar('el caso sirve: en el núcleo esta familia tiene 1 asignatura y 2 filas',
    nucleoTecla.asignaturas === 1 && nucleoTecla.filas === 2,
    nucleoTecla.asignaturas + ' asignaturas / ' + nucleoTecla.filas + ' filas');
  comprobar('CANDADO: la columna dice 1 asignatura —no 2 filas—, y 20 registros',
    teclaN[1] === '1' && teclaN[2] === '20', teclaN.join(' | '));
  comprobar('CANDADO: y sumar la columna sigue dando la cifra «sumando familias» del núcleo',
    tN.filas.reduce((s, f) => s + Number(f[1]), 0) === resN.solape.asignaturasSumadas &&
    resN.solape.asignaturasSumadas === 2,
    tN.filas.map((f) => f[1]).join('+') + ' vs ' + resN.solape.asignaturasSumadas);

  /* --- 10b. La nota del montón «(sin clasificar)» se escribe cuando lo hay,
     y no cuando no lo hay. En papel no hay etiqueta gris que diga que ese
     renglón no es una familia con la que competir; sin la nota, se lee como
     una familia más y con la mejor media de la tabla. */
  comprobar('CANDADO: con montón, la nota que dice que eso no es una familia',
    tabla.avisos.includes(R.sinClasificarNota), todosLosAvisos(tabla));
  comprobar('y sin montón no se escribe, que sería una advertencia sobre nada',
    !tN.avisos.includes(R.sinClasificarNota), todosLosAvisos(tN));

  /* --- 10c. El {min} del motivo «pocas asignaturas» es SU mínimo, no el de
     registros. Son dos umbrales distintos que el núcleo devuelve por separado,
     y en la única prueba que había valían lo mismo por casualidad. Escribir el
     que no es da una frase impecable y falsa —«menos de 3 asignaturas» cuando
     el corte estaba en 2—, y nadie puede comprobarla desde el PDF. */
  const resMin = agruparPorFamilia(centro.datos, {
    agrupaciones: centro.agrupaciones, modoEtapa: 'TODOS', umbrales: UMBRALES,
    minimoAsignaturas: 2
  });
  const cuerdaMin = resMin.familias.find((f) => f.clave === 'cuerda') || {};
  const tMin = tablaFamilias(resMin, R);

  comprobar('el caso sirve: los dos mínimos son números distintos (2 y 3)',
    cuerdaMin.motivo === 'pocasAsignaturas' &&
    cuerdaMin.minimoAsignaturas === 2 && cuerdaMin.minimoRegistros === 3,
    JSON.stringify([cuerdaMin.motivo, cuerdaMin.minimoAsignaturas, cuerdaMin.minimoRegistros]));
  comprobar('CANDADO: el motivo escribe el mínimo de ASIGNATURAS (2), no el de registros (3)',
    tMin.avisos.includes('Cuerda: Menos de 2 asignaturas distintas: no se dan medias.') &&
    !tMin.avisos.some((a) => a.indexOf('Menos de 3 asignaturas') >= 0),
    todosLosAvisos(tMin));
  comprobar('y el de registros sigue escribiendo el suyo, que es el otro',
    tMin.avisos.includes('Percusión: Menos de 3 registros: no se dan medias.'),
    todosLosAvisos(tMin));
}

terminar('la sección de familias: el aviso del solape no se puede perder, y ni un cero de relleno.');
