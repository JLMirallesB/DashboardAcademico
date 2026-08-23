import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ScatterChart, Scatter, ReferenceLine } from 'recharts';
import { translations } from './translations.js';
import { normalizar, getBestTrimestre, parseTrimestre, getTrimestreBase, getTrimestreEtapa, tieneAsignatura, perteneceAGrupo } from './utils.js';
import { UMBRALES_DEFAULT, COLORES_COMPARACION, INSTRUMENTALES_EPM, ASIGNATURAS_EXCLUIR_EEM, ASIGNATURAS_EXCLUIR_TODOS } from './constants.js';
import { formatearNombreTrimestre, abreviarAsignatura } from './utils/formatters.js';
import { parseCSV as parseCSVService } from './services/csvParser.js';
import { procesarDatos as procesarDatosService } from './services/dataProcessor.js';
import { exportarJSON as exportarJSONService, procesarImportacionJSON } from './services/dataIO.js';
import { useStatisticalCalculations } from './hooks/useStatisticalCalculations.js';
import { recordarIdioma } from './idioma.js';
import { analizarDificultad } from './nucleo/dificultad.js';
import { serieEvolucionSelecciones, serieEvolucionNiveles } from './nucleo/evolucion.js';
import { compararTrimestres, esAgregado, mismoMomento, cursosDe } from './nucleo/texto.js';
import { diferencia, decimalesDe } from './nucleo/comparacion.js';
import { paresDe, porPares, porNiveles, paresMasFuertes } from './nucleo/correlaciones.js';
import { useKPICalculation } from './hooks/useKPICalculation.js';
import KPICentro from './components/kpi/KPICentro.jsx';
import KPIDetalle from './components/kpi/KPIDetalle.jsx';
import KPIComparativa from './components/kpi/KPIComparativa.jsx';
import { HelpModal } from './components/modals/HelpModal.jsx';
import { ReportModal } from './components/modals/ReportModal.jsx';
import { MainLayout } from './components/layout/MainLayout.jsx';
import { PDFChartRenderer } from './components/pdf/PDFChartRenderer.jsx';
import { generarInformePDF } from './services/pdfGenerator.js';
import { captureChartAsImage, waitForRender } from './utils/chartCapture.js';

const buildAssetUrl = (path) => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${path}`;
};

const EXCEL_TEMPLATE_URLS = {
  eem: buildAssetUrl('data/ANALIZADOR_ELEMENTAL_V2.xlsx'),
  epm: buildAssetUrl('data/ANALIZADOR_PROFESIONAL_v2.xlsx')
};
const SUPPORT_URL = 'https://ko-fi.com/miralles';

const DashboardAcademico = () => {
  // Estado de idioma
  const [idioma, setIdioma] = useState('es');
  const t = (key) => translations[idioma][key];

  // Estado principal
  const [datosCompletos, setDatosCompletos] = useState({});
  const [correlacionesCompletas, setCorrelacionesCompletas] = useState({});
  const [agrupacionesCompletas, setAgrupacionesCompletas] = useState({});
  const [metadata, setMetadata] = useState({});
  const [trimestresDisponibles, setTrimestresDisponibles] = useState([]);
  
  // Umbrales configurables
  const [umbrales, setUmbrales] = useState(UMBRALES_DEFAULT);
  
  // UI State
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState(null);
  const [vistaActual, setVistaActual] = useState('kpis'); // 'kpis', 'dispersion', 'estadisticas', 'correlaciones', 'evolucion', 'dificultad', 'asignaturas'
  const [vistaKPI, setVistaKPI] = useState('centro'); // 'centro', 'detalle', 'comparativa'
  const [selecciones, setSelecciones] = useState([]);
  const [mostrarModalConfirm, setMostrarModalConfirm] = useState(false);
  const [trimestrePendiente, setTrimestrePendiente] = useState(null);
  const [datosPendientes, setDatosPendientes] = useState(null);
  // Estado mostrarPanelUmbrales eliminado - ahora manejado internamente por SidebarThresholds
  const [mostrarPanelCarga, setMostrarPanelCarga] = useState(true);
  const [mostrarModalGestionDatos, setMostrarModalGestionDatos] = useState(false);
  const [mostrarModalAyuda, setMostrarModalAyuda] = useState(false);
  const [compararNiveles, setCompararNiveles] = useState(false);
  const [asignaturaComparada, setAsignaturaComparada] = useState('Lenguaje Musical');
  const [ordenCorrelaciones, setOrdenCorrelaciones] = useState('desc'); // 'desc', 'asc', 'none'
  const [ejeCorrelaciones, setEjeCorrelaciones] = useState('niveles'); // 'pares' o 'niveles'
  const [modoHeatmap, setModoHeatmap] = useState('relativo'); // 'absoluto' o 'relativo'
  const [modoDistribucion, setModoDistribucion] = useState('porcentaje'); // 'absoluto' o 'porcentaje'

  // Filtros para vista de asignaturas
  const [filtroNivel, setFiltroNivel] = useState('ALL'); // 'ALL', 'GLOBAL', '1EEM', '2EEM', etc.
  const [filtroTrimestre, setFiltroTrimestre] = useState('ALL'); // 'ALL' o un trimestre específico
  const [filtroGrupo, setFiltroGrupo] = useState('ALL'); // 'ALL' o un grupo específico

  // Vista de dificultad: por niveles o global
  const [vistaDificultad, setVistaDificultad] = useState('niveles'); // 'niveles' o 'global'

  // Filtros de análisis transversal en Evolución
  const [filtroTendenciaMedia, setFiltroTendenciaMedia] = useState('all'); // 'all' o tipo de tendencia específico para nota media
  const [filtroTendenciaSuspensos, setFiltroTendenciaSuspensos] = useState('all'); // 'all' o tipo de tendencia específico para suspensos

  // Selecciones específicas para vista de evolución (independiente de estadísticas)
  const [seleccionesEvolucion, setSeleccionesEvolucion] = useState([
    { nivel: 'GLOBAL', asignatura: 'Total' }
  ]);
  const [asignaturasTransversal, setAsignaturasTransversal] = useState([]); // Asignaturas seleccionadas para comparativa transversal

  // Gestión de etapas educativas (EEM / EPM / TODOS)
  const [modoEtapa, setModoEtapa] = useState('EEM'); // 'EEM' | 'EPM' | 'TODOS'

  // Estado para zoom del mapa de dispersión (rangos de valores)
  const [zoomDispersion, setZoomDispersion] = useState({
    rangoMedia: { min: 0, max: 10 },
    rangoDesviacion: { min: 0, max: null } // null = automático
  });

  // Estado para nivel seleccionado en mapa de dispersión
  const [nivelDispersion, setNivelDispersion] = useState('GLOBAL');

  // Estado para filtro de número mínimo de alumnos en mapa de dispersión
  const [minAlumnosDispersion, setMinAlumnosDispersion] = useState(0);

  // Estado para generación de informes
  const [mostrarModalInforme, setMostrarModalInforme] = useState(false);
  const [generandoInforme, setGenerandoInforme] = useState(false);
  const [progresoInforme, setProgresoInforme] = useState('');
  const [renderPDFCharts, setRenderPDFCharts] = useState(false);
  const [configInforme, setConfigInforme] = useState({
    nombreCentro: 'Conservatorio Profesional de Música',
    cursoAcademico: '2024-2025',
    incluirPortada: true,
    incluirAnalisisGlobal: true,
    incluirKPIs: true,
    incluirMapaDispersion: true,
    incluirEvolucionCorrelaciones: true,
    incluirCorrelaciones: true,
    incluirComparativaTransversal: true,
    incluirDatosAsignaturas: true,
    incluirDificultad: true
  });

  // Refs para captura de gráficas para PDF
  const pdfChartRefs = useRef({
    scatterRef: null,
    correlationRef: null,
    transversalRef: null
  });

  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  // Colores para comparaciones
  const colores = COLORES_COMPARACION;

  // Función auxiliar para renderizar opciones de asignaturas con separador
  const renderOpcionesAsignaturas = useCallback((asignaturas) => {
    const tieneTotales = asignaturas.some(a => esAgregado(a));
    const indexPrimerNoTotal = asignaturas.findIndex(a => !esAgregado(a));

    return asignaturas.map((asig, idx) => {
      const esSeparador = tieneTotales && idx === indexPrimerNoTotal;
      if (esSeparador) {
        return (
          <React.Fragment key={asig}>
            <option disabled className="text-gray-400">──────────────</option>
            <option key={asig} value={asig}>{asig}</option>
          </React.Fragment>
        );
      }
      return <option key={asig} value={asig}>{asig}</option>;
    });
  }, []);

  /* ¿Hay más de un curso académico cargado? De eso depende que los rótulos
     tengan que decirlo. Con uno solo, escribir «25/26» en cada desplegable es
     ruido; con dos, no decirlo es dejar al usuario sin saber qué mira. */
  const hayVariosCursos = useMemo(
    () => cursosDe(trimestresDisponibles).length > 1, [trimestresDisponibles]);

  const rotuloTrimestre = useCallback(
    (trim) => formatearNombreTrimestre(trim, hayVariosCursos), [hayVariosCursos]);

  /* Se apunta fuera del árbol para que la red de seguridad de errores pueda
     dar el mensaje en el idioma correcto. Ver src/idioma.js. */
  useEffect(() => { recordarIdioma(idioma); }, [idioma]);

  // Custom hooks para cálculos estadísticos
  const { calcularResultado, calcularTendencia, getTrendInfo, detectarEtapa } =
    useStatisticalCalculations(umbrales, t);

  // Parser de CSV - usa servicio externo
  const parseCSV = useCallback((csvText) => {
    return parseCSVService(csvText);
  }, []);

  // Procesar datos parseados - usa servicio externo
  const procesarDatos = useCallback((parsed) => {
    return procesarDatosService(parsed);
  }, []);

  // Aplicar datos
  const aplicarDatos = useCallback((procesado) => {
    const { trimestre, metadata: meta, datos, correlaciones, agrupaciones } = procesado;

    setDatosCompletos(prev => ({
      ...prev,
      [trimestre]: datos
    }));

    setCorrelacionesCompletas(prev => ({
      ...prev,
      [trimestre]: correlaciones
    }));

    setAgrupacionesCompletas(prev => ({
      ...prev,
      [trimestre]: agrupaciones || {}
    }));

    setMetadata(prev => ({
      ...prev,
      [trimestre]: meta
    }));

    /* El orden cronológico lo decide el núcleo (`compararTrimestres`), que es
       el mismo criterio que usan la evolución y el informe. Estaba escrito a
       mano aquí y en el PDF con dos tablas distintas, y la de aquí no conocía
       el formato «1T/2T/3T» que el propio validador del proyecto documenta:
       todos empataban al final y el orden pasaba a ser el de CARGA, con lo que
       la evolución se dibujaba al revés y la tendencia salía con el signo
       cambiado. */
    setTrimestresDisponibles(prev => {
      const nuevos = prev.includes(trimestre) ? prev : [...prev, trimestre];
      return [...nuevos].sort(compararTrimestres);
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
        asignatura: 'Total'
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
      let procesado;
      try {
        procesado = procesarDatos(parsed);
      } catch (error) {
        if (error.message === 'ERROR_NO_TRIMESTER_METADATA') {
          alert(t('errorNoTrimesterMetadata'));
        } else {
          alert(error.message);
        }
        return;
      }

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
    
    /* Las agrupaciones también. Se quedaban dentro para siempre: borrar el
       único trimestre que traía la sección #AGRUPACIONES dejaba su mapa vivo,
       y el siguiente CSV sin esa sección seguía filtrando por unas familias
       que ya no venían de ningún fichero cargado. */
    setAgrupacionesCompletas(prev => {
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

  // Exportar JSON - usa servicio externo
  const exportarJSON = useCallback(() => {
    exportarJSONService({
      trimestresDisponibles,
      metadata,
      umbrales,
      datosCompletos,
      correlacionesCompletas,
      agrupacionesCompletas
    });
  }, [trimestresDisponibles, metadata, umbrales, datosCompletos, correlacionesCompletas, agrupacionesCompletas]);

  // Importar JSON - usa servicio externo
  const handleImportarJSON = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const resultado = procesarImportacionJSON(e.target.result);

        if (resultado.datosCompletos) setDatosCompletos(resultado.datosCompletos);
        if (resultado.correlacionesCompletas) setCorrelacionesCompletas(resultado.correlacionesCompletas);
        if (resultado.agrupacionesCompletas) setAgrupacionesCompletas(resultado.agrupacionesCompletas);
        if (resultado.umbrales) setUmbrales(resultado.umbrales);
        setMetadata(resultado.metadata);
        /* Se reordena al importar: el JSON guarda la lista tal como estaba
           cuando se exportó, y si aquello ya venía desordenado el desorden
           viajaba con el fichero. */
        setTrimestresDisponibles([...(resultado.trimestresDisponibles || [])].sort(compararTrimestres));

        if (resultado.trimestresDisponibles.length > 0) {
          setTrimestreSeleccionado(resultado.trimestresDisponibles[0]);
          if (resultado.seleccionInicial) {
            setSelecciones([resultado.seleccionInicial]);
          }
        }

        setMostrarPanelCarga(false);
      } catch (err) {
        alert(t('errorParsingJSON'));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  // Cargar datos de ejemplo
  const handleCargarEjemplo = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/ejemplo.json`);
      if (!response.ok) throw new Error('Error fetching example data');
      const jsonContent = await response.text();
      const resultado = procesarImportacionJSON(jsonContent);

      if (resultado.datosCompletos) setDatosCompletos(resultado.datosCompletos);
      if (resultado.correlacionesCompletas) setCorrelacionesCompletas(resultado.correlacionesCompletas);
      if (resultado.agrupacionesCompletas) setAgrupacionesCompletas(resultado.agrupacionesCompletas);
      if (resultado.umbrales) setUmbrales(resultado.umbrales);
      setMetadata(resultado.metadata);
      /* Ordenado, igual que al importar un JSON: la lista del fichero puede
         venir en cualquier orden y de ella sale el eje del tiempo. Aquí
         faltaba, y hoy no se notaba solo porque el ejemplo trae dos claves ya
         ordenadas. */
      const ordenados = [...resultado.trimestresDisponibles].sort(compararTrimestres);
      setTrimestresDisponibles(ordenados);

      if (ordenados.length > 0) {
        setTrimestreSeleccionado(ordenados[0]);
        if (resultado.seleccionInicial) {
          setSelecciones([resultado.seleccionInicial]);
        }
      }

      setMostrarPanelCarga(false);
    } catch (err) {
      console.error('Error loading example data:', err);
    }
  }, []);

  // Obtener niveles disponibles
  const nivelesDisponibles = useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) return [];

    // En modo TODOS, obtener niveles de todos los trimestres de la misma evaluación
    if (modoEtapa === 'TODOS') {
      const nivelesSet = new Set();

      // Buscar todos los trimestres de la misma evaluación
      trimestresDisponibles.forEach(trim => {
        if (mismoMomento(trim, trimestreSeleccionado) && datosCompletos[trim]) {
          Object.keys(datosCompletos[trim]).forEach(nivel => nivelesSet.add(nivel));
        }
      });

      return Array.from(nivelesSet);
    }

    // En modos EEM/EPM, solo niveles del trimestre seleccionado
    return Object.keys(datosCompletos[trimestreSeleccionado]);
  }, [trimestreSeleccionado, datosCompletos, modoEtapa, trimestresDisponibles]);

  // Obtener todas las asignaturas disponibles (excluyendo GLOBAL, filtradas por etapa)
  const todasLasAsignaturas = useMemo(() => {
    if (!trimestreSeleccionado) return [];
    const asignaturas = new Set();

    // En modo TODOS, buscar en todos los trimestres de la misma evaluación
    const trimestresABuscar = [];
    if (modoEtapa === 'TODOS') {
      trimestresDisponibles.forEach(t => {
        if (mismoMomento(t, trimestreSeleccionado)) {
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

    // Ordenar según criterio: Totales > Teórica Troncal > Especialidades > No Especialidades > Optativas
    const listaAsignaturas = Array.from(asignaturas);

    // Helper para verificar si es un total (case-insensitive)
    const totalesNorm = ['total', 'total especialidad', 'total no especialidad'];
    const esTotalAsig = (asig) => totalesNorm.includes(normalizar(asig));

    // Obtener agrupaciones del trimestre actual
    const agrupaciones = agrupacionesCompletas[trimestreSeleccionado] || {};

    // Clasificar asignaturas
    const clasificadas = {
      totales: [],
      teoricaTroncal: [],
      especialidades: [],
      noEspecialidades: [],
      optativas: []
    };

    // Helper para verificar grupos (acepta variantes con/sin espacio)
    const tieneGrupo = (grupos, nombreGrupo) => {
      const variantes = {
        'especialidad': ['especialidad'],
        'noespecialidad': ['noespecialidad', 'no especialidad', 'noesp'],
        'optativas': ['optativas', 'optativa'],
        'teoricatroncal': ['teoricatroncal', 'teórica troncal', 'teorica troncal']
      };
      const vars = variantes[nombreGrupo] || [nombreGrupo];
      return grupos.some(g => vars.includes(normalizar(g)));
    };

    listaAsignaturas.forEach(asig => {
      if (esTotalAsig(asig)) {
        clasificadas.totales.push(asig);
      } else if (normalizar(asig) === 'teórica troncal') {
        clasificadas.teoricaTroncal.push(asig);
      } else {
        // Verificar en agrupaciones
        const asigNorm = normalizar(asig);
        const grupos = agrupaciones[asigNorm] || [];

        if (tieneGrupo(grupos, 'especialidad')) {
          clasificadas.especialidades.push(asig);
        } else if (tieneGrupo(grupos, 'noespecialidad')) {
          clasificadas.noEspecialidades.push(asig);
        } else if (tieneGrupo(grupos, 'teoricatroncal')) {
          clasificadas.teoricaTroncal.push(asig);
        } else if (tieneGrupo(grupos, 'optativas') || grupos.length === 0) {
          // Si tiene grupo 'optativas' o no tiene ningún grupo conocido
          clasificadas.optativas.push(asig);
        } else {
          // Fallback: cualquier otra cosa va a optativas
          clasificadas.optativas.push(asig);
        }
      }
    });

    // Ordenar los totales en el orden específico: Total > Total Especialidad > Total No Especialidad
    const ordenTotales = ['total', 'total especialidad', 'total no especialidad'];
    const totalesOrdenados = clasificadas.totales.sort((a, b) => {
      const idxA = ordenTotales.indexOf(normalizar(a));
      const idxB = ordenTotales.indexOf(normalizar(b));
      return idxA - idxB;
    });

    // Ordenar alfabéticamente cada grupo
    clasificadas.teoricaTroncal.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    clasificadas.especialidades.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    clasificadas.noEspecialidades.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    clasificadas.optativas.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    // DEBUG: Ver clasificación

    return [
      ...totalesOrdenados,
      ...clasificadas.teoricaTroncal,
      ...clasificadas.especialidades,
      ...clasificadas.noEspecialidades,
      ...clasificadas.optativas
    ];
  }, [trimestreSeleccionado, datosCompletos, modoEtapa, detectarEtapa, trimestresDisponibles, normalizar, agrupacionesCompletas]);

  // Niveles sin GLOBAL para comparación
  const nivelesSinGlobal = useMemo(() => {
    return nivelesDisponibles.filter(n => n !== 'GLOBAL');
  }, [nivelesDisponibles]);

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
      const nuevasSelecciones = nivelesSinGlobalEtapa.map((nivel, idx) => {
        // En modo TODOS, buscar cualquier trimestre que tenga la asignatura para este nivel
        let trimestreParaNivel = trimestreSeleccionado;

        if (modoEtapa === 'TODOS') {
          // Buscar el trimestre correspondiente a la etapa del nivel
          const trimestreBest = getBestTrimestre(trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa);

          // Verificar si ese trimestre tiene la asignatura
          if (tieneAsignatura(datosCompletos, trimestreBest, nivel, asignaturaComparada)) {
            trimestreParaNivel = trimestreBest;
          } else {
            // Si no, buscar en TODOS los trimestres de esta etapa
            const etapaNivel = detectarEtapa(nivel);
            const trimestreConAsignatura = trimestresDisponibles.find(trim => {
              const parsed = parseTrimestre(trim);
              /* Del mismo CURSO ACADÉMICO, además de la misma etapa: sin
                 esa condición, con dos cursos cargados este respaldo podía
                 traer el fichero del año pasado y la comparación mezclaba
                 cursos bajo un rótulo que decía uno solo. */
              return parsed && parsed.etapa === etapaNivel &&
                     parsed.curso === (parseTrimestre(trimestreSeleccionado) || {}).curso &&
                     tieneAsignatura(datosCompletos, trim, nivel, asignaturaComparada);
            });
            if (trimestreConAsignatura) {
              trimestreParaNivel = trimestreConAsignatura;
            }
          }
        }

        return {
          id: idx,
          trimestre: trimestreParaNivel,
          nivel,
          asignatura: asignaturaComparada
        };
      }).filter(sel => {
        // Solo incluir si encontramos la asignatura
        return tieneAsignatura(datosCompletos, sel.trimestre, sel.nivel, sel.asignatura);
      });
      setSelecciones(nuevasSelecciones);
    }
  }, [modoEtapa, compararNiveles, trimestreSeleccionado, nivelesSinGlobalEtapa, asignaturaComparada, datosCompletos, trimestresDisponibles, detectarEtapa]);

  // Cambiar vista de KPI si está en comparativa y cambia a modo TODOS
  useEffect(() => {
    if (modoEtapa === 'TODOS' && vistaKPI === 'comparativa') {
      setVistaKPI('centro');
    }
  }, [modoEtapa, vistaKPI]);

  // Activar comparación de niveles
  const activarCompararNiveles = useCallback(() => {
    if (!trimestreSeleccionado) return;
    setCompararNiveles(true);
    const nuevasSelecciones = nivelesSinGlobalEtapa.map((nivel, idx) => {
      // En modo TODOS, buscar cualquier trimestre que tenga la asignatura para este nivel
      let trimestreParaNivel = trimestreSeleccionado;

      if (modoEtapa === 'TODOS') {
        // Buscar el trimestre correspondiente a la etapa del nivel
        const trimestreBest = getBestTrimestre(trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa);

        // Verificar si ese trimestre tiene la asignatura
        if (tieneAsignatura(datosCompletos, trimestreBest, nivel, asignaturaComparada)) {
          trimestreParaNivel = trimestreBest;
        } else {
          // Si no, buscar en TODOS los trimestres de esta etapa
          const etapaNivel = detectarEtapa(nivel);
          const trimestreConAsignatura = trimestresDisponibles.find(trim => {
            const parsed = parseTrimestre(trim);
            return parsed && parsed.etapa === etapaNivel &&
                   tieneAsignatura(datosCompletos, trim, nivel, asignaturaComparada);
          });
          if (trimestreConAsignatura) {
            trimestreParaNivel = trimestreConAsignatura;
          }
        }
      }

      return {
        id: idx,
        trimestre: trimestreParaNivel,
        nivel,
        asignatura: asignaturaComparada
      };
    }).filter(sel => {
      // Solo incluir si encontramos la asignatura
      return tieneAsignatura(datosCompletos, sel.trimestre, sel.nivel, sel.asignatura);
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
        asignatura: 'Total'
      }]);
    }
  }, [trimestreSeleccionado, datosCompletos]);

  // Cambiar asignatura comparada
  const cambiarAsignaturaComparada = useCallback((nuevaAsignatura) => {
    setAsignaturaComparada(nuevaAsignatura);
    if (compararNiveles) {
      const nuevasSelecciones = nivelesSinGlobalEtapa.map((nivel, idx) => {
        // En modo TODOS, buscar cualquier trimestre que tenga la asignatura para este nivel
        let trimestreParaNivel = trimestreSeleccionado;

        if (modoEtapa === 'TODOS') {
          // Buscar el trimestre correspondiente a la etapa del nivel
          const trimestreBest = getBestTrimestre(trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa);

          // Verificar si ese trimestre tiene la asignatura
          if (tieneAsignatura(datosCompletos, trimestreBest, nivel, nuevaAsignatura)) {
            trimestreParaNivel = trimestreBest;
          } else {
            // Si no, buscar en TODOS los trimestres de esta etapa
            const etapaNivel = detectarEtapa(nivel);
            const trimestreConAsignatura = trimestresDisponibles.find(trim => {
              const parsed = parseTrimestre(trim);
              return parsed && parsed.etapa === etapaNivel &&
                     tieneAsignatura(datosCompletos, trim, nivel, nuevaAsignatura);
            });
            if (trimestreConAsignatura) {
              trimestreParaNivel = trimestreConAsignatura;
            }
          }
        }

        return {
          id: idx,
          trimestre: trimestreParaNivel,
          nivel,
          asignatura: nuevaAsignatura
        };
      }).filter(sel => {
        // Solo incluir si encontramos la asignatura
        return tieneAsignatura(datosCompletos, sel.trimestre, sel.nivel, sel.asignatura);
      });
      setSelecciones(nuevasSelecciones);
    }
  }, [compararNiveles, nivelesSinGlobalEtapa, trimestreSeleccionado, datosCompletos, modoEtapa, detectarEtapa, trimestresDisponibles]);

  // Obtener grupos únicos disponibles para los trimestres filtrados
  const obtenerGruposDisponibles = () => {
    const gruposSet = new Set();
    const trimestresAConsiderar = filtroTrimestre === 'ALL'
      ? trimestresDisponibles
      : [filtroTrimestre];

    trimestresAConsiderar.forEach(trimestre => {
      const agrupacionesTrimestre = agrupacionesCompletas[trimestre];
      if (!agrupacionesTrimestre) return;

      Object.values(agrupacionesTrimestre).forEach(grupos => {
        if (Array.isArray(grupos)) {
          grupos.forEach(grupo => gruposSet.add(grupo));
        }
      });
    });

    return Array.from(gruposSet).sort();
  };

  // Obtener asignaturas por nivel (ordenadas: Totales > Teórica Troncal > Especialidades > No Especialidades > Optativas)
  const getAsignaturas = useCallback((trimestre, nivel) => {
    if (!trimestre || !nivel || !datosCompletos[trimestre]?.[nivel]) return [];
    const asignaturas = Object.keys(datosCompletos[trimestre][nivel]);

    // Helper para verificar si es un total (case-insensitive)
    const totalesNorm = ['total', 'total especialidad', 'total no especialidad'];
    const esTotalAsig = (asig) => totalesNorm.includes(normalizar(asig));

    // Obtener agrupaciones del trimestre
    const agrupaciones = agrupacionesCompletas[trimestre] || {};

    // Clasificar asignaturas
    const clasificadas = {
      totales: [],
      teoricaTroncal: [],
      especialidades: [],
      noEspecialidades: [],
      optativas: []
    };

    // Helper para verificar grupos (acepta variantes con/sin espacio)
    const tieneGrupo = (grupos, nombreGrupo) => {
      const variantes = {
        'especialidad': ['especialidad'],
        'noespecialidad': ['noespecialidad', 'no especialidad', 'noesp'],
        'optativas': ['optativas', 'optativa'],
        'teoricatroncal': ['teoricatroncal', 'teórica troncal', 'teorica troncal']
      };
      const vars = variantes[nombreGrupo] || [nombreGrupo];
      return grupos.some(g => vars.includes(normalizar(g)));
    };

    asignaturas.forEach(asig => {
      if (esTotalAsig(asig)) {
        clasificadas.totales.push(asig);
      } else if (normalizar(asig) === 'teórica troncal') {
        clasificadas.teoricaTroncal.push(asig);
      } else {
        const asigNorm = normalizar(asig);
        const grupos = agrupaciones[asigNorm] || [];

        if (tieneGrupo(grupos, 'especialidad')) {
          clasificadas.especialidades.push(asig);
        } else if (tieneGrupo(grupos, 'noespecialidad')) {
          clasificadas.noEspecialidades.push(asig);
        } else if (tieneGrupo(grupos, 'teoricatroncal')) {
          clasificadas.teoricaTroncal.push(asig);
        } else if (tieneGrupo(grupos, 'optativas') || grupos.length === 0) {
          clasificadas.optativas.push(asig);
        } else {
          clasificadas.optativas.push(asig);
        }
      }
    });

    // Ordenar los totales en el orden específico: Total > Total Especialidad > Total No Especialidad
    const ordenTotales = ['total', 'total especialidad', 'total no especialidad'];
    const totalesOrdenados = clasificadas.totales.sort((a, b) => {
      const idxA = ordenTotales.indexOf(normalizar(a));
      const idxB = ordenTotales.indexOf(normalizar(b));
      return idxA - idxB;
    });

    // Ordenar alfabéticamente cada grupo
    clasificadas.teoricaTroncal.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    clasificadas.especialidades.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    clasificadas.noEspecialidades.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    clasificadas.optativas.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    return [
      ...totalesOrdenados,
      ...clasificadas.teoricaTroncal,
      ...clasificadas.especialidades,
      ...clasificadas.noEspecialidades,
      ...clasificadas.optativas
    ];
  }, [datosCompletos, agrupacionesCompletas, normalizar]);

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

  /* Las correlaciones del trimestre SELECCIONADO.
     Antes se recorrían todos los trimestres cargados escribiendo en la misma
     clave, así que ganaba el último: con la primera evaluación en 0,82 y la
     segunda en 0,55 la gráfica enseñaba 0,55, sin decir que había descartado
     la otra, y si los ficheros se cargaban en otro orden el número cambiaba
     sin cambiar los datos. Ninguna de las dos gráficas tiene el tiempo como
     eje —una pone los pares y otra los niveles—, así que no había sitio donde
     poner el segundo trimestre. Ver `src/nucleo/correlaciones.js`. */
  const correlacionesDelTrimestre = useMemo(
    () => correlacionesCompletas[trimestreSeleccionado] || [],
    [correlacionesCompletas, trimestreSeleccionado]);

  const paresCorrelacion = useMemo(
    () => paresDe(correlacionesDelTrimestre, modoEtapa),
    [correlacionesDelTrimestre, modoEtapa]);

  const datosEvolucionCorrelaciones = useMemo(
    () => porPares(correlacionesDelTrimestre, paresCorrelacion, nivelesSinGlobalEtapa, abreviarAsignatura),
    [correlacionesDelTrimestre, paresCorrelacion, nivelesSinGlobalEtapa, abreviarAsignatura]);

  const datosEvolucionCorrelacionesAlt = useMemo(
    () => porNiveles(correlacionesDelTrimestre,
      paresMasFuertes(correlacionesDelTrimestre, paresCorrelacion, nivelesSinGlobalEtapa, 10),
      nivelesSinGlobalEtapa, abreviarAsignatura),
    [correlacionesDelTrimestre, paresCorrelacion, nivelesSinGlobalEtapa, abreviarAsignatura]);

  const paresCorrelacionesAlt = useMemo(() => {
    const pares = new Set();
    datosEvolucionCorrelacionesAlt.forEach(punto => {
      Object.keys(punto).forEach(key => { if (key !== 'nivel') pares.add(key); });
    });
    return Array.from(pares);
  }, [datosEvolucionCorrelacionesAlt]);

  // Interpretar nivel de correlación
  const interpretarCorrelacion = useCallback((valor) => {
    // Convertir a número si es string
    const numValor = typeof valor === 'number' ? valor : parseFloat(valor);
    if (isNaN(numValor)) return { nivel: 'N/A', color: '#94a3b8', textColor: 'white' };
    if (numValor < 0) return { nivel: t('inverse'), color: '#1a1a2e', textColor: 'white' };
    const abs = Math.abs(numValor);
    if (abs >= 0.8) return { nivel: t('veryStrong'), color: '#065f46', textColor: 'white' };
    if (abs >= 0.6) return { nivel: t('strong'), color: '#059669', textColor: 'white' };
    if (abs >= 0.4) return { nivel: t('moderate'), color: '#fbbf24', textColor: 'black' };
    if (abs >= 0.2) return { nivel: t('weak'), color: '#f97316', textColor: 'white' };
    return { nivel: t('veryWeak'), color: '#ef4444', textColor: 'white' };
  }, [idioma]);

  // Función auxiliar para determinar si una asignatura es de especialidades
  const esAsignaturaEspecialidad = useCallback((asignatura, modo) => {
    const asignaturaNorm = normalizar(asignatura);

    if (modo === 'EPM') {
      return INSTRUMENTALES_EPM.has(asignaturaNorm);
    } else if (modo === 'EEM') {
      return !ASIGNATURAS_EXCLUIR_EEM.includes(asignaturaNorm);
    } else {
      // Modo TODOS: incluir especialidades de ambas etapas
      return INSTRUMENTALES_EPM.has(asignaturaNorm) || !ASIGNATURAS_EXCLUIR_TODOS.includes(asignaturaNorm);
    }
  }, []);

  // Calcular KPIs globales del centro usando el hook optimizado
  const kpisGlobales = useKPICalculation(
    trimestreSeleccionado,
    datosCompletos,
    calcularResultado,
    umbrales,
    modoEtapa,
    esAsignaturaEspecialidad,
    detectarEtapa,
    trimestresDisponibles
  );

  // Análisis de dificultad de asignaturas
  /* El cálculo vive en `src/nucleo/dificultad.js`, sin React y probado en node.
     Antes eran 90 líneas dentro de este render, y por eso no había forma de
     ejercitarlo. */
  const analisisDificultad = useMemo(
    () => (trimestreSeleccionado && datosCompletos[trimestreSeleccionado])
      ? analizarDificultad(datosCompletos[trimestreSeleccionado],
          { umbrales, vista: vistaDificultad, modoEtapa })
      : null,
    [trimestreSeleccionado, datosCompletos, umbrales, vistaDificultad, modoEtapa]);

  // Datos de tendencias transversales para el PDF
  const tendenciasParaPDF = useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) return [];

    // Calcular tendencias para cada asignatura
    const tendencias = todasLasAsignaturas.map(asignatura => {
      const datosPorNivel = nivelesSinGlobalEtapa.map(nivel => {
        // En modo TODOS, buscar el trimestre apropiado para cada nivel
        const trimestreParaNivel = modoEtapa === 'TODOS'
          ? getBestTrimestre(trimestreSeleccionado, nivel, trimestresDisponibles, detectarEtapa)
          : trimestreSeleccionado;

        const datos = datosCompletos[trimestreParaNivel]?.[nivel]?.[asignatura];
        if (!datos) return null;

        return {
          nivel,
          notaMedia: datos.stats?.notaMedia || datos.notaMedia || 0,
          suspendidos: datos.stats?.suspendidos || 0
        };
      }).filter(Boolean);

      // Necesitamos al menos 2 puntos para calcular tendencia
      if (datosPorNivel.length < 2) return null;

      const tendenciaMedia = calcularTendencia(datosPorNivel.map(d => d.notaMedia));
      const tendenciaSuspensos = calcularTendencia(datosPorNivel.map(d => d.suspendidos));

      return {
        asignatura,
        tendenciaMedia,
        tendenciaSuspensos,
        numNiveles: datosPorNivel.length
      };
    }).filter(Boolean);

    return tendencias;
  }, [trimestreSeleccionado, datosCompletos, todasLasAsignaturas, nivelesSinGlobalEtapa, modoEtapa, trimestresDisponibles, detectarEtapa, calcularTendencia]);

  // Datos de evolución de notas medias por trimestre para el PDF
  // Datos de evolución de notas medias por trimestre para el PDF
  const datosEvolucionNotasPDF = useMemo(
    () => serieEvolucionNiveles({ trimestresDisponibles, datosCompletos, modoEtapa }),
    [trimestresDisponibles, datosCompletos, modoEtapa]);

  // Datos de distribución de notas por asignatura para el PDF
  // Para cada asignatura, muestra la distribución (1-10) con una línea por cada curso
  const datosDistribucionPDF = useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) return [];

    // Obtener las asignaturas únicas (filtradas por grupo si aplica)
    const filtroAgrupaciones = configInforme.filtroAgrupaciones;
    const tieneFiltrActivo = filtroAgrupaciones != null && filtroAgrupaciones.length > 0;
    const agrupacionesTrimestre = agrupacionesCompletas[trimestreSeleccionado] || {};

    // Recopilar asignaturas únicas y sus datos por nivel
    const asignaturasMap = {};
    nivelesSinGlobalEtapa.forEach(nivel => {
      const datosNivel = datosCompletos[trimestreSeleccionado]?.[nivel];
      if (!datosNivel) return;

      Object.entries(datosNivel).forEach(([asig, data]) => {
        if (esAgregado(asig)) return;
        if (!data?.distribucion) return;

        // Filtrar por grupo si hay filtro activo
        if (tieneFiltrActivo && !filtroAgrupaciones.some(grupo => perteneceAGrupo(asig, grupo, agrupacionesTrimestre))) {
          return;
        }

        if (!asignaturasMap[asig]) {
          asignaturasMap[asig] = {};
        }
        asignaturasMap[asig][nivel] = data.distribucion;
      });
    });

    // Convertir a formato para el gráfico
    const resultado = Object.entries(asignaturasMap)
      .filter(([, niveles]) => Object.keys(niveles).length >= 2) // Al menos 2 niveles para que tenga sentido
      .map(([asignatura, nivelesData]) => {
        const niveles = Object.keys(nivelesData).sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });

        // Construir datos para cada nota (1-10)
        const datos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(nota => {
          const punto = { nota };
          niveles.forEach(nivel => {
            const distribucion = nivelesData[nivel];
            const total = Object.values(distribucion).reduce((a, b) => a + b, 0);
            const valor = distribucion[nota] || 0;
            punto[nivel] = total > 0 ? (valor / total * 100) : 0;
          });
          return punto;
        });

        return { asignatura, datos, niveles };
      })
      .sort((a, b) => a.asignatura.localeCompare(b.asignatura, 'es', { sensitivity: 'base' }));

    return resultado;
  }, [trimestreSeleccionado, datosCompletos, nivelesSinGlobalEtapa, configInforme.filtroAgrupaciones, agrupacionesCompletas]);

  // Función para generar informe PDF (versión mejorada con gráficas)
  const handleGenerarInformePDF = useCallback(async () => {

    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) {
      alert(t('noDataForReport'));
      return;
    }

    setGenerandoInforme(true);
    setProgresoInforme(t('pdfCapturingCharts'));

    try {
      // Activar renderizado de gráficas ocultas
      setRenderPDFCharts(true);

      // Esperar a que las gráficas se rendericen
      await waitForRender(800);

      // Capturar gráficas como imágenes
      const chartImages = {};

      if (configInforme.incluirMapaDispersion && pdfChartRefs.current?.scatterRef?.current) {
        setProgresoInforme(t('pdfCapturingCharts') + ' (1/3)');
        chartImages.scatter = await captureChartAsImage(pdfChartRefs.current.scatterRef.current);
      }

      if (configInforme.incluirEvolucionCorrelaciones && pdfChartRefs.current?.correlationRef?.current) {
        setProgresoInforme(t('pdfCapturingCharts') + ' (2/3)');
        chartImages.correlationEvolution = await captureChartAsImage(pdfChartRefs.current.correlationRef.current);
      }

      // Capturar múltiples gráficas transversales
      if (configInforme.incluirComparativaTransversal && pdfChartRefs.current?.transversalRefs?.length > 0) {
        chartImages.transversalArray = [];
        const totalTransversal = pdfChartRefs.current.transversalRefs.length;
        for (let i = 0; i < totalTransversal; i++) {
          const refObj = pdfChartRefs.current.transversalRefs[i];
          if (refObj?.current) {
            setProgresoInforme(t('pdfCapturingCharts') + ` (${3 + i}/${2 + totalTransversal})`);
            const img = await captureChartAsImage(refObj.current);
            if (img) {
              chartImages.transversalArray.push(img);
            }
          }
        }
      }

      // Capturar gráfica de evolución de notas (si hay suficientes trimestres y está habilitado)
      if (configInforme.incluirEvolucionNotas && trimestresDisponibles.length >= 2 && pdfChartRefs.current?.evolutionRef?.current) {
        setProgresoInforme(t('pdfCapturingCharts') + ' (evolución)');
        chartImages.evolution = await captureChartAsImage(pdfChartRefs.current.evolutionRef.current);
      }

      // Capturar gráficas de distribución por asignatura
      if (configInforme.incluirDistribucionNotas && pdfChartRefs.current?.distributionRefs?.length > 0) {
        chartImages.distributionArray = [];
        const totalDistribution = pdfChartRefs.current.distributionRefs.length;
        for (let i = 0; i < totalDistribution; i++) {
          const refObj = pdfChartRefs.current.distributionRefs[i];
          if (refObj?.current) {
            setProgresoInforme(t('pdfCapturingCharts') + ` (distribución ${i + 1}/${totalDistribution})`);
            const img = await captureChartAsImage(refObj.current);
            if (img) {
              chartImages.distributionArray.push({
                image: img,
                asignatura: datosDistribucionPDF[i]?.asignatura || `Asignatura ${i + 1}`
              });
            }
          }
        }
      }

      // Desactivar renderizado de gráficas ocultas
      setRenderPDFCharts(false);

      // Generar PDF con el nuevo servicio
      await generarInformePDF({
        trimestreSeleccionado,
        datosCompletos,
        configInforme: { ...configInforme, modoEtapa },
        kpisGlobales,
        correlacionesTrimestre,
        analisisDificultad,
        agrupacionesCompletas: agrupacionesCompletas[trimestreSeleccionado] || {},
        tendenciasParaPDF,
        trimestresDisponibles,
        chartImages,
        t,
        onProgress: (msg) => setProgresoInforme(msg),
        onSuccess: () => {
          setMostrarModalInforme(false);
          setGenerandoInforme(false);
          setProgresoInforme('');
        },
        onError: (error) => {
          console.error('[PDF] Error:', error);
          alert(`${t('errorGeneratingPDF')}: ${error.message}`);
          setGenerandoInforme(false);
          setProgresoInforme('');
        }
      });
    } catch (error) {
      console.error('[PDF] Error al generar PDF:', error);
      alert(`${t('errorGeneratingPDF')}: ${error.message}`);
      setGenerandoInforme(false);
      setProgresoInforme('');
      setRenderPDFCharts(false);
    }
  }, [trimestreSeleccionado, datosCompletos, configInforme, modoEtapa, kpisGlobales, correlacionesTrimestre, analisisDificultad, agrupacionesCompletas, tendenciasParaPDF, trimestresDisponibles, datosDistribucionPDF, t]);

  // Datos calculados para las gráficas del PDF
  const datosDispersionPDF = useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) return [];

    const datos = [];
    const datosTrimestre = datosCompletos[trimestreSeleccionado];
    const filtroAgrupaciones = configInforme.filtroAgrupaciones;
    const tieneFiltrActivo = filtroAgrupaciones != null && filtroAgrupaciones.length > 0;
    const agrupacionesTrimestre = agrupacionesCompletas[trimestreSeleccionado] || {};

    // Función para verificar si una asignatura pertenece a los grupos filtrados
    const perteneceAGruposFiltrados = (asignatura) => {
      if (!tieneFiltrActivo) return true;
      return filtroAgrupaciones.some(grupo => perteneceAGrupo(asignatura, grupo, agrupacionesTrimestre));
    };

    // Obtener datos GLOBAL
    if (datosTrimestre?.['GLOBAL']) {
      Object.entries(datosTrimestre['GLOBAL']).forEach(([asig, data]) => {
        if (!esAgregado(asig) && data?.stats) {
          // Filtrar por grupo si hay filtro activo
          if (!perteneceAGruposFiltrados(asig)) return;

          datos.push({
            asignatura: asig,
            notaMedia: data.stats.notaMedia || 0,
            desviacion: data.stats.desviacion || 0,
            alumnos: data.stats.registros || 1
          });
        }
      });
    }

    return datos;
  }, [trimestreSeleccionado, datosCompletos, configInforme.filtroAgrupaciones, agrupacionesCompletas]);

  // Agrupaciones disponibles de todos los trimestres (para filtro en informe PDF)
  const agrupacionesDisponiblesPDF = useMemo(() => {
    const gruposSet = new Set();
    Object.values(agrupacionesCompletas).forEach(agrupacionesTrimestre => {
      if (!agrupacionesTrimestre) return;
      Object.values(agrupacionesTrimestre).forEach(grupos => {
        if (Array.isArray(grupos)) {
          grupos.forEach(grupo => gruposSet.add(grupo));
        }
      });
    });
    // Filtrar agrupaciones vacías o "0"
    return Array.from(gruposSet)
      .filter(grupo => grupo && grupo !== '0' && grupo.trim() !== '')
      .sort();
  }, [agrupacionesCompletas]);

  // Datos para gráficas de Comparativa Transversal (grupos de 10 asignaturas)
  const datosTransversalPDF = useMemo(() => {
    if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) return [];

    // Obtener asignaturas y niveles disponibles
    const asignaturasSet = new Set();
    const nivelesDisponibles = nivelesSinGlobalEtapa.filter(nivel => datosCompletos[trimestreSeleccionado]?.[nivel]);

    // Recopilar todas las asignaturas
    nivelesDisponibles.forEach(nivel => {
      const datosNivel = datosCompletos[trimestreSeleccionado]?.[nivel];
      if (datosNivel) {
        Object.keys(datosNivel).forEach(asig => {
          if (!esAgregado(asig)) {
            asignaturasSet.add(asig);
          }
        });
      }
    });

    const todasAsignaturas = Array.from(asignaturasSet).sort();
    if (todasAsignaturas.length === 0) return [];

    // Crear datos por nivel (con todas las asignaturas)
    const datosCompleto = nivelesDisponibles.map(nivel => {
      const punto = { nivel };
      todasAsignaturas.forEach(asig => {
        const datosAsig = datosCompletos[trimestreSeleccionado]?.[nivel]?.[asig];
        punto[asig] = datosAsig?.stats?.notaMedia || null;
      });
      return punto;
    });

    // Filtrar asignaturas que tienen al menos un dato
    const asignaturasConDatos = todasAsignaturas.filter(asig =>
      datosCompleto.some(d => d[asig] !== null)
    );

    // Dividir en grupos de 10 asignaturas
    const ASIGNATURAS_POR_GRUPO = 10;
    const grupos = [];
    for (let i = 0; i < asignaturasConDatos.length; i += ASIGNATURAS_POR_GRUPO) {
      const asignaturasGrupo = asignaturasConDatos.slice(i, i + ASIGNATURAS_POR_GRUPO);
      const numGrupo = Math.floor(i / ASIGNATURAS_POR_GRUPO) + 1;
      const totalGrupos = Math.ceil(asignaturasConDatos.length / ASIGNATURAS_POR_GRUPO);

      grupos.push({
        datos: datosCompleto,
        asignaturas: asignaturasGrupo,
        titulo: `Comparativa Transversal (${numGrupo}/${totalGrupos})`
      });
    }

    return grupos;
  }, [trimestreSeleccionado, datosCompletos, nivelesSinGlobalEtapa]);

  // Si no hay datos, mostrar pantalla de carga
  if (trimestresDisponibles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <style>{`
          * { font-family: 'DM Sans', sans-serif; }
          h1, h2, h3 { font-family: 'DM Serif Display', serif; }
        `}</style>

        <div className="max-w-xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl text-gray-900 mb-4">{t('appTitle')}</h1>
            <p className="text-gray-500 text-lg">{t('appSubtitle')}</p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-gray-200">
            <h2 className="text-2xl text-gray-900 mb-6 text-center">{t('loadData')}</h2>

            <div className="space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 px-6 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium text-lg flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('loadCSV')}
              </button>

              <button
                onClick={() => jsonInputRef.current?.click()}
                className="w-full py-4 px-6 bg-white text-gray-900 rounded-lg border-2 border-gray-900 hover:bg-gray-50 transition-colors font-medium text-lg flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t('importJSON')}
              </button>

              <button
                onClick={handleCargarEjemplo}
                className="w-full py-4 px-6 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-lg flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {t('loadExampleData')}
              </button>

              <button
                onClick={() => setMostrarModalAyuda(true)}
                className="w-full py-4 px-6 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-lg flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('helpButton')}
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

            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                {t('csvInstructions')}
              </p>
            </div>

            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="text-center mb-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {t('templatesTitle')}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {t('templatesSubtitle')}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={EXCEL_TEMPLATE_URLS.eem}
                  download
                  className="w-full py-3 px-4 bg-gray-100 text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-200 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {t('downloadTemplateEEM')}
                </a>
                <a
                  href={EXCEL_TEMPLATE_URLS.epm}
                  download
                  className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {t('downloadTemplateEPM')}
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-400 mt-8 space-y-2">
            <p>
              {t('designedBy')} <a href="https://jlmirall.es" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 underline">José Luis Miralles Bono</a> {t('withHelpOf')}
            </p>
            <p>
              {t('supportFooter')} <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 underline">{t('supportLink')}</a>
            </p>
          </div>
        </div>

        {/* Modal de Ayuda */}
        <HelpModal
          isOpen={mostrarModalAyuda}
          onClose={() => setMostrarModalAyuda(false)}
          idioma={idioma}
          t={t}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <style>{`
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
          <div className="bg-white rounded-xl border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('loadedData')}</h2>
              <button
                onClick={() => setMostrarModalGestionDatos(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                  className="flex-1 min-w-[200px] py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-black transition-all font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('loadCSV')}
                </button>
                <button
                  onClick={() => jsonInputRef.current?.click()}
                  className="flex-1 min-w-[200px] py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {t('importJSON')}
                </button>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-center mb-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {t('templatesTitle')}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('templatesSubtitle')}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href={EXCEL_TEMPLATE_URLS.eem}
                    download
                    className="w-full py-3 px-4 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {t('downloadTemplateEEM')}
                  </a>
                  <a
                    href={EXCEL_TEMPLATE_URLS.epm}
                    download
                    className="w-full py-3 px-4 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {t('downloadTemplateEPM')}
                  </a>
                </div>
              </div>

              {/* Lista de datos cargados */}
              {trimestresDisponibles.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-lg text-gray-500 mb-2">{t('noDataYet')}</p>
                  <p className="text-sm text-gray-400">{t('loadFirstDataset')}</p>
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
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {rotuloTrimestre(trim)}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {etapa && (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  etapa === 'EEM' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {etapa === 'EEM' ? t('elementaryStage') : t('professionalStage')}
                                </span>
                              )}
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
                                {nivelCount} {nivelCount === 1 ? 'nivel' : 'niveles'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => eliminarTrimestre(trim)}
                            className="ml-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
                            className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all"
                          >
                            Seleccionar
                          </button>
                        )}
                        {trim === trimestreSeleccionado && (
                          <div className="w-full py-2 px-3 bg-gray-900 text-white rounded-lg text-sm font-medium text-center">
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
          <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl text-gray-900 mb-4">{t('trimesterAlreadyLoaded')}</h3>
            <p className="text-gray-600 mb-6">
              {t('replaceConfirm').replace('{trimester}', trimestrePendiente ? rotuloTrimestre(trimestrePendiente) : '')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelarReemplazo}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
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

      {/* Inputs ocultos para carga de archivos */}
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCargarCSV} className="hidden" />
      <input ref={jsonInputRef} type="file" accept=".json" onChange={handleImportarJSON} className="hidden" />

      {/* Layout principal con Sidebar */}
      <MainLayout
        sidebarProps={{
          currentView: vistaActual,
          onViewChange: setVistaActual,
          currentStage: modoEtapa,
          availableStages: etapasDisponibles,
          onStageChange: setModoEtapa,
          thresholds: umbrales,
          onThresholdsChange: setUmbrales,
          language: idioma,
          onLanguageChange: setIdioma,
          actions: {
            onManageData: () => setMostrarModalGestionDatos(true),
            onExport: exportarJSON,
            onReport: () => setMostrarModalInforme(true),
            onHelp: () => setMostrarModalAyuda(true)
          },
          supportUrl: SUPPORT_URL,
          t
        }}
        headerProps={{
          /* Del fichero que se está mirando, no del primero de la lista. Con
             un solo curso cargado daba igual; en cuanto conviven dos —que es
             justo lo que este cambio hace posible— la cabecera decía «25/26»
             mientras la pantalla enseñaba los datos de 24/25. Una cifra
             plausible y falsa, que es la peor clase. */
          centerName: trimestreSeleccionado ? (metadata[trimestreSeleccionado]?.Centro || '') : '',
          academicYear: trimestreSeleccionado ? (metadata[trimestreSeleccionado]?.CursoAcademico || '') : '',
          currentTrimester: trimestreSeleccionado ? rotuloTrimestre(trimestreSeleccionado) : ''
        }}
      >
      {/* VISTA: INDICADORES (KPIs) */}
      {vistaActual === 'kpis' && (
        <div className="max-w-7xl mx-auto">
          {/* Panel de KPIs Globales con Navegación por Pestañas */}
          {kpisGlobales && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('kpis')}</h3>
                {/* Navegación por pestañas */}
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setVistaKPI('centro')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      vistaKPI === 'centro'
                        ? 'bg-white text-gray-900 '
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t('center') || 'Centro'}
                  </button>
                  <button
                    onClick={() => setVistaKPI('detalle')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      vistaKPI === 'detalle'
                        ? 'bg-white text-gray-900 '
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t('detail') || 'Detalle'}
                  </button>
                  {modoEtapa !== 'TODOS' && (
                    <button
                      onClick={() => setVistaKPI('comparativa')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        vistaKPI === 'comparativa'
                          ? 'bg-white text-gray-900 '
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {t('comparison') || 'Comparativa'}
                    </button>
                  )}
                </div>
              </div>

              {/* Renderizar componente según vista seleccionada */}
              {vistaKPI === 'centro' && <KPICentro kpis={kpisGlobales} t={t} modoEtapa={modoEtapa} />}
              {vistaKPI === 'detalle' && <KPIDetalle kpis={kpisGlobales} t={t} modoEtapa={modoEtapa} />}
              {vistaKPI === 'comparativa' && <KPIComparativa kpis={kpisGlobales} t={t} modoEtapa={modoEtapa} />}
            </div>
          )}

          {/* Aquí vivían 173 líneas de una sección de KPIs anterior, envuelta en
              `{false && …}` con el comentario «mantener por compatibilidad con
              el PDF». Nunca se renderizaba, así que el PDF no podía estar
              leyéndola: el informe se genera con jsPDF desde los datos, y lo
              único que captura del DOM son las gráficas, que están en sus
              propias vistas. Código muerto, retirado el 23/08/2026. */}
        </div>
      )}

      {/* VISTA: DISPERSIÓN */}
      {vistaActual === 'dispersion' && (
        <div className="max-w-7xl mx-auto">
          {/* Mapa de Dispersión: Nota Media vs Desviación Estándar */}
          {trimestreSeleccionado && (() => {
            // Recopilar datos de todas las asignaturas desde el nivel seleccionado
            const datosDispersion = [];

            if (nivelDispersion === 'GLOBAL') {
              // Mostrar datos de GLOBAL
              if (modoEtapa === 'TODOS') {
                // En modo TODOS: combinar datos de asignaturas con mismo nombre de ambas etapas
                const asignaturasCombinadas = new Map();

                // Buscar en todos los trimestres de la misma evaluación
                const trimestresABuscar = trimestresDisponibles.filter(t => mismoMomento(t, trimestreSeleccionado));

                trimestresABuscar.forEach(trim => {
                  const datosNivel = datosCompletos[trim]?.['GLOBAL'];
                  if (datosNivel) {
                    Object.entries(datosNivel).forEach(([asignatura, datos]) => {
                      if (!esAgregado(asignatura) && datos?.stats) {
                        if (!asignaturasCombinadas.has(asignatura)) {
                          asignaturasCombinadas.set(asignatura, {
                            asignatura,
                            notasAcumuladas: [],
                            alumnosTotales: 0
                          });
                        }
                        const asigData = asignaturasCombinadas.get(asignatura);

                        // Agregar las notas individuales si están disponibles
                        if (datos.stats.notaMedia && datos.stats.registros > 0) {
                          // Aproximar las notas individuales usando media y desviación
                          const numAlumnos = datos.stats.registros || 0;
                          asigData.notasAcumuladas.push({
                            media: datos.stats.notaMedia,
                            desviacion: datos.stats.desviacion || 0,
                            alumnos: numAlumnos
                          });
                          asigData.alumnosTotales += numAlumnos;
                        }
                      }
                    });
                  }
                });

                // Calcular media y desviación combinadas
                asignaturasCombinadas.forEach((asigData) => {
                  if (asigData.notasAcumuladas.length > 0 && asigData.alumnosTotales > 0) {
                    // Media ponderada
                    const mediaPonderada = asigData.notasAcumuladas.reduce((sum, grupo) =>
                      sum + (grupo.media * grupo.alumnos), 0) / asigData.alumnosTotales;

                    // Desviación estándar combinada (aproximación conservadora)
                    const desviacionCombinada = Math.sqrt(
                      asigData.notasAcumuladas.reduce((sum, grupo) => {
                        const varianza = Math.pow(grupo.desviacion, 2);
                        const difMedia = Math.pow(grupo.media - mediaPonderada, 2);
                        return sum + ((varianza + difMedia) * grupo.alumnos);
                      }, 0) / asigData.alumnosTotales
                    );

                    datosDispersion.push({
                      asignatura: asigData.asignatura,
                      notaMedia: mediaPonderada,
                      desviacion: desviacionCombinada,
                      alumnos: asigData.alumnosTotales
                    });
                  }
                });
              } else {
                // Modo EEM o EPM: datos GLOBAL del trimestre seleccionado
                const datosNivel = datosCompletos[trimestreSeleccionado]?.['GLOBAL'];
                if (datosNivel) {
                  Object.entries(datosNivel).forEach(([asignatura, datos]) => {
                    if (!esAgregado(asignatura) && datos?.stats) {
                      const notaMedia = datos.stats.notaMedia;
                      const desviacion = datos.stats.desviacion || 0;
                      const alumnos = datos.stats.registros || 0;

                      if (notaMedia !== undefined && alumnos > 0) {
                        datosDispersion.push({
                          asignatura,
                          notaMedia,
                          desviacion,
                          alumnos
                        });
                      }
                    }
                  });
                }
              }
            } else {
              // Mostrar datos de un nivel específico (1EEM, 2EPM, etc.)
              const datosNivel = datosCompletos[trimestreSeleccionado]?.[nivelDispersion];
              if (datosNivel) {
                Object.entries(datosNivel).forEach(([asignatura, datos]) => {
                  if (!esAgregado(asignatura) && datos?.stats) {
                    const notaMedia = datos.stats.notaMedia;
                    const desviacion = datos.stats.desviacion || 0;
                    const alumnos = datos.stats.registros || 0;

                    if (notaMedia !== undefined && alumnos > 0) {
                      datosDispersion.push({
                        asignatura,
                        notaMedia,
                        desviacion,
                        alumnos
                      });
                    }
                  }
                });
              }
            }

            if (datosDispersion.length === 0) return null;

            // Calcular desviación máxima y alumnos máximos para los rangos
            const maxDesviacion = datosDispersion.length > 0
              ? Math.max(...datosDispersion.map(d => d.desviacion))
              : 0;
            const desviacionMax = zoomDispersion.rangoDesviacion.max || Math.max(3, Math.ceil(maxDesviacion * 1.2));

            const maxAlumnos = datosDispersion.length > 0
              ? Math.max(...datosDispersion.map(d => d.alumnos))
              : 0;

            // Filtrar datos según rangos de valores (no índices)
            const datosFiltrados = datosDispersion.filter(d =>
              d.notaMedia >= zoomDispersion.rangoMedia.min &&
              d.notaMedia <= zoomDispersion.rangoMedia.max &&
              d.desviacion >= zoomDispersion.rangoDesviacion.min &&
              d.desviacion <= desviacionMax &&
              d.alumnos >= minAlumnosDispersion
            );

            // Función para determinar el cuadrante y su interpretación
            const getAnalisis = (notaMedia, desviacion) => {
              const mediaAlta = notaMedia >= 7;
              const desviacionAlta = desviacion >= 1.5;

              if (mediaAlta && !desviacionAlta) return t('highAvgLowDev');
              if (mediaAlta && desviacionAlta) return t('highAvgHighDev');
              if (!mediaAlta && !desviacionAlta) return t('lowAvgLowDev');
              return t('lowAvgHighDev');
            };

            // Tooltip personalizado
            const CustomTooltip = ({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border-2 border-gray-900 rounded-lg">
                    <p className="font-bold text-gray-900 mb-2">{data.asignatura}</p>
                    <p className="text-sm text-gray-600">{t('average')}: <span className="font-semibold">{data.notaMedia.toFixed(2)}</span></p>
                    <p className="text-sm text-gray-600">{t('standardDeviation')}: <span className="font-semibold">{data.desviacion.toFixed(2)}</span></p>
                    <p className="text-sm text-gray-600">{t('students')}: <span className="font-semibold">{data.alumnos}</span></p>
                    <p className="text-xs text-gray-500 mt-2 italic">{getAnalisis(data.notaMedia, data.desviacion)}</p>
                  </div>
                );
              }
              return null;
            };

            // Obtener niveles disponibles para el selector
            // En modo TODOS, combinar niveles de todos los trimestres de la misma evaluación
            const obtenerNivelesDispersion = () => {
              if (modoEtapa === 'TODOS') {
                const nivelesSet = new Set();
                // Buscar en todos los trimestres de la misma evaluación
                trimestresDisponibles.forEach(trim => {
                  if (mismoMomento(trim, trimestreSeleccionado) && datosCompletos[trim]) {
                    Object.keys(datosCompletos[trim]).forEach(nivel => {
                      if (nivel !== 'GLOBAL') nivelesSet.add(nivel);
                    });
                  }
                });
                // Ordenar niveles: primero EEM (1-4), luego EPM (1-6)
                const niveles = Array.from(nivelesSet).sort((a, b) => {
                  const esEEM_A = a.includes('EEM');
                  const esEEM_B = b.includes('EEM');
                  if (esEEM_A && !esEEM_B) return -1;
                  if (!esEEM_A && esEEM_B) return 1;
                  return a.localeCompare(b, undefined, { numeric: true });
                });
                return ['GLOBAL', ...niveles];
              }
              // En modos EEM/EPM, solo niveles del trimestre seleccionado
              return ['GLOBAL', ...Object.keys(datosCompletos[trimestreSeleccionado] || {}).filter(n => n !== 'GLOBAL')];
            };
            const nivelesParaDispersion = obtenerNivelesDispersion();

            return (
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dispersionMap')}</h3>

                {/* Selector de nivel/curso */}
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    {idioma === 'es' ? 'Filtrar por curso:' : 'Filtrar per curs:'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {nivelesParaDispersion.map(nivel => (
                      <button
                        key={nivel}
                        onClick={() => setNivelDispersion(nivel)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          nivelDispersion === nivel
                            ? 'bg-gray-900 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {nivel === 'GLOBAL' ? `📊 ${idioma === 'es' ? 'Todos los cursos' : 'Tots els cursos'}` : nivel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Controles y leyenda */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  {/* Leyenda de cuadrantes */}
                  <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('dispersionAnalysis')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full mt-0.5"></div>
                        <span className="text-gray-600">{t('highAvgLowDev')}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mt-0.5"></div>
                        <span className="text-gray-600">{t('highAvgHighDev')}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full mt-0.5"></div>
                        <span className="text-gray-600">{t('lowAvgLowDev')}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 bg-rose-500 rounded-full mt-0.5"></div>
                        <span className="text-gray-600">{t('lowAvgHighDev')}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 italic">
                      {idioma === 'es'
                        ? '* El tamaño del punto indica la cantidad de alumnos. Use los controles de la derecha para filtrar por rangos.'
                        : '* La mida del punt indica la quantitat d\'alumnes. Utilitzeu els controls de la dreta per filtrar per rangs.'}
                    </p>
                  </div>

                  {/* Controles de zoom */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 whitespace-nowrap">{t('average')}:</span>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={zoomDispersion.rangoMedia.min}
                        onChange={(e) => setZoomDispersion({
                          ...zoomDispersion,
                          rangoMedia: { ...zoomDispersion.rangoMedia, min: parseFloat(e.target.value) }
                        })}
                        className="w-24"
                      />
                      <span className="text-xs text-gray-700 font-mono">{zoomDispersion.rangoMedia.min.toFixed(1)}</span>
                      <span className="text-xs text-gray-500">-</span>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={zoomDispersion.rangoMedia.max}
                        onChange={(e) => setZoomDispersion({
                          ...zoomDispersion,
                          rangoMedia: { ...zoomDispersion.rangoMedia, max: parseFloat(e.target.value) }
                        })}
                        className="w-24"
                      />
                      <span className="text-xs text-gray-700 font-mono">{zoomDispersion.rangoMedia.max.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 whitespace-nowrap">{t('standardDeviation')}:</span>
                      <input
                        type="range"
                        min="0"
                        max={Math.ceil(maxDesviacion)}
                        step="0.1"
                        value={zoomDispersion.rangoDesviacion.min}
                        onChange={(e) => setZoomDispersion({
                          ...zoomDispersion,
                          rangoDesviacion: { ...zoomDispersion.rangoDesviacion, min: parseFloat(e.target.value) }
                        })}
                        className="w-24"
                      />
                      <span className="text-xs text-gray-700 font-mono">{zoomDispersion.rangoDesviacion.min.toFixed(1)}</span>
                      <span className="text-xs text-gray-500">-</span>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(3, Math.ceil(maxDesviacion * 1.2))}
                        step="0.1"
                        value={desviacionMax}
                        onChange={(e) => setZoomDispersion({
                          ...zoomDispersion,
                          rangoDesviacion: { ...zoomDispersion.rangoDesviacion, max: parseFloat(e.target.value) }
                        })}
                        className="w-24"
                      />
                      <span className="text-xs text-gray-700 font-mono">{desviacionMax.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 whitespace-nowrap">{t('students')} ≥:</span>
                      {/* Botones rápidos para valores bajos */}
                      <div className="flex gap-1">
                        {[0, 3, 5, 10].map(val => (
                          <button
                            key={val}
                            onClick={() => setMinAlumnosDispersion(val)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              minAlumnosDispersion === val
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      {/* Input numérico directo */}
                      <input
                        type="number"
                        min="0"
                        max={Math.max(50, maxAlumnos)}
                        value={minAlumnosDispersion}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setMinAlumnosDispersion(Math.max(0, Math.min(val, Math.max(50, maxAlumnos))));
                        }}
                        className="w-16 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                      />
                      {minAlumnosDispersion > 0 && (
                        <span className="text-xs text-emerald-600">✓</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setZoomDispersion({
                          rangoMedia: { min: 0, max: 10 },
                          rangoDesviacion: { min: 0, max: null }
                        });
                        setMinAlumnosDispersion(0);
                      }}
                      className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-all whitespace-nowrap"
                    >
                      {idioma === 'es' ? 'Reiniciar filtros' : 'Reiniciar filtres'}
                    </button>
                  </div>
                </div>

                {/* Gráfico de dispersión */}
                <ResponsiveContainer width="100%" height={700}>
                  <ScatterChart margin={{ top: 30, right: 40, bottom: 80, left: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      dataKey="notaMedia"
                      name={t('average')}
                      domain={[zoomDispersion.rangoMedia.min, zoomDispersion.rangoMedia.max]}
                      stroke="#64748b"
                      label={{
                        value: t('average'),
                        position: 'bottom',
                        offset: 60,
                        style: { fill: '#475569', fontSize: 14, fontWeight: 600 }
                      }}
                      allowDataOverflow={false}
                    />
                    <YAxis
                      type="number"
                      dataKey="desviacion"
                      name={t('standardDeviation')}
                      domain={[zoomDispersion.rangoDesviacion.min, desviacionMax]}
                      stroke="#64748b"
                      label={{
                        value: t('standardDeviation'),
                        angle: -90,
                        position: 'insideLeft',
                        offset: 15,
                        style: { fill: '#475569', fontSize: 14, fontWeight: 600 }
                      }}
                      allowDataOverflow={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter
                      data={datosFiltrados}
                      shape={(props) => {
                        const { cx, cy, payload } = props;
                        const mediaAlta = payload.notaMedia >= 7;
                        const desviacionAlta = payload.desviacion >= 1.5;

                        let color;
                        if (mediaAlta && !desviacionAlta) color = '#10b981'; // emerald
                        else if (mediaAlta && desviacionAlta) color = '#3b82f6'; // blue
                        else if (!mediaAlta && !desviacionAlta) color = '#f97316'; // orange
                        else color = '#f43f5e'; // rose

                        // Tamaño basado en cantidad de alumnos con escala de raíz cuadrada
                        const radius = Math.min(25, Math.max(8, Math.sqrt(payload.alumnos) * 2.5));

                        return (
                          <g>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={radius}
                              fill={color}
                              fillOpacity={0.6}
                              stroke={color}
                              strokeWidth={2}
                            />
                            <text
                              x={cx}
                              y={cy + radius + 15}
                              textAnchor="middle"
                              fill="#1e293b"
                              fontSize={11}
                              fontWeight={600}
                            >
                              {payload.asignatura.length > 18
                                ? payload.asignatura.substring(0, 18) + '...'
                                : payload.asignatura}
                            </text>
                          </g>
                        );
                      }}
                    />
                    {/* Líneas de referencia */}
                    <ReferenceLine
                      x={7}
                      stroke="#94a3b8"
                      strokeDasharray="5 5"
                      strokeWidth={1}
                      label={{
                        value: idioma === 'es' ? 'Media alta' : 'Mitjana alta',
                        position: 'top',
                        fill: '#64748b',
                        fontSize: 11
                      }}
                    />
                    <ReferenceLine
                      y={1.5}
                      stroke="#94a3b8"
                      strokeDasharray="5 5"
                      strokeWidth={1}
                      label={{
                        value: idioma === 'es' ? 'Dispersión alta' : 'Dispersió alta',
                        position: 'right',
                        fill: '#64748b',
                        fontSize: 11
                      }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
      )}

      {/* VISTA: ESTADÍSTICAS (Selecciones y comparativas) */}
      {vistaActual === 'estadisticas' && (
        <div className="max-w-7xl mx-auto">
          {/* Selectores */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('selections')}</h3>
              {!compararNiveles && selecciones.length < 15 && (
                <button
                  onClick={agregarSeleccion}
                  className="py-2 px-4 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-all"
                >
                  + {t('add')}
                </button>
              )}
            </div>

            {/* Opción de comparar niveles */}
            {todasLasAsignaturas.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">
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
                        compararNiveles ? 'bg-gray-900' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        compararNiveles ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
                {compararNiveles && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">{t('subjectToCompare')}</label>
                    <select
                      value={asignaturaComparada}
                      onChange={(e) => cambiarAsignaturaComparada(e.target.value)}
                      className="w-full md:w-64 py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm"
                    >
                      {renderOpcionesAsignaturas(todasLasAsignaturas)}
                    </select>
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
                        className="text-gray-400 hover:text-red-500 text-xl"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t('trimester')}</label>
                      <select
                        value={sel.trimestre}
                        onChange={(e) => actualizarSeleccion(sel.id, 'trimestre', e.target.value)}
                        disabled={compararNiveles}
                        className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {trimestresDisponibles
                          .filter(t => {
                            if (modoEtapa === 'TODOS') return true;
                            const parsed = parseTrimestre(t);
                            return parsed && parsed.etapa === modoEtapa;
                          })
                          .map(t => (
                            <option key={t} value={t}>{rotuloTrimestre(t)}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t('level')}</label>
                      <select
                        value={sel.nivel}
                        onChange={(e) => actualizarSeleccion(sel.id, 'nivel', e.target.value)}
                        disabled={compararNiveles}
                        className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {Object.keys(datosCompletos[sel.trimestre] || {}).map(n => (
                          <option key={n} value={n}>{n === 'GLOBAL' ? `📊 ${t('global')}` : n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{t('subject')}</label>
                      <select
                        value={sel.asignatura}
                        onChange={(e) => actualizarSeleccion(sel.id, 'asignatura', e.target.value)}
                        disabled={compararNiveles}
                        className="w-full py-2 px-3 bg-white border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {renderOpcionesAsignaturas(getAsignaturas(sel.trimestre, sel.nivel))}
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
                      <h4 className="font-semibold text-gray-900 text-sm">
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
                      /* La diferencia y su LECTURA las decide el núcleo. No es
                         lo mismo el signo que la mejora: subir la nota media es
                         mejorar, y subir el porcentaje de suspensos es
                         empeorar. Antes las tres se pintaban con la misma
                         regla —positivo, verde—, así que pasar de un 8,5 % a
                         un 14 % de suspensos salía como «+5.5» EN VERDE. */
                      const comp = (idx > 0 && datosBase)
                        ? diferencia(valor, datosBase.stats[key], key) : null;

                      return (
                        <div key={key} className="bg-gray-50 rounded p-2 md:p-3 lg:p-4 text-center min-h-[60px] md:min-h-[70px] lg:min-h-[80px] flex flex-col justify-center" title={title}>
                          <div className="text-xs md:text-sm text-gray-500">{label}</div>
                          <div className="text-sm md:text-base lg:text-lg font-bold text-gray-900">{format(valor)}</div>
                          {comp && (
                            <div className={`text-xs md:text-sm font-medium ${
                              comp.mejora === null ? 'text-gray-500'
                                : comp.mejora ? 'text-green-600' : 'text-red-600'}`}>
                              {comp.diff > 0 ? '+' : ''}{comp.diff.toFixed(decimalesDe(key))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Descripción textual */}
                  <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 italic">
                    {generarDescripcion()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Radar combinado de todas las selecciones */}
          {selecciones.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{t('radarComparison')}</h3>
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

          {/* Gráficas de evolución para comparativa de misma asignatura en todos los niveles */}
          {compararNiveles && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Evolución de la Nota Media */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('averageEvolution')}</h3>
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
                        <span className="text-sm text-gray-600">{t('trend')}:</span>
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
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('failedEvolution')}</h3>
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
                        <span className="text-sm text-gray-600">{t('trend')}:</span>
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('gradeDistribution')}</h3>
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setModoDistribucion('porcentaje')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoDistribucion === 'porcentaje'
                      ? 'bg-white text-gray-900 '
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('distributionPercentage')}
                </button>
                <button
                  onClick={() => setModoDistribucion('absoluto')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoDistribucion === 'absoluto'
                      ? 'bg-white text-gray-900 '
                      : 'text-gray-500 hover:text-gray-700'
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('distributionTable')}</h3>
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setModoHeatmap('relativo')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoHeatmap === 'relativo'
                      ? 'bg-white text-gray-900 '
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('heatmapRelative')}
                </button>
                <button
                  onClick={() => setModoHeatmap('absoluto')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    modoHeatmap === 'absoluto'
                      ? 'bg-white text-gray-900 '
                      : 'text-gray-500 hover:text-gray-700'
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
                  return datos?.distribucion ? Object.values(datos.distribucion).reduce((a, b) => a + b, 0) : 0;
                });

                // Calcular máximos según el modo
                let maxValorGlobal = 0;
                const maxValoresPorColumna = [];

                selecciones.forEach((sel) => {
                  const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                  let maxColumna = 0;
                  if (datos?.distribucion) {
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
                        <tr className="border-b-2 border-gray-200">
                          <th className="py-3 px-3 text-left text-sm font-semibold text-gray-600">{t('grade')}</th>
                          {selecciones.map((sel, idx) => (
                            <th key={sel.id} className="py-3 px-2 text-center text-xs font-semibold text-gray-700">
                              <div>{sel.trimestre} · {sel.nivel}</div>
                              <div className="font-normal text-gray-500">{sel.asignatura}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(nota => (
                          <tr key={nota} className="border-b border-gray-100">
                            <td className="py-2 px-3 font-medium text-gray-700">{nota}</td>
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
                                  <span className="font-semibold text-gray-900">{valor}</span>
                                  <span className="text-xs text-gray-700 ml-1">({porcentaje}%)</span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                          <td className="py-3 px-3 text-gray-700">{t('total')}</td>
                          {selecciones.map((sel, idx) => (
                            <td key={sel.id} className="py-3 px-2 text-center text-gray-900">
                              {totales[idx]}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>

                    {/* Tabla de agrupaciones */}
                    <h4 className="text-md font-semibold text-gray-700 mb-3">{t('groupByGrade')}</h4>
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="py-3 px-3 text-left text-sm font-semibold text-gray-600">{t('grade')}</th>
                          <th className="py-3 px-3 text-left text-xs font-normal text-gray-500">{t('grades')}</th>
                          {selecciones.map((sel, idx) => (
                            <th key={sel.id} className="py-3 px-2 text-center text-xs font-semibold text-gray-700">
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
                          <tr key={key} className="border-b border-gray-100">
                            <td className="py-2 px-3 font-medium text-gray-700">{label}</td>
                            <td className="py-2 px-3 text-xs text-gray-500">{notas}</td>
                            {selecciones.map((sel, idx) => {
                              const datos = datosCompletos[sel.trimestre]?.[sel.nivel]?.[sel.asignatura];
                              if (!datos) return <td key={sel.id} className="py-2 px-2 text-center">—</td>;
                              const { grupos, porcentajes } = calcularAgrupacion(datos.distribucion);
                              return (
                                <td key={sel.id} className="py-2 px-2 text-center">
                                  <span className="font-semibold text-gray-900">{grupos[key]}</span>
                                  <span className="text-xs text-gray-900 ml-1">({porcentajes[key]}%)</span>
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

        </div>
      )}

      {/* VISTA: CORRELACIONES */}
      {vistaActual === 'correlaciones' && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('correlationsTitle')} · {rotuloTrimestre(trimestreSeleccionado)}
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={trimestreSeleccionado}
                  onChange={(e) => setTrimestreSeleccionado(e.target.value)}
                  className="py-2 px-4 border border-gray-300 rounded-lg text-sm"
                >
                  {trimestresDisponibles
                    .filter(t => {
                      if (modoEtapa === 'TODOS') return true;
                      const parsed = parseTrimestre(t);
                      return parsed && parsed.etapa === modoEtapa;
                    })
                    .map(t => (
                      <option key={t} value={t}>{rotuloTrimestre(t)}</option>
                    ))}
                </select>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setOrdenCorrelaciones('desc')}
                    className={`py-1.5 px-3 text-xs font-medium rounded transition-all ${
                      ordenCorrelaciones === 'desc' ? 'bg-white text-gray-900 ' : 'text-gray-500'
                    }`}
                  >
                    {t('sortDesc')}
                  </button>
                  <button
                    onClick={() => setOrdenCorrelaciones('asc')}
                    className={`py-1.5 px-3 text-xs font-medium rounded transition-all ${
                      ordenCorrelaciones === 'asc' ? 'bg-white text-gray-900 ' : 'text-gray-500'
                    }`}
                  >
                    {t('sortAsc')}
                  </button>
                  <button
                    onClick={() => setOrdenCorrelaciones('none')}
                    className={`py-1.5 px-3 text-xs font-medium rounded transition-all ${
                      ordenCorrelaciones === 'none' ? 'bg-white text-gray-900 ' : 'text-gray-500'
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
              <p className="text-gray-500 text-center py-8">{t('noCorrelationData')}</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                {correlacionesTrimestre.map((corr, idx) => {
                  const interp = interpretarCorrelacion(corr.Correlacion);
                  return (
                    <div 
                      key={idx} 
                      className="p-3 rounded-lg border border-gray-200 hover:border-gray-900 transition-all"
                      style={{ borderLeftWidth: '4px', borderLeftColor: interp.color }}
                    >
                      <div className="text-xs text-gray-400 mb-1">{corr.Nivel}</div>
                      <div className="text-sm font-semibold text-gray-900 leading-tight mb-2 break-words overflow-hidden">
                        {corr.Asignatura1}
                        <span className="text-gray-400 mx-1">↔</span>
                        {corr.Asignatura2}
                      </div>
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-lg font-bold font-mono"
                          style={{ color: interp.color }}
                        >
                          {typeof corr.Correlacion === 'number' ? corr.Correlacion.toFixed(2) : parseFloat(corr.Correlacion)?.toFixed(2) || 'N/A'}
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('correlationEvolution')}</h3>
                  <p className="text-sm text-gray-500">
                    {ejeCorrelaciones === 'pares' ? t('correlationEvolutionDesc') : t('correlationEvolutionDescAlt').replace('{levels}', nivelesSinGlobalEtapa.join(', '))}
                  </p>
                </div>
                <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setEjeCorrelaciones('pares')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      ejeCorrelaciones === 'pares'
                        ? 'bg-white text-gray-900 '
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {t('correlationToggleSubjects')}
                  </button>
                  <button
                    onClick={() => setEjeCorrelaciones('niveles')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      ejeCorrelaciones === 'niveles'
                        ? 'bg-white text-gray-900 '
                        : 'text-gray-600 hover:text-gray-900'
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
                      formatter={(value, name) => [typeof value === 'number' ? value.toFixed(2) : 'N/A', name]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.parCompleto;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    {nivelesSinGlobalEtapa.map((nivel, idx) => {
                      const coloresLineas = [
                        '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f59e0b',
                        '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6', '#f97316'
                      ];
                      return (
                        <Line
                          key={nivel}
                          type="monotone"
                          dataKey={nivel}
                          name={nivel}
                          stroke={coloresLineas[idx % coloresLineas.length]}
                          strokeWidth={2}
                          dot={{ fill: coloresLineas[idx % coloresLineas.length], r: 4 }}
                          connectNulls
                        />
                      );
                    })}
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
                      formatter={(value, name) => [typeof value === 'number' ? value.toFixed(2) : 'N/A', name]}
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('evolutionTitle')}</h3>

            {trimestresDisponibles.length < 2 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-2">{t('needTwoTrimesters')}</p>
                <p className="text-sm text-gray-400">{t('trimestersLoaded')}: {trimestresDisponibles.join(', ') || 'Ninguno'}</p>
              </div>
            ) : (
              <>
                {/* Selectores independientes para Evolución */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-gray-700">{t('selections')}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (seleccionesEvolucion.length < 15) {
                            setSeleccionesEvolucion([...seleccionesEvolucion, { nivel: 'GLOBAL', asignatura: 'Total' }]);
                          }
                        }}
                        disabled={seleccionesEvolucion.length >= 15}
                        className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        + {t('add')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {seleccionesEvolucion.map((sel, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-semibold text-gray-600 w-24">{t('selection')} {idx + 1}</span>

                        <select
                          value={sel.nivel}
                          onChange={(e) => {
                            const nuevas = [...seleccionesEvolucion];
                            nuevas[idx].nivel = e.target.value;
                            setSeleccionesEvolucion(nuevas);
                          }}
                          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
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
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        >
                          {renderOpcionesAsignaturas(todasLasAsignaturas)}
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

                  // El cálculo vive en `src/nucleo/evolucion.js`
                  const { puntos: datosEvolucion, hayDatos } = serieEvolucionSelecciones({
                    trimestresDisponibles,
                    datosCompletos,
                    selecciones: seleccionesEvolucion,
                    modoEtapa
                  });

                  if (!hayDatos) {
                    return (
                      <p className="text-gray-500 text-center py-8">
                        {t('notEnoughData')}
                      </p>
                    );
                  }

                  return (
                    <div>
                      <div className="mb-4">
                        <h4 className="text-md font-semibold text-gray-700 mb-2">{t('averageEvolution')}</h4>
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
                    suspendidos: datos.stats
                      ? (datos.stats.suspendidos)
                      : (datos.estadisticas?.alumnos > 0
                          ? (datos.estadisticas.suspendidos / datos.estadisticas.alumnos * 100)
                          : 0)
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
                      <h2 className="text-2xl font-bold text-gray-900">
                        {t('transversalComparison')} - {t('allSubjects')}
                      </h2>
                      <div className="flex items-center gap-4">
                        {/* Filtro por tendencia de nota media */}
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700">
                            {idioma === 'es' ? 'Filtrar nota media:' : 'Filtrar nota mitjana:'}
                          </label>
                          <select
                            value={filtroTendenciaMedia}
                            onChange={(e) => setFiltroTendenciaMedia(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
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
                          <label className="text-sm font-medium text-gray-700">
                            {idioma === 'es' ? 'Filtrar % suspensos:' : 'Filtrar % suspesos:'}
                          </label>
                          <select
                            value={filtroTendenciaSuspensos}
                            onChange={(e) => setFiltroTendenciaSuspensos(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
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
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {idioma === 'es' ? 'Seleccionar asignaturas a mostrar:' : 'Seleccionar assignatures a mostrar:'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setAsignaturasTransversal([])}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            asignaturasTransversal.length === 0
                              ? 'bg-gray-900 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
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
                                ? 'bg-gray-900 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
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
                      <div key={asignatura} className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="mb-6">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">{asignatura}</h3>
                          <p className="text-sm text-gray-600">
                            {idioma === 'es'
                              ? `Evolución de ${asignatura} a través de los niveles de ${modoEtapa === 'TODOS' ? 'todas las etapas' : modoEtapa}`
                              : `Evolució de ${asignatura} a través dels nivells de ${modoEtapa === 'TODOS' ? 'totes les etapes' : modoEtapa}`
                            }
                          </p>
                        </div>

                        {/* Gráfica de Nota Media */}
                        <div className="mb-8">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-700">{t('averageEvolution')}</h4>
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
                                formatter={(value) => [typeof value === 'number' ? value.toFixed(2) : 'N/A', t('average')]}
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
                            <h4 className="text-lg font-semibold text-gray-700">{t('failedEvolution')}</h4>
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
                                formatter={(value) => [`${typeof value === 'number' ? value.toFixed(1) : 'N/A'}%`, '% ' + t('failed')]}
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('difficulty')}</h3>
              {/* Toggle Por Niveles / Global */}
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setVistaDificultad('niveles')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    vistaDificultad === 'niveles'
                      ? 'bg-white text-gray-900 '
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('viewByLevels')}
                </button>
                <button
                  onClick={() => setVistaDificultad('global')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    vistaDificultad === 'global'
                      ? 'bg-white text-gray-900 '
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('viewGlobal')}
                </button>
              </div>
            </div>

            {/* Selector de trimestre */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
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
                      className="bg-red-50 border-2 border-red-300 rounded-lg p-4 hover:border-gray-900 transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-gray-900 text-sm break-words">
                            {asig.nivel} - {asig.asignatura}
                          </h5>
                        </div>
                        <span className="ml-2 px-2 py-1 bg-red-200 text-red-800 text-xs font-bold rounded shrink-0">
                          {t('difficult')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                        <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-gray-900">{(asig.notaMedia || 0).toFixed(2)}</div>
                          <div className="text-gray-500">{t('average')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                          <div className="text-gray-500">{t('passed')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                          <div className="text-gray-500">{t('failed')}</div>
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
                <h4 className="text-md font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                  {t('neutralSubjects')} ({analisisDificultad.neutrales.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analisisDificultad.neutrales.map((asig, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 hover:border-gray-900 transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-gray-900 text-sm break-words">
                            {asig.nivel} - {asig.asignatura}
                          </h5>
                        </div>
                        <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-900 text-xs font-bold rounded shrink-0">
                          {t('neutral')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                        <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-gray-900">{(asig.notaMedia || 0).toFixed(2)}</div>
                          <div className="text-gray-500">{t('average')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                          <div className="text-gray-500">{t('passed')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                          <div className="text-gray-500">{t('failed')}</div>
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
                      className="bg-green-50 border-2 border-green-300 rounded-lg p-4 hover:border-gray-900 transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-gray-900 text-sm break-words">
                            {asig.nivel} - {asig.asignatura}
                          </h5>
                        </div>
                        <span className="ml-2 px-2 py-1 bg-green-200 text-green-800 text-xs font-bold rounded shrink-0">
                          {t('easy')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                        <span className="font-medium">{t('difficultyReason')}:</span> {asig.razon}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-gray-900">{(asig.notaMedia || 0).toFixed(2)}</div>
                          <div className="text-gray-500">{t('average')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-green-600">{(asig.aprobados || 0).toFixed(1)}%</div>
                          <div className="text-gray-500">{t('passed')}</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <div className="font-semibold text-red-600">{(asig.suspendidos || 0).toFixed(1)}%</div>
                          <div className="text-gray-500">{t('failed')}</div>
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByTrimester')}</label>
                <select
                  value={filtroTrimestre}
                  onChange={(e) => setFiltroTrimestre(e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="ALL">{t('allTrimesters')}</option>
                  {trimestresDisponibles
                    .filter(t => {
                      if (modoEtapa === 'TODOS') return true;
                      const parsed = parseTrimestre(t);
                      return parsed && parsed.etapa === modoEtapa;
                    })
                    .map(trim => (
                      <option key={trim} value={trim}>{rotuloTrimestre(trim)}</option>
                    ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByLevel')}</label>
                <select
                  value={filtroNivel}
                  onChange={(e) => setFiltroNivel(e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="ALL">{t('allLevels')}</option>
                  <option value="GLOBAL">{t('global')}</option>
                  {['1EEM', '2EEM', '3EEM', '4EEM', '1EPM', '2EPM', '3EPM', '4EPM', '5EPM', '6EPM'].map(nivel => (
                    <option key={nivel} value={nivel}>{nivel}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('filterByGroup')}</label>
                <select
                  value={filtroGrupo}
                  onChange={(e) => setFiltroGrupo(e.target.value)}
                  className="w-full py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white"
                  disabled={obtenerGruposDisponibles().length === 0}
                >
                  <option value="ALL">{t('allGroups')}</option>
                  {obtenerGruposDisponibles().map(grupo => (
                    <option key={grupo} value={grupo}>
                      {grupo.charAt(0).toUpperCase() + grupo.slice(1)}
                    </option>
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
                    if (asignatura === 'Total' || !data?.stats) return;

                    // Filtrar por grupo si no es 'ALL'
                    if (filtroGrupo !== 'ALL') {
                      const agrupacionesTrimestre = agrupacionesCompletas[trimestre] || {};
                      const perteneceAlGrupo = perteneceAGrupo(asignatura, filtroGrupo, agrupacionesTrimestre);
                      if (!perteneceAlGrupo) return;
                    }

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
                  <p className="text-sm text-gray-600 mb-4">
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
                        bgColor = 'bg-gray-50';
                        borderColor = 'border-gray-200';
                        badgeBg = 'bg-gray-100';
                        badgeText = 'text-gray-700';
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
                          className={`${bgColor} ${borderColor} border rounded-lg p-4 transition-all hover:border-gray-900`}
                        >
                          {/* Header con badge */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-gray-600 mb-1">{headerText}</div>
                              <h4 className="text-sm font-bold text-gray-900 leading-tight">{asignatura}</h4>
                            </div>
                            <span className={`${badgeBg} ${badgeText} text-xs px-2 py-0.5 rounded font-medium ml-2`}>
                              {t(resultado === 'DIFÍCIL' ? 'difficult' : resultado === 'FÁCIL' ? 'easy' : 'neutral')}
                            </span>
                          </div>

                          {/* Métricas */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">{t('records')}:</span>
                              <span className="text-sm font-semibold text-gray-900">{stats.registros}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">{t('average')}:</span>
                              <span className="text-sm font-semibold text-gray-900">{(stats.notaMedia || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">{t('standardDeviation')}:</span>
                              <span className="text-sm font-semibold text-gray-900">{typeof stats.desviacion === 'number' ? stats.desviacion.toFixed(2) : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">{t('mode')}:</span>
                              <span className="text-sm font-semibold text-gray-900">{stats.moda || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-green-600">{t('passed')}:</span>
                              <span className="text-sm font-semibold text-green-700">{(stats.aprobados || 0).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-green-600">{t('passedMode')}:</span>
                              <span className="text-sm font-semibold text-green-700">{stats.modaAprobados || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-red-600">{t('failed')}:</span>
                              <span className="text-sm font-semibold text-red-700">{(stats.suspendidos || 0).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-red-600">{t('failedMode')}:</span>
                              <span className="text-sm font-semibold text-red-700">{stats.modaSuspendidos || '-'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {count === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">{t('noCorrelationData')}</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto mt-12 py-6 border-t border-gray-200">
        <p className="text-center text-sm text-gray-400">
          {t('designedBy')} <a href="https://jlmirall.es" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 underline">José Luis Miralles Bono</a> {t('withHelpOf')}
        </p>
      </footer>
      </MainLayout>

      {/* Modal de configuración de informe */}
      <ReportModal
        isOpen={mostrarModalInforme}
        onClose={() => setMostrarModalInforme(false)}
        config={configInforme}
        onConfigChange={setConfigInforme}
        onGeneratePDF={handleGenerarInformePDF}
        isGenerating={generandoInforme}
        progressMessage={progresoInforme}
        agrupacionesDisponibles={agrupacionesDisponiblesPDF}
        trimestresCount={trimestresDisponibles.length}
        t={t}
      />

      {/* Renderizador de gráficas para PDF (oculto) */}
      <PDFChartRenderer
        ref={pdfChartRefs}
        isGenerating={renderPDFCharts}
        datosDispersion={datosDispersionPDF}
        datosEvolucionCorrelaciones={datosEvolucionCorrelaciones}
        nivelesCorrelaciones={nivelesSinGlobalEtapa}
        datosTransversal={datosTransversalPDF}
        datosEvolucionNotas={datosEvolucionNotasPDF}
        datosDistribucion={datosDistribucionPDF}
        idioma={idioma}
        t={t}
      />

      {/* Modal de Ayuda */}
      <HelpModal
        isOpen={mostrarModalAyuda}
        onClose={() => setMostrarModalAyuda(false)}
        idioma={idioma}
        t={t}
      />
    </div>
  );
};

export default DashboardAcademico;
