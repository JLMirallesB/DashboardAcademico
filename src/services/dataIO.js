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
 */
export const exportarJSON = ({
  trimestresDisponibles,
  metadata,
  umbrales,
  datosCompletos,
  correlacionesCompletas
}) => {
  const exportData = {
    metadata: {
      exportadoEl: new Date().toISOString(),
      trimestres: trimestresDisponibles,
      metadataPorTrimestre: metadata
    },
    umbrales,
    datos: datosCompletos,
    correlaciones: correlacionesCompletas
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
export const procesarImportacionJSON = (jsonContent) => {
  const importado = JSON.parse(jsonContent);

  const resultado = {
    datosCompletos: importado.datos || null,
    correlacionesCompletas: importado.correlaciones || null,
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
        asignatura: 'Todos'
      };
    }
  }

  return resultado;
};
