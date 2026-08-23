/* Utilidades comunes.
 *
 * La normalización de texto y todo lo de trimestres se movió a
 * `src/nucleo/texto.js` y desde aquí solo se reexporta: tenía dos definiciones
 * —una con acentos y otra sin— y de esa divergencia salía que el informe
 * filtrado por agrupación perdiera Percusión, Violín y Saxofón.
 */

export { normalizar, parseTrimestre, getTrimestreBase, getTrimestreEtapa } from './nucleo/texto.js';
import { normalizar, parseTrimestre } from './nucleo/texto.js';



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

  /* El fichero del MISMO MOMENTO —misma evaluación y mismo curso académico— y
     de la etapa que le toca a ese nivel. El curso entró en la comparación el
     23/08/2026: sin él, con dos cursos cargados, un nivel de profesional podía
     resolverse al fichero de otro año y la comparación mezclaba cursos sin
     decirlo. */
  const trimestreConEtapa = trimestresDisponibles.find(t => {
    const p = parseTrimestre(t);
    return p && p.base === trimestreBase && p.curso === parsed.curso && p.etapa === etapaNivel;
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
 * Verifica si una asignatura existe en un nivel (case-insensitive)
 * @param {Object} datosCompletos - Objeto con todos los datos
 * @param {string} trimestre - Trimestre a buscar
 * @param {string} nivel - Nivel a buscar
 * @param {string} asignatura - Asignatura a buscar
 * @returns {boolean} true si la asignatura existe
 */
export const tieneAsignatura = (datosCompletos, trimestre, nivel, asignatura) => {
  if (!datosCompletos[trimestre]?.[nivel]) return false;

  const asignaturasDelNivel = Object.keys(datosCompletos[trimestre][nivel]);
  const asignaturaBuscada = normalizar(asignatura);

  // Buscar coincidencia case-insensitive
  return asignaturasDelNivel.some(asigDisponible =>
    normalizar(asigDisponible) === asignaturaBuscada
  );
};

/**
 * Verifica si una asignatura pertenece a un grupo específico
 * @param {string} asignatura - Nombre de la asignatura
 * @param {string} grupo - Grupo a verificar (ej: 'Especialidad', 'Tecla', 'Madera')
 * @param {Object} agrupaciones - Mapa de agrupaciones { asignatura → [grupos] }
 * @returns {boolean} true si la asignatura pertenece al grupo
 */
export const perteneceAGrupo = (asignatura, grupo, agrupaciones = {}) => {
  if (!asignatura || !grupo) return false;

  const asigNorm = normalizar(asignatura);
  const grupoNorm = normalizar(grupo);

  // Si no hay agrupaciones definidas, retornar false (fallback en el código que llama)
  if (!agrupaciones || Object.keys(agrupaciones).length === 0) {
    return false;
  }

  // Obtener grupos de la asignatura
  const grupos = agrupaciones[asigNorm] || [];

  // Verificar si el grupo buscado está en la lista
  return grupos.some(g => normalizar(g) === grupoNorm);
};
