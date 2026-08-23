/* Guardar y volver a cargar el estado — pruebas/dataio.mjs
 *
 *   node pruebas/dataio.mjs
 *
 * El JSON que exporta la app **es** su formato de fichero: la clave de cada
 * trimestre vive dentro, como nombre de propiedad, en cinco sitios a la vez.
 *
 * El 23/08/2026 esa clave cambió —le entró el curso académico— y eso deja
 * ficheros exportados antes con el formato antiguo. Cargarlos tal cual mete
 * claves de dos partes en un estado que ya asume tres, y entonces conviven dos
 * formatos sin que nada lo diga: no da error, da una pantalla a medias.
 *
 * Lo que se vigila aquí es que un fichero viejo siga cargándose y que su clave
 * se reconstruya sola —el curso académico está en su propia metadata—, y que
 * lo que no se puede reconstruir se quede como está en vez de inventarse.
 */
import { procesarImportacionJSON } from '../src/services/dataIO.js';
import { parseTrimestre } from '../src/nucleo/texto.js';
import { comprobar, seccion, terminar } from './ayuda.mjs';

const viejo = (curso) => JSON.stringify({
  metadata: {
    trimestres: ['1EV-EEM', '2EV-EEM'],
    metadataPorTrimestre: {
      '1EV-EEM': { Centro: 'CPM', CursoAcademico: curso, Trimestre: '1EV' },
      '2EV-EEM': { Centro: 'CPM', CursoAcademico: curso, Trimestre: '2EV' }
    }
  },
  umbrales: { suspensosAlerta: 30 },
  datos: {
    '1EV-EEM': { GLOBAL: { Total: { stats: { notaMedia: 6.5 } } } },
    '2EV-EEM': { GLOBAL: { Total: { stats: { notaMedia: 7.5 } } } }
  },
  correlaciones: { '1EV-EEM': [{ Nivel: '1EEM', Correlacion: 0.8 }] },
  agrupaciones: { '1EV-EEM': { piano: ['tecla'] } }
});

seccion('1. Un fichero exportado antes del cambio de clave');
{
  const r = procesarImportacionJSON(viejo('25/26'));

  /* CANDADO: la clave se reconstruye con el curso que trae su propia
     metadata. Sin esto, el fichero viejo entraría con «1EV-EEM» y al cargar
     encima un CSV del mismo curso saldrían dos entradas para lo mismo. */
  comprobar('CANDADO: las claves se migran solas, con el curso de su metadata',
    r.trimestresDisponibles.join() === '1EV-2526-EEM,2EV-2526-EEM',
    r.trimestresDisponibles.join());

  /* Y las CINCO estructuras tienen que quedar reindexadas a la vez: si una se
     queda con la clave vieja, esa parte del estado se vuelve inalcanzable sin
     dar error — la pantalla simplemente enseña un hueco. */
  /* Con encadenamiento opcional a propósito: si la migración no ocurre, esta
     comprobación tiene que ponerse ROJA, no reventar la prueba entera y dejar
     mudas a las cinco de abajo. */
  comprobar('CANDADO: los datos se reindexan',
    r.datosCompletos?.['1EV-2526-EEM']?.GLOBAL?.Total?.stats?.notaMedia === 6.5);
  comprobar('CANDADO: las correlaciones también',
    Array.isArray(r.correlacionesCompletas?.['1EV-2526-EEM']));
  comprobar('CANDADO: las agrupaciones también',
    !!r.agrupacionesCompletas?.['1EV-2526-EEM']);
  comprobar('CANDADO: y la metadata por trimestre',
    r.metadata?.['1EV-2526-EEM']?.Centro === 'CPM');
  comprobar('CANDADO: la selección inicial apunta a la clave NUEVA',
    r.seleccionInicial && r.seleccionInicial.trimestre === '1EV-2526-EEM',
    JSON.stringify(r.seleccionInicial));

  comprobar('no se pierde nada por el camino',
    Object.keys(r.datosCompletos).length === 2 && r.umbrales?.suspensosAlerta === 30);
}

seccion('2. Lo que no se puede reconstruir, no se inventa');
{
  const sinCurso = JSON.stringify({
    metadata: { trimestres: ['1EV-EEM'], metadataPorTrimestre: { '1EV-EEM': { Centro: 'CPM' } } },
    datos: { '1EV-EEM': { GLOBAL: { Total: { stats: { notaMedia: 7 } } } } }
  });
  const r = procesarImportacionJSON(sinCurso);
  /* Sin curso en la metadata no hay de dónde sacarlo. La clave de dos partes
     sigue siendo válida —eso es lo que da la compatibilidad— así que se queda
     como está, y el fichero se carga igual. */
  comprobar('CANDADO: sin curso en la metadata, la clave se queda como estaba',
    r.trimestresDisponibles.join() === '1EV-EEM' && !!r.datosCompletos?.['1EV-EEM'],
    r.trimestresDisponibles.join());
  comprobar('y se puede leer que ese fichero no sabe de qué curso es',
    parseTrimestre(r.trimestresDisponibles[0]).curso === null);
}

seccion('3. Un fichero ya nuevo no se toca');
{
  const nuevo = JSON.stringify({
    metadata: {
      version: 2,
      trimestres: ['1EV-2627-EEM'],
      metadataPorTrimestre: { '1EV-2627-EEM': { CursoAcademico: '26/27' } }
    },
    datos: { '1EV-2627-EEM': { GLOBAL: { Total: { stats: { notaMedia: 8 } } } } }
  });
  const r = procesarImportacionJSON(nuevo);
  comprobar('las claves se conservan tal cual',
    r.trimestresDisponibles.join() === '1EV-2627-EEM');
  comprobar('y los datos siguen ahí',
    r.datosCompletos?.['1EV-2627-EEM']?.GLOBAL?.Total?.stats?.notaMedia === 8);
}

seccion('4. Dos cursos en el mismo fichero exportado');
{
  /* El caso que este cambio hace posible: un JSON con el curso pasado y el
     actual dentro. Antes ni siquiera se podía llegar aquí, porque las dos
     primeras evaluaciones compartían clave y una pisaba a la otra. */
  const dos = JSON.stringify({
    metadata: {
      version: 2,
      trimestres: ['1EV-2526-EEM', '1EV-2627-EEM'],
      metadataPorTrimestre: {
        '1EV-2526-EEM': { CursoAcademico: '25/26' },
        '1EV-2627-EEM': { CursoAcademico: '26/27' }
      }
    },
    datos: {
      '1EV-2526-EEM': { GLOBAL: { Total: { stats: { notaMedia: 6.5 } } } },
      '1EV-2627-EEM': { GLOBAL: { Total: { stats: { notaMedia: 7.5 } } } }
    }
  });
  const r = procesarImportacionJSON(dos);
  comprobar('CANDADO: los dos cursos sobreviven a la ida y a la vuelta',
    Object.keys(r.datosCompletos).length === 2 &&
    r.datosCompletos?.['1EV-2526-EEM']?.GLOBAL?.Total?.stats?.notaMedia === 6.5 &&
    r.datosCompletos?.['1EV-2627-EEM']?.GLOBAL?.Total?.stats?.notaMedia === 7.5,
    Object.keys(r.datosCompletos).join(' + '));
}

terminar('el JSON de estado, y la compatibilidad con el formato anterior.');
