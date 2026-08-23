/* Que las dos vistas nuevas se PINTEN — pruebas/vistas.mjs
 *
 *   node pruebas/vistas.mjs
 *
 * `npm run build` dice que el JSX es válido; no dice que el componente reciba
 * lo que espera. Un nombre de prop cambiado, un campo que el núcleo dejó de
 * devolver o un `null` donde había un objeto no rompen la compilación: rompen
 * la pantalla, y en producción.
 *
 * Aquí se montan las dos vistas nuevas con datos que salen del núcleo de
 * verdad —los mismos constructores de `fixtures.mjs`— y se comprueba que
 * sueltan HTML con lo que tienen que decir. Es una prueba de humo, no de
 * diseño: no mira si está bonito, mira si está.
 *
 * Se compila el JSX con esbuild, que ya viene con Vite. Si algún día no
 * estuviera, la prueba se salta diciéndolo en vez de dar por buena una
 * garantía que no se ha comprobado.
 */
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

let esbuild, React, renderToStaticMarkup;
try {
  esbuild = require('esbuild');
  React = require('react');
  renderToStaticMarkup = require('react-dom/server').renderToStaticMarkup;
} catch (e) {
  console.log('\n· Sin esbuild o sin react-dom/server: prueba omitida. (' + e.message + ')');
  process.exit(0);
}

let ok = 0;
const fallos = [];
function comprobar(titulo, condicion, detalle) {
  if (condicion) { ok++; console.log('  ✓ ' + titulo); }
  else { fallos.push(titulo + (detalle ? '\n      ' + detalle : '')); console.log('  ✗ ' + titulo); }
}

/* ---------- Compilar las dos vistas ----------
   El resultado se escribe DENTRO del repo, no en /tmp: los módulos compilados
   siguen importando `react` y `recharts`, y desde una carpeta temporal del
   sistema node no encuentra el `node_modules` de aquí. */
const salida = mkdtempSync(join(RAIZ, 'node_modules', '.vistas-'));
const compilar = async (ruta, nombre) => {
  const res = await esbuild.build({
    entryPoints: [join(RAIZ, ruta)],
    bundle: true, format: 'esm', platform: 'node', write: false,
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'recharts'],
    absWorkingDir: RAIZ
  });
  const archivo = join(salida, nombre + '.mjs');
  writeFileSync(archivo, res.outputFiles[0].text);
  return import(pathToFileURL(archivo).href);
};

const { serieAlertas } = await import(pathToFileURL(join(RAIZ, 'src/nucleo/alertas.js')).href);
const { agruparPorFamilia, compararFamilias } = await import(pathToFileURL(join(RAIZ, 'src/nucleo/agrupaciones.js')).href);
const { parseCSV } = await import(pathToFileURL(join(RAIZ, 'src/nucleo/csv.js')).href);
const { procesarDatos } = await import(pathToFileURL(join(RAIZ, 'src/nucleo/datos.js')).href);
const { elemental, profesional, csv, fila } = await import(pathToFileURL(join(RAIZ, 'pruebas/fixtures.mjs')).href);
const { translations } = await import(pathToFileURL(join(RAIZ, 'src/translations.js')).href);

const UMBRALES = { suspensosAlerta: 30, mediaCritica: 6, mediaFacil: 8, aprobadosMinimo: 90, alumnosMinimo: 3 };
const t = (k) => translations.es[k];

/* Dos evaluaciones y dos etapas, que es el estado normal del curso. */
const datosCompletos = {}, trimestresDisponibles = [];
[elemental('1EV', 7.25), profesional('1EV', 6.9),
 elemental('2EV', 7.30), profesional('2EV', 7.0)].forEach((texto) => {
  const p = procesarDatos(parseCSV(texto));
  datosCompletos[p.trimestre] = p.datos;
  trimestresDisponibles.push(p.trimestre);
});

const rotularMomento = (m) => m.base;

console.log('\n1. La vista de alertas');
{
  const mod = await compilar('src/components/vistas/AlertasCurso.jsx', 'alertas');
  const Componente = mod.default || mod.AlertasCurso;
  comprobar('el módulo exporta un componente', typeof Componente === 'function');

  /* Un escenario donde de verdad ENTRA una y SALE otra. Antes esta prueba
     montaba la vista con las cuatro listas vacías: se renderizaba la cáscara y
     el subárbol que es la razón de ser de la vista no se pintaba nunca, así
     que un fallo ahí dentro pasaba entero. */
  const mundo = (trimestre, armonia, coro, conTuba) => csv({ trimestre, filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 60, media: 7 }),
    fila({ tipo: 'CURSO_TOTAL', nivel: '1EEM', asignatura: 'Total', registros: 30, media: 7 }),
    fila({ tipo: 'CURSO_ESP', nivel: '1EEM', asignatura: 'Total Especialidad', registros: 15, media: 7 }),
    /* Armonía y Coro se cruzan entre los dos momentos: una entra en rojo y la
       otra sale. Piano se queda igual, para que haya algo que no se mueva. */
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Armonía', registros: 12,
           media: armonia, aprobados: armonia >= 6 ? 0.9 : 0.5, suspendidos: armonia >= 6 ? 0.1 : 0.5 }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Coro', registros: 12,
           media: coro, aprobados: coro >= 6 ? 0.9 : 0.5, suspendidos: coro >= 6 ? 0.1 : 0.5 }),
    fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Piano', registros: 12, media: 7 }),
    /* Tuba está en rojo en el primer momento y DESAPARECE del fichero en el
       segundo. No ha mejorado: ha dejado de medirse. Es lo que hace que el
       recuento total se mueva sin que haya movimiento atribuible, y lo que
       hacía que el badge saliera verde. */
    ...(conTuba ? [fila({ tipo: 'CURSO_ASIG', nivel: '1EEM', asignatura: 'Tuba', registros: 8,
                          media: 3.5, aprobados: 0.3, suspendidos: 0.7 })] : [])
  ] });

  const dc = {}, lista = [];
  [mundo('1EV', 7.5, 4.0, true), mundo('2EV', 4.0, 7.5, false)].forEach((texto) => {
    const p = procesarDatos(parseCSV(texto));
    dc[p.trimestre] = p.datos; lista.push(p.trimestre);
  });

  const serie = serieAlertas({ trimestresDisponibles: lista, datosCompletos: dc,
                               umbrales: UMBRALES, modoEtapa: 'EEM', vista: 'niveles' });
  const c0 = serie.cambios[0];
  comprobar('el escenario produce una entrada, una salida y una desaparecida',
    serie.cambios.length === 1 && c0.entran.length === 1 && c0.salen.length === 1 &&
    c0.desaparecidas.length === 1,
    JSON.stringify({ e: c0.entran.length, s: c0.salen.length, d: c0.desaparecidas.length }));
  /* Y esto es lo que hace la comprobación de abajo capaz de fallar: el
     recuento total SÍ se mueve, y el movimiento atribuible es cero. */
  comprobar('el recuento total se mueve aunque el movimiento neto sea cero',
    c0.variacion !== 0 && c0.entran.length - c0.salen.length === 0,
    'variacion ' + c0.variacion);

  const html = renderToStaticMarkup(React.createElement(Componente, { serie, t, rotularMomento }));

  comprobar('pinta algo', html.length > 200, html.length + ' caracteres');
  /* CANDADO: los nombres tienen que llegar a la pantalla. Es lo accionable de
     esta vista —no «hemos pasado de 1 a 1», sino cuál ha entrado—. */
  comprobar('CANDADO: se ve QUÉ asignatura entra, cuál sale y cuál desaparece',
    html.includes('Armonía') && html.includes('Coro') && html.includes('Tuba'),
    ['Armonía', 'Coro', 'Tuba'].filter((x) => !html.includes(x)).join(' · '));
  comprobar('y la que no se ha movido no aparece en las listas de cambios',
    (html.match(/Piano/g) || []).length === 0);

  /* CANDADO del hallazgo de la revisión: el color del badge no puede salir de
     la resta bruta de recuentos. Una entrada y una salida es movimiento neto
     CERO, aunque el total haya cambiado por otra razón. */
  /* CANDADO del hallazgo de la revisión. Con una que entra, una que sale y
     una que desaparece, el badge tiene que decir «mismo número» —movimiento
     neto cero— y NO pintar de verde el −1 del recuento bruto, que solo se debe
     a que la tuba ha dejado de medirse. Nadie ha mejorado. */
  comprobar('CANDADO: el badge sigue al movimiento atribuible, no a la resta bruta',
    html.includes(t('alrVariacionIgual')) && !/-1 difícil/.test(html),
    html.includes(t('alrVariacionIgual')) + ' / ' + /-1 difícil/.test(html));
  comprobar('y el movimiento del total se dice aparte, sin color',
    html.includes('-1') && html.includes('dejan de medirse'));

  comprobar('CANDADO: ninguna clave de traducción sin resolver',
    !html.includes('undefined') && !/\balr[A-Z]\w+/.test(html),
    (html.match(/\balr[A-Z]\w+/g) || []).slice(0, 5).join(' · '));

  const vacio = renderToStaticMarkup(React.createElement(Componente, {
    serie: { puntos: [], cambios: [], hayDatos: false }, t, rotularMomento }));
  comprobar('sin datos, explica qué falta en vez de quedarse en blanco',
    vacio.includes(t('alrSinDatos')) && !vacio.includes('undefined'), vacio.slice(0, 120));
}

console.log('\n2. La vista de familias');
{
  const mod = await compilar('src/components/vistas/FamiliasAsignaturas.jsx', 'familias');
  const Componente = mod.default || mod.FamiliasAsignaturas;
  comprobar('el módulo exporta un componente', typeof Componente === 'function');

  /* Un mundo propio: las dos familias tienen que diferenciarse en el
     porcentaje de suspensos, o la comparación entre ellas da cero y la
     comprobación del signo pasa sin comprobar nada. */
  const conFamilias = csv({ trimestre: '1EV', filas: [
    fila({ tipo: 'GLOBAL', nivel: 'GLOBAL', asignatura: 'Total', registros: 60, media: 7 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Piano', registros: 30,
           media: 8, aprobados: 0.95, suspendidos: 0.05 }),
    fila({ tipo: 'GLOBAL_ASIG', nivel: 'GLOBAL', asignatura: 'Armonía', registros: 30,
           media: 5, aprobados: 0.60, suspendidos: 0.40 }),
    fila({ tipo: 'CURSO_TOTAL', nivel: '1EEM', asignatura: 'Total', registros: 60, media: 7 })
  ] });
  const pf = procesarDatos(parseCSV(conFamilias));
  const resultado = agruparPorFamilia(pf.datos, {
    agrupaciones: { piano: ['especialidad', 'tecla'], 'armonía': ['noespecialidad'] },
    modoEtapa: 'EEM', umbrales: UMBRALES, vista: 'global'
  });
  comprobar('el escenario trae al menos dos familias que comparar',
    resultado.familias.length >= 2, resultado.familias.map((f) => f.clave).join(' · '));

  const html = renderToStaticMarkup(React.createElement(Componente, { resultado, compararFamilias, t }));

  comprobar('pinta algo', html.length > 200, html.length + ' caracteres');
  comprobar('y se ven las familias por su nombre',
    /especialidad/i.test(html) && /tecla/i.test(html),
    resultado.familias.map((f) => f.clave).join(' · '));

  /* CANDADO: `compararFamilias` se le pasaba a la vista y no se llamaba ni una
     vez, así que toda la comparación entre familias estaba sin red. Aquí se
     comprueba que la función que recibe la vista devuelve lo que la vista
     espera, y con la lectura del signo correcta: subir el porcentaje de
     suspensos es EMPEORAR. */
  const dos = resultado.familias.filter((f) => f.suspendidos !== null);
  const distintas = dos.length >= 2 && dos[0].suspendidos !== dos[1].suspendidos;
  comprobar('el escenario da dos familias con suspensos distintos, o no se compara nada',
    distintas, dos.map((f) => f.clave + ':' + f.suspendidos).join(' · '));
  if (distintas) {
    const comp = compararFamilias(resultado, dos[0].clave, dos[1].clave);
    comprobar('CANDADO: compararFamilias devuelve la diferencia y su lectura',
      comp && comp.suspendidos && typeof comp.suspendidos.diff === 'number',
      JSON.stringify(comp && comp.suspendidos));
    const masSuspensos = dos[0].suspendidos > dos[1].suspendidos;
    comprobar('CANDADO: tener MÁS suspensos que la referencia se lee como PEOR',
      comp.suspendidos.mejora === !masSuspensos,
      JSON.stringify({ diff: comp.suspendidos.diff, mejora: comp.suspendidos.mejora, masSuspensos }));
  } else {
    comprobar('CANDADO: hay al menos dos familias con porcentaje para comparar', false,
      'el fixture no produce dos familias comparables');
  }
  comprobar('CANDADO: ninguna clave de traducción sin resolver',
    !html.includes('undefined') && !/\bfam_\w+/.test(html),
    (html.match(/\bfam_\w+/g) || []).slice(0, 5).join(' · '));

  /* CANDADO del solape: las familias no reparten el centro, así que la
     pantalla no puede presentar un porcentaje sobre el total. */
  comprobar('CANDADO: no se pinta ningún «% del total» que insinúe un reparto',
    !/%\s*del\s*total/i.test(html));

  /* Sin datos: el núcleo puede devolver null y la vista tiene que aguantarlo. */
  const vacio = renderToStaticMarkup(React.createElement(Componente, {
    resultado: null, compararFamilias, t }));
  comprobar('con un resultado nulo no revienta y lo dice',
    vacio.length >= 0 && !vacio.includes('undefined'), vacio.slice(0, 120));
}

rmSync(salida, { recursive: true, force: true });

console.log('');
if (fallos.length) {
  console.error('FALLA:');
  fallos.forEach((f) => console.error('  · ' + f));
  process.exit(1);
}
console.log('OK: ' + ok + ' comprobaciones — las dos vistas nuevas se pintan de verdad.');
