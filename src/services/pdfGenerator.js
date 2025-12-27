/**
 * Dashboard Académico - Servicio de Generación de Informes PDF
 * Genera informes PDF completos con KPIs visuales, gráficas y análisis detallado
 * Formato: A4 Horizontal (Landscape)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  t,
  onProgress,
  onSuccess,
  onError
}) => {
  console.log('[PDF] Iniciando generación de informe...');

  if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) {
    const error = new Error(t('noDataForReport'));
    if (onError) onError(error);
    return;
  }

  try {
    // Crear PDF en formato horizontal
    const pdf = new jsPDF('l', 'mm', 'a4');
    let currentPage = 0;

    // Helpers
    const addHeader = () => {
      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.textLight);
      pdf.text(configInforme.nombreCentro || '', PAGE.margin, 8);
      pdf.text(`${t('reportTitle')} - ${trimestreSeleccionado}`, PAGE.width - PAGE.margin, 8, { align: 'right' });
      pdf.setTextColor(...COLORS.text);
    };

    const addFooter = (pageNum) => {
      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.textLight);
      pdf.text(`Página ${pageNum}`, PAGE.width / 2, PAGE.height - 8, { align: 'center' });
      pdf.text(new Date().toLocaleDateString(), PAGE.width - PAGE.margin, PAGE.height - 8, { align: 'right' });
      pdf.setTextColor(...COLORS.text);
    };

    const addNewPage = () => {
      pdf.addPage();
      currentPage++;
      addHeader();
      return currentPage;
    };

    const contentWidth = PAGE.width - 2 * PAGE.margin;
    const contentStartY = PAGE.headerHeight + 5;

    // Función para normalizar texto (sin tildes, minúsculas)
    const normalizar = (texto) => {
      if (!texto) return '';
      return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    };

    // Función para detectar la etapa educativa de un nivel
    const detectarEtapa = (nivel) => {
      if (!nivel) return null;
      const nivelUpper = nivel.toUpperCase();
      if (nivelUpper.includes('EEM') || /^[1-4]EEM$/i.test(nivelUpper)) return 'EEM';
      if (nivelUpper.includes('EPM') || /^[1-6]EPM$/i.test(nivelUpper)) return 'EPM';
      return null;
    };

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
      pdf.text(nombreEtapa, PAGE.width / 2, PAGE.height / 2 - 10, { align: 'center' });

      pdf.setFontSize(24);
      pdf.text(`(${etapa})`, PAGE.width / 2, PAGE.height / 2 + 15, { align: 'center' });

      pdf.setTextColor(...COLORS.text);
      addFooter(currentPage);
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
              if (asig !== 'Total' && asig !== 'Total Especialidad' && asig !== 'Total no Especialidad') {
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
        pdf.text(trimestreSeleccionado, PAGE.width / 2, 78, { align: 'center' });
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
        pdf.text(trimestreSeleccionado, PAGE.width / 2, etapaTexto ? 74 : 65, { align: 'center' });
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

    // ========== ANÁLISIS GLOBAL ==========
    if (configInforme.incluirAnalisisGlobal !== false) {
      onProgress?.(t('pdfGeneratingAnalysis'));
      addNewPage();

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
            if (asig !== 'Total' && asig !== 'Total Especialidad' && asig !== 'Total no Especialidad') {
              asignaturas.add(asig);
            }
          });
        }
      });

      if (datosGlobal?.stats?.registros) {
        totalAlumnos = datosGlobal.stats.registros;
      }

      // Tabla de resumen
      const resumenData = [
        ['Evaluación analizada', trimestreSeleccionado],
        ['Niveles incluidos', niveles.length.toString()],
        ['Asignaturas distintas', asignaturas.size.toString()],
        ['Total de registros', totalAlumnos.toString()],
        ['Nota media global', datosGlobal?.stats?.notaMedia?.toFixed(2) || 'N/A'],
        ['Desviación típica global', datosGlobal?.stats?.desviacion?.toFixed(2) || 'N/A'],
        ['% Aprobados global', `${(datosGlobal?.stats?.aprobados || 0).toFixed(1)}%`],
        ['% Suspensos global', `${(datosGlobal?.stats?.suspendidos || 0).toFixed(1)}%`],
      ];

      autoTable(pdf, {
        startY: contentStartY + 10,
        head: [['Indicador', 'Valor']],
        body: resumenData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.primary, fontSize: 11, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 100, fontStyle: 'bold' },
          1: { cellWidth: 80, halign: 'right' }
        },
        margin: { left: PAGE.margin, right: PAGE.margin },
        tableWidth: 'wrap',
      });

      addFooter(currentPage);
    }

    // ========== KPIs VISUALES ==========
    if (configInforme.incluirKPIs !== false && kpisGlobales) {
      onProgress?.(t('pdfGeneratingKPIs'));
      addNewPage();

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('kpis'), PAGE.margin, contentStartY);
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

      // Primera fila: KPIs principales
      drawKPICard(t('kpiCenterAvg'), (kpisGlobales.notaMediaCentro || 0).toFixed(2), COLORS.info);
      drawKPICard(t('kpiStdDev'), (kpisGlobales.desviacionCentro || 0).toFixed(2), [99, 102, 241]); // Indigo
      drawKPICard(t('kpiMode'), (kpisGlobales.modaCentro || 0).toString(), [139, 92, 246]); // Violet
      drawKPICard(t('kpiPassedAvg'), (kpisGlobales.aprobadosCentro || 0).toFixed(1), COLORS.success, '%');

      // Segunda fila: Especialidades
      drawKPICard(t('kpiInstrAvg'), (kpisGlobales.notaMediaEspecialidades || kpisGlobales.notaMediaEsp || 0).toFixed(2), COLORS.warning);
      drawKPICard(t('kpiPassedInstr'), (kpisGlobales.aprobadosEspecialidades || kpisGlobales.aprobadosEsp || 0).toFixed(1), COLORS.success, '%');
      drawKPICard(t('kpiDifficult'), (kpisGlobales.asignaturasDificiles || kpisGlobales.countDificiles || 0).toString(), COLORS.danger);
      drawKPICard(t('kpiEasy'), (kpisGlobales.asignaturasFaciles || kpisGlobales.countFaciles || 0).toString(), COLORS.success);

      // Tercera fila: Referencia (si hay)
      if (kpisGlobales.notasMediasRef && kpisGlobales.notasMediasRef.length > 0) {
        kpisGlobales.notasMediasRef.forEach(ref => {
          const label = ref.asignatura === 'Teórica Troncal' ? t('kpiTTAvg') : t('kpiLMAvg');
          drawKPICard(label, (ref.notaMedia || 0).toFixed(2), [6, 182, 212]); // Cyan
        });
      }

      addFooter(currentPage);

      // Alumnos por curso (si hay datos) - en página separada
      if (kpisGlobales.alumnosPorCurso && kpisGlobales.alumnosPorCurso.length > 0) {
        addNewPage();

        pdf.setFontSize(18);
        pdf.setTextColor(...COLORS.primary);
        pdf.text(t('studentsPerCourse') || 'Alumnos por Curso', PAGE.margin, contentStartY);
        pdf.setTextColor(...COLORS.text);

        // Reiniciar posición de cards
        cardY = contentStartY + 15;
        cardX = PAGE.margin;
        cardCount = 0;

        kpisGlobales.alumnosPorCurso.forEach(({ nivel, alumnos }) => {
          drawKPICard(nivel, alumnos.toString(), COLORS.warning);
        });

        addFooter(currentPage);
      }

      console.log('[PDF] KPI Centro completado, creando KPI Detalle...');

      // ========== KPI DETALLE (Especialidades vs No Especialidades) ==========
      addNewPage();
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
          { label: t('avgGrade') || 'Nota Media', value: (data.notaMedia || 0).toFixed(2) },
          { label: t('kpiStdDev') || 'Desviación', value: (data.desviacion || 0).toFixed(2) },
          { label: t('kpiMode') || 'Moda', value: (data.moda || 0).toFixed(0) },
          { label: t('passed') || '% Aprobados', value: `${(data.aprobados || 0).toFixed(1)}%` },
          { label: t('failed') || '% Suspensos', value: `${(data.suspendidos || 0).toFixed(1)}%` }
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
      const modoEtapa = configInforme.modoEtapa || 'TODOS';
      const columnWidth = 80;
      const columnGap = 12;

      if (modoEtapa === 'EPM') {
        // 3 columnas: Teórica Troncal, Especialidades, No Especialidades
        const startX = PAGE.margin + (contentWidth - 3 * columnWidth - 2 * columnGap) / 2;

        drawKPIGroup('Teórica Troncal', {
          notaMedia: kpisGlobales.notaMediaTeoricaTroncal,
          desviacion: kpisGlobales.desviacionTeoricaTroncal,
          moda: kpisGlobales.modaTeoricaTroncal,
          aprobados: kpisGlobales.aprobadosTeoricaTroncal,
          suspendidos: kpisGlobales.suspendidosTeoricaTroncal
        }, startX, [6, 182, 212]); // Cyan

        drawKPIGroup(t('specialties') || 'Especialidades', {
          notaMedia: kpisGlobales.notaMediaEspecialidades,
          desviacion: kpisGlobales.desviacionEspecialidades,
          moda: kpisGlobales.modaEspecialidades,
          aprobados: kpisGlobales.aprobadosEspecialidades,
          suspendidos: kpisGlobales.suspendidosEspecialidades
        }, startX + columnWidth + columnGap, COLORS.warning);

        drawKPIGroup(t('nonSpecialties') || 'No Especialidades', {
          notaMedia: kpisGlobales.notaMediaNoEspecialidades,
          desviacion: kpisGlobales.desviacionNoEspecialidades,
          moda: kpisGlobales.modaNoEspecialidades,
          aprobados: kpisGlobales.aprobadosNoEspecialidades,
          suspendidos: kpisGlobales.suspendidosNoEspecialidades
        }, startX + 2 * (columnWidth + columnGap), [139, 92, 246]); // Purple
      } else {
        // 2 columnas: Especialidades, No Especialidades
        const startX = PAGE.margin + (contentWidth - 2 * columnWidth - columnGap) / 2;

        drawKPIGroup(t('specialties') || 'Especialidades', {
          notaMedia: kpisGlobales.notaMediaEspecialidades,
          desviacion: kpisGlobales.desviacionEspecialidades,
          moda: kpisGlobales.modaEspecialidades,
          aprobados: kpisGlobales.aprobadosEspecialidades,
          suspendidos: kpisGlobales.suspendidosEspecialidades
        }, startX, COLORS.warning);

        drawKPIGroup(t('nonSpecialties') || 'No Especialidades', {
          notaMedia: kpisGlobales.notaMediaNoEspecialidades,
          desviacion: kpisGlobales.desviacionNoEspecialidades,
          moda: kpisGlobales.modaNoEspecialidades,
          aprobados: kpisGlobales.aprobadosNoEspecialidades,
          suspendidos: kpisGlobales.suspendidosNoEspecialidades
        }, startX + columnWidth + columnGap, [139, 92, 246]); // Purple
      }

      addFooter(currentPage);
      console.log('[PDF] KPI Detalle completado, creando KPI Comparativa...');

      // ========== KPI COMPARATIVA (Tabla) ==========
      addNewPage();
      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('kpiComparison') || 'KPIs - Comparativa', PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      // Preparar datos de comparativa
      const calcDiff = (val, centro) => {
        if (!centro || centro === 0) return '';
        const diff = ((val - centro) / centro) * 100;
        const sign = diff > 0 ? '+' : '';
        return `(${sign}${diff.toFixed(1)}%)`;
      };

      const comparativaHead = modoEtapa === 'EPM'
        ? [['Métrica', 'Centro', 'Teórica Troncal', 'Especialidades', 'No Especialidades']]
        : [['Métrica', 'Especialidades', 'Centro', 'No Especialidades']];

      const comparativaBody = modoEtapa === 'EPM' ? [
        [
          t('avgGrade') || 'Nota Media',
          (kpisGlobales.notaMediaCentro || 0).toFixed(2),
          `${(kpisGlobales.notaMediaTeoricaTroncal || 0).toFixed(2)} ${calcDiff(kpisGlobales.notaMediaTeoricaTroncal, kpisGlobales.notaMediaCentro)}`,
          `${(kpisGlobales.notaMediaEspecialidades || 0).toFixed(2)} ${calcDiff(kpisGlobales.notaMediaEspecialidades, kpisGlobales.notaMediaCentro)}`,
          `${(kpisGlobales.notaMediaNoEspecialidades || 0).toFixed(2)} ${calcDiff(kpisGlobales.notaMediaNoEspecialidades, kpisGlobales.notaMediaCentro)}`
        ],
        [
          t('kpiStdDev') || 'Desviación',
          (kpisGlobales.desviacionCentro || 0).toFixed(2),
          `${(kpisGlobales.desviacionTeoricaTroncal || 0).toFixed(2)} ${calcDiff(kpisGlobales.desviacionTeoricaTroncal, kpisGlobales.desviacionCentro)}`,
          `${(kpisGlobales.desviacionEspecialidades || 0).toFixed(2)} ${calcDiff(kpisGlobales.desviacionEspecialidades, kpisGlobales.desviacionCentro)}`,
          `${(kpisGlobales.desviacionNoEspecialidades || 0).toFixed(2)} ${calcDiff(kpisGlobales.desviacionNoEspecialidades, kpisGlobales.desviacionCentro)}`
        ],
        [
          t('kpiMode') || 'Moda',
          (kpisGlobales.modaCentro || 0).toFixed(0),
          `${(kpisGlobales.modaTeoricaTroncal || 0).toFixed(0)} ${calcDiff(kpisGlobales.modaTeoricaTroncal, kpisGlobales.modaCentro)}`,
          `${(kpisGlobales.modaEspecialidades || 0).toFixed(0)} ${calcDiff(kpisGlobales.modaEspecialidades, kpisGlobales.modaCentro)}`,
          `${(kpisGlobales.modaNoEspecialidades || 0).toFixed(0)} ${calcDiff(kpisGlobales.modaNoEspecialidades, kpisGlobales.modaCentro)}`
        ],
        [
          t('passed') || '% Aprobados',
          `${(kpisGlobales.aprobadosCentro || 0).toFixed(1)}%`,
          `${(kpisGlobales.aprobadosTeoricaTroncal || 0).toFixed(1)}% ${calcDiff(kpisGlobales.aprobadosTeoricaTroncal, kpisGlobales.aprobadosCentro)}`,
          `${(kpisGlobales.aprobadosEspecialidades || 0).toFixed(1)}% ${calcDiff(kpisGlobales.aprobadosEspecialidades, kpisGlobales.aprobadosCentro)}`,
          `${(kpisGlobales.aprobadosNoEspecialidades || 0).toFixed(1)}% ${calcDiff(kpisGlobales.aprobadosNoEspecialidades, kpisGlobales.aprobadosCentro)}`
        ],
        [
          t('failed') || '% Suspensos',
          `${(kpisGlobales.suspendidosCentro || 0).toFixed(1)}%`,
          `${(kpisGlobales.suspendidosTeoricaTroncal || 0).toFixed(1)}% ${calcDiff(kpisGlobales.suspendidosTeoricaTroncal, kpisGlobales.suspendidosCentro)}`,
          `${(kpisGlobales.suspendidosEspecialidades || 0).toFixed(1)}% ${calcDiff(kpisGlobales.suspendidosEspecialidades, kpisGlobales.suspendidosCentro)}`,
          `${(kpisGlobales.suspendidosNoEspecialidades || 0).toFixed(1)}% ${calcDiff(kpisGlobales.suspendidosNoEspecialidades, kpisGlobales.suspendidosCentro)}`
        ]
      ] : [
        [
          t('avgGrade') || 'Nota Media',
          `${(kpisGlobales.notaMediaEspecialidades || 0).toFixed(2)} ${calcDiff(kpisGlobales.notaMediaEspecialidades, kpisGlobales.notaMediaCentro)}`,
          (kpisGlobales.notaMediaCentro || 0).toFixed(2),
          `${(kpisGlobales.notaMediaNoEspecialidades || 0).toFixed(2)} ${calcDiff(kpisGlobales.notaMediaNoEspecialidades, kpisGlobales.notaMediaCentro)}`
        ],
        [
          t('kpiStdDev') || 'Desviación',
          `${(kpisGlobales.desviacionEspecialidades || 0).toFixed(2)} ${calcDiff(kpisGlobales.desviacionEspecialidades, kpisGlobales.desviacionCentro)}`,
          (kpisGlobales.desviacionCentro || 0).toFixed(2),
          `${(kpisGlobales.desviacionNoEspecialidades || 0).toFixed(2)} ${calcDiff(kpisGlobales.desviacionNoEspecialidades, kpisGlobales.desviacionCentro)}`
        ],
        [
          t('kpiMode') || 'Moda',
          `${(kpisGlobales.modaEspecialidades || 0).toFixed(0)} ${calcDiff(kpisGlobales.modaEspecialidades, kpisGlobales.modaCentro)}`,
          (kpisGlobales.modaCentro || 0).toFixed(0),
          `${(kpisGlobales.modaNoEspecialidades || 0).toFixed(0)} ${calcDiff(kpisGlobales.modaNoEspecialidades, kpisGlobales.modaCentro)}`
        ],
        [
          t('passed') || '% Aprobados',
          `${(kpisGlobales.aprobadosEspecialidades || 0).toFixed(1)}% ${calcDiff(kpisGlobales.aprobadosEspecialidades, kpisGlobales.aprobadosCentro)}`,
          `${(kpisGlobales.aprobadosCentro || 0).toFixed(1)}%`,
          `${(kpisGlobales.aprobadosNoEspecialidades || 0).toFixed(1)}% ${calcDiff(kpisGlobales.aprobadosNoEspecialidades, kpisGlobales.aprobadosCentro)}`
        ],
        [
          t('failed') || '% Suspensos',
          `${(kpisGlobales.suspendidosEspecialidades || 0).toFixed(1)}% ${calcDiff(kpisGlobales.suspendidosEspecialidades, kpisGlobales.suspendidosCentro)}`,
          `${(kpisGlobales.suspendidosCentro || 0).toFixed(1)}%`,
          `${(kpisGlobales.suspendidosNoEspecialidades || 0).toFixed(1)}% ${calcDiff(kpisGlobales.suspendidosNoEspecialidades, kpisGlobales.suspendidosCentro)}`
        ]
      ];

      autoTable(pdf, {
        startY: contentStartY + 10,
        head: comparativaHead,
        body: comparativaBody,
        theme: 'grid',
        headStyles: { fillColor: COLORS.primary, fontSize: 10, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: modoEtapa === 'EPM' ? {
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
        },
        margin: { left: PAGE.margin, right: PAGE.margin }
      });

      // Leyenda
      const legendY = pdf.lastAutoTable?.finalY + 10 || contentStartY + 80;
      pdf.setFontSize(9);
      pdf.setTextColor(...COLORS.textLight);
      pdf.text(t('comparisonLegend') || 'Los valores entre paréntesis indican la diferencia porcentual respecto al centro.', PAGE.margin, legendY);

      addFooter(currentPage);
      console.log('[PDF] KPI Comparativa completado');
    }

    // ========== COMPARATIVA ASIGNATURAS VS CENTRO (SOLO PARA GRUPOS) ==========
    const filtroAgrupacionesActivo = configInforme.filtroAgrupaciones != null && configInforme.filtroAgrupaciones.length > 0;
    if (filtroAgrupacionesActivo) {
      onProgress?.(t('pdfGeneratingGroupComparison'));
      addNewPage();

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('subjectVsCenter') || 'Comparativa Asignaturas vs Centro', PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      // Obtener nota media del centro (GLOBAL)
      const datosGlobalCentro = datosCompletos[trimestreSeleccionado]?.['GLOBAL']?.['Total'];
      const notaMediaCentro = datosGlobalCentro?.stats?.notaMedia || kpisGlobales?.notaMediaCentro || 0;
      const aprobadosCentro = datosGlobalCentro?.stats?.aprobados || kpisGlobales?.porcentajeAprobados || 0;

      // Helper para obtener número de nivel
      const getNivelNum = (n) => parseInt(n.match(/\d+/)?.[0] || '0');

      // ========== PARTE 1: COMPARATIVA GLOBAL (asignatura agregada vs centro) ==========
      // Calcular medias globales por asignatura (agregando todos los niveles)
      const asignaturasTotales = {};
      Object.keys(datosCompletos[trimestreSeleccionado] || {}).forEach(nivel => {
        if (nivel === 'GLOBAL') return;
        const datosNivel = datosCompletos[trimestreSeleccionado]?.[nivel];
        if (datosNivel) {
          Object.entries(datosNivel).forEach(([asig, data]) => {
            if (asig !== 'Total' && asig !== 'Total Especialidad' && asig !== 'Total no Especialidad') {
              if (perteneceAGruposFiltrados(asig) && data?.stats) {
                if (!asignaturasTotales[asig]) {
                  asignaturasTotales[asig] = { sumMedia: 0, sumAprobados: 0, count: 0, registros: 0 };
                }
                const registros = data.stats.registros || 1;
                asignaturasTotales[asig].sumMedia += (data.stats.notaMedia || 0) * registros;
                asignaturasTotales[asig].sumAprobados += (data.stats.aprobados || 0) * registros;
                asignaturasTotales[asig].registros += registros;
                asignaturasTotales[asig].count++;
              }
            }
          });
        }
      });

      const globalesData = Object.entries(asignaturasTotales)
        .filter(([, data]) => data.registros > 0)
        .map(([asig, data]) => {
          const mediaGlobal = data.sumMedia / data.registros;
          const aprobadosGlobal = data.sumAprobados / data.registros;
          const diffMedia = mediaGlobal - notaMediaCentro;
          const diffAprobados = aprobadosGlobal - aprobadosCentro;
          return [
            asig,
            t('globalAllLevels') || 'Todos los cursos',
            mediaGlobal.toFixed(2),
            diffMedia >= 0 ? `+${diffMedia.toFixed(2)}` : diffMedia.toFixed(2),
            `${aprobadosGlobal.toFixed(1)}%`,
            diffAprobados >= 0 ? `+${diffAprobados.toFixed(1)}pp` : `${diffAprobados.toFixed(1)}pp`
          ];
        })
        .sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }));

      // Añadir fila de referencia del centro
      globalesData.unshift([
        `${t('center') || 'Centro'} (${t('reference') || 'ref.'})`,
        '-',
        notaMediaCentro.toFixed(2),
        '-',
        `${aprobadosCentro.toFixed(1)}%`,
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
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 40, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 28, halign: 'center' },
          5: { cellWidth: 28, halign: 'center' }
        },
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
      addNewPage();

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

        // Obtener referencia del nivel (Total del nivel)
        const totalNivel = datosNivel['Total'];
        const mediaRefNivel = totalNivel?.stats?.notaMedia || 0;
        const aprobadosRefNivel = totalNivel?.stats?.aprobados || 0;

        Object.entries(datosNivel).forEach(([asig, data]) => {
          if (asig !== 'Total' && asig !== 'Total Especialidad' && asig !== 'Total no Especialidad') {
            if (perteneceAGruposFiltrados(asig) && data?.stats) {
              asignaturasPorCurso.push({
                asignatura: asig,
                nivel,
                nivelNum: getNivelNum(nivel),
                notaMedia: data.stats.notaMedia || 0,
                aprobados: data.stats.aprobados || 0,
                mediaRefNivel,
                aprobadosRefNivel,
                diffMedia: (data.stats.notaMedia || 0) - mediaRefNivel,
                diffAprobados: (data.stats.aprobados || 0) - aprobadosRefNivel
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
      const tableDataPorCurso = asignaturasPorCurso.map(asig => {
        const diffMediaStr = asig.diffMedia >= 0 ? `+${asig.diffMedia.toFixed(2)}` : asig.diffMedia.toFixed(2);
        const diffAprobStr = asig.diffAprobados >= 0 ? `+${asig.diffAprobados.toFixed(1)}pp` : `${asig.diffAprobados.toFixed(1)}pp`;

        return [
          asig.asignatura,
          asig.nivel,
          asig.notaMedia.toFixed(2),
          `${asig.mediaRefNivel.toFixed(2)}`,
          diffMediaStr,
          `${asig.aprobados.toFixed(1)}%`,
          diffAprobStr
        ];
      });

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
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 28, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 25, halign: 'center' },
          6: { cellWidth: 22, halign: 'center' }
        },
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
          addFooter(data.pageNumber);
        },
        margin: { left: PAGE.margin, right: PAGE.margin }
      });

      console.log('[PDF] Comparativa grupo vs centro completada');
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
      const imgWidth = contentWidth;
      const imgStartY = filtroAgrupacionesActivo ? contentStartY + 12 : contentStartY + 8;
      const imgHeight = PAGE.height - imgStartY - PAGE.footerHeight - 10;
      pdf.addImage(chartImages.scatter, 'PNG', PAGE.margin, imgStartY, imgWidth, imgHeight);

      addFooter(currentPage);
    }

    // ========== EVOLUCIÓN DE CORRELACIONES ==========
    if (configInforme.incluirEvolucionCorrelaciones !== false && chartImages.correlationEvolution) {
      onProgress?.(t('pdfAddingCharts'));
      addNewPage();

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('correlationEvolution'), PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      // Añadir imagen del gráfico
      const imgWidth = contentWidth;
      const imgHeight = PAGE.height - contentStartY - PAGE.footerHeight - 15;
      pdf.addImage(chartImages.correlationEvolution, 'PNG', PAGE.margin, contentStartY + 8, imgWidth, imgHeight);

      addFooter(currentPage);
    }

    // ========== CORRELACIONES DETALLADAS ==========
    if (configInforme.incluirCorrelaciones !== false && correlacionesTrimestre && correlacionesTrimestre.length > 0) {
      onProgress?.(t('pdfGeneratingCorrelations'));
      addNewPage();

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
      const correlacionesData = correlacionesTrimestre.map((corr, idx) => [
        (idx + 1).toString(),
        corr.Nivel || '',
        corr.Asignatura1 || '',
        corr.Asignatura2 || '',
        (corr.Correlacion || 0).toFixed(3)
      ]);

      autoTable(pdf, {
        startY: contentStartY + 10,
        head: [['#', 'Nivel', 'Asignatura 1', 'Asignatura 2', 'Correlación']],
        body: correlacionesData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.primary, fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 80 },
          3: { cellWidth: 80 },
          4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
        },
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
          addFooter(data.pageNumber);
        }
      });
    }

    // ========== COMPARATIVA TRANSVERSAL (múltiples páginas) ==========
    console.log('[PDF] Transversal check:', {
      incluir: configInforme.incluirComparativaTransversal,
      hasArray: !!chartImages.transversalArray,
      numImages: chartImages.transversalArray?.length
    });
    if (configInforme.incluirComparativaTransversal !== false && chartImages.transversalArray?.length > 0) {
      onProgress?.(t('pdfAddingCharts'));

      chartImages.transversalArray.forEach((imgData, idx) => {
        addNewPage();

        pdf.setFontSize(18);
        pdf.setTextColor(...COLORS.primary);
        const titulo = chartImages.transversalArray.length > 1
          ? `${t('transversalComparison')} (${idx + 1}/${chartImages.transversalArray.length})`
          : t('transversalComparison');
        pdf.text(titulo, PAGE.margin, contentStartY);
        pdf.setTextColor(...COLORS.text);

        // Añadir imagen del gráfico
        const imgWidth = contentWidth;
        const imgHeight = PAGE.height - contentStartY - PAGE.footerHeight - 15;
        pdf.addImage(imgData, 'PNG', PAGE.margin, contentStartY + 8, imgWidth, imgHeight);

        addFooter(currentPage);
      });
    }

    // ========== EVOLUCIÓN DE NOTAS MEDIAS POR TRIMESTRE ==========
    if (configInforme.incluirEvolucionNotas !== false && chartImages.evolution) {
      onProgress?.(t('pdfGeneratingEvolution'));
      addNewPage();

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('gradeEvolutionTitle') || 'Evolución de Notas Medias por Trimestre', PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      // Añadir imagen del gráfico
      const imgWidth = contentWidth;
      const imgHeight = PAGE.height - contentStartY - PAGE.footerHeight - 15;
      pdf.addImage(chartImages.evolution, 'PNG', PAGE.margin, contentStartY + 8, imgWidth, imgHeight);

      addFooter(currentPage);
    } else if (configInforme.incluirEvolucionNotas !== false && trimestresDisponibles.length < 2) {
      // Mostrar mensaje informativo si no hay suficientes trimestres
      onProgress?.(t('pdfGeneratingEvolution'));
      addNewPage();

      pdf.setFontSize(18);
      pdf.setTextColor(...COLORS.primary);
      pdf.text(t('gradeEvolutionTitle') || 'Evolución de Notas Medias por Trimestre', PAGE.margin, contentStartY);
      pdf.setTextColor(...COLORS.text);

      pdf.setFontSize(12);
      pdf.setTextColor(...COLORS.warning);
      pdf.text(t('notEnoughTrimesters') || 'Se requieren al menos 2 trimestres para mostrar la evolución', PAGE.margin, contentStartY + 20);
      pdf.setTextColor(...COLORS.text);

      addFooter(currentPage);
    }

    // ========== ANÁLISIS DE TENDENCIAS TRANSVERSALES ==========
    if (configInforme.incluirAnalisisTendencias !== false && tendenciasParaPDF.length > 0) {
      onProgress?.(t('pdfGeneratingTrends'));
      addNewPage();

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
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 55 },
          2: { cellWidth: 55 },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' }
        },
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
      addFooter(currentPage);
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
        pdf.text(titulo, PAGE.margin, contentStartY);
        pdf.setTextColor(...COLORS.text);

        // Preparar datos
        const asignaturasData = asignaturasOrdenadas.map(asig => [
          asig.nivel || '',
          asig.asignatura || '',
          asig.registros || 0,
          (asig.notaMedia || 0).toFixed(2),
          typeof asig.desviacion === 'number' ? asig.desviacion.toFixed(2) : '-',
          asig.moda != null ? asig.moda.toString() : '-',
          `${(asig.aprobados || 0).toFixed(1)}%`,
          asig.modaAprobados || '-',
          `${(asig.suspendidos || 0).toFixed(1)}%`,
          asig.modaSuspendidos || '-'
        ]);

        autoTable(pdf, {
          startY: contentStartY + 10,
          head: [[
            t('level') || 'Curso',
            t('subject') || 'Asignatura',
            t('records') || 'N',
            t('average') || 'Media',
            t('standardDeviationShort') || 'σ',
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
          columnStyles: {
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
          },
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
            addFooter(data.pageNumber);
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
            : `${t('difficulty')} - ${t('difficultyReason')}`;
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

          addFooter(currentPage);
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
        pdf.text(`${t('gradeDistribution') || 'Distribución de Notas'}: ${asignatura}`, PAGE.margin, contentStartY);
        pdf.setTextColor(...COLORS.text);

        pdf.setFontSize(10);
        pdf.setTextColor(...COLORS.textLight);
        pdf.text(t('distributionDesc') || 'Porcentaje de alumnos por nota en cada curso', PAGE.margin, contentStartY + 7);
        pdf.setTextColor(...COLORS.text);

        // Añadir imagen del gráfico de distribución
        const imgWidth = contentWidth;
        const imgHeight = imgWidth * (550 / 1200); // Mantener proporción
        const maxHeight = PAGE.height - contentStartY - 30;
        const finalHeight = Math.min(imgHeight, maxHeight);
        const finalWidth = finalHeight * (1200 / 550);

        const imgX = PAGE.margin + (contentWidth - finalWidth) / 2;
        pdf.addImage(image, 'PNG', imgX, contentStartY + 12, finalWidth, finalHeight);

        addFooter(currentPage);
      }

      console.log('[PDF] Distribución de notas completada');
    }

    // Guardar PDF
    onProgress?.(t('pdfSaving'));
    console.log('[PDF] Guardando archivo PDF...');
    const nombreArchivo = `Informe_${(configInforme.nombreCentro || 'Centro').replace(/\s+/g, '_')}_${trimestreSeleccionado}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(nombreArchivo);
    console.log('[PDF] PDF generado exitosamente:', nombreArchivo);

    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('[PDF] Error al generar PDF:', error);
    console.error('[PDF] Stack trace:', error.stack);
    if (onError) onError(error);
  }
};

export default generarInformePDF;
