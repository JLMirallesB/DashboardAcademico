/**
 * Dashboard Académico - Servicio de Parseo CSV
 * Parser de archivos CSV con detección automática de separador
 */

import { validarEstructuraCSV, parseNumero } from '../utils/validators.js';

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

    // Parsear según sección usando el separador detectado
    const campos = linea.split(separador).map(c => c.trim());

    if (seccionActual === 'metadata') {
      if (campos[0] === 'Campo') continue; // Skip header
      if (campos[0] && campos[1]) {
        resultado.metadata[campos[0]] = campos[1];
      }
    } else if (seccionActual === 'estadisticas') {
      if (campos[0] === 'Nivel') {
        encabezadosStats = campos;
        continue;
      }
      if (campos[0] && encabezadosStats.length > 0) {
        const fila = {};
        encabezadosStats.forEach((h, idx) => {
          let valor = campos[idx] || '';
          // Convertir números (columnas desde la 3ª en adelante)
          if (idx >= 2 && valor !== '') {
            valor = parseNumero(valor);
            // Si es porcentaje (Aprobados o Suspendidos) y viene como decimal, convertir
            if ((h === 'Aprobados' || h === 'Suspendidos') && valor !== null && valor <= 1) {
              valor = valor * 100;
            }
          }
          fila[h] = valor;
        });
        resultado.estadisticas.push(fila);
      }
    } else if (seccionActual === 'correlaciones') {
      if (campos[0] === 'Nivel') {
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
          fila[h] = valor;
        });
        if (fila.Correlacion !== null && fila.Correlacion !== undefined) {
          resultado.correlaciones.push(fila);
        }
      }
    } else if (seccionActual === 'agrupaciones') {
      if (campos[0] === 'Asignatura') {
        encabezadosAgrup = campos;
        continue;
      }
      if (campos[0] && encabezadosAgrup.length > 0) {
        const fila = {};
        encabezadosAgrup.forEach((h, idx) => {
          fila[h] = campos[idx] || '';
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
