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

// Colores para comparaciones (gráficos y visualizaciones)
export const COLORES_COMPARACION = [
  { line: "#1a1a2e", label: "Principal", bg: "#f8f9fa" },
  { line: "#e63946", label: "Rojo", bg: "#fff5f5" },
  { line: "#2a9d8f", label: "Verde", bg: "#f0fdf4" },
  { line: "#e9c46a", label: "Dorado", bg: "#fefce8" },
  { line: "#9381ff", label: "Violeta", bg: "#f5f3ff" }
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
