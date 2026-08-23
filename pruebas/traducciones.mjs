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

seccion('4. Ningún rótulo del informe con un carácter que la fuente no sabe pintar');
{
  /* El PDF usa las fuentes estándar de jsPDF, que van con WinAnsiEncoding: un
     repertorio de un byte. Un carácter de fuera —la σ de «desviación», una
     flecha, un ≥— no da error ni al generar ni al abrir: jsPDF mete dos bytes
     donde cabe uno y en el papel sale «Ã» o un hueco. Es invisible desde el
     código y desde las pruebas de contenido; solo se ve mirando el PDF.
     Pasó de verdad: `standardDeviationShort` era 'σ' y era la cabecera de una
     columna de la tabla de asignaturas.

     La pantalla no tiene este problema —el navegador pinta lo que sea— así
     que la comprobación se limita a los rótulos que USA EL INFORME. */
  const pdf = readFileSync(join(RAIZ, 'src/services/pdfGenerator.js'), 'utf8');

  /* WinAnsi es latin-1 más el bloque 0x80-0x9F, donde viven el guion largo,
     las comillas tipográficas y el resto de lo que de verdad aparece. */
  const BLOQUE_ALTO = '€‚ƒ„…†‡ˆ‰Š‹Œ Ž  ‘’“”•–—˜™š›œ žŸ';
  const pintable = (c) => {
    const p = c.codePointAt(0);
    return (p >= 32 && p <= 126) || (p >= 160 && p <= 255) || BLOQUE_ALTO.includes(c);
  };
  const fueraDe = (texto) => [...new Set([...texto].filter((c) => !pintable(c)))].join('');

  /* Las claves que el generador pide por `t('...')`. */
  const usadas = new Set([...pdf.matchAll(/\bt\('([A-Za-z0-9_]+)'\)/g)].map((m) => m[1]));

  const rotos = [];
  Object.entries(translations).forEach(([idioma, tabla]) => {
    Object.entries(tabla).forEach(([clave, valor]) => {
      if (!usadas.has(clave) || typeof valor !== 'string') return;
      const malos = fueraDe(valor);
      if (malos) rotos.push(`${idioma}.${clave} [${malos}]`);
    });
  });

  comprobar('CANDADO: ningún rótulo que el informe imprime se sale de WinAnsi',
    rotos.length === 0, rotos.join(' · '));

  /* Y los literales de respaldo escritos dentro del propio generador
     —`t('x') || 'Teórica Troncal'`—, que no pasan por la tabla de idiomas y
     por eso se escapan de la comprobación de arriba. */
  const literales = [...pdf.matchAll(/\|\|\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
  const literalesRotos = literales.map((l) => [l, fueraDe(l)]).filter(([, m]) => m);
  comprobar('ni los literales de respaldo del generador',
    literalesRotos.length === 0,
    literalesRotos.map(([l, m]) => `«${l.slice(0, 30)}» [${m}]`).join(' · '));

  comprobar('y se están mirando rótulos de verdad, no una lista vacía',
    usadas.size > 25 && literales.length > 20,
    `${usadas.size} claves y ${literales.length} literales`);
}

terminar('las dos tablas de idioma y las claves que usa el código.');
