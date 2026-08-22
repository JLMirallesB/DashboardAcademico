/* Lo que entra por el CSV — pruebas/csv.mjs
 *
 *   node pruebas/csv.mjs
 *
 * Es la puerta del sistema y no avisa de casi nada: una columna mal leída no da
 * error, da un número plausible. Por eso aquí se comprueban sobre todo las
 * conversiones, que es donde se pierde el dato sin ruido.
 */
import { parseCSV, parseNumero, escalaDePorcentajes } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { csv, fila, elemental, profesional } from './fixtures.mjs';
import { comprobar, seccion, terminar, casi } from './ayuda.mjs';

const cargar = (texto) => procesarDatos(parseCSV(texto));

seccion('1. La estructura básica');
{
  const p = cargar(elemental('1EV', 7.5));
  comprobar('la clave del trimestre lleva la etapa deducida de los niveles',
    p.trimestre === '1EV-EEM', p.trimestre);
  comprobar('y se guarda también la base y la etapa por separado',
    p.trimestreBase === '1EV' && p.etapa === 'EEM');
  comprobar('la nota media del centro llega entera',
    casi(p.datos.GLOBAL.Total.stats.notaMedia, 7.5));
  comprobar('un fichero de profesional se detecta como EPM',
    cargar(profesional('1EV', 6.5)).trimestre === '1EV-EPM');
}

seccion('2. Sin trimestre en la metadata no se sigue');
{
  let mensaje = null;
  try { cargar(csv({ trimestre: '', filas: [fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total' })] })); }
  catch (e) { mensaje = e.message; }
  /* Falla a propósito y con un código: sin trimestre no hay dónde colgar los
     datos, y seguir cargándolos los mezclaría con los del fichero anterior. */
  comprobar('CANDADO: se para con un error reconocible',
    mensaje === 'ERROR_NO_TRIMESTER_METADATA', String(mensaje));
}

seccion('3. Los números, que es donde se pierde el dato');
{
  const p = cargar(csv({ filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', media: 7.25, desviacion: 1.5 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano', media: 8.5, aprobados: 0.75, suspendidos: 0.25 })
  ] }));
  comprobar('la coma decimal española se entiende',
    casi(p.datos.GLOBAL.Total.stats.notaMedia, 7.25));
  comprobar('los porcentajes vienen como fracción y salen como porcentaje',
    casi(p.datos.GLOBAL.Piano.stats.aprobados, 75) &&
    casi(p.datos.GLOBAL.Piano.stats.suspendidos, 25),
    p.datos.GLOBAL.Piano.stats.aprobados + ' / ' + p.datos.GLOBAL.Piano.stats.suspendidos);
}

seccion('4. El separador se adivina');
{
  /* Con separador coma, el decimal tiene que ser punto: es el mismo fichero
     que produce Excel en un sistema con configuración inglesa. */
  const conComas = [
    '#METADATA', 'Campo,Valor', 'Trimestre,1EV',
    '#ESTADISTICAS',
    'Tipo,Nivel,Asignatura,Registros,NotaMedia,Desviacion,Moda,PctAprobados,PctSuspendidos,ModaAprobados,ModaSuspendidos',
    'GLOBAL,GLOBAL,Total,100,7.0,1.0,7,0.9,0.1,7,4',
    'CURSO_TOTAL,1EEM,Total,25,7.0,1.0,7,0.9,0.1,7,4'
  ].join('\n');
  const p = cargar(conComas);
  comprobar('un fichero con comas también se lee',
    casi(p.datos.GLOBAL.Total.stats.notaMedia, 7), String(p.datos.GLOBAL.Total.stats.notaMedia));
}

seccion('5. Las secciones que no son estadísticas');
{
  const p = cargar(csv({
    filas: [fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total' })],
    /* Los grupos van separados por `;` DENTRO del campo, así que con separador
       `;` tienen que ir entrecomillados. Es una trampa real del formato. */
    agrupaciones: ['AGR;Percusión;"Especialidad;Viento"', 'AGR;Piano;"Especialidad;Tecla"']
  }));
  /* La clave del mapa CONSERVA los acentos. Quien consulte tiene que usar la
     misma normalización, o Percusión desaparece del informe. */
  comprobar('CANDADO: la agrupación se indexa con acentos',
    !!p.agrupaciones['percusión'], JSON.stringify(Object.keys(p.agrupaciones)));
  comprobar('y los grupos llegan partidos', p.agrupaciones['piano'].indexOf('tecla') >= 0);
}

seccion('6. «No hay dato» es null, y no cadena vacía (fallo 9)');
{
  const p = cargar(csv({ filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total' }),
    /* Una asignatura con un solo registro: ninguna nota se repite, así que el
       analizador escribe «—» en las tres modas. Es el caso normal, no raro. */
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Tuba', registros: 1,
           moda: null, modaAprob: null, modaSusp: null })
  ] }));
  const st = p.datos.GLOBAL.Tuba.stats;
  comprobar('CANDADO: la moda ausente es null, no cadena vacía',
    st.moda === null && st.modaSuspendidos === null, JSON.stringify(st.moda));
  /* Esta es la línea que reventaba: la pantalla formatea con `v?.toFixed(2)`,
     y el encadenamiento opcional protege de null pero NO de ''. Sin
     ErrorBoundary en el proyecto, la app se quedaba en blanco. */
  let rompe = false;
  try { st.moda?.toFixed(2); st.desviacion?.toFixed(2); } catch (e) { rompe = true; }
  comprobar('CANDADO: formatearla no revienta la pantalla', !rompe);
  comprobar('y una asignatura con datos sigue teniéndolos',
    typeof p.datos.GLOBAL.Total.stats.moda === 'number');
}

seccion('7. La escala de los porcentajes se decide por fichero (fallo 8)');
{
  /* Un fichero en escala 0-100: una sola suspensa de cuarenta es el 1 %.
     La regla vieja miraba celda a celda y «1 <= 1» lo convertía en 100 %:
     la asignatura salía con el 100 % de suspensos y se clasificaba DIFÍCIL. */
  const enCien = cargar(csv({ filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 100,
           aprobados: 95, suspendidos: 5 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Guitarra', registros: 40,
           aprobados: 99, suspendidos: 1 })
  ] }));
  comprobar('CANDADO: un 1 % de suspensos sigue siendo 1 %, no 100 %',
    casi(enCien.datos.GLOBAL.Guitarra.stats.suspendidos, 1),
    String(enCien.datos.GLOBAL.Guitarra.stats.suspendidos));

  /* Y el fichero normal, en fracción, se sigue convirtiendo. */
  const enFraccion = cargar(elemental('1EV', 7));
  comprobar('el fichero del analizador, en fracción, se pasa a porcentaje',
    casi(enFraccion.datos.GLOBAL.Total.stats.aprobados, 90),
    String(enFraccion.datos.GLOBAL.Total.stats.aprobados));

  comprobar('la decisión se puede consultar', escalaDePorcentajes([{ Aprobados: 0.9 }]) === 'fraccion');
  comprobar('y con el símbolo % ya viene resuelta',
    escalaDePorcentajes([{ Aprobados: 1, __porcentajeExplicito: true }]) === 'porcentaje');
}

seccion('8. Los números con separador de millar (fallo 11)');
{
  comprobar('la coma decimal, con o sin millares',
    parseNumero('7,25') === 7.25 && parseNumero('1.234,5') === 1234.5,
    parseNumero('1.234,5') + '');
  /* CANDADO: 1.050 registros son mil cincuenta, no uno coma cero cinco. Con
     1,05 la asignatura cae bajo el mínimo de alumnado y desaparece de todo. */
  comprobar('CANDADO: en una columna de contar, el punto de millar no es decimal',
    parseNumero('1.050', { entero: true }) === 1050,
    String(parseNumero('1.050', { entero: true })));
  comprobar('pero en una nota el punto SIGUE siendo decimal',
    parseNumero('7.5') === 7.5 && parseNumero('7.500') === 7.5);
  comprobar('y varias comas no dejan basura detrás',
    parseNumero('1.234.567,89') === 1234567.89);
  comprobar('lo vacío es null, no cero',
    parseNumero('') === null && parseNumero(null) === null);

  const p = cargar(csv({ filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: '1.050' })
  ] }));
  comprobar('y entra bien desde el fichero',
    p.datos.GLOBAL.Total.stats.registros === 1050,
    String(p.datos.GLOBAL.Total.stats.registros));
}

terminar('el CSV se lee, se convierte y se estructura.');
