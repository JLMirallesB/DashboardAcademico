/**
 * Dashboard Académico - Servicio de Importación/Exportación
 * Funciones para exportar e importar datos en formato JSON
 */

/**
 * Exporta los datos del dashboard a un archivo JSON
 * @param {Object} params - Parámetros de exportación
 * @param {Array} params.trimestresDisponibles - Lista de trimestres disponibles
 * @param {Object} params.metadata - Metadata de los trimestres
 * @param {Object} params.umbrales - Umbrales configurados
 * @param {Object} params.datosCompletos - Datos completos del dashboard
 * @param {Object} params.correlacionesCompletas - Correlaciones completas
 * @param {Object} params.agrupacionesCompletas - Agrupaciones de asignaturas por trimestre
 */
import { parseTrimestre, claveTrimestre, normalizarCurso } from '../nucleo/texto.js';

export const exportarJSON = ({
  trimestresDisponibles,
  metadata,
  umbrales,
  datosCompletos,
  correlacionesCompletas,
  agrupacionesCompletas
}) => {
  const exportData = {
    metadata: {
      /* La versión del FORMATO, no la de la app. Sin ella, distinguir un
         fichero viejo de uno nuevo obliga a contar guiones en las claves, que
         es justo el criterio frágil que el cambio de clave vino a quitar. Los
         ficheros exportados antes del 23/08/2026 no la llevan, así que su
         ausencia significa «versión 1» de forma explícita. */
      version: 2,
      exportadoEl: new Date().toISOString(),
      trimestres: trimestresDisponibles,
      metadataPorTrimestre: metadata
    },
    umbrales,
    datos: datosCompletos,
    correlaciones: correlacionesCompletas,
    agrupaciones: agrupacionesCompletas
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dashboard_academico_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Procesa el contenido importado de un archivo JSON
 * @param {string} jsonContent - Contenido del archivo JSON
 * @returns {Object} Objeto con los datos importados
 * @throws {Error} Si el JSON no puede ser parseado
 */
/* Un JSON exportado antes del 23/08/2026 trae las claves de dos partes
   —«1EV-EEM»— en SEIS sitios a la vez: la lista de trimestres y los nombres de
   propiedad de datos, correlaciones, agrupaciones y metadata, más la selección
   inicial. Cargarlo tal cual mete claves de dos partes en un estado que ya
   asume tres, y entonces conviven dos formatos sin que nada lo diga.

   La buena noticia es que la clave nueva se puede reconstruir sin preguntar
   nada: el curso académico está en `metadataPorTrimestre[clave].CursoAcademico`,
   que es de donde salía la clave nueva al leer el CSV. Lo que no lo tenga se
   queda con su clave de dos partes, que sigue siendo válida — lo que no se
   sabe, no se inventa. */
const migrarClaves = (importado) => {
  const meta = (importado.metadata && importado.metadata.metadataPorTrimestre) || {};
  const mapa = {};
  Object.keys(importado.datos || {}).forEach((vieja) => {
    const p = parseTrimestre(vieja);
    /* Solo se toca lo que es del formato antiguo: dos partes y sin curso. */
    if (!p || p.curso) { mapa[vieja] = vieja; return; }
    const curso = normalizarCurso((meta[vieja] || {}).CursoAcademico || '');
    mapa[vieja] = curso ? claveTrimestre(p.base, curso, p.etapa) : vieja;
  });
  return mapa;
};

const reindexar = (obj, mapa) => {
  if (!obj) return obj;
  const out = {};
  Object.keys(obj).forEach((k) => { out[mapa[k] || k] = obj[k]; });
  return out;
};

export const procesarImportacionJSON = (jsonContent) => {
  const importado = JSON.parse(jsonContent);

  const version = (importado.metadata && importado.metadata.version) || 1;
  const mapa = version < 2 ? migrarClaves(importado) : null;
  if (mapa) {
    importado.datos = reindexar(importado.datos, mapa);
    importado.correlaciones = reindexar(importado.correlaciones, mapa);
    importado.agrupaciones = reindexar(importado.agrupaciones, mapa);
    if (importado.metadata) {
      importado.metadata.metadataPorTrimestre = reindexar(importado.metadata.metadataPorTrimestre, mapa);
      if (Array.isArray(importado.metadata.trimestres)) {
        importado.metadata.trimestres = importado.metadata.trimestres.map((t) => mapa[t] || t);
      }
    }
  }

  const resultado = {
    datosCompletos: importado.datos || null,
    correlacionesCompletas: importado.correlaciones || null,
    agrupacionesCompletas: importado.agrupaciones || {},
    umbrales: importado.umbrales || null,
    metadata: importado.metadata?.metadataPorTrimestre || {},
    trimestresDisponibles: importado.metadata?.trimestres || Object.keys(importado.datos || {}),
    seleccionInicial: null
  };

  // Crear selección inicial si hay trimestres disponibles
  if (resultado.trimestresDisponibles.length > 0 && resultado.datosCompletos) {
    const primerTrim = resultado.trimestresDisponibles[0];
    const niveles = Object.keys(resultado.datosCompletos[primerTrim] || {});
    if (niveles.includes('GLOBAL')) {
      resultado.seleccionInicial = {
        id: 0,
        trimestre: primerTrim,
        nivel: 'GLOBAL',
        asignatura: 'Total'
      };
    }
  }

  return resultado;
};
