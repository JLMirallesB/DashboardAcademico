/**
 * Dashboard Académico - Validadores
 * Funciones de validación de datos y formatos
 */

/**
 * Valida la estructura básica de un archivo CSV
 * @param {string} csvText - Contenido del archivo CSV
 * @throws {Error} Si el archivo está vacío o no tiene la estructura esperada
 */
export const validarEstructuraCSV = (csvText) => {
  const lineas = csvText.split('\n').map(l => l.trim()).filter(l => l);

  // Validación básica: archivo no vacío
  if (lineas.length === 0) {
    throw new Error('El archivo CSV está vacío');
  }

  // Validar que tiene al menos las secciones requeridas
  const tieneMetadata = lineas.some(l => l.startsWith('#METADATA'));
  const tieneEstadisticas = lineas.some(l => l.startsWith('#ESTADISTICAS'));

  if (!tieneMetadata || !tieneEstadisticas) {
    throw new Error('El archivo CSV no tiene la estructura esperada. Debe contener #METADATA y #ESTADISTICAS');
  }

  return true;
};

/**
 * Convierte un valor a número, manejando tanto coma como punto decimal
 * @param {string|number} valor - Valor a convertir
 * @returns {number|null} Número parseado o null si no es válido
 */
export const parseNumero = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  // Reemplazar coma decimal por punto
  let num = valor.toString().replace(',', '.');
  const parsed = parseFloat(num);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Valida que un valor esté dentro de un rango
 * @param {number} valor - Valor a validar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {boolean} True si está en el rango
 */
export const validarRango = (valor, min, max) => {
  if (typeof valor !== 'number' || isNaN(valor)) return false;
  return valor >= min && valor <= max;
};

/**
 * Valida formato de trimestre (ej: "1EV-EEM", "2T-EPM")
 * @param {string} trimestre - Trimestre a validar
 * @returns {boolean} True si el formato es válido
 */
export const validarFormatoTrimestre = (trimestre) => {
  if (typeof trimestre !== 'string') return false;
  // Formato esperado: "1EV-EEM" o "2T-EPM" o similar
  return /^[0-9][A-Z]+-[A-Z]+$/.test(trimestre);
};
