/* Lo que dice el informe PDF — pruebas/informe.mjs
 *
 *   node pruebas/informe.mjs
 *
 * El informe era la pieza sin red: 1.500 líneas donde el cálculo y el dibujo
 * estaban en la misma expresión —`(kpis.notaMediaCentro || 0).toFixed(2)`—,
 * así que para comprobar una cifra había que generar un PDF y mirarlo.
 *
 * Lo que estas comprobaciones vigilan no es que las cifras sean bonitas: es
 * que **el informe no invente ninguna**. Un PDF se imprime, se manda por
 * correo y se mira en una reunión meses después, y ahí no hay nadie al lado
 * para decir «ese cero es que faltaba la fila».
 */
import { nota, porcentaje, entero, texto, diferenciaPct, diferencia, conSigno,
         celdaConDiferencia, porAsignaturaAgregada, filasComparativaKPI,
         anchosQueCaben, SIN_DATO } from '../src/nucleo/informe.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { calcularKPIs } from '../src/nucleo/kpi.js';
import { csv, fila } from './fixtures.mjs';
import { detectarEtapa } from '../src/nucleo/estadistica.js';
import { comprobar, seccion, terminar, UMBRALES } from './ayuda.mjs';

seccion('1. Lo que no se puede calcular no se escribe como cero');
{
  comprobar('un null es «—», no «0.00»', nota(null) === SIN_DATO, nota(null));
  comprobar('y un undefined también', nota(undefined) === SIN_DATO);
  comprobar('y un NaN también —que es lo que sale de dividir por cero—',
    nota(NaN) === SIN_DATO && porcentaje(NaN) === SIN_DATO);
  comprobar('y una cadena vacía, que es lo que trae una celda en blanco',
    nota('') === SIN_DATO && entero('') === SIN_DATO);
  comprobar('CANDADO: pero un cero de verdad SÍ se escribe',
    nota(0) === '0.00' && porcentaje(0) === '0.0%' && entero(0) === '0',
    nota(0) + ' / ' + porcentaje(0));
  comprobar('un número normal se formatea como toca',
    nota(7.456) === '7.46' && porcentaje(93.44) === '93.4%' && entero(6.7) === '7');
  comprobar('y el formato se puede cambiar sin tocar la regla',
    texto(3, (n) => `${n} h`) === '3 h' && texto(null, (n) => `${n} h`) === SIN_DATO);
}

seccion('2. La diferencia con el centro: la que producía «(-100.0%)»');
{
  /* Este es el daño concreto. Con la fila agregada ausente el núcleo devuelve
     null, y el informe hacía ((null - 7) / 7) * 100 = -100. Escribía «0.00
     (-100.0%)» sobre unas asignaturas de las que no sabía nada. */
  comprobar('CANDADO: sin valor no hay diferencia, no una del -100 %',
    diferenciaPct(null, 7) === '', JSON.stringify(diferenciaPct(null, 7)));
  comprobar('sin referencia tampoco', diferenciaPct(7, null) === '');
  comprobar('y con la referencia a cero tampoco —eso es dividir por cero',
    diferenciaPct(7, 0) === '');
  comprobar('con los dos datos, la diferencia sale y lleva signo',
    diferenciaPct(7.7, 7) === '(+10.0%)', diferenciaPct(7.7, 7));
  comprobar('y a la baja, sin el «+»', diferenciaPct(6.3, 7) === '(-10.0%)');
  comprobar('CANDADO: la celda entera es solo «—» cuando no hay dato',
    celdaConDiferencia(null, 7, (n) => n.toFixed(2)) === SIN_DATO,
    celdaConDiferencia(null, 7, (n) => n.toFixed(2)));
  comprobar('y valor + diferencia cuando lo hay',
    celdaConDiferencia(7.7, 7, (n) => n.toFixed(2)) === '7.70 (+10.0%)');
  comprobar('la diferencia en bruto es null si falta un lado, no un número',
    diferencia(null, 7) === null && diferencia(7, null) === null && diferencia(9, 7) === 2);
  comprobar('y con signo se escribe «+2.00», o «—» si no la hay',
    conSigno(2, (n) => n.toFixed(2)) === '+2.00' &&
    conSigno(-2, (n) => n.toFixed(2)) === '-2.00' &&
    conSigno(null, (n) => n.toFixed(2)) === SIN_DATO);
}

seccion('3. El caso de verdad: un fichero sin las filas agregadas');
{
  /* Reproduce lo que se veía en el PDF. El CSV no trae «Total no
     Especialidad» —pasa: el analizador no siempre exporta las tres— y el
     núcleo devuelve null a propósito. */
  const texto1 = csv({ trimestre: '1EV', filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 100, media: 7, desviacion: 1.5 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano', registros: 20, media: 8 }),
    fila({ tipo: 'CURSO_ESP', nivel: '1EEM', asignatura: 'Total Especialidad', registros: 12, media: 7 })
  ] });
  const p = procesarDatos(parseCSV(texto1));
  const k = calcularKPIs(p.datos, { umbrales: UMBRALES, modoEtapa: 'EEM' });

  comprobar('el núcleo dice que no hay dato de No Especialidades',
    k.notaMediaNoEspecialidades === null && k.desviacionNoEspecialidades === null);

  const filas = filasComparativaKPI(k, [
    { sufijo: 'Especialidades' },
    { esCentro: true },
    { sufijo: 'NoEspecialidades' }
  ], { notaMedia: 'Nota media', desviacion: 'Desviación', moda: 'Moda',
       aprobados: '% Aprobados', suspendidos: '% Suspensos' });

  const filaNota = filas[0];
  comprobar('CANDADO: la columna sin dato dice «—», no «0.00 (-100.0%)»',
    filaNota[3] === SIN_DATO, JSON.stringify(filaNota));
  comprobar('y la del centro sigue diciendo su cifra',
    filaNota[2] === '7.00', filaNota[2]);
  comprobar('la fila lleva su rótulo delante', filaNota[0] === 'Nota media');
  comprobar('y hay una fila por métrica, las cinco', filas.length === 5);
  comprobar('los porcentajes llevan su símbolo y la moda no tiene decimales',
    filas[3][2].endsWith('%') && !filas[2][2].includes('.'),
    filas[3][2] + ' / ' + filas[2][2]);
}

seccion('4. La media de una asignatura sumando cursos');
{
  /* La versión que vivía dentro del PDF sumaba `(notaMedia || 0) * registros`
     y dividía por TODOS los registros. Aquí Armonía tiene nota en 1EEM y no
     en 2EEM: con la cuenta antigua salía 5.00 —la mitad— en vez de 10.00. */
  const texto2 = csv({ trimestre: '1EV', filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 40, media: 7 }),
    fila({ tipo: 'CURSO_TOTAL', nivel: '1EEM', asignatura: 'Total', registros: 20, media: 7 }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Armonía', registros: 10, media: 10, aprobados: 1 }),
    fila({ tipo: 'CURSO_ASIG', nivel: '2EEM', asignatura: 'Armonía', registros: 10, media: null, aprobados: 1 }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Piano', registros: 4, media: 6 }),
    /* Una fila sin registros: no existe, no es una de una persona. */
    fila({ tipo: 'CURSO_ASIG', nivel: '2EEM', asignatura: 'Coro', registros: 0, media: 9 })
  ] });
  const d = procesarDatos(parseCSV(texto2)).datos;
  const agregadas = porAsignaturaAgregada(d);
  const porNombre = Object.fromEntries(agregadas.map((a) => [a.asignatura, a]));

  comprobar('CANDADO: el curso sin nota no cuenta como un cero que tira la media',
    porNombre['Armonía'].notaMedia === 10,
    'sale ' + porNombre['Armonía'].notaMedia + ', con la cuenta antigua salía 5');
  comprobar('pero sus registros sí cuentan: el alumnado está ahí',
    porNombre['Armonía'].registros === 20 && porNombre['Armonía'].cursos === 2);
  comprobar('cada métrica lleva su peso: los aprobados sí están en los dos cursos',
    porNombre['Armonía'].aprobados === 100, String(porNombre['Armonía'].aprobados));
  comprobar('CANDADO: una fila de cero registros no se cuenta como una de uno',
    porNombre['Coro'] === undefined, JSON.stringify(Object.keys(porNombre)));
  comprobar('las filas de total no entran en la lista',
    !agregadas.some((a) => /^total/i.test(a.asignatura)),
    agregadas.map((a) => a.asignatura).join('|'));
  comprobar('y sale ordenado por nombre, para que dos informes se puedan comparar',
    agregadas.map((a) => a.asignatura).join('|') === 'Armonía|Piano',
    agregadas.map((a) => a.asignatura).join('|'));

  const soloPiano = porAsignaturaAgregada(d, (a) => a === 'Piano');
  comprobar('y el filtro de agrupaciones se respeta',
    soloPiano.length === 1 && soloPiano[0].asignatura === 'Piano');
}

seccion('5. Una asignatura de la que no se sabe nada');
{
  const texto3 = csv({ trimestre: '1EV', filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 10, media: 7 }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Optativa', registros: 6, media: null, aprobados: null })
  ] });
  const agregadas = porAsignaturaAgregada(procesarDatos(parseCSV(texto3)).datos);
  comprobar('CANDADO: sigue en la lista —tiene 6 matriculados— pero sin cifras inventadas',
    agregadas.length === 1 && agregadas[0].registros === 6 &&
    agregadas[0].notaMedia === null && agregadas[0].aprobados === null,
    JSON.stringify(agregadas[0]));
  comprobar('y al escribirla el informe pone «—» en las dos columnas',
    nota(agregadas[0].notaMedia) === SIN_DATO && porcentaje(agregadas[0].aprobados) === SIN_DATO);
}

seccion('6. Un solo criterio de etapa para la pantalla y para el informe');
{
  /* Había dos: el del núcleo, que compara la cadena tal cual, y una copia
     dentro del generador de PDF que la pasaba a mayúsculas primero. Un nivel
     escrito «1eem» quedaba FUERA de la etapa en la pantalla y DENTRO en el
     informe, así que las dos cosas que se miran a la vez —el cuadro y el PDF
     que se lleva a la reunión— daban recuentos distintos. */
  comprobar('CANDADO: «1eem» es elemental, se escriba como se escriba',
    detectarEtapa('1eem') === 'EEM' && detectarEtapa('1EEM') === 'EEM' &&
    detectarEtapa('3epm') === 'EPM',
    detectarEtapa('1eem') + '/' + detectarEtapa('3epm'));
  comprobar('y lo que no es de ninguna etapa sigue sin serlo',
    detectarEtapa('GLOBAL') === null && detectarEtapa('') === null &&
    detectarEtapa('Otro') === null);
}

seccion('7. Ninguna tabla se sale de la página');
{
  /* Los anchos de columna del informe están escritos a mano en milímetros y
     nadie sumaba. La comparativa de KPIs medía 270 sobre los 267 útiles de una
     A4 apaisada: se metía tres milímetros en el margen derecho, lo justo para
     quedar desalineada con las demás tablas sin que salte a la vista. Y no da
     error: autoTable dibuja lo que le digan. */
  const cabe = { 0: { cellWidth: 60, halign: 'left' }, 1: { cellWidth: 70 }, 2: { cellWidth: 70 } };
  comprobar('una tabla que cabe se deja como está',
    anchosQueCaben(cabe, 267) === cabe);

  const nocabe = { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 70 },
                   2: { cellWidth: 70 }, 3: { cellWidth: 70 } };
  const ajustada = anchosQueCaben(nocabe, 267);
  const suma = Object.values(ajustada).reduce((s, c) => s + c.cellWidth, 0);
  comprobar('CANDADO: una que no cabe se encoge hasta caber exactamente',
    Math.abs(suma - 267) < 0.001, 'suma ' + suma);
  comprobar('y todas se encogen en la misma proporción, que es el reparto que alguien quiso',
    Math.abs(ajustada[1].cellWidth - ajustada[3].cellWidth) < 0.001 &&
    ajustada[0].cellWidth < ajustada[1].cellWidth,
    JSON.stringify(Object.values(ajustada).map((c) => +c.cellWidth.toFixed(2))));
  comprobar('sin tocar el resto del estilo de la columna',
    ajustada[0].fontStyle === 'bold' && ajustada[0].halign === undefined);
  comprobar('y una columna sin ancho fijo se respeta tal cual',
    anchosQueCaben({ 0: { cellWidth: 300 }, 1: { halign: 'center' } }, 267)[1].halign === 'center');
}

terminar('lo que dice el informe PDF: ni un cero de relleno, ni una diferencia inventada.');
