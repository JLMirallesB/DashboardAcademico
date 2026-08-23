/**
 * Dashboard Académico - Servicio de Generación de Informes PDF
 * Genera informes PDF completos con KPIs visuales, gráficas y análisis detallado
 * Formato: A4 Horizontal (Landscape)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { esAgregado, normalizar as normalizarNucleo, parseTrimestre } from '../nucleo/texto.js';
import { detectarEtapa } from '../nucleo/estadistica.js';
import { tablaRecuento, tablaCambios } from '../nucleo/informe-alertas.js';
import { tablaFamilias } from '../nucleo/informe-familias.js';
import { tablaSelecciones } from '../nucleo/informe-selecciones.js';
import { tablaEntreCursos } from '../nucleo/informe-cursos.js';
import { fichaDelInforme } from '../nucleo/informe-contexto.js';
import { tablaSenales, notaMetodologica } from '../nucleo/informe-senales.js';
import { nota, porcentaje, entero, texto, diferencia, conSigno, anchosQueCaben,
         porAsignaturaAgregada, filasComparativaKPI } from '../nucleo/informe.js';
import { formatearNombreTrimestre, rotularMomento } from '../utils/formatters.js';

// Constantes de diseño
const COLORS = {
  primary: [30, 58, 138],      // Azul oscuro
  secondary: [71, 85, 105],    // Slate
  success: [34, 197, 94],      // Verde
  danger: [239, 68, 68],       // Rojo
  warning: [245, 158, 11],     // Ámbar
  info: [59, 130, 246],        // Azul
  light: [241, 245, 249],      // Slate claro
  white: [255, 255, 255],
  text: [30, 41, 59],          // Slate 800
  textLight: [100, 116, 139],  // Slate 500
};

// Dimensiones A4 Landscape
const PAGE = {
  width: 297,
  height: 210,
  margin: 15,
  headerHeight: 20,
  footerHeight: 15,
};

/**
 * Genera un informe PDF completo del dashboard
 * @param {Object} params - Parámetros para la generación
 */
export const generarInformePDF = async ({
  trimestreSeleccionado,
  datosCompletos,
  configInforme,
  kpisGlobales,
  correlacionesTrimestre,
  analisisDificultad,
  agrupacionesCompletas = {},
  tendenciasParaPDF = [],
  trimestresDisponibles = [],
  chartImages = {},
  /* Lo que hacía falta para las secciones que hasta ahora se quedaban en la
     pantalla. Nada de esto se calcula aquí: la aplicación ya lo tiene hecho
     para pintar sus vistas, y recalcularlo sería arriesgarse a que el informe
     y la pantalla no dijeran lo mismo. */
  umbrales,
  metadata = {},
  serieAlertasPDF = null,
  /* Las señales que la pantalla enseña. Vienen calculadas de fuera: si el
     informe las recalculara, un día diría cosas distintas del mismo día. */
  senales = [],
  limiteSenales,
  familiasPDF = null,
  selecciones = [],
  /* La fecha entra por parámetro. Un generador que llama a `new Date()` por
     dentro no se puede probar. */
  generadoEn = null,
  t,
  onProgress,
  onSuccess,
  onError,
  /* Cómo sale el PDF de aquí. Por defecto se descarga, que es lo que quiere
     quien pulsa el botón; pero pasando otra función se puede capturar el
     documento sin tocar el disco. De eso viven dos cosas: la prueba de
     extremo a extremo, que ejecuta las quince secciones en Node y lee lo que
     escriben, y la vista previa, que enseña el informe antes de bajarlo.
     Sin esta costura no había forma de probar el generador entero: `save()`
     necesita un navegador, así que cualquier error dentro de una sección solo
     se descubría generando el informe a mano y con los datos justos. */
  guardar
}) => {

  if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) {
    const error = new Error(t('noDataForReport'));
    if (onError) onError(error);
    return;
  }

  try {
    /* El rótulo del fichero, NUNCA su clave. `trimestreSeleccionado` es un
       identificador interno —«1EV-2627-EEM»— y salía tal cual en la cabecera
       de todas las páginas, en la portada y en la tabla de resumen. El curso
       académico se escribe siempre: el informe se lee fuera de la aplicación,
       meses después, y ahí no hay ningún selector al lado que diga de qué año
       es. */
    const rotuloTrim = formatearNombreTrimestre(trimestreSeleccionado, true);

    /* Si hay más de un curso académico cargado, los rótulos de momento lo
       dicen; si no, sobra y es ruido en cada fila. Mismo criterio que la
       barra de contexto de la pantalla. */
    const variosCursos = (() => {
      const cursos = new Set();
      (trimestresDisponibles || []).forEach((k) => {
        const p = parseTrimestre(k);
        if (p && p.curso) cursos.add(p.curso);
      });
      return cursos.size > 1;
    })();

    /* Sin comprimir el documento a propósito. `compress: true` parecía la
       respuesta al tamaño —un informe con dos gráficas pesaba 18 MB, de los
       que 17,85 eran las dos imágenes— pero el deflate de jsPDF es síncrono y
       en JavaScript: con 18 MB de píxeles por delante **congela la pestaña**
       más de un minuto, sin barra de progreso ni forma de cancelar. Probado.
       El tamaño se ataja donde nace, capturando las gráficas ya comprimidas
       (ver `chartCapture.js`), no comprimiendo el resultado. */
    const pdf = new jsPDF('l', 'mm', 'a4');
    let currentPage = 0;

    // Helpers
    const addHeader = () => {
      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.textLight);
      pdf.text(configInforme.nombreCentro || '', PAGE.margin, 8);
      pdf.text(`${t('reportTitle')} - ${rotuloTrim}`, PAGE.width - PAGE.margin, 8, { align: 'right' });
      pdf.setTextColor(...COLORS.text);
    };

    /* El pie NO recibe el número: lo pregunta.
       Lo recibía, y quien lo llamaba desde `didDrawPage` le pasaba
       `data.pageNumber`, que en `autoTable` es la página **de esa tabla** —1
       para la primera— y no la del documento. Resultado medido en un informe
       de 26 páginas: los pies decían 2, 1, 3, 1, 4, 5, 6, 7, 8, 9, 1, 10, 1…
       con seis páginas numeradas «1» y cinco sin numerar. No da error, no lo
       ve ninguna prueba de contenido, y convierte el índice en papel mojado.
       jsPDF sí sabe en qué página está; solo había que preguntárselo. */
    const paginaActual = () => {
      try { return pdf.internal.getCurrentPageInfo().pageNumber; }
      catch { return pdf.getNumberOfPages(); }
    };

    /* Una página, un pie. Se dibujaba dos veces en las secciones con tabla —el
       gancho de `autoTable` y la llamada de después—, y con el número mal
       eran dos números distintos superpuestos. Con el número bien no se
       notaría, pero dos textos encima del mismo sitio engordan el PDF y
       ensucian el texto que se copia del papel. */
    const conPie = new Set();

    const addFooter = () => {
      const pag = paginaActual();
      if (conPie.has(pag)) return;
      conPie.add(pag);
      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.textLight);
      pdf.text(`${t('page') || 'Página'} ${paginaActual()}`, PAGE.width / 2, PAGE.height - 8, { align: 'center' });
      pdf.text(new Date().toLocaleDateString(), PAGE.width - PAGE.margin, PAGE.height - 8, { align: 'right' });
      pdf.setTextColor(...COLORS.text);
    };

    /* Dónde empieza cada sección. Se apunta al abrir la página, que es el
       único momento en que se sabe, y sirve para dos cosas al final: el índice
       de la segunda hoja y los marcadores del PDF. Catorce páginas sin ninguna
       forma de saltar son muchas para buscar a mano una tabla, y quien recibe
       el informe por correo no tiene la aplicación al lado. */
    const secciones = [];

    const addNewPage = (titulo) => {
      pdf.addPage();
      currentPage++;
      addHeader();
      if (titulo) secciones.push({ titulo, pagina: pdf.getNumberOfPages() });
      return currentPage;
    };

    const contentWidth = PAGE.width - 2 * PAGE.margin;
    const contentStartY = PAGE.headerHeight + 5;

    /* Una gráfica se coloca RESPETANDO SU PROPORCIÓN, y esto no es cosmético.
       Antes cada imagen se estiraba al ancho de la caja y al alto que sobrara
       en la página, así que la misma gráfica salía achatada o alargada según
       cuánto texto llevara encima — y una nube de puntos deformada mueve de
       sitio la diagonal que uno lee para juzgar si una asignatura se sale de
       la línea. jsPDF sabe el tamaño real del PNG; solo había que
       preguntárselo. */
    /* El formato se deduce del propio dato en vez de escribirlo a mano. Es
       defensivo, no imprescindible: comprobado que jsPDF mira la cabecera del
       data URL y usa DCTDecode aunque se le diga 'PNG'. Se deja porque un
       rótulo que miente sobre lo que hay dentro se acaba creyendo. */
    const formatoDe = (dato) => (/^data:image\/jpe?g/i.test(String(dato)) ? 'JPEG' : 'PNG');

    const ponerImagen = (imagen, y, altoDisponible) => {
      let ancho = contentWidth;
      let alto = altoDisponible;
      try {
        const props = pdf.getImageProperties(imagen);
        if (props?.width > 0 && props?.height > 0) {
          const proporcion = props.height / props.width;
          alto = contentWidth * proporcion;
          if (alto > altoDisponible) { alto = altoDisponible; ancho = alto / proporcion; }
        }
      } catch {
        /* Si el PNG no se deja medir se cae al comportamiento de antes: es
           mejor una gráfica estirada que ninguna. */
      }
      pdf.addImage(imagen, formatoDe(imagen), PAGE.margin + (contentWidth - ancho) / 2, y, ancho, alto);
    };

    /* Los rótulos de las secciones nuevas. **Casi todos son los de la
       pantalla**: la vista de alertas y la de familias ya los tienen y dicen
       exactamente lo mismo, así que inventar aquí una segunda tanda de claves
       sería garantizar que un día la tabla y el cuadro se llamen distinto. */
    const rotulosAlertas = {
      /* La MISMA función que rotula los momentos en la pantalla, no una copia:
         es lo único que sabe si hay dos cursos académicos cargados y hay que
         decir de cuál es cada fila. */
      momento: (m) => rotularMomento(m, variosCursos),
      colMomento: t('trimester') || 'Evaluación',
      colDificiles: t('alrDificiles') || 'Difíciles',
      colNeutrales: t('alrNeutrales') || 'Neutrales',
      colFaciles: t('alrFaciles') || 'Fáciles',
      colTotal: t('alrDeTotal') || 'Total',
      colPctDificiles: t('alrPorcentajeDificiles') || '% difíciles',
      colSalto: t('alrPasaA') || 'De una evaluación a la siguiente',
      colVariacion: t('alrVariacionSufijo') || 'Variación',
      colEntran: t('alrEntran') || 'Entran',
      colSalen: t('alrSalen') || 'Salen',
      colNuevas: t('alrNuevas') || 'Nuevas',
      colDesaparecidas: t('alrDesaparecidas') || 'Desaparecidas',
      avisoNuevas: t('alrNuevasAviso') || '',
      avisoDesaparecidas: t('alrDesaparecidasAviso') || '',
      motivos: {
        ausente: t('alrMotivoAusente') || 'Ya no viene en el fichero',
        bajoMinimo: t('alrMotivoBajoMinimo') || 'Tiene menos alumnado del mínimo',
        sinFichero: t('alrMotivoSinFichero') || 'No se ha cargado el fichero de su etapa',
        presente: t('alrMotivoPresente') || 'Está en el fichero, pero no se ha podido clasificar'
      }
    };

    const rotulosFamilias = {
      colFamilia: t('fam_colFamilia') || 'Familia',
      colAsignaturas: t('fam_colAsignaturas') || 'Asignaturas',
      colRegistros: t('fam_colRegistros') || 'Registros',
      colNotaMedia: t('fam_colNotaMedia') || 'Nota media',
      colAprobados: t('fam_colAprobados') || '% Aprobados',
      colSuspensos: t('fam_colSuspensos') || '% Suspensos',
      sinClasificar: t('fam_etiquetaSinClasificar') || t('fam_sinClasificar') || 'Sin clasificar',
      sinClasificarNota: t('fam_sinClasificarNota') || '',
      solapeTitulo: t('fam_solapeTitulo') || '',
      solapeTexto: t('fam_solapeTexto') || '',
      sinSolapeTitulo: t('fam_sinSolapeTitulo') || '',
      sinSolapeTexto: t('fam_sinSolapeTexto') || '',
      solapeSumados: t('fam_solapeSumados') || '',
      solapeDistintos: t('fam_solapeDistintos') || '',
      solapeAsigSumadas: t('fam_solapeAsigSumadas') || '',
      solapeAsigDistintas: t('fam_solapeAsigDistintas') || '',
      solapeAsignaturas: t('fam_solapeAsignaturas') || ''
    };

    const rotulosSelecciones = {
      seleccion: t('selection') || 'Selección',
      registros: t('records') || 'N',
      notaMedia: t('average') || 'Nota media',
      desviacion: t('deviation') || 'Desviación',
      moda: t('mode') || 'Moda',
      aprobados: t('passed') || '% Aprobados',
      suspendidos: t('failed') || '% Suspensos'
    };

    const rotulosCursos = {
      curso: t('academicYear') || 'Curso académico',
      notaMedia: t('average') || 'Nota media',
      aprobados: t('passed') || '% Aprobados',
      suspensos: t('failed') || '% Suspensos',
      difNota: t('difference') || 'Dif.',
      difAprobados: t('difference') || 'Dif.',
      difSuspensos: t('difference') || 'Dif.',
      referencia: t('reference') || 'ref.'
    };

    /* Casi todos son los mismos que usa el resumen de la pantalla. Que el
       papel y el cuadro llamen distinto a la misma cosa es la forma más
       tonta de que dos personas crean estar hablando de cosas distintas. */
    const rotulosSenales = {
      colObservado: t('infSenalesCol_observado') || 'Qué se observa',
      colDonde: t('infSenalesCol_donde') || 'Dónde',
      colCifras: t('infSenalesCol_cifras') || 'Cifras',
      colPorQuePesa: t('infSenalesCol_porQue') || 'Por qué pesa',
      colComprobado: t('infSenalesCol_comprobado') || 'Ya comprobado',
      colPorMirar: t('infSenalesCol_porMirar') || 'Falta por mirar',
      abrevMedia: t('infAbrevMedia') || 'media',
      abrevSuspensos: t('infAbrevSuspensos') || 'susp.',
      abrevDesviacion: t('infAbrevDesviacion') || 'sd',
      sinMotivos: t('resSinMotivos') || '',
      persistenteSi: t('infPersistenteSi') || '',
      persistenteNo: t('infPersistenteNo') || '',
      cohorteSi: t('infCohorteSi') || '',
      cohorteNo: t('infCohorteNo') || '',
      cohorteSinDatos: t('infCohorteSinDatos') || '',
      avisoObservacion: t('resAviso') || '',
      avisoRecorte: t('infAvisoRecorte') || ''
    };
    ['mediaBaja', 'suspensosAltos', 'concentracionAlta', 'entraEnRojo', 'correlacionFuerte']
      .forEach((k) => { rotulosSenales[`tipo_${k}`] = t(`resTipo_${k}`) || k; });
    ['persistente', 'otraCohorte', 'variosIndicadores', 'magnitud', 'alcance', 'transicion']
      .forEach((k) => { rotulosSenales[`motivo_${k}`] = t(`resMotivo_${k}`) || k; });
    ['cambioCriterios', 'cambioProfesorado', 'cohorteDistinta', 'asistencia', 'recuperacion',
     'puntosDePartida', 'practicaFuera', 'discriminaLaEvaluacion', 'calendario',
     'competenciasCompartidas', 'criteriosParecidos']
      .forEach((k) => { rotulosSenales[`mirar_${k}`] = t(`resMirar_${k}`) || k; });
    ['concentrado', 'compartido']
      .forEach((k) => { rotulosSenales[`reparto_${k}`] = t(`resReparto_${k}`) || k; });

    const rotulosNota = {};
    ['metConcepto', 'metValor', 'metAsignaturasMiradas', 'metAsignaturasFuera',
     'metPorPocoAlumnado', 'metGrupoMasPequeno', 'metCorrelaciones', 'metCorrelacionesConN',
     'metCorrelacionesSinN', 'metSinCorrelaciones', 'metSenales', 'metSenalesTotal',
     'metPrincipioSenal', 'metPrincipioVarias', 'metPrincipioPersistencia', 'metPrincipioN',
     'metPrincipioCorrelacion', 'metPrincipioUmbrales', 'metPrincipioProporcion']
      .forEach((k) => { rotulosNota[k] = t(k) || k; });

    const rotulosFicha = {
      fichaConcepto: t('indicator') || 'Concepto',
      fichaValor: t('value') || 'Valor',
      fichaEvaluacion: t('reportEvaluation') || 'Evaluación analizada',
      fichaCursoAcademico: t('academicYear') || 'Curso académico',
      fichaEtapa: t('stage') || 'Etapa',
      fichaModoEtapa: t('stage') || 'Etapa del informe',
      fichaEsteFichero: t('fichaEsteFichero') || 'Fichero de este informe',
      fichaFicherosCargados: t('fichaFicherosCargados') || 'Ficheros cargados',
      fichaFiltroAgrupaciones: t('fichaFiltroAgrupaciones') || 'Filtro por agrupación',
      fichaSinFiltro: t('fichaSinFiltro') || 'Ninguno: el informe es de todo el centro',
      fichaGeneradoEn: t('fichaGeneradoEn') || 'Generado el',
      fichaCambiado: t('fichaCambiado') || 'cambiado',
      fichaDeFabrica: t('fichaDeFabrica') || 'de fábrica',
      umbralMediaCritica: t('criticalAvg') || 'Media crítica',
      umbralMediaFacil: t('easyAvg') || 'Media fácil',
      umbralSuspensosAlerta: t('failedAlert') || '% Suspensos alerta',
      umbralAprobadosMinimo: t('minPassed') || '% Aprobados mínimo',
      umbralAlumnosMinimo: t('minStudents') || 'Alumnos mínimos'
    };

    /* Pinta una sección de tabla a partir de lo que devuelve el núcleo:
       { vacio, cabecera, filas, avisos }. Las secciones viejas llevan cada una
       sus cuarenta líneas de `autoTable` copiadas; las nuevas pasan por aquí,
       que es adonde deberían ir migrando las otras.

       Y **una sección vacía no se pinta**: media hoja con un título y una
       tabla sin filas no dice «no hay nada que contar», dice «esto está roto».
       El núcleo ya sabe cuándo no tiene nada, y lo dice con `vacio`. */
    const pintarSeccion = ({ titulo, subtitulo, contenido, color, anchos }) => {
      if (!contenido || contenido.vacio) return false;

      addNewPage(titulo);
      pdf.setFontSize(18);
      pdf.setTextColor(...(color || COLORS.primary));
      pdf.text(titulo, PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      let y = contentStartY + 10;
      if (subtitulo) {
        pdf.setFontSize(10);
        pdf.setTextColor(...COLORS.textLight);
        pdf.text(subtitulo, PAGE.margin, contentStartY + 6);
        pdf.setTextColor(...COLORS.text);
        y = contentStartY + 12;
      }

      autoTable(pdf, {
        startY: y,
        head: [contenido.cabecera],
        body: contenido.filas,
        theme: 'striped',
        headStyles: { fillColor: color || COLORS.primary, fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: anchos ? anchosQueCaben(anchos, contentWidth) : undefined,
        margin: { left: PAGE.margin, right: PAGE.margin },
        didDrawPage: (data) => {
          if (data.pageNumber > currentPage) { currentPage = data.pageNumber; addHeader(); }
          addFooter();
        }
      });

      /* Los avisos van DEBAJO de la tabla y no en una nota al pie: son lo que
         impide leerla mal —que las familias se solapan, que faltan filas, que
         un umbral se ha cambiado— y al pie no los lee nadie. */
      if (contenido.avisos && contenido.avisos.length) {
        let ay = (pdf.lastAutoTable?.finalY || y) + 7;
        pdf.setFontSize(8.5);
        pdf.setTextColor(...COLORS.secondary);
        contenido.avisos.forEach((aviso) => {
          const lineas = pdf.splitTextToSize(String(aviso), contentWidth);
          if (ay + lineas.length * 4 > PAGE.height - 20) { addNewPage(); ay = contentStartY; }
          pdf.text(lineas, PAGE.margin, ay);
          ay += lineas.length * 4 + 2;
        });
        pdf.setTextColor(...COLORS.text);
      }

      addFooter();
      return true;
    };

    /* La MISMA normalización que usa el resto del proyecto, y esto no es
       cosmético. Esta copia local quitaba las tildes; el mapa de agrupaciones
       se construye con la del núcleo, que las conserva. Así que al filtrar un
       informe por grupo se buscaba «percusion» en un mapa cuya clave es
       «percusión», no casaba, y **Percusión, Violín, Saxofón, Órgano, Acordeón
       y Teórica Troncal desaparecían del informe sin ningún aviso** — mientras
       la portada seguía diciendo «12 asignaturas en el grupo» cuando eran 18. */
    const normalizar = normalizarNucleo;

    // Determinar qué etapas hay en los datos
    const etapasEnDatos = new Set();
    Object.keys(datosCompletos[trimestreSeleccionado] || {}).forEach(nivel => {
      if (nivel !== 'GLOBAL') {
        const etapa = detectarEtapa(nivel);
        if (etapa) etapasEnDatos.add(etapa);
      }
    });
    const etapasArray = Array.from(etapasEnDatos).sort(); // ['EEM', 'EPM'] o solo una

    // Determinar modo efectivo
    const modoEtapaConfig = configInforme.modoEtapa || 'TODOS';
    const generarPorEtapas = modoEtapaConfig === 'TODOS' && etapasArray.length > 1;

    // Función para generar página separadora de etapa
    const addStageSeparator = (etapa) => {
      addNewPage();

      // Fondo de color según etapa
      const bgColor = etapa === 'EEM' ? [6, 78, 59] : [88, 28, 135]; // green-900 / purple-900
      pdf.setFillColor(...bgColor);
      pdf.rect(0, PAGE.height / 2 - 40, PAGE.width, 80, 'F');

      // Título de la etapa
      pdf.setTextColor(...COLORS.white);
      pdf.setFontSize(36);
      const nombreEtapa = etapa === 'EEM'
        ? (t('elementaryEducation') || 'Enseñanzas Elementales')
        : (t('professionalEducation') || 'Enseñanzas Profesionales');
      secciones.push({ titulo: nombreEtapa, pagina: pdf.getNumberOfPages(), etapa: true });
      pdf.text(nombreEtapa, PAGE.width / 2, PAGE.height / 2 - 10, { align: 'center' });

      pdf.setFontSize(24);
      pdf.text(`(${etapa})`, PAGE.width / 2, PAGE.height / 2 + 15, { align: 'center' });

      pdf.setTextColor(...COLORS.text);
      addFooter();
    };

    // Función para verificar si una asignatura pertenece a las agrupaciones filtradas
    const perteneceAGruposFiltrados = (asignatura) => {
      const filtroAgrupaciones = configInforme.filtroAgrupaciones;
      // Si no hay filtro (null/undefined), incluir todo
      if (filtroAgrupaciones == null) {
        return true;
      }
      // Si hay filtro pero está vacío, no incluir nada
      if (filtroAgrupaciones.length === 0) {
        return false;
      }
      // Verificar si la asignatura pertenece a alguno de los grupos seleccionados
      const asigNorm = normalizar(asignatura);
      const grupos = agrupacionesCompletas[asigNorm] || [];
      return grupos.some(grupo => filtroAgrupaciones.includes(grupo));
    };

    // ========== PORTADA ==========
    if (configInforme.incluirPortada !== false) {
      onProgress?.(t('pdfGeneratingCover'));
      currentPage++;

      const filtroAgrupaciones = configInforme.filtroAgrupaciones;
      const esInformeDeGrupo = filtroAgrupaciones != null && filtroAgrupaciones.length > 0;

      // Contar asignaturas del grupo (si es informe de grupo)
      let asignaturasDelGrupo = 0;
      if (esInformeDeGrupo) {
        Object.keys(datosCompletos[trimestreSeleccionado] || {}).forEach(nivel => {
          if (nivel === 'GLOBAL') return;
          const datosNivel = datosCompletos[trimestreSeleccionado]?.[nivel];
          if (datosNivel) {
            Object.keys(datosNivel).forEach(asig => {
              if (!esAgregado(asig)) {
                if (perteneceAGruposFiltrados(asig)) {
                  asignaturasDelGrupo++;
                }
              }
            });
          }
        });
      }

      // Fondo superior - color diferente para informe de grupo
      pdf.setFillColor(...(esInformeDeGrupo ? [88, 28, 135] : COLORS.primary)); // purple-900 para grupos
      pdf.rect(0, 0, PAGE.width, esInformeDeGrupo ? 90 : 80, 'F');

      // Título
      pdf.setTextColor(...COLORS.white);
      pdf.setFontSize(32);
      pdf.text(configInforme.nombreCentro || t('centerName'), PAGE.width / 2, 30, { align: 'center' });

      if (esInformeDeGrupo) {
        // Título específico de grupo
        pdf.setFontSize(22);
        pdf.text(`${t('groupReportTitle') || 'Informe del Grupo'}: ${filtroAgrupaciones.join(', ')}`, PAGE.width / 2, 48, { align: 'center' });

        pdf.setFontSize(14);
        pdf.text(t('groupReportSubtitle') || 'Análisis comparativo con el centro', PAGE.width / 2, 62, { align: 'center' });

        pdf.setFontSize(14);
        pdf.text(rotuloTrim, PAGE.width / 2, 78, { align: 'center' });
      } else {
        pdf.setFontSize(24);
        pdf.text(t('reportTitle'), PAGE.width / 2, 50, { align: 'center' });

        // Mostrar etapa o "ambas etapas" si es TODOS
        pdf.setFontSize(14);
        let etapaTexto = '';
        if (generarPorEtapas) {
          etapaTexto = t('bothStages') || 'Enseñanzas Elementales y Profesionales';
        } else if (modoEtapaConfig === 'EEM') {
          etapaTexto = t('elementaryEducation') || 'Enseñanzas Elementales';
        } else if (modoEtapaConfig === 'EPM') {
          etapaTexto = t('professionalEducation') || 'Enseñanzas Profesionales';
        } else if (etapasArray.length === 1) {
          etapaTexto = etapasArray[0] === 'EEM'
            ? (t('elementaryEducation') || 'Enseñanzas Elementales')
            : (t('professionalEducation') || 'Enseñanzas Profesionales');
        }
        if (etapaTexto) {
          pdf.text(etapaTexto, PAGE.width / 2, 62, { align: 'center' });
        }

        pdf.setFontSize(16);
        pdf.text(rotuloTrim, PAGE.width / 2, etapaTexto ? 74 : 65, { align: 'center' });
      }

      // Info adicional
      pdf.setTextColor(...COLORS.text);
      pdf.setFontSize(14);
      const infoY = esInformeDeGrupo ? 115 : (generarPorEtapas || etapasArray.length === 1 ? 115 : 110);
      pdf.text(`${t('academicYear')}: ${configInforme.cursoAcademico || ''}`, PAGE.width / 2, infoY, { align: 'center' });

      // Mostrar info del grupo
      if (esInformeDeGrupo) {
        pdf.setFontSize(12);
        pdf.setTextColor(...COLORS.secondary);
        pdf.text(`${asignaturasDelGrupo} ${t('subjectsCount') || 'asignaturas'} ${t('subjectsInGroup') || 'en el grupo'}`, PAGE.width / 2, infoY + 12, { align: 'center' });
      }

      // Fecha
      pdf.setFontSize(10);
      pdf.setTextColor(...COLORS.textLight);
      pdf.text(`${t('reportFor')} ${new Date().toLocaleDateString()}`, PAGE.width / 2, PAGE.height - 20, { align: 'center' });
    }

    /* El índice se RESERVA aquí y se rellena al final, porque hasta que no
       está todo dibujado no se sabe en qué página cae cada cosa. Insertarlo
       después correría la numeración de todas las páginas ya escritas —y los
       pies ya llevan su número impreso—, así que se aparta la hoja ahora y se
       vuelve a ella con `setPage` cuando hay algo que escribir. */
    let paginaIndice = null;
    if (configInforme.incluirIndice !== false) {
      pdf.addPage();
      currentPage++;
      paginaIndice = pdf.getNumberOfPages();
    }

    // ========== QUÉ MERECE MIRARSE ==========
    /* Va lo primero después del índice. Es la única página que contesta «¿y
       qué hago con todo esto?», y ponerla al final sería pedirle a quien lo
       lee que se recorra veinte páginas antes de saber por dónde empezar.
       Cada fila es una observación: por qué pasa no está en este informe. */
    if (configInforme.incluirSenales !== false && senales.length) {
      pintarSeccion({
        titulo: t('infSenalesTitulo') || 'Qué merece mirarse',
        contenido: tablaSenales(senales, { limite: limiteSenales, rotulos: rotulosSenales }),
        color: [180, 83, 9],
        anchos: { 0: { cellWidth: 42 }, 1: { cellWidth: 38 }, 2: { cellWidth: 44 },
                  3: { cellWidth: 46 }, 4: { cellWidth: 46 }, 5: { cellWidth: 51 } }
      });
    }

    // ========== CÓMO SE HA HECHO ESTE INFORME ==========
    /* Va delante, no al final. Hasta ahora el informe **no mencionaba los
       umbrales ni una sola vez**, y son configurables: dos informes de los
       mismos datos pueden llamar «difícil» a asignaturas distintas y nada en
       el documento lo delataba. En la pantalla da igual, porque el panel de
       umbrales está a un clic; en un PDF que circula por correo, no. Y va
       delante porque son las reglas con las que se lee todo lo demás. */
    if (configInforme.incluirFicha !== false) {
      pintarSeccion({
        titulo: t('fichaTitulo') || 'En qué se basa este informe',
        contenido: fichaDelInforme({
          umbrales, metadata, trimestreSeleccionado, trimestresDisponibles,
          modoEtapa: modoEtapaConfig,
          filtroAgrupaciones: configInforme.filtroAgrupaciones,
          generadoEn: generadoEn || new Date(),
          rotulos: rotulosFicha
        }),
        anchos: { 0: { cellWidth: 95, fontStyle: 'bold' }, 1: { cellWidth: 172 } }
      });
    }

    // ========== ANÁLISIS GLOBAL ==========
    if (configInforme.incluirAnalisisGlobal !== false) {
      onProgress?.(t('pdfGeneratingAnalysis'));
      addNewPage(t('globalAnalysisTitle'));

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('globalAnalysisTitle'), PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      // Obtener datos globales
      const datosGlobal = datosCompletos[trimestreSeleccionado]?.['GLOBAL']?.['Total'];
      const niveles = Object.keys(datosCompletos[trimestreSeleccionado] || {}).filter(n => n !== 'GLOBAL');
      const asignaturas = new Set();
      let totalAlumnos = 0;

      niveles.forEach(nivel => {
        const nivelData = datosCompletos[trimestreSeleccionado]?.[nivel];
        if (nivelData) {
          Object.keys(nivelData).forEach(asig => {
            if (!esAgregado(asig)) {
              asignaturas.add(asig);
            }
          });
        }
      });

      if (datosGlobal?.stats?.registros) {
        totalAlumnos = datosGlobal.stats.registros;
      }

      /* Los rótulos de esta tabla estaban escritos en castellano dentro del
         código, así que el informe «en valencià» salía medio traducido: los
         títulos de página en valenciano y las tablas en castellano. */
      const resumenData = [
        [t('reportEvaluation') || 'Evaluación analizada', rotuloTrim],
        [t('reportLevels') || 'Niveles incluidos', niveles.length.toString()],
        [t('reportSubjects') || 'Asignaturas distintas', asignaturas.size.toString()],
        [t('reportRecords') || 'Total de registros', totalAlumnos.toString()],
        [t('reportGlobalAvg') || 'Nota media global', nota(datosGlobal?.stats?.notaMedia)],
        [t('reportGlobalStdDev') || 'Desviación típica global', nota(datosGlobal?.stats?.desviacion)],
        [t('reportGlobalPassed') || '% Aprobados global', porcentaje(datosGlobal?.stats?.aprobados)],
        [t('reportGlobalFailed') || '% Suspensos global', porcentaje(datosGlobal?.stats?.suspendidos)],
      ];

      autoTable(pdf, {
        startY: contentStartY + 10,
        head: [[t('indicator') || 'Indicador', t('value') || 'Valor']],
        body: resumenData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.primary, fontSize: 11, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: anchosQueCaben({
          0: { cellWidth: 100, fontStyle: 'bold' },
          1: { cellWidth: 80, halign: 'right' }
        }, contentWidth),
        margin: { left: PAGE.margin, right: PAGE.margin },
        tableWidth: 'wrap',
      });

      addFooter();
    }

    // ========== KPIs VISUALES ==========
    if (configInforme.incluirKPIs !== false && kpisGlobales) {
    /* En modo TODOS no hay UNAS cifras del centro: elemental y profesional son
       dos poblaciones distintas y su media conjunta no significa nada. El
       núcleo lo dice devolviendo `modoComparativo` con los dos bloques
       aparte, y la pantalla lo respeta.

       El informe NO lo respetaba: leía `kpisGlobales.notaMediaCentro` a secas,
       que en ese modo eran ceros de relleno, e imprimía tres páginas enteras
       de KPIs a 0,00 — con las diferencias porcentuales vacías, porque no se
       puede dividir por cero. Ahora se imprime un juego de páginas POR ETAPA,
       cada uno rotulado con la suya. */
    const bloquesKPI = (kpisGlobales && kpisGlobales.modoComparativo)
      ? [{ etapa: 'EEM', kpis: kpisGlobales.kpisEEM },
         { etapa: 'EPM', kpis: kpisGlobales.kpisEPM }].filter((b) => b.kpis)
      : [{ etapa: null, kpis: kpisGlobales }];

    for (const bloque of bloquesKPI) {
      const kpisBloque = bloque.kpis;
      const sufijoEtapa = bloque.etapa ? ` — ${bloque.etapa}` : '';

        onProgress?.(t('pdfGeneratingKPIs'));
        addNewPage(t('kpis') + sufijoEtapa);

        pdf.setFontSize(18);
        pdf.setTextColor(...COLORS.primary);
        pdf.text(t('kpis') + sufijoEtapa, PAGE.margin, contentStartY);
        pdf.setTextColor(...COLORS.text);

        // Dibujar cards de KPIs
        const cardWidth = 62;
        const cardHeight = 35;
        const cardsPerRow = 4;
        const cardSpacing = 6;
        let cardY = contentStartY + 12;
        let cardX = PAGE.margin;
        let cardCount = 0;

        const drawKPICard = (label, value, color, unit = '') => {
          // Fondo de la card
          pdf.setFillColor(...COLORS.light);
          pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'F');

          // Barra de color superior
          pdf.setFillColor(...color);
          pdf.roundedRect(cardX, cardY, cardWidth, 4, 3, 3, 'F');
          pdf.rect(cardX, cardY + 2, cardWidth, 2, 'F');

          // Valor
          pdf.setFontSize(18);
          pdf.setTextColor(...color);
          pdf.text(`${value}${unit}`, cardX + cardWidth / 2, cardY + 18, { align: 'center' });

          // Label
          pdf.setFontSize(8);
          pdf.setTextColor(...COLORS.textLight);
          const labelLines = pdf.splitTextToSize(label, cardWidth - 4);
          pdf.text(labelLines, cardX + cardWidth / 2, cardY + 26, { align: 'center' });

          // Siguiente posición
          cardCount++;
          if (cardCount % cardsPerRow === 0) {
            cardX = PAGE.margin;
            cardY += cardHeight + cardSpacing;
          } else {
            cardX += cardWidth + cardSpacing;
          }
        };

        /* Las tarjetas: «—» donde no hay dato, que es lo que hace la pantalla.
           Los nombres alternativos (`notaMediaEsp`, `countDificiles`) son de
           una forma del objeto que el núcleo ya no devuelve; se quedan como
           respaldo pero sin el `|| 0` detrás, que era lo que convertía la
           ausencia en una cifra. */
        const kpi = (...campos) => {
          for (const c of campos) if (typeof kpisBloque[c] === 'number') return kpisBloque[c];
          return null;
        };

        // Primera fila: KPIs principales
        drawKPICard(t('kpiCenterAvg'), nota(kpi('notaMediaCentro')), COLORS.info);
        drawKPICard(t('kpiStdDev'), nota(kpi('desviacionCentro')), [99, 102, 241]); // Indigo
        drawKPICard(t('kpiMode'), entero(kpi('modaCentro')), [139, 92, 246]); // Violet
        drawKPICard(t('kpiPassedAvg'), porcentaje(kpi('aprobadosCentro')), COLORS.success);

        // Segunda fila: Especialidades
        drawKPICard(t('kpiInstrAvg'), nota(kpi('notaMediaEspecialidades', 'notaMediaEsp')), COLORS.warning);
        drawKPICard(t('kpiPassedInstr'), porcentaje(kpi('aprobadosEspecialidades', 'aprobadosEsp')), COLORS.success);
        drawKPICard(t('kpiDifficult'), entero(kpi('asignaturasDificiles', 'countDificiles')), COLORS.danger);
        drawKPICard(t('kpiEasy'), entero(kpi('asignaturasFaciles', 'countFaciles')), COLORS.success);

        // Tercera fila: Referencia (si hay)
        if (kpisBloque.notasMediasRef && kpisBloque.notasMediasRef.length > 0) {
          kpisBloque.notasMediasRef.forEach(ref => {
            const label = ref.asignatura === 'Teórica Troncal' ? t('kpiTTAvg') : t('kpiLMAvg');
            drawKPICard(label, nota(ref.notaMedia), [6, 182, 212]); // Cyan
          });
        }

        addFooter();

        // Alumnos por curso (si hay datos) - en página separada
        if (kpisBloque.alumnosPorCurso && kpisBloque.alumnosPorCurso.length > 0) {
          addNewPage(t('studentsPerCourse') || 'Alumnos por Curso');

          pdf.setFontSize(18);
          pdf.setTextColor(...COLORS.primary);
          pdf.text(t('studentsPerCourse') || 'Alumnos por Curso', PAGE.margin, contentStartY);
          pdf.setTextColor(...COLORS.text);

          // Reiniciar posición de cards
          cardY = contentStartY + 15;
          cardX = PAGE.margin;
          cardCount = 0;

          kpisBloque.alumnosPorCurso.forEach(({ nivel, alumnos }) => {
            drawKPICard(nivel, alumnos.toString(), COLORS.warning);
          });

          addFooter();
        }


        // ========== KPI DETALLE (Especialidades vs No Especialidades) ==========
        addNewPage((t('kpiDetail') || 'KPIs - Detalle por Tipo') + sufijoEtapa);
        pdf.setFontSize(18);
        pdf.setTextColor(...COLORS.primary);
        pdf.text(t('kpiDetail') || 'KPIs - Detalle por Tipo', PAGE.margin, contentStartY);
        pdf.setTextColor(...COLORS.text);

        // Función para dibujar grupo de KPIs
        const drawKPIGroup = (title, data, startX, color) => {
          const groupWidth = 80;
          let y = contentStartY + 18;

          // Título del grupo
          pdf.setFillColor(...color);
          pdf.roundedRect(startX, y, groupWidth, 8, 2, 2, 'F');
          pdf.setFontSize(11);
          pdf.setTextColor(255, 255, 255);
          pdf.text(title, startX + groupWidth / 2, y + 5.5, { align: 'center' });
          y += 14;

          // Métricas
          const metrics = [
            { label: t('avgGrade') || 'Nota Media', value: nota(data.notaMedia) },
            { label: t('kpiStdDev') || 'Desviación', value: nota(data.desviacion) },
            { label: t('kpiMode') || 'Moda', value: entero(data.moda) },
            { label: t('passed') || '% Aprobados', value: porcentaje(data.aprobados) },
            { label: t('failed') || '% Suspensos', value: porcentaje(data.suspendidos) }
          ];

          metrics.forEach(metric => {
            pdf.setFillColor(...COLORS.light);
            pdf.roundedRect(startX, y, groupWidth, 18, 2, 2, 'F');

            pdf.setFontSize(8);
            pdf.setTextColor(...COLORS.textLight);
            pdf.text(metric.label, startX + 4, y + 6);

            pdf.setFontSize(14);
            pdf.setTextColor(...color);
            pdf.text(metric.value, startX + groupWidth - 4, y + 13, { align: 'right' });

            y += 22;
          });
        };

        // Determinar columnas según modoEtapa
        const modoEtapa = bloque.etapa || configInforme.modoEtapa || 'TODOS';
        const columnWidth = 80;
        const columnGap = 12;

        if (modoEtapa === 'EPM') {
          // 3 columnas: Teórica Troncal, Especialidades, No Especialidades
          const startX = PAGE.margin + (contentWidth - 3 * columnWidth - 2 * columnGap) / 2;

          drawKPIGroup('Teórica Troncal', {
            notaMedia: kpisBloque.notaMediaTeoricaTroncal,
            desviacion: kpisBloque.desviacionTeoricaTroncal,
            moda: kpisBloque.modaTeoricaTroncal,
            aprobados: kpisBloque.aprobadosTeoricaTroncal,
            suspendidos: kpisBloque.suspendidosTeoricaTroncal
          }, startX, [6, 182, 212]); // Cyan

          drawKPIGroup(t('specialties') || 'Especialidades', {
            notaMedia: kpisBloque.notaMediaEspecialidades,
            desviacion: kpisBloque.desviacionEspecialidades,
            moda: kpisBloque.modaEspecialidades,
            aprobados: kpisBloque.aprobadosEspecialidades,
            suspendidos: kpisBloque.suspendidosEspecialidades
          }, startX + columnWidth + columnGap, COLORS.warning);

          drawKPIGroup(t('nonSpecialties') || 'No Especialidades', {
            notaMedia: kpisBloque.notaMediaNoEspecialidades,
            desviacion: kpisBloque.desviacionNoEspecialidades,
            moda: kpisBloque.modaNoEspecialidades,
            aprobados: kpisBloque.aprobadosNoEspecialidades,
            suspendidos: kpisBloque.suspendidosNoEspecialidades
          }, startX + 2 * (columnWidth + columnGap), [139, 92, 246]); // Purple
        } else {
          // 2 columnas: Especialidades, No Especialidades
          const startX = PAGE.margin + (contentWidth - 2 * columnWidth - columnGap) / 2;

          drawKPIGroup(t('specialties') || 'Especialidades', {
            notaMedia: kpisBloque.notaMediaEspecialidades,
            desviacion: kpisBloque.desviacionEspecialidades,
            moda: kpisBloque.modaEspecialidades,
            aprobados: kpisBloque.aprobadosEspecialidades,
            suspendidos: kpisBloque.suspendidosEspecialidades
          }, startX, COLORS.warning);

          drawKPIGroup(t('nonSpecialties') || 'No Especialidades', {
            notaMedia: kpisBloque.notaMediaNoEspecialidades,
            desviacion: kpisBloque.desviacionNoEspecialidades,
            moda: kpisBloque.modaNoEspecialidades,
            aprobados: kpisBloque.aprobadosNoEspecialidades,
            suspendidos: kpisBloque.suspendidosNoEspecialidades
          }, startX + columnWidth + columnGap, [139, 92, 246]); // Purple
        }

        addFooter();

        // ========== KPI COMPARATIVA (Tabla) ==========
        addNewPage((t('kpiComparison') || 'KPIs - Comparativa') + sufijoEtapa);
        pdf.setFontSize(18);
        pdf.setTextColor(...COLORS.primary);
        pdf.text((t('kpiComparison') || 'KPIs - Comparativa') + sufijoEtapa, PAGE.margin, contentStartY);
        pdf.setTextColor(...COLORS.text);

        /* Las cinco filas las monta el núcleo (`filasComparativaKPI`), que es
           donde está probado que una columna sin dato dice «—» y no «0.00
           (-100,0 %)». Aquí solo se decide QUÉ columnas hay y cómo se
           rotulan. Antes eran cien líneas de plantilla repetida dos veces
           —una para profesional y otra para el resto— con el `|| 0` metido en
           cada celda. */
        const rotulosKPI = {
          notaMedia: t('avgGrade') || 'Nota Media',
          desviacion: t('kpiStdDev') || 'Desviación',
          moda: t('kpiMode') || 'Moda',
          aprobados: t('passed') || '% Aprobados',
          suspendidos: t('failed') || '% Suspensos'
        };
        const rotCentro = t('center') || 'Centro';
        const rotEsp = t('specialties') || 'Especialidades';
        const rotNoEsp = t('nonSpecialties') || 'No Especialidades';
        const rotTT = t('theoreticalCore') || 'Teórica Troncal';
        const rotMetrica = t('metric') || 'Métrica';

        const columnasKPI = modoEtapa === 'EPM'
          ? [{ esCentro: true, rotulo: rotCentro },
             { sufijo: 'TeoricaTroncal', rotulo: rotTT },
             { sufijo: 'Especialidades', rotulo: rotEsp },
             { sufijo: 'NoEspecialidades', rotulo: rotNoEsp }]
          : [{ sufijo: 'Especialidades', rotulo: rotEsp },
             { esCentro: true, rotulo: rotCentro },
             { sufijo: 'NoEspecialidades', rotulo: rotNoEsp }];

        const comparativaHead = [[rotMetrica, ...columnasKPI.map((c) => c.rotulo)]];
        const comparativaBody = filasComparativaKPI(kpisBloque, columnasKPI, rotulosKPI);

        autoTable(pdf, {
          startY: contentStartY + 10,
          head: comparativaHead,
          body: comparativaBody,
          theme: 'grid',
          headStyles: { fillColor: COLORS.primary, fontSize: 10, fontStyle: 'bold', halign: 'center' },
          styles: { fontSize: 10, cellPadding: 5 },
          columnStyles: anchosQueCaben(modoEtapa === 'EPM' ? {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 50, halign: 'center', fillColor: [219, 234, 254] }, // Blue bg
            2: { cellWidth: 55, halign: 'center' },
            3: { cellWidth: 55, halign: 'center' },
            4: { cellWidth: 55, halign: 'center' }
          } : {
            0: { cellWidth: 60, fontStyle: 'bold' },
            1: { cellWidth: 70, halign: 'center' },
            2: { cellWidth: 70, halign: 'center', fillColor: [219, 234, 254] }, // Blue bg
            3: { cellWidth: 70, halign: 'center' }
          }, contentWidth),
          margin: { left: PAGE.margin, right: PAGE.margin }
        });

        // Leyenda
        const legendY = pdf.lastAutoTable?.finalY + 10 || contentStartY + 80;
        pdf.setFontSize(9);
        pdf.setTextColor(...COLORS.textLight);
        pdf.text(t('comparisonLegend') || 'Los valores entre paréntesis indican la diferencia porcentual respecto al centro.', PAGE.margin, legendY);

        addFooter();
    }

    }

    // ========== ALERTAS A LO LARGO DEL CURSO ==========
    /* El relato del curso: qué asignaturas entran y salen de la lista roja
       entre evaluaciones. Es el contenido más de informe que tiene la
       aplicación y hasta ahora no salía del navegador. */
    if (configInforme.incluirAlertas !== false && serieAlertasPDF) {
      pintarSeccion({
        titulo: t('alrTitulo') || 'Alertas a lo largo del curso',
        contenido: tablaRecuento(serieAlertasPDF, rotulosAlertas),
        color: [180, 83, 9]
      });
      pintarSeccion({
        titulo: t('alrCambiosTitulo') || 'Qué ha cambiado entre evaluaciones',
        subtitulo: t('alrCambiosDesc') || '',
        contenido: tablaCambios(serieAlertasPDF, rotulosAlertas),
        color: [180, 83, 9]
      });
    }

    // ========== CURSO ACADÉMICO CONTRA CURSO ACADÉMICO ==========
    if (configInforme.incluirEntreCursos !== false) {
      pintarSeccion({
        titulo: t('entreCursosTitulo') || 'Comparación con cursos anteriores',
        subtitulo: t('entreCursosDesc') || '',
        contenido: tablaEntreCursos({
          trimestresDisponibles, datosCompletos,
          modoEtapa: modoEtapaConfig, trimestreSeleccionado,
          rotulos: rotulosCursos
        }),
        color: [67, 56, 202]
      });
    }

    // ========== COMPARATIVA ASIGNATURAS VS CENTRO (SOLO PARA GRUPOS) ==========
    const filtroAgrupacionesActivo = configInforme.filtroAgrupaciones != null && configInforme.filtroAgrupaciones.length > 0;
    if (filtroAgrupacionesActivo) {
      onProgress?.(t('pdfGeneratingGroupComparison'));
      addNewPage(t('subjectVsCenter') || 'Comparativa Asignaturas vs Centro');

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('subjectVsCenter') || 'Comparativa Asignaturas vs Centro', PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      // Obtener nota media del centro (GLOBAL)
      const statsCentro = datosCompletos[trimestreSeleccionado]?.['GLOBAL']?.['Total']?.stats;
      const notaMediaCentro = typeof statsCentro?.notaMedia === 'number'
        ? statsCentro.notaMedia
        : (typeof kpisGlobales?.notaMediaCentro === 'number' ? kpisGlobales.notaMediaCentro : null);
      /* El respaldo era `kpisGlobales?.porcentajeAprobados`, un campo que el
         núcleo no devuelve con ese nombre: cuando el CSV no traía el «Total»
         global, la referencia del centro caía a cero y TODAS las asignaturas
         salían «por encima del centro» con la diferencia entera. */
      const aprobadosCentro = typeof statsCentro?.aprobados === 'number'
        ? statsCentro.aprobados
        : (typeof kpisGlobales?.aprobadosCentro === 'number' ? kpisGlobales.aprobadosCentro : null);

      // Helper para obtener número de nivel
      const getNivelNum = (n) => parseInt(n.match(/\d+/)?.[0] || '0');

      /* PARTE 1: cada asignatura agregando todos sus cursos, contra el centro.
         La media ponderada la hace el núcleo, que es donde está probado que un
         curso sin nota no cuenta como un cero. */
      const globalesData = porAsignaturaAgregada(
        datosCompletos[trimestreSeleccionado], perteneceAGruposFiltrados
      ).map((a) => [
        a.asignatura,
        t('globalAllLevels') || 'Todos los cursos',
        nota(a.notaMedia),
        conSigno(diferencia(a.notaMedia, notaMediaCentro), (n) => n.toFixed(2)),
        porcentaje(a.aprobados),
        conSigno(diferencia(a.aprobados, aprobadosCentro), (n) => `${n.toFixed(1)}pp`)
      ]);

      // Añadir fila de referencia del centro
      globalesData.unshift([
        `${t('center') || 'Centro'} (${t('reference') || 'ref.'})`,
        '-',
        nota(notaMediaCentro),
        '-',
        porcentaje(aprobadosCentro),
        '-'
      ]);

      pdf.setFontSize(12);
      pdf.setTextColor(...COLORS.secondary);
      pdf.text(t('globalComparison') || 'Comparativa Global (asignaturas agregadas vs centro)', PAGE.margin, contentStartY + 8);
      pdf.setTextColor(...COLORS.text);

      autoTable(pdf, {
        startY: contentStartY + 12,
        head: [
          [
            t('subject') || 'Asignatura',
            t('scope') || 'Ámbito',
            t('average') || 'Nota Media',
            t('vsCenter') || 'vs Centro',
            t('passed') || '% Aprobados',
            t('vsCenter') || 'vs Centro'
          ]
        ],
        body: globalesData,
        theme: 'striped',
        headStyles: {
          fillColor: [88, 28, 135],
          fontSize: 9,
          fontStyle: 'bold'
        },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: anchosQueCaben({
          0: { cellWidth: 55 },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 28, halign: 'center' },
          5: { cellWidth: 28, halign: 'center' }
        }, contentWidth),
        didParseCell: function(data) {
          if (data.section === 'body' && data.row.index === 0) {
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.section === 'body' && data.row.index > 0) {
            if (data.column.index === 3) {
              const valor = parseFloat(data.cell.raw) || 0;
              data.cell.styles.textColor = valor > 0 ? COLORS.success : valor < 0 ? COLORS.danger : COLORS.text;
            }
            if (data.column.index === 5) {
              const texto = data.cell.raw || '';
              const valor = parseFloat(texto.replace('pp', '').replace('+', '')) || 0;
              data.cell.styles.textColor = texto.startsWith('+') && valor > 0 ? COLORS.success : valor < 0 ? COLORS.danger : COLORS.text;
            }
          }
        },
        margin: { left: PAGE.margin, right: PAGE.margin }
      });

      // ========== PARTE 2: COMPARATIVA POR CURSO (asignatura por curso vs global del curso) ==========
      addNewPage(t('subjectVsCourse') || 'Comparativa por Curso');

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('subjectVsCourse') || 'Comparativa por Curso', PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      pdf.setFontSize(10);
      pdf.setTextColor(...COLORS.textLight);
      pdf.text(t('subjectVsCourseDesc') || 'Cada asignatura comparada con la media global del mismo curso', PAGE.margin, contentStartY + 6);
      pdf.setTextColor(...COLORS.text);

      // Recopilar datos por curso, comparando con el Total de ese nivel
      const asignaturasPorCurso = [];
      Object.keys(datosCompletos[trimestreSeleccionado] || {}).forEach(nivel => {
        if (nivel === 'GLOBAL') return;
        const datosNivel = datosCompletos[trimestreSeleccionado]?.[nivel];
        if (!datosNivel) return;

        /* La referencia del curso. Sin la fila «Total» del nivel no hay
           contra qué comparar, y ponerla a cero hacía que toda asignatura
           saliera «+7,20 sobre la media del curso». */
        const statsNivel = datosNivel['Total']?.stats;
        const mediaRefNivel = typeof statsNivel?.notaMedia === 'number' ? statsNivel.notaMedia : null;
        const aprobadosRefNivel = typeof statsNivel?.aprobados === 'number' ? statsNivel.aprobados : null;

        Object.entries(datosNivel).forEach(([asig, data]) => {
          if (!esAgregado(asig)) {
            if (perteneceAGruposFiltrados(asig) && data?.stats) {
              const media = typeof data.stats.notaMedia === 'number' ? data.stats.notaMedia : null;
              const aprob = typeof data.stats.aprobados === 'number' ? data.stats.aprobados : null;
              asignaturasPorCurso.push({
                asignatura: asig,
                nivel,
                nivelNum: getNivelNum(nivel),
                notaMedia: media,
                aprobados: aprob,
                mediaRefNivel,
                aprobadosRefNivel,
                diffMedia: diferencia(media, mediaRefNivel),
                diffAprobados: diferencia(aprob, aprobadosRefNivel)
              });
            }
          }
        });
      });

      // Ordenar por asignatura y luego por nivel
      asignaturasPorCurso.sort((a, b) => {
        const asigCompare = a.asignatura.localeCompare(b.asignatura, 'es', { sensitivity: 'base' });
        if (asigCompare !== 0) return asigCompare;
        return a.nivelNum - b.nivelNum;
      });

      // Preparar datos para la tabla
      const tableDataPorCurso = asignaturasPorCurso.map(asig => [
        asig.asignatura,
        asig.nivel,
        nota(asig.notaMedia),
        nota(asig.mediaRefNivel),
        conSigno(asig.diffMedia, (n) => n.toFixed(2)),
        porcentaje(asig.aprobados),
        conSigno(asig.diffAprobados, (n) => `${n.toFixed(1)}pp`)
      ]);

      autoTable(pdf, {
        startY: contentStartY + 12,
        head: [
          [
            t('subject') || 'Asignatura',
            t('level') || 'Curso',
            t('average') || 'Media',
            t('courseAvg') || 'Media Curso',
            t('difference') || 'Dif.',
            t('passed') || '% Aprob.',
            t('difference') || 'Dif.'
          ]
        ],
        body: tableDataPorCurso,
        theme: 'striped',
        headStyles: {
          fillColor: [88, 28, 135],
          fontSize: 8,
          fontStyle: 'bold'
        },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: anchosQueCaben({
          0: { cellWidth: 50 },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 28, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' },
          6: { cellWidth: 22, halign: 'center' }
        }, contentWidth),
        didParseCell: function(data) {
          if (data.section === 'body') {
            // Diferencia nota media
            if (data.column.index === 4) {
              const valor = parseFloat(data.cell.raw) || 0;
              data.cell.styles.textColor = valor > 0 ? COLORS.success : valor < 0 ? COLORS.danger : COLORS.text;
            }
            // Diferencia aprobados
            if (data.column.index === 6) {
              const texto = data.cell.raw || '';
              const valor = parseFloat(texto.replace('pp', '').replace('+', '')) || 0;
              data.cell.styles.textColor = texto.startsWith('+') && valor > 0 ? COLORS.success : valor < 0 ? COLORS.danger : COLORS.text;
            }
          }
        },
        didDrawPage: (data) => {
          if (data.pageNumber > currentPage) {
            currentPage = data.pageNumber;
            addHeader();
          }
          addFooter();
        },
        margin: { left: PAGE.margin, right: PAGE.margin }
      });

    }

    // ========== MAPA DE DISPERSIÓN ==========
    if (configInforme.incluirMapaDispersion !== false && chartImages.scatter) {
      onProgress?.(t('pdfAddingCharts'));
      addNewPage();

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);

      // Título diferente si hay filtro de grupo
      const tituloDispersion = filtroAgrupacionesActivo
        ? `${t('filteredDispersion') || 'Mapa de dispersión filtrado'}: ${configInforme.filtroAgrupaciones.join(', ')}`
        : t('dispersionMap');
      secciones.push({ titulo: tituloDispersion, pagina: pdf.getNumberOfPages() });
      pdf.text(tituloDispersion, PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      // Nota si está filtrado
      if (filtroAgrupacionesActivo) {
        pdf.setFontSize(9);
        pdf.setTextColor(...COLORS.textLight);
        pdf.text(t('showingGroupOnly') || 'Mostrando solo asignaturas del grupo', PAGE.margin, contentStartY + 6);
        pdf.setTextColor(...COLORS.text);
      }

      // Añadir imagen del gráfico
      const imgStartY = filtroAgrupacionesActivo ? contentStartY + 12 : contentStartY + 8;
      ponerImagen(chartImages.scatter, imgStartY, PAGE.height - imgStartY - PAGE.footerHeight - 10);

      addFooter();
    }

    // ========== EVOLUCIÓN DE CORRELACIONES ==========
    if (configInforme.incluirEvolucionCorrelaciones !== false && chartImages.correlationEvolution) {
      onProgress?.(t('pdfAddingCharts'));
      addNewPage(t('correlationEvolution'));

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('correlationEvolution'), PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      // Añadir imagen del gráfico
      ponerImagen(chartImages.correlationEvolution, contentStartY + 8,
        PAGE.height - contentStartY - PAGE.footerHeight - 15);

      addFooter();
    }

    // ========== CORRELACIONES DETALLADAS ==========
    if (configInforme.incluirCorrelaciones !== false && correlacionesTrimestre && correlacionesTrimestre.length > 0) {
      onProgress?.(t('pdfGeneratingCorrelations'));
      addNewPage(t('correlationsTitle'));

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('correlationsTitle'), PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      // Función para obtener color según correlación
      const getCorrelationColor = (corr) => {
        const val = Math.abs(corr);
        if (corr < 0) return [26, 26, 46]; // Inversa oscura
        if (val >= 0.8) return [6, 95, 70]; // Verde oscuro
        if (val >= 0.6) return [5, 150, 105]; // Esmeralda
        if (val >= 0.4) return [251, 191, 36]; // Ámbar
        if (val >= 0.2) return [249, 115, 22]; // Naranja
        return [239, 68, 68]; // Rojo
      };

      // Tabla de correlaciones
      /* Una correlación que no se ha podido calcular no es «0.000» —que
         significa «no hay relación», una afirmación bien fuerte—: es que no
         hay dato. */
      const correlacionesData = correlacionesTrimestre.map((corr, idx) => [
        (idx + 1).toString(),
        corr.Nivel || '',
        corr.Asignatura1 || '',
        corr.Asignatura2 || '',
        texto(corr.Correlacion, (n) => n.toFixed(3))
      ]);

      autoTable(pdf, {
        startY: contentStartY + 10,
        head: [['#', t('level') || 'Nivel',
                `${t('subject') || 'Asignatura'} 1`, `${t('subject') || 'Asignatura'} 2`,
                t('correlation') || 'Correlación']],
        body: correlacionesData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.primary, fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: anchosQueCaben({
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 80 },
          3: { cellWidth: 80 },
          4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
        }, contentWidth),
        margin: { left: PAGE.margin, right: PAGE.margin },
        didParseCell: (data) => {
          if (data.column.index === 4 && data.section === 'body') {
            const corr = parseFloat(data.cell.raw);
            if (!isNaN(corr)) {
              data.cell.styles.textColor = getCorrelationColor(corr);
            }
          }
        },
        didDrawPage: (data) => {
          if (data.pageNumber > currentPage) {
            currentPage = data.pageNumber;
            addHeader();
          }
          addFooter();
        }
      });
    }

    // ========== FAMILIAS DE ASIGNATURAS ==========
    if (configInforme.incluirFamilias !== false && familiasPDF) {
      pintarSeccion({
        titulo: t('fam_titulo') || 'Familias de asignaturas',
        contenido: tablaFamilias(familiasPDF, rotulosFamilias),
        color: [88, 28, 135],
        anchos: { 0: { cellWidth: 87 }, 1: { cellWidth: 36, halign: 'center' },
                  2: { cellWidth: 36, halign: 'center' }, 3: { cellWidth: 36, halign: 'center' },
                  4: { cellWidth: 36, halign: 'center' }, 5: { cellWidth: 36, halign: 'center' } }
      });
    }

    // ========== LA COMPARACIÓN QUE COMPUSO EL USUARIO ==========
    /* La vista «Estadísticas»: las filas que alguien eligió a mano. Es
       precisamente la que se arma para llevarla a una reunión, así que era la
       más rara de todas de no poder imprimir. */
    if (configInforme.incluirSelecciones !== false && selecciones && selecciones.length) {
      pintarSeccion({
        titulo: t('statistics') || 'Estadísticas',
        subtitulo: t('selComparacionDesc') || '',
        /* El cuarto argumento no es opcional aunque lo parezca: las
           selecciones llevan su propio trimestre —la pantalla tiene un
           desplegable por fila— y sin la clave del que se está imprimiendo,
           las filas de otras evaluaciones salen con las cifras de esta.
           Es el mismo rótulo y otro número, que es la peor forma de fallar. */
        contenido: tablaSelecciones(selecciones,
          datosCompletos[trimestreSeleccionado], rotulosSelecciones,
          trimestreSeleccionado),
        color: [15, 118, 110],
        anchos: { 0: { cellWidth: 87 }, 1: { cellWidth: 24, halign: 'center' },
                  2: { cellWidth: 30, halign: 'center' }, 3: { cellWidth: 32, halign: 'center' },
                  4: { cellWidth: 24, halign: 'center' }, 5: { cellWidth: 34, halign: 'center' },
                  6: { cellWidth: 36, halign: 'center' } }
      });
    }

    // ========== COMPARATIVA TRANSVERSAL (múltiples páginas) ==========
    if (configInforme.incluirComparativaTransversal !== false && chartImages.transversalArray?.length > 0) {
      onProgress?.(t('pdfAddingCharts'));

      chartImages.transversalArray.forEach((imgData, idx) => {
        addNewPage();

        pdf.setFontSize(18);
        pdf.setTextColor(...COLORS.primary);
        const titulo = chartImages.transversalArray.length > 1
          ? `${t('transversalComparison')} (${idx + 1}/${chartImages.transversalArray.length})`
          : t('transversalComparison');
        secciones.push({ titulo, pagina: pdf.getNumberOfPages() });
        pdf.text(titulo, PAGE.margin, contentStartY);
        pdf.setTextColor(...COLORS.text);

        // Añadir imagen del gráfico
        ponerImagen(imgData, contentStartY + 8,
          PAGE.height - contentStartY - PAGE.footerHeight - 15);

        addFooter();
      });
    }

    // ========== EVOLUCIÓN DE NOTAS MEDIAS POR TRIMESTRE ==========
    if (configInforme.incluirEvolucionNotas !== false && chartImages.evolution) {
      onProgress?.(t('pdfGeneratingEvolution'));
      addNewPage(t('gradeEvolutionTitle') || 'Evolución de Notas Medias por Trimestre');

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('gradeEvolutionTitle') || 'Evolución de Notas Medias por Trimestre', PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      // Añadir imagen del gráfico
      ponerImagen(chartImages.evolution, contentStartY + 8,
        PAGE.height - contentStartY - PAGE.footerHeight - 15);

      addFooter();
    } else if (configInforme.incluirEvolucionNotas !== false && trimestresDisponibles.length < 2) {
      // Mostrar mensaje informativo si no hay suficientes trimestres
      onProgress?.(t('pdfGeneratingEvolution'));
      addNewPage(t('gradeEvolutionTitle') || 'Evolución de Notas Medias por Trimestre');

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('gradeEvolutionTitle') || 'Evolución de Notas Medias por Trimestre', PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      pdf.setFontSize(12);
      pdf.setTextColor(...COLORS.warning);
      pdf.text(t('notEnoughTrimesters') || 'Se requieren al menos 2 trimestres para mostrar la evolución', PAGE.margin, contentStartY + 20);
      pdf.setTextColor(...COLORS.text);

      addFooter();
    }

    // ========== ANÁLISIS DE TENDENCIAS TRANSVERSALES ==========
    if (configInforme.incluirAnalisisTendencias !== false && tendenciasParaPDF.length > 0) {
      onProgress?.(t('pdfGeneratingTrends'));
      addNewPage(t('trendAnalysisTitle') || 'Análisis de Tendencias Transversales');

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('trendAnalysisTitle') || 'Análisis de Tendencias Transversales', PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      // Colores para tipos de tendencia
      const getTrendColor = (tipo) => {
        if (tipo.includes('creciente')) return COLORS.success;
        if (tipo.includes('decreciente') || tipo === 'pico') return COLORS.danger;
        if (tipo === 'estable') return COLORS.info;
        if (tipo === 'valle') return COLORS.warning;
        return COLORS.textLight;
      };

      // Helper para formatear nombre de tendencia (sin iconos, solo texto)
      const formatTrendLabel = (tipo) => {
        const labels = {
          'estable': t('trendStable') || 'Estable',
          'creciente_sostenido': t('trendIncreasingSustained') || 'Creciente sostenido',
          'decreciente_sostenido': t('trendDecreasingSustained') || 'Decreciente sostenido',
          'creciente_acelerado': t('trendIncreasingAccelerated') || 'Creciente acelerado',
          'creciente_desacelerado': t('trendIncreasingDecelerated') || 'Creciente desacelerado',
          'decreciente_acelerado': t('trendDecreasingAccelerated') || 'Decreciente acelerado',
          'decreciente_desacelerado': t('trendDecreasingDecelerated') || 'Decreciente desacelerado',
          'valle': t('trendValley') || 'Valle',
          'pico': t('trendPeak') || 'Pico',
          'oscilante': t('trendOscillating') || 'Oscilante',
          'irregular': t('trendIrregular') || 'Irregular',
          'insuficiente': t('trendInsufficient') || 'Datos insuficientes'
        };
        return labels[tipo] || tipo;
      };

      // Preparar datos de la tabla (solo texto, sin iconos Unicode problemáticos)
      const tendenciasData = tendenciasParaPDF.map(item => {
        const labelMedia = formatTrendLabel(item.tendenciaMedia.tipo);
        const labelSusp = formatTrendLabel(item.tendenciaSuspensos.tipo);

        return [
          item.asignatura,
          labelMedia,
          labelSusp,
          item.tendenciaMedia.confianza === 'alta' ? (t('confidenceHigh') || 'Alta') : (t('confidenceLow') || 'Baja'),
          item.numNiveles
        ];
      });

      // Ordenar por tipo de tendencia (primero las problemáticas)
      const prioridadTendencia = {
        'decreciente_acelerado': 1,
        'decreciente_sostenido': 2,
        'pico': 3,
        'decreciente_desacelerado': 4,
        'oscilante': 5,
        'irregular': 6,
        'estable': 7,
        'valle': 8,
        'creciente_desacelerado': 9,
        'creciente_sostenido': 10,
        'creciente_acelerado': 11,
        'insuficiente': 12
      };
      tendenciasData.sort((a, b) => {
        const tipoA = tendenciasParaPDF.find(t => t.asignatura === a[0])?.tendenciaMedia.tipo || 'insuficiente';
        const tipoB = tendenciasParaPDF.find(t => t.asignatura === b[0])?.tendenciaMedia.tipo || 'insuficiente';
        return (prioridadTendencia[tipoA] || 99) - (prioridadTendencia[tipoB] || 99);
      });

      autoTable(pdf, {
        startY: contentStartY + 10,
        head: [
          [
            t('subject') || 'Asignatura',
            t('averageEvolution') || 'Tendencia Nota Media',
            t('failedEvolution') || 'Tendencia % Suspensos',
            t('confidence') || 'Confianza',
            t('levels') || 'Niveles'
          ]
        ],
        body: tendenciasData,
        theme: 'striped',
        headStyles: {
          fillColor: COLORS.primary,
          fontSize: 9,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        columnStyles: anchosQueCaben({
          0: { cellWidth: 60 },
          1: { cellWidth: 55 },
          2: { cellWidth: 55 },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' }
        }, contentWidth),
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 1) {
            const tipoMedia = tendenciasParaPDF[data.row.index]?.tendenciaMedia.tipo;
            if (tipoMedia) {
              const color = getTrendColor(tipoMedia);
              data.cell.styles.textColor = color;
            }
          }
          if (data.section === 'body' && data.column.index === 2) {
            const tipoSusp = tendenciasParaPDF[data.row.index]?.tendenciaSuspensos.tipo;
            if (tipoSusp) {
              // Para suspensos, invertir la lógica de colores
              let color = COLORS.textLight;
              if (tipoSusp.includes('creciente')) color = COLORS.danger; // Más suspensos = malo
              else if (tipoSusp.includes('decreciente')) color = COLORS.success; // Menos suspensos = bueno
              data.cell.styles.textColor = color;
            }
          }
        },
        margin: { left: PAGE.margin, right: PAGE.margin }
      });

      // Resumen de tendencias
      const resumenY = pdf.lastAutoTable.finalY + 15;

      // Contar tipos de tendencia
      const conteoTendencias = {};
      tendenciasParaPDF.forEach(item => {
        const tipo = item.tendenciaMedia.tipo;
        conteoTendencias[tipo] = (conteoTendencias[tipo] || 0) + 1;
      });

      pdf.setFontSize(12);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('trendSummary') || 'Resumen de Tendencias', PAGE.margin, resumenY);
      pdf.setTextColor(...COLORS.text);

      let summaryX = PAGE.margin;
      let summaryY = resumenY + 8;
      pdf.setFontSize(9);

      Object.entries(conteoTendencias)
        .sort((a, b) => (prioridadTendencia[a[0]] || 99) - (prioridadTendencia[b[0]] || 99))
        .forEach(([tipo, count]) => {
          const label = formatTrendLabel(tipo);
          const color = getTrendColor(tipo);

          pdf.setTextColor(...color);
          pdf.text(`${label}: ${count}`, summaryX, summaryY);
          summaryX += 55;

          if (summaryX > PAGE.width - PAGE.margin - 50) {
            summaryX = PAGE.margin;
            summaryY += 6;
          }
        });

      pdf.setTextColor(...COLORS.text);
      addFooter();
    }

    // ========== DATOS DE ASIGNATURAS ==========
    if (configInforme.incluirDatosAsignaturas !== false && analisisDificultad) {
      onProgress?.(t('pdfGeneratingSubjects'));

      // Función para extraer número de nivel para ordenar
      const getNivelOrder = (nivel) => {
        if (!nivel) return 999;
        const match = nivel.match(/(\d+)/);
        return match ? parseInt(match[1]) : 999;
      };

      // Función para generar sección de datos de asignaturas para una etapa específica
      const generarSeccionDatosAsignaturas = (etapaFiltro = null) => {
        // Filtrar por etapa si es necesario
        const filtrarPorEtapa = (asig) => {
          if (!etapaFiltro) return true;
          return detectarEtapa(asig.nivel) === etapaFiltro;
        };

        // Filtrar y ordenar
        const asignaturasOrdenadas = [...(analisisDificultad.todas || [])]
          .filter(asig => perteneceAGruposFiltrados(asig.asignatura) && filtrarPorEtapa(asig))
          .sort((a, b) => {
            const asigCompare = (a.asignatura || '').localeCompare(b.asignatura || '', 'es', { sensitivity: 'base' });
            if (asigCompare !== 0) return asigCompare;
            return getNivelOrder(a.nivel) - getNivelOrder(b.nivel);
          });

        if (asignaturasOrdenadas.length === 0) return; // No hay datos para esta etapa

        addNewPage();

        pdf.setFontSize(18);
        pdf.setTextColor(...COLORS.primary);
        const titulo = etapaFiltro
          ? `${t('subjectsData')} - ${etapaFiltro === 'EEM' ? (t('elementaryEducation') || 'Enseñanzas Elementales') : (t('professionalEducation') || 'Enseñanzas Profesionales')}`
          : t('subjectsData');
        secciones.push({ titulo, pagina: pdf.getNumberOfPages() });
        pdf.text(titulo, PAGE.margin, contentStartY);
        pdf.setTextColor(...COLORS.text);

        // Preparar datos
        const asignaturasData = asignaturasOrdenadas.map(asig => [
          asig.nivel || '',
          asig.asignatura || '',
          asig.registros || 0,
          nota(asig.notaMedia),
          nota(asig.desviacion),
          entero(asig.moda),
          porcentaje(asig.aprobados),
          entero(asig.modaAprobados),
          porcentaje(asig.suspendidos),
          entero(asig.modaSuspendidos)
        ]);

        autoTable(pdf, {
          startY: contentStartY + 10,
          head: [[
            t('level') || 'Curso',
            t('subject') || 'Asignatura',
            t('records') || 'N',
            t('average') || 'Media',
            /* «Desv.» y no «σ»: las fuentes estándar de jsPDF no tienen la
               sigma, y en el papel salía «Ã». Lo vigila `pruebas/traducciones.mjs`. */
            t('standardDeviationShort') || 'Desv.',
            t('mode') || 'Moda',
            t('passed') || '% Apr.',
            t('passedMode') || 'Moda Apr.',
            t('failed') || '% Susp.',
            t('failedMode') || 'Moda Susp.'
          ]],
          body: asignaturasData,
          theme: 'striped',
          headStyles: { fillColor: etapaFiltro === 'EEM' ? [6, 78, 59] : (etapaFiltro === 'EPM' ? [88, 28, 135] : COLORS.primary), fontSize: 8, fontStyle: 'bold' },
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: anchosQueCaben({
            0: { cellWidth: 18, halign: 'center' },
            1: { cellWidth: 55 },
            2: { cellWidth: 14, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 16, halign: 'center' },
            5: { cellWidth: 16, halign: 'center' },
            6: { cellWidth: 18, halign: 'center' },
            7: { cellWidth: 22, halign: 'center' },
            8: { cellWidth: 18, halign: 'center' },
            9: { cellWidth: 22, halign: 'center' }
          }, contentWidth),
          margin: { left: PAGE.margin, right: PAGE.margin },
          didParseCell: (data) => {
            if ((data.column.index === 6 || data.column.index === 7) && data.section === 'body') {
              data.cell.styles.textColor = COLORS.success;
            }
            if ((data.column.index === 8 || data.column.index === 9) && data.section === 'body') {
              data.cell.styles.textColor = COLORS.danger;
            }
          },
          didDrawPage: (data) => {
            if (data.pageNumber > currentPage) {
              currentPage = data.pageNumber;
              addHeader();
            }
            addFooter();
          }
        });

        // Análisis de dificultad detallado
        if (configInforme.incluirDificultad !== false) {
          const finalY = pdf.lastAutoTable?.finalY || contentStartY + 10;
          let yPos = finalY + 15;
          if (yPos > PAGE.height - 60) {
            addNewPage();
            yPos = contentStartY + 10;
          }

          pdf.setFontSize(14);
          pdf.setTextColor(...COLORS.primary);
          const tituloDificultad = etapaFiltro
            ? `${t('difficulty')} - ${etapaFiltro}`
            : `${t('difficulty')} - ${t('difficultyDetail')}`;
          pdf.text(tituloDificultad, PAGE.margin, yPos);
          pdf.setTextColor(...COLORS.text);
          yPos += 10;

          // Filtrar asignaturas según agrupaciones y etapa
          const dificilesFiltradas = (analisisDificultad.dificiles || [])
            .filter(asig => perteneceAGruposFiltrados(asig.asignatura) && filtrarPorEtapa(asig));
          const facilesFiltradas = (analisisDificultad.faciles || [])
            .filter(asig => perteneceAGruposFiltrados(asig.asignatura) && filtrarPorEtapa(asig));

          // Asignaturas Difíciles
          if (dificilesFiltradas.length > 0) {
            pdf.setFontSize(11);
            pdf.setTextColor(...COLORS.danger);
            pdf.text(`${t('difficultSubjects')} (${dificilesFiltradas.length})`, PAGE.margin, yPos);
            pdf.setTextColor(...COLORS.text);
            yPos += 6;

            dificilesFiltradas.forEach(asig => {
              if (yPos > PAGE.height - 30) {
                addNewPage();
                yPos = contentStartY + 10;
              }

              pdf.setFontSize(9);
              pdf.setFont(undefined, 'bold');
              pdf.text(`${asig.nivel} - ${asig.asignatura}`, PAGE.margin + 3, yPos);
              pdf.setFont(undefined, 'normal');
              yPos += 4;

              pdf.setFontSize(8);
              pdf.setTextColor(...COLORS.textLight);
              const razonLines = pdf.splitTextToSize(asig.razon || '', contentWidth - 6);
              pdf.text(razonLines, PAGE.margin + 3, yPos);
              yPos += razonLines.length * 3.5 + 3;
              pdf.setTextColor(...COLORS.text);
            });

            yPos += 5;
          }

          // Asignaturas Fáciles
          if (facilesFiltradas.length > 0) {
            if (yPos > PAGE.height - 40) {
              addNewPage();
              yPos = contentStartY + 10;
            }

            pdf.setFontSize(11);
            pdf.setTextColor(...COLORS.success);
            pdf.text(`${t('easySubjects')} (${facilesFiltradas.length})`, PAGE.margin, yPos);
            pdf.setTextColor(...COLORS.text);
            yPos += 6;

            facilesFiltradas.forEach(asig => {
              if (yPos > PAGE.height - 30) {
                addNewPage();
                yPos = contentStartY + 10;
              }

              pdf.setFontSize(9);
              pdf.setFont(undefined, 'bold');
              pdf.text(`${asig.nivel} - ${asig.asignatura}`, PAGE.margin + 3, yPos);
              pdf.setFont(undefined, 'normal');
              yPos += 4;

              pdf.setFontSize(8);
              pdf.setTextColor(...COLORS.textLight);
              const razonLines = pdf.splitTextToSize(asig.razon || '', contentWidth - 6);
              pdf.text(razonLines, PAGE.margin + 3, yPos);
              yPos += razonLines.length * 3.5 + 3;
              pdf.setTextColor(...COLORS.text);
            });
          }

          addFooter();
        }
      };

      // Generar secciones según modo de etapa
      if (generarPorEtapas) {
        // Modo TODOS con ambas etapas: generar separadamente
        etapasArray.forEach(etapa => {
          addStageSeparator(etapa);
          generarSeccionDatosAsignaturas(etapa);
        });
      } else {
        // Modo EEM, EPM o TODOS con una sola etapa
        const etapaFiltro = modoEtapaConfig !== 'TODOS' ? modoEtapaConfig : null;
        generarSeccionDatosAsignaturas(etapaFiltro);
      }
    }

    // ========== DISTRIBUCIÓN DE NOTAS POR ASIGNATURA ==========
    if (configInforme.incluirDistribucionNotas !== false && chartImages.distributionArray?.length > 0) {
      onProgress?.(t('pdfGeneratingDistribution') || 'Generando distribución de notas...');

      for (let i = 0; i < chartImages.distributionArray.length; i++) {
        const { image, asignatura } = chartImages.distributionArray[i];
        addNewPage();

        pdf.setFontSize(16);
        pdf.setTextColor(...COLORS.primary);
        secciones.push({ titulo: `${t('gradeDistribution') || 'Distribución de Notas'}: ${asignatura}`,
                         pagina: pdf.getNumberOfPages() });
        pdf.text(`${t('gradeDistribution') || 'Distribución de Notas'}: ${asignatura}`, PAGE.margin, contentStartY);
        pdf.setTextColor(...COLORS.text);

        pdf.setFontSize(10);
        pdf.setTextColor(...COLORS.textLight);
        pdf.text(t('distributionDesc') || 'Porcentaje de alumnos por nota en cada curso', PAGE.margin, contentStartY + 7);
        pdf.setTextColor(...COLORS.text);

        // Añadir imagen del gráfico de distribución
        /* Esta ya respetaba la proporción, pero con una fija escrita a mano
            (1200×550). Ahora se mide el PNG, como las demás. */
        ponerImagen(image, contentStartY + 12, PAGE.height - contentStartY - 30);

        addFooter();
      }

    }

    // ========== CÓMO HAY QUE LEER ESTE INFORME ==========
    /* Y esto va al FINAL, que es donde se pone una nota metodológica: quien
       la necesita la busca, y quien no, no tropieza con ella para llegar a
       las cifras. La ficha del principio dice con qué se ha clasificado;
       esta dice cómo hay que leer lo que salió. */
    if (configInforme.incluirNotaMetodologica !== false) {
      pintarSeccion({
        titulo: t('metTitulo') || 'Cómo hay que leer este informe',
        contenido: notaMetodologica({
          senales,
          datosTrimestre: datosCompletos[trimestreSeleccionado],
          umbrales,
          correlaciones: correlacionesTrimestre,
          rotulos: rotulosNota
        }),
        color: [71, 85, 105],
        anchos: { 0: { cellWidth: 110, fontStyle: 'bold' }, 1: { cellWidth: 157 } }
      });
    }

    /* ---------------------------------------------------------------- */
    /* El índice y los marcadores                                         */

    if (paginaIndice !== null && secciones.length > 0) {
      pdf.setPage(paginaIndice);
      addHeader();

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('tableOfContents') || 'Índice', PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      /* Dos columnas: con quince secciones y una A4 apaisada, una sola deja
         media hoja en blanco y obliga a recorrerla entera con la vista. */
      const porColumna = Math.ceil(secciones.length / 2);
      const anchoColumna = contentWidth / 2 - 6;

      secciones.forEach((sec, i) => {
        const col = Math.floor(i / porColumna);
        const x = PAGE.margin + col * (anchoColumna + 12);
        const y = contentStartY + 14 + (i % porColumna) * 8;

        pdf.setFontSize(sec.etapa ? 11 : 10);
        pdf.setTextColor(...(sec.etapa ? COLORS.primary : COLORS.text));
        pdf.setFont(undefined, sec.etapa ? 'bold' : 'normal');

        /* El título se recorta a lo que cabe menos el hueco del número: sin
           esto, un título largo —«Distribución de Notas: Lenguaje Musical»—
           se comía la cifra de la página, que es lo único que hace útil un
           índice. */
        const hueco = 14;
        let titulo = String(sec.titulo || '');
        while (pdf.getTextWidth(titulo) > anchoColumna - hueco && titulo.length > 4) {
          titulo = titulo.slice(0, -2);
        }
        if (titulo !== sec.titulo) titulo += '…';

        pdf.text(titulo, x, y);
        pdf.text(String(sec.pagina), x + anchoColumna - 2, y, { align: 'right' });

        /* La línea de puntos entre el título y el número: es lo que permite
           seguir la fila con el ojo sin equivocarse de renglón. */
        const finTitulo = x + pdf.getTextWidth(titulo) + 2;
        const inicioNum = x + anchoColumna - 2 - pdf.getTextWidth(String(sec.pagina)) - 2;
        if (inicioNum > finTitulo) {
          pdf.setTextColor(...COLORS.textLight);
          pdf.setLineDashPattern([0.4, 1.2], 0);
          pdf.setDrawColor(...COLORS.textLight);
          pdf.line(finTitulo, y - 1, inicioNum, y - 1);
          pdf.setLineDashPattern([], 0);
        }
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(...COLORS.text);
      });

      addFooter();
    }

    /* Y los marcadores del propio PDF, que es como se navega un documento
       largo desde el lector: el índice sirve en papel, esto en pantalla. */
    if (pdf.outline && typeof pdf.outline.add === 'function') {
      let raizEtapa = null;
      secciones.forEach((sec) => {
        if (sec.etapa) {
          raizEtapa = pdf.outline.add(null, sec.titulo, { pageNumber: sec.pagina });
        } else {
          pdf.outline.add(raizEtapa, sec.titulo, { pageNumber: sec.pagina });
        }
      });
    }

    // Guardar PDF
    onProgress?.(t('pdfSaving'));
    /* La clave del fichero va dentro del NOMBRE del PDF, así que aquí un
       carácter raro sale de la aplicación: según el navegador, una barra
       trunca el nombre o el guardado falla sin explicación. El curso académico
       viaja normalizado a dígitos justamente para que esto no pase, pero el
       saneado se queda como red — es el único sitio donde la clave cruza la
       frontera del programa. */
    const claveEnNombre = String(trimestreSeleccionado || '').replace(/[^\w.-]+/g, '_');
    const nombreArchivo = `Informe_${(configInforme.nombreCentro || 'Centro').replace(/\s+/g, '_')}_${claveEnNombre}_${new Date().toISOString().split('T')[0]}.pdf`;
    if (guardar) guardar(pdf, nombreArchivo);
    else pdf.save(nombreArchivo);

    if (onSuccess) onSuccess();
    return { pdf, nombreArchivo, paginas: pdf.getNumberOfPages() };
  } catch (error) {
    console.error('[PDF] Error al generar PDF:', error);
    console.error('[PDF] Stack trace:', error.stack);
    if (onError) onError(error);
  }
};

export default generarInformePDF;
