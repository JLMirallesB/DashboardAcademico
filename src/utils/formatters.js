/**
 * Dashboard Académico - Formateadores
 * Funciones de formateo de datos para visualización
 */

import { ABREVIATURAS_ASIGNATURAS } from '../constants.js';
import { normalizar, parseTrimestre } from '../utils.js';

/**
 * Formatea el nombre de un trimestre para mostrar (ej: "1EV-EEM" → "1EV (EEM)")
 * @param {string} trimestreCompleto - Trimestre en formato completo
 * @returns {string} Trimestre formateado
 */
export const formatearNombreTrimestre = (trimestreCompleto) => {
  const parsed = parseTrimestre(trimestreCompleto);
  if (parsed) {
    return `${parsed.base} (${parsed.etapa})`;
  }
  return trimestreCompleto;
};

/**
 * Abrevia el nombre de una asignatura usando el diccionario de abreviaturas
 * Si no encuentra abreviatura, retorna los primeros 3 caracteres
 * @param {string} nombre - Nombre de la asignatura
 * @returns {string} Abreviatura de la asignatura
 */
export const abreviarAsignatura = (nombre) => {
  const nombreNormalizado = normalizar(nombre);
  return ABREVIATURAS_ASIGNATURAS[nombreNormalizado] || nombre.substring(0, 3);
};

/**
 * Formatea un porcentaje para visualización
 * @param {number} valor - Valor entre 0 y 100
 * @param {number} decimales - Número de decimales (default: 1)
 * @returns {string} Porcentaje formateado con símbolo %
 */
export const formatearPorcentaje = (valor, decimales = 1) => {
  if (valor === null || valor === undefined || isNaN(valor)) return '-';
  return `${valor.toFixed(decimales)}%`;
};

/**
 * Formatea una nota numérica para visualización
 * @param {number} nota - Nota entre 0 y 10
 * @param {number} decimales - Número de decimales (default: 2)
 * @returns {string} Nota formateada
 */
export const formatearNota = (nota, decimales = 2) => {
  if (nota === null || nota === undefined || isNaN(nota)) return '-';
  return nota.toFixed(decimales);
};

/**
 * Formatea un número con separador de miles
 * @param {number} numero - Número a formatear
 * @returns {string} Número formateado
 */
export const formatearNumero = (numero) => {
  if (numero === null || numero === undefined || isNaN(numero)) return '-';
  return numero.toLocaleString('es-ES');
};

/**
 * Formatea un coeficiente de correlación con su signo
 * @param {number} correlacion - Valor de correlación entre -1 y 1
 * @param {number} decimales - Número de decimales (default: 3)
 * @returns {string} Correlación formateada
 */
export const formatearCorrelacion = (correlacion, decimales = 3) => {
  if (correlacion === null || correlacion === undefined || isNaN(correlacion)) return '-';
  const valor = correlacion.toFixed(decimales);
  return correlacion >= 0 ? `+${valor}` : valor;
};
