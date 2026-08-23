/* La evolución entre trimestres — pruebas/evolucion.mjs
 *
 *   node pruebas/evolucion.mjs
 *
 * Este es EL fallo que el usuario notaba: «la comparativa de trimestre no iba
 * bien». Con las dos etapas cargadas y en modo TODOS, el eje del tiempo era la
 * lista de ficheros —1EV-EEM, 1EV-EPM, 2EV-EEM, 2EV-EPM— en vez de los momentos
 * del curso, así que entre la primera y la segunda evaluación de elemental se
 * colaba la primera de profesional y la línea zigzagueaba.
 *
 * El escenario de abajo es el suyo, con números que lo hacen visible: las dos
 * etapas SUBEN de la primera a la segunda evaluación, y la gráfica antigua
 * dibujaba una bajada en medio.
 */
import { serieEvolucionSelecciones, serieEvolucionNiveles, trimestreDe } from '../src/nucleo/evolucion.js';
import { momentosDe } from '../src/nucleo/texto.js';
import { parseCSV } from '../src/nucleo/csv.js';
import { procesarDatos } from '../src/nucleo/datos.js';
import { elemental, profesional } from './fixtures.mjs';
import { comprobar, seccion, terminar, casi } from './ayuda.mjs';

/* Elemental sube 7,25 → 7,30. Profesional sube 6,90 → 7,00. */
const datosCompletos = {}, trimestresDisponibles = [];
[elemental('1EV', 7.25), profesional('1EV', 6.9),
 elemental('2EV', 7.30), profesional('2EV', 7.0)].forEach((texto) => {
  const p = procesarDatos(parseCSV(texto));
  datosCompletos[p.trimestre] = p.datos;
  trimestresDisponibles.push(p.trimestre);
});

const SEL_EEM = { nivel: '1EEM', asignatura: 'Total' };
const SEL_EPM = { nivel: '1EPM', asignatura: 'Total' };

seccion('1. El eje del tiempo son las evaluaciones, no los ficheros (fallo 1)');
{
  const r = serieEvolucionSelecciones({
    trimestresDisponibles, datosCompletos,
    selecciones: [SEL_EEM, SEL_EPM], modoEtapa: 'TODOS'
  });
  comprobar('CANDADO: cuatro ficheros son DOS puntos en el eje, no cuatro',
    r.puntos.length === 2, r.puntos.map((p) => p.trimestre).join(' · '));
  /* Las etiquetas son MOMENTOS —curso + evaluación—, no evaluaciones a secas:
     con dos cursos cargados, la primera evaluación de cada uno es un punto
     distinto del eje. Cada punto lleva su momento desmontado para que la
     pantalla decida si hace falta decir el curso o basta la evaluación. */
  comprobar('y cada punto sabe de qué momento es',
    r.puntos.map((p) => p.momento.base).join() === '1EV,2EV' &&
    r.puntos.every((p) => p.momento.curso === '2627'),
    r.puntos.map((p) => p.trimestre).join());

  /* La comprobación que de verdad importa: cada serie sube, y ninguna baja
     por haberse cruzado con la otra etapa. */
  const eem = r.puntos.map((p) => p.notaMedia_0);
  const epm = r.puntos.map((p) => p.notaMedia_1);
  comprobar('CANDADO: elemental sube y solo tiene valores de elemental',
    casi(eem[0], 7.25) && casi(eem[1], 7.30), JSON.stringify(eem));
  comprobar('CANDADO: profesional sube y solo tiene valores de profesional',
    casi(epm[0], 6.9) && casi(epm[1], 7.0), JSON.stringify(epm));
  comprobar('las dos series están completas: ningún hueco que interpolar',
    r.huecos === 0, r.huecos + ' huecos');
}

seccion('2. En modo de una sola etapa, solo esa');
{
  const r = serieEvolucionSelecciones({
    trimestresDisponibles, datosCompletos, selecciones: [SEL_EEM], modoEtapa: 'EEM'
  });
  comprobar('dos evaluaciones, con los valores de elemental',
    r.puntos.length === 2 && casi(r.puntos[0].notaMedia_0, 7.25) && casi(r.puntos[1].notaMedia_0, 7.30));
  comprobar('y hay datos', r.hayDatos === true);
}

seccion('3. Un hueco es un hueco, no un punto inventado');
{
  /* Una asignatura que existe en la primera evaluación y no en la segunda.
     Con la recta que unía los extremos, la gráfica dibujaba en medio un valor
     que nadie había calculado y que se leía como dato. */
  const r = serieEvolucionSelecciones({
    trimestresDisponibles, datosCompletos,
    selecciones: [{ nivel: '1EEM', asignatura: 'Optativa que no existe' }], modoEtapa: 'EEM'
  });
  comprobar('CANDADO: lo que no hay se marca como null, y se cuenta',
    r.puntos.every((p) => p.notaMedia_0 === null) && r.huecos === 2, String(r.huecos));
  comprobar('y se sabe que no hay nada que pintar', r.hayDatos === false);
}

seccion('4. Buscar el fichero de un momento y una etapa');
{
  const m = momentosDe(trimestresDisponibles);
  comprobar('encuentra el de su etapa',
    trimestreDe(trimestresDisponibles, m[0], 'EPM') === '1EV-2627-EPM',
    String(trimestreDe(trimestresDisponibles, m[0], 'EPM')));
  comprobar('y sin etapa coge el primero de ese momento',
    trimestreDe(trimestresDisponibles, m[1], null) === '2EV-2627-EEM');
  comprobar('un momento que no está cargado devuelve null',
    trimestreDe(trimestresDisponibles, { base: '3EV', curso: '2627' }, 'EEM') === null);

  /* CANDADO del cambio: dos cursos cargados. El momento lleva el curso, así
     que pedir la primera evaluación de 25/26 NO puede devolver la de 26/27. */
  const conDosCursos = ['1EV-2526-EEM', '1EV-2627-EEM'];
  const mm = momentosDe(conDosCursos);
  comprobar('CANDADO: el curso forma parte del momento y no se confunden',
    trimestreDe(conDosCursos, mm[0], 'EEM') === '1EV-2526-EEM' &&
    trimestreDe(conDosCursos, mm[1], 'EEM') === '1EV-2627-EEM',
    trimestreDe(conDosCursos, mm[0], 'EEM'));

  /* Formato antiguo, sin curso ni etapa: tiene que seguir funcionando. */
  comprobar('un trimestre del formato antiguo se casa por su base',
    trimestreDe(['1EV-EEM', '2EV-EEM'], { base: '2EV', curso: null }, 'EEM') === '2EV-EEM');
}

seccion('5. La gráfica del informe (fallo 2)');
{
  const r = serieEvolucionNiveles({ trimestresDisponibles, datosCompletos, modoEtapa: 'TODOS' });
  comprobar('CANDADO: el eje no repite etiquetas',
    r.datos.map((d) => d.momento.base).join() === '1EV,2EV',
    r.datos.map((d) => d.trimestre).join());
  comprobar('CANDADO: los niveles van por etapa y luego por número, no intercalados',
    r.niveles.join() === '1EEM,1EPM', r.niveles.join());
  comprobar('y cada nivel toma su valor del fichero de SU etapa',
    casi(r.datos[0]['1EEM'], 7.25) && casi(r.datos[0]['1EPM'], 6.9),
    JSON.stringify(r.datos[0]));

  const soloEPM = serieEvolucionNiveles({ trimestresDisponibles, datosCompletos, modoEtapa: 'EPM' });
  comprobar('CANDADO: un informe de profesional no imprime las líneas de elemental',
    soloEPM.niveles.join() === '1EPM', soloEPM.niveles.join());

  /* Dos FICHEROS no son dos momentos: el 1EV de las dos etapas es el mismo. */
  const unaSola = {};
  ['1EV-2627-EEM', '1EV-2627-EPM'].forEach((k) => { unaSola[k] = datosCompletos[k]; });
  comprobar('CANDADO: con una sola evaluación no hay evolución que dibujar',
    serieEvolucionNiveles({ trimestresDisponibles: ['1EV-2627-EEM', '1EV-2627-EPM'],
      datosCompletos: unaSola, modoEtapa: 'TODOS' }) === null);
}

terminar('el eje del tiempo, con las dos etapas a la vez.');
