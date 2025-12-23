/**
 * Dashboard Académico - Servicio de Generación de Informes PDF
 * Genera informes PDF completos con KPIs, correlaciones y análisis de dificultad
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Genera un informe PDF completo del dashboard
 * @param {Object} params - Parámetros para la generación
 * @param {string} params.trimestreSeleccionado - Trimestre seleccionado
 * @param {Object} params.datosCompletos - Datos completos de todos los trimestres
 * @param {Object} params.configInforme - Configuración del informe
 * @param {Object} params.kpisGlobales - KPIs globales calculados
 * @param {Array} params.correlacionesTrimestre - Correlaciones del trimestre
 * @param {Object} params.analisisDificultad - Análisis de dificultad de asignaturas
 * @param {Function} params.t - Función de traducción
 * @param {Function} params.onStart - Callback al iniciar generación
 * @param {Function} params.onSuccess - Callback al completar exitosamente
 * @param {Function} params.onError - Callback en caso de error
 */
export const generarInformePDF = ({
  trimestreSeleccionado,
  datosCompletos,
  configInforme,
  kpisGlobales,
  correlacionesTrimestre,
  analisisDificultad,
  t,
  onStart,
  onSuccess,
  onError
}) => {
  console.log('[PDF] Iniciando generación de informe...');

  if (!trimestreSeleccionado || !datosCompletos[trimestreSeleccionado]) {
    alert(t('noDataForReport'));
    return;
  }

  if (onStart) onStart();

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

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('[PDF] Error al generar PDF:', error);
      console.error('[PDF] Stack trace:', error.stack);
      alert(`${t('errorGeneratingPDF')}: ${error.message}`);
      if (onError) onError(error);
    }
  }, 100);
};
