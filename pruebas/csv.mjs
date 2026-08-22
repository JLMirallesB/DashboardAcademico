/* Lo que entra por el CSV — pruebas/csv.mjs
 *
 *   node pruebas/csv.mjs
 *
 * Es la puerta del sistema y no avisa de casi nada: una columna mal leída no da
 * error, da un número plausible. Por eso aquí se comprueban sobre todo las
 * conversiones, que es donde se pierde el dato sin ruido.
 */
import { parseCSV } from '../src/nucleo/csv.js';
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

terminar('el CSV se lee, se convierte y se estructura.');
