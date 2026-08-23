/**
 * Dashboard Académico - Utilidad de Captura de Gráficas
 * Captura elementos DOM (gráficas Recharts) como imágenes para PDF
 */

import html2canvas from 'html2canvas';

/**
 * Captura un elemento DOM como imagen base64 PNG
 * @param {HTMLElement} element - Elemento DOM a capturar
 * @param {Object} options - Opciones adicionales para html2canvas
 * @returns {Promise<string|null>} - Imagen en formato base64 o null si falla
 */
export const captureChartAsImage = async (element, options = {}) => {
  if (!element) {
    console.warn('[ChartCapture] Elemento no proporcionado');
    return null;
  }

  const defaultOptions = {
    scale: 2,                    // Mayor calidad para PDF
    backgroundColor: '#ffffff',  // Fondo blanco
    logging: false,              // Sin logs de debug
    useCORS: true,              // Permitir recursos externos
    allowTaint: true,           // Permitir elementos tainted
    removeContainer: true,      // Limpiar contenedor temporal
  };

  try {
    const canvas = await html2canvas(element, { ...defaultOptions, ...options });
    /* JPEG y no PNG, y esto se midió. jsPDF no sabe pasar un PNG de
       html2canvas tal cual: lo decodifica a píxeles y lo guarda EN CRUDO, tres
       bytes por píxel. Dos gráficas de una A4 apaisada a escala 2 daban 9,6 y
       8,2 MB, y un informe de 18 MB que Gmail (25 MB) no siempre deja mandar.
       Comprimir el documento entero tampoco vale: el deflate de jsPDF es
       síncrono y congela la pestaña un minuto largo.
       Un JPEG ya viene comprimido y jsPDF lo mete tal cual, sin coste. La
       calidad 0,92 sobre gráficas de fondo blanco y líneas finas no se
       distingue a simple vista del PNG, y el fondo se pinta blanco arriba
       (`backgroundColor`) justo para que el JPEG, que no tiene transparencia,
       no saque un borde negro. */
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (error) {
    console.error('[ChartCapture] Error al capturar gráfica:', error);
    return null;
  }
};

/**
 * Captura múltiples elementos como imágenes
 * @param {Object} refs - Objeto con refs a capturar { nombre: ref }
 * @returns {Promise<Object>} - Objeto con imágenes { nombre: base64 }
 */
export const captureMultipleCharts = async (refs) => {
  const images = {};

  for (const [name, ref] of Object.entries(refs)) {
    if (ref?.current) {
      images[name] = await captureChartAsImage(ref.current);
    } else {
      images[name] = null;
    }
  }

  return images;
};

/**
 * Espera a que un elemento esté listo para captura
 * @param {number} delay - Milisegundos a esperar (default 500)
 * @returns {Promise<void>}
 */
export const waitForRender = (delay = 500) => {
  return new Promise(resolve => setTimeout(resolve, delay));
};
