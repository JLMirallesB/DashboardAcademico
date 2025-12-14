/**
 * Utilidades comunes para el Dashboard Académico
 * Versión 1.6.2
 */

/**
 * Normaliza una cadena de texto para comparaciones case-insensitive
 * @param {string} str - Cadena a normalizar
 * @returns {string} Cadena en minúsculas y sin espacios al inicio/final
 */
export const normalizar = (str) => {
  if (typeof str !== 'string') return '';
  return str.toLowerCase().trim();
};

/**
 * Divide un trimestre en sus componentes (base y etapa) de forma segura
 * @param {string} trimestre - Trimestre en formato "1EV-EEM" o "2EV-EPM"
 * @returns {{base: string, etapa: string} | null} Objeto con base y etapa, o null si formato inválido
 */
export const parseTrimestre = (trimestre) => {
  if (typeof trimestre !== 'string' || !trimestre.includes('-')) {
    return null;
  }
  const partes = trimestre.split('-');
  if (partes.length !== 2) {
    return null;
  }
  return {
    base: partes[0],  // "1EV", "2EV", "3EV", "FINAL"
    etapa: partes[1]  // "EEM" o "EPM"
  };
};

/**
 * Obtiene el mejor trimestre para un nivel específico en modo TODOS
 * Busca el trimestre que coincida con la evaluación base y la etapa del nivel
 * @param {string} trimestreSeleccionado - Trimestre actualmente seleccionado (ej: "1EV-EEM")
 * @param {string} nivel - Nivel educativo (ej: "1EEM", "3EPM")
 * @param {Array<string>} trimestresDisponibles - Lista de trimestres disponibles
 * @param {Function} detectarEtapa - Función que detecta la etapa de un nivel
 * @returns {string} El trimestre óptimo para el nivel dado
 */
export const getBestTrimestre = (trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa) => {
  // Si el trimestre seleccionado no está en formato válido, devolverlo tal cual
  const parsed = parseTrimestre(trimestreSeleccionado);
  if (!parsed) {
    return trimestreSeleccionado;
  }

  // Detectar la etapa del nivel
  const etapaNivel = detectarEtapa(nivel);
  const trimestreBase = parsed.base;

  // Buscar el trimestre que coincida con la evaluación base y la etapa del nivel
  const trimestreConEtapa = trimestresDisponibles.find(t => {
    const p = parseTrimestre(t);
    return p && p.base === trimestreBase && p.etapa === etapaNivel;
  });

  // Si se encuentra un trimestre específico para esa etapa, usarlo; sino usar el seleccionado
  return trimestreConEtapa || trimestreSeleccionado;
};

/**
 * Divide una cadena de forma segura
 * @param {string} str - Cadena a dividir
 * @param {string} separator - Separador
 * @param {number} expectedLength - Longitud esperada del array resultante (opcional)
 * @returns {Array<string>|null} Array resultante o null si no cumple con la longitud esperada
 */
export const safeSplit = (str, separator, expectedLength = null) => {
  if (typeof str !== 'string') return null;
  const parts = str.split(separator);
  if (expectedLength !== null && parts.length !== expectedLength) {
    return null;
  }
  return parts;
};

/**
 * Obtiene el trimestre base de un trimestre completo de forma segura
 * @param {string} trimestre - Trimestre completo (ej: "1EV-EEM")
 * @returns {string} Base del trimestre (ej: "1EV") o el trimestre original si no tiene formato válido
 */
export const getTrimestreBase = (trimestre) => {
  const parsed = parseTrimestre(trimestre);
  return parsed ? parsed.base : trimestre;
};

/**
 * Obtiene la etapa de un trimestre completo de forma segura
 * @param {string} trimestre - Trimestre completo (ej: "1EV-EEM")
 * @returns {string|null} Etapa del trimestre (ej: "EEM") o null si no tiene formato válido
 */
export const getTrimestreEtapa = (trimestre) => {
  const parsed = parseTrimestre(trimestre);
  return parsed ? parsed.etapa : null;
};
