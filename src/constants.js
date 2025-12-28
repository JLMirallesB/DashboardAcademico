/**
 * Dashboard Académico - Constantes y Configuración
 * Versión: 2.0.0-refactor
 */

// Umbrales configurables por defecto
export const UMBRALES_DEFAULT = {
  suspensosAlerta: 30,
  mediaCritica: 6,
  mediaFacil: 8,
  aprobadosMinimo: 90,
  alumnosMinimo: 3
};

// ============================================
// DESIGN SYSTEM MINIMALISTA - Paleta de colores
// ============================================

export const MINIMAL_PALETTE = {
  // Fondos
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F1F3F5'
  },
  // Texto
  text: {
    primary: '#212529',
    secondary: '#495057',
    tertiary: '#6C757D',
    quaternary: '#ADB5BD'
  },
  // Bordes
  border: {
    light: '#E9ECEF',
    medium: '#DEE2E6',
    dark: '#ADB5BD'
  },
  // Interactivos
  interactive: {
    primary: '#212529',
    hover: '#000000',
    focus: '#495057'
  },
  // Estados (solo para datos y alertas)
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444'
  }
};

// Colores para gráficas Recharts (simplificados)
export const CHART_COLORS = {
  // Líneas principales
  primary: '#212529',
  secondary: '#6C757D',
  tertiary: '#ADB5BD',
  // Estados específicos
  positive: '#10B981',
  negative: '#EF4444',
  warning: '#F59E0B',
  // Grid y ejes
  grid: '#E9ECEF',
  axis: '#6C757D'
};

// Colores para comparaciones (gráficos y visualizaciones) - Simplificados
export const COLORES_COMPARACION = [
  { line: "#212529", label: "Principal", bg: "#F8F9FA" },
  { line: "#6C757D", label: "Secundario", bg: "#F1F3F5" },
  { line: "#ADB5BD", label: "Terciario", bg: "#E9ECEF" },
  { line: "#EF4444", label: "Alerta", bg: "#FEF2F2" },
  { line: "#10B981", label: "Éxito", bg: "#ECFDF5" }
];

// Instrumentos de especialidades EPM (Enseñanzas Profesionales de Música)
export const INSTRUMENTALES_EPM = new Set([
  'arpa', 'acordeón', 'bajo eléctrico', 'canto', 'clarinete', 'clave',
  'contrabajo', 'dolçaina', 'fagot', 'flauta', 'flauta de pico', 'flauta travesera',
  'guitarra', 'guitarra eléctrica', 'guitarra electrica', 'oboe', 'órgano', 'percusión',
  'piano', 'saxofón', 'trombón', 'trompa', 'trompeta',
  'tuba', 'viola', 'viola da gamba', 'violín', 'violoncello', 'voz'
]);

// Abreviaturas de asignaturas (consolidadas, eliminando duplicación)
export const ABREVIATURAS_ASIGNATURAS = {
  'lenguaje musical': 'LM',
  'coro': 'Cor',
  'conjunto': 'Con',
  'orquesta/banda/conjunto': 'Orq/Ban/Con',
  'especialidad': 'Esp',
  'arpa': 'Arp',
  'clarinete': 'Cla',
  'contrabajo': 'Ctb',
  'fagot': 'Fag',
  'flauta': 'Fla',
  'flauta travesera': 'Fla',
  'guitarra': 'Gui',
  'guitarra eléctrica': 'GuiE',
  'guitarra electrica': 'GuiE',
  'oboe': 'Obo',
  'percusión': 'Per',
  'piano': 'Pia',
  'saxofón': 'Sax',
  'trombón': 'Trb',
  'trompa': 'Trp',
  'trompeta': 'Tpt',
  'viola': 'Vla',
  'violín': 'Vln',
  'violoncello': 'Vcl',
  'teórica troncal': 'TT'
};

// Asignaturas a excluir por etapa
export const ASIGNATURAS_EXCLUIR_EEM = ['lenguaje musical', 'coro', 'conjunto', 'todos'];
export const ASIGNATURAS_EXCLUIR_TODOS = ['lenguaje musical', 'coro', 'conjunto', 'todos', 'teórica troncal'];
