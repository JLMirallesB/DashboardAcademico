/* La ficha de «cómo se ha hecho este informe» — pruebas/informe-contexto.mjs
 *
 *   node pruebas/informe-contexto.mjs
 *
 * Lo que vigilan estas comprobaciones no es que la ficha quede bonita: es que
 * **no se pueda leer un informe sin saber con qué se ha hecho**.
 *
 * El daño concreto que hay detrás: los umbrales que deciden qué asignatura es
 * DIFÍCIL o FÁCIL son configurables desde la pantalla y el PDF no los
 * mencionaba ni una vez —`grep -c umbrales src/services/pdfGenerator.js` daba
 * 0—, así que dos informes de los mismos datos podían señalar asignaturas
 * distintas sin que nada en el documento lo delatara.
 *
 * Y la trampa contraria, que es peor: rellenar con el umbral de fábrica uno
 * que no llegó. Con `suspensosAlerta` fuera de juego NINGUNA asignatura se
 * marca como difícil en todo el informe; escribir «30 %» ahí haría leer ese
 * listado vacío como una buena noticia.
 */
import { fichaDelInforme, claveDeUmbral } from '../src/nucleo/informe-contexto.js';
import { UMBRALES_DEFAULT } from '../src/constants.js';
import { SIN_DATO } from '../src/nucleo/informe.js';
import { comprobar, seccion, terminar } from './ayuda.mjs';

/* Zona horaria de UTC+14 a propósito: es la que pone en evidencia si la fecha
   de generación se construye con `toISOString()` en vez de con los componentes
   locales. Ver la sección 6. */
process.env.TZ = 'Pacific/Kiritimati';

const CLAVE = '1EV-2627-EEM';

/** La llamada de referencia: un fichero de elemental, umbrales de fábrica y
 *  sin filtro. Cada sección cambia solo lo que está probando. */
const ficha = (extra = {}) => fichaDelInforme({
  umbrales: UMBRALES_DEFAULT,
  metadata: { Centro: 'Centro de prueba', CursoAcademico: '26/27', Trimestre: '1EV' },
  trimestreSeleccionado: CLAVE,
  trimestresDisponibles: [CLAVE],
  modoEtapa: 'EEM',
  filtroAgrupaciones: null,
  generadoEn: new Date(2026, 7, 23, 12, 5),
  ...extra
});

/** El valor de la fila cuyo concepto es `concepto`. Sin `rotulos`, el concepto
 *  es la propia clave, así que se puede buscar por ella. */
const valorDe = (f, concepto) => {
  const fila = f.filas.find((x) => x[0] === concepto);
  return fila ? fila[1] : undefined;
};

const CLAVES_UMBRAL = Object.keys(UMBRALES_DEFAULT);

seccion('1. Los cinco umbrales con los que se ha clasificado');
{
  const f = ficha();
  comprobar('los cinco están, uno por fila',
    CLAVES_UMBRAL.every((k) => valorDe(f, claveDeUmbral(k)) !== undefined),
    JSON.stringify(f.filas.map((x) => x[0])));
  comprobar('el de suspensos es un porcentaje, no un número suelto',
    valorDe(f, 'umbralSuspensosAlerta') === '30.0%',
    valorDe(f, 'umbralSuspensosAlerta'));
  comprobar('los dos de media son notas, con dos decimales',
    valorDe(f, 'umbralMediaCritica') === '6.00' &&
    valorDe(f, 'umbralMediaFacil') === '8.00',
    valorDe(f, 'umbralMediaCritica') + ' / ' + valorDe(f, 'umbralMediaFacil'));
  comprobar('el de aprobados también es porcentaje',
    valorDe(f, 'umbralAprobadosMinimo') === '90.0%');
  comprobar('y el de alumnos es un recuento, sin decimales',
    valorDe(f, 'umbralAlumnosMinimo') === '3', valorDe(f, 'umbralAlumnosMinimo'));
  comprobar('CANDADO: con los de fábrica no se marca nada como cambiado',
    !CLAVES_UMBRAL.some((k) => valorDe(f, claveDeUmbral(k)).includes('fichaCambiado')) &&
    !f.avisos.some((a) => a.startsWith('fichaAvisoUmbralesCambiados')),
    JSON.stringify(f.avisos));
  comprobar('la clave de rótulo de un umbral se deriva de su nombre',
    claveDeUmbral('mediaCritica') === 'umbralMediaCritica' &&
    claveDeUmbral('suspensosAlerta') === 'umbralSuspensosAlerta');
}

seccion('2. CANDADO: un umbral cambiado se dice, y se dice cuál');
{
  /* La razón de ser del módulo. Se prueba umbral a umbral —cambiando UNO y
     comprobando que se marca ese y solo ese— porque un «alguno está marcado»
     pasaría igual con un módulo que los marcara todos siempre. */
  const nuevos = { suspensosAlerta: 25, mediaCritica: 5, mediaFacil: 8.5,
                   aprobadosMinimo: 80, alumnosMinimo: 5 };

  let marcadosBien = 0;
  let contagiados = 0;
  let avisosBien = 0;
  CLAVES_UMBRAL.forEach((k) => {
    const f = ficha({ umbrales: { ...UMBRALES_DEFAULT, [k]: nuevos[k] } });
    if (valorDe(f, claveDeUmbral(k)).includes('fichaCambiado')) marcadosBien++;
    if (CLAVES_UMBRAL.filter((o) => o !== k)
        .some((o) => valorDe(f, claveDeUmbral(o)).includes('fichaCambiado'))) contagiados++;
    if (f.avisos.some((a) => a.startsWith('fichaAvisoUmbralesCambiados') &&
                             a.includes(claveDeUmbral(k)))) avisosBien++;
  });

  comprobar('CANDADO: cambiar cualquiera de los cinco se marca en su fila',
    marcadosBien === 5, marcadosBien + ' de 5');
  comprobar('CANDADO: y no se marcan los otros cuatro, que siguen siendo los de fábrica',
    contagiados === 0, contagiados + ' informes con marcas de más');
  comprobar('CANDADO: el aviso de debajo de la tabla dice CUÁL se ha cambiado',
    avisosBien === 5, avisosBien + ' de 5');

  const f = ficha({ umbrales: { ...UMBRALES_DEFAULT, mediaCritica: 5 } });
  comprobar('CANDADO: el valor escrito es el de HOY, y el de fábrica va detrás',
    valorDe(f, 'umbralMediaCritica').startsWith('5.00') &&
    valorDe(f, 'umbralMediaCritica').includes('fichaDeFabrica') &&
    valorDe(f, 'umbralMediaCritica').includes('6.00'),
    valorDe(f, 'umbralMediaCritica'));

  const fMedio = ficha({ umbrales: { ...UMBRALES_DEFAULT, mediaFacil: 8.5 } });
  comprobar('CANDADO: medio punto de diferencia también es un cambio',
    valorDe(fMedio, 'umbralMediaFacil').startsWith('8.50') &&
    valorDe(fMedio, 'umbralMediaFacil').includes('fichaCambiado'),
    valorDe(fMedio, 'umbralMediaFacil'));

  const fTodos = ficha({ umbrales: nuevos });
  comprobar('con los cinco cambiados, el aviso los nombra a los cinco',
    CLAVES_UMBRAL.every((k) => fTodos.avisos.some((a) => a.includes(claveDeUmbral(k)))),
    JSON.stringify(fTodos.avisos));
}

seccion('3. CANDADO: lo que no llega no se rellena con el de fábrica');
{
  const vacia = ficha({ umbrales: {} });
  comprobar('CANDADO: sin umbrales, las cinco filas dicen «—»',
    CLAVES_UMBRAL.every((k) => valorDe(vacia, claveDeUmbral(k)) === SIN_DATO),
    JSON.stringify(CLAVES_UMBRAL.map((k) => valorDe(vacia, claveDeUmbral(k)))));
  comprobar('CANDADO: y en ninguna se cuela el de fábrica',
    !CLAVES_UMBRAL.some((k) => /\d/.test(valorDe(vacia, claveDeUmbral(k)))),
    JSON.stringify(vacia.filas));
  comprobar('CANDADO: se avisa, y se dice cuáles faltan',
    vacia.avisos.some((a) => a.startsWith('fichaAvisoUmbralSinValor') &&
      CLAVES_UMBRAL.every((k) => a.includes(claveDeUmbral(k)))),
    JSON.stringify(vacia.avisos));
  comprobar('y no se marcan como «cambiados»: no se sabe con qué se clasificó, y eso es otra cosa',
    !vacia.avisos.some((a) => a.startsWith('fichaAvisoUmbralesCambiados')));

  /* El panel de umbrales es un campo de texto. Un «30» en cadena compara mal
     con todo (`'30' >= 30` es true por coerción, pero `'30' < 6` es false) y
     escribirlo como si fuera un número daría la ficha por buena. */
  const texto = ficha({ umbrales: { ...UMBRALES_DEFAULT, suspensosAlerta: '25' } });
  comprobar('CANDADO: un umbral escrito como texto es «—», no un número',
    valorDe(texto, 'umbralSuspensosAlerta') === SIN_DATO,
    valorDe(texto, 'umbralSuspensosAlerta'));
  comprobar('y se avisa de ese y solo de ese',
    texto.avisos.some((a) => a.startsWith('fichaAvisoUmbralSinValor') &&
      a.includes('umbralSuspensosAlerta') && !a.includes('umbralMediaCritica')),
    JSON.stringify(texto.avisos));

  const raros = ficha({ umbrales: { suspensosAlerta: null, mediaCritica: NaN,
                                    mediaFacil: undefined, aprobadosMinimo: Infinity,
                                    alumnosMinimo: 3 } });
  comprobar('null, NaN, undefined e Infinity son todos «no hay dato»',
    valorDe(raros, 'umbralSuspensosAlerta') === SIN_DATO &&
    valorDe(raros, 'umbralMediaCritica') === SIN_DATO &&
    valorDe(raros, 'umbralMediaFacil') === SIN_DATO &&
    valorDe(raros, 'umbralAprobadosMinimo') === SIN_DATO);
  comprobar('pero el que sí llega sigue diciendo su cifra',
    valorDe(raros, 'umbralAlumnosMinimo') === '3');

  /* La regla de `informe.js`, aquí: cero es un valor, no un hueco. Una media
     crítica a 0 es un centro que ha decidido no marcar nada como difícil por
     nota, y eso hay que poder leerlo. */
  const cero = ficha({ umbrales: { ...UMBRALES_DEFAULT, mediaCritica: 0 } });
  comprobar('CANDADO: un umbral a cero SÍ se escribe, y como cambiado',
    valorDe(cero, 'umbralMediaCritica').startsWith('0.00') &&
    valorDe(cero, 'umbralMediaCritica').includes('fichaCambiado'),
    valorDe(cero, 'umbralMediaCritica'));
}

seccion('4. De qué fichero sale el informe, y de cuántos');
{
  const f = ficha();
  comprobar('la evaluación, el curso académico y la etapa están',
    valorDe(f, 'fichaEvaluacion') === '1EV' &&
    valorDe(f, 'fichaCursoAcademico') === '26/27' &&
    valorDe(f, 'fichaEtapa') === 'EEM',
    [valorDe(f, 'fichaEvaluacion'), valorDe(f, 'fichaCursoAcademico'),
     valorDe(f, 'fichaEtapa')].join(' / '));

  /* La etapa del fichero y el modo son dos cosas: un fichero de elemental
     mirado en modo TODOS produce un informe que suma las dos etapas. */
  const todos = ficha({ modoEtapa: 'TODOS' });
  comprobar('CANDADO: la etapa del fichero y el modo de etapa no se confunden',
    valorDe(todos, 'fichaEtapa') === 'EEM' && valorDe(todos, 'fichaModoEtapa') === 'TODOS',
    valorDe(todos, 'fichaEtapa') + ' / ' + valorDe(todos, 'fichaModoEtapa'));

  const cinco = ['1EV-2627-EEM', '2EV-2627-EEM', '1EV-2627-EPM',
                 '1EV-2526-EEM', 'FINAL-2526-EPM'];
  const g = ficha({ trimestresDisponibles: cinco });
  comprobar('CANDADO: se dice de cuántos ficheros cargados sale este',
    valorDe(g, 'fichaFicherosCargados') === '5', valorDe(g, 'fichaFicherosCargados'));
  comprobar('CANDADO: y cuáles son los otros cuatro',
    cinco.slice(1).every((c) => valorDe(g, 'fichaFicherosLista').includes(c.split('-')[0])),
    valorDe(g, 'fichaFicherosLista'));
  comprobar('CANDADO: con más de uno cargado, se avisa de que el informe es de uno solo',
    g.avisos.includes('fichaAvisoVariosFicheros'), JSON.stringify(g.avisos));
  /* «La marca está» pasaría igual con un módulo que las marcara TODAS, o que
     marcara la que no es: las dos cosas dejan la lista igual de muda sobre de
     cuál sale el informe. Así que se mira cuál la lleva, y cuántas hay. */
  const listaG = valorDe(g, 'fichaFicherosLista');
  comprobar('CANDADO: el fichero del informe va marcado, y el marcado es EL SUYO',
    listaG.includes('26/27 · 1EV (EEM) fichaEsteFichero'), listaG);
  comprobar('CANDADO: y la marca la lleva uno solo',
    listaG.split('fichaEsteFichero').length - 1 === 1,
    (listaG.split('fichaEsteFichero').length - 1) + ' marcas en: ' + listaG);

  /* Con el seleccionado en cuarto lugar: si el módulo marcara «el primero de
     la lista», el caso de arriba —donde el suyo es el primero— saldría bien. */
  const enMedio = ficha({ trimestresDisponibles: cinco,
                          trimestreSeleccionado: '1EV-2526-EEM',
                          metadata: { CursoAcademico: '25/26', Trimestre: '1EV' } });
  comprobar('CANDADO: la marca va en el fichero seleccionado aunque no sea el primero',
    valorDe(enMedio, 'fichaFicherosLista').includes('25/26 · 1EV (EEM) fichaEsteFichero') &&
    valorDe(enMedio, 'fichaFicherosLista').split('fichaEsteFichero').length - 1 === 1,
    valorDe(enMedio, 'fichaFicherosLista'));

  /* Un fichero se separa del siguiente de otra forma que el curso de su
     evaluación; si no, cinco ficheros son diez tokens sueltos. */
  comprobar('CANDADO: los cinco ficheros se pueden separar unos de otros al leerlos',
    listaG.split(' | ').length === 5, listaG);
  comprobar('CANDADO: la lista lleva el rótulo del fichero, no su clave interna',
    !valorDe(g, 'fichaFicherosLista').includes(CLAVE) &&
    valorDe(g, 'fichaFicherosLista').includes('26/27 · 1EV (EEM)'),
    valorDe(g, 'fichaFicherosLista'));
  comprobar('y con dos cursos cargados se distinguen por el curso, no solo por la evaluación',
    valorDe(g, 'fichaFicherosLista').includes('25/26 · 1EV (EEM)'),
    valorDe(g, 'fichaFicherosLista'));

  comprobar('con uno solo cargado no se avisa de nada',
    !f.avisos.includes('fichaAvisoVariosFicheros'), JSON.stringify(f.avisos));
  const sinLista = ficha({ trimestresDisponibles: [] });
  comprobar('sin lista de ficheros no se dice «0»: el informe viene del que hay',
    valorDe(sinLista, 'fichaFicherosCargados') === '1',
    valorDe(sinLista, 'fichaFicherosCargados'));

  /* Los CSV anteriores al 23/08/2026 no traían curso académico. Lo que no se
     sabe, no se inventa: ni el del sistema ni el del fichero de al lado. */
  const sinCurso = ficha({ metadata: { Trimestre: '1EV' }, trimestreSeleccionado: '1EV-EEM' });
  comprobar('CANDADO: un fichero sin curso académico lo dice, no se lo inventa',
    valorDe(sinCurso, 'fichaCursoAcademico') === SIN_DATO,
    valorDe(sinCurso, 'fichaCursoAcademico'));
  comprobar('pero la evaluación y la etapa siguen saliendo',
    valorDe(sinCurso, 'fichaEvaluacion') === '1EV' && valorDe(sinCurso, 'fichaEtapa') === 'EEM');
  comprobar('y se acepta la metadata con la tilde, que es como la escriben algunos ficheros',
    valorDe(ficha({ metadata: { 'CursoAcadémico': '25/26' } }), 'fichaCursoAcademico') === '25/26');

  /* La clave del caso de arriba («1EV-EEM») no lleva curso, así que un módulo
     que SÍ lo reconstruyera de la clave daría el mismo «—» y la comprobación
     pasaría igual. Este lo lleva dentro (2627) y la metadata no lo trae. */
  const claveConCurso = ficha({ metadata: { Trimestre: '1EV' } });
  comprobar('CANDADO: tampoco se reconstruye de la clave, que sí lo lleva dentro',
    valorDe(claveConCurso, 'fichaCursoAcademico') === SIN_DATO,
    valorDe(claveConCurso, 'fichaCursoAcademico'));

  /* En el caso normal la metadata y la clave dicen lo mismo («1EV» las dos),
     así que un módulo que se saltara la metadata sería indistinguible del
     bueno. Se separan para ver cuál manda. */
  const discrepa = ficha({ metadata: { CursoAcademico: '26/27', Trimestre: 'FINAL' } });
  comprobar('CANDADO: la evaluación la manda la metadata del fichero, no su clave',
    valorDe(discrepa, 'fichaEvaluacion') === 'FINAL', valorDe(discrepa, 'fichaEvaluacion'));
  const soloClave = ficha({ metadata: { CursoAcademico: '26/27' } });
  comprobar('y sin metadata se cae a la clave, que es mejor que un «—»',
    valorDe(soloClave, 'fichaEvaluacion') === '1EV', valorDe(soloClave, 'fichaEvaluacion'));
}

seccion('5. Qué filtro de agrupaciones estaba puesto');
{
  comprobar('sin filtro se dice que no había ninguno',
    valorDe(ficha(), 'fichaFiltroAgrupaciones') === 'fichaSinFiltro');
  comprobar('con filtro se nombran las agrupaciones',
    valorDe(ficha({ filtroAgrupaciones: ['Banda', 'Orquesta'] }), 'fichaFiltroAgrupaciones')
      === 'Banda, Orquesta',
    valorDe(ficha({ filtroAgrupaciones: ['Banda', 'Orquesta'] }), 'fichaFiltroAgrupaciones'));

  /* El generador trata `null` y `[]` de forma opuesta: `null` incluye todo y
     un array vacío no deja pasar ni una asignatura. Un informe así sale con
     las tablas en blanco, y sin la ficha no hay forma de saber por qué. */
  const vacio = ficha({ filtroAgrupaciones: [] });
  comprobar('CANDADO: un filtro vacío NO es «sin filtro» —no deja pasar nada',
    valorDe(vacio, 'fichaFiltroAgrupaciones') === 'fichaFiltroVacio',
    valorDe(vacio, 'fichaFiltroAgrupaciones'));
  comprobar('CANDADO: y se avisa, que es lo que explica las tablas en blanco',
    vacio.avisos.includes('fichaAvisoFiltroVacio'), JSON.stringify(vacio.avisos));
  comprobar('un filtro normal no dispara ese aviso',
    !ficha({ filtroAgrupaciones: ['Banda'] }).avisos.includes('fichaAvisoFiltroVacio'));
}

seccion('6. La fecha entra por parámetro: el módulo no mira el reloj');
{
  /* Con TZ = UTC+14, `toISOString()` de una fecha local del 23 a las 00:30
     devuelve el DÍA ANTERIOR. La fecha de un documento que se archiva es justo
     lo que nadie vuelve a comprobar. */
  const madrugada = new Date(2026, 7, 23, 0, 30);
  comprobar('CANDADO: se escribe la fecha LOCAL, no la de UTC',
    valorDe(ficha({ generadoEn: madrugada }), 'fichaGeneradoEn') === '2026-08-23 00:30',
    valorDe(ficha({ generadoEn: madrugada }), 'fichaGeneradoEn') +
    '  (toISOString diría ' + madrugada.toISOString() + ')');
  comprobar('con hora de dos cifras sale igual de bien',
    valorDe(ficha(), 'fichaGeneradoEn') === '2026-08-23 12:05',
    valorDe(ficha(), 'fichaGeneradoEn'));
  comprobar('una cadena ya formateada se respeta tal cual —quien llama sabe el idioma',
    valorDe(ficha({ generadoEn: '23 d’agost de 2026' }), 'fichaGeneradoEn')
      === '23 d’agost de 2026');
  comprobar('CANDADO: sin fecha se dice «—», no la de hoy',
    valorDe(ficha({ generadoEn: undefined }), 'fichaGeneradoEn') === SIN_DATO,
    valorDe(ficha({ generadoEn: undefined }), 'fichaGeneradoEn'));
  comprobar('y una fecha inválida tampoco se convierte en un texto plausible',
    valorDe(ficha({ generadoEn: new Date('vaya') }), 'fichaGeneradoEn') === SIN_DATO);
}

seccion('7. Los rótulos entran de fuera: aquí no hay traducciones');
{
  const rotulos = {
    fichaConcepto: 'Concepto', fichaValor: 'Valor',
    fichaEvaluacion: 'Evaluación', fichaCursoAcademico: 'Curso académico',
    umbralMediaCritica: 'Media crítica',
    fichaCambiado: 'canviat', fichaDeFabrica: 'de sèrie',
    '1EV': 'Primera avaluació'
  };
  const f = ficha({ umbrales: { ...UMBRALES_DEFAULT, mediaCritica: 5 }, rotulos });

  comprobar('la cabecera es la que pasa quien llama',
    f.cabecera[0] === 'Concepto' && f.cabecera[1] === 'Valor', JSON.stringify(f.cabecera));
  comprobar('y los conceptos también',
    valorDe(f, 'Curso académico') === '26/27');
  comprobar('hasta el nombre de la evaluación, que cambia de idioma',
    valorDe(f, 'Evaluación') === 'Primera avaluació', valorDe(f, 'Evaluación'));
  comprobar('CANDADO: la marca de «cambiado» también se traduce',
    valorDe(f, 'Media crítica') === '5.00 (canviat, de sèrie 6.00)',
    valorDe(f, 'Media crítica'));

  /* Un rótulo que falte se escribe como su clave —el trato que da `t()` en las
     apps hermanas—: una clave suelta en el PDF se ve y se arregla; una
     excepción a mitad de la generación deja al usuario sin informe. */
  const sinRotulos = ficha();
  comprobar('CANDADO: sin rótulos no hay ni un texto en castellano cableado dentro',
    sinRotulos.filas.every((x) => /^[a-z][A-Za-z]*$/.test(x[0])),
    JSON.stringify(sinRotulos.filas.map((x) => x[0])));
  comprobar('y un rótulo vacío cae a la clave, no deja la celda en blanco',
    valorDe(ficha({ rotulos: { fichaEvaluacion: '   ' } }), 'fichaEvaluacion') === '1EV');

  /* La lista de ficheros cargados también se lee, y lleva dentro la evaluación
     y la etapa. Sin pasar por `rot`, un informe en valenciano diría «1EV (EEM)»
     en esa fila y en ninguna otra, que es justo lo que nadie va a mirar. */
  const conIdioma = ficha({
    trimestresDisponibles: ['1EV-2627-EEM', 'FINAL-2526-EPM'],
    rotulos: { ...rotulos, FINAL: 'Final', EEM: 'Elemental', EPM: 'Professional' }
  });
  comprobar('CANDADO: la lista de ficheros también se traduce, evaluación y etapa',
    valorDe(conIdioma, 'fichaFicherosLista').includes('26/27 · Primera avaluació (Elemental)') &&
    valorDe(conIdioma, 'fichaFicherosLista').includes('25/26 · Final (Professional)'),
    valorDe(conIdioma, 'fichaFicherosLista'));
}

seccion('8. El contrato de salida, el mismo para todas las piezas');
{
  const f = ficha();
  comprobar('las cuatro claves, con su forma',
    typeof f.vacio === 'boolean' && Array.isArray(f.cabecera) &&
    Array.isArray(f.filas) && Array.isArray(f.avisos));
  comprobar('la cabecera tiene dos columnas: concepto y valor',
    f.cabecera.length === 2);
  comprobar('todas las filas son de dos celdas, y todas son texto ya formateado',
    f.filas.length > 0 &&
    f.filas.every((x) => x.length === 2 && x.every((c) => typeof c === 'string')),
    JSON.stringify(f.filas));
  comprobar('los avisos son frases sueltas de texto',
    f.avisos.every((a) => typeof a === 'string'));

  /* La ficha no se salta nunca, y menos cuando falta todo: un informe del que
     no se sabe con qué se hizo es exactamente el que hay que marcar. */
  const nada = fichaDelInforme();
  comprobar('CANDADO: sin ningún parámetro no revienta y la ficha sigue sin estar vacía',
    nada.vacio === false && nada.filas.length === f.filas.length,
    nada.filas.length + ' filas');
  comprobar('y lo que no se sabe sale como «—» en vez de desaparecer',
    valorDe(nada, 'fichaEvaluacion') === SIN_DATO &&
    valorDe(nada, 'fichaCursoAcademico') === SIN_DATO &&
    CLAVES_UMBRAL.every((k) => valorDe(nada, claveDeUmbral(k)) === SIN_DATO),
    JSON.stringify(nada.filas));

  /* El orden es parte de la ficha —de qué fichero sale, cuántos había, qué
     filtro, con qué umbrales y cuándo—, y hasta aquí no lo miraba nadie:
     todas las comprobaciones buscan la fila por su concepto, así que darle la
     vuelta a la tabla, reordenar los cinco umbrales o repetir una fila salía
     en verde. Los umbrales van en el orden en que están declarados en
     `constants.js`, que es lo que dice el módulo de sí mismo. */
  const ORDEN = ['fichaEvaluacion', 'fichaCursoAcademico', 'fichaEtapa', 'fichaModoEtapa',
    'fichaFicherosCargados', 'fichaFicherosLista', 'fichaFiltroAgrupaciones',
    ...CLAVES_UMBRAL.map(claveDeUmbral), 'fichaGeneradoEn'];
  comprobar('CANDADO: las trece filas, en su orden y sin repetirse',
    JSON.stringify(f.filas.map((x) => x[0])) === JSON.stringify(ORDEN),
    JSON.stringify(f.filas.map((x) => x[0])));
  comprobar('y sin ningún parámetro salen esas mismas trece, en el mismo orden',
    JSON.stringify(nada.filas.map((x) => x[0])) === JSON.stringify(ORDEN),
    JSON.stringify(nada.filas.map((x) => x[0])));
}

terminar('la ficha del informe: con qué umbrales, de qué fichero y con qué filtro.');
