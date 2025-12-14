import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { translations } from './translations.js';
import { normalizar, getBestTrimestre, parseTrimestre, getTrimestreBase, getTrimestreEtapa, tieneAsignatura } from './utils.js';
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

// Aplicar el plugin autoTable a jsPDF
applyPlugin(jsPDF);

const DashboardAcademico = () => {
  // Estado de idioma
  const [idioma, setIdioma] = useState('es');
  const t = (key) => translations[idioma][key];

  // Estado principal
  const [datosCompletos, setDatosCompletos] = useState({});
  const [correlacionesCompletas, setCorrelacionesCompletas] = useState({});
  const [metadata, setMetadata] = useState({});
  const [trimestresDisponibles, setTrimestresDisponibles] = useState([]);
  
  // Umbrales configurables
  const [umbrales, setUmbrales] = useState({
    suspensosAlerta: 30,
    mediaCritica: 6,
    mediaFacil: 8,
    aprobadosMinimo: 90,
    alumnosMinimo: 3
  });
  
  // UI State
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState(null);
  const [vistaActual, setVistaActual] = useState('estadisticas'); // 'estadisticas', 'correlaciones', 'evolucion', 'dificultad', 'asignaturas'
  const [selecciones, setSelecciones] = useState([]);
  const [mostrarModalConfirm, setMostrarModalConfirm] = useState(false);
  const [trimestrePendiente, setTrimestrePendiente] = useState(null);
  const [datosPendientes, setDatosPendientes] = useState(null);
  const [mostrarPanelUmbrales, setMostrarPanelUmbrales] = useState(false);
  const [mostrarPanelCarga, setMostrarPanelCarga] = useState(true);
  const [mostrarModalGestionDatos, setMostrarModalGestionDatos] = useState(false);
  const [compararNiveles, setCompararNiveles] = useState(false);
  const [asignaturaComparada, setAsignaturaComparada] = useState('Lenguaje Musical');
  const [tipoComparativa, setTipoComparativa] = useState('longitudinal'); // 'longitudinal' o 'transversal'
  const [ordenCorrelaciones, setOrdenCorrelaciones] = useState('desc'); // 'desc', 'asc', 'none'
  const [ejeCorrelaciones, setEjeCorrelaciones] = useState('niveles'); // 'pares' o 'niveles'
  const [modoHeatmap, setModoHeatmap] = useState('relativo'); // 'absoluto' o 'relativo'
  const [modoDistribucion, setModoDistribucion] = useState('porcentaje'); // 'absoluto' o 'porcentaje'

  // Filtros para vista de asignaturas
  const [filtroNivel, setFiltroNivel] = useState('ALL'); // 'ALL', 'GLOBAL', '1EEM', '2EEM', etc.
  const [filtroTrimestre, setFiltroTrimestre] = useState('ALL'); // 'ALL' o un trimestre específico

  // Vista de dificultad: por niveles o global
  const [vistaDificultad, setVistaDificultad] = useState('niveles'); // 'niveles' o 'global'

  // Filtros de análisis transversal en Evolución
  const [filtroTendenciaMedia, setFiltroTendenciaMedia] = useState('all'); // 'all' o tipo de tendencia específico para nota media
  const [filtroTendenciaSuspensos, setFiltroTendenciaSuspensos] = useState('all'); // 'all' o tipo de tendencia específico para suspensos

  // Selecciones específicas para vista de evolución (independiente de estadísticas)
  const [seleccionesEvolucion, setSeleccionesEvolucion] = useState([
    { nivel: 'GLOBAL', asignatura: 'Todos' }
  ]);
  const [asignaturasTransversal, setAsignaturasTransversal] = useState([]); // Asignaturas seleccionadas para comparativa transversal

  // Gestión de etapas educativas (EEM / EPM / TODOS)
  const [modoEtapa, setModoEtapa] = useState('EEM'); // 'EEM' | 'EPM' | 'TODOS'

  // Estado para generación de informes
  const [mostrarModalInforme, setMostrarModalInforme] = useState(false);
  const [generandoInforme, setGenerandoInforme] = useState(false);
  const [configInforme, setConfigInforme] = useState({
    nombreCentro: 'Conservatorio Profesional de Música',
    cursoAcademico: '2024-2025',
    incluirKPIs: true,
    incluirDificultad: true,
    incluirCorrelaciones: true,
    incluirEvolucion: true
  });

  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  // Colores para comparaciones
  const colores = [
    { line: "#1a1a2e", label: "Principal", bg: "#f8f9fa" },
    { line: "#e63946", label: "Rojo", bg: "#fff5f5" },
    { line: "#2a9d8f", label: "Verde", bg: "#f0fdf4" },
    { line: "#e9c46a", label: "Dorado", bg: "#fefce8" },
    { line: "#9381ff", label: "Violeta", bg: "#f5f3ff" }
  ];

  // Parser de CSV - detecta automáticamente el separador
  const parseCSV = useCallback((csvText) => {
    const lineas = csvText.split('\n').map(l => l.trim()).filter(l => l);
    
    // Detectar separador: si hay más ; que , en las primeras líneas, usar ;
    const primerasLineas = lineas.slice(0, 10).join('\n');
    const separador = (primerasLineas.match(/;/g) || []).length > (primerasLineas.match(/,/g) || []).length ? ';' : ',';
    
    let seccionActual = null;
    const resultado = {
      metadata: {},
      estadisticas: [],
      correlaciones: []
    };
    
    let encabezadosStats = [];
    let encabezadosCorr = [];
    
    // Función para convertir número (maneja tanto , como . decimal)
    const parseNumero = (valor) => {
      if (valor === '' || valor === null || valor === undefined) return null;
      // Reemplazar coma decimal por punto
      let num = valor.toString().replace(',', '.');
      const parsed = parseFloat(num);
      return isNaN(parsed) ? null : parsed;
    };
    
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
      }
    }
    
    return resultado;
  }, []);

  // Procesar datos parseados
  const procesarDatos = useCallback((parsed) => {
    const trimestreBase = parsed.metadata.Trimestre;
    if (!trimestreBase) {
      alert('Error: El CSV no contiene información de trimestre en METADATA');
      return null;
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

    return {
      trimestre: trimestreCompleto,
      trimestreBase,
      etapa: etapaDetectada,
      metadata: parsed.metadata,
      datos: datosEstructurados,
      correlaciones: parsed.correlaciones
    };
  }, []);

  // Aplicar datos
  const aplicarDatos = useCallback((procesado) => {
    const { trimestre, metadata: meta, datos, correlaciones } = procesado;

    setDatosCompletos(prev => ({
      ...prev,
      [trimestre]: datos
    }));

    setCorrelacionesCompletas(prev => ({
      ...prev,
      [trimestre]: correlaciones
    }));

    setMetadata(prev => ({
      ...prev,
      [trimestre]: meta
    }));

    setTrimestresDisponibles(prev => {
      const nuevos = prev.includes(trimestre) ? prev : [...prev, trimestre];
      return nuevos.sort((a, b) => {
        // Extraer trimestre base y etapa
        const parsedA = parseTrimestre(a);
        const parsedB = parseTrimestre(b);

        const trimA = parsedA?.base || a;
        const etapaA = parsedA?.etapa;
        const trimB = parsedB?.base || b;
        const etapaB = parsedB?.etapa;

        const orden = { '1EV': 1, '2EV': 2, '3EV': 3, 'FINAL': 4 };
        const ordenTrimA = orden[trimA] || 99;
        const ordenTrimB = orden[trimB] || 99;

        // Primero ordenar por trimestre
        if (ordenTrimA !== ordenTrimB) {
          return ordenTrimA - ordenTrimB;
        }

        // Si el trimestre es igual, ordenar por etapa (EEM antes que EPM)
        if (etapaA && etapaB) {
          return etapaA.localeCompare(etapaB);
        }

        return 0;
      });
    });

    if (!trimestreSeleccionado) {
      setTrimestreSeleccionado(trimestre);
    }

    // Inicializar selección por defecto
    if (selecciones.length === 0 && datos['GLOBAL']) {
      setSelecciones([{
        id: 0,
        trimestre: trimestre,
        nivel: 'GLOBAL',
        asignatura: 'Todos'
      }]);
    }

    setMostrarPanelCarga(false);
  }, [trimestreSeleccionado, selecciones.length]);

  // Cargar CSV
  const handleCargarCSV = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const texto = e.target.result;
      const parsed = parseCSV(texto);
      const procesado = procesarDatos(parsed);

      if (!procesado) {
        return;
      }

      // Verificar si el trimestre ya existe
      if (trimestresDisponibles.includes(procesado.trimestre)) {
        setTrimestrePendiente(procesado.trimestre);
        setDatosPendientes(procesado);
        setMostrarModalConfirm(true);
      } else {
        aplicarDatos(procesado);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [parseCSV, procesarDatos, trimestresDisponibles, aplicarDatos]);

  // Confirmar reemplazo de trimestre
  const confirmarReemplazo = useCallback(() => {
    if (datosPendientes) {
      aplicarDatos(datosPendientes);
    }
    setMostrarModalConfirm(false);
    setTrimestrePendiente(null);
    setDatosPendientes(null);
  }, [datosPendientes, aplicarDatos]);

  // Cancelar reemplazo
  const cancelarReemplazo = useCallback(() => {
    setMostrarModalConfirm(false);
    setTrimestrePendiente(null);
    setDatosPendientes(null);
  }, []);

  // Eliminar trimestre
  const eliminarTrimestre = useCallback((trimestre) => {
    setDatosCompletos(prev => {
      const nuevo = { ...prev };
      delete nuevo[trimestre];
      return nuevo;
    });
    
    setCorrelacionesCompletas(prev => {
      const nuevo = { ...prev };
      delete nuevo[trimestre];
      return nuevo;
    });
    
    setMetadata(prev => {
      const nuevo = { ...prev };
      delete nuevo[trimestre];
      return nuevo;
    });
    
    setTrimestresDisponibles(prev => prev.filter(t => t !== trimestre));
    
    if (trimestreSeleccionado === trimestre) {
      const restantes = trimestresDisponibles.filter(t => t !== trimestre);
      setTrimestreSeleccionado(restantes[0] || null);
    }
    
    setSelecciones(prev => prev.filter(s => s.trimestre !== trimestre));
  }, [trimestreSeleccionado, trimestresDisponibles]);

  // Exportar JSON
  const exportarJSON = useCallback(() => {
    const exportData = {
      metadata: {
        exportadoEl: new Date().toISOString(),
        trimestres: trimestresDisponibles,
        metadataPorTrimestre: metadata
      },
      umbrales,
      datos: datosCompletos,
      correlaciones: correlacionesCompletas
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_academico_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [trimestresDisponibles, metadata, umbrales, datosCompletos, correlacionesCompletas]);

  // Importar JSON
  const handleImportarJSON = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importado = JSON.parse(e.target.result);
        
        if (importado.datos) setDatosCompletos(importado.datos);
        if (importado.correlaciones) setCorrelacionesCompletas(importado.correlaciones);
        if (importado.umbrales) setUmbrales(importado.umbrales);
        if (importado.metadata) {
          setMetadata(importado.metadata.metadataPorTrimestre || {});
          const trims = importado.metadata.trimestres || Object.keys(importado.datos || {});
          setTrimestresDisponibles(trims);
          if (trims.length > 0) {
            setTrimestreSeleccionado(trims[0]);
            const primerTrim = trims[0];
            const niveles = Object.keys(importado.datos[primerTrim] || {});
            if (niveles.includes('GLOBAL')) {
              setSelecciones([{
                id: 0,
                trimestre: primerTrim,
                nivel: 'GLOBAL',
                asignatura: 'Todos'
              }]);
            }
          }
        }
        
        setMostrarPanelCarga(false);
      } catch (err) {
        alert('Error al parsear el archivo JSON');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  // Calcular resultado (FÁCIL/DIFÍCIL)
  const calcularResultado = useCallback((stats) => {
    if (!stats) return null;
    
    const esDificil = stats.suspendidos >= umbrales.suspensosAlerta || 
                      stats.notaMedia < umbrales.mediaCritica;
    const esFacil = stats.aprobados >= umbrales.aprobadosMinimo || 
                    stats.notaMedia >= umbrales.mediaFacil;
    
    if (esDificil) return 'DIFÍCIL';
    if (esFacil) return 'FÁCIL';
    return null;
  }, [umbrales]);

  // Calcular tendencia a partir de una serie de valores
  const calcularTendencia = useCallback((valores) => {
    if (!valores || valores.length < 2) {
      return {
        tipo: 'insuficiente',
        icono: '📊',
        pendiente: 0,
        curvatura: 0,
        confianza: 'baja',
        r2: 0
      };
    }

    // Filtrar valores nulos/undefined
    const valoresValidos = valores.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (valoresValidos.length < 2) {
      return {
        tipo: 'insuficiente',
        icono: '📊',
        pendiente: 0,
        curvatura: 0,
        confianza: 'baja',
        r2: 0
      };
    }

    const n = valoresValidos.length;

    // ========== REGRESIÓN LINEAL ==========
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    valoresValidos.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    });

    const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercepto = (sumY - pendiente * sumX) / n;

    // Calcular R² para regresión lineal
    const mediaY = sumY / n;
    let ssTotal = 0, ssResidual = 0;
    valoresValidos.forEach((y, x) => {
      const yPred = pendiente * x + intercepto;
      ssTotal += (y - mediaY) ** 2;
      ssResidual += (y - yPred) ** 2;
    });
    const r2Lineal = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;

    // ========== REGRESIÓN CUADRÁTICA (solo si tenemos suficientes datos) ==========
    let curvatura = 0;
    let r2Cuadratica = 0;

    if (n >= 3) {
      // Resolver sistema de ecuaciones para regresión cuadrática: y = ax² + bx + c
      let sumX3 = 0, sumX4 = 0, sumX2Y = 0;
      valoresValidos.forEach((y, x) => {
        sumX3 += x ** 3;
        sumX4 += x ** 4;
        sumX2Y += (x ** 2) * y;
      });

      // Matriz de coeficientes y resolución
      const denom = (sumX4 * (sumX2 * n - sumX * sumX) - sumX3 * (sumX3 * n - sumX * sumX2) + sumX2 * (sumX3 * sumX - sumX2 * sumX2));

      if (Math.abs(denom) > 1e-10) {
        curvatura = (
          (sumX2Y * (sumX2 * n - sumX * sumX) - sumXY * (sumX3 * n - sumX * sumX2) + sumY * (sumX3 * sumX - sumX2 * sumX2))
        ) / denom;

        // Calcular R² para regresión cuadrática
        const b = ((sumX2 * sumX2Y - sumX4 * sumXY) + (sumX3 * sumY * sumX - sumX2 * sumY * sumX2)) / denom;
        const c = (sumY - b * sumX - curvatura * sumX2) / n;

        let ssResidualCuad = 0;
        valoresValidos.forEach((y, x) => {
          const yPred = curvatura * x * x + b * x + c;
          ssResidualCuad += (y - yPred) ** 2;
        });
        r2Cuadratica = ssTotal > 0 ? 1 - (ssResidualCuad / ssTotal) : 0;
      }
    }

    // ========== DETECCIÓN DE PUNTOS DE INFLEXIÓN ==========
    let puntosInflexion = 0;
    let esRecuperacion = false;
    let esPico = false;

    if (n >= 4) {
      const diferencias = [];
      for (let i = 1; i < valoresValidos.length; i++) {
        diferencias.push(valoresValidos[i] - valoresValidos[i - 1]);
      }

      // Contar cambios de signo en las diferencias
      for (let i = 1; i < diferencias.length; i++) {
        if (diferencias[i - 1] * diferencias[i] < 0) {
          puntosInflexion++;
        }
      }

      // Detectar forma de U (recuperación): primero baja, luego sube
      if (puntosInflexion === 1) {
        const mitad = Math.floor(diferencias.length / 2);
        const primerosDiferencias = diferencias.slice(0, mitad);
        const segundosDiferencias = diferencias.slice(mitad);

        const mediaPrimeros = primerosDiferencias.reduce((a, b) => a + b, 0) / primerosDiferencias.length;
        const mediaSegundos = segundosDiferencias.reduce((a, b) => a + b, 0) / segundosDiferencias.length;

        if (mediaPrimeros < -0.1 && mediaSegundos > 0.1) {
          esRecuperacion = true;
        } else if (mediaPrimeros > 0.1 && mediaSegundos < -0.1) {
          esPico = true;
        }
      }
    }

    // ========== ANÁLISIS DE OSCILACIONES ==========
    let varianzaDiferencias = 0;
    if (n >= 3) {
      const diferencias = [];
      for (let i = 1; i < valoresValidos.length; i++) {
        diferencias.push(valoresValidos[i] - valoresValidos[i - 1]);
      }

      const mediaDif = diferencias.reduce((a, b) => a + b, 0) / diferencias.length;
      varianzaDiferencias = diferencias.reduce((sum, d) => sum + (d - mediaDif) ** 2, 0) / diferencias.length;
    }

    // ========== CLASIFICACIÓN EN CATEGORÍAS ==========
    const confianza = n >= 4 ? 'alta' : 'baja';
    const umbralEstable = 0.1;
    const umbralCurvatura = 0.05;
    const umbralOscilacion = 0.5;

    let tipo, icono;

    // Prioridad 1: Patrones insuficientes o irregulares
    if (r2Lineal < 0.3 && n >= 3 && varianzaDiferencias > umbralOscilacion) {
      if (puntosInflexion >= 2) {
        tipo = 'oscilante';
        icono = '〰️';
      } else {
        tipo = 'irregular';
        icono = '❓';
      }
    }
    // Prioridad 2: Patrones U/∩ (muy relevantes pedagógicamente)
    else if (esRecuperacion) {
      tipo = 'valle';
      icono = '↗️';
    }
    else if (esPico) {
      tipo = 'pico';
      icono = '⚠️';
    }
    // Prioridad 3: Patrones con curvatura significativa
    else if (n >= 3 && Math.abs(curvatura) > umbralCurvatura && r2Cuadratica > r2Lineal + 0.1) {
      if (pendiente > umbralEstable && curvatura > 0) {
        tipo = 'creciente_acelerado';
        icono = '🚀';
      } else if (pendiente > umbralEstable && curvatura < 0) {
        tipo = 'creciente_desacelerado';
        icono = '📈';
      } else if (pendiente < -umbralEstable && curvatura < 0) {
        tipo = 'decreciente_acelerado';
        icono = '📉';
      } else if (pendiente < -umbralEstable && curvatura > 0) {
        tipo = 'decreciente_desacelerado';
        icono = '⬇️';
      } else {
        // Curvatura sin tendencia clara
        tipo = 'estable';
        icono = '➖';
      }
    }
    // Prioridad 4: Patrones lineales simples
    else {
      if (Math.abs(pendiente) < umbralEstable) {
        tipo = 'estable';
        icono = '➖';
      } else if (pendiente > 0) {
        tipo = 'creciente_sostenido';
        icono = '↗️';
      } else {
        tipo = 'decreciente_sostenido';
        icono = '↘️';
      }
    }

    return {
      tipo,
      icono,
      pendiente,
      curvatura,
      confianza,
      r2: Math.max(r2Lineal, r2Cuadratica),
      puntosInflexion
    };
  }, []);

  // Obtener texto y color para un tipo de tendencia
  const getTrendInfo = useCallback((tipo) => {
    const trendMap = {
      'insuficiente': {
        label: t('trendInsuficiente'),
        desc: t('trendDescInsuficiente'),
        color: 'bg-gray-100 text-gray-700',
        sortPriority: 0
      },
      'estable': {
        label: t('trendEstable'),
        desc: t('trendDescEstable'),
        color: 'bg-blue-100 text-blue-700',
        sortPriority: 5
      },
      'creciente_sostenido': {
        label: t('trendCrecienteSostenido'),
        desc: t('trendDescCrecienteSostenido'),
        color: 'bg-green-100 text-green-700',
        sortPriority: 8
      },
      'decreciente_sostenido': {
        label: t('trendDecrecienteSostenido'),
        desc: t('trendDescDecrecienteSostenido'),
        color: 'bg-red-100 text-red-700',
        sortPriority: 2
      },
      'creciente_acelerado': {
        label: t('trendCrecienteAcelerado'),
        desc: t('trendDescCrecienteAcelerado'),
        color: 'bg-emerald-100 text-emerald-700',
        sortPriority: 10
      },
      'creciente_desacelerado': {
        label: t('trendCrecienteDesacelerado'),
        desc: t('trendDescCrecienteDesacelerado'),
        color: 'bg-green-100 text-green-600',
        sortPriority: 7
      },
      'decreciente_acelerado': {
        label: t('trendDecrecienteAcelerado'),
        desc: t('trendDescDecrecienteAcelerado'),
        color: 'bg-rose-100 text-rose-700',
        sortPriority: 1
      },
      'decreciente_desacelerado': {
        label: t('trendDecrecienteDesacelerado'),
        desc: t('trendDescDecrecienteDesacelerado'),
        color: 'bg-orange-100 text-orange-700',
        sortPriority: 3
      },
      'valle': {
        label: t('trendValle'),
        desc: t('trendDescValle'),
        color: 'bg-teal-100 text-teal-700',
        sortPriority: 9
      },
      'pico': {
        label: t('trendPico'),
        desc: t('trendDescPico'),
        color: 'bg-amber-100 text-amber-700',
        sortPriority: 4
      },
      'oscilante': {
        label: t('trendOscilante'),
        desc: t('trendDescOscilante'),
        color: 'bg-purple-100 text-purple-700',
        sortPriority: 6
      },
      'irregular': {
        label: t('trendIrregular'),
        desc: t('trendDescIrregular'),
        color: 'bg-gray-100 text-gray-600',
        sortPriority: 0
      }
    };

    return trendMap[tipo] || trendMap['insuficiente'];
  }, [t]);

  // Detectar etapa de un nivel (EEM: 1EEM-4EEM, EPM: 1EPM-6EPM)
  const detectarEtapa = useCallback((nivel) => {
    if (nivel === 'GLOBAL') return null;
    if (nivel.includes('EEM')) return 'EEM';
    if (nivel.includes('EPM')) return 'EPM';
    return null;
  }, []);

  // Obtener niveles disponibles
  const nivelesDisponibles = useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) return [];
    return Object.keys(datosCompletos[trimestreSeleccionado]);
  }, [trimestreSeleccionado, datosCompletos]);

  // Obtener todas las asignaturas disponibles (excluyendo GLOBAL, filtradas por etapa)
  const todasLasAsignaturas = useMemo(() => {
    if (!trimestreSeleccionado) return [];
    const asignaturas = new Set();

    // En modo TODOS, buscar en todos los trimestres de la misma evaluación
    const trimestresABuscar = [];
    if (modoEtapa === 'TODOS') {
      const trimestreBase = getTrimestreBase(trimestreSeleccionado);
      trimestresDisponibles.forEach(t => {
        if (t.startsWith(trimestreBase)) {
          trimestresABuscar.push(t);
        }
      });
    } else {
      trimestresABuscar.push(trimestreSeleccionado);
    }

    // Buscar asignaturas en todos los trimestres correspondientes
    trimestresABuscar.forEach(trim => {
      if (datosCompletos[trim]) {
        Object.entries(datosCompletos[trim]).forEach(([nivel, asigs]) => {
          if (nivel !== 'GLOBAL') {
            if (modoEtapa === 'TODOS' || detectarEtapa(nivel) === modoEtapa) {
              Object.keys(asigs).forEach(asig => asignaturas.add(asig));
            }
          }
        });
      }
    });

    // Asegurar que "Teórica Troncal" siempre aparezca si estamos en EPM o TODOS
    // y existe en algún nivel de los datos
    if (modoEtapa === 'EPM' || modoEtapa === 'TODOS') {
      trimestresABuscar.forEach(trim => {
        if (datosCompletos[trim]) {
          Object.entries(datosCompletos[trim]).forEach(([nivel, asigs]) => {
            if (nivel !== 'GLOBAL' && detectarEtapa(nivel) === 'EPM') {
              const teoricaTroncal = Object.keys(asigs).find(asig =>
                normalizar(asig) === 'teórica troncal'
              );
              if (teoricaTroncal) {
                asignaturas.add(teoricaTroncal);
              }
            }
          });
        }
      });
    }

    return Array.from(asignaturas).sort();
  }, [trimestreSeleccionado, datosCompletos, modoEtapa, detectarEtapa, trimestresDisponibles, normalizar]);

  // Niveles sin GLOBAL para comparación
  const nivelesSinGlobal = useMemo(() => {
    return nivelesDisponibles.filter(n => n !== 'GLOBAL');
  }, [nivelesDisponibles]);

  // Formatear nombre de trimestre para mostrar (ej: "1EV-EEM" → "1EV (EEM)")
  const formatearNombreTrimestre = useCallback((trimestreCompleto) => {
    const parsed = parseTrimestre(trimestreCompleto);
    if (parsed) {
      return `${parsed.base} (${parsed.etapa})`;
    }
    return trimestreCompleto;
  }, []);

  // Obtener etapas disponibles en todos los datos cargados
  const etapasDisponibles = useMemo(() => {
    const etapas = new Set();
    // Extraer etapas desde las claves de trimestres (formato: "1EV-EEM", "2EV-EPM")
    trimestresDisponibles.forEach(trimCompleto => {
      const parsed = parseTrimestre(trimCompleto);
      if (parsed) {
        etapas.add(parsed.etapa); // La etapa es la segunda parte
      }
    });
    const opciones = Array.from(etapas).sort();
    // Si hay más de una etapa, agregar opción TODOS
    if (opciones.length > 1) {
      opciones.push('TODOS');
    }
    return opciones;
  }, [trimestresDisponibles]);

  // Filtrar niveles por modo de etapa
  const nivelesDeEtapa = useMemo(() => {
    return nivelesDisponibles.filter(n => {
      if (n === 'GLOBAL') return true; // GLOBAL siempre disponible
      if (modoEtapa === 'TODOS') return true; // En modo TODOS, incluir todos los niveles
      return detectarEtapa(n) === modoEtapa;
    });
  }, [nivelesDisponibles, modoEtapa, detectarEtapa]);

  // Niveles sin GLOBAL de la etapa actual, con ordenamiento especial para modo TODOS
  const nivelesSinGlobalEtapa = useMemo(() => {
    const nivelesNoGlobal = nivelesDeEtapa.filter(n => n !== 'GLOBAL');

    // En modo TODOS, ordenar: primero todos EEM, luego todos EPM
    if (modoEtapa === 'TODOS') {
      const nivelesEEM = nivelesNoGlobal.filter(n => detectarEtapa(n) === 'EEM').sort();
      const nivelesEPM = nivelesNoGlobal.filter(n => detectarEtapa(n) === 'EPM').sort();
      return [...nivelesEEM, ...nivelesEPM];
    }

    return nivelesNoGlobal;
  }, [nivelesDeEtapa, modoEtapa, detectarEtapa]);

  // Actualizar modo de etapa automáticamente si solo hay una disponible (y no es TODOS)
  useEffect(() => {
    if (etapasDisponibles.length === 1 && etapasDisponibles[0] !== 'TODOS' && etapasDisponibles[0] !== modoEtapa) {
      setModoEtapa(etapasDisponibles[0]);
    } else if (etapasDisponibles.length > 0 && !etapasDisponibles.includes(modoEtapa)) {
      setModoEtapa(etapasDisponibles[0]);
    }
  }, [etapasDisponibles, modoEtapa]);

  // Actualizar asignatura comparada cuando cambia el modo de etapa
  useEffect(() => {
    if (todasLasAsignaturas.length === 0) return;

    // Verificar si la asignatura actual existe en el modo actual
    const asignaturaActualExiste = todasLasAsignaturas.includes(asignaturaComparada);

    if (!asignaturaActualExiste) {
      // Seleccionar una asignatura apropiada según el modo (case-insensitive)
      let nuevaAsignatura;
      if (modoEtapa === 'EPM') {
        // En EPM, preferir Teórica Troncal, Piano, o la primera disponible
        nuevaAsignatura = todasLasAsignaturas.find(a => normalizar(a) === 'teórica troncal') ||
                          todasLasAsignaturas.find(a => normalizar(a) === 'piano') ||
                          todasLasAsignaturas[0];
      } else if (modoEtapa === 'EEM') {
        // En EEM, preferir Lenguaje Musical, Piano, o la primera disponible
        nuevaAsignatura = todasLasAsignaturas.find(a => normalizar(a) === 'lenguaje musical') ||
                          todasLasAsignaturas.find(a => normalizar(a) === 'piano') ||
                          todasLasAsignaturas[0];
      } else {
        // En TODOS, preferir Piano (existe en ambos) o la primera disponible
        nuevaAsignatura = todasLasAsignaturas.find(a => normalizar(a) === 'piano') ||
                          todasLasAsignaturas[0];
      }
      setAsignaturaComparada(nuevaAsignatura);
    }
  }, [modoEtapa, todasLasAsignaturas, asignaturaComparada]);

  // Sincronizar trimestre seleccionado con modo de etapa
  useEffect(() => {
    if (trimestresDisponibles.length === 0) return;

    // Si el trimestre actual no corresponde al modo seleccionado, buscar uno apropiado
    const etapaTrimActual = trimestreSeleccionado ? getTrimestreEtapa(trimestreSeleccionado) : null;

    if (modoEtapa !== 'TODOS' && etapaTrimActual && etapaTrimActual !== modoEtapa) {
      // Buscar un trimestre del modo actual
      const trimestreDelModo = trimestresDisponibles.find(t => {
        const parsed = parseTrimestre(t);
        return parsed && parsed.etapa === modoEtapa;
      });

      if (trimestreDelModo) {
        setTrimestreSeleccionado(trimestreDelModo);
      }
    }
  }, [modoEtapa, trimestresDisponibles, trimestreSeleccionado]);

  // Actualizar selecciones cuando cambia modoEtapa y compararNiveles está activo
  useEffect(() => {
    if (compararNiveles && trimestreSeleccionado && nivelesSinGlobalEtapa.length > 0) {
      const nuevasSelecciones = nivelesSinGlobalEtapa.map((nivel, idx) => ({
        id: idx,
        trimestre: trimestreSeleccionado,
        nivel,
        asignatura: asignaturaComparada
      })).filter(sel => {
        // En modo TODOS, buscar el trimestre apropiado para cada nivel
        const trimestreParaNivel = modoEtapa === 'TODOS'
          ? getBestTrimestre(sel.trimestre, sel.nivel, trimestresDisponibles, detectarEtapa)
          : sel.trimestre;
        // Solo incluir si el nivel tiene esa asignatura
        return datosCompletos[trimestreParaNivel]?.[sel.nivel]?.[asignaturaComparada];
      });
      setSelecciones(nuevasSelecciones);
    }
  }, [modoEtapa, compararNiveles, trimestreSeleccionado, nivelesSinGlobalEtapa, asignaturaComparada, datosCompletos, trimestresDisponibles, detectarEtapa]);

  // Activar comparación de niveles
  const activarCompararNiveles = useCallback(() => {
    if (!trimestreSeleccionado) return;
    setCompararNiveles(true);
    const nuevasSelecciones = nivelesSinGlobalEtapa.map((nivel, idx) => ({
      id: idx,
      trimestre: trimestreSeleccionado,
      nivel,
      asignatura: asignaturaComparada
    })).filter(sel => {
      // En modo TODOS, buscar el trimestre apropiado para cada nivel
      const trimestreParaNivel = modoEtapa === 'TODOS'
        ? getBestTrimestre(sel.trimestre, sel.nivel, trimestresDisponibles, detectarEtapa)
        : sel.trimestre;
      // Solo incluir si el nivel tiene esa asignatura (considerando equivalencias)
      return tieneAsignatura(datosCompletos, trimestreParaNivel, sel.nivel, sel.asignatura);
    });
    setSelecciones(nuevasSelecciones);
  }, [trimestreSeleccionado, nivelesSinGlobalEtapa, asignaturaComparada, datosCompletos, modoEtapa, detectarEtapa, trimestresDisponibles]);

  // Desactivar comparación de niveles
  const desactivarCompararNiveles = useCallback(() => {
    setCompararNiveles(false);
    if (datosCompletos[trimestreSeleccionado]?.['GLOBAL']) {
      setSelecciones([{
        id: 0,
        trimestre: trimestreSeleccionado,
        nivel: 'GLOBAL',
        asignatura: 'Todos'
      }]);
    }
  }, [trimestreSeleccionado, datosCompletos]);

  // Cambiar asignatura comparada
  const cambiarAsignaturaComparada = useCallback((nuevaAsignatura) => {
    setAsignaturaComparada(nuevaAsignatura);
    if (compararNiveles) {
      const nuevasSelecciones = nivelesSinGlobalEtapa.map((nivel, idx) => ({
        id: idx,
        trimestre: trimestreSeleccionado,
        nivel,
        asignatura: nuevaAsignatura
      })).filter(sel => {
        // En modo TODOS, buscar el trimestre apropiado para cada nivel
        const trimestreParaNivel = modoEtapa === 'TODOS'
          ? getBestTrimestre(sel.trimestre, sel.nivel, trimestresDisponibles, detectarEtapa)
          : sel.trimestre;
        // Solo incluir si el nivel tiene esa asignatura (considerando equivalencias)
        return tieneAsignatura(datosCompletos, trimestreParaNivel, sel.nivel, sel.asignatura);
      });
      setSelecciones(nuevasSelecciones);
    }
  }, [compararNiveles, nivelesSinGlobalEtapa, trimestreSeleccionado, datosCompletos, modoEtapa, detectarEtapa, trimestresDisponibles]);

  // Obtener asignaturas por nivel
  const getAsignaturas = useCallback((trimestre, nivel) => {
    if (!trimestre || !nivel || !datosCompletos[trimestre]?.[nivel]) return [];
    return Object.keys(datosCompletos[trimestre][nivel]);
  }, [datosCompletos]);

  // Gestión de selecciones
  const agregarSeleccion = useCallback(() => {
    if (selecciones.length >= 15) return;
    const nuevoId = Math.max(0, ...selecciones.map(s => s.id)) + 1;
    const nivel = nivelesDisponibles.find(n => n !== 'GLOBAL') || 'GLOBAL';
    const asignaturas = getAsignaturas(trimestreSeleccionado, nivel);
    setSelecciones(prev => [...prev, {
      id: nuevoId,
      trimestre: trimestreSeleccionado,
      nivel,
      asignatura: asignaturas[0] || ''
    }]);
  }, [selecciones, nivelesDisponibles, getAsignaturas, trimestreSeleccionado]);

  const eliminarSeleccion = useCallback((id) => {
    if (selecciones.length <= 1) return;
    setSelecciones(prev => prev.filter(s => s.id !== id));
  }, [selecciones.length]);

  const actualizarSeleccion = useCallback((id, campo, valor) => {
    setSelecciones(prev => prev.map(s => {
      if (s.id !== id) return s;
      const nueva = { ...s, [campo]: valor };
      
      // Si cambia trimestre o nivel, actualizar asignatura
      if (campo === 'trimestre' || campo === 'nivel') {
        const trim = campo === 'trimestre' ? valor : s.trimestre;
        const niv = campo === 'nivel' ? valor : s.nivel;
        const asigs = getAsignaturas(trim, niv);
        nueva.asignatura = asigs[0] || '';
      }
      
      return nueva;
    }));
  }, [getAsignaturas]);

  // Calcular datos de una seleccion
  const calcularDatosSeleccion = useCallback((sel) => {
    return datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
  }, [datosCompletos]);

  // Datos para gráfico de distribución
  const datosDistribucion = useMemo(() => {
    const chartData = [];
    for (let nota = 1; nota <= 10; nota++) {
      const punto = { nota: nota.toString() };
      selecciones.forEach((sel) => {
        const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
        if (datos) {
          const label = `${sel.trimestre} - ${sel.nivel} - ${sel.asignatura}`;
          const valorAbsoluto = datos.distribucion[nota] || 0;

          if (modoDistribucion === 'porcentaje') {
            const total = datos.stats.registros || 1;
            punto[label] = (valorAbsoluto / total * 100);
          } else {
            punto[label] = valorAbsoluto;
          }
        }
      });
      chartData.push(punto);
    }
    return chartData;
  }, [selecciones, datosCompletos, modoDistribucion]);

  // Correlaciones del trimestre seleccionado (con ordenación)
  const correlacionesTrimestre = useMemo(() => {
    if (!trimestreSeleccionado) return [];
    const corrs = correlacionesCompletas[trimestreSeleccionado] || [];
    
    if (ordenCorrelaciones === 'none') return corrs;
    
    return [...corrs].sort((a, b) => {
      const valA = a.Correlacion ?? 0;
      const valB = b.Correlacion ?? 0;
      return ordenCorrelaciones === 'desc' ? valB - valA : valA - valB;
    });
  }, [trimestreSeleccionado, correlacionesCompletas, ordenCorrelaciones]);

  // Tipos de correlaciones únicos para el gráfico de evolución
  const tiposCorrelacion = useMemo(() => {
    const tipos = new Set();
    Object.values(correlacionesCompletas).forEach(corrs => {
      corrs.forEach(c => {
        tipos.add(`${c.Asignatura1}-${c.Asignatura2}`);
      });
    });
    return Array.from(tipos);
  }, [correlacionesCompletas]);

  // Datos para gráfico de evolución de correlaciones
  const datosEvolucionCorrelaciones = useMemo(() => {
    if (tiposCorrelacion.length === 0) return [];

    // Función para abreviar nombres de asignaturas (case-insensitive)
    const abreviar = (nombre) => {
      const abreviaturas = {
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
      return abreviaturas[normalizar(nombre)] || nombre.substring(0, 3);
    };

    return tiposCorrelacion.map(tipo => {
      const [asig1, asig2] = tipo.split('-');
      const punto = {
        par: `${abreviar(asig1)}-${abreviar(asig2)}`,
        parCompleto: `${asig1} ↔ ${asig2}`
      };

      nivelesSinGlobalEtapa.forEach(nivel => {
        // Buscar en todos los trimestres
        Object.entries(correlacionesCompletas).forEach(([trim, corrs]) => {
          const corr = corrs.find(c => 
            c.Asignatura1 === asig1 && c.Asignatura2 === asig2 && c.Nivel === nivel
          );
          if (corr) {
            if (!punto[nivel]) punto[nivel] = {};
            punto[nivel] = corr.Correlacion;
          }
        });
      });

      return punto;
    });
  }, [tiposCorrelacion, correlacionesCompletas, nivelesSinGlobalEtapa]);

  // Datos alternativos para gráfico de evolución de correlaciones (eje X = niveles, líneas = pares)
  const datosEvolucionCorrelacionesAlt = useMemo(() => {
    if (tiposCorrelacion.length === 0) return [];

    // Función para abreviar nombres de asignaturas (case-insensitive)
    const abreviar = (nombre) => {
      const abreviaturas = {
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
      return abreviaturas[normalizar(nombre)] || nombre.substring(0, 3);
    };

    // Calcular promedio de correlaciones para cada par de asignaturas
    const promediosPares = {};
    tiposCorrelacion.forEach(tipo => {
      const [asig1, asig2] = tipo.split('-');
      let suma = 0;
      let count = 0;

      nivelesSinGlobalEtapa.forEach(nivel => {
        Object.entries(correlacionesCompletas).forEach(([trim, corrs]) => {
          const corr = corrs.find(c =>
            c.Asignatura1 === asig1 && c.Asignatura2 === asig2 && c.Nivel === nivel
          );
          if (corr && corr.Correlacion !== null) {
            suma += Math.abs(corr.Correlacion);
            count++;
          }
        });
      });

      promediosPares[tipo] = count > 0 ? suma / count : 0;
    });

    // Seleccionar los 10 pares más relevantes (mayor correlación promedio)
    const paresOrdenados = Object.entries(promediosPares)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tipo]) => tipo);

    // Crear estructura de datos con eje X = niveles
    return nivelesSinGlobalEtapa.map(nivel => {
      const punto = { nivel };

      paresOrdenados.forEach(tipo => {
        const [asig1, asig2] = tipo.split('-');
        const parAbreviado = `${abreviar(asig1)}-${abreviar(asig2)}`;

        // Buscar correlación en todos los trimestres para este nivel y par
        Object.entries(correlacionesCompletas).forEach(([trim, corrs]) => {
          const corr = corrs.find(c =>
            c.Asignatura1 === asig1 && c.Asignatura2 === asig2 && c.Nivel === nivel
          );
          if (corr) {
            punto[parAbreviado] = corr.Correlacion;
          }
        });
      });

      return punto;
    });
  }, [tiposCorrelacion, correlacionesCompletas, nivelesSinGlobalEtapa]);

  // Obtener pares de asignaturas para el modo alternativo
  const paresCorrelacionesAlt = useMemo(() => {
    if (datosEvolucionCorrelacionesAlt.length === 0) return [];

    const pares = new Set();
    datosEvolucionCorrelacionesAlt.forEach(punto => {
      Object.keys(punto).forEach(key => {
        if (key !== 'nivel') {
          pares.add(key);
        }
      });
    });

    return Array.from(pares);
  }, [datosEvolucionCorrelacionesAlt]);

  // Interpretar nivel de correlación
  const interpretarCorrelacion = useCallback((valor) => {
    if (valor < 0) return { nivel: t('inverse'), color: '#1a1a2e', textColor: 'white' };
    const abs = Math.abs(valor);
    if (abs >= 0.8) return { nivel: t('veryStrong'), color: '#065f46', textColor: 'white' };
    if (abs >= 0.6) return { nivel: t('strong'), color: '#059669', textColor: 'white' };
    if (abs >= 0.4) return { nivel: t('moderate'), color: '#fbbf24', textColor: 'black' };
    if (abs >= 0.2) return { nivel: t('weak'), color: '#f97316', textColor: 'white' };
    return { nivel: t('veryWeak'), color: '#ef4444', textColor: 'white' };
  }, [idioma]);

  // Función auxiliar para determinar si una asignatura es de especialidades
  const esAsignaturaEspecialidad = useCallback((asignatura, modo) => {
    // Lista completa de instrumentos para EPM (especialidades instrumentales) - en minúsculas
    const instrumentalesEPM = new Set([
      'arpa', 'acordeón', 'bajo eléctrico', 'canto', 'clarinete', 'clave',
      'contrabajo', 'dolçaina', 'fagot', 'flauta', 'flauta de pico', 'flauta travesera',
      'guitarra', 'guitarra eléctrica', 'guitarra electrica', 'oboe', 'órgano', 'percusión',
      'piano', 'saxofón', 'trombón', 'trompa', 'trompeta',
      'tuba', 'viola', 'viola da gamba', 'violín', 'violoncello', 'voz'
    ]);

    const asignaturaNorm = normalizar(asignatura);

    if (modo === 'EPM') {
      return instrumentalesEPM.has(asignaturaNorm);
    } else if (modo === 'EEM') {
      const excluirEEM = ['lenguaje musical', 'coro', 'conjunto', 'todos'];
      return !excluirEEM.includes(asignaturaNorm);
    } else {
      // Modo TODOS: incluir especialidades de ambas etapas
      const excluirTODOS = ['lenguaje musical', 'coro', 'conjunto', 'todos', 'teórica troncal'];
      return instrumentalesEPM.has(asignaturaNorm) || !excluirTODOS.includes(asignaturaNorm);
    }
  }, []);

  // Calcular KPIs globales del centro
  const kpisGlobales = useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) {
      return null;
    }

    const datos = datosCompletos[trimestreSeleccionado];
    const global = datos['GLOBAL'];
    if (!global || !global['Todos']) {
      return null;
    }

    // Asignaturas de referencia según modo (en TODOS: ambas)
    const asignaturasReferencia = modoEtapa === 'EPM' ? ['Teórica Troncal'] :
                                   modoEtapa === 'EEM' ? ['Lenguaje Musical'] :
                                   ['Lenguaje Musical', 'Teórica Troncal']; // TODOS: ambas

    // KPI 1: Nota media del centro (GLOBAL/Todos)
    const notaMediaCentro = global['Todos']?.stats?.notaMedia || 0;

    // KPI 2: Notas medias de asignaturas de referencia (case-insensitive)
    const notasMediasRef = asignaturasReferencia.map(asigBuscada => {
      // Buscar la asignatura en global de forma case-insensitive
      const asigEncontrada = Object.keys(global).find(key =>
        normalizar(key) === normalizar(asigBuscada)
      );
      return {
        asignatura: asigBuscada,
        notaMedia: asigEncontrada ? (global[asigEncontrada]?.stats?.notaMedia || 0) : 0,
        aprobados: asigEncontrada ? (global[asigEncontrada]?.stats?.aprobados || 0) : 0,
        suspendidos: asigEncontrada ? (global[asigEncontrada]?.stats?.suspendidos || 0) : 0
      };
    });

    // KPI 3: Nota media de Especialidades - usar función auxiliar
    let sumaNotasEsp = 0, sumaPesosEsp = 0;
    Object.entries(global).forEach(([asig, data]) => {
      if (esAsignaturaEspecialidad(asig, modoEtapa) && data?.stats) {
        sumaNotasEsp += data.stats.notaMedia * data.stats.registros;
        sumaPesosEsp += data.stats.registros;
      }
    });
    const notaMediaEsp = sumaPesosEsp > 0 ? sumaNotasEsp / sumaPesosEsp : 0;

    // KPI 4: Contador de asignaturas difíciles/fáciles
    // En modo TODOS, itera por TODOS los niveles (Piano EEM ≠ Piano EPM)
    let countDificiles = 0;
    let countFaciles = 0;
    Object.entries(datos).forEach(([nivel, asigs]) => {
      if (nivel === 'GLOBAL') return;
      // En modo TODOS no filtrar por etapa, en otros sí
      if (modoEtapa !== 'TODOS' && detectarEtapa(nivel) !== modoEtapa) return;

      Object.entries(asigs).forEach(([, data]) => {
        if (data?.stats && data.stats.registros >= umbrales.alumnosMinimo) {
          const resultado = calcularResultado(data.stats);
          if (resultado === 'DIFÍCIL') countDificiles++;
          if (resultado === 'FÁCIL') countFaciles++;
        }
      });
    });

    // KPI 5-6: % Aprobados (total y especialidades) - usar función auxiliar
    const aprobadosCentro = global['Todos']?.stats?.aprobados || 0;

    let sumaAprobadosEsp = 0, sumaPesosAprobadosEsp = 0;
    Object.entries(global).forEach(([asig, data]) => {
      if (esAsignaturaEspecialidad(asig, modoEtapa) && data?.stats) {
        sumaAprobadosEsp += data.stats.aprobados * data.stats.registros;
        sumaPesosAprobadosEsp += data.stats.registros;
      }
    });
    const aprobadosEsp = sumaPesosAprobadosEsp > 0 ? sumaAprobadosEsp / sumaPesosAprobadosEsp : 0;

    // KPI 7-8: % Suspendidos (total y especialidades) - usar función auxiliar
    const suspendidosCentro = global['Todos']?.stats?.suspendidos || 0;

    let sumaSuspendidosEsp = 0, sumaPesosSuspendidosEsp = 0;
    Object.entries(global).forEach(([asig, data]) => {
      if (esAsignaturaEspecialidad(asig, modoEtapa) && data?.stats) {
        sumaSuspendidosEsp += data.stats.suspendidos * data.stats.registros;
        sumaPesosSuspendidosEsp += data.stats.registros;
      }
    });
    const suspendidosEsp = sumaPesosSuspendidosEsp > 0 ? sumaSuspendidosEsp / sumaPesosSuspendidosEsp : 0;

    const result = {
      notaMediaCentro,
      notasMediasRef, // Array de objetos {asignatura, notaMedia, aprobados, suspendidos}
      notaMediaEsp,
      countDificiles,
      countFaciles,
      aprobadosCentro,
      aprobadosEsp,
      suspendidosCentro,
      suspendidosEsp,
      modoEtapa // Incluir para usar en UI
    };
    return result;
  }, [trimestreSeleccionado, datosCompletos, calcularResultado, modoEtapa, detectarEtapa, umbrales, esAsignaturaEspecialidad]);

  // Análisis de dificultad de asignaturas
  const analisisDificultad = useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) {
      return null;
    }

    const datos = datosCompletos[trimestreSeleccionado];
    const asignaturas = [];

    // Recopilar todas las asignaturas según vista (filtrar por modo de etapa)
    Object.entries(datos).forEach(([nivel, asigs]) => {
      // Si vista es 'niveles', excluir GLOBAL. Si es 'global', solo incluir GLOBAL
      if (vistaDificultad === 'niveles' && nivel === 'GLOBAL') return;
      if (vistaDificultad === 'global' && nivel !== 'GLOBAL') return;
      // Filtrar por etapa si no es GLOBAL (en modo TODOS no filtrar)
      if (nivel !== 'GLOBAL' && modoEtapa !== 'TODOS' && detectarEtapa(nivel) !== modoEtapa) return;

      Object.entries(asigs).forEach(([asig, data]) => {
        if (asig === 'Todos' || !data?.stats) return;

        // Filtrar por número mínimo de alumnos
        if (data.stats.registros < umbrales.alumnosMinimo) return;

        const stats = data.stats;
        const resultado = calcularResultado(stats);

        // Determinar categoría de dificultad
        let categoria = 'NEUTRAL';
        let razon = '';

        if (resultado === 'DIFÍCIL') {
          categoria = 'DIFÍCIL';
          const motivos = [];
          if (stats.suspendidos >= umbrales.suspensosAlerta) {
            motivos.push(`${(stats.suspendidos || 0).toFixed(1)}% de suspensos (umbral: ${umbrales.suspensosAlerta}%)`);
          }
          if (stats.notaMedia < umbrales.mediaCritica) {
            motivos.push(`nota media de ${(stats.notaMedia || 0).toFixed(2)} (umbral crítico: ${umbrales.mediaCritica})`);
          }
          razon = `Esta asignatura tiene ${motivos.join(' y/o ')}`;
        } else if (resultado === 'FÁCIL') {
          categoria = 'FÁCIL';
          const motivos = [];
          if (stats.aprobados >= umbrales.aprobadosMinimo) {
            motivos.push(`${(stats.aprobados || 0).toFixed(1)}% de aprobados (umbral: ${umbrales.aprobadosMinimo}%)`);
          }
          if (stats.notaMedia >= umbrales.mediaFacil) {
            motivos.push(`nota media de ${(stats.notaMedia || 0).toFixed(2)} (umbral fácil: ${umbrales.mediaFacil})`);
          }
          razon = `Esta asignatura tiene ${motivos.join(' y/o ')}`;
        } else {
          razon = `Esta asignatura se encuentra en un rango equilibrado con ${(stats.aprobados || 0).toFixed(1)}% de aprobados y una nota media de ${(stats.notaMedia || 0).toFixed(2)}`;
        }

        asignaturas.push({
          nivel,
          asignatura: asig,
          categoria,
          razon,
          notaMedia: stats.notaMedia,
          aprobados: stats.aprobados,
          suspendidos: stats.suspendidos
        });
      });
    });

    // Ordenar: DIFÍCIL primero, luego NEUTRAL, luego FÁCIL
    const ordenCategoria = { 'DIFÍCIL': 0, 'NEUTRAL': 1, 'FÁCIL': 2 };
    asignaturas.sort((a, b) => {
      if (ordenCategoria[a.categoria] !== ordenCategoria[b.categoria]) {
        return ordenCategoria[a.categoria] - ordenCategoria[b.categoria];
      }
      // Dentro de cada categoría, ordenar por nota media ascendente
      return a.notaMedia - b.notaMedia;
    });

    // Agrupar por categoría
    const dificiles = asignaturas.filter(a => a.categoria === 'DIFÍCIL');
    const neutrales = asignaturas.filter(a => a.categoria === 'NEUTRAL');
    const faciles = asignaturas.filter(a => a.categoria === 'FÁCIL');

    return { dificiles, neutrales, faciles, todas: asignaturas };
  }, [trimestreSeleccionado, datosCompletos, calcularResultado, umbrales, vistaDificultad, modoEtapa, detectarEtapa]);

  // Función para generar informe PDF
  const generarInformePDF = useCallback(() => {
    console.log('[PDF] Iniciando generación de informe...');

    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) {
      alert('No hay datos cargados para generar el informe');
      return;
    }

    setGenerandoInforme(true);

    // Usar setTimeout para permitir que el UI se actualice
    setTimeout(() => {
      try {
        console.log('[PDF] Creando documento PDF...');
        const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let currentPage = 1;

      // Función auxiliar para añadir encabezado
      const addHeader = (pageNum) => {
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(configInforme.nombreCentro, margin, 10);
        pdf.text(`${t('reportTitle')} - ${trimestreSeleccionado}`, pageWidth - margin, 10, { align: 'right' });
        pdf.setTextColor(0);
      };

      // Función auxiliar para añadir pie de página
      const addFooter = (pageNum) => {
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Página ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 10, { align: 'right' });
        pdf.setTextColor(0);
      };

        // ========== PÁGINA DE PORTADA ==========
        console.log('[PDF] Generando portada...');
        pdf.setFillColor(30, 58, 138); // Azul oscuro
        pdf.rect(0, 0, pageWidth, 100, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(28);
        pdf.text(configInforme.nombreCentro, pageWidth / 2, 40, { align: 'center' });

        pdf.setFontSize(20);
        pdf.text(t('reportTitle'), pageWidth / 2, 55, { align: 'center' });

        pdf.setFontSize(14);
        pdf.text(trimestreSeleccionado, pageWidth / 2, 70, { align: 'center' });

        pdf.setTextColor(0);
        pdf.setFontSize(12);
        pdf.text(`${t('academicYear')}: ${configInforme.cursoAcademico}`, pageWidth / 2, 120, { align: 'center' });

        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(`${t('reportFor')} ${new Date().toLocaleDateString()}`, pageWidth / 2, 270, { align: 'center' });
        pdf.setTextColor(0);

        // ========== TABLA DE KPIs ==========
        if (configInforme.incluirKPIs && kpisGlobales) {
          console.log('[PDF] Generando tabla de KPIs...');
        pdf.addPage();
        currentPage++;
        addHeader(currentPage);

        pdf.setFontSize(16);
        pdf.setTextColor(30, 58, 138);
        pdf.text(t('kpis'), margin, 25);
        pdf.setTextColor(0);

        // Construir datos de KPIs, incluyendo múltiples filas de referencia si hay
        const kpisData = [
          [t('kpiCenterAvg'), (kpisGlobales.notaMediaCentro || 0).toFixed(2)],
        ];

        // Agregar filas de notas medias de referencia
        kpisGlobales.notasMediasRef.forEach(ref => {
          kpisData.push([
            ref.asignatura === 'Teórica Troncal' ? t('kpiTTAvg') : t('kpiLMAvg'),
            (ref.notaMedia || 0).toFixed(2)
          ]);
        });

        kpisData.push(
          [t('kpiInstrAvg'), (kpisGlobales.notaMediaEsp || 0).toFixed(2)],
          [t('kpiDifficult'), kpisGlobales.countDificiles.toString()],
          [t('kpiEasy'), kpisGlobales.countFaciles.toString()],
          [t('kpiPassedAvg'), `${(kpisGlobales.aprobadosCentro || 0).toFixed(1)}%`]
        );

        // Agregar filas de aprobados de referencia
        kpisGlobales.notasMediasRef.forEach(ref => {
          kpisData.push([
            ref.asignatura === 'Teórica Troncal' ? t('kpiPassedTT') : t('kpiPassedLM'),
            `${(ref.aprobados || 0).toFixed(1)}%`
          ]);
        });

        kpisData.push(
          [t('kpiPassedInstr'), `${(kpisGlobales.aprobadosEsp || 0).toFixed(1)}%`],
          [t('kpiFailedAvg'), `${(kpisGlobales.suspendidosCentro || 0).toFixed(1)}%`]
        );

        // Agregar filas de suspendidos de referencia
        kpisGlobales.notasMediasRef.forEach(ref => {
          kpisData.push([
            ref.asignatura === 'Teórica Troncal' ? t('kpiFailedTT') : t('kpiFailedLM'),
            `${(ref.suspendidos || 0).toFixed(1)}%`
          ]);
        });

        kpisData.push([t('kpiFailedInstr'), `${(kpisGlobales.suspendidosEsp || 0).toFixed(1)}%`]);

        pdf.autoTable({
          startY: 35,
          head: [['Indicador', 'Valor']],
          body: kpisData,
          theme: 'striped',
          headStyles: { fillColor: [30, 58, 138], fontSize: 11, fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: margin, right: margin }
        });

          addFooter(currentPage);
        }

        // ========== TABLA DE CORRELACIONES ==========
        if (configInforme.incluirCorrelaciones && correlacionesTrimestre.length > 0) {
          console.log('[PDF] Generando tabla de correlaciones...');
        pdf.addPage();
        currentPage++;
        addHeader(currentPage);

        pdf.setFontSize(16);
        pdf.setTextColor(30, 58, 138);
        pdf.text(t('correlationsTitle'), margin, 25);
        pdf.setTextColor(0);

        const correlacionesData = correlacionesTrimestre.map((corr, idx) => [
          (idx + 1).toString(),
          corr.Nivel,
          corr.Asignatura1,
          corr.Asignatura2,
          (corr.Correlacion || 0).toFixed(3)
        ]);

        pdf.autoTable({
          startY: 35,
          head: [['#', 'Nivel', 'Asignatura 1', 'Asignatura 2', 'Corr.']],
          body: correlacionesData,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 138], fontSize: 10, fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 60 },
            3: { cellWidth: 60 },
            4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: margin, right: margin },
          didDrawPage: (data) => {
            if (data.pageNumber > currentPage) {
              currentPage = data.pageNumber;
              addHeader(currentPage);
            }
            addFooter(data.pageNumber);
            }
          });
        }

        // ========== TABLA DE TODAS LAS ASIGNATURAS CON ANÁLISIS ==========
        if (configInforme.incluirDificultad && analisisDificultad) {
          console.log('[PDF] Generando tabla de asignaturas...');
        pdf.addPage();
        currentPage++;
        addHeader(currentPage);

        pdf.setFontSize(16);
        pdf.setTextColor(30, 58, 138);
        pdf.text(t('subjectsData'), margin, 25);
        pdf.setTextColor(0);

        // Función para obtener color según categoría
        const getCategoryColor = (categoria) => {
          switch (categoria) {
            case 'DIFÍCIL': return [220, 38, 38]; // Rojo
            case 'FÁCIL': return [34, 197, 94]; // Verde
            default: return [148, 163, 184]; // Gris
          }
        };

        // Preparar datos de todas las asignaturas
        const asignaturasData = analisisDificultad.todas.map(asig => ({
          nivel: asig.nivel,
          asignatura: asig.asignatura,
          categoria: asig.categoria,
          notaMedia: (asig.notaMedia || 0).toFixed(2),
          aprobados: `${(asig.aprobados || 0).toFixed(1)}%`,
          suspendidos: `${(asig.suspendidos || 0).toFixed(1)}%`,
          razon: asig.razon
        }));

        // Generar tabla con todas las asignaturas
        pdf.autoTable({
          startY: 35,
          head: [['Nivel', 'Asignatura', 'Cat.', 'Media', 'Apr.', 'Susp.']],
          body: asignaturasData.map(asig => [
            asig.nivel,
            asig.asignatura,
            asig.categoria,
            asig.notaMedia,
            asig.aprobados,
            asig.suspendidos
          ]),
          theme: 'striped',
          headStyles: { fillColor: [30, 58, 138], fontSize: 9, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 70 },
            2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: 18, halign: 'right' },
            4: { cellWidth: 18, halign: 'right' },
            5: { cellWidth: 18, halign: 'right' }
          },
          margin: { left: margin, right: margin },
          didParseCell: (data) => {
            // Colorear la celda de categoría
            if (data.column.index === 2 && data.section === 'body') {
              const categoria = data.cell.raw;
              const color = getCategoryColor(categoria);
              data.cell.styles.textColor = color;
            }
          },
          didDrawPage: (data) => {
            if (data.pageNumber > currentPage) {
              currentPage = data.pageNumber;
              addHeader(currentPage);
            }
            addFooter(data.pageNumber);
          }
        });

        // Añadir sección de análisis detallado por categoría
        pdf.addPage();
        currentPage++;
        addHeader(currentPage);

        pdf.setFontSize(16);
        pdf.setTextColor(30, 58, 138);
        pdf.text(t('difficulty') + ' - ' + t('difficultyReason'), margin, 25);
        pdf.setTextColor(0);

        let yPos = 35;

        // Asignaturas Difíciles
        if (analisisDificultad.dificiles.length > 0) {
          pdf.setFontSize(12);
          pdf.setTextColor(220, 38, 38);
          pdf.text(`${t('difficultSubjects')} (${analisisDificultad.dificiles.length})`, margin, yPos);
          pdf.setTextColor(0);
          yPos += 8;

          analisisDificultad.dificiles.forEach(asig => {
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              currentPage++;
              addHeader(currentPage);
              yPos = 25;
            }

            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.text(`${asig.nivel} - ${asig.asignatura}`, margin + 5, yPos);
            pdf.setFont(undefined, 'normal');
            yPos += 5;

            pdf.setFontSize(9);
            pdf.setTextColor(80);
            const razonLines = pdf.splitTextToSize(asig.razon, pageWidth - 2 * margin - 10);
            pdf.text(razonLines, margin + 5, yPos);
            yPos += razonLines.length * 4 + 4;
            pdf.setTextColor(0);
          });

          yPos += 5;
        }

        // Asignaturas Fáciles
        if (analisisDificultad.faciles.length > 0) {
          if (yPos > pageHeight - 60) {
            pdf.addPage();
            currentPage++;
            addHeader(currentPage);
            yPos = 25;
          }

          pdf.setFontSize(12);
          pdf.setTextColor(34, 197, 94);
          pdf.text(`${t('easySubjects')} (${analisisDificultad.faciles.length})`, margin, yPos);
          pdf.setTextColor(0);
          yPos += 8;

          analisisDificultad.faciles.forEach(asig => {
            if (yPos > pageHeight - 40) {
              pdf.addPage();
              currentPage++;
              addHeader(currentPage);
              yPos = 25;
            }

            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.text(`${asig.nivel} - ${asig.asignatura}`, margin + 5, yPos);
            pdf.setFont(undefined, 'normal');
            yPos += 5;

            pdf.setFontSize(9);
            pdf.setTextColor(80);
            const razonLines = pdf.splitTextToSize(asig.razon, pageWidth - 2 * margin - 10);
            pdf.text(razonLines, margin + 5, yPos);
            yPos += razonLines.length * 4 + 4;
            pdf.setTextColor(0);
          });
        }

        addFooter(currentPage);
      }

        // Guardar PDF
        console.log('[PDF] Guardando archivo PDF...');
        const nombreArchivo = `Informe_${configInforme.nombreCentro.replace(/\s+/g, '_')}_${trimestreSeleccionado}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(nombreArchivo);
        console.log('[PDF] PDF generado exitosamente:', nombreArchivo);

        setMostrarModalInforme(false);
        setGenerandoInforme(false);
      } catch (error) {
        console.error('[PDF] Error al generar PDF:', error);
        console.error('[PDF] Stack trace:', error.stack);
        alert(`Error al generar el informe PDF: ${error.message}`);
        setGenerandoInforme(false);
      }
    }, 100);
  }, [trimestreSeleccionado, datosCompletos, configInforme, kpisGlobales, correlacionesTrimestre, analisisDificultad, t]);

  // Si no hay datos, mostrar pantalla de carga
  if (trimestresDisponibles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-8">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
          * { font-family: 'DM Sans', sans-serif; }
          h1, h2, h3 { font-family: 'DM Serif Display', serif; }
        `}</style>

        <div className="max-w-xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl text-slate-800 mb-4">{t('appTitle')}</h1>
            <p className="text-slate-500 text-lg">{t('appSubtitle')}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <h2 className="text-2xl text-slate-700 mb-6 text-center">{t('loadData')}</h2>

            <div className="space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 px-6 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all font-medium text-lg flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('loadCSV')}
              </button>

              <button
                onClick={() => jsonInputRef.current?.click()}
                className="w-full py-4 px-6 bg-white text-slate-700 rounded-xl border-2 border-slate-300 hover:border-slate-400 transition-all font-medium text-lg flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t('importJSON')}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCargarCSV}
              className="hidden"
            />
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              onChange={handleImportarJSON}
              className="hidden"
            />

            <div className="mt-8 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600 text-center">
                {t('csvInstructions')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-400 mt-8">
            {t('designedBy')} <a href="https://jlmirall.es" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-800 underline">José Luis Miralles Bono</a> {t('withHelpOf')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        h1, h2, h3 { font-family: 'DM Serif Display', serif; }
        select {
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23475569' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
        }
      `}</style>

      {/* Modal de Gestión de Datos */}
      {mostrarModalGestionDatos && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">{t('loadedData')}</h2>
              <button
                onClick={() => setMostrarModalGestionDatos(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Botones de acción */}
              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-w-[200px] py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('loadCSV')}
                </button>
                <button
                  onClick={() => jsonInputRef.current?.click()}
                  className="flex-1 min-w-[200px] py-3 px-4 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {t('importJSON')}
                </button>
              </div>

              {/* Lista de datos cargados */}
              {trimestresDisponibles.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-lg text-slate-500 mb-2">{t('noDataYet')}</p>
                  <p className="text-sm text-slate-400">{t('loadFirstDataset')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trimestresDisponibles.map(trim => {
                    const parsed = parseTrimestre(trim);
                    const etapa = parsed?.etapa;
                    const nivelCount = Object.keys(datosCompletos[trim] || {}).filter(n => n !== 'GLOBAL').length;

                    return (
                      <div
                        key={trim}
                        className={`border-2 rounded-xl p-4 transition-all ${
                          trim === trimestreSeleccionado
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-800 mb-1">
                              {formatearNombreTrimestre(trim)}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {etapa && (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  etapa === 'EEM' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {etapa === 'EEM' ? t('elementaryStage') : t('professionalStage')}
                                </span>
                              )}
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold">
                                {nivelCount} {nivelCount === 1 ? 'nivel' : 'niveles'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => eliminarTrimestre(trim)}
                            className="ml-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title={t('delete')}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {trim !== trimestreSeleccionado && (
                          <button
                            onClick={() => {
                              setTrimestreSeleccionado(trim);
                              setMostrarModalGestionDatos(false);
                            }}
                            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all"
                          >
                            Seleccionar
                          </button>
                        )}
                        {trim === trimestreSeleccionado && (
                          <div className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium text-center">
                            ✓ Actualmente seleccionado
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {mostrarModalConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-2xl text-slate-800 mb-4">{t('trimesterAlreadyLoaded')}</h3>
            <p className="text-slate-600 mb-6">
              {t('replaceConfirm').replace('{trimester}', trimestrePendiente ? formatearNombreTrimestre(trimestrePendiente) : '')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelarReemplazo}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmarReemplazo}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium"
              >
                {t('replace')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-5xl text-slate-800 mb-2">{t('appTitle')}</h1>
              <p className="text-xl text-slate-600 font-medium">
                {metadata[trimestresDisponibles[0]]?.Centro || 'EEM'} ·
                Curso {metadata[trimestresDisponibles[0]]?.CursoAcademico || ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Selector de idioma */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setIdioma('es')}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                    idioma === 'es' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  ES
                </button>
                <button
                  onClick={() => setIdioma('va')}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                    idioma === 'va' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  VA
                </button>
              </div>

              {/* Selector de modo de etapa (EEM/EPM/TODOS) */}
              {etapasDisponibles.length > 1 && (
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  {etapasDisponibles.map(etapa => (
                    <button
                      key={etapa}
                      onClick={() => setModoEtapa(etapa)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                        modoEtapa === etapa ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {etapa === 'TODOS' ? t('allStages') : t(`${etapa.toLowerCase()}Short`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMostrarModalGestionDatos(true)}
              className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              {t('manageData')}
            </button>
            <button
              onClick={exportarJSON}
              className="py-2 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all text-sm font-medium"
            >
              {t('exportJSON')}
            </button>
            <button
              onClick={() => setMostrarModalInforme(true)}
              className="py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('generateReport')}
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCargarCSV} className="hidden" />
        <input ref={jsonInputRef} type="file" accept=".json" onChange={handleImportarJSON} className="hidden" />
      </div>

      {/* Navegación de vistas */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200 w-fit">
          {[
            { id: 'estadisticas', label: t('statistics') },
            { id: 'correlaciones', label: t('correlations') },
            { id: 'evolucion', label: t('evolution') },
            { id: 'dificultad', label: t('difficulty') },
            { id: 'asignaturas', label: t('subjectsData') }
          ].map(vista => (
            <button
              key={vista.id}
              onClick={() => setVistaActual(vista.id)}
              className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                vistaActual === vista.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {vista.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel de Umbrales */}
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => setMostrarPanelUmbrales(!mostrarPanelUmbrales)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-all"
        >
          <svg className={`w-4 h-4 transition-transform ${mostrarPanelUmbrales ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {t('configureThresholds')}
        </button>

        {mostrarPanelUmbrales && (
          <div className="mt-4 p-6 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-700">{t('thresholdConfig')}</span>
              <button
                onClick={() => setUmbrales({
                  suspensosAlerta: 30,
                  mediaCritica: 6,
                  mediaFacil: 8,
                  aprobadosMinimo: 90,
                  alumnosMinimo: 3
                })}
                className="text-xs py-1 px-3 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-all"
              >
                {t('restoreDefaults')}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('failedAlert')}</label>
                <input
                  type="number"
                  value={umbrales.suspensosAlerta}
                  onChange={(e) => setUmbrales(prev => ({ ...prev, suspensosAlerta: parseFloat(e.target.value) || 0 }))}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('criticalAvg')}</label>
                <input
                  type="number"
                  step="0.1"
                  value={umbrales.mediaCritica}
                  onChange={(e) => setUmbrales(prev => ({ ...prev, mediaCritica: parseFloat(e.target.value) || 0 }))}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('easyAvg')}</label>
                <input
                  type="number"
                  step="0.1"
                  value={umbrales.mediaFacil}
                  onChange={(e) => setUmbrales(prev => ({ ...prev, mediaFacil: parseFloat(e.target.value) || 0 }))}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('minPassed')}</label>
                <input
                  type="number"
                  value={umbrales.aprobadosMinimo}
                  onChange={(e) => setUmbrales(prev => ({ ...prev, aprobadosMinimo: parseFloat(e.target.value) || 0 }))}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t('minStudents')}</label>
                <input
                  type="number"
                  value={umbrales.alumnosMinimo}
                  onChange={(e) => setUmbrales(prev => ({ ...prev, alumnosMinimo: parseInt(e.target.value) || 0 }))}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded mr-2">{t('difficult')}</span>
              {t('failed')} ≥ {umbrales.suspensosAlerta}% o {t('average')} &lt; {umbrales.mediaCritica}
              <span className="mx-4">|</span>
              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded mr-2">{t('easy')}</span>
              {t('passed')} ≥ {umbrales.aprobadosMinimo}% o {t('average')} ≥ {umbrales.mediaFacil}
              <span className="mx-4">|</span>
              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded mr-2">Filtro</span>
              Solo asignaturas con ≥ {umbrales.alumnosMinimo} alumnos
            </div>
          </div>
        )}
      </div>

      {/* VISTA: ESTADÍSTICAS */}
      {vistaActual === 'estadisticas' && (
        <div className="max-w-7xl mx-auto">
          {/* Panel de KPIs Globales */}
          {kpisGlobales && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('kpis')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Nota Media del Centro */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-blue-700">{t('kpiCenterAvg')}</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-900">{(kpisGlobales.notaMediaCentro || 0).toFixed(2)}</div>
                </div>

                {/* Notas Medias de Referencia (LM y/o TT) */}
                {kpisGlobales.notasMediasRef.map((ref) => (
                  <div key={ref.asignatura} className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span className="text-xs font-medium text-purple-700">
                        {ref.asignatura === 'Teórica Troncal' ? t('kpiTTAvg') : t('kpiLMAvg')}
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-purple-900">
                      {(ref.notaMedia || 0).toFixed(2)}
                    </div>
                  </div>
                ))}

                {/* Nota Media Especialidades */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="text-xs font-medium text-amber-700">{t('kpiInstrAvg')}</span>
                  </div>
                  <div className="text-3xl font-bold text-amber-900">
                    {(kpisGlobales.notaMediaEsp || 0).toFixed(2)}
                  </div>
                </div>

                {/* Asignaturas Difíciles */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs font-medium text-red-700">{t('kpiDifficult')}</span>
                  </div>
                  <div className="text-3xl font-bold text-red-900">{kpisGlobales.countDificiles}</div>
                </div>

                {/* Asignaturas Fáciles */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <span className="text-xs font-medium text-green-700">{t('kpiEasy')}</span>
                  </div>
                  <div className="text-3xl font-bold text-green-900">{kpisGlobales.countFaciles}</div>
                </div>

                {/* % Aprobados Total */}
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-medium text-teal-700">{t('kpiPassedAvg')}</span>
                  </div>
                  <div className="text-3xl font-bold text-teal-900">{(kpisGlobales.aprobadosCentro || 0).toFixed(1)}%</div>
                </div>

                {/* % Aprobados Referencia (LM y/o TT) */}
                {kpisGlobales.notasMediasRef.map((ref) => (
                  <div key={ref.asignatura} className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span className="text-xs font-medium text-cyan-700">
                        {ref.asignatura === 'Teórica Troncal' ? t('kpiPassedTT') : t('kpiPassedLM')}
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-cyan-900">
                      {(ref.aprobados || 0).toFixed(1)}%
                    </div>
                  </div>
                ))}

                {/* % Aprobados Especialidades */}
                <div className="bg-gradient-to-br from-lime-50 to-lime-100 border border-lime-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="text-xs font-medium text-lime-700">{t('kpiPassedInstr')}</span>
                  </div>
                  <div className="text-3xl font-bold text-lime-900">
                    {(kpisGlobales.aprobadosEsp || 0).toFixed(1)}%
                  </div>
                </div>

                {/* % Suspendidos Total */}
                <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-xs font-medium text-rose-700">{t('kpiFailedAvg')}</span>
                  </div>
                  <div className="text-3xl font-bold text-rose-900">{(kpisGlobales.suspendidosCentro || 0).toFixed(1)}%</div>
                </div>

                {/* % Suspendidos Referencia (LM y/o TT) */}
                {kpisGlobales.notasMediasRef.map((ref) => (
                  <div key={ref.asignatura} className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span className="text-xs font-medium text-pink-700">
                        {ref.asignatura === 'Teórica Troncal' ? t('kpiFailedTT') : t('kpiFailedLM')}
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-pink-900">
                      {(ref.suspendidos || 0).toFixed(1)}%
                    </div>
                  </div>
                ))}

                {/* % Suspendidos Especialidades */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="text-xs font-medium text-orange-700">{t('kpiFailedInstr')}</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-900">
                    {(kpisGlobales.suspendidosEsp || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selectores */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{t('selections')}</h3>
              {!compararNiveles && selecciones.length < 15 && (
                <button
                  onClick={agregarSeleccion}
                  className="py-2 px-4 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-all"
                >
                  + {t('add')}
                </button>
              )}
            </div>

            {/* Opción de comparar niveles */}
            {todasLasAsignaturas.length > 0 && (
              <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">
                      {idioma === 'es'
                        ? `Comparar misma asignatura en todos los niveles (${
                            modoEtapa === 'EPM' ? '1EPM - 6EPM' :
                            modoEtapa === 'EEM' ? '1EEM - 4EEM' :
                            '1EEM - 4EEM, 1EPM - 6EPM'
                          })`
                        : `Comparar mateixa assignatura en tots els nivells (${
                            modoEtapa === 'EPM' ? '1EPM - 6EPM' :
                            modoEtapa === 'EEM' ? '1EEM - 4EEM' :
                            '1EEM - 4EEM, 1EPM - 6EPM'
                          })`
                      }
                    </span>
                    <button
                      onClick={() => compararNiveles ? desactivarCompararNiveles() : activarCompararNiveles()}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        compararNiveles ? 'bg-slate-800' : 'bg-slate-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        compararNiveles ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
                {compararNiveles && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-2 uppercase">{t('subjectToCompare')}</label>
                      <select
                        value={asignaturaComparada}
                        onChange={(e) => cambiarAsignaturaComparada(e.target.value)}
                        className="w-full md:w-64 py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm"
                      >
                        {todasLasAsignaturas.map(asig => (
                          <option key={asig} value={asig}>{asig}</option>
                        ))}
                      </select>
                    </div>

                    {/* Toggle Longitudinal vs Transversal */}
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
                      <span className="text-xs font-medium text-slate-500 uppercase">Tipo de Comparativa:</span>
                      <div className="inline-flex bg-slate-100 rounded-lg p-1">
                        <button
                          onClick={() => setTipoComparativa('longitudinal')}
                          className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                            tipoComparativa === 'longitudinal'
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {t('longitudinalComparison')}
                        </button>
                        <button
                          onClick={() => setTipoComparativa('transversal')}
                          className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                            tipoComparativa === 'transversal'
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {t('transversalComparison')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-3">
              {selecciones.map((sel, idx) => (
                <div
                  key={sel.id}
                  className="p-4 rounded-lg border-2"
                  style={{ borderColor: colores[idx % colores.length].line, backgroundColor: colores[idx % colores.length].bg }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colores[idx % colores.length].line }} />
                      <span className="text-sm font-semibold" style={{ color: colores[idx % colores.length].line }}>
                        {t('selection')} {idx + 1}
                      </span>
                    </div>
                    {!compararNiveles && selecciones.length > 1 && (
                      <button
                        onClick={() => eliminarSeleccion(sel.id)}
                        className="text-slate-400 hover:text-red-500 text-xl"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('trimester')}</label>
                      <select
                        value={sel.trimestre}
                        onChange={(e) => actualizarSeleccion(sel.id, 'trimestre', e.target.value)}
                        disabled={compararNiveles}
                        className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        {trimestresDisponibles.map(t => (
                          <option key={t} value={t}>{formatearNombreTrimestre(t)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('level')}</label>
                      <select
                        value={sel.nivel}
                        onChange={(e) => actualizarSeleccion(sel.id, 'nivel', e.target.value)}
                        disabled={compararNiveles}
                        className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        {Object.keys(datosCompletos[sel.trimestre] || {}).map(n => (
                          <option key={n} value={n}>{n === 'GLOBAL' ? `📊 ${t('global')}` : n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{t('subject')}</label>
                      <select
                        value={sel.asignatura}
                        onChange={(e) => actualizarSeleccion(sel.id, 'asignatura', e.target.value)}
                        disabled={compararNiveles}
                        className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        {getAsignaturas(sel.trimestre, sel.nivel).map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            {selecciones.map((sel, idx) => {
              const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
              if (!datos) return null;
              
              const resultado = calcularResultado(datos.stats);
              const base = selecciones[0];
              const datosBase = datosCompletos[base.trimestre]?.[base.nivel]?.[base.asignatura];
              
              // Generar descripción textual
              const generarDescripcion = () => {
                const { stats } = datos;
                const partes = [];
                
                // Análisis de nota media
                if (stats.notaMedia >= 8) {
                  partes.push(`Excelente rendimiento con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
                } else if (stats.notaMedia >= 7) {
                  partes.push(`Buen rendimiento con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
                } else if (stats.notaMedia >= 6) {
                  partes.push(`Rendimiento aceptable con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
                } else if (stats.notaMedia >= 5) {
                  partes.push(`Rendimiento ajustado con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
                } else {
                  partes.push(`Rendimiento bajo con una media de ${(stats.notaMedia || 0).toFixed(2)}`);
                }
                
                // Análisis de aprobados/suspendidos
                if (stats.aprobados === 100) {
                  partes.push('100% de aprobados');
                } else if (stats.aprobados >= 90) {
                  partes.push(`alto porcentaje de aprobados (${stats.aprobados}%)`);
                } else if (stats.suspendidos >= 20) {
                  partes.push(`atención: ${stats.suspendidos}% de suspensos`);
                }
                
                // Análisis de dispersión
                if (stats.desviacion <= 1) {
                  partes.push('notas muy homogéneas');
                } else if (stats.desviacion >= 2) {
                  partes.push('alta dispersión en las notas');
                }
                
                // Análisis de moda
                if (stats.moda) {
                  partes.push(`la nota más frecuente es ${stats.moda}`);
                }
                
                return partes.join('. ') + '.';
              };
              
              return (
                <div
                  key={sel.id}
                  className="bg-white rounded-xl border-2 p-4"
                  style={{ borderColor: colores[idx % colores.length].line }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colores[idx % colores.length].line }} />
                      <h4 className="font-semibold text-slate-800 text-sm">
                        {sel.trimestre} · {sel.nivel} · {sel.asignatura}
                      </h4>
                      {resultado && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          resultado === 'DIFÍCIL' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {resultado}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-8 gap-2 mb-3">
                    {[
                      { label: 'N', title: t('records'), key: 'registros', format: (v) => v },
                      { label: t('average'), title: t('average'), key: 'notaMedia', format: (v) => v?.toFixed(2) },
                      { label: 'σ', title: t('deviation'), key: 'desviacion', format: (v) => v?.toFixed(2) },
                      { label: t('mode'), title: t('mode'), key: 'moda', format: (v) => v ?? '—' },
                      { label: t('passed'), title: `% ${t('passed')}`, key: 'aprobados', format: (v) => `${v?.toFixed(0)}%` },
                      { label: t('failed'), title: `% ${t('failed')}`, key: 'suspendidos', format: (v) => `${v?.toFixed(0)}%` },
                      { label: `${t('mode')} ${t('passed')}`, title: t('passedMode'), key: 'modaAprobados', format: (v) => v ?? '—' },
                      { label: `${t('mode')} ${t('failed')}`, title: t('failedMode'), key: 'modaSuspendidos', format: (v) => v ?? '—' }
                    ].map(({ label, title, key, format }) => {
                      const valor = datos.stats[key];
                      let diff = null;
                      if (idx > 0 && datosBase && ['notaMedia', 'aprobados', 'suspendidos'].includes(key)) {
                        diff = valor - datosBase.stats[key];
                      }

                      return (
                        <div key={key} className="bg-slate-50 rounded p-2 md:p-3 lg:p-4 text-center min-h-[60px] md:min-h-[70px] lg:min-h-[80px] flex flex-col justify-center" title={title}>
                          <div className="text-xs md:text-sm text-slate-500">{label}</div>
                          <div className="text-sm md:text-base lg:text-lg font-bold text-slate-800">{format(valor)}</div>
                          {diff !== null && (
                            <div className={`text-xs md:text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Descripción textual */}
                  <div className="text-xs text-slate-600 bg-slate-50 rounded p-2 italic">
                    {generarDescripcion()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Radar combinado de todas las selecciones */}
          {selecciones.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">{t('radarComparison')}</h3>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={(() => {
                  // Calcular datos del radar para cada selección
                  const metricas = ['Nota Media', `% ${t('passed')}`, `% ${t('excellence')}`, t('mode')];

                  return metricas.map((metrica, metricaIdx) => {
                    const punto = { subject: metrica };

                    selecciones.forEach((sel, idx) => {
                      if (idx >= 5) return; // Máximo 5 selecciones

                      const datos = calcularDatosSeleccion(sel);
                      if (!datos) return;

                      const label = `Sel ${idx + 1}`;

                      if (metricaIdx === 0) {
                        // Nota Media (normalizada 0-100)
                        punto[label] = (datos.stats.notaMedia / 10) * 100;
                      } else if (metricaIdx === 1) {
                        // % Aprobados (0-100)
                        punto[label] = datos.stats.aprobados;
                      } else if (metricaIdx === 2) {
                        // % Excelencia (0-100)
                        const registros = datos.stats.registros || 0;
                        punto[label] = registros > 0
                          ? ((datos.distribucion[9] || 0) + (datos.distribucion[10] || 0)) / registros * 100
                          : 0;
                      } else if (metricaIdx === 3) {
                        // Moda (normalizada 0-100)
                        punto[label] = datos.stats.moda ? (datos.stats.moda / 10) * 100 : 0;
                      }
                    });

                    return punto;
                  });
                })()}>
                  <PolarGrid stroke="#cbd5e1" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  {selecciones.slice(0, 5).map((sel, idx) => (
                    <Radar
                      key={sel.id}
                      name={`${sel.trimestre} - ${sel.nivel} - ${sel.asignatura}`}
                      dataKey={`Sel ${idx + 1}`}
                      stroke={colores[idx % colores.length].line}
                      fill={colores[idx % colores.length].line}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  ))}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                    formatter={(value) => (value || 0).toFixed(1)}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráficas de evolución para comparativa longitudinal */}
          {compararNiveles && tipoComparativa === 'longitudinal' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Evolución de la Nota Media */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('averageEvolution')}</h3>
                {(() => {
                  const datosEvolucion = nivelesSinGlobalEtapa.map(nivel => {
                    // En modo TODOS, buscar el trimestre apropiado para cada nivel
                    const trimestreParaNivel = modoEtapa === 'TODOS'
                      ? getBestTrimestre(trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa)
                      : trimestreSeleccionado;

                    const datos = datosCompletos[trimestreParaNivel]?.[nivel]?.[asignaturaComparada];
                    return {
                      nivel,
                      notaMedia: datos?.stats?.notaMedia || null
                    };
                  }).filter(d => d.notaMedia !== null);

                  const tendencia = calcularTendencia(datosEvolucion.map(d => d.notaMedia));
                  const infoTendencia = getTrendInfo(tendencia.tipo);

                  return (
                    <>
                      <div className="mb-4 flex items-center gap-2">
                        <span className="text-sm text-slate-600">{t('trend')}:</span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${infoTendencia.color} flex items-center gap-1`} title={infoTendencia.desc}>
                          <span>{tendencia.icono}</span>
                          <span>{infoTendencia.label}</span>
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={datosEvolucion}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="nivel" stroke="#64748b" />
                          <YAxis
                            stroke="#64748b"
                            domain={[0, 10]}
                            label={{
                              value: t('average'),
                              angle: -90,
                              position: 'insideLeft',
                              style: { textAnchor: 'middle', fill: '#64748b' }
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="notaMedia"
                            stroke="#2563eb"
                            strokeWidth={3}
                            dot={{ fill: '#2563eb', r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </>
                  );
                })()}
              </div>

              {/* Evolución del % de Suspensos */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('failedEvolution')}</h3>
                {(() => {
                  const datosEvolucion = nivelesSinGlobalEtapa.map(nivel => {
                    // En modo TODOS, buscar el trimestre apropiado para cada nivel
                    const trimestreParaNivel = modoEtapa === 'TODOS'
                      ? getBestTrimestre(trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa)
                      : trimestreSeleccionado;

                    const datos = datosCompletos[trimestreParaNivel]?.[nivel]?.[asignaturaComparada];
                    return {
                      nivel,
                      suspendidos: datos?.stats?.suspendidos || null
                    };
                  }).filter(d => d.suspendidos !== null);

                  const tendencia = calcularTendencia(datosEvolucion.map(d => d.suspendidos));
                  const infoTendencia = getTrendInfo(tendencia.tipo);

                  return (
                    <>
                      <div className="mb-4 flex items-center gap-2">
                        <span className="text-sm text-slate-600">{t('trend')}:</span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${infoTendencia.color} flex items-center gap-1`} title={infoTendencia.desc}>
                          <span>{tendencia.icono}</span>
                          <span>{infoTendencia.label}</span>
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={datosEvolucion}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="nivel" stroke="#64748b" />
                          <YAxis
                            stroke="#64748b"
                            domain={[0, 100]}
                            label={{
                              value: '% Suspensos',
                              angle: -90,
                              position: 'insideLeft',
                              style: { textAnchor: 'middle', fill: '#64748b' }
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="suspendidos"
                            stroke="#dc2626"
                            strokeWidth={3}
                            dot={{ fill: '#dc2626', r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Gráfico de distribución */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{t('gradeDistribution')}</h3>
              <div className="inline-flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setModoDistribucion('porcentaje')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoDistribucion === 'porcentaje'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('distributionPercentage')}
                </button>
                <button
                  onClick={() => setModoDistribucion('absoluto')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoDistribucion === 'absoluto'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('distributionAbsolute')}
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={datosDistribucion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="nota" stroke="#64748b" />
                <YAxis
                  stroke="#64748b"
                  label={{
                    value: modoDistribucion === 'porcentaje' ? '% Alumnos' : 'Cantidad',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#64748b' }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {selecciones.map((sel, idx) => {
                  const label = `${sel.trimestre} - ${sel.nivel} - ${sel.asignatura}`;
                  return (
                    <Line
                      key={sel.id}
                      type="monotone"
                      dataKey={label}
                      stroke={colores[idx % colores.length].line}
                      strokeWidth={2}
                      dot={{ fill: colores[idx % colores.length].line, r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla de distribución */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{t('distributionTable')}</h3>
              <div className="inline-flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setModoHeatmap('relativo')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoHeatmap === 'relativo'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('heatmapRelative')}
                </button>
                <button
                  onClick={() => setModoHeatmap('absoluto')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoHeatmap === 'absoluto'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('heatmapAbsolute')}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {(() => {
                // Calcular totales y máximos para el mapa de calor
                const totales = selecciones.map(sel => {
                  const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                  return datos ? Object.values(datos.distribucion).reduce((a, b) => a + b, 0) : 0;
                });

                // Calcular máximos según el modo
                let maxValorGlobal = 0;
                const maxValoresPorColumna = [];

                selecciones.forEach((sel) => {
                  const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                  let maxColumna = 0;
                  if (datos) {
                    Object.values(datos.distribucion).forEach(v => {
                      if (v > maxValorGlobal) maxValorGlobal = v;
                      if (v > maxColumna) maxColumna = v;
                    });
                  }
                  maxValoresPorColumna.push(maxColumna);
                });

                // Función para color del mapa de calor (rojo = alto, verde = bajo)
                const getHeatmapColor = (valor, max) => {
                  if (max === 0 || valor === 0) return 'transparent';
                  const intensity = valor / max;
                  // De verde claro (bajo) a rojo (alto)
                  if (intensity < 0.33) {
                    return `rgba(134, 239, 172, ${0.3 + intensity})`; // Verde claro
                  } else if (intensity < 0.66) {
                    return `rgba(253, 224, 71, ${0.3 + intensity * 0.5})`; // Amarillo
                  } else {
                    return `rgba(248, 113, 113, ${0.4 + intensity * 0.4})`; // Rojo
                  }
                };
                
                // Calcular agrupaciones
                const calcularAgrupacion = (dist) => {
                  const total = Object.values(dist).reduce((a, b) => a + b, 0);
                  const grupos = {
                    insuficiente: (dist[1] || 0) + (dist[2] || 0) + (dist[3] || 0) + (dist[4] || 0),
                    suficiente: dist[5] || 0,
                    bien: dist[6] || 0,
                    notable: (dist[7] || 0) + (dist[8] || 0),
                    excelente: (dist[9] || 0) + (dist[10] || 0)
                  };
                  const porcentajes = {
                    insuficiente: total > 0 ? (grupos.insuficiente / total * 100).toFixed(1) : '0.0',
                    suficiente: total > 0 ? (grupos.suficiente / total * 100).toFixed(1) : '0.0',
                    bien: total > 0 ? (grupos.bien / total * 100).toFixed(1) : '0.0',
                    notable: total > 0 ? (grupos.notable / total * 100).toFixed(1) : '0.0',
                    excelente: total > 0 ? (grupos.excelente / total * 100).toFixed(1) : '0.0'
                  };
                  return { grupos, porcentajes };
                };
                
                return (
                  <>
                    <table className="w-full mb-8">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="py-3 px-3 text-left text-sm font-semibold text-slate-600">{t('grade')}</th>
                          {selecciones.map((sel, idx) => (
                            <th key={sel.id} className="py-3 px-2 text-center text-xs font-semibold text-slate-700">
                              <div>{sel.trimestre} · {sel.nivel}</div>
                              <div className="font-normal text-slate-500">{sel.asignatura}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(nota => (
                          <tr key={nota} className="border-b border-slate-100">
                            <td className="py-2 px-3 font-medium text-slate-700">{nota}</td>
                            {selecciones.map((sel, idx) => {
                              const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                              const valor = datos?.distribucion[nota] || 0;
                              const total = totales[idx];
                              const porcentaje = total > 0 ? (valor / total * 100).toFixed(1) : '0.0';
                              const maxParaColor = modoHeatmap === 'relativo' ? maxValoresPorColumna[idx] : maxValorGlobal;
                              return (
                                <td
                                  key={sel.id}
                                  className="py-2 px-2 text-center"
                                  style={{ backgroundColor: getHeatmapColor(valor, maxParaColor) }}
                                >
                                  <span className="font-semibold text-slate-800">{valor}</span>
                                  <span className="text-xs text-slate-700 ml-1">({porcentaje}%)</span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-300 font-bold bg-slate-50">
                          <td className="py-3 px-3 text-slate-700">{t('total')}</td>
                          {selecciones.map((sel, idx) => (
                            <td key={sel.id} className="py-3 px-2 text-center text-slate-800">
                              {totales[idx]}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>

                    {/* Tabla de agrupaciones */}
                    <h4 className="text-md font-semibold text-slate-700 mb-3">{t('groupByGrade')}</h4>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="py-3 px-3 text-left text-sm font-semibold text-slate-600">{t('grade')}</th>
                          <th className="py-3 px-3 text-left text-xs font-normal text-slate-500">{t('grades')}</th>
                          {selecciones.map((sel, idx) => (
                            <th key={sel.id} className="py-3 px-2 text-center text-xs font-semibold text-slate-700">
                              {sel.trimestre} · {sel.nivel}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'insuficiente', label: t('insufficient'), notas: '1-4' },
                          { key: 'suficiente', label: t('sufficient'), notas: '5' },
                          { key: 'bien', label: t('good'), notas: '6' },
                          { key: 'notable', label: t('notable'), notas: '7-8' },
                          { key: 'excelente', label: t('excellent'), notas: '9-10' }
                        ].map(({ key, label, notas }) => (
                          <tr key={key} className="border-b border-slate-100">
                            <td className="py-2 px-3 font-medium text-slate-700">{label}</td>
                            <td className="py-2 px-3 text-xs text-slate-500">{notas}</td>
                            {selecciones.map((sel, idx) => {
                              const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                              if (!datos) return <td key={sel.id} className="py-2 px-2 text-center">—</td>;
                              const { grupos, porcentajes } = calcularAgrupacion(datos.distribucion);
                              return (
                                <td key={sel.id} className="py-2 px-2 text-center">
                                  <span className="font-semibold text-slate-800">{grupos[key]}</span>
                                  <span className="text-xs text-slate-800 ml-1">({porcentajes[key]}%)</span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Vista de Comparativa Transversal */}
          {compararNiveles && tipoComparativa === 'transversal' && (
            <div className="mt-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">{t('transversalComparison')} - {asignaturaComparada}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[asignaturaComparada].map(asignatura => {
                  // Calcular datos de evolución para esta asignatura
                  const datosNotaMedia = nivelesSinGlobalEtapa.map(nivel => {
                    const datos = datosCompletos[trimestreSeleccionado]?.[nivel]?.[asignatura];
                    return datos?.stats?.notaMedia || null;
                  }).filter(v => v !== null);

                  const datosSuspensos = nivelesSinGlobalEtapa.map(nivel => {
                    const datos = datosCompletos[trimestreSeleccionado]?.[nivel]?.[asignatura];
                    return datos?.stats?.suspendidos || null;
                  }).filter(v => v !== null);

                  // Calcular tendencias
                  const tendenciaMedia = calcularTendencia(datosNotaMedia);
                  const tendenciaSuspensos = calcularTendencia(datosSuspensos);

                  // Obtener info de tendencias
                  const infoMedia = getTrendInfo(tendenciaMedia.tipo);
                  const infoSuspensos = getTrendInfo(tendenciaSuspensos.tipo);

                  // Datos para los mini gráficos
                  const datosGraficoMedia = nivelesSinGlobalEtapa.map(nivel => {
                    const datos = datosCompletos[trimestreSeleccionado]?.[nivel]?.[asignatura];
                    return {
                      nivel,
                      valor: datos?.stats?.notaMedia || null
                    };
                  }).filter(d => d.valor !== null);

                  const datosGraficoSuspensos = nivelesSinGlobalEtapa.map(nivel => {
                    const datos = datosCompletos[trimestreSeleccionado]?.[nivel]?.[asignatura];
                    return {
                      nivel,
                      valor: datos?.stats?.suspendidos || null
                    };
                  }).filter(d => d.valor !== null);

                  if (datosNotaMedia.length === 0 && datosSuspensos.length === 0) return null;

                  return (
                    <div key={asignatura} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <h3 className="text-lg font-semibold text-slate-800 mb-4">{asignatura}</h3>

                      {/* Nota Media */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-600">{t('averageEvolution')}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${infoMedia.color} flex items-center gap-1`} title={infoMedia.desc}>
                            <span>{tendenciaMedia.icono}</span>
                            <span>{infoMedia.label}</span>
                          </span>
                        </div>
                        <ResponsiveContainer width="100%" height={120}>
                          <LineChart data={datosGraficoMedia}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="nivel" stroke="#64748b" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#64748b" domain={[0, 10]} tick={{ fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="valor"
                              stroke="#2563eb"
                              strokeWidth={2}
                              dot={{ fill: '#2563eb', r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* % Suspensos */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-600">{t('failedEvolution')}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${infoSuspensos.color} flex items-center gap-1`} title={infoSuspensos.desc}>
                            <span>{tendenciaSuspensos.icono}</span>
                            <span>{infoSuspensos.label}</span>
                          </span>
                        </div>
                        <ResponsiveContainer width="100%" height={120}>
                          <LineChart data={datosGraficoSuspensos}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="nivel" stroke="#64748b" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="valor"
                              stroke="#dc2626"
                              strokeWidth={2}
                              dot={{ fill: '#dc2626', r: 3 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* VISTA: CORRELACIONES */}
      {vistaActual === 'correlaciones' && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-slate-800">
                {t('correlationsTitle')} · {formatearNombreTrimestre(trimestreSeleccionado)}
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={trimestreSeleccionado}
                  onChange={(e) => setTrimestreSeleccionado(e.target.value)}
                  className="py-2 px-4 border border-slate-300 rounded-lg text-sm"
                >
                  {trimestresDisponibles.map(t => (
                    <option key={t} value={t}>{formatearNombreTrimestre(t)}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setOrdenCorrelaciones('desc')}
                    className={`py-1.5 px-3 text-xs font-medium rounded transition-all ${
                      ordenCorrelaciones === 'desc' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {t('sortDesc')}
                  </button>
                  <button
                    onClick={() => setOrdenCorrelaciones('asc')}
                    className={`py-1.5 px-3 text-xs font-medium rounded transition-all ${
                      ordenCorrelaciones === 'asc' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {t('sortAsc')}
                  </button>
                  <button
                    onClick={() => setOrdenCorrelaciones('none')}
                    className={`py-1.5 px-3 text-xs font-medium rounded transition-all ${
                      ordenCorrelaciones === 'none' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {t('noSort')}
                  </button>
                </div>
              </div>
            </div>

            {/* Leyenda compacta */}
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#1a1a2e' }}>&lt;0 {t('inverse')}</span>
              <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#065f46' }}>≥0,80 {t('veryStrong')}</span>
              <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#059669' }}>≥0,60 {t('strong')}</span>
              <span className="px-2 py-0.5 rounded" style={{ backgroundColor: '#fbbf24' }}>≥0,40 {t('moderate')}</span>
              <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#f97316' }}>≥0,20 {t('weak')}</span>
              <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#ef4444' }}>&lt;0,20 {t('veryWeak')}</span>
            </div>

            {correlacionesTrimestre.length === 0 ? (
              <p className="text-slate-500 text-center py-8">{t('noCorrelationData')}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                {correlacionesTrimestre.map((corr, idx) => {
                  const interp = interpretarCorrelacion(corr.Correlacion);
                  return (
                    <div 
                      key={idx} 
                      className="p-3 rounded-lg border border-slate-200 hover:shadow-md transition-all"
                      style={{ borderLeftWidth: '4px', borderLeftColor: interp.color }}
                    >
                      <div className="text-xs text-slate-400 mb-1">{corr.Nivel}</div>
                      <div className="text-sm font-semibold text-slate-800 leading-tight mb-2">
                        {corr.Asignatura1}
                        <span className="text-slate-400 mx-1">↔</span>
                        {corr.Asignatura2}
                      </div>
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-lg font-bold font-mono"
                          style={{ color: interp.color }}
                        >
                          {corr.Correlacion?.toFixed(2)}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: interp.color, color: interp.textColor }}
                        >
                          {interp.nivel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Gráfico de evolución de correlaciones por nivel */}
          {trimestresDisponibles.length >= 1 && correlacionesTrimestre.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">{t('correlationEvolution')}</h3>
                  <p className="text-sm text-slate-500">
                    {ejeCorrelaciones === 'pares' ? t('correlationEvolutionDesc') : 'El eje X muestra los niveles (1EEM-4EEM), cada línea representa un par de asignaturas'}
                  </p>
                </div>
                <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setEjeCorrelaciones('pares')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      ejeCorrelaciones === 'pares'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {t('correlationToggleSubjects')}
                  </button>
                  <button
                    onClick={() => setEjeCorrelaciones('niveles')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      ejeCorrelaciones === 'niveles'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {t('correlationToggleLevels')}
                  </button>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                {ejeCorrelaciones === 'pares' ? (
                  <LineChart data={datosEvolucionCorrelaciones} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="par"
                      stroke="#64748b"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      domain={[-0.2, 0.8]}
                      tickFormatter={(v) => (v || 0).toFixed(1)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value, name) => [value?.toFixed(2), name]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.parCompleto;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="1EEM"
                      name="1EEM"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="2EEM"
                      name="2EEM"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', r: 4 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="3EEM"
                      name="3EEM"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 4 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="4EEM"
                      name="4EEM"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ fill: '#a855f7', r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                ) : (
                  <LineChart data={datosEvolucionCorrelacionesAlt} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="nivel"
                      stroke="#64748b"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      domain={[-0.2, 0.8]}
                      tickFormatter={(v) => (v || 0).toFixed(1)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                      formatter={(value, name) => [value?.toFixed(2), name]}
                    />
                    <Legend />
                    {paresCorrelacionesAlt.map((par, idx) => {
                      const coloresLineas = [
                        '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f59e0b',
                        '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316'
                      ];
                      return (
                        <Line
                          key={par}
                          type="monotone"
                          dataKey={par}
                          name={par}
                          stroke={coloresLineas[idx % coloresLineas.length]}
                          strokeWidth={2}
                          dot={{ fill: coloresLineas[idx % coloresLineas.length], r: 4 }}
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* VISTA: EVOLUCIÓN */}
      {vistaActual === 'evolucion' && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('evolutionTitle')}</h3>

            {trimestresDisponibles.length < 2 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-2">{t('needTwoTrimesters')}</p>
                <p className="text-sm text-slate-400">{t('trimestersLoaded')}: {trimestresDisponibles.join(', ') || 'Ninguno'}</p>
              </div>
            ) : (
              <>
                {/* Selectores independientes para Evolución */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-slate-700">{t('selections')}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (seleccionesEvolucion.length < 15) {
                            setSeleccionesEvolucion([...seleccionesEvolucion, { nivel: 'GLOBAL', asignatura: 'Todos' }]);
                          }
                        }}
                        disabled={seleccionesEvolucion.length >= 15}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + {t('add')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {seleccionesEvolucion.map((sel, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-semibold text-slate-600 w-24">{t('selection')} {idx + 1}</span>

                        <select
                          value={sel.nivel}
                          onChange={(e) => {
                            const nuevas = [...seleccionesEvolucion];
                            nuevas[idx].nivel = e.target.value;
                            setSeleccionesEvolucion(nuevas);
                          }}
                          className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {nivelesDisponibles.map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>

                        <select
                          value={sel.asignatura}
                          onChange={(e) => {
                            const nuevas = [...seleccionesEvolucion];
                            nuevas[idx].asignatura = e.target.value;
                            setSeleccionesEvolucion(nuevas);
                          }}
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Todos">Todos</option>
                          {todasLasAsignaturas.map(a => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>

                        {seleccionesEvolucion.length > 1 && (
                          <button
                            onClick={() => {
                              setSeleccionesEvolucion(seleccionesEvolucion.filter((_, i) => i !== idx));
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gráfico de evolución de nota media */}
                {(() => {
                  // Colores para las diferentes selecciones
                  const colores = ['#1a1a2e', '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316', '#a855f7', '#f43f5e', '#84cc16', '#0ea5e9', '#f472b6'];

                  // Preparar datos combinados de todas las selecciones
                  const datosEvolucion = trimestresDisponibles.map(trim => {
                    const punto = { trimestre: trim };
                    seleccionesEvolucion.forEach((sel, idx) => {
                      const d = datosCompletos[trim]?.[sel.nivel]?.[sel.asignatura];
                      const label = `${sel.nivel}-${sel.asignatura}`;
                      punto[`notaMedia_${idx}`] = d?.stats?.notaMedia || null;
                      punto[`label_${idx}`] = label;
                    });
                    return punto;
                  });

                  // Verificar que haya al menos una selección con datos
                  const hayDatos = datosEvolucion.some(punto =>
                    seleccionesEvolucion.some((_, idx) => punto[`notaMedia_${idx}`] !== null)
                  );

                  if (!hayDatos) {
                    return (
                      <p className="text-slate-500 text-center py-8">
                        {t('notEnoughData')}
                      </p>
                    );
                  }

                  return (
                    <div>
                      <div className="mb-4">
                        <h4 className="text-md font-semibold text-slate-700 mb-2">{t('averageEvolution')}</h4>
                      </div>

                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={datosEvolucion}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="trimestre" stroke="#64748b" />
                          <YAxis stroke="#64748b" domain={[0, 10]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          {seleccionesEvolucion.map((sel, idx) => (
                            <Line
                              key={idx}
                              type="monotone"
                              dataKey={`notaMedia_${idx}`}
                              name={`${sel.nivel} - ${sel.asignatura}`}
                              stroke={colores[idx % colores.length]}
                              strokeWidth={3}
                              dot={{ fill: colores[idx % colores.length], r: 5 }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
              </>
            )}

            {/* ANÁLISIS TRANSVERSAL - Todas las Asignaturas */}
            {trimestreSeleccionado && (() => {
              // Obtener todas las asignaturas y calcular sus datos transversales
              const asignaturasConDatos = todasLasAsignaturas.map(asignatura => {
                const datosPorNivel = nivelesSinGlobalEtapa.map(nivel => {
                  // En modo TODOS, buscar el trimestre apropiado para cada nivel
                  const trimestreParaNivel = modoEtapa === 'TODOS'
                    ? getBestTrimestre(trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa)
                    : trimestreSeleccionado;

                  const datos = datosCompletos[trimestreParaNivel]?.[nivel]?.[asignatura];
                  return datos ? {
                    nivel,
                    notaMedia: datos.stats?.notaMedia || datos.notaMedia,
                    suspendidos: datos.stats ? (datos.stats.suspendidos) : ((datos.estadisticas?.suspendidos / datos.estadisticas?.alumnos * 100) || 0)
                  } : null;
                }).filter(Boolean);

                if (datosPorNivel.length < 2) return null;

                // Calcular tendencias
                const tendenciaMedia = calcularTendencia(datosPorNivel.map(d => d.notaMedia));
                const tendenciaSuspensos = calcularTendencia(datosPorNivel.map(d => d.suspendidos));

                return {
                  asignatura,
                  datosPorNivel,
                  tendenciaMedia,
                  tendenciaSuspensos
                };
              }).filter(Boolean);

              // Filtrar asignaturas según selección
              let asignaturasFiltradas = asignaturasTransversal.length > 0
                ? asignaturasConDatos.filter(item => asignaturasTransversal.includes(item.asignatura))
                : asignaturasConDatos;

              // Filtrar según los tipos de tendencia seleccionados
              let asignaturasConFiltro = asignaturasFiltradas.filter(item => {
                const cumpleFiltroMedia = filtroTendenciaMedia === 'all' || item.tendenciaMedia.tipo === filtroTendenciaMedia;
                const cumpleFiltroSuspensos = filtroTendenciaSuspensos === 'all' || item.tendenciaSuspensos.tipo === filtroTendenciaSuspensos;
                return cumpleFiltroMedia && cumpleFiltroSuspensos;
              });

              return (
                <div className="mt-8">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-slate-800">
                        {t('transversalComparison')} - {t('allSubjects')}
                      </h2>
                      <div className="flex items-center gap-4">
                        {/* Filtro por tendencia de nota media */}
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-slate-700">
                            {idioma === 'es' ? 'Filtrar nota media:' : 'Filtrar nota mitjana:'}
                          </label>
                          <select
                            value={filtroTendenciaMedia}
                            onChange={(e) => setFiltroTendenciaMedia(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">{t('allTrends')}</option>
                            <optgroup label={idioma === 'es' ? 'Tendencias lineales' : 'Tendències lineals'}>
                              <option value="estable">➖ {t('trendEstable')}</option>
                              <option value="creciente_sostenido">↗️ {t('trendCrecienteSostenido')}</option>
                              <option value="decreciente_sostenido">↘️ {t('trendDecrecienteSostenido')}</option>
                            </optgroup>
                            <optgroup label={idioma === 'es' ? 'Con curvatura' : 'Amb curvatura'}>
                              <option value="creciente_acelerado">🚀 {t('trendCrecienteAcelerado')}</option>
                              <option value="creciente_desacelerado">📈 {t('trendCrecienteDesacelerado')}</option>
                              <option value="decreciente_acelerado">📉 {t('trendDecrecienteAcelerado')}</option>
                              <option value="decreciente_desacelerado">⬇️ {t('trendDecrecienteDesacelerado')}</option>
                            </optgroup>
                            <optgroup label={idioma === 'es' ? 'Patrones especiales' : 'Patrons especials'}>
                              <option value="valle">↗️ {t('trendValle')}</option>
                              <option value="pico">⚠️ {t('trendPico')}</option>
                              <option value="oscilante">〰️ {t('trendOscilante')}</option>
                            </optgroup>
                            <optgroup label={idioma === 'es' ? 'Otros' : 'Altres'}>
                              <option value="irregular">❓ {t('trendIrregular')}</option>
                              <option value="insuficiente">📊 {t('trendInsuficiente')}</option>
                            </optgroup>
                          </select>
                        </div>

                        {/* Filtro por tendencia de suspensos */}
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-slate-700">
                            {idioma === 'es' ? 'Filtrar % suspensos:' : 'Filtrar % suspesos:'}
                          </label>
                          <select
                            value={filtroTendenciaSuspensos}
                            onChange={(e) => setFiltroTendenciaSuspensos(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="all">{t('allTrends')}</option>
                            <optgroup label={idioma === 'es' ? 'Tendencias lineales' : 'Tendències lineals'}>
                              <option value="estable">➖ {t('trendEstable')}</option>
                              <option value="creciente_sostenido">↗️ {t('trendCrecienteSostenido')}</option>
                              <option value="decreciente_sostenido">↘️ {t('trendDecrecienteSostenido')}</option>
                            </optgroup>
                            <optgroup label={idioma === 'es' ? 'Con curvatura' : 'Amb curvatura'}>
                              <option value="creciente_acelerado">🚀 {t('trendCrecienteAcelerado')}</option>
                              <option value="creciente_desacelerado">📈 {t('trendCrecienteDesacelerado')}</option>
                              <option value="decreciente_acelerado">📉 {t('trendDecrecienteAcelerado')}</option>
                              <option value="decreciente_desacelerado">⬇️ {t('trendDecrecienteDesacelerado')}</option>
                            </optgroup>
                            <optgroup label={idioma === 'es' ? 'Patrones especiales' : 'Patrons especials'}>
                              <option value="valle">↗️ {t('trendValle')}</option>
                              <option value="pico">⚠️ {t('trendPico')}</option>
                              <option value="oscilante">〰️ {t('trendOscilante')}</option>
                            </optgroup>
                            <optgroup label={idioma === 'es' ? 'Otros' : 'Altres'}>
                              <option value="irregular">❓ {t('trendIrregular')}</option>
                              <option value="insuficiente">📊 {t('trendInsuficiente')}</option>
                            </optgroup>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Selector de asignaturas para filtrar */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {idioma === 'es' ? 'Seleccionar asignaturas a mostrar:' : 'Seleccionar assignatures a mostrar:'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setAsignaturasTransversal([])}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            asignaturasTransversal.length === 0
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {t('allSubjects')}
                        </button>
                        {todasLasAsignaturas.map(asig => (
                          <button
                            key={asig}
                            onClick={() => {
                              if (asignaturasTransversal.includes(asig)) {
                                setAsignaturasTransversal(asignaturasTransversal.filter(a => a !== asig));
                              } else {
                                setAsignaturasTransversal([...asignaturasTransversal, asig]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              asignaturasTransversal.includes(asig)
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {asig}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Gráficas de evolución transversal por asignatura */}
                  <div className="space-y-8">
                    {asignaturasConFiltro.map(({ asignatura, datosPorNivel, tendenciaMedia, tendenciaSuspensos }) => (
                      <div key={asignatura} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="mb-6">
                          <h3 className="text-2xl font-bold text-slate-800 mb-2">{asignatura}</h3>
                          <p className="text-sm text-slate-600">
                            {idioma === 'es'
                              ? `Evolución de ${asignatura} a través de los niveles de ${modoEtapa === 'TODOS' ? 'todas las etapas' : modoEtapa}`
                              : `Evolució de ${asignatura} a través dels nivells de ${modoEtapa === 'TODOS' ? 'totes les etapes' : modoEtapa}`
                            }
                          </p>
                        </div>

                        {/* Gráfica de Nota Media */}
                        <div className="mb-8">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-slate-700">{t('averageEvolution')}</h4>
                            <span
                              className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${getTrendInfo(tendenciaMedia.tipo).color}`}
                              title={getTrendInfo(tendenciaMedia.tipo).desc}
                            >
                              <span className="text-base">{tendenciaMedia.icono}</span>
                              <span>{getTrendInfo(tendenciaMedia.tipo).label}</span>
                            </span>
                          </div>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={datosPorNivel} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis
                                dataKey="nivel"
                                stroke="#64748b"
                                style={{ fontSize: '14px', fontWeight: 500 }}
                              />
                              <YAxis
                                domain={[0, 10]}
                                stroke="#64748b"
                                style={{ fontSize: '14px' }}
                                label={{ value: t('average'), angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '2px solid #e2e8f0',
                                  borderRadius: '12px',
                                  padding: '12px',
                                  fontSize: '14px'
                                }}
                                formatter={(value) => [value?.toFixed(2), t('average')]}
                                labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                              />
                              <Line
                                type="monotone"
                                dataKey="notaMedia"
                                stroke="#1a1a2e"
                                strokeWidth={4}
                                dot={{ fill: '#1a1a2e', r: 6, strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 8 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Gráfica de % Suspendidos */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-slate-700">{t('failedEvolution')}</h4>
                            {(() => {
                              const infoSuspensos = getTrendInfo(tendenciaSuspensos.tipo);

                              return (
                                <span
                                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 ${infoSuspensos.color}`}
                                  title={infoSuspensos.desc}
                                >
                                  <span className="text-base">{tendenciaSuspensos.icono}</span>
                                  <span>{infoSuspensos.label}</span>
                                </span>
                              );
                            })()}
                          </div>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={datosPorNivel} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis
                                dataKey="nivel"
                                stroke="#64748b"
                                style={{ fontSize: '14px', fontWeight: 500 }}
                              />
                              <YAxis
                                domain={[0, 100]}
                                stroke="#64748b"
                                style={{ fontSize: '14px' }}
                                label={{ value: '% ' + t('failed'), angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '2px solid #e2e8f0',
                                  borderRadius: '12px',
                                  padding: '12px',
                                  fontSize: '14px'
                                }}
                                formatter={(value) => [`${value?.toFixed(1)}%`, '% ' + t('failed')]}
                                labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                              />
                              <Line
                                type="monotone"
                                dataKey="suspendidos"
                                stroke="#ef4444"
                                strokeWidth={4}
                                dot={{ fill: '#ef4444', r: 6, strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 8 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* VISTA: DIFICULTAD */}
      {vistaActual === 'dificultad' && analisisDificultad && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">{t('difficulty')}</h3>
              {/* Toggle Por Niveles / Global */}
              <div className="inline-flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setVistaDificultad('niveles')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    vistaDificultad === 'niveles'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('viewByLevels')}
                </button>
                <button
                  onClick={() => setVistaDificultad('global')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    vistaDificultad === 'global'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('viewGlobal')}
                </button>
              </div>
            </div>

            {/* Selector de trimestre */}
            <div className="mb-6 p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">
                {t('trimester')}: <span className="font-bold">{trimestreSeleccionado}</span>
              </span>
            </div>

            {/* Asignaturas Difíciles */}
            {analisisDificultad.dificiles.length > 0 && (
              <div className="mb-8">
                <h4 className="text-md font-semibold text-red-700 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  {t('difficultSubjects')} ({analisisDificultad.dificiles.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analisisDificultad.dificiles.map((asig, idx) => (
                    <div
                      key={idx}
                      className="bg-red-50 border-2 border-red-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-slate-800 text-sm break-words">
                            {asig.nivel} - {asig.asignatura}
                          </h5>
                        </div>
                        <span className="ml-2 px-2 py-1 bg-red-200 text-red-800 text-xs font-bold rounded shrink-0">
                          {t('difficult')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-slate-800">{(asig.notaMedia || 0).toFixed(2)}</div>
                          <div className="text-slate-500">{t('average')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('passed')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('failed')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Asignaturas Neutrales */}
            {analisisDificultad.neutrales.length > 0 && (
              <div className="mb-8">
                <h4 className="text-md font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-slate-400 rounded-full"></span>
                  {t('neutralSubjects')} ({analisisDificultad.neutrales.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analisisDificultad.neutrales.map((asig, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border-2 border-slate-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-slate-800 text-sm break-words">
                            {asig.nivel} - {asig.asignatura}
                          </h5>
                        </div>
                        <span className="ml-2 px-2 py-1 bg-slate-200 text-slate-800 text-xs font-bold rounded shrink-0">
                          {t('neutral')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-slate-800">{(asig.notaMedia || 0).toFixed(2)}</div>
                          <div className="text-slate-500">{t('average')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('passed')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('failed')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Asignaturas Fáciles */}
            {analisisDificultad.faciles.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-green-700 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  {t('easySubjects')} ({analisisDificultad.faciles.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analisisDificultad.faciles.map((asig, idx) => (
                    <div
                      key={idx}
                      className="bg-green-50 border-2 border-green-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-slate-800 text-sm break-words">
                            {asig.nivel} - {asig.asignatura}
                          </h5>
                        </div>
                        <span className="ml-2 px-2 py-1 bg-green-200 text-green-800 text-xs font-bold rounded shrink-0">
                          {t('easy')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-slate-800">{(asig.notaMedia || 0).toFixed(2)}</div>
                          <div className="text-slate-500">{t('average')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('passed')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                          <div className="text-slate-500">{t('failed')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA: DATOS DE ASIGNATURAS */}
      {vistaActual === 'asignaturas' && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('filterByTrimester')}</label>
                <select
                  value={filtroTrimestre}
                  onChange={(e) => setFiltroTrimestre(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="ALL">{t('allTrimesters')}</option>
                  {trimestresDisponibles.map(trim => (
                    <option key={trim} value={trim}>{formatearNombreTrimestre(trim)}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('filterByLevel')}</label>
                <select
                  value={filtroNivel}
                  onChange={(e) => setFiltroNivel(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="ALL">{t('allLevels')}</option>
                  <option value="GLOBAL">{t('global')}</option>
                  {['1EEM', '2EEM', '3EEM', '4EEM', '1EPM', '2EPM', '3EPM', '4EPM', '5EPM', '6EPM'].map(nivel => (
                    <option key={nivel} value={nivel}>{nivel}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid de asignaturas */}
            {(() => {
              // Recopilar todas las asignaturas según filtros
              const asignaturas = [];
              const trimestresAFiltrar = filtroTrimestre === 'ALL' ? trimestresDisponibles : [filtroTrimestre];

              trimestresAFiltrar.forEach(trimestre => {
                if (!datosCompletos[trimestre]) return;

                Object.entries(datosCompletos[trimestre]).forEach(([nivel, asigs]) => {
                  // Filtrar por nivel si no es ALL
                  if (filtroNivel !== 'ALL' && nivel !== filtroNivel) return;
                  // Si filtroNivel no es ALL ni GLOBAL, excluir GLOBAL
                  if (filtroNivel !== 'ALL' && filtroNivel !== 'GLOBAL' && nivel === 'GLOBAL') return;
                  // Si filtroNivel es ALL, excluir GLOBAL (no mezclar agregados con datos por nivel)
                  if (filtroNivel === 'ALL' && nivel === 'GLOBAL') return;

                  Object.entries(asigs).forEach(([asignatura, data]) => {
                    if (asignatura === 'Todos' || !data?.stats) return;

                    asignaturas.push({
                      trimestre,
                      nivel,
                      asignatura,
                      stats: data.stats,
                      resultado: calcularResultado(data.stats)
                    });
                  });
                });
              });

              const count = asignaturas.length;

              return (
                <>
                  <p className="text-sm text-slate-600 mb-4">
                    {t('showingSubjects').replace('{count}', count)}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {asignaturas.map((item, idx) => {
                      const { trimestre, nivel, asignatura, stats, resultado } = item;

                      // Determinar colores según resultado
                      let bgColor, borderColor, badgeBg, badgeText;
                      if (resultado === 'DIFÍCIL') {
                        bgColor = 'bg-red-50';
                        borderColor = 'border-red-200';
                        badgeBg = 'bg-red-100';
                        badgeText = 'text-red-700';
                      } else if (resultado === 'FÁCIL') {
                        bgColor = 'bg-green-50';
                        borderColor = 'border-green-200';
                        badgeBg = 'bg-green-100';
                        badgeText = 'text-green-700';
                      } else {
                        bgColor = 'bg-slate-50';
                        borderColor = 'border-slate-200';
                        badgeBg = 'bg-slate-100';
                        badgeText = 'text-slate-700';
                      }

                      // Formatear header sin redundancia
                      let headerText;
                      if (nivel === 'GLOBAL') {
                        headerText = `${trimestre} · ${nivel}`;
                      } else {
                        // Eliminar redundancia: 1EV-EEM 1EEM → 1EV 1EEM
                        const trimestreBase = getTrimestreBase(trimestre);
                        headerText = `${trimestreBase} · ${nivel}`;
                      }

                      return (
                        <div
                          key={`${trimestre}-${nivel}-${asignatura}-${idx}`}
                          className={`${bgColor} ${borderColor} border rounded-lg p-4 transition-all hover:shadow-md`}
                        >
                          {/* Header con badge */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-slate-600 mb-1">{headerText}</div>
                              <h4 className="text-sm font-bold text-slate-900 leading-tight">{asignatura}</h4>
                            </div>
                            <span className={`${badgeBg} ${badgeText} text-xs px-2 py-0.5 rounded font-medium ml-2`}>
                              {t(resultado === 'DIFÍCIL' ? 'difficult' : resultado === 'FÁCIL' ? 'easy' : 'neutral')}
                            </span>
                          </div>

                          {/* Métricas */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-600">{t('records')}:</span>
                              <span className="text-sm font-semibold text-slate-800">{stats.registros}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-600">{t('average')}:</span>
                              <span className="text-sm font-semibold text-slate-800">{(stats.notaMedia || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-600">{t('mode')}:</span>
                              <span className="text-sm font-semibold text-slate-800">{stats.moda || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-green-600">{t('passed')}:</span>
                              <span className="text-sm font-semibold text-green-700">{(stats.aprobados || 0).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-red-600">{t('failed')}:</span>
                              <span className="text-sm font-semibold text-red-700">{(stats.suspendidos || 0).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {count === 0 && (
                    <div className="text-center py-12">
                      <p className="text-slate-500">{t('noCorrelationData')}</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal de configuración de informe */}
      {mostrarModalInforme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">{t('reportConfig')}</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Nombre del centro */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('centerName')}
                </label>
                <input
                  type="text"
                  value={configInforme.nombreCentro}
                  onChange={(e) => setConfigInforme(prev => ({ ...prev, nombreCentro: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Curso académico */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('academicYear')}
                </label>
                <input
                  type="text"
                  value={configInforme.cursoAcademico}
                  onChange={(e) => setConfigInforme(prev => ({ ...prev, cursoAcademico: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Opciones de contenido */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800">Contenido del informe</h3>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configInforme.incluirKPIs}
                    onChange={(e) => setConfigInforme(prev => ({ ...prev, incluirKPIs: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">{t('includeKPIs')}</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configInforme.incluirDificultad}
                    onChange={(e) => setConfigInforme(prev => ({ ...prev, incluirDificultad: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">{t('includeDifficulty')}</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configInforme.incluirCorrelaciones}
                    onChange={(e) => setConfigInforme(prev => ({ ...prev, incluirCorrelaciones: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">{t('includeCorrelations')}</span>
                </label>
              </div>
            </div>

            {/* Botones */}
            <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
              <button
                onClick={() => setMostrarModalInforme(false)}
                disabled={generandoInforme}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all font-medium disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={generarInformePDF}
                disabled={generandoInforme}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {generandoInforme ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('generating')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t('generatePDF')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto mt-12 py-6 border-t border-slate-200">
        <p className="text-center text-sm text-slate-400">
          {t('designedBy')} <a href="https://jlmirall.es" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-800 underline">José Luis Miralles Bono</a> {t('withHelpOf')}
        </p>
      </footer>
    </div>
  );
};

export default DashboardAcademico;
