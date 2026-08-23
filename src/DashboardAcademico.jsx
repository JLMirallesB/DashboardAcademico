import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { translations } from './translations.js';
import { normalizar, getBestTrimestre, parseTrimestre, getTrimestreEtapa, tieneAsignatura, perteneceAGrupo } from './utils.js';
import { UMBRALES_DEFAULT, COLORES_COMPARACION, INSTRUMENTALES_EPM, ASIGNATURAS_EXCLUIR_EEM, ASIGNATURAS_EXCLUIR_TODOS } from './constants.js';
import { formatearNombreTrimestre, abreviarAsignatura, rotularMomento as rotularMomentoComun } from './utils/formatters.js';
import { parseCSV as parseCSVService } from './services/csvParser.js';
import { procesarDatos as procesarDatosService } from './services/dataProcessor.js';
import { exportarJSON as exportarJSONService, procesarImportacionJSON } from './services/dataIO.js';
import { useStatisticalCalculations } from './hooks/useStatisticalCalculations.js';
import { recordarIdioma } from './idioma.js';
import { serieAlertas } from './nucleo/alertas.js';
import { agruparPorFamilia, compararFamilias } from './nucleo/agrupaciones.js';
import AlertasCurso from './components/vistas/AlertasCurso.jsx';
import FamiliasAsignaturas from './components/vistas/FamiliasAsignaturas.jsx';
import { ResumenEjecutivo } from './components/vistas/ResumenEjecutivo.jsx';
import { senalesDelTrimestre } from './nucleo/senales.js';
import { analizarDificultad } from './nucleo/dificultad.js';
import { serieEvolucionNiveles } from './nucleo/evolucion.js';
import { compararTrimestres, esAgregado, mismoMomento, cursosDe, momentosDe, esDelMomento, parseTrimestre as parseClave } from './nucleo/texto.js';

import { paresDe, porPares, porNiveles, paresMasFuertes } from './nucleo/correlaciones.js';
import { useKPICalculation } from './hooks/useKPICalculation.js';

import { HelpModal } from './components/modals/HelpModal.jsx';
import { ReportModal } from './components/modals/ReportModal.jsx';
import { PreviewModal } from './components/modals/PreviewModal.jsx';
import { MainLayout } from './components/layout/MainLayout.jsx';
import { PDFChartRenderer } from './components/pdf/PDFChartRenderer.jsx';
import { generarInformePDF } from './services/pdfGenerator.js';
import { captureChartAsImage, waitForRender } from './utils/chartCapture.js';
import { VistaKPIs } from './components/vistas/VistaKPIs.jsx';
import { VistaDificultad } from './components/vistas/VistaDificultad.jsx';
import { VistaAsignaturas } from './components/vistas/VistaAsignaturas.jsx';
import { VistaDispersion } from './components/vistas/VistaDispersion.jsx';
import { VistaEvolucion } from './components/vistas/VistaEvolucion.jsx';
import { VistaEstadisticas } from './components/vistas/VistaEstadisticas.jsx';

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
  /* «¿Vamos mejor que el año pasado?» — el eje pasa a ser la evaluación y cada
     curso académico una línea. Solo tiene sentido con dos cursos cargados, así
     que el interruptor no aparece antes. */
  const [entreCursos, setEntreCursos] = useState(false);
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
  /* El informe recién hecho, antes de bajarlo. Se guarda la URL de blob para
     poder revocarla: si no, cada informe que se genera deja en memoria su
     copia entera —y son megas— hasta que se recarga la página. */
  const [vistaPrevia, setVistaPrevia] = useState(null);
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
    incluirDificultad: true,
    /* Las secciones que antes no salían del navegador, y el índice. Todas
       encendidas: quien no las quiera las apaga, pero el que no sabe que
       existen no las va a ir a buscar. */
    incluirIndice: true,
    incluirFicha: true,
    incluirSenales: true,
    incluirNotaMetodologica: true,
    /* Cuántas señales caben en el papel. En la pantalla salen todas. */
    limiteSenales: 6,
    incluirAlertas: true,
    incluirEntreCursos: true,
    incluirFamilias: true,
    incluirSelecciones: true
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

  /* Cuántas asignaturas están en rojo en cada momento del curso, y cuáles
     entran y salen. Recorre todos los momentos, así que no depende del
     seleccionado. */
  const serieDeAlertas = useMemo(
    () => serieAlertas({ trimestresDisponibles, datosCompletos, umbrales,
                         modoEtapa, vista: 'niveles' }),
    [trimestresDisponibles, datosCompletos, umbrales, modoEtapa]);

  /* Las familias del momento que se está mirando. Esta sí es una foto. */
  const familiasDelTrimestre = useMemo(
    () => (trimestreSeleccionado && datosCompletos[trimestreSeleccionado]
      ? agruparPorFamilia(datosCompletos[trimestreSeleccionado], {
          agrupaciones: agrupacionesCompletas[trimestreSeleccionado] || {},
          modoEtapa, umbrales, vista: 'global'
        })
      : null),
    [trimestreSeleccionado, datosCompletos, agrupacionesCompletas, modoEtapa, umbrales]);

  /* ---------- QUÉ SE ESTÁ MIRANDO ----------
     Un solo contexto, arriba, y el único sitio donde se cambia. Ver
     components/layout/BarraContexto.jsx para el porqué. */

  /* Las vistas que miran VARIOS momentos a la vez no obedecen al contexto
     global, y por eso la barra no puede enseñarles uno: en Estadísticas cada
     fila elige su trimestre, y la Evolución los recorre todos. Enseñar «1EV»
     mientras comparas el segundo no es un despiste de la cabecera, es que
     estaba enseñando una variable que esa vista no usa. */
  /* «Alertas» entra aquí: recorre todos los momentos del curso, así que
     tampoco obedece a un momento concreto. «Familias» no, que es la foto de
     uno solo. */
  const VISTAS_COMPARATIVAS = ['estadisticas', 'evolucion', 'alertas'];

  /* El rótulo de cada vista, el mismo que usa la navegación lateral: si se
     escribieran dos veces, acabarían diciendo cosas distintas. */
  const ETIQUETA_VISTA = {
    resumen: 'resTitulo',
    kpis: 'kpisNav', dispersion: 'dispersionNav', estadisticas: 'statistics',
    correlaciones: 'correlations', evolucion: 'evolution',
    dificultad: 'difficulty', asignaturas: 'subjectsData',
    alertas: 'alrTitulo', familias: 'fam_titulo'
  };

  const momentosDisponibles = useMemo(
    () => momentosDe(trimestresDisponibles), [trimestresDisponibles]);

  const momentoActual = useMemo(() => {
    const p = parseClave(trimestreSeleccionado);
    if (!p) return momentosDisponibles[0] ? momentosDisponibles[0].clave : '';
    const m = momentosDisponibles.find((x) => esDelMomento(trimestreSeleccionado, x));
    return m ? m.clave : '';
  }, [trimestreSeleccionado, momentosDisponibles]);

  /* Cambiar de momento no cambia de etapa: se busca el fichero de ESE momento
     que siga siendo de la etapa que se está mirando.
     
     Si no lo hay —hay momentos donde solo se cargó una etapa— se cae al que
     haya, que es mejor que dejar la pantalla en blanco. Pero entonces **se
     cambia también el modo de etapa**, para que el rótulo no diga «EEM»
     mientras la pantalla enseña profesional. Sin eso, elegir un momento te
     dejaba en otro estado sin ningún aviso, que es justo lo que este rediseño
     venía a quitar. */
  const cambiarMomento = useCallback((clave) => {
    const m = momentosDisponibles.find((x) => x.clave === clave);
    if (!m) return;
    const deLaEtapa = trimestresDisponibles.find((t) => {
      const p = parseClave(t);
      return esDelMomento(t, m) && p && p.etapa === modoEtapa;
    });
    if (deLaEtapa || modoEtapa === 'TODOS') {
      setTrimestreSeleccionado(deLaEtapa || trimestresDisponibles.find((t) => esDelMomento(t, m)) || null);
      return;
    }
    const cualquiera = trimestresDisponibles.find((t) => esDelMomento(t, m));
    if (!cualquiera) return;
    setTrimestreSeleccionado(cualquiera);
    const suEtapa = (parseClave(cualquiera) || {}).etapa;
    if (suEtapa && suEtapa !== modoEtapa) setModoEtapa(suEtapa);
  }, [momentosDisponibles, trimestresDisponibles, modoEtapa]);

  /* ¿Hay más de un curso académico cargado? De eso depende que los rótulos
     tengan que decirlo. Con uno solo, escribir «25/26» en cada desplegable es
     ruido; con dos, no decirlo es dejar al usuario sin saber qué mira. */
  const hayVariosCursos = useMemo(
    () => cursosDe(trimestresDisponibles).length > 1, [trimestresDisponibles]);

  /* La portada del informe llevaba el centro y el curso escritos a mano en el
     estado inicial —«Conservatorio Profesional de Música», «2024-2025»— y el
     usuario tenía que acordarse de cambiarlos en el diálogo. Con un fichero
     de 26/27 cargado, la portada decía 2024-2025: el propio documento se
     contradecía con las cifras que llevaba dentro, y eso no se ve hasta que
     alguien lo lee en una reunión. El fichero sabe de qué curso es —viene en
     su #METADATA— así que se rellena de ahí cada vez que se abre el diálogo,
     donde sigue siendo editable. */
  const prepararInforme = useCallback(() => {
    const meta = (trimestreSeleccionado && metadata[trimestreSeleccionado]) || {};
    const curso = meta.CursoAcademico || meta['CursoAcadémico'] || '';
    const centro = meta.Centro || '';
    if (!curso && !centro) return;
    setConfigInforme((c) => ({
      ...c,
      ...(centro ? { nombreCentro: centro } : {}),
      ...(curso ? { cursoAcademico: curso } : {})
    }));
  }, [trimestreSeleccionado, metadata]);

  const rotuloTrimestre = useCallback(
    (trim) => formatearNombreTrimestre(trim, hayVariosCursos), [hayVariosCursos]);

  /* El rótulo de un momento en la barra de contexto. El curso solo cuando hay
     más de uno cargado: escribirlo siempre es ruido en cada desplegable, y no
     escribirlo nunca deja al usuario sin saber de qué año habla. */
  const rotularMomento = useCallback(
    (m) => rotularMomentoComun(m, hayVariosCursos), [hayVariosCursos]);

  /* El eje de una gráfica recibe la CLAVE interna del momento —«2526·1EV»—,
     que es un identificador, no un rótulo. Sin esto salía tal cual delante del
     usuario, con el curso en dígitos y un punto volado, incluso con un solo
     curso cargado. El propio núcleo lo avisa: «la clave sirve de valor del
     eje; el rótulo lo pone quien pinta». */
  const rotuloDeMomento = useCallback((clave) => {
    const m = momentosDisponibles.find((x) => x.clave === clave);
    return m ? rotularMomento(m) : clave;
  }, [momentosDisponibles, rotularMomento]);

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
  /** Lee un fichero y devuelve su texto. */
  const leerTexto = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(file.name));
    reader.readAsText(file);
  });

  /* Se cargan VARIOS de golpe. Un curso completo son ocho ficheros —dos
     cursos académicos por dos evaluaciones por dos etapas— y hacerlo de uno en
     uno son ocho vueltas por el diálogo del sistema.

     Los que no estaban se aplican todos; los que ya estaban se juntan en UNA
     sola pregunta, con la lista delante. Preguntar fichero a fichero convierte
     una carga de ocho en ocho modales, y a la tercera se pulsa que sí sin
     leer, que es peor que no preguntar. */
  const handleCargarCSV = useCallback(async (event) => {
    const ficheros = Array.from(event.target.files || []);
    event.target.value = '';
    if (!ficheros.length) return;

    const nuevos = [];
    const repetidos = [];
    const errores = [];
    const yaVistos = new Set(trimestresDisponibles);

    for (const file of ficheros) {
      let procesado;
      try {
        procesado = procesarDatos(parseCSV(await leerTexto(file)));
      } catch (error) {
        errores.push(file.name + ': ' + (error.message === 'ERROR_NO_TRIMESTER_METADATA'
          ? t('errorNoTrimesterMetadata') : error.message));
        continue;
      }
      if (!procesado) continue;
      /* Ojo con los repetidos DENTRO de la misma tanda: si alguien selecciona
         dos veces el mismo fichero, el segundo también es un reemplazo. */
      if (yaVistos.has(procesado.trimestre)) repetidos.push(procesado);
      else { yaVistos.add(procesado.trimestre); nuevos.push(procesado); }
    }

    nuevos.forEach(aplicarDatos);

    if (errores.length) alert(errores.join('\n'));

    if (repetidos.length) {
      setDatosPendientes(repetidos);
      setTrimestrePendiente(repetidos.map((p) => p.trimestre));
      setMostrarModalConfirm(true);
    }
  }, [parseCSV, procesarDatos, trimestresDisponibles, aplicarDatos, t]);

  // Confirmar reemplazo de trimestre
  const confirmarReemplazo = useCallback(() => {
    /* Puede ser uno o varios: desde que se cargan tandas de ficheros, lo que
       espera es una lista. Se acepta también un objeto suelto por si algún
       camino antiguo lo manda así. */
    if (datosPendientes) {
      (Array.isArray(datosPendientes) ? datosPendientes : [datosPendientes]).forEach(aplicarDatos);
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
      /* El fichero de la otra etapa PERO DEL MISMO MOMENTO. Buscar solo por
         etapa aterrizaba en el primero de la lista ordenada, o sea el más
         antiguo: estando en la segunda evaluación y pulsando «EPM» te ibas a
         la primera, y con dos cursos cargados, al año pasado. Cambiar de etapa
         es cambiar de etapa, no de momento. */
      const mismo = trimestresDisponibles.find(t => {
        const parsed = parseTrimestre(t);
        return parsed && parsed.etapa === modoEtapa && mismoMomento(t, trimestreSeleccionado);
      });
      /* Si ese momento no existe en la otra etapa, entonces sí hace falta
         moverse: se coge el más cercano de esa etapa, que con la lista
         ordenada es el primero. */
      const trimestreDelModo = mismo || trimestresDisponibles.find(t => {
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

  /* Aquí había un efecto que, al entrar en modo TODOS, cambiaba SOLO la
     pestaña de KPIs de «Comparativa» a «Centro». La razón de fondo es buena
     —esa tabla compara el centro con sus partes DENTRO de una etapa, y en modo
     TODOS no hay un centro único—, pero la forma no: al usuario le desaparecía
     la vista que estaba mirando sin que nada se lo dijera, y al volver a una
     sola etapa no volvía. Ahora la pestaña se deshabilita y dice por qué.
     Ver el botón de «Comparativa» más abajo. */

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

  /* Las señales del momento que se mira, ordenadas por solidez. Se calculan
     aquí una vez y las usan las dos salidas —la pantalla y el informe—: si
     cada una las recalculara, un día dirían cosas distintas del mismo día. */
  const senalesDelMomento = useMemo(
    () => senalesDelTrimestre({
      trimestreSeleccionado, datosCompletos, trimestresDisponibles,
      umbrales, modoEtapa,
      serieAlertas: serieDeAlertas,
      correlaciones: correlacionesCompletas[trimestreSeleccionado] || [],
      tendencias: tendenciasParaPDF
    }),
    [trimestreSeleccionado, datosCompletos, trimestresDisponibles, umbrales,
     modoEtapa, serieDeAlertas, correlacionesCompletas, tendenciasParaPDF]);

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
        /* Lo que hasta ahora se quedaba en la pantalla. Se pasa YA CALCULADO,
           con los mismos memos que alimentan las vistas: recalcularlo dentro
           del generador sería abrir la puerta a que el informe y el cuadro
           dijeran cosas distintas del mismo día. */
        umbrales,
        /* La del fichero que se imprime, no el mapa de todos: la ficha lee
           `metadata.CursoAcademico` y con el mapa entero eso es `undefined`,
           así que la portada decía el curso y la ficha decía «—». */
        metadata: metadata[trimestreSeleccionado] || {},
        serieAlertasPDF: serieDeAlertas,
        /* Las mismas que enseña la pantalla, y el tope que decide cuántas
           caben en el papel: la lista completa se queda en la aplicación. */
        senales: senalesDelMomento,
        limiteSenales: configInforme.limiteSenales,
        familiasPDF: familiasDelTrimestre,
        selecciones,
        generadoEn: new Date(),
        t,
        /* En vez de descargar, se enseña. El informe se baja desde la vista
           previa, cuando quien lo ha pedido ya ha visto que es el que quería:
           antes, comprobar si habías marcado las secciones correctas costaba
           una descarga, y probando se acababa con seis PDF iguales en la
           carpeta. */
        guardar: (pdf, nombreArchivo) => {
          setVistaPrevia({
            url: pdf.output('bloburl').toString(),
            nombre: nombreArchivo,
            paginas: pdf.getNumberOfPages()
          });
        },
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
  }, [trimestreSeleccionado, datosCompletos, configInforme, modoEtapa, kpisGlobales, correlacionesTrimestre, analisisDificultad, agrupacionesCompletas, tendenciasParaPDF, trimestresDisponibles, datosDistribucionPDF, umbrales, metadata, serieDeAlertas, familiasDelTrimestre, selecciones, senalesDelMomento, t]);

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
              /* Varios de golpe: un curso completo son ocho ficheros. */
              multiple
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
              {t('replaceConfirm').replace('{trimester}',
                Array.isArray(trimestrePendiente)
                  ? trimestrePendiente.map(rotuloTrimestre).join(', ')
                  : (trimestrePendiente ? rotuloTrimestre(trimestrePendiente) : ''))}
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
      <input ref={fileInputRef} type="file" accept=".csv" multiple onChange={handleCargarCSV} className="hidden" />
      <input ref={jsonInputRef} type="file" accept=".json" onChange={handleImportarJSON} className="hidden" />

      {/* Layout principal con Sidebar */}
      <MainLayout
        sidebarProps={{
          currentView: vistaActual,
          onViewChange: setVistaActual,
          thresholds: umbrales,
          onThresholdsChange: setUmbrales,
          language: idioma,
          onLanguageChange: setIdioma,
          actions: {
            onManageData: () => setMostrarModalGestionDatos(true),
            onExport: exportarJSON,
            onReport: () => { prepararInforme(); setMostrarModalInforme(true); },
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
          contexto: {
            momentos: momentosDisponibles,
            momentoActual,
            onMomentoChange: cambiarMomento,
            etapas: etapasDisponibles,
            etapaActual: modoEtapa,
            onEtapaChange: setModoEtapa,
            rotularMomento,
            /* Cuando la vista compara varios momentos, la barra lo dice en vez
               de enseñar un contexto que esa vista no usa. */
            /* Con UN solo momento cargado, «1 momentos del curso» además de
               estar mal escrito es una respuesta tonta: se dice cuál es. El
               plural solo aparece cuando de verdad hay varios. */
            comparando: VISTAS_COMPARATIVAS.includes(vistaActual)
              ? (vistaActual === 'estadisticas'
                  ? `${selecciones.length} ${selecciones.length === 1 ? t('ctxSeleccion') : t('ctxSelecciones')}`
                  : (momentosDisponibles.length === 1
                      ? rotularMomento(momentosDisponibles[0])
                      : `${momentosDisponibles.length} ${t('ctxMomentos')}`))
              : null
          }
        }}
      >
      {/* El título de la vista, con el contexto repetido. Es redundante a
          propósito: la barra de arriba dice lo mismo, pero cuando alguien
          exporta una captura o mira una gráfica a media pantalla, el título es
          lo único que viaja con ella. Y en las vistas que comparan varios
          momentos dice eso, en vez de un momento que esa vista no usa. */}
      <div className="max-w-7xl mx-auto mb-5">
        <h2 className="text-xl font-semibold text-gray-900">
          {t(ETIQUETA_VISTA[vistaActual] || 'kpisNav')}
          {trimestreSeleccionado && (
            <span className="text-gray-400 font-normal">
              {' · '}
              {VISTAS_COMPARATIVAS.includes(vistaActual)
                ? (momentosDisponibles.length === 1
                    ? rotularMomento(momentosDisponibles[0])
                    : t('ctxVariosMomentos'))
                : rotuloTrimestre(trimestreSeleccionado)}
            </span>
          )}
        </h2>
      </div>

      {/* VISTA: ALERTAS A LO LARGO DEL CURSO */}
      {vistaActual === 'alertas' && (
        <div className="max-w-7xl mx-auto">
          <AlertasCurso serie={serieDeAlertas} t={t} rotularMomento={rotularMomento} />
        </div>
      )}

      {/* VISTA: FAMILIAS DE ASIGNATURAS */}
      {vistaActual === 'resumen' && (
        <div className="max-w-5xl mx-auto">
          <ResumenEjecutivo
            senales={senalesDelMomento}
            t={t}
            formatoNota={(v) => v.toFixed(2)}
            formatoPorcentaje={(v) => `${v.toFixed(1)}%`}
          />
        </div>
      )}

      {vistaActual === 'familias' && (
        <div className="max-w-7xl mx-auto">
          {/* En modo TODOS las cifras siguen siendo de UN fichero —el que
              está seleccionado, o sea una etapa— porque esta vista es la foto
              de un momento, no un recorrido. Sin decirlo, media etapa se
              presentaba bajo el rótulo «Registros del centro». */}
          {modoEtapa === 'TODOS' && trimestreSeleccionado && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              {t('fam_soloUnaEtapa').replace('{fichero}', rotuloTrimestre(trimestreSeleccionado))}
            </div>
          )}
          <FamiliasAsignaturas
            resultado={familiasDelTrimestre}
            compararFamilias={compararFamilias}
            t={t}
          />
        </div>
      )}

      {/* VISTA: INDICADORES (KPIs) */}
      {vistaActual === 'kpis' && (
        <VistaKPIs
          kpisGlobales={kpisGlobales}
          vistaKPI={vistaKPI}
          setVistaKPI={setVistaKPI}
          modoEtapa={modoEtapa}
          t={t}
        />
      )}

      {/* VISTA: DISPERSIÓN */}
      {vistaActual === 'dispersion' && (
        <VistaDispersion
          datosCompletos={datosCompletos}
          idioma={idioma}
          minAlumnosDispersion={minAlumnosDispersion}
          modoEtapa={modoEtapa}
          nivelDispersion={nivelDispersion}
          setMinAlumnosDispersion={setMinAlumnosDispersion}
          setNivelDispersion={setNivelDispersion}
          setZoomDispersion={setZoomDispersion}
          t={t}
          trimestreSeleccionado={trimestreSeleccionado}
          trimestresDisponibles={trimestresDisponibles}
          zoomDispersion={zoomDispersion}
        />
      )}

      {/* VISTA: ESTADÍSTICAS (Selecciones y comparativas) */}
      {vistaActual === 'estadisticas' && (
        <VistaEstadisticas
          activarCompararNiveles={activarCompararNiveles}
          actualizarSeleccion={actualizarSeleccion}
          agregarSeleccion={agregarSeleccion}
          asignaturaComparada={asignaturaComparada}
          calcularDatosSeleccion={calcularDatosSeleccion}
          calcularResultado={calcularResultado}
          cambiarAsignaturaComparada={cambiarAsignaturaComparada}
          colores={colores}
          compararNiveles={compararNiveles}
          datosCompletos={datosCompletos}
          datosDistribucion={datosDistribucion}
          desactivarCompararNiveles={desactivarCompararNiveles}
          eliminarSeleccion={eliminarSeleccion}
          getAsignaturas={getAsignaturas}
          getTrendInfo={getTrendInfo}
          idioma={idioma}
          modoDistribucion={modoDistribucion}
          modoEtapa={modoEtapa}
          modoHeatmap={modoHeatmap}
          nivelesSinGlobalEtapa={nivelesSinGlobalEtapa}
          renderOpcionesAsignaturas={renderOpcionesAsignaturas}
          rotuloTrimestre={rotuloTrimestre}
          selecciones={selecciones}
          setModoDistribucion={setModoDistribucion}
          setModoHeatmap={setModoHeatmap}
          t={t}
          todasLasAsignaturas={todasLasAsignaturas}
          trimestreSeleccionado={trimestreSeleccionado}
          trimestresDisponibles={trimestresDisponibles}
        />
      )}

      {/* VISTA: CORRELACIONES */}
      {/* Sin correlaciones en el fichero, la vista se quedaba MUDA: gráficas
          vacías y ninguna explicación. Y no es un caso raro — la sección
          #CORRELACIONES es opcional en el CSV y hay exportadores que no la
          escriben—. Decir qué falta y de dónde sale es media respuesta. */}
      {vistaActual === 'correlaciones' && correlacionesDelTrimestre.length === 0 && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('corrSinDatos')}</h3>
            <p className="text-sm text-gray-600">{t('corrSinDatosDetalle')}</p>
          </div>
        </div>
      )}

      {vistaActual === 'correlaciones' && correlacionesDelTrimestre.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('correlationsTitle')} · {rotuloTrimestre(trimestreSeleccionado)}
              </h3>
              <div className="flex flex-wrap items-center gap-3">
{/* Aquí había un selector de trimestre que cambiaba el trimestre GLOBAL:
                    tocarlo desde correlaciones cambiaba lo que veías después en
                    indicadores y en dificultad, sin ningún aviso. Un control
                    dentro de una vista no puede mutar el estado de todas las
                    demás. El trimestre se elige arriba, en la barra de
                    contexto, y desde ahí se ve. */}
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
        <VistaEvolucion
          asignaturasTransversal={asignaturasTransversal}
          datosCompletos={datosCompletos}
          entreCursos={entreCursos}
          filtroTendenciaMedia={filtroTendenciaMedia}
          filtroTendenciaSuspensos={filtroTendenciaSuspensos}
          getTrendInfo={getTrendInfo}
          hayVariosCursos={hayVariosCursos}
          idioma={idioma}
          modoEtapa={modoEtapa}
          nivelesDisponibles={nivelesDisponibles}
          nivelesSinGlobalEtapa={nivelesSinGlobalEtapa}
          renderOpcionesAsignaturas={renderOpcionesAsignaturas}
          rotuloDeMomento={rotuloDeMomento}
          rotuloTrimestre={rotuloTrimestre}
          seleccionesEvolucion={seleccionesEvolucion}
          setAsignaturasTransversal={setAsignaturasTransversal}
          setEntreCursos={setEntreCursos}
          setFiltroTendenciaMedia={setFiltroTendenciaMedia}
          setFiltroTendenciaSuspensos={setFiltroTendenciaSuspensos}
          setSeleccionesEvolucion={setSeleccionesEvolucion}
          t={t}
          todasLasAsignaturas={todasLasAsignaturas}
          trimestreSeleccionado={trimestreSeleccionado}
          trimestresDisponibles={trimestresDisponibles}
        />
      )}

      {/* VISTA: DIFICULTAD */}
      {vistaActual === 'dificultad' && analisisDificultad && (
        <VistaDificultad
          analisisDificultad={analisisDificultad}
          vistaDificultad={vistaDificultad}
          setVistaDificultad={setVistaDificultad}
          trimestreSeleccionado={trimestreSeleccionado}
          t={t}
        />
      )}

      {/* VISTA: DATOS DE ASIGNATURAS */}
      {vistaActual === 'asignaturas' && (
        <VistaAsignaturas
          agrupacionesCompletas={agrupacionesCompletas}
          calcularResultado={calcularResultado}
          datosCompletos={datosCompletos}
          filtroGrupo={filtroGrupo}
          filtroNivel={filtroNivel}
          filtroTrimestre={filtroTrimestre}
          hayVariosCursos={hayVariosCursos}
          modoEtapa={modoEtapa}
          obtenerGruposDisponibles={obtenerGruposDisponibles}
          rotuloTrimestre={rotuloTrimestre}
          setFiltroGrupo={setFiltroGrupo}
          setFiltroNivel={setFiltroNivel}
          setFiltroTrimestre={setFiltroTrimestre}
          t={t}
          trimestresDisponibles={trimestresDisponibles}
        />
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto mt-12 py-6 border-t border-gray-200">
        <p className="text-center text-sm text-gray-400">
          {t('designedBy')} <a href="https://jlmirall.es" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 underline">José Luis Miralles Bono</a> {t('withHelpOf')}
        </p>
      </footer>
      </MainLayout>

      {/* Modal de configuración de informe */}
      <PreviewModal
        isOpen={!!vistaPrevia}
        url={vistaPrevia?.url}
        nombre={vistaPrevia?.nombre}
        paginas={vistaPrevia?.paginas}
        t={t}
        onClose={() => {
          if (vistaPrevia?.url) URL.revokeObjectURL(vistaPrevia.url);
          setVistaPrevia(null);
        }}
        onDownload={() => {
          if (!vistaPrevia) return;
          const a = document.createElement('a');
          a.href = vistaPrevia.url;
          a.download = vistaPrevia.nombre;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }}
      />

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
        rotuloDeMomento={rotuloDeMomento}
        ref={pdfChartRefs}
        isGenerating={renderPDFCharts}
        datosDispersion={datosDispersionPDF}
        zoomDispersion={zoomDispersion}
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
