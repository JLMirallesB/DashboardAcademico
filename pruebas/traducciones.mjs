/* Que los dos idiomas digan lo mismo — pruebas/traducciones.mjs
 *
 *   node pruebas/traducciones.mjs
 *
 * La app es bilingüe y `t()` es un acceso directo a un objeto: `t(clave)` de
 * una clave que no existe devuelve `undefined`. Los componentes lo tapan con
 * un respaldo en castellano —`t('x') || 'Texto'`—, que está bien para no
 * dejar huecos en blanco, pero convierte una clave que falta en un fallo
 * INVISIBLE: la pantalla se ve perfecta en castellano, y en valenciano
 * también, porque sale en castellano.
 *
 * Esto es lo que lo caza:
 *
 *  · que las dos tablas tengan exactamente las mismas claves;
 *  · que ninguna esté repetida (una clave repetida no da error y hace que un
 *    rótulo enseñe el texto de otro — así se descubrió que «Motivo» decía
 *    «Análisis Detallado»);
 *  · y que toda clave que el código usa exista de verdad.
 *
 * Lo que NO alcanza: las llamadas con clave construida (`t('trend' + tipo)`).
 * Se cuentan y se dicen, para no aparentar una cobertura que no hay.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { translations } from '../src/translations.js';
import { comprobar, seccion, terminar } from './ayuda.mjs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

function archivos(dir, acc = []) {
  readdirSync(dir).forEach((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) archivos(ruta, acc);
    else if (/\.(js|jsx)$/.test(n) && !ruta.endsWith('translations.js')) acc.push(ruta);
  });
  return acc;
}

seccion('1. Las dos tablas, en paralelo');
{
  const es = Object.keys(translations.es);
  const va = Object.keys(translations.va);
  const faltanEnVa = es.filter((k) => !(k in translations.va));
  const faltanEnEs = va.filter((k) => !(k in translations.es));

  /* CANDADO. Sin esto, `t()` devuelve undefined y el respaldo en castellano
     hace que media interfaz «en valencià» salga en castellano sin que nadie se
     entere. Es el mismo candado que el jardín tiene desde agosto. */
  comprobar('CANDADO: ninguna clave falta en valenciano',
    faltanEnVa.length === 0, faltanEnVa.slice(0, 8).join(' · '));
  comprobar('CANDADO: ni sobra ninguna',
    faltanEnEs.length === 0, faltanEnEs.slice(0, 8).join(' · '));
  comprobar('y hay bastantes, no una tabla a medias', es.length > 300, es.length + ' claves');
}

seccion('2. Ninguna clave repetida');
{
  /* Una clave repetida en un objeto literal no da error: la segunda pisa a la
     primera en silencio. Cuando las dos dicen cosas distintas, un rótulo
     enseña el texto de otro. Ya pasó con tres. */
  const texto = readFileSync(join(RAIZ, 'src/translations.js'), 'utf8');
  const repetidas = {};
  ['es', 'va'].forEach((idioma) => {
    const ini = texto.indexOf(idioma + ': {');
    const fin = idioma === 'es' ? texto.indexOf('va: {') : texto.length;
    const vistas = new Set();
    const trozo = texto.slice(ini, fin);
    (trozo.match(/^\s{4}([A-Za-z_][\w]*):/gm) || []).forEach((m) => {
      const k = m.trim().replace(':', '');
      if (vistas.has(k)) (repetidas[idioma] = repetidas[idioma] || []).push(k);
      vistas.add(k);
    });
  });
  comprobar('CANDADO: no hay claves duplicadas en castellano',
    !repetidas.es, (repetidas.es || []).join(' · '));
  comprobar('CANDADO: ni en valenciano',
    !repetidas.va, (repetidas.va || []).join(' · '));
}

seccion('3. Toda clave que el código usa, existe');
{
  const usadas = new Set();
  let construidas = 0;
  archivos(join(RAIZ, 'src')).forEach((ruta) => {
    const texto = readFileSync(ruta, 'utf8');
    (texto.match(/\bt\(\s*'([^']+)'\s*\)/g) || []).forEach((m) => {
      usadas.add(m.replace(/\bt\(\s*'/, '').replace(/'\s*\)/, ''));
    });
    construidas += (texto.match(/\bt\(\s*[`'"][^`'"]*[`'"]\s*\+/g) || []).length;
    construidas += (texto.match(/\bt\(\s*[A-Za-z_$][\w$.[\]]*\s*\)/g) || []).length;
  });

  const inexistentes = [...usadas].filter((k) => !(k in translations.es));
  /* `t()` nunca falla: devuelve undefined, y con el respaldo en castellano
     una errata en el nombre de la clave solo se ve al abrir esa pantalla en
     valenciano. Aquí se ve siempre. */
  comprobar('CANDADO: ninguna clave usada en el código falta en la tabla',
    inexistentes.length === 0, inexistentes.slice(0, 10).join(' · '));
  comprobar('y se están mirando unas cuantas', usadas.size > 150, usadas.size + ' claves usadas');

  console.log('      (' + construidas + ' llamadas con clave construida, fuera del alcance de esto)');
}

terminar('las dos tablas de idioma y las claves que usa el código.');
