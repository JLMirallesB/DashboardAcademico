/* Clasificación por umbrales y patrones de tendencia — pruebas/estadistica.mjs
 *
 *   node pruebas/estadistica.mjs
 *
 * `calcularTendencia` es lo más delicado del proyecto: regresión lineal y
 * cuadrática, puntos de inflexión y doce patrones. Se movió VERBATIM al núcleo
 * precisamente para no cambiarlo sin querer, y esto es lo que vigila que siga
 * dando lo mismo.
 */
import { calcularResultado, calcularTendencia, detectarEtapa,
         TENDENCIAS, claveDeTendencia } from '../src/nucleo/estadistica.js';
import { comprobar, seccion, terminar, UMBRALES } from './ayuda.mjs';

const st = (o) => Object.assign({ notaMedia: 7, aprobados: 80, suspendidos: 20 }, o);

seccion('1. Difícil, fácil o ninguna de las dos');
{
  comprobar('muchos suspensos es difícil',
    calcularResultado(st({ suspendidos: 35 }), UMBRALES) === 'DIFÍCIL');
  comprobar('media por debajo de la crítica también',
    calcularResultado(st({ notaMedia: 5.5 }), UMBRALES) === 'DIFÍCIL');
  comprobar('casi todos aprobados es fácil',
    calcularResultado(st({ aprobados: 95 }), UMBRALES) === 'FÁCIL');
  comprobar('media alta también', calcularResultado(st({ notaMedia: 8.5 }), UMBRALES) === 'FÁCIL');
  comprobar('en medio, ninguna de las dos', calcularResultado(st({}), UMBRALES) === null);

  /* Difícil gana a fácil: una asignatura con media alta y a la vez muchos
     suspensos es de las que hay que mirar, no de las que van bien. */
  comprobar('CANDADO: difícil pesa más que fácil',
    calcularResultado(st({ notaMedia: 8.5, suspendidos: 35 }), UMBRALES) === 'DIFÍCIL');
  comprobar('sin stats o sin umbrales no inventa nada',
    calcularResultado(null, UMBRALES) === null && calcularResultado(st({}), null) === null);
}

seccion('2. Los patrones de tendencia');
{
  comprobar('con menos de dos puntos no se pronuncia',
    calcularTendencia([7]).tipo === 'insuficiente' &&
    calcularTendencia([]).tipo === 'insuficiente');
  comprobar('los nulos no cuentan como puntos',
    calcularTendencia([7, null, undefined]).tipo === 'insuficiente');
  comprobar('una recta hacia arriba es creciente sostenido',
    calcularTendencia([6, 6.5, 7, 7.5]).tipo === 'creciente_sostenido');
  comprobar('una recta hacia abajo, decreciente sostenido',
    calcularTendencia([8, 7.5, 7, 6.5]).tipo === 'decreciente_sostenido');
  comprobar('lo plano es estable', calcularTendencia([7, 7.02, 6.99, 7.01]).tipo === 'estable');

  const valle = calcularTendencia([7.5, 7.0, 6.9, 7.4]);
  comprobar('bajar y recuperar es un valle', valle.tipo === 'valle', valle.tipo);
  const pico = calcularTendencia([6.5, 7.0, 7.1, 6.6]);
  comprobar('subir y caer es un pico', pico.tipo === 'pico', pico.tipo);

  /* COMPORTAMIENTO ACTUAL, anotado para que un cambio se vea: si el vaivén es
     grande, la comprobación de irregularidad se dispara ANTES que la de valle
     y el patrón sale «irregular» aunque la forma de U sea evidente. Se deja
     como está —no está en la lista de fallos a arreglar— pero si algún día
     alguien toca las prioridades, esta línea se pondrá roja y sabrá por qué. */
  comprobar('un valle muy pronunciado se clasifica hoy como irregular',
    calcularTendencia([8, 6.5, 6.4, 8.2]).tipo === 'irregular',
    calcularTendencia([8, 6.5, 6.4, 8.2]).tipo);

  /* La confianza depende del número de puntos, no de lo bien que ajuste: con
     tres evaluaciones no se puede afirmar una tendencia de curso. */
  comprobar('con menos de cuatro puntos la confianza es baja',
    calcularTendencia([6, 7, 8]).confianza === 'baja' &&
    calcularTendencia([6, 7, 8, 9]).confianza === 'alta');
  comprobar('y una recta perfecta tiene R² de uno',
    Math.abs(calcularTendencia([1, 2, 3, 4]).r2 - 1) < 1e-9);
}

seccion('3. Los rótulos salen del patrón, no de una segunda lista');
{
  comprobar('cada patrón tiene icono, color y prioridad',
    Object.values(TENDENCIAS).every((v) => v.icono && v.color && typeof v.prioridad === 'number'));
  comprobar('la clave de traducción se deriva del nombre',
    claveDeTendencia('creciente_acelerado') === 'trendCrecienteAcelerado' &&
    claveDeTendencia('valle') === 'trendValle');
  /* Todo patrón que devuelva `calcularTendencia` tiene que estar en el mapa, o
     la pantalla se queda sin etiqueta y no falla: enseña un hueco. */
  const patronesPosibles = ['insuficiente', 'estable', 'creciente_sostenido',
    'decreciente_sostenido', 'creciente_acelerado', 'creciente_desacelerado',
    'decreciente_acelerado', 'decreciente_desacelerado', 'valle', 'pico',
    'oscilante', 'irregular'];
  comprobar('CANDADO: no hay patrón sin rótulo',
    patronesPosibles.every((p) => !!TENDENCIAS[p]),
    patronesPosibles.filter((p) => !TENDENCIAS[p]).join());
}

seccion('4. La etapa de un nivel');
{
  comprobar('se lee del nombre', detectarEtapa('3EPM') === 'EPM' && detectarEtapa('1EEM') === 'EEM');
  comprobar('GLOBAL no es de ninguna etapa', detectarEtapa('GLOBAL') === null);
  comprobar('y lo que no se reconoce tampoco', detectarEtapa('OTRO') === null);
}

terminar('umbrales, tendencias y etapas.');
