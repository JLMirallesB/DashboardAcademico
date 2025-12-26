/**
 * Dashboard Académico - Servicio de Parseo CSV
 * Parser de archivos CSV con detección automática de separador
 */

import { validarEstructuraCSV, parseNumero } from '../utils/validators.js';

/**
 * Parsea una línea CSV respetando comillas dobles como delimitadores de campo
 * @param {string} linea - Línea a parsear
 * @param {string} separador - Separador de campos (';' o ',')
 * @returns {string[]} Array de campos parseados
 */
const parseCSVLine = (linea, separador) => {
  const campos = [];
  let campoActual = '';
  let dentroDeComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const char = linea[i];

    if (char === '"') {
      // Toggle estado de comillas
      dentroDeComillas = !dentroDeComillas;
      // No incluir las comillas en el campo
    } else if (char === separador && !dentroDeComillas) {
      // Separador fuera de comillas: fin de campo
      campos.push(campoActual.trim());
      campoActual = '';
    } else {
      // Carácter normal o separador dentro de comillas
      campoActual += char;
    }
  }

  // Añadir último campo
  campos.push(campoActual.trim());

  return campos;
};

/**
 * Parsea un archivo CSV con formato del Dashboard Académico
 * Detecta automáticamente el separador (punto y coma o coma)
 * @param {string} csvText - Contenido del archivo CSV
 * @returns {Object} Objeto con metadata, estadisticas y correlaciones
 */
export const parseCSV = (csvText) => {
  // Validar estructura del CSV
  validarEstructuraCSV(csvText);

  const lineas = csvText.split('\n').map(l => l.trim()).filter(l => l);

  // Detectar separador: si hay más ; que , en las primeras líneas, usar ;
  const primerasLineas = lineas.slice(0, 10).join('\n');
  const separador = (primerasLineas.match(/;/g) || []).length > (primerasLineas.match(/,/g) || []).length ? ';' : ',';

  let seccionActual = null;
  const resultado = {
    metadata: {},
    estadisticas: [],
    correlaciones: [],
    agrupaciones: []
  };

  let encabezadosStats = [];
  let encabezadosCorr = [];
  let encabezadosAgrup = [];

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    // Detectar sección
    if (linea.startsWith('#METADATA')) {
      seccionActual = 'metadata';
      continue;
    } else if (linea.startsWith('#ESTADISTICAS')) {
      seccionActual = 'estadisticas';
      continue;
    } else if (linea.startsWith('#CORRELACIONES')) {
      seccionActual = 'correlaciones';
      continue;
    } else if (linea.startsWith('#AGRUPACIONES')) {
      seccionActual = 'agrupaciones';
      continue;
    } else if (linea.startsWith('#UMBRALES')) {
      seccionActual = 'umbrales'; // Ignoramos umbrales del CSV
      continue;
    }

    // Parsear según sección usando el separador detectado (respetando comillas)
    const campos = parseCSVLine(linea, separador);

    if (seccionActual === 'metadata') {
      if (campos[0] === 'Campo') continue; // Skip header
      if (campos[0] && campos[1]) {
        resultado.metadata[campos[0]] = campos[1];
      }
    } else if (seccionActual === 'estadisticas') {
      // Nuevo formato: primera columna es 'Tipo', soportar también formato antiguo con 'Nivel'
      if (campos[0] === 'Tipo' || campos[0] === 'Nivel') {
        encabezadosStats = campos;
        continue;
      }
      if (campos[0] && encabezadosStats.length > 0) {
        const fila = {};
        encabezadosStats.forEach((h, idx) => {
          let valor = campos[idx] || '';
          // Normalizar nombres de columnas del nuevo formato
          let nombreColumna = h;
          if (h === 'PctAprobados') nombreColumna = 'Aprobados';
          if (h === 'PctSuspendidos') nombreColumna = 'Suspendidos';

          // Tratar guión largo (—) como valor vacío/nulo
          if (valor === '—' || valor === '-' || valor === '–') {
            valor = '';
          }

          // Convertir números (columnas desde la 3ª en adelante, o 4ª si hay columna Tipo)
          const inicioNumericos = encabezadosStats[0] === 'Tipo' ? 3 : 2;
          if (idx >= inicioNumericos && valor !== '') {
            // Quitar símbolo de porcentaje si existe
            const esPorc = valor.toString().includes('%');
            if (esPorc) {
              valor = valor.replace('%', '');
            }
            valor = parseNumero(valor);
            // Si es porcentaje (Aprobados o Suspendidos) y viene como decimal (<=1), convertir a porcentaje
            // Nota: si ya viene con %, ya está en formato porcentaje, no multiplicar
            if ((nombreColumna === 'Aprobados' || nombreColumna === 'Suspendidos') && valor !== null && !esPorc && valor <= 1) {
              valor = valor * 100;
            }
          }
          fila[nombreColumna] = valor;
        });
        resultado.estadisticas.push(fila);
      }
    } else if (seccionActual === 'correlaciones') {
      // Nuevo formato: primera columna es 'Tipo', soportar también formato antiguo con 'Nivel'
      if (campos[0] === 'Tipo' || campos[0] === 'Nivel') {
        encabezadosCorr = campos;
        continue;
      }
      if (campos[0] && encabezadosCorr.length > 0) {
        const fila = {};
        encabezadosCorr.forEach((h, idx) => {
          let valor = campos[idx] || '';
          if (h === 'Correlacion' && valor !== '') {
            valor = parseNumero(valor);
          }
          // Saltar la columna Tipo en el resultado final
          if (h !== 'Tipo') {
            fila[h] = valor;
          }
        });
        if (fila.Correlacion !== null && fila.Correlacion !== undefined) {
          resultado.correlaciones.push(fila);
        }
      }
    } else if (seccionActual === 'agrupaciones') {
      // Nuevo formato: primera columna es 'Tipo', soportar también formato antiguo con 'Asignatura'
      if (campos[0] === 'Tipo' || campos[0] === 'Asignatura') {
        encabezadosAgrup = campos;
        continue;
      }
      if (campos[0] && encabezadosAgrup.length > 0) {
        const fila = {};
        encabezadosAgrup.forEach((h, idx) => {
          // Saltar la columna Tipo en el resultado final
          if (h !== 'Tipo') {
            fila[h] = campos[idx] || '';
          }
        });
        // Solo añadir si tiene asignatura
        if (fila.Asignatura) {
          resultado.agrupaciones.push(fila);
        }
      }
    }
  }

  return resultado;
};
