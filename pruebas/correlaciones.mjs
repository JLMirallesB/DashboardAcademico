/* Las correlaciones entre asignaturas — pruebas/correlaciones.mjs
 *
 *   node pruebas/correlaciones.mjs
 *
 * La gráfica se llamaba «evolución de correlaciones» y no evolucionaba:
 * recorría todos los trimestres cargados escribiendo en la misma clave, así
 * que **ganaba el último**. Nada lo decía, y cargar los ficheros en otro orden
 * cambiaba el número sin cambiar los datos.
 */
import { clavePar, paresDe, correlacionDe, mediaFisher, paresMasFuertes,
         porPares, porNiveles } from '../src/nucleo/correlaciones.js';
import { comprobar, seccion, terminar, casi } from './ayuda.mjs';

const c = (nivel, a, b, r) => ({ Nivel: nivel, Asignatura1: a, Asignatura2: b, Correlacion: r });

const primera = [c('1EEM', 'Lenguaje Musical', 'Piano', 0.82), c('2EEM', 'Lenguaje Musical', 'Piano', 0.40)];
const segunda = [c('1EEM', 'Lenguaje Musical', 'Piano', 0.55), c('2EEM', 'Lenguaje Musical', 'Piano', 0.30)];

seccion('1. Cada trimestre da su número, y solo el suyo (fallo 7)');
{
  const pares = paresDe(primera, 'EEM');
  comprobar('CANDADO: la primera evaluación da 0,82',
    casi(correlacionDe(primera, pares[0], '1EEM'), 0.82));
  comprobar('CANDADO: la segunda da 0,55, y no pisa a la primera',
    casi(correlacionDe(segunda, pares[0], '1EEM'), 0.55));
  /* La prueba de que ya no depende del orden: se consulta el fichero que se
     está mirando, no «todos los cargados». */
  comprobar('CANDADO: mezclar los dos ficheros no es una operación posible',
    correlacionDe(primera, pares[0], '1EEM') !== correlacionDe(segunda, pares[0], '1EEM'));
  comprobar('lo que no está devuelve null',
    correlacionDe(primera, pares[0], '4EEM') === null);
}

seccion('2. Un guion en el nombre no parte el par');
{
  /* El par se identificaba con `a-b` y luego se partía con split('-'): con
     «Orquesta/Banda/Conjunto» va bien, pero cualquier nombre con guion —o una
     optativa con guion— se rompía en dos asignaturas que no existen. */
  const conGuion = [c('1EPM', 'Piano-complementario', 'Análisis', 0.5)];
  const pares = paresDe(conGuion, 'EPM');
  comprobar('CANDADO: el par conserva los dos nombres enteros',
    pares[0].asig1 === 'Piano-complementario' && pares[0].asig2 === 'Análisis',
    JSON.stringify(pares[0]));
  comprobar('y se encuentra su coeficiente',
    casi(correlacionDe(conGuion, pares[0], '1EPM'), 0.5));
  comprobar('la clave distingue los pares aunque los nombres se parezcan',
    clavePar('a-b', 'c') !== clavePar('a', 'b-c'));
}

seccion('3. Los coeficientes no se promedian sumando');
{
  /* Promediar r a pelo sesga a la baja: la escala no es lineal. La
     transformada de Fisher es el promedio correcto, y con valores altos la
     diferencia es visible. */
  const aPelo = (0.9 + 0.5) / 2;
  const fisher = mediaFisher([0.9, 0.5]);
  comprobar('CANDADO: el promedio de Fisher no es la media aritmética',
    Math.abs(fisher - aPelo) > 0.01, fisher.toFixed(4) + ' vs ' + aPelo.toFixed(4));
  comprobar('y queda por encima, que es la dirección del sesgo', fisher > aPelo);
  comprobar('con un solo valor devuelve ese valor', casi(mediaFisher([0.7]), 0.7, 1e-6));
  comprobar('sin valores devuelve null', mediaFisher([]) === null);
  /* Un ±1 exacto haría infinito el cálculo: se recorta en vez de reventar. */
  comprobar('CANDADO: un 1 exacto no rompe el promedio',
    typeof mediaFisher([1, 0.5]) === 'number' && isFinite(mediaFisher([1, 0.5])));
}

seccion('4. Quedarse con los pares que dicen algo');
{
  const corrs = [
    c('1EEM', 'LM', 'Piano', 0.9), c('2EEM', 'LM', 'Piano', 0.85),
    c('1EEM', 'Coro', 'Piano', 0.1), c('2EEM', 'Coro', 'Piano', 0.05),
    c('1EEM', 'LM', 'Coro', 0.6)
  ];
  const pares = paresDe(corrs, 'EEM');
  comprobar('los tres pares se detectan', pares.length === 3);
  const top = paresMasFuertes(corrs, pares, ['1EEM', '2EEM'], 2);
  comprobar('CANDADO: el par más fuerte va primero, el flojo se queda fuera',
    top[0].asig1 === 'LM' && top[0].asig2 === 'Piano' &&
    !top.some((p) => p.asig1 === 'Coro'),
    top.map((p) => p.asig1 + '/' + p.asig2).join(' · '));
}

seccion('5. Las dos formas de mirarlo');
{
  const corrs = [c('1EEM', 'LM', 'Piano', 0.8), c('2EEM', 'LM', 'Piano', 0.4)];
  const pares = paresDe(corrs, 'EEM');
  const ejeP = porPares(corrs, pares, ['1EEM', '2EEM']);
  comprobar('con los pares en el eje, cada nivel es una serie',
    ejeP.length === 1 && casi(ejeP[0]['1EEM'], 0.8) && casi(ejeP[0]['2EEM'], 0.4),
    JSON.stringify(ejeP[0]));
  const ejeN = porNiveles(corrs, pares, ['1EEM', '2EEM']);
  comprobar('con los niveles en el eje, cada par es una serie',
    ejeN.length === 2 && casi(ejeN[0]['LM-Piano'], 0.8) && casi(ejeN[1]['LM-Piano'], 0.4),
    JSON.stringify(ejeN));
  comprobar('y lo que falta no se rellena con cero',
    porNiveles(corrs, pares, ['3EEM'])[0]['LM-Piano'] === undefined);
}

seccion('6. El filtro por etapa');
{
  const mixto = [c('1EEM', 'LM', 'Piano', 0.8), c('1EPM', 'Armonía', 'Piano', 0.6)];
  comprobar('en modo de una etapa solo salen sus pares',
    paresDe(mixto, 'EPM').length === 1 && paresDe(mixto, 'EPM')[0].asig1 === 'Armonía');
  comprobar('y en TODOS, los dos', paresDe(mixto, 'TODOS').length === 2);
}

terminar('las correlaciones, sin que un trimestre pise a otro.');
