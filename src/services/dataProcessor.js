/**
 * Dashboard Académico - Servicio de Procesamiento de Datos
 * Transforma datos parseados a la estructura interna del dashboard
 */

import { normalizar } from '../utils.js';

/**
 * Procesa datos parseados del CSV y los estructura para el dashboard
 * @param {Object} parsed - Datos parseados del CSV (metadata, estadisticas, correlaciones, agrupaciones)
 * @returns {Object|null} Objeto procesado con trimestre, metadata, datos, correlaciones y agrupaciones
 */
export const procesarDatos = (parsed) => {
  const trimestreBase = parsed.metadata.Trimestre;
  if (!trimestreBase) {
    // Throw error to be caught and translated by the component
    throw new Error('ERROR_NO_TRIMESTER_METADATA');
  }

  // Estructurar datos
  const datosEstructurados = {};
  parsed.estadisticas.forEach(fila => {
    const nivel = fila.Nivel;
    const asignatura = fila.Asignatura;

    if (!datosEstructurados[nivel]) {
      datosEstructurados[nivel] = {};
    }

    datosEstructurados[nivel][asignatura] = {
      stats: {
        registros: fila.Registros,
        notaMedia: fila.NotaMedia,
        desviacion: fila.Desviacion,
        moda: fila.Moda,
        aprobados: fila.Aprobados,
        suspendidos: fila.Suspendidos,
        modaAprobados: fila.ModaAprobados,
        modaSuspendidos: fila.ModaSuspendidos
      },
      distribucion: {
        1: fila.Dist1 || 0,
        2: fila.Dist2 || 0,
        3: fila.Dist3 || 0,
        4: fila.Dist4 || 0,
        5: fila.Dist5 || 0,
        6: fila.Dist6 || 0,
        7: fila.Dist7 || 0,
        8: fila.Dist8 || 0,
        9: fila.Dist9 || 0,
        10: fila.Dist10 || 0
      }
    };
  });

  // Detectar etapa del dataset basándose en los niveles
  let etapaDetectada = null;
  const niveles = Object.keys(datosEstructurados).filter(n => n !== 'GLOBAL');
  if (niveles.length > 0) {
    const primerNivel = niveles[0];
    if (primerNivel.includes('EEM')) {
      etapaDetectada = 'EEM';
    } else if (primerNivel.includes('EPM')) {
      etapaDetectada = 'EPM';
    }
  }

  // Crear clave compuesta: trimestre + etapa (ej: "1T-EEM", "1T-EPM")
  const trimestreCompleto = etapaDetectada ? `${trimestreBase}-${etapaDetectada}` : trimestreBase;

  // Procesar agrupaciones: convertir array a mapa { asignatura → [grupos] }
  const agrupacionesMapa = {};
  if (parsed.agrupaciones && parsed.agrupaciones.length > 0) {
    parsed.agrupaciones.forEach(({ Asignatura, Grupos }) => {
      if (Asignatura && Grupos) {
        const asigNorm = normalizar(Asignatura);
        // Dividir grupos por ; y normalizar cada uno
        const gruposArray = Grupos.split(';')
          .map(g => normalizar(g))
          .filter(g => g); // Eliminar vacíos
        agrupacionesMapa[asigNorm] = gruposArray;
      }
    });
  }

  return {
    trimestre: trimestreCompleto,
    trimestreBase,
    etapa: etapaDetectada,
    metadata: parsed.metadata,
    datos: datosEstructurados,
    correlaciones: parsed.correlaciones,
    agrupaciones: agrupacionesMapa
  };
};
