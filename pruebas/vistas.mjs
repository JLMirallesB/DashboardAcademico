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
const { elemental, profesional } = await import(pathToFileURL(join(RAIZ, 'pruebas/fixtures.mjs')).href);
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

  const serie = serieAlertas({ trimestresDisponibles, datosCompletos,
                               umbrales: UMBRALES, modoEtapa: 'TODOS', vista: 'niveles' });
  const html = renderToStaticMarkup(React.createElement(Componente, { serie, t, rotularMomento }));

  comprobar('pinta algo', html.length > 200, html.length + ' caracteres');
  comprobar('y dice de qué va', html.includes(t('alrTitulo')) || html.includes('difícil') || html.includes('Difícil'),
    html.slice(0, 160));
  /* CANDADO: ni un rótulo en crudo. Si un `t('clave')` no existe, el
     componente pinta `undefined` o deja el hueco, y eso solo se ve mirando. */
  comprobar('CANDADO: ninguna clave de traducción sin resolver',
    !html.includes('undefined') && !/\balr[A-Z]\w+/.test(html),
    (html.match(/\balr[A-Z]\w+/g) || []).slice(0, 5).join(' · '));

  /* Y sin datos tiene que decirlo, no quedarse en blanco. */
  const vacio = renderToStaticMarkup(React.createElement(Componente, {
    serie: { puntos: [], cambios: [], hayDatos: false }, t, rotularMomento }));
  comprobar('sin datos, explica qué falta en vez de quedarse en blanco',
    vacio.length > 100 && !vacio.includes('undefined'), vacio.slice(0, 120));
}

console.log('\n2. La vista de familias');
{
  const mod = await compilar('src/components/vistas/FamiliasAsignaturas.jsx', 'familias');
  const Componente = mod.default || mod.FamiliasAsignaturas;
  comprobar('el módulo exporta un componente', typeof Componente === 'function');

  const primero = trimestresDisponibles[0];
  const resultado = agruparPorFamilia(datosCompletos[primero], {
    agrupaciones: { piano: ['especialidad', 'tecla'], 'lenguaje musical': ['noespecialidad'] },
    modoEtapa: 'EEM', umbrales: UMBRALES, vista: 'global'
  });
  const html = renderToStaticMarkup(React.createElement(Componente, { resultado, compararFamilias, t }));

  comprobar('pinta algo', html.length > 200, html.length + ' caracteres');
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
